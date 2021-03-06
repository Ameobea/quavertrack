#![feature(proc_macro_hygiene, decl_macro, box_patterns, nll, try_trait)]

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate rocket_contrib;
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
use rocket_contrib::compression::Compression;
use serde::Serialize;
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

#[derive(Serialize)]
pub struct UpdateData {
    pub stats_4k: DBStatsUpdate,
    pub stats_7k: DBStatsUpdate,
    pub maps: HashMap<i64, Map>,
    pub new_scores: Vec<DBScore>,
}

pub async fn update_user(
    conn: diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>,
    user_id: i64,
) -> Result<
    UpdateData,
    (
        UpdateUserError,
        diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>,
    ),
> {
    let (user_stats, recent_4k_scores, best_4k_scores, recent_7k_scores, best_7k_scores) = match tokio::try_join!(
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
    ) {
        Ok(res) => res,
        Err(err) => return Err((err, conn)),
    };

    let all_api_scores = [
        recent_4k_scores,
        best_4k_scores,
        recent_7k_scores,
        best_7k_scores,
    ]
    .concat();

    block_in_place(|| -> Result<UpdateData, (UpdateUserError, diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>)> {
        use crate::db_util::schema::users;

        let do_inner = || -> Result<_, diesel::result::Error> {
        let (maps, new_scores) =
            db_util::store_scores(&conn, user_id, all_api_scores)?;

        let mut maps_by_id = HashMap::default();
        for map in maps {
            maps_by_id.insert(map.id, map);
        }

        let [stats_4k, stats_7k] = db_util::store_stats_update(&conn, user_stats)
            .map(|updates| {
                let mut updates = updates.into_iter();
                [updates.next().unwrap(), updates.next().unwrap()]
            })?;

        let now = Utc::now().naive_utc();
        diesel::update(users::table.filter(users::dsl::id.eq(user_id)))
            .set(users::dsl::last_updated_at.eq(now))
            .execute(&conn)?;

            Ok((stats_4k, stats_7k, maps_by_id, new_scores))
        };


        let (stats_4k, stats_7k, maps_by_id, new_scores) = do_inner().map_err(|err| (err.into(), conn))?;

        Ok(UpdateData {
            stats_4k,
            stats_7k,
            maps: maps_by_id,
            new_scores,
        })
    })
}

pub async fn get_user_id(
    conn: diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>,
    user: &str,
) -> Result<
    (
        diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<PgConnection>>,
        Option<(String, i64)>,
    ),
    UpdateUserError,
> {
    // Try to get by username first
    match block_in_place(|| db_util::get_user_id_by_username(&conn, user))? {
        Some(user_id) => return Ok((conn, Some((user.to_owned(), user_id)))),
        None => (),
    };

    // Try to get by ID
    if let Ok(parsed_user_id) = user.parse::<i64>() {
        match block_in_place(|| db_util::get_username_by_user_id(&conn, parsed_user_id))? {
            Some(username) => return Ok((conn, Some((username, parsed_user_id)))),
            None => (),
        }
    }

    // Hit the Quaver API to try to look this user up
    match api::lookup_user(user).await? {
        Some(mut user) => {
            user.username = user.username.to_lowercase();
            // Store user in DB
            match db_util::store_user(&conn, &user) {
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

            Ok((conn, Some((user.username, user.id))))
        }
        None => Ok((conn, None)),
    }
}

#[tokio::main]
pub async fn main() {
    dotenv::dotenv().ok();

    rocket::ignite()
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
        .attach(Compression::fairing())
        .launch()
        .await
        .expect("Failed to launch Rocket");
}
