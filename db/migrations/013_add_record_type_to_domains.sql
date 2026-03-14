ALTER TABLE domains ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'A' CHECK (record_type IN ('A', 'AAAA', 'BOTH'));
