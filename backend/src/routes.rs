use chrono::{offset::Utc, DateTime, NaiveDateTime};
use fnv::FnvHashMap as HashMap;
use libquavertrack::db_util::{self, models::DBStatsUpdate};
use rocket::http::Status;
use rocket::response::status;
use rocket::serde::json::Json;

use crate::models::GetScoresResponse;
use crate::DbConn;

fn stringify_diesel_err(err: diesel::result::Error) -> status::Custom<&'static str> {
    error!("Error querying DB: {:?}", err);
    status::Custom(Status::InternalServerError, "Error querying database")
}

fn stringify_internal_err(err: crate::UpdateUserError) -> status::Custom<&'static str> {
    error!("Error doing some internal operation: {:?}", err);
    status::Custom(Status::InternalServerError, "Internal server error")
}

fn parse_mode(mode: &str) -> Result<i16, status::Custom<&'static str>> {
    match mode {
        "1" => Ok(1),
        "2" => Ok(2),
        "4" => Ok(1),
        "7" => Ok(2),
        "4k" => Ok(1),
        "7k" => Ok(2),
        "k4" => Ok(1),
        "k7" => Ok(2),
        _ => Err(status::Custom(Status::BadRequest, "Invalid mode provided")),
    }
}

#[post("/update/<user>")]
pub async fn update(
    user: String,
    conn: DbConn,
) -> Result<Option<Json<crate::UpdateData>>, status::Custom<&'static str>> {
    let (_username, user_id) = match crate::get_user_id(&conn, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        Some(user_id) => user_id,
        None => {
            warn!("No user found in DB with username={}", user);
            return Ok(None);
        }
    };

    let last_update_time: Option<NaiveDateTime> = conn
        .run(move |conn| db_util::get_last_update_timestamp(conn, user_id))
        .await
        .map_err(stringify_diesel_err)?;

    let update_cooldown_remaining: Option<i64> = match last_update_time {
        Some(last_update_time) => {
            let now = Utc::now();
            let last_update_time_utc: DateTime<Utc> = DateTime::from_utc(last_update_time, Utc);
            let diff = now - last_update_time_utc;

            if diff < chrono::Duration::seconds(crate::conf::MIN_SECONDS_BETWEEN_UPDATES) {
                Some(diff.num_seconds())
            } else {
                None
            }
        }
        None => None,
    };

    if let Some(_) = update_cooldown_remaining {
        return Err(status::Custom(
            Status::InternalServerError,
            "Updated too recently; must wait 10 seconds between updates",
        ));
    }

    let stats_update = match crate::update_user(&conn, user_id).await {
        Ok(stats_update) => Ok(stats_update),
        Err(crate::UpdateUserError::NotFound) => {
            error!("User not found when performing update");
            return Ok(None);
        }
        Err(err) => Err(err),
    }
    .map_err(|err| {
        error!("Error updating user: {:?}", err);
        status::Custom(
            Status::InternalServerError,
            "Error updating user; internal error",
        )
    })?;

    Ok(Some(Json(stats_update)))
}

#[get("/user/<user>/<mode>/scores")]
pub async fn get_scores(
    user: String,
    mode: String,
    conn: DbConn,
) -> Result<Option<Json<GetScoresResponse>>, status::Custom<&'static str>> {
    let (_username, user_id) = match crate::get_user_id(&conn, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        Some(user_id) => user_id,
        None => return Ok(None),
    };

    let mode = parse_mode(&mode)?;
    let (maps, scores) = conn
        .run(move |conn| db_util::get_scores_for_user(&conn, user_id, mode))
        .await
        .map_err(stringify_diesel_err)?;

    let mut maps_by_id = HashMap::default();
    for map in maps {
        maps_by_id.insert(map.id, map);
    }

    Ok(Some(Json(GetScoresResponse {
        maps: maps_by_id,
        scores,
    })))
}

#[get("/user/<user>/<mode>/stats_history")]
pub async fn get_stats_history(
    user: String,
    mode: String,
    conn: DbConn,
) -> Result<Option<Json<Vec<DBStatsUpdate>>>, status::Custom<&'static str>> {
    let (_username, user_id) = match crate::get_user_id(&conn, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        Some(user_id) => user_id,
        None => return Ok(None),
    };

    let mode = parse_mode(&mode)?;
    let updates = conn
        .run(move |conn| db_util::get_stats_updates_for_user(conn, user_id, mode))
        .await
        .map_err(stringify_diesel_err)?;

    Ok(Some(Json(updates)))
}

#[post("/update_oldest?<token>")]
pub async fn update_oldest(
    conn: DbConn,
    token: String,
) -> Result<String, status::Custom<&'static str>> {
    if token.as_str() != env!("UPDATE_TOKEN") {
        return Err(status::Custom(
            Status::Unauthorized,
            "Invalid update token provided",
        ));
    }

    let user_id_to_update = conn
        .run(|conn| crate::db_util::get_least_recently_updated_user_id(conn))
        .await
        .map_err(|err| {
            error!("Error updating oldest user: {:?}", err);
            status::Custom(
                Status::InternalServerError,
                "Internal error while updating oldest user",
            )
        })?;
    if let Err(err) = crate::update_user(&conn, user_id_to_update).await {
        error!("Error updating oldest user: {:?}", err);
        return Err(match err {
            crate::UpdateUserError::NotFound => {
                conn.run(move |conn| {
                    use crate::db_util::schema::users;
                    use diesel::prelude::*;

                    let now = Utc::now().naive_utc();
                    diesel::update(users::table.filter(users::dsl::id.eq(user_id_to_update)))
                        .set(users::dsl::last_updated_at.eq(now))
                        .execute(conn)
                })
                .await
                .map_err(|err| {
                    error!("Error updating oldest user: {:?}", err);
                    status::Custom(
                        Status::InternalServerError,
                        "Internal error while updating oldest user",
                    )
                })?;
                status::Custom(Status::NotFound, "User not found from Quaver API")
            }
            _ => status::Custom(
                Status::InternalServerError,
                "Internal error while updating oldest user",
            ),
        });
    }

    Ok(format!("Updated user id {}", user_id_to_update))
}
