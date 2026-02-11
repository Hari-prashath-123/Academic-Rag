"""
Document routes for upload, processing, and management
"""
import os
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from models import get_db
from models.user import User
from models.document import Document, DocumentType, IndexingStatus
from utils.schemas import DocumentResponse, DocumentList
from utils.auth import get_current_active_user, is_faculty_or_admin
from services.document_loader import DocumentLoader
from services.embeddings import EmbeddingService
from config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_EXTENSIONS

async def process_document_async(document_id: int, file_path: str, db: Session):
    """
    Background task to process and index document
    """
    try:
        # Update status to in_progress
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        
        document.indexing_status = IndexingStatus.IN_PROGRESS
        db.commit()
        
        # Extract text from document
        loader = DocumentLoader()
        pages = loader.load_document(file_path)
        
        # Initialize embedding service
        embedding_service = EmbeddingService()
        
        # Process and index document
        chunk_count = embedding_service.index_document(
            document_id=document_id,
            pages=pages,
            metadata={
                "document_id": document_id,
                "title": document.title,
                "subject": document.subject,
                "document_type": document.document_type.value
            }
        )
        
        # Update document status
        document.indexing_status = IndexingStatus.COMPLETED
        document.indexed_at = datetime.utcnow()
        document.chunk_count = chunk_count
        db.commit()
        
    except Exception as e:
        # Update document with error
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.indexing_status = IndexingStatus.FAILED
            document.error_message = str(e)
            db.commit()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    document_type: DocumentType = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload and process a document
    
    - **file**: Document file (PDF, DOCX, XLSX, PPTX)
    - **title**: Document title
    - **subject**: Subject/course name
    - **document_type**: Type of document (syllabus, question_paper, etc.)
    
    Document will be processed asynchronously and indexed for RAG
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (basic check, more detailed in actual upload)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_FOLDER, filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Create document record
    new_document = Document(
        title=title,
        subject=subject,
        document_type=document_type,
        file_path=file_path,
        file_size=file_size,
        uploaded_by=current_user.id,
        indexing_status=IndexingStatus.PENDING
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    # Process document in background
    background_tasks.add_task(process_document_async, new_document.id, file_path, db)
    
    return new_document.to_dict()

@router.get("/", response_model=DocumentList)
async def get_documents(
    skip: int = 0,
    limit: int = 50,
    subject: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
    indexing_status: Optional[IndexingStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of documents with optional filters
    
    - **subject**: Filter by subject
    - **document_type**: Filter by document type
    - **indexing_status**: Filter by indexing status
    """
    query = db.query(Document).filter(Document.is_deleted == False)
    
    # Apply filters
    if subject:
        query = query.filter(Document.subject == subject)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if indexing_status:
        query = query.filter(Document.indexing_status == indexing_status)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    documents = query.offset(skip).limit(limit).all()
    
    return {
        "documents": [doc.to_dict() for doc in documents],
        "total": total
    }

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get document by ID
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document.to_dict()

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Delete document (soft delete)
    
    Requires faculty or admin role
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Soft delete
    document.is_deleted = True
    db.commit()
    
    # TODO: Remove from vector store
    
    return None

@router.post("/{document_id}/reindex", response_model=DocumentResponse)
async def reindex_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Re-index a document
    
    Requires faculty or admin role
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Reset indexing status
    document.indexing_status = IndexingStatus.PENDING
    document.indexed_at = None
    document.chunk_count = 0
    document.error_message = None
    db.commit()
    
    # Process document in background
    background_tasks.add_task(process_document_async, document.id, document.file_path, db)
    
    return document.to_dict()

@router.get("/subjects/list", response_model=List[str])
async def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of unique subjects from documents
    """
    subjects = db.query(Document.subject).filter(
        Document.is_deleted == False
    ).distinct().all()
    
    return [subject[0] for subject in subjects if subject[0]]
