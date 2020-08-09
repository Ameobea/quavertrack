CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username TEXT NOT NULL,
  steam_id TEXT,
  time_registered TIMESTAMP,
  country VARCHAR(4) NOT NULL,
  avatar_url TEXT NOT NULL
);

-- mode: 1=4k, 2=7k
CREATE TABLE stats_updates (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  recorded_at TIMESTAMP DEFAULT current_timestamp NOT NULL,
  mode SMALLINT NOT NULL,
  total_score BIGINT NOT NULL,
  ranked_score BIGINT NOT NULL,
  overall_accuracy REAL NOT NULL,
  overall_performance_rating REAL NOT NULL,
  play_count BIGINT NOT NULL,
  fail_count BIGINT NOT NULL,
  max_combo BIGINT NOT NULL,
  replays_watched BIGINT NOT NULL,
  total_marv BIGINT NOT NULL,
  total_perf BIGINT NOT NULL,
  total_great BIGINT NOT NULL,
  total_good BIGINT NOT NULL,
  total_okay BIGINT NOT NULL,
  total_miss BIGINT NOT NULL,
  total_pauses BIGINT NOT NULL,
  multiplayer_wins BIGINT NOT NULL,
  multiplayer_losses BIGINT NOT NULL,
  multiplayer_ties BIGINT NOT NULL,
  country_rank BIGINT NOT NULL,
  global_rank BIGINT NOT NULL,
  multiplayer_win_rank BIGINT NOT NULL
);

CREATE TABLE maps (
  id BIGINT PRIMARY KEY,
  mapset_id BIGINT NOT NULL,
  md5 TEXT NOT NULL,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty_name TEXT NOT NULL,
  creator_id BIGINT NOT NULL,
  creator_username TEXT NOT NULL,
  ranked_status SMALLINT NOT NULL
);

CREATE TABLE scores (
  id BIGINT PRIMARY KEY NOT NULL,
  user_id BIGINT NOT NULL,
  time TIMESTAMP NOT NULL,
  mode SMALLINT NOT NULL,
  mods BIGINT NOT NULL,
  mods_string TEXT NOT NULL,
  performance_rating REAL NOT NULL,
  personal_best BOOLEAN NOT NULL,
  is_donator_score BOOLEAN,
  total_score BIGINT NOT NULL,
  accuracy REAL NOT NULL,
  grade VARCHAR(4) NOT NULL,
  max_combo BIGINT NOT NULL,
  count_marv BIGINT NOT NULL,
  count_perf BIGINT NOT NULL,
  count_great BIGINT NOT NULL,
  count_good BIGINT NOT NULL,
  count_okay BIGINT NOT NULL,
  count_miss BIGINT NOT NULL,
  scroll_speed BIGINT NOT NULL,
  ratio REAL NOT NULL,
  map_id BIGINT NOT NULL,
  CONSTRAINT fk_map_id FOREIGN KEY(map_id) REFERENCES maps(id)
);
