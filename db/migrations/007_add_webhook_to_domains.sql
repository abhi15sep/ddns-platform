-- Add webhook URL column to domains table
ALTER TABLE domains ADD COLUMN IF NOT EXISTS webhook_url TEXT;
