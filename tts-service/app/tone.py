"""Mandarin tone analysis from the pitch (F0) contour of recorded speech.

Azure's pronunciation assessment folds tone correctness into a single
per-syllable accuracy number; it never tells the learner *which* tone they
actually produced. A Chinese teacher does exactly that ("you said the 3rd tone
like a 1st tone"). To reproduce that, we read the fundamental-frequency (pitch)
contour of each syllable and compare its *shape* against the canonical Mandarin
tone shapes (Chao tone letters), independent of how high or low the speaker's
voice sits.

The whole module degrades gracefully: if the pitch library is missing or the
audio is unusable, `analyze` returns results with ``detected_tone = None`` and a
``null`` score so the backend simply omits tone feedback instead of failing.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

try:
    import numpy as np
    import parselmouth

    _ENGINE_READY = True
except Exception:  # pragma: no cover - exercised only when deps are absent
    _ENGINE_READY = False


# Canonical tone shapes on Chao's 1 (lowest) .. 5 (highest) scale, sampled at
# five evenly spaced points across the syllable. These are speaker-independent:
# we rescale every speaker's pitch into this same 1..5 band before comparing.
#   1 = high level (55), 2 = rising (35), 3 = dipping (214), 4 = falling (51)
_TEMPLATES: dict[int, "list[float]"] = {
    1: [5.0, 5.0, 5.0, 5.0, 5.0],
    2: [2.8, 2.9, 3.4, 4.2, 5.0],
    # Citation tone 3 is usually a "half-third": low and dipping with little or no
    # final rise. Matching the textbook 214 rise hurts real speech badly.
    3: [2.2, 1.4, 1.0, 1.1, 1.5],
    4: [5.0, 4.0, 2.8, 1.7, 1.0],
}

# A neutral (light) tone is short and contextual; its shape is not diagnostic,
# so we never penalise it on contour and report it as "neutral" when expected.
NEUTRAL_TONE = 0

_N_POINTS = 5
# RMS distance (on the 1..5 scale) at which a tone match scores 0. A correctly
# produced tone typically lands well under 1.0; a swapped tone lands above 2.0.
_ZERO_SCORE_DISTANCE = 2.3

# Minimum speaker pitch range (semitones) used for the 1..5 rescale. Below this
# the speaker is essentially monotone and contour shape is not trustworthy.
_MIN_RANGE_SEMITONES = 4.0

# If the best and second-best tone templates are closer than this (RMS on the
# 1..5 scale), the contour is ambiguous — common for hesitant, monotone beginner
# speech — and we report detected_tone = None rather than guess a wrong tone.
_DETECT_MARGIN = 0.45


@dataclass
class SyllableTone:
    pinyin: str
    expected_tone: int
    detected_tone: "int | None"
    tone_score: "float | None"  # 0..100, how well the contour matched the expected tone


def engine_ready() -> bool:
    return _ENGINE_READY


def analyze(wav_path: str, syllables: "list[dict]") -> "list[SyllableTone]":
    """Score each syllable's tone. ``syllables`` items: {pinyin, tone, start, dur}
    where start/dur are seconds into ``wav_path``."""
    if not _ENGINE_READY:
        return [_unavailable(s) for s in syllables]

    try:
        sound = parselmouth.Sound(wav_path)
        # to_pitch_ac with a raised octave-jump cost suppresses the spurious
        # octave doubling/halving that otherwise wrecks low (male) voices.
        pitch = sound.to_pitch_ac(
            time_step=0.01,
            pitch_floor=70.0,
            pitch_ceiling=400.0,
            octave_jump_cost=0.6,
            voicing_threshold=0.5,
        )
        times = pitch.xs()
        freqs = pitch.selected_array["frequency"]  # 0.0 marks unvoiced frames
    except Exception:
        return [_unavailable(s) for s in syllables]

    voiced_mask = freqs > 0
    voiced_freqs = freqs[voiced_mask]
    if voiced_freqs.size < 3:
        return [_unavailable(s) for s in syllables]

    # Work in semitones so the perceptual scaling matches how tone is heard, then
    # fix the speaker's range from robust percentiles of the whole utterance.
    semis = 12.0 * np.log2(voiced_freqs / np.median(voiced_freqs))
    # Robust band: median-filter out single-frame spikes and use p10/p90 so a few
    # octave outliers can't stretch the 1..5 band and squash every real contour.
    filtered = _median_filter(semis, 5)
    lo, hi = np.percentile(filtered, 10), np.percentile(filtered, 90)
    # Floor the range so a near-monotone utterance (very little pitch movement)
    # can't blow tiny jitter up into a full 1..5 swing and invent fake contours.
    span = max(hi - lo, _MIN_RANGE_SEMITONES)
    all_semis = np.full_like(freqs, np.nan)
    all_semis[voiced_mask] = semis

    results: list[SyllableTone] = []
    for s in syllables:
        results.append(_score_syllable(s, times, all_semis, lo, span))
    return results


def _score_syllable(s, times, all_semis, lo, span) -> SyllableTone:
    pinyin = s.get("pinyin", "")
    expected = int(s.get("tone", 0) or 0)
    start = float(s.get("start", 0.0))
    dur = float(s.get("dur", 0.0))

    if dur <= 0:
        return SyllableTone(pinyin, expected, None, None)

    end = start + dur
    window = (times >= start) & (times < end)
    seg = all_semis[window]
    seg = seg[~np.isnan(seg)] if seg.size else seg
    if seg.size < 3:
        # Too little voiced signal to judge the contour.
        return SyllableTone(pinyin, expected, None, None)

    # The tone lives in the rime, not the onset. Drop the leading voiced glide
    # (e.g. nasal/approximant onset) and any final devoicing so consonant pitch
    # doesn't distort the contour.
    if seg.size >= 6:
        lo_cut = int(0.25 * seg.size)
        hi_cut = max(lo_cut + 3, int(0.92 * seg.size))
        seg = seg[lo_cut:hi_cut]

    # Median-filter to kill single-frame octave outliers that survive tracking.
    seg = _median_filter(seg, 3)

    # Resample the voiced contour to a fixed number of points, then map into the
    # speaker's 1..5 Chao band.
    contour = _resample(seg, _N_POINTS)
    chao = 1.0 + 4.0 * (contour - lo) / span
    chao = np.clip(chao, 1.0, 5.0)

    distances = {t: _rms(chao, tmpl) for t, tmpl in _TEMPLATES.items()}
    ordered = sorted(distances.values())
    detected = min(distances, key=distances.get)
    # Only trust the detected label when one template clearly wins; otherwise the
    # contour is ambiguous and naming a tone would mislead the learner.
    if len(ordered) < 2 or (ordered[1] - ordered[0]) < _DETECT_MARGIN:
        detected = None

    if expected == NEUTRAL_TONE:
        # Neutral tone carries no diagnostic shape; report detection but don't
        # punish the learner for it.
        return SyllableTone(pinyin, expected, detected, 85.0)

    expected_dist = distances.get(expected)
    if expected_dist is None:
        return SyllableTone(pinyin, expected, detected, None)
    score = 100.0 * (1.0 - expected_dist / _ZERO_SCORE_DISTANCE)
    score = float(max(0.0, min(100.0, score)))
    return SyllableTone(pinyin, expected, detected, round(score, 1))


def _median_filter(values, size: int):
    """Simple odd-window median filter; returns the array unchanged if too short."""
    if values.size < size or size < 2:
        return values
    half = size // 2
    out = values.copy()
    for i in range(values.size):
        a = max(0, i - half)
        b = min(values.size, i + half + 1)
        out[i] = np.median(values[a:b])
    return out


def _resample(values, n: int):
    """Linearly resample a 1-D array to exactly ``n`` points."""
    if values.size == n:
        return values.astype(float)
    src = np.linspace(0.0, 1.0, values.size)
    dst = np.linspace(0.0, 1.0, n)
    return np.interp(dst, src, values)


def _rms(a, template) -> float:
    diff = a - np.asarray(template)
    return float(math.sqrt(float(np.mean(diff * diff))))


def _unavailable(s) -> SyllableTone:
    return SyllableTone(s.get("pinyin", ""), int(s.get("tone", 0) or 0), None, None)
