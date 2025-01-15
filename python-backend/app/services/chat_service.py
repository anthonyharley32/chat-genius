from langchain_openai import ChatOpenAI # type: ignore
from langchain.schema import HumanMessage, SystemMessage # type: ignore
import os
import logging
from .pinecone_service import PineconeService
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class ChatService:
    def __init__(self):
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            self.chat = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=api_key,
                temperature=0.7
            )
            self.pinecone_service = PineconeService()
        except Exception as e:
            logger.error("Error initializing ChatService")
            raise

    def format_context(self, similar_messages: List[Dict[str, Any]], threshold: float = 0.22) -> str:
        """Format similar messages into a context string"""
        if not similar_messages:
            return ""
            
        # Filter messages by similarity threshold
        filtered_messages = [msg for msg in similar_messages if msg["similarity_score"] >= threshold]
        
        if not filtered_messages:
            return ""
            
        context_parts = ["Here are some relevant previous messages:"]
        for msg in filtered_messages:
            metadata = msg["metadata"]
            message_type = metadata["message_type"]
            timestamp = metadata["timestamp"]
            content = msg["content"]
            user_name = metadata.get("user_name", "Unknown User")
            similarity_percentage = msg["similarity_score"] * 100
            
            if message_type == "channel":
                channel_name = metadata.get("channel_name", "Unknown Channel")
                context_parts.append(
                    f"[Channel #{channel_name} from {user_name} at {timestamp}, relevancy: {similarity_percentage:.0f}%]: {content}"
                )
            else:
                receiver_name = metadata.get("receiver_name", "Unknown User")
                context_parts.append(
                    f"[DM with {receiver_name} from {user_name} at {timestamp}, relevancy: {similarity_percentage:.0f}%]: {content}"
                )
                
        return "\n".join(context_parts)

    async def generate_response(self, message: str, user_id: str) -> str:
        try:
            logger.debug("Searching for similar messages...")
            similar_messages = await self.pinecone_service.query_similar(message, top_k=5)
            
            # Format context from similar messages
            context = self.format_context(similar_messages)
            
            # Create system message with context
            system_message = (
                "You are a helpful AI assistant. Use the context from previous messages "
                "to provide more informed and relevant responses. If the context is relevant, "
                "refer to it naturally in your response. If it's not relevant, simply ignore it."
            )
            
            # Create messages array with context
            messages = [
                SystemMessage(content=system_message),
                SystemMessage(content=context) if context else None,
                HumanMessage(content=message)
            ]
            messages = [msg for msg in messages if msg is not None]
            
            logger.debug("Generating response with context")
            response = await self.chat.agenerate([messages])
            return response.generations[0][0].text
            
        except Exception as e:
            logger.error(f"Error generating response: {type(e).__name__}")
            raise 