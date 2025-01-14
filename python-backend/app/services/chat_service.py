from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage
import os

class ChatService:
    def __init__(self):
        self.chat = ChatOpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )

    async def generate_response(self, message: str) -> str:
        response = self.chat([HumanMessage(content=message)])
        return response.content 