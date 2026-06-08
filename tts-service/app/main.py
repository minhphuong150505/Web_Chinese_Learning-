import json
import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
import edge_tts

from app.tone import analyze, engine_ready

app = FastAPI()

DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"

@app.get("/health")
async def health():
    return {"status": "UP", "toneEngine": engine_ready()}

@app.get("/tts")
async def tts(text: str = Query(..., min_length=1, max_length=2000),
              voice: str = Query(DEFAULT_VOICE)):
    try:
        communicate = edge_tts.Communicate(text, voice)
        buf = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
        return Response(content=bytes(buf), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")


@app.post("/tone-analyze")
async def tone_analyze(
    audio: UploadFile = File(...),
    syllables: str = Form(...),
):
    """Score the Mandarin tone of each syllable against its pitch contour.

    ``syllables`` is a JSON array of {pinyin, tone, start, dur} (seconds).
    Returns one result per syllable with the detected tone and a 0..100 score;
    a null score means the contour could not be judged (silence, unvoiced, or
    the engine being unavailable)."""
    try:
        spec = json.loads(syllables)
        if not isinstance(spec, list):
            raise ValueError("syllables must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid syllables payload: {e}")

    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        results = analyze(tmp_path, spec)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {
        "engineReady": engine_ready(),
        "syllables": [
            {
                "pinyin": r.pinyin,
                "expectedTone": r.expected_tone,
                "detectedTone": r.detected_tone,
                "toneScore": r.tone_score,
            }
            for r in results
        ],
    }
