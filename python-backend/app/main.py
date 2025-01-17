from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .api import voice, synthesis
from .routes import chat
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ChatGenius AI Voice API",
    description="API for voice synthesis and management using ElevenLabs",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice.router)
app.include_router(synthesis.router)
app.include_router(chat.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """
    Verify required environment variables on startup
    """
    required_vars = [
        "ELEVENLABS_API_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "OPENAI_API_KEY",
        "PINECONE_API_KEY",
        "PINECONE_INDEX_NAME",
        "PINECONE_ENVIRONMENT"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
        
    logger.info("All required environment variables found")

@app.get("/health")
async def health_check():
    """
    Basic health check endpoint
    """
    return {
        "status": "healthy",
        "message": "Voice API is running"
    } 