from fastapi import APIRouter, HTTPException
from ..models.chat import ChatRequest
from ..services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = await chat_service.generate_response(request.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 