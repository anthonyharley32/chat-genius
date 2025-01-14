import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pinecone_service import PineconeService

async def migrate_messages():
    """
    One-time migration script to load all existing messages into Pinecone.
    Run this once after deployment when the database is ready.
    """
    try:
        print("Starting message migration to Pinecone...")
        pinecone_service = PineconeService()
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
    asyncio.run(migrate_messages()) 