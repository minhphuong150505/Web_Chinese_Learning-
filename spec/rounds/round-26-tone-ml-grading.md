# Round 26 — ML-based Mandarin tone grading

> **Milestone:** M5 (post-launch quality)
> **Effort:** XL — multi-session research + build initiative, not a single round
> **Prerequisites:** Rounds 17–18 (pronunciation domain + F0 tone engine) complete
> **Blocks if:** no labelled tone data is available yet (Phase 0 gates everything)

## Why this exists

The current F0 tone engine (`tts-service/app/tone.py`) classifies tone by
template-matching a normalised pitch contour. Calibration against real native
TTS voices (`tts-service/scripts/calibrate_tone.py`) showed it is **not reliable
enough to grade**: correct-tone syllables scored mean ~50/100 (male voice ~38),
detection ~62%, and correct-vs-wrong score distributions overlap (correct min=0,
cross max=95). Several DSP fixes (half-third template, onset trim, `to_pitch_ac`
octave-jump suppression, median filtering, robust p10/p90 normalisation) did not
create usable separation. The shapes are mostly right; the gap is genuine
ambiguity + extraction noise that template matching can't resolve.

So the F0 `detectedTone`/`toneScore` are computed and stored but **hidden from the
UI** — a beginner app must never tell a correct speaker they got the tone wrong.
This round replaces template matching with a trained classifier and only re-enables
the UI verdict once it clears a precision bar.

## Goal

A tone classifier that, per syllable, predicts the produced tone (1–4 + neutral)
with a **confidence** such that, above a gate, "wrong tone" verdicts have
**≥90% precision** (false-positive rate on correct speech <10%). Recall is
secondary — silence beats a wrong accusation.

## What already exists (reuse, do not rebuild)

- **Per-syllable boundaries for free:** real Azure zh-CN responses include
  syllable `Offset`/`Duration` (confirmed) — `PronunciationServiceImpl.parseSyllables`
  already parses them. No separate forced aligner needed for app-collected audio.
- **The full serving seam:** `/tone-analyze` (FastAPI) ← `ToneAnalysisClient`
  (Java, multipart, best-effort, tested by `ToneAnalysisClientTest`) ← merged into
  `SyllableScore.detectedTone/toneScore` ← stored in `pronunciation_scores`. The
  model just replaces the body of `app/tone.py:analyze`.
- **Calibration harness:** `calibrate_tone.py` — swap `synth_syllable` for a
  labelled-clip loader and it becomes the eval harness.
- **UI plumbing:** `SyllableBreakdown.tsx` already rendered F0 verdicts; re-enabling
  is a revert + a confidence gate.

## Phases

### Phase 0 — Data (gates everything)
The blocker is labelled ground truth: *what tone did the learner actually produce*.
1. **Collect** real learner audio in-app: persist the uploaded WAV alongside each
   `pronunciation_scores` row (add storage; respect privacy/consent). Azure already
   gives per-syllable pinyin + timing → auto-labels expected tone + window.
2. **Label produced tone:** 2–3 native annotators tag each syllable's *perceived*
   tone (1–4/neutral) from the audio clip. Target ≥3,000 syllables spanning tones,
   speakers, genders, skill levels. Keep inter-annotator agreement; drop disputed.
3. Hold out a speaker-disjoint test set.

Cheap bootstrap before real users: read-aloud sessions from a handful of
volunteers (native + learner) with known target text.

### Phase 1 — Model
- **Features:** per-syllable F0 contour (semitones, speaker-normalised, voiced
  frames, octave-corrected) + energy + duration, resampled to a fixed length.
  Reuse the extraction already in `tone.py`.
- **Classifier:** start simple — gradient boosting / small MLP on contour features;
  escalate to a 1-D CNN or GRU over the frame sequence if needed. Dataset is modest,
  so favour low-variance models + heavy regularisation.
- **Speaker normalisation** is the crux: z-score F0 per speaker/utterance, robust to
  octave errors. This is what template matching got wrong.
- Train to output a tone distribution → confidence = max prob (or margin).

### Phase 2 — Evaluation (reuse harness)
- Per-tone confusion matrix on the speaker-disjoint set.
- **The metric that matters:** precision of "expected ≠ predicted" verdicts at each
  confidence threshold. Pick the gate where precision ≥90%; report the resulting
  recall honestly.
- Compare against the template baseline to prove the lift.

### Phase 3 — Serve + ship
- Implement the model inside `app/tone.py:analyze` (load weights at startup; keep the
  graceful `engine_ready()=False` degrade path). Bundle weights in the image or fetch
  at boot.
- Return `toneScore` (calibrated) + `detectedTone` only above the confidence gate;
  else `detectedTone=null` (UI already handles null).
- Re-enable verdicts in `SyllableBreakdown.tsx` behind the gate; keep Azure accuracy +
  target-tone pinyin as the always-on signals.
- Watch latency on the live voice path (currently best-effort ≤10s); model inference
  must stay well under that.

## Risks / decision points
- **No data, no project.** Phase 0 is the real cost. If in-app collection is too slow,
  buy/commission a labelled set or use a public Mandarin tone corpus to bootstrap
  (note: corpus speech ≠ learner errors, so it under-represents the wrong-tone cases
  we most need).
- **Privacy:** storing learner voice needs explicit consent + retention policy.
- **Neutral tone** is context-dependent and label-noisy — consider excluding from the
  graded verdict initially.
- **Stop criterion:** if Phase 2 can't reach ≥90% precision at any useful recall,
  keep verdicts hidden and ship only Azure accuracy + target tone (today's honest
  state). That is an acceptable outcome, not a failure.

## Verification
- [ ] Labelled dataset built, speaker-disjoint split, agreement reported.
- [ ] Model beats template baseline on the confusion matrix.
- [ ] A confidence gate exists with ≥90% wrong-tone precision; recall reported.
- [ ] `/tone-analyze` served by the model; `calibrate_tone.py`-style eval reproducible.
- [ ] UI re-enabled behind the gate; no verdict shown below it.

## Phase 0 status — implemented (gate-opener)

This round delivered the **Phase 0 foundation** + the **Phase 2 eval harness**, the
parts that don't need annotators and that everything else is blocked on. No model
was trained: a classifier fit on native-TTS voices can't measure wrong-tone
precision (TTS never produces real learner errors), and a good-looking TTS matrix
would only tempt us to re-enable the very verdict this round forbids. So the
**gate stays CLOSED** and UI verdicts remain hidden — the honest current state.

Built:
- **Consent-gated collection** (`app.corpus.enabled`, off by default). Scripted
  read-aloud attempts persist their 16 kHz mono WAV only when the learner opts in
  (`audioConsent`). Stored at `${storage-dir}/<yyyy-MM>/<scoreId>.wav`; row carries
  `audio_consent` / `audio_path` / `audio_retention_until` (`V6` migration). Free
  voice-chat turns are never collected (no reference text → no auto-label).
- **Retention**: daily `CorpusRetentionJob` deletes expired clips and clears the
  pointer after `app.corpus.retention-days` (default 90).
- **Opt-in UI**: privacy-first checkbox in `PronunciationTab` (persisted, default off).
- **Real eval harness** `tts-service/scripts/eval_tone.py`: loads a labelled
  manifest, prints the per-tone confusion matrix and the **wrong-tone precision /
  recall sweep**, and reports the ≥90% gate OPEN/CLOSED. Engine-agnostic — works
  unchanged when the template matcher is swapped for a trained model.
- **Dataset format + privacy**: `tts-service/data/README.md`; clips git-ignored.
- **Synthetic smoke fixture** (`make_synth_fixture.py`) proving the metric math
  runs; explicitly **not** a validation of the gate.

What clears the gate (Phase 1+): enable `app.corpus.enabled`, collect ≥~3,000
consented, native-annotated (`perceived_tone`) syllables across speakers/genders/
skill levels with a speaker-disjoint test split, train the classifier into
`app/tone.py:analyze`, and have `eval_tone.py --split test` report ≥90% wrong-tone
precision at usable recall. Only then re-enable `SyllableBreakdown.tsx` verdicts.

## When complete
Tone verdicts become trustworthy enough to show. Until then, the app already gives
honest, useful feedback (Azure per-syllable accuracy + the tone the learner should aim
for). See `memory/pronunciation-tone-scoring.md`.
