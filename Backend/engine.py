import os
from groq import AsyncGroq
from dotenv import load_dotenv

# Load environment variables from your .env file
load_dotenv()

# THE ASYNC UPGRADE: Handle multiple users concurrently
client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

# THE PERMANENT FIX: Using the massive 70B model for strict rule adherence
SMART_MODEL = "llama-3.3-70b-versatile" 
FAST_MODEL = "llama-3.1-8b-instant" # We keep the fast one just for quick language detection

async def process_voice_note(audio_file_path):
    # ==========================================
    # 1. TRANSCRIPTION (Whisper)
    # ==========================================
    with open(audio_file_path, "rb") as file:
        transcription_response = await client.audio.transcriptions.create(
            file=(audio_file_path, file.read()),
            model="whisper-large-v3",
            prompt="Specify language if known or let it auto-detect.",
        )
    
    raw_transcript = transcription_response.text
    
    # ==========================================
    # 2. LANGUAGE DETECTION
    # ==========================================
    # We can keep the 8b model here because detecting a language is a very simple task
    lang_response = await client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {"role": "system", "content": "You are a language detector. Reply with EXACTLY ONE WORD: 'ENGLISH', 'URDU', or 'MIXED'."},
            {"role": "user", "content": raw_transcript}
        ],
        temperature=0 
    )
    detected_language = lang_response.choices[0].message.content.strip().upper()

    final_transcript = raw_transcript
    final_summary = ""

    # ==========================================
    # 3. ROUTING & PROCESSING (Using 70B Model)
    # ==========================================
    if "URDU" in detected_language or "MIXED" in detected_language:
        lang_label = "Urdu"
        
        # ---------------------------------------------------------
        # Clean the Urdu Transcript (The General AI Filter)
        # ---------------------------------------------------------
        ur_transcript_response = await client.chat.completions.create(
            model=SMART_MODEL, 
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are an expert bilingual transcript editor fixing a mixed Urdu-English text.\n"
                        "Execute these EXACT general transformations:\n"
                        "1. DEVANAGARI GLITCHES: The raw text contains AI glitches where Hindi (Devanagari) letters are inserted inside Urdu words (e.g., 'تمहاری' instead of 'تمہاری', 'تمहارا' instead of 'تمہارا'). You MUST convert all foreign scripts into pure Urdu Nastaliq.\n"
                        "2. TRANSLITERATED ENGLISH: The speaker uses common English corporate, academic, and tech loanwords. The raw text wrongly spells these in Urdu script (e.g., 'ایکسپرٹ' -> Expert, 'سیشن' -> Session, 'اٹینڈنس' -> Attendance, 'فزیکل' -> Physical). You MUST detect ALL such English loanwords across the entire text and write them in standard English letters.\n"
                        "3. Keep actual Urdu words in perfect Urdu Nastaliq.\n"
                        "Output ONLY the final cleaned text."
                    )
                },
                {"role": "user", "content": raw_transcript}
            ],
            temperature=0
        )
        final_transcript = ur_transcript_response.choices[0].message.content

        # ---------------------------------------------------------
        # Generate Urdu Summary (Script & Grammar Enforced)
        # ---------------------------------------------------------
        ur_summary_response = await client.chat.completions.create(
            model=SMART_MODEL, 
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "Summarize the following text into 1 to 3 bullet points.\n"
                        "STRICT RULES:\n"
                        "1. GRAMMAR: Use natural Urdu grammar (Subject-Object-Verb). When inserting English words, do NOT break the natural flow of the Urdu sentence.\n"
                        "2. SCRIPT: Write the Urdu parts in Nastaliq. You MUST write all English academic/business terms in standard English letters (e.g., use 'Session', 'Attendance', 'Physical', 'Count' instead of 'سیشن', 'اٹینڈنس', 'فزیکل'). Do not transliterate English words into Nastaliq.\n"
                        "3. NO HALLUCINATIONS: Base the summary EXACTLY on the text provided.\n"
                        "Use an asterisk (*) for bullets. Output ONLY the bullets."
                    )
                },
                {"role": "user", "content": final_transcript}
            ],
            temperature=0
        )
        final_summary = ur_summary_response.choices[0].message.content

    else:
        lang_label = "English"
        
        # ---------------------------------------------------------
        # Clean the English Transcript
        # ---------------------------------------------------------
        en_transcript_response = await client.chat.completions.create(
            model=SMART_MODEL, 
            messages=[
                {"role": "system", "content": "Correct any grammatical errors and remove filler words from this English transcript. Do not add any extra information. Output ONLY the cleaned text."},
                {"role": "user", "content": raw_transcript}
            ],
            temperature=0
        )
        final_transcript = en_transcript_response.choices[0].message.content

        # ---------------------------------------------------------
        # Generate English Summary
        # ---------------------------------------------------------
        en_summary_response = await client.chat.completions.create(
            model=SMART_MODEL, 
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "Summarize the text into 1 to 3 bullet points.\n"
                        "STRICT RULES:\n"
                        "1. DO NOT HALLUCINATE. Base the summary EXACTLY on the text provided.\n"
                        "2. If the text is short, extract the single literal main point.\n"
                        "Use an asterisk (*) for bullets. Output ONLY the bullets."
                    )
                },
                {"role": "user", "content": final_transcript}
            ],
            temperature=0
        )
        final_summary = en_summary_response.choices[0].message.content

    # ==========================================
    # 4. RETURN PACKAGE
    # ==========================================
    return {
        "detected_language": lang_label,
        "transcript": final_transcript,
        "summary": final_summary
    }