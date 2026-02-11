"""
RAG pipeline service for retrieval-augmented generation
"""
from typing import List, Dict, Any, Optional
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema import Document as LangchainDocument
from services.embeddings import EmbeddingService
from config import settings

class RAGPipeline:
    """RAG pipeline for question answering with document context"""
    
    def __init__(self):
        """Initialize RAG pipeline"""
        self.embedding_service = EmbeddingService()
        # Initialize LLM using Perplexity (sonar) while keeping OpenAIEmbeddings
        self.llm = ChatOpenAI(
            openai_api_key=settings.PERPLEXITY_API_KEY,
            openai_api_base=settings.PERPLEXITY_BASE_URL,
            model_name=settings.PERPLEXITY_MODEL,
            temperature=settings.TEMPERATURE
        )
        
        # Conversation memories by session
        self.memories: Dict[str, ConversationBufferMemory] = {}
        
        # Custom prompt template
        # Instruct the generator (sonar) to prioritize retrieved document context
        self.qa_prompt = PromptTemplate(
            template=(
                "You are an AI assistant helping students and faculty with academic questions related to Outcome-Based Education (OBE).\n\n"
                "When answering, PRIORITIZE the information contained in the retrieved academic documents (the provided context) over any general web knowledge or web search results. "
                "If the context contradicts general web information, prefer the context. If the answer cannot be determined from the context, explicitly state that you don't know and do not hallucinate.\n\n"
                "Context:\n{context}\n\n"
                "Question: {question}\n\n"
                "Provide a clear, detailed answer. If the answer involves specific Course Outcomes (CO), Bloom's taxonomy levels, or assessment criteria, be explicit about them.\n\n"
                "Answer:"
            ),
            input_variables=["context", "question"]
        )
    
    def _get_or_create_memory(self, session_id: str) -> ConversationBufferMemory:
        """Get or create conversation memory for session"""
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
        return self.memories[session_id]
    
    def query(
        self,
        user_query: str,
        subject: Optional[str] = None,
        document_type: Optional[str] = None,
        session_id: Optional[str] = None,
        k: int = None,
        current_college_id: str = None
    ) -> Dict[str, Any]:
        """
        Process a RAG query
        
        Args:
            user_query: User's question
            subject: Optional subject filter
            document_type: Optional document type filter
            session_id: Optional session ID for conversational memory
            k: Number of context chunks to retrieve
        
        Returns:
            Dict with answer, sources, and metadata
        """
        import time
        start_time = time.time()
        
        # Build filter dict - enforce college isolation
        filter_dict = {}
        if subject:
            filter_dict["subject"] = subject
        if document_type:
            filter_dict["document_type"] = document_type
        if current_college_id:
            filter_dict["college_id"] = str(current_college_id)
        
        # Retrieve relevant chunks
        try:
            results = self.embedding_service.similarity_search_with_score(
                query=user_query,
                k=k or settings.TOP_K_RESULTS,
                filter_dict=filter_dict if filter_dict else None
            )
        except Exception as e:
            return {
                "answer": f"Error retrieving context: {str(e)}",
                "sources": [],
                "error": True
            }
        
        if not results:
            return {
                "answer": "I couldn't find any relevant information in the uploaded documents. Please upload relevant documents or try rephrasing your question.",
                "sources": [],
                "context_chunks": []
            }
        
        # Format context
        context_parts = []
        sources = []
        context_chunks = []
        
        for i, result in enumerate(results, 1):
            content = result["content"]
            metadata = result["metadata"]
            score = result.get("score", 0)
            
            context_parts.append(f"[Source {i}]\n{content}\n")
            
            # Extract source info
            source_info = {
                "document_name": metadata.get("title", metadata.get("source", "Unknown")),
                "page_no": metadata.get("page_no"),
                "chunk_id": metadata.get("chunk_id"),
                "relevance_score": score
            }
            sources.append(source_info)
            
            # Store context chunk
            context_chunks.append({
                "content": content,
                "metadata": metadata,
                "score": score
            })
        
        context = "\n\n".join(context_parts)
        
        # Generate answer with LLM
        try:
            # If session_id provided, use conversational chain
            if session_id:
                memory = self._get_or_create_memory(session_id)
                
                # Create conversational retrieval chain
                # For simplicity, we'll use direct LLM call with memory
                prompt = self.qa_prompt.format(context=context, question=user_query)
                
                response = self.llm.predict(prompt)
                
                # Update memory
                memory.save_context(
                    {"input": user_query},
                    {"answer": response}
                )
            else:
                # Direct query without memory
                prompt = self.qa_prompt.format(context=context, question=user_query)
                response = self.llm.predict(prompt)
            
            answer = response
        
        except Exception as e:
            answer = f"Error generating answer: {str(e)}"
        
        # Calculate response time
        response_time = int((time.time() - start_time) * 1000)  # milliseconds
        
        return {
            "answer": answer,
            "sources": sources,
            "context_chunks": context_chunks,
            "session_id": session_id,
            "response_time": response_time
        }
    
    def clear_memory(self, session_id: str):
        """Clear conversation memory for a session"""
        if session_id in self.memories:
            del self.memories[session_id]
    
    def get_chat_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get chat history for a session"""
        if session_id not in self.memories:
            return []
        
        memory = self.memories[session_id]
        messages = memory.chat_memory.messages
        
        history = []
        for msg in messages:
            history.append({
                "role": msg.type,
                "content": msg.content
            })
        
        return history
