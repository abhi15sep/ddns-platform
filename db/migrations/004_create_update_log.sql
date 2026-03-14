CREATE TABLE update_log (
  id          BIGSERIAL PRIMARY KEY,
  domain      TEXT NOT NULL,
  ip          TEXT NOT NULL,
  source_ip   TEXT,
  user_agent  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_update_log_domain ON update_log(domain, updated_at DESC);