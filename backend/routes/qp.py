"""
Question paper analysis routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import get_db
from models.user import User
from models.document import Document
from utils.schemas import QuestionAnalysisRequest, QuestionPaperAnalysis
from utils.auth import get_current_active_user, is_faculty_or_admin
from services.qp_analyzer import QuestionPaperAnalyzer

router = APIRouter(prefix="/qp", tags=["Question Paper Analysis"])

@router.post("/analyze")
async def analyze_question_paper(
    request: QuestionAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze a question paper document
    
    Extracts:
    - Questions with text and marks
    - CO mapping for each question
    - Bloom's taxonomy levels
    - Unit distribution
    - Difficulty levels
    
    Returns comprehensive analysis with distributions and statistics
    """
    # Verify document exists and is accessible
    document = db.query(Document).filter(
        Document.id == request.document_id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify document is indexed
    if document.indexing_status.value != "completed":
        raise HTTPException(
            status_code=400,
            detail="Document is not fully indexed yet. Please wait for indexing to complete."
        )
    
    # Initialize analyzer
    analyzer = QuestionPaperAnalyzer()
    
    try:
        # Analyze question paper
        analysis = analyzer.analyze_question_paper(db, request.document_id)
        
        return analysis
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing question paper: {str(e)}"
        )

@router.post("/map-cos/{document_id}")
async def map_questions_to_cos(
    document_id: int,
    co_descriptions: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Map questions from a question paper to Course Outcomes using AI
    
    Requires faculty or admin role
    
    - **document_id**: ID of the question paper document
    - **co_descriptions**: Dict of CO numbers to descriptions
      Example: {"CO1": "Understand basic concepts", "CO2": "Apply algorithms"}
    
    Returns questions with updated CO mappings
    """
    # Verify document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.document_type.value != "question_paper":
        raise HTTPException(status_code=400, detail="Document is not a question paper")
    
    # Initialize analyzer
    analyzer = QuestionPaperAnalyzer()
    
    try:
        # First analyze the question paper
        analysis = analyzer.analyze_question_paper(db, document_id)
        questions = analysis.get("questions", [])
        
        # Map questions to COs
        mapped_questions = analyzer.map_questions_to_cos(questions, co_descriptions)
        
        # Recalculate distributions
        updated_analysis = analyzer._calculate_distributions(mapped_questions)
        updated_analysis["document_id"] = document_id
        updated_analysis["questions"] = mapped_questions
        
        return updated_analysis
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error mapping questions to COs: {str(e)}"
        )

@router.get("/statistics/{document_id}")
async def get_question_paper_statistics(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get quick statistics for a question paper
    
    Returns summary without detailed question extraction
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.document_type.value != "question_paper":
        raise HTTPException(status_code=400, detail="Document is not a question paper")
    
    # For now, return basic document info
    # In production, this could cache analysis results
    return {
        "document_id": document_id,
        "title": document.title,
        "subject": document.subject,
        "upload_date": document.upload_date,
        "indexed": document.indexing_status.value == "completed",
        "chunk_count": document.chunk_count
    }

@router.get("/compare")
async def compare_question_papers(
    document_ids: str,  # Comma-separated document IDs
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Compare multiple question papers
    
    Requires faculty or admin role
    
    - **document_ids**: Comma-separated document IDs (e.g., "1,2,3")
    
    Returns comparative analysis of CO coverage, Bloom's distribution, etc.
    """
    try:
        doc_ids = [int(id.strip()) for id in document_ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document IDs format")
    
    if len(doc_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 documents can be compared")
    
    analyzer = QuestionPaperAnalyzer()
    comparisons = []
    
    for doc_id in doc_ids:
        try:
            analysis = analyzer.analyze_question_paper(db, doc_id)
            
            # Extract key metrics
            comparisons.append({
                "document_id": doc_id,
                "title": analysis.get("document_title"),
                "subject": analysis.get("subject"),
                "total_marks": analysis.get("total_marks"),
                "question_count": analysis.get("question_count"),
                "co_coverage": analysis.get("co_coverage", {}),
                "bloom_distribution": analysis.get("bloom_distribution", {}),
                "difficulty_distribution": analysis.get("difficulty_distribution", {})
            })
        
        except Exception as e:
            comparisons.append({
                "document_id": doc_id,
                "error": str(e)
            })
    
    return {
        "comparisons": comparisons,
        "document_count": len(comparisons)
    }
