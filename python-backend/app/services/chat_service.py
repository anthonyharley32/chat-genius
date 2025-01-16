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

    async def generate_response(self, message: str, user_id: str, avatar_instructions: str = None) -> Dict[str, Any]:
        try:
            logger.debug("Searching for similar messages...")
            similar_messages = await self.pinecone_service.query_similar(message, top_k=5)
            
            # Filter and format numbered references
            filtered_messages = []
            citations = []
            references = []
            
            for i, msg in enumerate(similar_messages, 1):
                if msg["similarity_score"] >= 0.22:  # Same threshold as before
                    citation_id = f"cite_{i}"
                    metadata = msg["metadata"]
                    message_type = metadata["message_type"]
                    user_name = metadata.get("user_name", "Unknown User")
                    
                    # Format reference for LLM
                    if message_type == "channel":
                        channel_name = metadata.get("channel_name", "Unknown Channel")
                        ref_text = f"Reference [{i}] (from #{channel_name}): {msg['content']}"
                    else:
                        receiver_name = metadata.get("receiver_name", "Unknown User")
                        ref_text = f"Reference [{i}] (from DM): {msg['content']}"
                    
                    filtered_messages.append(ref_text)
                    
                    # Prepare citation data
                    citations.append({
                        "id": citation_id,
                        "messageId": metadata.get("message_id", ""),
                        "similarityScore": msg["similarity_score"],
                        "previewText": msg["content"][:100],  # First 100 chars
                        "metadata": {
                            "timestamp": metadata.get("timestamp", ""),
                            "userId": metadata.get("user_id", ""),
                            "userName": user_name,
                            "channelId": metadata.get("channel_id") if message_type == "channel" else None,
                            "channelName": channel_name if message_type == "channel" else None,
                            "isDirectMessage": message_type == "direct_message",
                            "receiverId": metadata.get("receiver_id") if message_type == "direct_message" else None,
                            "receiverName": receiver_name if message_type == "direct_message" else None
                        }
                    })
                    references.append({
                        "citationId": citation_id,
                        "inlinePosition": i,
                        "referenceText": str(i)
                    })
            
            # Create base system message
            system_message = """You are a helpful AI assistant with access to previous messages as numbered references.
You should actively use these references to support your responses. When you mention ANY information from the references,
you MUST cite them using the {ref:N} format where N is the reference number.

Guidelines for citations:
1. Place the citation immediately after the information it supports
2. Be specific about what information you're citing
3. Use multiple citations if you're combining information from different references
4. If a reference contains relevant information, make sure to incorporate and cite it

Example good citations:
- "The project uses TypeScript for type safety {ref:1} and implements React hooks for state management {ref:2}"
- "Based on the previous implementation {ref:1}, which had performance issues with large datasets {ref:2}, we should..."

Do not explicitly say "Reference [N]" or "available references" in your final responses. Take ownership of the information you are citing. Instead, use phrases like "from what I could find..." or "based on the material I have..." when citing. If you cannot find specific information, respond deterministically (e.g., "From what I can find, that information is not specified.")."""

            # Add references
            system_message += "\n\nAvailable references:\n" + "\n".join(filtered_messages)
            
               # Add avatar instructions if provided
            if avatar_instructions:
                system_message += f"\n\nPersonality Instructions:\n{avatar_instructions}"

            # Create messages array
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=message)
            ]
            
            logger.debug("Generating response with citations")
            response = await self.chat.agenerate([messages])
            
            return {
                "response": response.generations[0][0].text,
                "citations": citations,
                "references": references
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {type(e).__name__}")
            raise