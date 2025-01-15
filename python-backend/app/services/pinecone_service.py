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
        """
        Search for messages similar to the query using semantic search.
        
        Args:
            query: The search query
            top_k: Number of similar messages to return
            
        Returns:
            List of similar messages with their metadata and similarity scores
        """
        try:
            logger.info(f"Searching for messages similar to: {query[:50]}...")
            
            # Generate embedding for the query
            logger.info("Generating query embedding...")
            query_embedding = await self.embeddings.aembed_query(query)
            logger.info("Query embedding generated successfully")
            
            # Search in Pinecone
            logger.info(f"Searching Pinecone for top {top_k} similar messages...")
            results = await self.vector_store.asimilarity_search_with_score(
                query=query,
                k=top_k
            )
            
            # Format results
            formatted_results = []
            for doc, score in results:
                formatted_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "similarity_score": score
                })
            
            logger.info(f"Found {len(formatted_results)} similar messages")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar messages: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise
        
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
            # Get all messages
            messages_response = self.supabase.table('messages').select('*').execute()
            
            # Fetch all channels and cache them
            channels_response = self.supabase.table('channels').select('id, name').execute()
            channel_map = {str(channel['id']): channel['name'] for channel in channels_response.data}
            
            # Fetch all users and cache them
            users_response = self.supabase.table('users').select('id, username').execute()
            user_map = {str(user['id']): user['username'] for user in users_response.data}
            
            all_messages = []
            for msg in messages_response.data:
                metadata = {
                    "message_id": msg["id"],
                    "user_id": msg["user_id"],
                    "user_name": user_map.get(str(msg["user_id"]), "Unknown User"),
                    "timestamp": msg["created_at"],
                    "message_type": "dm" if msg["is_direct_message"] else "channel"
                }
                
                # Add channel or receiver info with both ID and name
                if msg["is_direct_message"]:
                    receiver_id = str(msg["receiver_id"])
                    metadata.update({
                        "receiver_id": receiver_id,
                        "receiver_name": user_map.get(receiver_id, "Unknown User")
                    })
                else:
                    channel_id = str(msg["channel_id"])
                    metadata.update({
                        "channel_id": channel_id,
                        "channel_name": channel_map.get(channel_id, "Unknown Channel")
                    })

                all_messages.append({
                    "content": msg["content"],
                    "metadata": metadata
                })

            # Process messages in batches
            total_batches = (len(all_messages) + batch_size - 1) // batch_size
            logger.info(f"Processing {len(all_messages)} messages in {total_batches} batches")
            
            for i in range(0, len(all_messages), batch_size):
                current_batch = i // batch_size + 1
                logger.info(f"Processing batch {current_batch}/{total_batches}")
                
                batch = all_messages[i:i + batch_size]
                batch_start_time = datetime.now()
                
                for msg_index, msg in enumerate(batch, 1):
                    try:
                        logger.info(f"Processing message {i + msg_index}/{len(all_messages)}")
                        await self.upsert_message(msg["content"], msg["metadata"])
                        stats["successful"] += 1
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        logger.error(f"Full traceback: {traceback.format_exc()}")
                        stats["failed"] += 1
                    
                    stats["total_processed"] += 1
                
                batch_duration = datetime.now() - batch_start_time
                logger.info(f"Batch {current_batch} completed in {batch_duration.total_seconds():.2f} seconds")
                
                # Small delay to prevent overwhelming the API
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error(f"Batch processing error: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
        stats["end_time"] = datetime.now()
        duration = stats["end_time"] - stats["start_time"]
        logger.info(f"Migration completed in {duration.total_seconds():.2f} seconds")
        logger.info(f"Total processed: {stats['total_processed']}")
        logger.info(f"Successful: {stats['successful']}")
        logger.info(f"Failed: {stats['failed']}")
        return stats
        