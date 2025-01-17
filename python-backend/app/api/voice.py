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
    files: List[UploadFile] = File(...),
    user_id: uuid.UUID = Form(...),
    service: ElevenLabsService = Depends(get_elevenlabs_service)
) -> Dict[str, Any]:
    """
    Upload samples for custom voice training
    """
    try:
        logger.info(f"Starting voice training for user {user_id}")
        
        # Read all files into memory
        audio_files = []
        for file in files:
            if not file.content_type.startswith("audio/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.content_type}. Must be audio."
                )
            logger.info(f"Reading file: {file.filename}")
            content = await file.read()
            audio_files.append(content)
            
        # Create labels
        labels = {"description": description} if description else None
        logger.info("Sending to ElevenLabs for voice creation")
        
        # Add voice to ElevenLabs
        voice_data = await service.add_voice(name, audio_files, labels)
        logger.info(f"Voice created with ID: {voice_data.get('voice_id', 'unknown')}")
        
        # Save training samples to storage
        for i, file in enumerate(files):
            # Create a unique file path using str(user_id)
            file_path = f"{str(user_id)}/{voice_data['voice_id']}/sample_{i}.mp3"
            logger.info(f"Uploading file to path: {file_path}")
            await file.seek(0)
            content = await file.read()
            
            # Upload to Supabase storage
            logger.info("Starting Supabase storage upload")
            result = supabase.storage.from_("voice-samples").upload(
                file_path,
                content,
                {"content-type": "audio/mpeg", "x-upsert": "true"}
            )
            logger.info("Storage upload complete")
            
            # Save sample record with UUID
            logger.info("Saving training sample record")
            supabase.table("voice_training_samples").insert({
                "user_id": str(user_id),  # Convert UUID to string
                "file_path": file_path,
                "status": "processed"
            }).execute()
            logger.info("Sample record saved")
            
        return voice_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error training voice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to train voice")

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