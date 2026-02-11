"""
RAG query routes for AI-powered chat and document Q&A
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import get_db
from models.user import User
from models.query import Query
from utils.schemas import RAGQuery, RAGResponse, SourceInfo
from utils.auth import get_current_active_user
from services.rag_pipeline import RAGPipeline
from services.embeddings import EmbeddingService

router = APIRouter(prefix="/rag", tags=["RAG Query"])

# Initialize RAG pipeline (singleton)
rag_pipeline = RAGPipeline()

@router.post("/query", response_model=RAGResponse)
async def query_documents(
    query_data: RAGQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Query documents using RAG pipeline
    
    - **user_query**: The question to ask
    - **subject**: Optional subject filter
    - **document_type**: Optional document type filter
    - **session_id**: Optional session ID for conversation memory
    
    Returns answer with source citations
    """
    # Generate session ID if not provided
    session_id = query_data.session_id or str(uuid.uuid4())
    
    # Process query through RAG pipeline
    try:
        result = rag_pipeline.query(
            user_query=query_data.user_query,
            subject=query_data.subject,
            document_type=query_data.document_type,
            session_id=session_id,
            current_college_id=current_user.college_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )
    
    # Save query to database
    try:
        new_query = Query(
            user_id=current_user.id,
            query=query_data.user_query,
            response=result["answer"],
            subject=query_data.subject,
            document_type=query_data.document_type,
            sources=result.get("sources", []),
            context_chunks=result.get("context_chunks", []),
            response_time=result.get("response_time"),
            session_id=session_id
        )
        
        db.add(new_query)
        db.commit()
        db.refresh(new_query)
    except Exception as e:
        print(f"Error saving query to database: {e}")
        # Continue even if saving fails
    
    # Format response
    sources = [SourceInfo(**source) for source in result.get("sources", [])]
    
    return RAGResponse(
        answer=result["answer"],
        sources=sources,
        session_id=session_id
    )

@router.get("/history")
async def get_query_history(
    skip: int = 0,
    limit: int = 50,
    session_id: Optional[str] = None,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user's query history
    
    - **session_id**: Filter by session ID
    - **subject**: Filter by subject
    """
    query = db.query(Query).filter(Query.user_id == current_user.id)
    
    # Apply filters
    if session_id:
        query = query.filter(Query.session_id == session_id)
    if subject:
        query = query.filter(Query.subject == subject)
    
    # Order by timestamp descending
    query = query.order_by(Query.timestamp.desc())
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    queries = query.offset(skip).limit(limit).all()
    
    return {
        "queries": [q.to_dict() for q in queries],
        "total": total
    }

@router.get("/history/{query_id}")
async def get_query_by_id(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get specific query by ID
    """
    query = db.query(Query).filter(
        Query.id == query_id,
        Query.user_id == current_user.id
    ).first()
    
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return query.to_dict()

@router.delete("/history/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_query(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a query from history
    """
    query = db.query(Query).filter(
        Query.id == query_id,
        Query.user_id == current_user.id
    ).first()
    
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    db.delete(query)
    db.commit()
    
    return None

@router.get("/sessions")
async def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of user's chat sessions
    """
    sessions = db.query(Query.session_id).filter(
        Query.user_id == current_user.id,
        Query.session_id.isnot(None)
    ).distinct().all()
    
    session_list = []
    for session in sessions:
        session_id = session[0]
        
        # Get first and last query for this session
        first_query = db.query(Query).filter(
            Query.user_id == current_user.id,
            Query.session_id == session_id
        ).order_by(Query.timestamp.asc()).first()
        
        last_query = db.query(Query).filter(
            Query.user_id == current_user.id,
            Query.session_id == session_id
        ).order_by(Query.timestamp.desc()).first()
        
        query_count = db.query(Query).filter(
            Query.user_id == current_user.id,
            Query.session_id == session_id
        ).count()
        
        session_list.append({
            "session_id": session_id,
            "first_query": first_query.query if first_query else None,
            "first_query_time": first_query.timestamp if first_query else None,
            "last_query_time": last_query.timestamp if last_query else None,
            "query_count": query_count
        })
    
    return {
        "sessions": session_list,
        "total": len(session_list)
    }

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Clear conversation memory for a session
    """
    # Clear from memory
    rag_pipeline.clear_memory(session_id)
    
    # Optionally delete from database
    db.query(Query).filter(
        Query.user_id == current_user.id,
        Query.session_id == session_id
    ).delete()
    db.commit()
    
    return None

@router.get("/stats")
async def get_rag_stats(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get RAG system statistics
    """
    embedding_service = EmbeddingService()
    stats = embedding_service.get_stats()
    
    return {
        "vector_store": stats,
        "model": settings.PERPLEXITY_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL
    }
