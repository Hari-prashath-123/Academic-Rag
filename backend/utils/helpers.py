"""
Helper utility functions
"""
import os
import hashlib
from datetime import datetime
from typing import Optional


def generate_file_hash(file_path: str) -> str:
    """
    Generate SHA256 hash of a file
    
    Args:
        file_path: Path to file
    
    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    
    with open(file_path, "rb") as f:
        # Read in chunks to handle large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    return sha256_hash.hexdigest()


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format
    
    Args:
        size_bytes: File size in bytes
    
    Returns:
        Formatted string (e.g., "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    
    return f"{size_bytes:.2f} PB"


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to remove potentially dangerous characters
    
    Args:
        filename: Original filename
    
    Returns:
        Sanitized filename
    """
    # Remove path traversal attempts
    filename = os.path.basename(filename)
    
    # Replace problematic characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    return filename


def get_file_extension(filename: str) -> Optional[str]:
    """
    Get file extension from filename
    
    Args:
        filename: Filename with extension
    
    Returns:
        Extension without dot (e.g., "pdf") or None
    """
    if '.' not in filename:
        return None
    
    return filename.rsplit('.', 1)[1].lower()


def generate_unique_filename(original_filename: str, prefix: str = "") -> str:
    """
    Generate unique filename with timestamp
    
    Args:
        original_filename: Original filename
        prefix: Optional prefix
    
    Returns:
        Unique filename
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized = sanitize_filename(original_filename)
    
    if prefix:
        return f"{prefix}_{timestamp}_{sanitized}"
    
    return f"{timestamp}_{sanitized}"


def parse_co_string(co_string: str) -> list:
    """
    Parse CO string into list of CO identifiers
    
    Examples:
        "CO1, CO2, CO3" -> ["CO1", "CO2", "CO3"]
        "CO1-CO3" -> ["CO1", "CO2", "CO3"]
    
    Args:
        co_string: String representing COs
    
    Returns:
        List of CO identifiers
    """
    if not co_string:
        return []
    
    cos = []
    
    # Split by comma
    parts = co_string.split(',')
    
    for part in parts:
        part = part.strip()
        
        # Check for range (e.g., CO1-CO3)
        if '-' in part:
            try:
                start, end = part.split('-')
                start_num = int(start.replace('CO', ''))
                end_num = int(end.replace('CO', ''))
                
                for i in range(start_num, end_num + 1):
                    cos.append(f"CO{i}")
            except:
                cos.append(part)
        else:
            cos.append(part)
    
    return cos


def calculate_percentage(obtained: float, maximum: float) -> float:
    """
    Calculate percentage with error handling
    
    Args:
        obtained: Marks obtained
        maximum: Maximum marks
    
    Returns:
        Percentage (0-100)
    """
    if maximum <= 0:
        return 0.0
    
    return round((obtained / maximum) * 100, 2)


def validate_email(email: str) -> bool:
    """
    Basic email validation
    
    Args:
        email: Email address
    
    Returns:
        True if valid format
    """
    import re
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated
    
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix
