use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::db_util::schema::{maps, scores, stats_updates, users};

#[derive(Debug, Clone, Serialize, Deserialize, Insertable, Queryable)]
#[table_name = "maps"]
pub struct Map {
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

#[derive(Debug, Clone, Deserialize)]
pub struct APIScore {
    pub id: i64,
    pub time: DateTime<Utc>,
    pub mode: i16,
    pub mods: i64,
    pub mods_string: String,
    pub performance_rating: f32,
    pub personal_best: bool,
    pub is_donator_score: Option<bool>,
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
    pub map: Map,
}

impl APIScore {
    pub fn to_db(self, user_id: i64) -> (Map, DBScore) {
        let db_score = DBScore {
            id: self.id,
            user_id,
            time: self.time.naive_utc(),
            mode: self.mode,
            mods: self.mods,
            mods_string: self.mods_string,
            performance_rating: self.performance_rating,
            personal_best: self.personal_best,
            is_donator_score: self.is_donator_score,
            total_score: self.total_score,
            accuracy: self.accuracy,
            grade: self.grade,
            max_combo: self.max_combo,
            count_marv: self.count_marv,
            count_perf: self.count_perf,
            count_great: self.count_great,
            count_good: self.count_good,
            count_okay: self.count_okay,
            count_miss: self.count_miss,
            scroll_speed: self.scroll_speed,
            ratio: self.ratio,
            map_id: self.map.id,
        };

        (self.map, db_score)
    }
}

#[derive(Queryable, Serialize, Insertable)]
#[table_name = "scores"]
pub struct DBScore {
    pub id: i64,
    pub user_id: i64,
    pub time: NaiveDateTime,
    pub mode: i16,
    pub mods: i64,
    pub mods_string: String,
    pub performance_rating: f32,
    pub personal_best: bool,
    pub is_donator_score: Option<bool>,
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

#[derive(Debug, Clone, Deserialize)]
pub struct APIStatsUserInfo {
    pub id: i64,
    pub steam_id: Option<String>,
    pub username: String,
    pub time_registered: Option<DateTime<Utc>>,
    pub allowed: i64,
    pub privileges: i64,
    pub usergroups: i64,
    pub mute_endtime: Option<DateTime<Utc>>,
    pub latest_activity: String,
    pub country: String,
    pub avatar_url: String,
    pub userpage: ::serde_json::Value,
    pub online: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ActivityMap {
    EmptyMap { id: i64, name: String },
    Map(Map),
}

#[derive(Debug, Clone, Deserialize)]
pub struct ActivityFeed {
    pub id: i64,
    #[serde(rename = "type")]
    pub type_field: i64,
    pub timestamp: DateTime<Utc>,
    pub map: Option<ActivityMap>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct APIStatsUser {
    pub info: APIStatsUserInfo,
    pub profile_badges: Vec<::serde_json::Value>,
    pub activity_feed: Vec<ActivityFeed>,
    pub keys4: APIModeStats,
    pub keys7: APIModeStats,
}

impl APIStatsUser {
    pub fn to_db(self) -> [NewDBStatsUpdate; 2] {
        let user_id = self.info.id;

        let update_4k = NewDBStatsUpdate {
            user_id,
            mode: 1,
            total_score: self.keys4.stats.total_score,
            ranked_score: self.keys4.stats.ranked_score,
            overall_accuracy: self.keys4.stats.overall_accuracy,
            overall_performance_rating: self.keys4.stats.overall_performance_rating,
            play_count: self.keys4.stats.play_count,
            fail_count: self.keys4.stats.fail_count,
            max_combo: self.keys4.stats.max_combo,
            replays_watched: self.keys4.stats.replays_watched,
            total_marv: self.keys4.stats.total_marv,
            total_perf: self.keys4.stats.total_perf,
            total_great: self.keys4.stats.total_great,
            total_good: self.keys4.stats.total_good,
            total_okay: self.keys4.stats.total_okay,
            total_miss: self.keys4.stats.total_miss,
            total_pauses: self.keys4.stats.total_pauses,
            multiplayer_wins: self.keys4.stats.multiplayer_wins,
            multiplayer_losses: self.keys4.stats.multiplayer_losses,
            multiplayer_ties: self.keys4.stats.multiplayer_ties,
            global_rank: self.keys4.global_rank,
            country_rank: self.keys4.country_rank,
            multiplayer_win_rank: self.keys4.multiplayer_win_rank,
        };

        let update_7k = NewDBStatsUpdate {
            user_id,
            mode: 2,
            total_score: self.keys7.stats.total_score,
            ranked_score: self.keys7.stats.ranked_score,
            overall_accuracy: self.keys7.stats.overall_accuracy,
            overall_performance_rating: self.keys7.stats.overall_performance_rating,
            play_count: self.keys7.stats.play_count,
            fail_count: self.keys7.stats.fail_count,
            max_combo: self.keys7.stats.max_combo,
            replays_watched: self.keys7.stats.replays_watched,
            total_marv: self.keys7.stats.total_marv,
            total_perf: self.keys7.stats.total_perf,
            total_great: self.keys7.stats.total_great,
            total_good: self.keys7.stats.total_good,
            total_okay: self.keys7.stats.total_okay,
            total_miss: self.keys7.stats.total_miss,
            total_pauses: self.keys7.stats.total_pauses,
            multiplayer_wins: self.keys7.stats.multiplayer_wins,
            multiplayer_losses: self.keys7.stats.multiplayer_losses,
            multiplayer_ties: self.keys7.stats.multiplayer_ties,
            global_rank: self.keys7.global_rank,
            country_rank: self.keys7.country_rank,
            multiplayer_win_rank: self.keys7.multiplayer_win_rank,
        };

        [update_4k, update_7k]
    }
}

#[derive(Deserialize)]
pub struct APIGetUserStatsResponse {
    pub status: u32,
    pub user: APIStatsUser,
}

#[derive(Debug, Clone, Deserialize)]
pub struct APIStats {
    pub user_id: i64,
    pub total_score: i64,
    pub ranked_score: i64,
    pub overall_accuracy: f32,
    pub overall_performance_rating: f32,
    pub play_count: i64,
    pub fail_count: i64,
    pub max_combo: i64,
    pub replays_watched: i64,
    pub total_marv: i64,
    pub total_perf: i64,
    pub total_great: i64,
    pub total_good: i64,
    pub total_okay: i64,
    pub total_miss: i64,
    pub total_pauses: i64,
    pub multiplayer_wins: i64,
    pub multiplayer_losses: i64,
    pub multiplayer_ties: i64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct APIModeStats {
    pub global_rank: i64,
    pub country_rank: i64,
    pub multiplayer_win_rank: i64,
    pub stats: APIStats,
}

#[derive(Clone, Debug, Deserialize)]
pub struct APIScoresResponse {
    pub status: u32,
    pub scores: Vec<APIScore>,
}

#[derive(Insertable)]
#[table_name = "stats_updates"]
pub struct NewDBStatsUpdate {
    pub user_id: i64,
    pub mode: i16,
    pub total_score: i64,
    pub ranked_score: i64,
    pub overall_accuracy: f32,
    pub overall_performance_rating: f32,
    pub play_count: i64,
    pub fail_count: i64,
    pub max_combo: i64,
    pub replays_watched: i64,
    pub total_marv: i64,
    pub total_perf: i64,
    pub total_great: i64,
    pub total_good: i64,
    pub total_okay: i64,
    pub total_miss: i64,
    pub total_pauses: i64,
    pub multiplayer_wins: i64,
    pub multiplayer_losses: i64,
    pub multiplayer_ties: i64,
    pub country_rank: i64,
    pub global_rank: i64,
    pub multiplayer_win_rank: i64,
}

#[derive(Queryable, Serialize)]
pub struct DBStatsUpdate {
    pub id: i32,
    pub user_id: i64,
    pub recorded_at: NaiveDateTime,
    pub mode: i16,
    pub total_score: i64,
    pub ranked_score: i64,
    pub overall_accuracy: f32,
    pub overall_performance_rating: f32,
    pub play_count: i64,
    pub fail_count: i64,
    pub max_combo: i64,
    pub replays_watched: i64,
    pub total_marv: i64,
    pub total_perf: i64,
    pub total_great: i64,
    pub total_good: i64,
    pub total_okay: i64,
    pub total_miss: i64,
    pub total_pauses: i64,
    pub multiplayer_wins: i64,
    pub multiplayer_losses: i64,
    pub multiplayer_ties: i64,
    pub country_rank: i64,
    pub global_rank: i64,
    pub multiplayer_win_rank: i64,
}

#[derive(Deserialize, Clone, Debug)]
pub struct APIUser {
    pub id: i64,
    pub steam_id: Option<String>,
    pub username: String,
    pub country: Option<String>,
    pub time_registered: Option<DateTime<Utc>>,
    pub allowed: bool,
    pub privileges: i64,
    pub usergroups: i64,
    pub mute_endtime: Option<DateTime<Utc>>,
    pub latest_activity: String,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct APIGetUsersResponse {
    pub status: u32,
    pub users: Vec<APIUser>,
}

#[derive(Deserialize)]
pub struct APISearchUser {
    pub id: i64,
    pub username: String,
    pub steam_id: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct APISearchUsersResponse {
    pub status: u32,
    pub users: Vec<APISearchUser>,
}

#[derive(Insertable)]
#[table_name = "users"]
pub struct NewDBUser {
    pub id: i64,
    pub username: String,
    pub steam_id: Option<String>,
    pub time_registered: Option<NaiveDateTime>,
    pub country: Option<String>,
    pub avatar_url: Option<String>,
}

impl From<APIUser> for NewDBUser {
    fn from(other: APIUser) -> Self {
        NewDBUser {
            id: other.id,
            username: other.username,
            steam_id: other.steam_id,
            time_registered: other.time_registered.map(|dt| dt.naive_utc()),
            country: other.country,
            avatar_url: other.avatar_url,
        }
    }
}
