use fnv::FnvHashMap as HashMap;
use libquavertrack::db_util::models::{DBScore, Map};
use serde::Serialize;

#[derive(Serialize)]
pub struct GetScoresResponse {
    pub maps: HashMap<i64, Map>,
    pub scores: Vec<DBScore>,
}
