ALTER TABLE users ADD COLUMN last_updated_at TIMESTAMP;
UPDATE users SET last_updated_at=(SELECT stats_updates.recorded_at from stats_updates WHERE users.id=stats_updates.user_id ORDER BY stats_updates.recorded_at DESC LIMIT 1);
