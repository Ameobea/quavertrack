use libquavertrack::db_util::models::{DBScore, Map};
use serde::Serialize;

#[derive(Serialize)]
pub struct GetScoresResponse {
    pub maps: Vec<Map>,
    pub scores: Vec<DBScore>,
}
