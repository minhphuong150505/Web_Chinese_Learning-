"""Generate a SYNTHETIC labelled fixture to smoke-test scripts/eval_tone.py.

This proves the eval harness + metric math run end to end without needing network
(edge-tts) or real learner data. It synthesises sine tones whose F0 follows each
Mandarin tone shape, and deliberately includes "wrong" productions (where the
*perceived* tone differs from the *expected* tone) so the precision/recall sweep
has both true and false positives to score.

IMPORTANT: synthetic sines only prove the math. They are clean, native, and
error-free by construction — they CANNOT validate the >=90% wrong-tone precision
bar on real speech. Do not treat a good result here as clearing the gate. See
spec/rounds/round-26-tone-ml-grading.md and data/README.md.

    python scripts/make_synth_fixture.py            # writes data/tone-synth/
    python scripts/eval_tone.py --data data/tone-synth
"""

from __future__ import annotations

import json
import wave
from pathlib import Path

import numpy as np

SR = 16000
GAP = 0.10
SYL_DUR = 0.35

# Tone shape as semitone offsets across the syllable (relative to the speaker's
# mid pitch), sampled then interpolated. Matches canonical Chao shapes.
TONE_SEMIS = {
    1: [4.0, 4.0, 4.0, 4.0, 4.0],     # high level
    2: [-1.0, 0.0, 1.5, 3.5, 5.0],    # rising
    3: [-1.0, -3.0, -5.0, -3.5, -1.5],  # low dipping
    4: [5.0, 2.5, -1.0, -4.0, -6.0],  # falling
}

# (pinyin, expected_tone, perceived_tone). Mix of correct (expected==perceived)
# and wrong (learner produced a different tone than the target).
PLAN = [
    ("ma", 1, 1), ("ma", 2, 2), ("ma", 3, 3), ("ma", 4, 4),   # all correct
    ("ni", 3, 3), ("hao", 3, 3), ("shi", 4, 4), ("jie", 4, 4),  # correct
    ("hao", 3, 1), ("lai", 2, 4), ("shu", 1, 2), ("da", 4, 3),  # wrong productions
]

SPEAKERS = [("s01", 180.0), ("s02", 110.0)]  # female-ish, male-ish base F0


def synth_syllable(base_f0: float, tone: int) -> np.ndarray:
    n = int(SYL_DUR * SR)
    semis = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, 5), TONE_SEMIS[tone])
    f0 = base_f0 * (2.0 ** (semis / 12.0))
    phase = 2 * np.pi * np.cumsum(f0) / SR
    # A couple of harmonics + a soft envelope so parselmouth tracks pitch cleanly.
    sig = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
    env = np.hanning(n) ** 0.3
    return (sig * env).astype(np.float64)


def write_wav(path: Path, samples: np.ndarray) -> None:
    pcm = (np.clip(samples / (np.max(np.abs(samples)) + 1e-9), -1, 1) * 0.9 * 32767).astype(np.int16)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    out = Path("data/tone-synth")
    clips_dir = out / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    lines = ["# SYNTHETIC fixture — smoke test only, does NOT validate the gate."]
    for speaker, base in SPEAKERS:
        gap = np.zeros(int(GAP * SR))
        pieces, sylls, cursor = [], [], 0.0
        for pinyin, expected, perceived in PLAN:
            seg = synth_syllable(base, perceived)  # learner produced the PERCEIVED tone
            dur = len(seg) / SR
            sylls.append({
                "pinyin": pinyin, "expected_tone": expected, "perceived_tone": perceived,
                "start": round(cursor, 4), "dur": round(dur, 4),
            })
            pieces += [seg, gap]
            cursor += dur + GAP
        rel = f"clips/{speaker}.wav"
        write_wav(out / rel, np.concatenate(pieces))
        lines.append(json.dumps({
            "audio": rel, "speaker": speaker, "split": "test", "syllables": sylls,
        }, ensure_ascii=False))

    (out / "manifest.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out}/manifest.jsonl with {len(SPEAKERS)} synthetic clip(s).")
    print("Now run:  python scripts/eval_tone.py --data data/tone-synth")


if __name__ == "__main__":
    main()
