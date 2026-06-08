CREATE TABLE conversations (
    id          UUID         PRIMARY KEY,
    title       VARCHAR(255) NOT NULL DEFAULT 'New conversation',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id              UUID         PRIMARY KEY,
    conversation_id UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(16)  NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT         NOT NULL,
    audio_path      VARCHAR(512),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_created
    ON messages (conversation_id, created_at);
