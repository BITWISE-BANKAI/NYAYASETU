import json
import asyncio
import os
import uuid
import sys

# Add parent directory to path to allow importing from core/models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ollama
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models.legal_statute import LegalStatute
from core.database import Base
from core.config import settings

async def seed_database():
    print("Connecting to database...")
    engine = create_async_engine(settings.database_url, echo=False)
    
    # Create extension and tables
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    print("Loading seed data...")
    json_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    chunks = data.get("chunks", [])
    
    id_mapping = {}
    
    ollama_client = ollama.AsyncClient(host=settings.ollama_host)
    
    async with async_session() as session:
        print("Clearing existing statutes...")
        await session.execute(text("TRUNCATE TABLE legal_statutes;"))
        await session.commit()

    async with async_session() as session:
        for item in chunks:
            print(f"Processing chunk: {item['chunk_id']}...")
            
            # Generate embedding
            try:
                response = await ollama_client.embeddings(model=settings.embedding_model, prompt=item['chunk_text'])
                embedding = response['embedding']
            except Exception as e:
                print(f"Failed to generate embedding for {item['chunk_id']}: {e}")
                continue
                
            # Create UUID
            record_id = uuid.uuid4()
            id_mapping[item['chunk_id']] = record_id
            
            # Resolve parent_ref if exists
            metadata = item['metadata']
            metadata['chunk_type'] = item['chunk_type']
            
            if 'parent_ref' in item:
                parent_uuid = id_mapping.get(item['parent_ref'])
                if parent_uuid:
                    metadata['parent_id'] = str(parent_uuid)
                else:
                    print(f"Warning: parent_ref {item['parent_ref']} not found in mapping for {item['chunk_id']}")
                    
            statute = LegalStatute(
                id=record_id,
                document_title=item['document_title'],
                chunk_text=item['chunk_text'],
                embedding=embedding,
                metadata_col=metadata
            )
            
            session.add(statute)
            
        print("Committing to database...")
        await session.commit()
        print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_database())
