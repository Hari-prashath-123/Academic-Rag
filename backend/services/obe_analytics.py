"""
OBE (Outcome-Based Education) analytics service
"""
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.mark import Mark, AssessmentType
from models.user import User, UserRole
from config import settings

class OBEAnalytics:
    """Service for OBE analytics and reporting"""
    
    @staticmethod
    def calculate_co_attainment(
        db: Session,
        subject: str,
        semester: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate CO (Course Outcome) attainment for a subject
        
        Returns:
            Dict with CO attainments, pass percentage, and statistics
        """
        # Build query
        query = db.query(Mark).filter(Mark.subject == subject)
        
        if semester:
            query = query.filter(Mark.semester == semester)
        if academic_year:
            query = query.filter(Mark.academic_year == academic_year)
        
        marks = query.all()
        
        if not marks:
            return {
                "subject": subject,
                "co_attainments": {},
                "overall_attainment": 0,
                "pass_percentage": 0,
                "total_students": 0,
                "error": "No marks data found"
            }
        
        # Group by student and CO
        student_co_marks: Dict[int, Dict[str, List[float]]] = {}
        
        for mark in marks:
            student_id = mark.student_id
            
            if student_id not in student_co_marks:
                student_co_marks[student_id] = {}
            
            # Extract CO mappings
            co_mapping = mark.co_mapping or {}
            
            for co, weightage in co_mapping.items():
                if co not in student_co_marks[student_id]:
                    student_co_marks[student_id][co] = []
                
                # Calculate weighted percentage
                percentage = (mark.marks_obtained / mark.max_marks) * 100 if mark.max_marks > 0 else 0
                weighted_percentage = percentage * (weightage / 100)
                
                student_co_marks[student_id][co].append(weighted_percentage)
        
        # Calculate CO attainment
        co_attainments = {}
        all_cos = set()
        
        for student_marks in student_co_marks.values():
            all_cos.update(student_marks.keys())
        
        for co in sorted(all_cos):
            co_scores = []
            
            for student_marks in student_co_marks.values():
                if co in student_marks:
                    # Average of all assessments for this CO
                    avg_score = sum(student_marks[co]) / len(student_marks[co])
                    co_scores.append(avg_score)
            
            if co_scores:
                # Calculate attainment as percentage of students meeting threshold
                attained_count = sum(1 for score in co_scores if score >= settings.CO_ATTAINMENT_THRESHOLD)
                attainment_percentage = (attained_count / len(co_scores)) * 100
                
                co_attainments[co] = {
                    "attainment_percentage": round(attainment_percentage, 2),
                    "average_score": round(sum(co_scores) / len(co_scores), 2),
                    "students_attained": attained_count,
                    "total_students": len(co_scores)
                }
        
        # Calculate overall attainment
        if co_attainments:
            overall_attainment = sum(
                co_data["attainment_percentage"] for co_data in co_attainments.values()
            ) / len(co_attainments)
        else:
            overall_attainment = 0
        
        # Calculate pass percentage
        student_total_marks = {}
        for mark in marks:
            student_id = mark.student_id
            if student_id not in student_total_marks:
                student_total_marks[student_id] = {"obtained": 0, "max": 0}
            
            student_total_marks[student_id]["obtained"] += mark.marks_obtained
            student_total_marks[student_id]["max"] += mark.max_marks
        
        passed_students = 0
        total_students = len(student_total_marks)
        
        for marks_data in student_total_marks.values():
            percentage = (marks_data["obtained"] / marks_data["max"]) * 100 if marks_data["max"] > 0 else 0
            if percentage >= settings.PASSING_THRESHOLD:
                passed_students += 1
        
        pass_percentage = (passed_students / total_students * 100) if total_students > 0 else 0
        
        return {
            "subject": subject,
            "semester": semester,
            "academic_year": academic_year,
            "co_attainments": co_attainments,
            "overall_attainment": round(overall_attainment, 2),
            "pass_percentage": round(pass_percentage, 2),
            "total_students": total_students,
            "passed_students": passed_students
        }
    
    @staticmethod
    def calculate_bloom_mapping(
        db: Session,
        subject: str,
        semester: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate Bloom's taxonomy level distribution for a subject
        
        Returns:
            Dict with Bloom's level distribution
        """
        # Build query
        query = db.query(Mark).filter(Mark.subject == subject)
        
        if semester:
            query = query.filter(Mark.semester == semester)
        if academic_year:
            query = query.filter(Mark.academic_year == academic_year)
        
        marks = query.all()
        
        if not marks:
            return {
                "subject": subject,
                "bloom_distribution": {},
                "question_count": 0,
                "error": "No marks data found"
            }
        
        # Count questions by Bloom's level
        bloom_counts = {}
        bloom_marks = {}
        
        for mark in marks:
            bloom_level = mark.bloom_level or "Unknown"
            
            if bloom_level not in bloom_counts:
                bloom_counts[bloom_level] = 0
                bloom_marks[bloom_level] = []
            
            bloom_counts[bloom_level] += 1
            bloom_marks[bloom_level].append(mark.max_marks)
        
        # Calculate distribution
        total_questions = sum(bloom_counts.values())
        bloom_distribution = {}
        
        for level, count in bloom_counts.items():
            percentage = (count / total_questions) * 100 if total_questions > 0 else 0
            total_marks = sum(bloom_marks[level])
            
            bloom_distribution[level] = {
                "count": count,
                "percentage": round(percentage, 2),
                "total_marks": total_marks,
                "average_marks": round(total_marks / count, 2) if count > 0 else 0
            }
        
        return {
            "subject": subject,
            "semester": semester,
            "academic_year": academic_year,
            "bloom_distribution": bloom_distribution,
            "question_count": total_questions
        }
    
    @staticmethod
    def generate_obe_report(
        db: Session,
        subject: str,
        semester: Optional[str] = None,
        academic_year: Optional[str] = None,
        report_type: str = "comprehensive"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive OBE report
        
        Args:
            subject: Subject name
            semester: Optional semester filter
            academic_year: Optional academic year filter
            report_type: Type of report (comprehensive, co_attainment, bloom_analysis)
        
        Returns:
            Complete OBE report with multiple metrics
        """
        report = {
            "subject": subject,
            "semester": semester,
            "academic_year": academic_year,
            "report_type": report_type,
            "generated_at": None
        }
        
        from datetime import datetime
        report["generated_at"] = datetime.utcnow().isoformat()
        
        if report_type in ["comprehensive", "co_attainment"]:
            co_attainment = OBEAnalytics.calculate_co_attainment(
                db, subject, semester, academic_year
            )
            report["co_attainment"] = co_attainment
        
        if report_type in ["comprehensive", "bloom_analysis"]:
            bloom_mapping = OBEAnalytics.calculate_bloom_mapping(
                db, subject, semester, academic_year
            )
            report["bloom_analysis"] = bloom_mapping
        
        if report_type == "comprehensive":
            # Additional statistics
            query = db.query(Mark).filter(Mark.subject == subject)
            
            if semester:
                query = query.filter(Mark.semester == semester)
            if academic_year:
                query = query.filter(Mark.academic_year == academic_year)
            
            # Assessment type distribution
            assessment_stats = {}
            for assessment_type in AssessmentType:
                count = query.filter(Mark.assessment_type == assessment_type).count()
                if count > 0:
                    assessment_stats[assessment_type.value] = count
            
            report["assessment_distribution"] = assessment_stats
            
            # Unit-wise distribution
            unit_stats = db.query(
                Mark.unit,
                func.count(Mark.id).label("count")
            ).filter(
                Mark.subject == subject,
                Mark.unit.isnot(None)
            ).group_by(Mark.unit).all()
            
            report["unit_distribution"] = {
                unit: count for unit, count in unit_stats
            }
        
        return report
    
    @staticmethod
    def get_student_performance(
        db: Session,
        student_id: int,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get individual student performance analysis
        
        Returns:
            Student's marks, CO attainment, and performance metrics
        """
        query = db.query(Mark).filter(Mark.student_id == student_id)
        
        if subject:
            query = query.filter(Mark.subject == subject)
        
        marks = query.all()
        
        if not marks:
            return {
                "student_id": student_id,
                "subject": subject,
                "error": "No marks found"
            }
        
        # Calculate overall statistics
        total_obtained = sum(m.marks_obtained for m in marks)
        total_max = sum(m.max_marks for m in marks)
        overall_percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
        
        # CO-wise performance
        co_performance = {}
        for mark in marks:
            if mark.co_mapping:
                for co, weightage in mark.co_mapping.items():
                    if co not in co_performance:
                        co_performance[co] = []
                    
                    percentage = (mark.marks_obtained / mark.max_marks) * 100 if mark.max_marks > 0 else 0
                    co_performance[co].append(percentage)
        
        # Average CO scores
        co_averages = {
            co: round(sum(scores) / len(scores), 2)
            for co, scores in co_performance.items()
        }
        
        # Assessment type breakdown
        assessment_breakdown = {}
        for mark in marks:
            assessment_type = mark.assessment_type.value
            if assessment_type not in assessment_breakdown:
                assessment_breakdown[assessment_type] = {
                    "obtained": 0,
                    "max": 0,
                    "count": 0
                }
            
            assessment_breakdown[assessment_type]["obtained"] += mark.marks_obtained
            assessment_breakdown[assessment_type]["max"] += mark.max_marks
            assessment_breakdown[assessment_type]["count"] += 1
        
        # Calculate percentages
        for assessment_data in assessment_breakdown.values():
            assessment_data["percentage"] = round(
                (assessment_data["obtained"] / assessment_data["max"] * 100)
                if assessment_data["max"] > 0 else 0,
                2
            )
        
        return {
            "student_id": student_id,
            "subject": subject,
            "overall_percentage": round(overall_percentage, 2),
            "total_obtained": total_obtained,
            "total_max": total_max,
            "co_performance": co_averages,
            "assessment_breakdown": assessment_breakdown,
            "total_assessments": len(marks)
        }
