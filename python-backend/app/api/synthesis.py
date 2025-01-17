from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..services.elevenlabs import ElevenLabsService
import logging
from supabase import create_client, Client # type: ignore
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

@router.post("/{voice_id}")
async def text_to_speech(
    voice_id: str,
    request: TTSRequest,
    user_id: str,
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> StreamingResponse:
    """
    Convert text to speech and stream the audio response
    """
    try:
        logger.info(f"Starting TTS request for voice_id: {voice_id}")
        logger.info(f"Text length: {len(request.text)} characters")
        
        # Use the path parameter voice_id instead of from request
        if not voice_id:
            raise HTTPException(
                status_code=400,
                detail="Voice ID is required"
            )
        
        # Generate speech
        audio_content = await service.generate_speech(
            text=request.text,
            voice_id=voice_id,
            model_id=request.model_id,
            optimize_streaming_latency=request.optimize_streaming_latency
        )
        
        logger.info(f"Generated audio content size: {len(audio_content)} bytes")
        
        # Create an in-memory bytes buffer
        audio_buffer = io.BytesIO(audio_content)
        
        # Return streaming response
        response = StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Accept-Ranges": "bytes",
                "Content-Disposition": "inline"
            }
        )
        logger.info("Returning audio response")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {str(e)}")
        logger.error(f"Full error details: {e.__class__.__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate speech: {str(e)}")

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