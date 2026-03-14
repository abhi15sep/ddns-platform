CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default rate limits
INSERT INTO settings (key, value) VALUES ('rate_limit_per_token', '6') ON CONFLICT DO NOTHING;
INSERT INTO settings (key, value) VALUES ('rate_limit_per_account', '15') ON CONFLICT DO NOTHING;
INSERT INTO settings (key, value) VALUES ('rate_limit_window_seconds', '60') ON CONFLICT DO NOTHING;
