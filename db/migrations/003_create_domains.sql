CREATE TABLE domains (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subdomain   TEXT UNIQUE NOT NULL,
  token       UUID NOT NULL DEFAULT gen_random_uuid(),
  current_ip  TEXT,
  record_type TEXT NOT NULL DEFAULT 'A',
  updated_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_domains_user ON domains(user_id);
CREATE INDEX idx_domains_token ON domains(token);