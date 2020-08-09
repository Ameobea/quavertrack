use chrono::{offset::Utc, DateTime, NaiveDateTime};
use libquavertrack::db_util::{self, models::DBStatsUpdate};
use rocket::http::Status;
use rocket_contrib::json::Json;

use crate::models::GetScoresResponse;
use crate::DbConn;

fn stringify_diesel_err(err: diesel::result::Error) -> Status {
    error!("Error querying DB: {:?}", err);
    Status::new(500, "Error querying database")
}

#[post("/update/<user_id>")]
pub async fn update<'a>(user_id: i64, conn: DbConn) -> Result<Option<()>, Status> {
    let last_update_time: Option<NaiveDateTime> =
        db_util::get_last_update_timestamp(&conn.0, user_id).map_err(stringify_diesel_err)?;

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

    match crate::update_user(conn.0, user_id).await {
        Ok(()) => Ok(()),
        Err(crate::UpdateUserError::NotFound) => return Ok(None),
        Err(err) => Err(err),
    }
    .map_err(|err| {
        error!("Error updating user: {:?}", err);
        Status::new(500, "Error updating user; internal error")
    })?;

    Ok(Some(()))
}

#[get("/user/<user_id>/scores")]
pub fn get_scores(user_id: i64, conn: DbConn) -> Result<Json<GetScoresResponse>, Status> {
    let (maps, scores) =
        db_util::get_scores_for_user(&conn.0, user_id).map_err(stringify_diesel_err)?;

    Ok(Json(GetScoresResponse { maps, scores }))
}

#[get("/user/<user_id>/stats_history")]
pub fn get_stats_history(user_id: i64, conn: DbConn) -> Result<Json<Vec<DBStatsUpdate>>, Status> {
    let updates =
        db_util::get_stats_updates_for_user(&conn.0, user_id).map_err(stringify_diesel_err)?;

    Ok(Json(updates))
}
