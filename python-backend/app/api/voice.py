from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from typing import List, Dict, Any, Optional
from ..services.elevenlabs import ElevenLabsService
from pydantic import BaseModel
import logging
from supabase import create_client, Client # type: ignore
import os
import uuid

# Initialize logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize router
router = APIRouter(prefix="/voices", tags=["voices"])

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

# Pydantic models for request/response validation
class VoicePreference(BaseModel):
    voice_id: str
    auto_play: bool = False

class VoiceSettings(BaseModel):
    stability: float
    similarity_boost: float
    style: float = 0.0
    use_speaker_boost: bool = True

# Dependency for ElevenLabs service
async def get_elevenlabs_service():
    service = ElevenLabsService()
    try:
        yield service
    finally:
        await service.close()

@router.get("/")
async def list_voices(
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> List[Dict[str, Any]]:
    """
    List all available ElevenLabs voices
    """
    try:
        voices = await service.get_voices()
        return voices
    except Exception as e:
        logger.error(f"Error listing voices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch voices")

@router.post("/select")
async def select_voice(
    preference: VoicePreference,
    user_id: str,
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Save user's voice preference
    """
    try:
        # Verify voice exists
        voices = await service.get_voices()
        if not any(v["voice_id"] == preference.voice_id for v in voices):
            raise HTTPException(status_code=404, detail="Voice not found")
            
        # Save preference to database
        result = supabase.table("voice_preferences").upsert({
            "user_id": user_id,
            "voice_id": preference.voice_id,
            "auto_play": preference.auto_play
        }).execute()
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving voice preference: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save voice preference")

@router.post("/train")
async def train_voice(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    preview_text: str = Form(...),
    file: UploadFile = File(...),
    user_id: uuid.UUID = Form(...),
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Upload a single audio file for custom voice training
    """
    try:
        logger.info(f"Starting voice training for user {user_id}")
        logger.info(f"File info: name={file.filename}, content_type={file.content_type}")
        
        # Verify file type
        if not file.content_type.startswith("audio/"):
            logger.error(f"Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Must be audio."
            )
            
        # Read and validate file
        logger.info(f"Reading file: {file.filename}, content_type: {file.content_type}")
        content = await file.read()
        file_size = len(content)
        logger.info(f"File size: {file_size} bytes")
        
        # ElevenLabs limits
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        MIN_FILE_SIZE = 1 * 1024 * 1024   # 1MB
        
        if file_size > MAX_FILE_SIZE:
            logger.error(f"File too large: {file_size} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {file_size / 1024 / 1024:.1f}MB"
            )
            
        if file_size < MIN_FILE_SIZE:
            logger.error(f"File too small: {file_size} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"File too small. Minimum size is 1MB, got {file_size / 1024 / 1024:.1f}MB"
            )
            
        # Create labels
        labels = {"description": description} if description else None
        logger.info(f"Sending to ElevenLabs with labels: {labels}")
        
        try:
            # Add voice to ElevenLabs
            logger.info("Calling ElevenLabs add_voice")
            voice_data = await service.add_voice(name, [content], labels)
            voice_id = voice_data.get('voice_id')
            logger.info(f"Voice created with ID: {voice_id}")

            # Generate preview sample
            logger.info(f"Generating preview sample with text: {preview_text}")
            preview_audio = await service.generate_preview_sample(voice_id, preview_text)
            
            # Save preview sample to storage
            preview_path = f"{str(user_id)}/{voice_id}/preview.mp3"
            logger.info(f"Uploading preview to path: {preview_path}")
            
            # Upload preview to Supabase storage
            preview_result = supabase.storage.from_("voice-samples").upload(
                preview_path,
                preview_audio,
                {"content-type": "audio/mpeg", "x-upsert": "true"}
            )
            
            # Get public URL for preview
            preview_url = supabase.storage.from_("voice-samples").get_public_url(preview_path)
            voice_data['preview_url'] = preview_url

            # Get default voice settings
            voice_settings = await service.get_voice_settings(voice_id)
            
            # Deactivate any existing active voices for this user
            supabase.table("voice_preferences").update({
                "is_active": False
            }).eq("user_id", str(user_id)).execute()
            
            # Save as user's active voice preference
            voice_preference = {
                "user_id": str(user_id),
                "voice_id": voice_id,
                "voice_name": name,
                "preview_text": preview_text,
                "preview_url": preview_url,
                "is_custom": True,
                "is_active": True,
                "settings": voice_settings
            }
            
            result = supabase.table("voice_preferences").insert(voice_preference).execute()
            voice_data['voice_preference'] = result.data[0]
            
            logger.info("Voice training completed successfully")
            return voice_data
            
        except Exception as e:
            logger.error(f"ElevenLabs API error: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"ElevenLabs API error: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error training voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{voice_id}")
async def get_voice_status(
    voice_id: str,
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Check custom voice training status and settings
    """
    try:
        settings = await service.get_voice_settings(voice_id)
        return settings
    except Exception as e:
        logger.error(f"Error getting voice status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get voice status")

@router.post("/settings/{voice_id}")
async def update_voice_settings(
    voice_id: str,
    settings: VoiceSettings,
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Update voice settings
    """
    try:
        result = await service.edit_voice_settings(
            voice_id=voice_id,
            stability=settings.stability,
            similarity_boost=settings.similarity_boost,
            style=settings.style,
            use_speaker_boost=settings.use_speaker_boost
        )
        return result
    except Exception as e:
        logger.error(f"Error updating voice settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update voice settings") 