table! {
    maps (id) {
        id -> Int8,
        mapset_id -> Int8,
        md5 -> Text,
        artist -> Text,
        title -> Text,
        difficulty_name -> Text,
        creator_id -> Int8,
        creator_username -> Text,
        ranked_status -> Int2,
    }
}

table! {
    scores (id) {
        id -> Int8,
        user_id -> Int8,
        time -> Timestamp,
        mode -> Int2,
        mods -> Int8,
        mods_string -> Text,
        performance_rating -> Float4,
        personal_best -> Bool,
        is_donator_score -> Nullable<Bool>,
        total_score -> Int8,
        accuracy -> Float4,
        grade -> Varchar,
        max_combo -> Int8,
        count_marv -> Int8,
        count_perf -> Int8,
        count_great -> Int8,
        count_good -> Int8,
        count_okay -> Int8,
        count_miss -> Int8,
        scroll_speed -> Int8,
        ratio -> Float4,
        map_id -> Int8,
    }
}

table! {
    stats_updates (id) {
        id -> Int4,
        user_id -> Int8,
        recorded_at -> Timestamp,
        mode -> Int2,
        total_score -> Int8,
        ranked_score -> Int8,
        overall_accuracy -> Float4,
        overall_performance_rating -> Float4,
        play_count -> Int8,
        fail_count -> Int8,
        max_combo -> Int8,
        replays_watched -> Int8,
        total_marv -> Int8,
        total_perf -> Int8,
        total_great -> Int8,
        total_good -> Int8,
        total_okay -> Int8,
        total_miss -> Int8,
        total_pauses -> Int8,
        multiplayer_wins -> Int8,
        multiplayer_losses -> Int8,
        multiplayer_ties -> Int8,
        country_rank -> Int8,
        global_rank -> Int8,
        multiplayer_win_rank -> Int8,
    }
}

table! {
    users (id) {
        id -> Int8,
        username -> Text,
        steam_id -> Nullable<Text>,
        time_registered -> Nullable<Timestamp>,
        country -> Varchar,
        avatar_url -> Text,
        last_updated_at -> Nullable<Timestamp>,
    }
}

joinable!(scores -> maps (map_id));

allow_tables_to_appear_in_same_query!(
    maps,
    scores,
    stats_updates,
    users,
);
