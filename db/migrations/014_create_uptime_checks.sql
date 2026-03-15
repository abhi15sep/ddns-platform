CREATE TABLE IF NOT EXISTS uptime_checks (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL,        -- 'api', 'database', 'dns'
  status VARCHAR(20) NOT NULL,         -- 'ok', 'degraded', 'down'
  latency_ms INTEGER,
  detail TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uptime_checks_service_time ON uptime_checks (service, checked_at DESC);
CREATE INDEX idx_uptime_checks_time ON uptime_checks (checked_at DESC);

-- Clean up checks older than 90 days automatically
-- (run via cron or the app itself)