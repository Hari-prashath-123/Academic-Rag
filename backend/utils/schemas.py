"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from models.user import UserRole
from models.document import DocumentType, IndexingStatus
from models.mark import AssessmentType

# ========== Authentication Schemas ==========

class UserRegister(BaseModel):
    """User registration request"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: Optional[UserRole] = UserRole.STUDENT

class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    """User response"""
    id: int
    name: str
    email: str
    role: str
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ========== Document Schemas ==========

class DocumentUpload(BaseModel):
    """Document upload metadata"""
    title: str
    subject: str
    document_type: DocumentType

class DocumentResponse(BaseModel):
    """Document response"""
    id: int
    title: str
    subject: str
    document_type: str
    file_path: str
    file_url: Optional[str]
    file_size: Optional[int]
    uploaded_by: int
    upload_date: datetime
    indexing_status: str
    indexed_at: Optional[datetime]
    chunk_count: int
    
    class Config:
        from_attributes = True

class DocumentList(BaseModel):
    """List of documents"""
    documents: List[DocumentResponse]
    total: int

# ========== RAG Query Schemas ==========

class RAGQuery(BaseModel):
    """RAG query request"""
    user_query: str = Field(..., min_length=1, max_length=2000)
    subject: Optional[str] = None
    document_type: Optional[str] = None
    session_id: Optional[str] = None

class SourceInfo(BaseModel):
    """Source information"""
    document_name: str
    page_no: Optional[int] = None
    chunk_id: Optional[str] = None
    relevance_score: Optional[float] = None

class RAGResponse(BaseModel):
    """RAG query response"""
    answer: str
    sources: List[SourceInfo]
    session_id: Optional[str] = None

# ========== Mark Schemas ==========

class MarkCreate(BaseModel):
    """Mark creation request"""
    student_id: int
    subject: str
    assessment_type: AssessmentType
    assessment_name: Optional[str]
    marks_obtained: float
    max_marks: float
    co_mapping: Optional[dict]
    bloom_level: Optional[str]
    unit: Optional[str]
    question_number: Optional[str]
    semester: Optional[str]
    academic_year: Optional[str]

class MarkResponse(BaseModel):
    """Mark response"""
    id: int
    student_id: int
    subject: str
    assessment_type: str
    marks_obtained: float
    max_marks: float
    percentage: float
    co_mapping: Optional[dict]
    bloom_level: Optional[str]
    
    class Config:
        from_attributes = True

# ========== OBE Schemas ==========

class COAttainmentRequest(BaseModel):
    """CO attainment calculation request"""
    subject: str
    semester: Optional[str] = None
    academic_year: Optional[str] = None

class COAttainmentResponse(BaseModel):
    """CO attainment response"""
    subject: str
    co_attainments: dict  # CO number -> attainment percentage
    overall_attainment: float
    pass_percentage: float
    total_students: int

class BloomMappingResponse(BaseModel):
    """Bloom's taxonomy mapping response"""
    subject: str
    bloom_distribution: dict  # Bloom level -> percentage
    question_count: int

class OBEReportRequest(BaseModel):
    """OBE report generation request"""
    subject: str
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    report_type: str = "comprehensive"  # comprehensive, co_attainment, bloom_analysis

# ========== Question Paper Schemas ==========

class QuestionAnalysisRequest(BaseModel):
    """Question paper analysis request"""
    document_id: int

class QuestionInfo(BaseModel):
    """Question information"""
    question_number: str
    question_text: str
    marks: int
    co_mapping: List[str]
    bloom_level: str
    unit: Optional[str]
    difficulty: Optional[str]

class QuestionPaperAnalysis(BaseModel):
    """Question paper analysis response"""
    document_id: int
    questions: List[QuestionInfo]
    unit_distribution: dict
    co_coverage: dict
    bloom_distribution: dict
    difficulty_distribution: dict
    total_marks: int


# ========== College Schemas ==========

class CollegeCreate(BaseModel):
    """College creation request"""
    name: str
    code: str
    address: Optional[str] = None


class CollegeResponse(BaseModel):
    """College response"""
    id: str
    name: str
    code: str
    address: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class OBECalculateRequest(BaseModel):
    subject: str
    college_id: Optional[str] = None
    threshold: Optional[float] = 60.0


class OBECOAttainment(BaseModel):
    attainment_percent: float
    level: int
    total_students: int
    students_above_threshold: int


class OBECalculateResponse(BaseModel):
    co_attainments: Dict[str, OBECOAttainment]

    class Config:
        from_attributes = True
