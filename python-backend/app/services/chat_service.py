from langchain_openai import ChatOpenAI # type: ignore
from langchain.schema import HumanMessage # type: ignore
import os
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class ChatService:
    def __init__(self):
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            self.chat = ChatOpenAI(
                model="gpt-4-turbo-preview",
                openai_api_key=api_key,
                temperature=0.7
            )
        except Exception as e:
            logger.error("Error initializing ChatService")
            raise

    async def generate_response(self, message: str) -> str:
        try:
            logger.debug("Generating response for message")
            response = await self.chat.agenerate([[HumanMessage(content=message)]])
            return response.generations[0][0].text
        except Exception as e:
            logger.error(f"Error generating response: {type(e).__name__}")
            raise 