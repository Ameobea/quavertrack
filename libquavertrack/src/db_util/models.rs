use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::db_util::schema::{maps, scores};

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize, Insertable)]
#[table_name = "maps"]
pub struct APIMap {
    pub id: i64,
    pub mapset_id: i64,
    pub md5: String,
    pub artist: String,
    pub title: String,
    pub difficulty_name: String,
    pub creator_id: i64,
    pub creator_username: String,
    pub ranked_status: i16,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct APIScore {
    pub id: i64,
    pub time: String,
    pub mode: i64,
    pub mods: i64,
    pub mods_string: String,
    pub performance_rating: f32,
    pub personal_best: bool,
    pub is_donator_score: bool,
    pub total_score: i64,
    pub accuracy: f32,
    pub grade: String,
    pub max_combo: i64,
    pub count_marv: i64,
    pub count_perf: i64,
    pub count_great: i64,
    pub count_good: i64,
    pub count_okay: i64,
    pub count_miss: i64,
    pub scroll_speed: i64,
    pub ratio: f32,
    pub map: APIMap,
}

#[derive(Insertable)]
#[table_name = "scores"]
pub struct NewDBScore {
    pub user_id: i64,
    pub time: NaiveDateTime,
    pub mode: i16,
    pub mods: i64,
    pub mods_string: String,
    pub performance_rating: f32,
    pub personal_best: bool,
    pub is_donator_score: bool,
    pub total_score: i64,
    pub accuracy: f32,
    pub grade: String,
    pub max_combo: i64,
    pub count_marv: i64,
    pub count_perf: i64,
    pub count_great: i64,
    pub count_good: i64,
    pub count_okay: i64,
    pub count_miss: i64,
    pub scroll_speed: i64,
    pub ratio: f32,
    pub map_id: i64,
}

#[derive(Queryable, Serialize)]
pub struct DBScore {
    pub id: i64,
    pub user_id: i64,
    pub time: NaiveDateTime,
    pub mode: i64,
    pub mods: i64,
    pub mods_string: String,
    pub performance_rating: f64,
    pub personal_best: bool,
    pub is_donator_score: bool,
    pub total_score: i64,
    pub accuracy: f64,
    pub grade: String,
    pub max_combo: i64,
    pub total_marv: i64,
    pub total_perf: i64,
    pub total_great: i64,
    pub total_good: i64,
    pub total_okay: i64,
    pub total_miss: i64,
    pub scroll_speed: i64,
    pub ratio: f64,
    pub map_id: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Map {
    pub id: i64,
    pub mapset_id: i64,
    pub md5: String,
    pub artist: String,
    pub title: String,
    pub difficulty_name: String,
    pub creator_id: i64,
    pub creator_username: String,
    pub ranked_status: i64,
}
