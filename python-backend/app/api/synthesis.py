from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..services.elevenlabs import ElevenLabsService
import logging
from supabase import create_client, Client
import os
import io

# Initialize logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize router
router = APIRouter(prefix="/tts", tags=["text-to-speech"])

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

# Pydantic models
class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    optimize_streaming_latency: int = 0
    model_id: str = "eleven_monolingual_v1"

# Reuse ElevenLabs service dependency
async def get_elevenlabs_service():
    service = ElevenLabsService()
    try:
        yield service
    finally:
        await service.close()

@router.post("")
async def text_to_speech(
    request: TTSRequest,
    user_id: str,
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> StreamingResponse:
    """
    Convert text to speech and stream the audio response
    """
    try:
        # If no voice_id provided, get user's preferred voice
        if not request.voice_id:
            result = supabase.table("voice_preferences") \
                .select("voice_id") \
                .eq("user_id", user_id) \
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=400,
                    detail="No voice preference found. Please select a voice first."
                )
            
            request.voice_id = result.data[0]["voice_id"]
        
        # Generate speech
        audio_content = await service.generate_speech(
            text=request.text,
            voice_id=request.voice_id,
            model_id=request.model_id,
            optimize_streaming_latency=request.optimize_streaming_latency
        )
        
        # Create an in-memory bytes buffer
        audio_buffer = io.BytesIO(audio_content)
        
        # Return streaming response
        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate speech")

@router.get("/health")
async def check_health(
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Check ElevenLabs API health by attempting to list voices
    """
    try:
        await service.get_voices(force_refresh=True)
        return {
            "status": "healthy",
            "message": "Successfully connected to ElevenLabs API"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": str(e)
        } 