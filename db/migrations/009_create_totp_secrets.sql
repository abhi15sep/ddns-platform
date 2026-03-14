CREATE TABLE IF NOT EXISTS totp_secrets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  secret      TEXT NOT NULL,
  verified    BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[], -- hashed backup codes
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
