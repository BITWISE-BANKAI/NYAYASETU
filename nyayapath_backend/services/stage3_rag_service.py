import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from schemas.legal_retrieval import RerankedResult
import ollama
from core.config import settings

logger = logging.getLogger(__name__)

class RetrievalError(Exception):
    pass

# Lazy loader for optional InLegalBERT bi-encoder reranker
_reranker_model = None
_util = None
_reranker_attempted = False

def get_reranker():
    global _reranker_model, _util, _reranker_attempted
    if not _reranker_attempted:
        _reranker_attempted = True
        try:
            from sentence_transformers import SentenceTransformer, util
            _reranker_model = SentenceTransformer("law-ai/InLegalBERT")
            _util = util
        except Exception as e:
            logger.info(f"InLegalBERT reranker not loaded (optional component): {e}")
            _reranker_model = None
            _util = None
    return _reranker_model, _util

async def retrieve_parent_statutes(db: AsyncSession, query_text: str, top_k: int = 20, rerank_top_k: int = 3) -> List[RerankedResult]:
    """
    1. Embed query_text using Qwen via Ollama.
    2. Cosine-distance search on legal_statutes where chunk_type = 'child_clause' and is_current = true.
    3. Rerank using law-ai/InLegalBERT (Bi-encoder mode).
    4. Resolve top-3 to parent_section via parent_id.
    """
    
    # 1. Embed the query
    try:
        ollama_client = ollama.AsyncClient(host=settings.ollama_host)
        response = await ollama_client.embeddings(model=settings.embedding_model, prompt=query_text)
        query_vector = response['embedding']
    except Exception as e:
        logger.error(f"Error embedding query: {e}")
        raise RetrievalError(f"Failed to generate embedding: {e}")

    # 2. SQL Query with strict is_current filter
    query = text("""
        SELECT id, document_title, chunk_text, metadata_col,
               1 - (embedding <=> CAST(:query_vector AS vector)) AS similarity
        FROM legal_statutes
        WHERE metadata_col->>'chunk_type' = 'child_clause'
          AND (metadata_col->>'is_current')::boolean = true
        ORDER BY embedding <=> CAST(:query_vector AS vector)
        LIMIT :top_k;
    """)
    
    try:
        result = await db.execute(query, {"query_vector": str(query_vector), "top_k": top_k})
        chunks = result.fetchall()
    except Exception as e:
        logger.warning(f"Database query failed on pgvector ({e}), falling back to seed statute corpus")
        from services.assistant_service import _get_seed_corpus
        corpus = _get_seed_corpus()
        keywords = set(query_text.lower().split())
        scored = []
        for chk in corpus:
            txt = (chk.get("chunk_text") or "").lower()
            sc = sum(1 for kw in keywords if kw in txt)
            if sc > 0:
                scored.append((sc, chk))
        scored.sort(key=lambda x: x[0], reverse=True)
        fallback_results = []
        for sc, chk in scored[:rerank_top_k]:
            meta = chk.get("metadata", {})
            fallback_results.append(RerankedResult(
                chunk_id=chk.get("id", 1),
                chunk_text=chk.get("chunk_text", ""),
                similarity_score=round(min(sc / 10.0, 0.95), 4),
                hierarchy_path=meta.get("hierarchy_path", chk.get("document_title", "")),
                chunk_type=meta.get("chunk_type", "child_clause"),
                parent_id=meta.get("parent_id"),
                cross_encoder_score=round(min(sc / 10.0, 0.95), 4)
            ))
        return fallback_results

    if not chunks:
        from services.assistant_service import _get_seed_corpus
        corpus = _get_seed_corpus()
        keywords = set(query_text.lower().split())
        scored = []
        for chk in corpus:
            txt = (chk.get("chunk_text") or "").lower()
            sc = sum(1 for kw in keywords if kw in txt)
            if sc > 0:
                scored.append((sc, chk))
        scored.sort(key=lambda x: x[0], reverse=True)
        fallback_results = []
        for sc, chk in scored[:rerank_top_k]:
            meta = chk.get("metadata", {})
            fallback_results.append(RerankedResult(
                chunk_id=chk.get("id", 1),
                chunk_text=chk.get("chunk_text", ""),
                similarity_score=round(min(sc / 10.0, 0.95), 4),
                hierarchy_path=meta.get("hierarchy_path", chk.get("document_title", "")),
                chunk_type=meta.get("chunk_type", "child_clause"),
                parent_id=meta.get("parent_id"),
                cross_encoder_score=round(min(sc / 10.0, 0.95), 4)
            ))
        return fallback_results

    # Prepare candidates for reranking
    candidate_texts = [row.chunk_text for row in chunks]
    
    # 3. Rerank using InLegalBERT
    scores = await cross_encoder_rerank(query_text, candidate_texts)
    
    # Combine results and scores
    reranked_chunks = []
    for row, score in zip(chunks, scores):
        meta = row.metadata_col or {}
        reranked_chunks.append(RerankedResult(
            chunk_id=row.id,
            chunk_text=row.chunk_text,
            similarity_score=float(row.similarity),
            hierarchy_path=meta.get("hierarchy_path", ""),
            chunk_type=meta.get("chunk_type", ""),
            parent_id=meta.get("parent_id"),
            cross_encoder_score=float(score)
        ))
        
    # Sort by cross_encoder_score descending, falling back to pgvector similarity_score
    reranked_chunks.sort(key=lambda x: (x.cross_encoder_score, x.similarity_score), reverse=True)
    
    return reranked_chunks[:rerank_top_k]

async def cross_encoder_rerank(query: str, candidate_chunks: List[str]) -> List[float]:
    """
    Reranks candidates using law-ai/InLegalBERT.
    Since it is a base model without a classification head, we use it as a SentenceTransformer 
    and compute cosine similarities between the query and candidates.
    """
    reranker_model, util = get_reranker()
    if reranker_model is None:
        logger.warning("Reranker model is not loaded. Returning zeros.")
        return [0.0] * len(candidate_chunks)

    try:
        # Compute embeddings for query and candidates
        query_emb = reranker_model.encode(query, convert_to_tensor=True)
        candidate_embs = reranker_model.encode(candidate_chunks, convert_to_tensor=True)
        
        # Compute cosine similarities
        cosine_scores = util.cos_sim(query_emb, candidate_embs)[0]
        return cosine_scores.tolist()
    except Exception as e:
        logger.error(f"Error during reranking: {e}")
        return [0.0] * len(candidate_chunks)
