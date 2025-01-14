from langchain.vectorstores import Pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
import pinecone
import os

class MemoryService:
    def __init__(self):
        # Initialize Pinecone
        pinecone.init(
            api_key=os.getenv("PINECONE_API_KEY"),
            environment=os.getenv("PINECONE_ENVIRONMENT")
        )
        
        self.embeddings = OpenAIEmbeddings()
        self.index_name = os.getenv("PINECONE_INDEX_NAME")
        self.vectorstore = Pinecone.from_existing_index(
            index_name=self.index_name,
            embedding=self.embeddings
        )

    async def store_message(self, user_id: str, message: str):
        # Store message in Pinecone with metadata
        self.vectorstore.add_texts(
            texts=[message],
            metadatas=[{"user_id": user_id}]
        )

    async def get_relevant_history(self, user_id: str, current_message: str, k: int = 5):
        # Retrieve k most relevant previous messages
        relevant_docs = self.vectorstore.similarity_search(
            query=current_message,
            filter={"user_id": user_id},
            k=k
        )
        return [doc.page_content for doc in relevant_docs] 