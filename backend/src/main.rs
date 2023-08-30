#![feature(proc_macro_hygiene, decl_macro, box_patterns)]

#[macro_use]
extern crate rocket;
extern crate tokio;
#[macro_use]
extern crate log;

use chrono::offset::Utc;
use diesel::{pg::PgConnection, prelude::*};
use fnv::FnvHashMap as HashMap;
use libquavertrack::{
    api::{self, APIError},
    db_util::{
        self,
        models::{DBScore, DBStatsUpdate, Map},
    },
};
use serde::Serialize;
use thiserror::Error;

mod conf;
mod models;
mod routes;

#[rocket_sync_db_pools::database("quavertrack")]
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

#[derive(Serialize)]
pub struct UpdateData {
    pub stats_4k: DBStatsUpdate,
    pub stats_7k: DBStatsUpdate,
    pub maps: HashMap<i64, Map>,
    pub new_scores: Vec<DBScore>,
}

pub async fn update_user(conn: &DbConn, user_id: i64) -> Result<UpdateData, UpdateUserError> {
    let (user_stats, recent_4k_scores, best_4k_scores, recent_7k_scores, best_7k_scores) = tokio::try_join!(
        async {
            api::get_user_stats(user_id)
                .await
                .map_err(Into::into)
                .and_then(|opt| opt.ok_or(UpdateUserError::NotFound))
        },
        async {
            api::get_user_recent_scores(user_id, 1)
                .await
                .map_err(Into::into)
                .and_then(|opt| opt.ok_or(UpdateUserError::NotFound))
        },
        async {
            api::get_user_best_scores(user_id, 1)
                .await
                .map_err(Into::into)
                .and_then(|opt| opt.ok_or(UpdateUserError::NotFound))
        },
        async {
            api::get_user_recent_scores(user_id, 2)
                .await
                .map_err(Into::into)
                .and_then(|opt| opt.ok_or(UpdateUserError::NotFound))
        },
        async {
            api::get_user_best_scores(user_id, 2)
                .await
                .map_err(Into::into)
                .and_then(|opt| opt.ok_or(UpdateUserError::NotFound))
        },
    )?;

    let all_api_scores = [
        recent_4k_scores,
        best_4k_scores,
        recent_7k_scores,
        best_7k_scores,
    ]
    .concat();

    conn.run(move |conn| -> Result<UpdateData, UpdateUserError> {
        use crate::db_util::schema::users;

        let do_inner = || -> Result<_, diesel::result::Error> {
            let (maps, new_scores) = db_util::store_scores(&conn, user_id, all_api_scores)?;

            let mut maps_by_id = HashMap::default();
            for map in maps {
                maps_by_id.insert(map.id, map);
            }

            let [stats_4k, stats_7k] =
                db_util::store_stats_update(&conn, user_stats).map(|updates| {
                    let mut updates = updates.into_iter();
                    [updates.next().unwrap(), updates.next().unwrap()]
                })?;

            let now = Utc::now().naive_utc();
            diesel::update(users::table.filter(users::dsl::id.eq(user_id)))
                .set(users::dsl::last_updated_at.eq(now))
                .execute(conn)?;

            Ok((stats_4k, stats_7k, maps_by_id, new_scores))
        };

        let (stats_4k, stats_7k, maps_by_id, new_scores) =
            do_inner().map_err(|err| UpdateUserError::from(err))?;

        Ok(UpdateData {
            stats_4k,
            stats_7k,
            maps: maps_by_id,
            new_scores,
        })
    })
    .await
}

pub async fn get_user_id(
    conn: &DbConn,
    user: &str,
) -> Result<Option<(String, i64)>, UpdateUserError> {
    // Try to get by username first
    let user_clone = user.to_owned();
    match conn
        .run(move |conn| db_util::get_user_id_by_username(conn, &user_clone))
        .await?
    {
        Some(user_id) => return Ok(Some((user.to_owned(), user_id))),
        None => (),
    };

    // Try to get by ID
    if let Ok(parsed_user_id) = user.parse::<i64>() {
        match conn
            .run(move |conn| db_util::get_username_by_user_id(conn, parsed_user_id))
            .await?
        {
            Some(username) => return Ok(Some((username, parsed_user_id))),
            None => (),
        }
    }

    // Hit the Quaver API to try to look this user up
    match api::lookup_user(user).await? {
        Some(mut user) => {
            let user_id = user.id;
            user.username = user.username.to_lowercase();
            let username = user.username.clone();
            // Store user in DB
            match conn.run(move |conn| db_util::store_user(conn, &user)).await {
                Ok(_) => Ok(()),
                Err(diesel::result::Error::DatabaseError(
                    diesel::result::DatabaseErrorKind::UniqueViolation,
                    _,
                )) => {
                    // User probably doesn't exactly match the username, but we already have
                    // an entry in there anyway so just return the ID
                    Ok(())
                }
                Err(err) => Err(err),
            }?;

            Ok(Some((username, user_id)))
        }
        None => Ok(None),
    }
}

#[rocket::main]
pub async fn main() {
    dotenv::dotenv().ok();

    rocket::build()
        .mount(
            "/api/",
            routes![
                routes::update,
                routes::get_stats_history,
                routes::get_scores,
                routes::update_oldest
            ],
        )
        .attach(DbConn::fairing())
        .launch()
        .await
        .expect("Failed to launch Rocket");
}
