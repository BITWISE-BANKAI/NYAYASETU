CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE legal_statutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_title TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    metadata_col JSONB NOT NULL
);

CREATE INDEX ON legal_statutes
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE TABLE grievance_cases (
    id UUID PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    raw_intake_text TEXT,
    extracted_facts JSONB,
    retrieved_statutes JSONB,
    structured_slots JSONB,
    rendered_complaint TEXT,
    evidence_strength_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
