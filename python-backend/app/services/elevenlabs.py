from typing import List, Dict, Any, Optional
import os
import logging
import httpx
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not found in environment variables")
            
        self.base_url = "https://api.elevenlabs.io/v1"
        self.headers = {
            "Accept": "application/json",
            "xi-api-key": self.api_key
        }
        
        # Initialize HTTP client with timeout
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=30.0
        )
        
        # Cache for voices list
        self._voices_cache = None
        self._voices_cache_timestamp = None
        self._cache_duration = 300  # 5 minutes
        
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
        
    async def get_voices(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Get list of available voices, with caching
        """
        now = datetime.now()
        
        # Return cached voices if available and not expired
        if not force_refresh and self._voices_cache and self._voices_cache_timestamp:
            if (now - self._voices_cache_timestamp).seconds < self._cache_duration:
                return self._voices_cache
                
        try:
            response = await self.client.get("/voices")
            response.raise_for_status()
            voices = response.json()["voices"]
            
            # Update cache
            self._voices_cache = voices
            self._voices_cache_timestamp = now
            
            return voices
            
        except Exception as e:
            logger.error(f"Error fetching voices: {str(e)}")
            raise
            
    async def generate_speech(
        self,
        text: str,
        voice_id: str,
        model_id: str = "eleven_monolingual_v1",
        optimize_streaming_latency: int = 0
    ) -> bytes:
        """
        Generate speech from text using specified voice
        """
        try:
            response = await self.client.post(
                f"/text-to-speech/{voice_id}",
                json={
                    "text": text,
                    "model_id": model_id,
                    "optimize_streaming_latency": optimize_streaming_latency
                },
                headers={**self.headers, "Accept": "audio/mpeg"}
            )
            response.raise_for_status()
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            raise
            
    async def add_voice(self, name: str, files: List[bytes], labels: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Add a new voice for training
        """
        try:
            files_data = [
                ("files", (f"sample_{i}.mp3", file, "audio/mpeg"))
                for i, file in enumerate(files)
            ]
            
            # Create form data
            form = {
                "name": (None, name),
            }
            
            # Add labels if provided
            if labels:
                for key, value in labels.items():
                    form[f"labels[{key}]"] = (None, value)
                
            # Log request details
            logger.info(f"Sending voice creation request to ElevenLabs: name={name}, num_files={len(files)}")
            for i, (_, (filename, file_data, content_type)) in enumerate(files_data):
                logger.info(f"File {i}: size={len(file_data)} bytes, type={content_type}")
                
            response = await self.client.post(
                "/voices/add",
                files=files_data,
                data=form
            )
            
            # If there's an error, try to get more details
            if response.status_code != 200:
                error_detail = "Unknown error"
                try:
                    error_json = response.json()
                    error_detail = error_json.get('detail', error_json)
                except:
                    error_detail = response.text or "No error details available"
                    
                logger.error(f"ElevenLabs API error ({response.status_code}): {error_detail}")
                raise Exception(f"ElevenLabs API error: {error_detail}")
                
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Error adding voice: {str(e)}")
            raise
            
    async def delete_voice(self, voice_id: str) -> bool:
        """
        Delete a voice
        """
        try:
            response = await self.client.delete(f"/voices/{voice_id}")
            response.raise_for_status()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting voice: {str(e)}")
            raise
            
    async def get_voice_settings(self, voice_id: str) -> Dict[str, Any]:
        """
        Get settings for a specific voice
        """
        try:
            response = await self.client.get(f"/voices/{voice_id}/settings")
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting voice settings: {str(e)}")
            raise
            
    async def edit_voice_settings(
        self,
        voice_id: str,
        stability: float,
        similarity_boost: float,
        style: float = 0.0,
        use_speaker_boost: bool = True
    ) -> Dict[str, Any]:
        """
        Edit settings for a specific voice
        """
        try:
            response = await self.client.post(
                f"/voices/{voice_id}/settings/edit",
                json={
                    "stability": stability,
                    "similarity_boost": similarity_boost,
                    "style": style,
                    "use_speaker_boost": use_speaker_boost
                }
            )
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Error editing voice settings: {str(e)}")
            raise

    async def generate_preview_sample(self, voice_id: str, text: str) -> bytes:
        """
        Generate a preview sample for a voice using the provided text
        """
        try:
            logger.info(f"Generating preview sample for voice {voice_id}")
            preview_audio = await self.generate_speech(
                text=text,
                voice_id=voice_id,
                model_id="eleven_monolingual_v1",
                optimize_streaming_latency=0
            )
            return preview_audio
        except Exception as e:
            logger.error(f"Error generating preview sample: {str(e)}")
            raise 