"""Round 26 Phase 2 — evaluate the tone engine against LABELLED learner clips.

Unlike ``calibrate_tone.py`` (which drives the engine with native TTS voices to
prove score *separation*), this harness measures the one number Round 26 exists
for: the **precision of "wrong tone" verdicts on real learner speech**. A false
"you said the wrong tone" on a learner who was actually correct is the harm we
must not ship, so the gate to re-enable UI verdicts is:

    precision(expected != detected) >= 0.90   (false-accusation rate < 10%)

This file is engine-agnostic: it calls ``app.tone.analyze`` and consumes whatever
``detected_tone`` / ``tone_score`` it returns, so it keeps working unchanged when
the template matcher is replaced by a trained classifier (Phase 1).

Ground truth lives in a manifest of clips, each with per-syllable *expected* tone
(from the target text / Azure pinyin) and *perceived* tone (what a native
annotator heard the learner actually produce). Until that data exists the gate is
reported CLOSED and verdicts stay hidden — which is the honest current state.

Manifest: data/tone-corpus/manifest.jsonl, one JSON object per line:

    {"audio": "clips/abc.wav", "speaker": "s01", "split": "test",
     "syllables": [
       {"pinyin": "ni", "expected_tone": 3, "perceived_tone": 3,
        "start": 0.05, "dur": 0.30},
       ...
     ]}

Run from the tts-service dir:
    python scripts/eval_tone.py [--data data/tone-corpus] [--split test]

See data/README.md for how app-collected recordings become this manifest.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.tone import analyze  # noqa: E402

# Tones we grade. Neutral (0) is context-dependent and label-noisy, so it is
# excluded from the graded verdict per the round spec.
GRADED_TONES = (1, 2, 3, 4)
# Confidence gate is swept over the expected-tone score: a verdict ("you produced
# a different tone") is only trustworthy when the expected tone matched *poorly*.
GATE_STEPS = list(range(0, 101, 5))
PRECISION_TARGET = 0.90


@dataclass
class Sample:
    expected: int
    perceived: int
    detected: "int | None"
    score: "float | None"


def is_synthetic(data_dir: Path) -> bool:
    """True when the manifest is the smoke-test fixture, not real learner audio.
    The whole round exists to stop a good-looking-but-invalid result re-enabling
    verdicts, so we make a synthetic run impossible to mistake for a real one."""
    manifest = data_dir / "manifest.jsonl"
    if not manifest.exists():
        return False
    head = manifest.read_text(encoding="utf-8")[:512].upper()
    return "SYNTHETIC" in head or "synth" in data_dir.name.lower()


def load_manifest(data_dir: Path, split: "str | None") -> "list[dict]":
    manifest = data_dir / "manifest.jsonl"
    if not manifest.exists():
        return []
    clips = []
    for line in manifest.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        clip = json.loads(line)
        if split and clip.get("split") != split:
            continue
        clips.append(clip)
    return clips


def collect_samples(data_dir: Path, clips: "list[dict]") -> "list[Sample]":
    samples: list[Sample] = []
    for clip in clips:
        audio = (data_dir / clip["audio"]).as_posix()
        sylls = clip.get("syllables", [])
        # analyze scores each syllable's contour against its *expected* tone.
        specs = [
            {"pinyin": s.get("pinyin", ""), "tone": int(s["expected_tone"]),
             "start": float(s["start"]), "dur": float(s["dur"])}
            for s in sylls
        ]
        results = analyze(audio, specs)
        for s, r in zip(sylls, results):
            expected = int(s["expected_tone"])
            perceived = int(s["perceived_tone"])
            if expected not in GRADED_TONES or perceived not in GRADED_TONES:
                continue
            samples.append(Sample(expected, perceived, r.detected_tone, r.tone_score))
    return samples


def confusion(samples: "list[Sample]") -> None:
    """Perceived (ground truth) vs detected tone, over syllables the engine named."""
    named = [s for s in samples if s.detected is not None]
    print("\nConfusion matrix (rows = perceived/true, cols = detected):")
    header = "          " + "".join(f"  T{t:<5}" for t in GRADED_TONES) + "   (None)"
    print(header)
    none_by_true = Counter(s.perceived for s in samples if s.detected is None)
    for true_t in GRADED_TONES:
        row = [s for s in samples if s.perceived == true_t]
        cells = "".join(
            f"  {sum(1 for s in row if s.detected == det):<6}" for det in GRADED_TONES
        )
        print(f"  perceived T{true_t}{cells}   {none_by_true.get(true_t, 0)}")
    if named:
        acc = sum(1 for s in named if s.detected == s.perceived) / len(named)
        print(f"\n  detection accuracy (named only): {acc * 100:.1f}%  "
              f"({len(named)}/{len(samples)} syllables named, "
              f"{len(samples) - len(named)} ambiguous)")


def precision_recall_sweep(samples: "list[Sample]", synthetic: bool = False) -> None:
    """The metric that matters: precision of wrong-tone verdicts at each gate."""
    truly_wrong = sum(1 for s in samples if s.perceived != s.expected)
    print(f"\nWrong-tone verdict precision/recall "
          f"({truly_wrong} truly-wrong of {len(samples)} graded syllables):")
    print("  score_gate   shown   TP    FP    precision   recall")

    best = None  # (recall, gate, precision) for precision >= target
    for gate in GATE_STEPS:
        tp = fp = 0
        for s in samples:
            # A verdict is shown when the engine named a *different* tone and is
            # confident enough (the expected tone matched poorly: score <= gate).
            shown = (
                s.detected is not None
                and s.detected != s.expected
                and s.score is not None
                and s.score <= gate
            )
            if not shown:
                continue
            if s.perceived != s.expected:
                tp += 1
            else:
                fp += 1
        shown_n = tp + fp
        precision = tp / shown_n if shown_n else float("nan")
        recall = tp / truly_wrong if truly_wrong else float("nan")
        flag = ""
        if shown_n and precision >= PRECISION_TARGET:
            flag = "  <- meets 90%"
            cand = (recall, gate, precision)
            if best is None or recall > best[0]:
                best = cand
        prec_s = f"{precision * 100:5.1f}%" if shown_n else "   n/a"
        print(f"  <= {gate:<8} {shown_n:<6} {tp:<5} {fp:<5} {prec_s}     "
              f"{recall * 100:5.1f}%{flag}")

    print("\n" + "=" * 60)
    if best is not None:
        recall, gate, precision = best
        if synthetic:
            print("GATE: NOT EVALUATED — this is the SYNTHETIC smoke fixture. The "
                  "result below only proves the metric math runs; clean sines are "
                  "error-free by construction and CANNOT clear the gate. Re-run on "
                  "real annotated learner audio.")
        print(f"GATE: OPEN candidate — show verdict when tone_score <= {gate} "
              f"(precision {precision * 100:.1f}%, recall {recall * 100:.1f}%).")
        print("Confirm on a speaker-disjoint test split before enabling the UI.")
    else:
        print(f"GATE: CLOSED — no threshold reaches {PRECISION_TARGET * 100:.0f}% "
              f"wrong-tone precision. Keep verdicts hidden (ship Azure accuracy + "
              f"target tone only). This is an acceptable outcome, not a failure.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Evaluate tone grading on labelled clips.")
    ap.add_argument("--data", default="data/tone-corpus",
                    help="dataset dir containing manifest.jsonl (default: data/tone-corpus)")
    ap.add_argument("--split", default=None,
                    help="only evaluate clips with this split (e.g. test)")
    args = ap.parse_args()

    data_dir = Path(args.data)
    clips = load_manifest(data_dir, args.split)
    if not clips:
        print(f"No labelled clips found at {data_dir}/manifest.jsonl"
              + (f" for split={args.split}" if args.split else "") + ".")
        print("GATE: CLOSED — Phase 0 data not collected yet. Tone verdicts stay "
              "hidden; the app ships Azure per-syllable accuracy + target tone.")
        print("See data/README.md to start collecting consented learner audio.")
        return

    synthetic = is_synthetic(data_dir)
    if synthetic:
        print("!! SYNTHETIC FIXTURE — smoke test only; does NOT validate the gate.\n")
    samples = collect_samples(data_dir, clips)
    speakers = {c.get("speaker") for c in clips}
    print(f"Evaluated {len(clips)} clip(s), {len(samples)} graded syllable(s), "
          f"{len(speakers)} speaker(s)"
          + (f", split={args.split}" if args.split else "") + ".")
    if not samples:
        print("GATE: CLOSED — clips present but no graded (tone 1-4) syllables.")
        return

    scored = [s.score for s in samples if s.score is not None]
    if scored:
        print(f"Expected-tone score: mean={statistics.mean(scored):.1f} "
              f"min={min(scored):.1f} max={max(scored):.1f}")
    confusion(samples)
    precision_recall_sweep(samples, synthetic)


if __name__ == "__main__":
    main()
