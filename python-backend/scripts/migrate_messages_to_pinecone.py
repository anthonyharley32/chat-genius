#to run locally in docker compose container use 
# docker compose exec ai-service python scripts/migrate_messages_to_pinecone.py

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pinecone_service import PineconeService

async def migrate_messages(clear_existing: bool = True):
    """
    One-time migration script to load all existing messages into Pinecone.
    
    Args:
        clear_existing: If True, deletes all existing vectors before migration
    """
    try:
        print("Starting message migration to Pinecone...")
        pinecone_service = PineconeService()
        
        if clear_existing:
            print("Clearing existing vectors...")
            # Delete all vectors in the 'messages' namespace
            pinecone_service.index.delete(delete_all=True, namespace="messages")
            print("Existing vectors cleared.")
        
        stats = await pinecone_service.batch_process_messages()
        
        print("\nMigration Complete!")
        print(f"Total messages processed: {stats['total_processed']}")
        print(f"Successful: {stats['successful']}")
        print(f"Failed: {stats['failed']}")
        print(f"Start time: {stats['start_time']}")
        print(f"End time: {stats['end_time']}")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # You can set this to False if you don't want to clear existing vectors
    asyncio.run(migrate_messages(clear_existing=True)) 