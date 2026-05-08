from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from pydub import AudioSegment  # <-- NEW: The audio shrinker

from engine import process_voice_note

app = FastAPI(title="Smart Voice Summarization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

@app.post("/summarize/")
async def summarize_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio format")

    # We will use two files: the original raw file, and the new tiny file
    raw_file_path = f"raw_{file.filename}"
    tiny_file_path = f"tiny_compressed.mp3"

    with open(raw_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # ==========================================
        # LEVEL 1 EFFICIENCY: SHRINK THE AUDIO
        # ==========================================
        print("1. Compressing audio file...")
        audio = AudioSegment.from_file(raw_file_path)
        
        # Crush it down to 1 Channel (Mono), 16kHz, low bitrate
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(tiny_file_path, format="mp3", bitrate="32k")
        
        print("2. Sending tiny file to Groq API...")
        
        # Send the TINY file to the engine, not the raw one!
        results = await process_voice_note(tiny_file_path)
        
        return JSONResponse(content={
            "status": "success",
            "data": results
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up both files from your hard drive so it doesn't get cluttered
        if os.path.exists(raw_file_path):
            os.remove(raw_file_path)
        if os.path.exists(tiny_file_path):
            os.remove(tiny_file_path)

@app.get("/")
def read_root():
    return {"message": "KhudiChat Voice Summarization API is running concurrently!"}