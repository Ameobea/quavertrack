use thiserror::Error;

use crate::db_util::models::{APIGetUserResponse, APIScore, APIScoresResponse, APIStatsUser};

const BASE_URL: &str = "https://api.quavergame.com";

fn url(path: impl Into<String>) -> String { format!("{}{}", BASE_URL, path.into()) }

#[derive(Error, Debug)]
pub enum APIError {
    #[error("Error fetching data from Quaver API: {0:?}")]
    ReqwestError(#[from] reqwest::Error),
    #[error("Bad status returned from Quaver API: {0:?}")]
    BadStatus(u32),
}

pub async fn get_user_stats(user_id: i64) -> Result<APIStatsUser, APIError> {
    let res: APIGetUserResponse = reqwest::get(&url(format!("/v1/users/full/{}/", user_id)))
        .await?
        .json()
        .await?;

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(res.user)
}

pub async fn get_user_best_scores(user_id: i64, mode_id: i16) -> Result<Vec<APIScore>, APIError> {
    let res: APIScoresResponse = reqwest::get(&url(format!(
        "/v1/users/scores/best?id={}&mode={}",
        user_id, mode_id
    )))
    .await?
    .json()
    .await?;

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(res.scores)
}

pub async fn get_user_recent_scores(user_id: i64, mode_id: i16) -> Result<Vec<APIScore>, APIError> {
    let res: APIScoresResponse = reqwest::get(&url(format!(
        "/v1/users/scores/recent?id={}&mode={}",
        user_id, mode_id
    )))
    .await?
    .json()
    .await?;

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(res.scores)
}
