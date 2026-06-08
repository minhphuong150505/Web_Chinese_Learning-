# Tone-grading corpus (Round 26 Phase 0)

This directory holds the **labelled learner audio** that gates ML tone grading.
Until it is populated, `scripts/eval_tone.py` reports the gate **CLOSED** and the
app ships only Azure per-syllable accuracy + the target tone (today's honest
state). See `../../spec/rounds/round-26-tone-ml-grading.md`.

## Layout

```
data/
  tone-corpus/            # real labelled clips (git-ignored — never commit voice)
    manifest.jsonl
    clips/<id>.wav
  tone-synth/             # synthetic smoke-test fixture (git-ignored, regenerable)
```

## Where the audio comes from

The backend persists each scored read-aloud attempt's 16 kHz mono WAV **only when
the learner opted in** (`audioConsent`) and `app.corpus.enabled=true`. Files land
under `${app.corpus.storage-dir}/<yyyy-MM>/<scoreId>.wav` and are purged after
`app.corpus.retention-days`. Export those, plus the per-syllable pinyin + timing
already stored on each `pronunciation_scores` row, to build the manifest below.

Azure gives the **expected** tone (pinyin tone digit) and the syllable window
(`Offset`/`Duration`) for free. The only manual step is the **perceived** tone:
2–3 native annotators tag what each syllable actually *sounded like* (1–4, or
neutral). Keep inter-annotator agreement; drop disputed syllables. Target ≥3,000
graded syllables across tones, speakers, genders, and skill levels, with a
**speaker-disjoint** test split.

## Manifest format — `manifest.jsonl`

One JSON object per line (blank lines and `#` comments ignored):

```json
{"audio": "clips/<id>.wav", "speaker": "s01", "split": "test",
 "syllables": [
   {"pinyin": "ni", "expected_tone": 3, "perceived_tone": 3, "start": 0.05, "dur": 0.30},
   {"pinyin": "hao", "expected_tone": 3, "perceived_tone": 1, "start": 0.40, "dur": 0.28}
 ]}
```

- `expected_tone` — target tone from the text/Azure pinyin (auto).
- `perceived_tone` — annotator-judged produced tone (the ground truth for grading).
- `start`/`dur` — seconds into the WAV (from Azure syllable timing).
- `split` — `train` / `dev` / `test`; keep speakers disjoint across splits.

Neutral tone (0) is excluded from the graded verdict initially (label-noisy).

## Privacy

Voice recordings are personal data. Collect only with explicit in-app consent,
store under the retention window, never commit clips to git, and honour deletion
requests. The `.gitignore` here blocks `tone-corpus/` and `tone-synth/`.

## Smoke-testing the harness without data

```
python scripts/make_synth_fixture.py          # writes data/tone-synth/
python scripts/eval_tone.py --data data/tone-synth
```

Synthetic sines only prove the metric math runs — they are clean and error-free
by construction and **cannot** validate the ≥90% precision bar on real speech.
