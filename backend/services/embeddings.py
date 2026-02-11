"""
Embedding service for generating and managing vector embeddings
"""
import os
import pickle
from typing import List, Dict, Any
import numpy as np
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.docstore.document import Document as LangchainDocument
from config import settings

class EmbeddingService:
    """Service for generating embeddings and managing vector store"""
    
    def __init__(self):
        """Initialize embedding service"""
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model=settings.EMBEDDING_MODEL
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        self.vector_store = self._load_or_create_vector_store()
    
    def _load_or_create_vector_store(self) -> FAISS:
        """Load existing vector store or create new one"""
        index_path = settings.FAISS_INDEX_PATH
        
        if os.path.exists(index_path) and os.path.exists(f"{index_path}.pkl"):
            try:
                # Load existing vector store
                vector_store = FAISS.load_local(
                    index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                return vector_store
            except Exception as e:
                print(f"Error loading vector store: {e}. Creating new one.")
        
        # Create new vector store with dummy document
        dummy_doc = LangchainDocument(
            page_content="Initialization document",
            metadata={"init": True}
        )
        return FAISS.from_documents([dummy_doc], self.embeddings)
    
    def _save_vector_store(self):
        """Save vector store to disk"""
        try:
            self.vector_store.save_local(settings.FAISS_INDEX_PATH)
        except Exception as e:
            print(f"Error saving vector store: {e}")
    
    def index_document(
        self,
        document_id: int,
        pages: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> int:
        """
        Index a document by chunking text and generating embeddings
        
        Args:
            document_id: Database document ID
            pages: List of page dicts with text and metadata
            metadata: Additional document metadata
        
        Returns:
            Number of chunks indexed
        """
        all_chunks = []
        
        # Process each page
        for page in pages:
            text = page.get("text", "")
            page_metadata = page.get("metadata", {})
            
            if not text.strip():
                continue
            
            # Split text into chunks
            chunks = self.text_splitter.split_text(text)
            
            # Create Langchain documents with metadata
            for i, chunk in enumerate(chunks):
                chunk_metadata = {
                    **metadata,
                    **page_metadata,
                    "document_id": document_id,
                    "page_no": page.get("page_no", 1),
                    "chunk_id": f"{document_id}_p{page.get('page_no', 1)}_c{i}"
                }
                
                doc = LangchainDocument(
                    page_content=chunk,
                    metadata=chunk_metadata
                )
                all_chunks.append(doc)
        
        if not all_chunks:
            raise ValueError("No valid text chunks found in document")
        
        # Add to vector store
        self.vector_store.add_documents(all_chunks)
        
        # Save to disk
        self._save_vector_store()
        
        return len(all_chunks)
    
    def similarity_search(
        self,
        query: str,
        k: int = None,
        filter_dict: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search on vector store
        
        Args:
            query: Search query
            k: Number of results to return
            filter_dict: Metadata filters (subject, document_type, etc.)
        
        Returns:
            List of relevant chunks with metadata
        """
        if k is None:
            k = settings.TOP_K_RESULTS
        
        # Perform search with filters
        if filter_dict:
            docs = self.vector_store.similarity_search(
                query,
                k=k,
                filter=filter_dict
            )
        else:
            docs = self.vector_store.similarity_search(query, k=k)
        
        # Format results
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
        
        return results
    
    def similarity_search_with_score(
        self,
        query: str,
        k: int = None,
        filter_dict: Dict[str, Any] = None
    ) -> List[tuple]:
        """
        Perform similarity search with relevance scores
        
        Returns:
            List of tuples (document, score)
        """
        if k is None:
            k = settings.TOP_K_RESULTS
        
        # Perform search with scores
        docs_with_scores = self.vector_store.similarity_search_with_score(
            query,
            k=k,
            filter=filter_dict
        ) if filter_dict else self.vector_store.similarity_search_with_score(query, k=k)
        
        # Format results
        results = []
        for doc, score in docs_with_scores:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
        
        return results
    
    def delete_document(self, document_id: int):
        """
        Delete all chunks for a document from vector store
        
        Note: FAISS doesn't support deletion well, might need to rebuild index
        """
        # This is a placeholder - FAISS doesn't support efficient deletion
        # In production, consider using a vector DB with deletion support
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        return {
            "total_vectors": self.vector_store.index.ntotal,
            "dimension": settings.VECTOR_DIMENSION,
            "index_path": settings.FAISS_INDEX_PATH
        }
