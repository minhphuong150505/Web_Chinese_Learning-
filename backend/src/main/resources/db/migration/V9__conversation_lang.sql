-- Practice language of each conversation. Existing conversations predate
-- multi-language support and are all Mandarin, so they default to 'zh'.
ALTER TABLE conversations
    ADD COLUMN lang VARCHAR(8) NOT NULL DEFAULT 'zh';
