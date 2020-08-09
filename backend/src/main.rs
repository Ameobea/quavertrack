#![feature(proc_macro_hygiene, decl_macro, box_patterns, nll, try_trait)]

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate rocket_contrib;
extern crate tokio;
#[macro_use]
extern crate log;

// use rocket_contrib::compression::Compression;
use diesel::pg::PgConnection;
use libquavertrack::{
    api::{self, APIError},
    db_util,
};
use thiserror::Error;
use tokio::task::block_in_place;

mod conf;
mod models;
mod routes;

#[database("quavertrack")]
pub struct DbConn(PgConnection);

#[derive(Debug, Error)]
pub enum UpdateUserError {
    #[error("Error getting data from Quaver API: {0:?}")]
    APIError(#[from] APIError),
    #[error("User not found")]
    NotFound,
    #[error("Error storing data in database: {0:?}")]
    DBError(#[from] diesel::result::Error),
}

pub async fn update_user(
    conn: diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>,
    user_id: i64,
) -> Result<(), UpdateUserError> {
    // Fetch + store current stats for user
    let user_stats = api::get_user_stats(user_id)
        .await?
        .ok_or(UpdateUserError::NotFound)?;
    block_in_place(|| db_util::store_stats_update(&conn, user_stats))?;

    // Fetch + store most recent 4k scores for user
    let recent_4k_scores = api::get_user_recent_scores(user_id, 1)
        .await?
        .ok_or(UpdateUserError::NotFound)?;
    block_in_place(|| db_util::store_scores(&conn, user_id, recent_4k_scores))?;

    // Fetch + store best 4k scores for user
    let best_4k_scores = api::get_user_best_scores(user_id, 1)
        .await?
        .ok_or(UpdateUserError::NotFound)?;
    block_in_place(|| db_util::store_scores(&conn, user_id, best_4k_scores))?;

    // Fetch + store most recent 7k scores for user
    let recent_7k_scores = api::get_user_recent_scores(user_id, 2)
        .await?
        .ok_or(UpdateUserError::NotFound)?;
    block_in_place(|| db_util::store_scores(&conn, user_id, recent_7k_scores))?;

    // Fetch + store best 7k scores for user
    let best_7k_scores = api::get_user_best_scores(user_id, 2)
        .await?
        .ok_or(UpdateUserError::NotFound)?;
    block_in_place(|| db_util::store_scores(&conn, user_id, best_7k_scores))?;

    Ok(())
}

#[tokio::main]
pub async fn main() {
    rocket::ignite()
        .mount(
            "/",
            routes![
                routes::update,
                routes::get_stats_history,
                routes::get_scores
            ],
        )
        .attach(DbConn::fairing())
        // .attach(Compression::fairing())
        .launch()
        .await
        .expect("Failed to launch Rocket");
}
