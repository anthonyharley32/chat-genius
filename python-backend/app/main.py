from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from .routes import chat
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables at startup
load_dotenv('/app/.env.local')

# Log environment variables (excluding sensitive values)
logger.debug("Environment variables loaded:")
logger.debug(f"PINECONE_ENVIRONMENT: {os.getenv('PINECONE_ENVIRONMENT')}")
logger.debug(f"PINECONE_INDEX_NAME: {os.getenv('PINECONE_INDEX_NAME')}")
logger.debug("OPENAI_API_KEY: [Present]" if os.getenv('OPENAI_API_KEY') else "OPENAI_API_KEY: [Missing]")
logger.debug("PINECONE_API_KEY: [Present]" if os.getenv('PINECONE_API_KEY') else "PINECONE_API_KEY: [Missing]")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://web:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add prefix to router
app.include_router(chat.router, prefix="/api") 