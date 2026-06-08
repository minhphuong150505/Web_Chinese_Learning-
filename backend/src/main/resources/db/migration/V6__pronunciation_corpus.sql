-- Round 26 Phase 0: opt-in collection of learner recordings to build a labelled
-- Mandarin tone corpus. Tone grading can only be re-enabled once a classifier is
-- trained on real learner audio (native TTS corpus speech under-represents the
-- wrong-tone errors we most need to catch). The blocker is ground-truth data, so
-- the gate-opener is storing the WAV alongside each scored attempt.
--
-- Audio is persisted only with the learner's explicit consent and is purged after
-- a retention window. See spec/rounds/round-26-tone-ml-grading.md.
ALTER TABLE pronunciation_scores
    ADD COLUMN audio_consent         BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN audio_path            TEXT,
    ADD COLUMN audio_retention_until TIMESTAMPTZ;

-- Lets the daily retention sweep find expirable clips without scanning the table.
CREATE INDEX idx_pronunciation_scores_audio_retention
    ON pronunciation_scores (audio_retention_until)
    WHERE audio_path IS NOT NULL;
