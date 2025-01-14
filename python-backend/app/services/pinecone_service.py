from langchain_openai import OpenAIEmbeddings # type: ignore
from langchain.text_splitter import RecursiveCharacterTextSplitter # type: ignore
from langchain_pinecone import PineconeVectorStore # type: ignore
from langchain.schema.document import Document # type: ignore
from langchain_community.document_loaders.pdf import PyPDFLoader # type: ignore
from langchain_community.document_loaders import DirectoryLoader # type: ignore
import os # type: ignore
from dotenv import load_dotenv # type: ignore
from typing import Dict, Any, List
import uuid
from supabase import create_client, Client # type: ignore
import asyncio
from datetime import datetime
import logging
from pinecone import Pinecone # type: ignore
import traceback

logger = logging.getLogger(__name__)






class PineconeService:
    def __init__(self):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        load_dotenv(os.path.join(project_root, '.env.local'))

        # Store these as instance variables so they can be used in other methods
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")
        self.pinecone_index = os.getenv("PINECONE_INDEX_NAME")
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not all([self.pinecone_api_key, self.pinecone_environment, self.pinecone_index]):
            raise ValueError("Missing required Pinecone environment variables")

        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # Initialize Pinecone with proper configuration
        self.pc = Pinecone(api_key=self.pinecone_api_key)
        self.index = self.pc.Index(self.pinecone_index)

        # Initialize embedding model
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

        # Initialize vector store
        self.vector_store = PineconeVectorStore.from_existing_index(
            index_name=self.pinecone_index,
            embedding=self.embeddings,
            namespace="messages"  # Added namespace for better organization
        )
        logger.info("Vector store initialized successfully")
        
    async def upsert_message(self, message: str, metadata: Dict[str, Any]):
        try:
            logger.info(f"Starting upsert for message: {message[:50]}...")
            
            # Generate embedding
            logger.info("Generating embedding...")
            vector = await self.embeddings.aembed_query(message)
            logger.info("Embedding generated successfully")
            
            # Create unique ID
            vector_id = f"msg_{metadata['message_id']}"
            logger.info(f"Vector ID created: {vector_id}")
            
            # Create document with metadata
            document = Document(
                page_content=message,
                metadata=metadata
            )
            
            # Upsert to Pinecone using the correct method
            logger.info("Upserting to Pinecone...")
            await self.vector_store.aadd_documents([document], ids=[vector_id])
            logger.info(f"Successfully upserted message {vector_id} to Pinecone")
            
            return True
            
        except Exception as e:
            logger.error(f"Error upserting message to Pinecone: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise

    async def query_similar(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # We'll implement this later for AI chat functionality
        pass
        
    async def batch_process_messages(self, batch_size: int = 100) -> Dict[str, Any]:
        """
        Batch process all messages from Supabase into Pinecone.
        
        Args:
            batch_size: Number of messages to process in each batch
            
        Returns:
            Dict containing processing statistics
        """
        stats = {
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "start_time": datetime.now(),
            "end_time": None
        }

        try:
            # Get all messages from both channels and DMs
            channel_messages = self.supabase.table('messages').select('*').execute()
            dm_messages = self.supabase.table('direct_messages').select('*').execute()

            all_messages = []
            
            # Process channel messages
            for msg in channel_messages.data:
                all_messages.append({
                    "content": msg["content"],
                    "metadata": {
                        "message_id": msg["id"],
                        "channel_id": msg["channel_id"],
                        "user_id": msg["user_id"],
                        "timestamp": msg["created_at"],
                        "message_type": "channel"
                    }
                })

            # Process DM messages
            for msg in dm_messages.data:
                all_messages.append({
                    "content": msg["content"],
                    "metadata": {
                        "message_id": msg["id"],
                        "conversation_id": msg["conversation_id"],
                        "sender_id": msg["sender_id"],
                        "receiver_id": msg["receiver_id"],
                        "timestamp": msg["created_at"],
                        "message_type": "dm"
                    }
                })

            # Process messages in batches
            for i in range(0, len(all_messages), batch_size):
                batch = all_messages[i:i + batch_size]
                
                for msg in batch:
                    try:
                        await self.upsert_message(msg["content"], msg["metadata"])
                        stats["successful"] += 1
                    except Exception as e:
                        print(f"Error processing message: {e}")
                        stats["failed"] += 1
                    
                    stats["total_processed"] += 1
                
                # Small delay to prevent overwhelming the API
                await asyncio.sleep(0.1)

        except Exception as e:
            print(f"Batch processing error: {e}")
            
        stats["end_time"] = datetime.now()
        return stats
        