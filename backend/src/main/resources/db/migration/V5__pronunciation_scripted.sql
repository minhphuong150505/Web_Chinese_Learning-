-- Distinguishes read-aloud attempts (scripted, with a reference text) from
-- free-speech turns in voice chat (unscripted). Completeness is only meaningful
-- for scripted attempts, so the UI hides it when scripted = false.
ALTER TABLE pronunciation_scores
    ADD COLUMN scripted BOOLEAN NOT NULL DEFAULT TRUE;
