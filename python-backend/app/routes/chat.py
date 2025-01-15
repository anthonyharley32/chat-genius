from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
import logging
import traceback
from ..services.chat_service import ChatService
from ..services.pinecone_service import PineconeService
import os
from typing import Dict, Any

router = APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chat_service = ChatService()

class ChatRequest(BaseModel):
    message: str
    user_id: str

class UpsertMessageRequest(BaseModel):
    message: str
    metadata: Dict[str, Any]

@router.get("/test-pinecone")
async def test_pinecone():
    try:
        logger.info("=== Testing Pinecone Connection ===")
        pinecone_service = PineconeService()
        return {"status": "success", "message": "Pinecone connection successful"}
    except Exception as e:
        logger.error(f"Error testing Pinecone: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        logger.info("=== Chat Request Received ===")
        logger.info(f"Message: {request.message}")
        logger.info(f"User ID: {request.user_id}")
        
        response_data = await chat_service.generate_response(
            message=request.message,
            user_id=request.user_id
        )
        logger.info("Response generated successfully")
        return response_data
    except Exception as e:
        logger.error(f"Error in chat endpoint: {type(e).__name__}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-process")
async def batch_process_messages():
    """Endpoint to trigger batch processing of messages into Pinecone"""
    try:
        pinecone_service = PineconeService()
        stats = await pinecone_service.batch_process_messages()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.post("/chat/upsert-message")
async def upsert_message(request: UpsertMessageRequest):
    try:
        logger.info("=== Upserting Message to Pinecone ===")
        logger.info(f"Message content: {request.message[:50]}...")  # First 50 chars
        logger.info(f"Metadata: {request.metadata}")
        
        pinecone_service = PineconeService()
        await pinecone_service.upsert_message(request.message, request.metadata)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error upserting message: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))