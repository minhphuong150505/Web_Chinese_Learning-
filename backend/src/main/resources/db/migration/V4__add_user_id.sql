-- user_id is added nullable so this migration succeeds on an existing demo DB.
-- The application treats it as required on every new row (set from the authenticated user).
ALTER TABLE conversations
    ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE pronunciation_scores
    ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_conversations_user        ON conversations (user_id, updated_at DESC);
CREATE INDEX idx_pron_scores_user_created  ON pronunciation_scores (user_id, created_at DESC);
