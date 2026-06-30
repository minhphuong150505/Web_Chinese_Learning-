-- Target-language code of each pronunciation attempt. Existing rows predate
-- multi-language support and are all Mandarin, so they default to 'zh'.
ALTER TABLE pronunciation_scores
    ADD COLUMN lang VARCHAR(8) NOT NULL DEFAULT 'zh';
