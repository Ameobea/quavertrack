use serde::Deserialize;
use thiserror::Error;

use crate::db_util::models::{
    APIGetUserStatsResponse, APIGetUsersResponse, APIScore, APIScoresResponse,
    APISearchUsersResponse, APIStatsUser, APIUser,
};

const BASE_URL: &str = "https://api.quavergame.com";

fn url(path: impl Into<String>) -> String {
    let url = format!("{}{}", BASE_URL, path.into());
    info!("FETCHING: {}", url);
    url
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum QuaverResponse<T> {
    Success(T),
    Error { status: u32, error: String },
}

impl<T> QuaverResponse<T> {
    pub fn success(self) -> Result<Option<T>, APIError> {
        match self {
            QuaverResponse::Success(val) => Ok(Some(val)),
            QuaverResponse::Error { status, error } => {
                if status == 404 {
                    return Ok(None);
                }

                error!(
                    "Error from quaver API; status_code={}, error: {}",
                    status, error
                );
                Err(APIError::QuaverAPIError { status, error })
            },
        }
    }
}

#[derive(Error, Debug)]
pub enum APIError {
    #[error("Error fetching data from Quaver API: {0:?}")]
    ReqwestError(#[from] reqwest::Error),
    #[error("Bad status returned from Quaver API: {0:?}")]
    BadStatus(u32),
    #[error("Error from Quaver API: status={status}, error: {error}")]
    QuaverAPIError { status: u32, error: String },
}

pub async fn get_user_stats(user_id: i64) -> Result<Option<APIStatsUser>, APIError> {
    info!("get_user_stats user_id={}", user_id);
    let res_opt = reqwest::get(&url(format!("/v1/users/full/{}/", user_id)))
        .await?
        .json::<QuaverResponse<APIGetUserStatsResponse>>()
        .await?
        .success()?;
    let res = match res_opt {
        Some(res) => res,
        None => return Ok(None),
    };

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(Some(res.user))
}

pub async fn get_user_best_scores(
    user_id: i64,
    mode_id: i16,
) -> Result<Option<Vec<APIScore>>, APIError> {
    info!(
        "get_user_best_scores user_id={}, mode_id={}",
        user_id, mode_id
    );
    let res_opt = reqwest::get(&url(format!(
        "/v1/users/scores/best?id={}&mode={}",
        user_id, mode_id
    )))
    .await?
    .json::<QuaverResponse<APIScoresResponse>>()
    .await?
    .success()?;
    let res = match res_opt {
        Some(res) => res,
        None => return Ok(None),
    };

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(Some(res.scores))
}

pub async fn get_user_recent_scores(
    user_id: i64,
    mode_id: i16,
) -> Result<Option<Vec<APIScore>>, APIError> {
    info!(
        "get_user_recent_scores user_id={}, mode_id={}",
        user_id, mode_id
    );
    let res_opt = reqwest::get(&url(format!(
        "/v1/users/scores/recent?id={}&mode={}",
        user_id, mode_id
    )))
    .await?
    .json::<QuaverResponse<APIScoresResponse>>()
    .await?
    .success()?;
    let res = match res_opt {
        Some(res) => res,
        None => return Ok(None),
    };

    if res.status != 200 {
        return Err(APIError::BadStatus(res.status));
    }

    Ok(Some(res.scores))
}

async fn get_user_by_id(user_id: i64) -> Result<Option<APIUser>, APIError> {
    let res = reqwest::get(&url(format!("/v1/users?id={}", user_id)))
        .await?
        .json::<QuaverResponse<APIGetUsersResponse>>()
        .await?
        .success()?
        .expect("Shouldn't be able to get 404 from this endpoint");

    Ok(res.users.into_iter().next())
}

pub async fn lookup_user(user: &str) -> Result<Option<APIUser>, APIError> {
    info!("lookup_user user={:?}", user);

    // Try to get by ID first if `user` is a valid id
    if let Ok(parsed_user_id) = user.parse::<i64>() {
        if let Some(user) = get_user_by_id(parsed_user_id).await? {
            return Ok(Some(user));
        }
    }

    // Try to lookup user by username
    let res = reqwest::get(&url(format!("/v1/users/search/{}", user)))
        .await?
        .json::<QuaverResponse<APISearchUsersResponse>>()
        .await?
        .success()?
        .expect("Shouldn't be able to get 404 from this endpoint");

    let user_id: i64 = match res.users.into_iter().next() {
        Some(user) => user.id,
        None => return Ok(None),
    };

    // We found the user by username; now use that id to look them up
    get_user_by_id(user_id).await
}

#[test]
fn stats_deserialization() {
    let raw = r#"
{"status":200,"user":{"info":{"id":19250,"steam_id":"76561198098147167","username":"ameo","time_registered":"2020-07-15T03:25:26.679Z","allowed":1,"privileges":1,"usergroups":1,"mute_endtime":"1970-01-01T00:00:00.000Z","latest_activity":"2020-08-08T21:50:39.855Z","country":"US","avatar_url":"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/93/9346acec9e58e4f11e3c095323097ad1982d5adc_full.jpg","userpage":null,"online":false},"profile_badges":[],"activity_feed":[{"id":107284,"type":7,"timestamp":"2020-07-18T03:44:21.839Z","map":{"id":-1,"name":"Perfectionist"}},{"id":106785,"type":7,"timestamp":"2020-07-18T01:55:28.744Z","map":{"id":-1,"name":"Humble Beginnings"}},{"id":99135,"type":7,"timestamp":"2020-07-16T17:30:10.525Z","map":{"id":-1,"name":"Quombo"}},{"id":88115,"type":7,"timestamp":"2020-07-15T03:28:02.143Z","map":{"id":-1,"name":"Baby Steps"}},{"id":88096,"type":0,"timestamp":"2020-07-15T03:25:26.683Z"}],"keys4":{"globalRank":7961,"countryRank":1889,"multiplayerWinRank":4833,"stats":{"user_id":19250,"total_score":133582330,"ranked_score":67926257,"overall_accuracy":89.57049465155498,"overall_performance_rating":50.276700110008136,"play_count":293,"fail_count":80,"max_combo":503,"replays_watched":0,"total_marv":51038,"total_perf":30817,"total_great":7918,"total_good":2589,"total_okay":896,"total_miss":6688,"total_pauses":0,"multiplayer_wins":1,"multiplayer_losses":32,"multiplayer_ties":5}},"keys7":{"globalRank":38698,"countryRank":10104,"multiplayerWinRank":37095,"stats":{"user_id":19250,"total_score":2416,"ranked_score":0,"overall_accuracy":0,"overall_performance_rating":0,"play_count":1,"fail_count":1,"max_combo":2,"replays_watched":0,"total_marv":0,"total_perf":3,"total_great":0,"total_good":0,"total_okay":1,"total_miss":17,"total_pauses":0,"multiplayer_wins":0,"multiplayer_losses":0,"multiplayer_ties":0}}}}
"#;

    let _: QuaverResponse<APIGetUserStatsResponse> = serde_json::from_str(raw).unwrap();
}
