CREATE TABLE pronunciation_scores (
    id                   UUID         PRIMARY KEY,
    reference_text       TEXT         NOT NULL,
    recognized_text      TEXT,
    accuracy_score       NUMERIC(5,2) NOT NULL,
    fluency_score        NUMERIC(5,2) NOT NULL,
    completeness_score   NUMERIC(5,2) NOT NULL,
    prosody_score        NUMERIC(5,2),
    pron_score           NUMERIC(5,2) NOT NULL,
    word_details         JSONB        NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_pronunciation_scores_created ON pronunciation_scores (created_at DESC);
