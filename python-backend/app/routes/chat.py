from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
import logging
import traceback
from ..services.chat_service import ChatService
import os

router = APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chat_service = ChatService()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        logger.info("=== Chat Request Received ===")
        response = await chat_service.generate_response(request.message)
        return {"response": response}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {type(e).__name__}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")