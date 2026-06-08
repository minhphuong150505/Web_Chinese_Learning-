"""Calibrate the Mandarin tone engine against real native TTS voices.

Synthetic sine waves only prove the math; this harness drives the engine with
actual Microsoft Neural voices (the same family the app uses) to check that:

  1. Correctly-toned native speech scores high on its expected tone.
  2. The detected tone matches the true tone with confidence.
  3. Relabelling a syllable to the WRONG expected tone scores low (separation).

It synthesises each syllable, concatenates them into one multi-syllable
utterance (so the speaker's pitch range is realistic and per-syllable boundaries
are known exactly), and reports score distributions plus suggested thresholds.

Run from the tts-service dir:  python scripts/calibrate_tone.py
Requires network access (edge-tts) and the tone deps (numpy, parselmouth).
To recalibrate against REAL learner recordings later, replace `synth_syllable`
with a loader for labelled (audio, pinyin, tone) clips and keep the rest.
"""

from __future__ import annotations

import asyncio
import statistics
import sys
import tempfile
from pathlib import Path

import edge_tts
import numpy as np
import parselmouth

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.tone import analyze  # noqa: E402

SR = 16000
GAP = 0.12  # seconds of silence between syllables

VOICES = ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"]

# (hanzi, toneless pinyin, true tone) spanning all four tones.
SYLLABLES = [
    ("妈", "ma", 1), ("高", "gao", 1), ("书", "shu", 1), ("天", "tian", 1),
    ("麻", "ma", 2), ("来", "lai", 2), ("学", "xue", 2), ("人", "ren", 2),
    ("马", "ma", 3), ("好", "hao", 3), ("你", "ni", 3), ("水", "shui", 3),
    ("骂", "ma", 4), ("快", "kuai", 4), ("是", "shi", 4), ("大", "da", 4),
]


async def synth_syllable(hanzi: str, voice: str) -> np.ndarray:
    communicate = edge_tts.Communicate(hanzi, voice)
    buf = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.extend(chunk["data"])
    with tempfile.NamedTemporaryFile(delete=True, suffix=".mp3") as f:
        f.write(bytes(buf))
        f.flush()
        sound = parselmouth.Sound(f.name).resample(SR)
    samples = sound.values[0]
    # Trim leading/trailing near-silence so windows are tight.
    amp = np.abs(samples)
    thresh = amp.max() * 0.04
    voiced = np.where(amp > thresh)[0]
    if voiced.size:
        samples = samples[voiced[0]: voiced[-1] + 1]
    return samples


def write_wav(path: str, samples: np.ndarray) -> None:
    import wave

    pcm = (np.clip(samples / (np.max(np.abs(samples)) + 1e-9), -1, 1) * 0.9 * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


async def build_utterance(voice: str):
    """Concatenate all syllables into one WAV; return (wav_path, syllable specs)."""
    gap = np.zeros(int(GAP * SR))
    pieces = []
    specs = []
    cursor = 0.0
    for hanzi, pinyin, tone in SYLLABLES:
        seg = await synth_syllable(hanzi, voice)
        dur = len(seg) / SR
        specs.append({"pinyin": pinyin, "tone": tone, "start": cursor, "dur": dur})
        pieces.append(seg)
        pieces.append(gap)
        cursor += dur + GAP
    audio = np.concatenate(pieces)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    write_wav(tmp.name, audio)
    return tmp.name, specs


def run_voice(wav_path, specs):
    correct_scores, cross_scores = [], []
    detect_hits, detect_total, detect_none = 0, 0, 0

    correct = analyze(wav_path, specs)
    for spec, res in zip(specs, correct):
        if res.tone_score is not None:
            correct_scores.append(res.tone_score)
        detect_total += 1
        if res.detected_tone is None:
            detect_none += 1
        elif res.detected_tone == spec["tone"]:
            detect_hits += 1

    # Cross-tone: claim a different expected tone for each syllable.
    cross_specs = [
        {**s, "tone": (s["tone"] % 4) + 1} for s in specs
    ]
    for res in analyze(wav_path, cross_specs):
        if res.tone_score is not None:
            cross_scores.append(res.tone_score)

    return correct_scores, cross_scores, detect_hits, detect_total, detect_none


async def main():
    all_correct, all_cross = [], []
    hits = total = none = 0
    for voice in VOICES:
        print(f"\n=== {voice} ===")
        wav_path, specs = await build_utterance(voice)
        cs, xs, h, t, n = run_voice(wav_path, specs)
        Path(wav_path).unlink(missing_ok=True)
        all_correct += cs
        all_cross += xs
        hits += h
        total += t
        none += n
        print(f"correct tone score: mean={statistics.mean(cs):.1f} min={min(cs):.1f}")
        print(f"cross  tone score: mean={statistics.mean(xs):.1f} max={max(xs):.1f}")
        print(f"detection: {h}/{t} correct, {n} ambiguous(None)")

    print("\n===== OVERALL =====")
    print(f"correct: mean={statistics.mean(all_correct):.1f} "
          f"min={min(all_correct):.1f} p10={np.percentile(all_correct,10):.1f}")
    print(f"cross:   mean={statistics.mean(all_cross):.1f} "
          f"max={max(all_cross):.1f} p90={np.percentile(all_cross,90):.1f}")
    print(f"detection accuracy (excl. ambiguous): {hits}/{total - none}")
    print(f"ambiguous rate: {none}/{total}")
    # Suggested TONE_OK ~ a bit below the p10 of correct scores; TONE_WEAK between
    # the cross p90 and correct p10.
    print(f"\nsuggested TONE_OK ~ {max(50, np.percentile(all_correct,10) - 5):.0f}, "
          f"TONE_WEAK ~ {(np.percentile(all_correct,10) + np.percentile(all_cross,90)) / 2:.0f}")


if __name__ == "__main__":
    asyncio.run(main())
