"""
Question paper analysis service using LLM
"""
from typing import List, Dict, Any
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from sqlalchemy.orm import Session
from models.document import Document
from models.question_analysis import QuestionAnalysis
from services.document_loader import DocumentLoader
from config import settings
import json
import re


class QuestionPaperAnalyzer:
    """Service for analyzing question papers using LLM"""
    
    def __init__(self):
        """Initialize question paper analyzer"""
        # Initialize LLM using Perplexity sonar via ChatOpenAI wrapper
        self.llm = ChatOpenAI(
            openai_api_key=settings.PERPLEXITY_API_KEY,
            openai_api_base=settings.PERPLEXITY_BASE_URL,
            model_name=settings.PERPLEXITY_MODEL,
            temperature=0.2
        )

        # Simplified prompt instructing sonar to extract questions and map to Bloom L1-L6 and CO
        self.extraction_prompt = PromptTemplate(
            template=(
                "Analyze this text. Extract every question and map it to a Bloom's Taxonomy Level (L1-L6) "
                "and a Course Outcome (CO). Return the result as a JSON array where each item includes: "
                "question_number, question_text, marks, co_mapping (array), bloom_level (L1-L6), unit, difficulty. "
                "Return ONLY valid JSON (no extra commentary).\n\nText:\n{text}"
            ),
            input_variables=["text"]
        )
    
    def analyze_question_paper(
        self,
        db: Session,
        document_id: int
    ) -> Dict[str, Any]:
        """
        Analyze a question paper document
        
        Args:
            db: Database session
            document_id: ID of the question paper document
        
        Returns:
            Analysis with questions, distributions, and statistics
        """
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        if document.document_type.value != "question_paper":
            raise ValueError("Document is not a question paper")
        
        # Load document content
        loader = DocumentLoader()
        pages = loader.load_document(document.file_path)
        
        # Combine all page text
        full_text = "\n\n".join(page["text"] for page in pages)
        
        # Extract questions using LLM
        try:
            prompt = self.extraction_prompt.format(text=full_text)
            response = self.llm.predict(prompt)
            
            # Parse JSON response
            # Remove markdown code blocks if present
            response = response.strip()
            if response.startswith("```"):
                response = re.sub(r'```json?\n?', '', response)
                response = re.sub(r'```\n?$', '', response)
            
            questions = json.loads(response)
            
        except json.JSONDecodeError as e:
            # Fallback: try to extract manually
            print(f"JSON parse error: {e}. Response: {response[:200]}")
            questions = self._fallback_extraction(full_text)
        
        except Exception as e:
            raise Exception(f"Error analyzing question paper: {str(e)}")
        
        # Persist parsed questions into QuestionAnalysis table
        try:
            # Remove any pre-existing analyses for this document
            db.query(QuestionAnalysis).filter(QuestionAnalysis.document_id == document_id).delete()
            for q in questions:
                qa = QuestionAnalysis(
                    document_id=document_id,
                    question_number=q.get("question_number"),
                    question_text=q.get("question_text"),
                    marks=q.get("marks"),
                    co_mapping=q.get("co_mapping"),
                    bloom_level=q.get("bloom_level"),
                    unit=q.get("unit"),
                    difficulty=q.get("difficulty")
                )
                db.add(qa)
            db.commit()
        except Exception as e:
            # If DB persistence fails, log but continue
            print(f"Error saving question analysis: {e}")

        # Calculate distributions
        analysis = self._calculate_distributions(questions)
        
        # Add document info
        analysis["document_id"] = document_id
        analysis["document_title"] = document.title
        analysis["subject"] = document.subject
        analysis["questions"] = questions
        
        return analysis
    
    def _fallback_extraction(self, text: str) -> List[Dict[str, Any]]:
        """
        Fallback method to extract questions if LLM fails
        
        Basic pattern matching for question extraction
        """
        questions = []
        
        # Simple pattern to find questions
        # This is a basic implementation - in production, use more sophisticated parsing
        lines = text.split('\n')
        
        current_question = None
        
        for line in lines:
            line = line.strip()
            
            # Check if line starts with question number pattern
            if re.match(r'^[\d]+[a-z]?[\.\)]\s+', line):
                if current_question:
                    questions.append(current_question)
                
                # Try to extract marks
                marks_match = re.search(r'\[(\d+)\s*marks?\]|\((\d+)\s*marks?\)', line, re.IGNORECASE)
                marks = int(marks_match.group(1) or marks_match.group(2)) if marks_match else 5
                
                current_question = {
                    "question_number": re.match(r'^([\d]+[a-z]?)[\.\)]', line).group(1),
                    "question_text": line,
                    "marks": marks,
                    "co_mapping": [],
                    "bloom_level": "Unknown",
                    "unit": None,
                    "difficulty": "Medium"
                }
            
            elif current_question and line:
                current_question["question_text"] += " " + line
        
        if current_question:
            questions.append(current_question)
        
        return questions
    
    def _calculate_distributions(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate various distributions from questions
        
        Returns:
            Dict with unit, CO, Bloom's, and difficulty distributions
        """
        # Initialize counters
        unit_dist = {}
        co_dist = {}
        bloom_dist = {}
        difficulty_dist = {}
        total_marks = 0
        
        for question in questions:
            marks = question.get("marks", 0)
            total_marks += marks
            
            # Unit distribution
            unit = question.get("unit") or "Unknown"
            unit_dist[unit] = unit_dist.get(unit, 0) + marks
            
            # CO distribution
            co_mappings = question.get("co_mapping", [])
            for co in co_mappings:
                co_dist[co] = co_dist.get(co, 0) + marks
            
            # Bloom's level distribution
            bloom_level = question.get("bloom_level", "Unknown")
            bloom_dist[bloom_level] = bloom_dist.get(bloom_level, 0) + marks
            
            # Difficulty distribution
            difficulty = question.get("difficulty", "Medium")
            difficulty_dist[difficulty] = difficulty_dist.get(difficulty, 0) + marks
        
        # Calculate percentages
        def calculate_percentages(dist_dict):
            if total_marks == 0:
                return dist_dict
            return {
                key: {
                    "marks": value,
                    "percentage": round((value / total_marks) * 100, 2)
                }
                for key, value in dist_dict.items()
            }
        
        return {
            "unit_distribution": calculate_percentages(unit_dist),
            "co_coverage": calculate_percentages(co_dist),
            "bloom_distribution": calculate_percentages(bloom_dist),
            "difficulty_distribution": calculate_percentages(difficulty_dist),
            "total_marks": total_marks,
            "question_count": len(questions)
        }
    
    def map_questions_to_cos(
        self,
        questions: List[Dict[str, Any]],
        co_descriptions: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """
        Map questions to COs using LLM if CO mapping is not explicit
        
        Args:
            questions: List of questions
            co_descriptions: Dict of CO number to description
        
        Returns:
            Questions with updated CO mappings
        """
        mapping_prompt = PromptTemplate(
            template="""Given the following Course Outcomes (COs):

{co_descriptions}

Map this question to the most relevant CO(s):

Question: {question_text}

Return only the CO numbers as a JSON array, e.g., ["CO1", "CO2"]""",
            input_variables=["co_descriptions", "question_text"]
        )
        
        co_desc_text = "\n".join([f"{co}: {desc}" for co, desc in co_descriptions.items()])
        
        for question in questions:
            if not question.get("co_mapping"):
                try:
                    prompt = mapping_prompt.format(
                        co_descriptions=co_desc_text,
                        question_text=question["question_text"]
                    )
                    response = self.llm.predict(prompt)
                    
                    # Parse response
                    co_mapping = json.loads(response)
                    question["co_mapping"] = co_mapping
                
                except Exception as e:
                    print(f"Error mapping question to CO: {e}")
                    question["co_mapping"] = []
        
        return questions
