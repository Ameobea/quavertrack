use chrono::NaiveDateTime;
use diesel::{pg::PgConnection, prelude::*};

pub mod models;
pub mod schema;

use self::models::{APIScore, APIStatsUser, DBScore, DBStatsUpdate, Map, NewDBStatsUpdate};

pub fn store_maps(conn: &PgConnection, maps: &[Map]) -> Result<(), diesel::result::Error> {
    use schema::maps;

    diesel::insert_into(maps::table)
        .values(maps)
        .on_conflict_do_nothing()
        .execute(conn)
        .map(drop)
}

pub fn store_scores(
    conn: &PgConnection,
    user_id: i64,
    scores: Vec<APIScore>,
) -> Result<(), diesel::result::Error> {
    use schema::scores;

    let score_count = scores.len();
    let (maps, db_scores): (Vec<Map>, Vec<DBScore>) = scores.into_iter().fold(
        (
            Vec::with_capacity(score_count),
            Vec::with_capacity(score_count),
        ),
        |(mut maps, mut db_scores), api_score| {
            let (map, db_score) = api_score.to_db(user_id);
            maps.push(map);
            db_scores.push(db_score);

            (maps, db_scores)
        },
    );

    store_maps(conn, &maps)?;

    diesel::insert_into(scores::table)
        .values(&db_scores)
        .on_conflict_do_nothing()
        .execute(conn)
        .map(drop)
}

pub fn store_stats_update(
    conn: &PgConnection,
    stats: APIStatsUser,
) -> Result<(), diesel::result::Error> {
    use schema::stats_updates;

    let [update_4k, update_7k] = stats.to_db();
    let records: &[NewDBStatsUpdate] = &[update_4k, update_7k];

    diesel::insert_into(stats_updates::table)
        .values(records)
        .execute(conn)
        .map(drop)
}

pub fn get_stats_updates_for_user(
    conn: &PgConnection,
    user_id: i64,
) -> Result<Vec<DBStatsUpdate>, diesel::result::Error> {
    use schema::stats_updates;

    stats_updates::table
        .filter(stats_updates::dsl::user_id.eq(user_id))
        .load(conn)
}

pub fn get_scores_for_user(
    conn: &PgConnection,
    user_id: i64,
) -> Result<(Vec<Map>, Vec<DBScore>), diesel::result::Error> {
    use schema::{maps, scores};

    let scores: Vec<DBScore> = scores::table
        .filter(scores::dsl::user_id.eq(user_id))
        .load(conn)?;
    let all_map_ids: Vec<i64> = scores.iter().map(|score| score.map_id).collect();

    let maps: Vec<Map> = maps::table
        .filter(maps::dsl::id.eq_any(all_map_ids))
        .load(conn)?;

    Ok((maps, scores))
}

pub fn get_last_update_timestamp(
    conn: &PgConnection,
    user_id: i64,
) -> Result<Option<NaiveDateTime>, diesel::result::Error> {
    use schema::stats_updates;

    stats_updates::table
        .filter(stats_updates::user_id.eq(user_id))
        .order_by(stats_updates::recorded_at.desc())
        .select(stats_updates::dsl::recorded_at)
        .first(conn)
        .optional()
}
