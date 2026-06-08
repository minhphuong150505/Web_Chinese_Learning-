from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
import edge_tts

app = FastAPI()

DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"

@app.get("/health")
async def health():
    return {"status": "UP"}

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
