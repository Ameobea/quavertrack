use chrono::{offset::Utc, DateTime, NaiveDateTime};
use libquavertrack::db_util::{self, models::DBStatsUpdate};
use rocket::http::Status;
use rocket_contrib::json::Json;
use tokio::task::block_in_place;

use crate::models::GetScoresResponse;
use crate::DbConn;

fn stringify_diesel_err(err: diesel::result::Error) -> Status {
    error!("Error querying DB: {:?}", err);
    Status::new(500, "Error querying database")
}

fn stringify_internal_err(err: crate::UpdateUserError) -> Status {
    error!("Error doing some internal operation: {:?}", err);
    Status::new(500, "Internal server error")
}

fn parse_mode(mode: &str) -> Result<i16, Status> {
    match mode {
        "1" => Ok(1),
        "2" => Ok(2),
        "4" => Ok(1),
        "7" => Ok(2),
        "4k" => Ok(1),
        "7k" => Ok(2),
        "k4" => Ok(1),
        "k7" => Ok(2),
        _ => Err(Status::new(400, "Invalid mode provided")),
    }
}

#[post("/update/<user>")]
pub async fn update<'a>(
    user: String,
    conn: DbConn,
) -> Result<Option<Json<[DBStatsUpdate; 2]>>, Status> {
    let (conn, (_username, user_id)) = match crate::get_user_id(conn.0, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        (conn, Some(user_id)) => (conn, user_id),
        (_conn, None) => return Ok(None),
    };

    let last_update_time: Option<NaiveDateTime> =
        block_in_place(|| db_util::get_last_update_timestamp(&conn, user_id))
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
        return Err(Status::new(
            429,
            "Updated too recently; must wait 10 seconds between updates",
        ));
    }

    let stats_update = match crate::update_user(conn, user_id).await {
        Ok(stats_update) => Ok(stats_update),
        Err(crate::UpdateUserError::NotFound) => return Ok(None),
        Err(err) => Err(err),
    }
    .map_err(|err| {
        error!("Error updating user: {:?}", err);
        Status::new(500, "Error updating user; internal error")
    })?;

    Ok(Some(Json(stats_update)))
}

#[get("/user/<user>/<mode>/scores")]
pub async fn get_scores(
    user: String,
    mode: String,
    conn: DbConn,
) -> Result<Option<Json<GetScoresResponse>>, Status> {
    let (conn, (_username, user_id)) = match crate::get_user_id(conn.0, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        (conn, Some(user_id)) => (conn, user_id),
        (_conn, None) => return Ok(None),
    };

    let mode = parse_mode(&mode)?;
    let (maps, scores) =
        db_util::get_scores_for_user(&conn, user_id, mode).map_err(stringify_diesel_err)?;

    Ok(Some(Json(GetScoresResponse { maps, scores })))
}

#[get("/user/<user>/<mode>/stats_history")]
pub async fn get_stats_history(
    user: String,
    mode: String,
    conn: DbConn,
) -> Result<Option<Json<Vec<DBStatsUpdate>>>, Status> {
    let (conn, (_username, user_id)) = match crate::get_user_id(conn.0, &user)
        .await
        .map_err(stringify_internal_err)?
    {
        (conn, Some(user_id)) => (conn, user_id),
        (_conn, None) => return Ok(None),
    };

    let mode = parse_mode(&mode)?;
    let updates = block_in_place(|| db_util::get_stats_updates_for_user(&conn, user_id, mode))
        .map_err(stringify_diesel_err)?;

    Ok(Some(Json(updates)))
}
