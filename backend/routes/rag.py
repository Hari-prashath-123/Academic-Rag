"""RAG and AI chat routes for document Q&A and conversational assistant."""
from datetime import date
import html
import re
import uuid
from typing import Any, Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from models import get_db
from models.chat import ChatHistory, MessageRole
from models.query import Query
from models.token_limit import UserDailyTokenUsage, UserTokenLimit
from models.user import User
from services.embeddings import EmbeddingService
from services.rag_pipeline import RAGPipeline
from utils.auth import get_current_active_user
from utils.schemas import RAGQuery, RAGResponse, SourceInfo

router = APIRouter(prefix="/rag", tags=["RAG Query"])

# Initialize RAG pipeline (singleton)
rag_pipeline = RAGPipeline()


class ChatCompletionRequest(BaseModel):
    """Chat completion request for OpenRouter-backed assistant."""

    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    model: Optional[str] = Field(default=None, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=200)
    document_type: Optional[str] = Field(default=None, max_length=100)


def _estimate_text_tokens(text: str) -> int:
    if not text:
        return 0
    # Rough approximation without external tokenizer dependency.
    return max(1, len(text) // 4)


def _estimate_messages_tokens(messages: list[dict[str, Any]]) -> int:
    base = 0
    for message in messages:
        base += _estimate_text_tokens(str(message.get("content", ""))) + 4
    return base


def _get_or_create_daily_usage(db: Session, user_id, usage_date: date) -> UserDailyTokenUsage:
    usage = (
        db.query(UserDailyTokenUsage)
        .filter(
            UserDailyTokenUsage.user_id == user_id,
            UserDailyTokenUsage.usage_date == usage_date,
        )
        .first()
    )
    if usage:
        return usage

    usage = UserDailyTokenUsage(user_id=user_id, usage_date=usage_date, tokens_used=0, request_count=0)
    db.add(usage)
    db.flush()
    return usage


def _resolve_daily_limit(db: Session, user_id) -> int:
    limit_row = db.query(UserTokenLimit).filter(UserTokenLimit.user_id == user_id).first()
    if limit_row:
        return max(1, int(limit_row.daily_token_limit))
    return max(1, int(settings.DEFAULT_DAILY_TOKEN_LIMIT))


def _normalize_duckduckgo_link(raw_url: str) -> str:
    """Extract target URL from DuckDuckGo redirect links."""
    parsed = urlparse(raw_url)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        query = parse_qs(parsed.query)
        uddg_values = query.get("uddg")
        if uddg_values:
            return unquote(uddg_values[0])
    return raw_url


async def _search_web_fallback(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Search the public web when vector context is unavailable."""
    if not query.strip():
        return []

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            "https://duckduckgo.com/html/",
            params={"q": query},
            headers={
                "User-Agent": "Mozilla/5.0",
            },
        )

    if response.status_code >= 400:
        return []

    pattern = re.compile(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.IGNORECASE)
    matches = pattern.findall(response.text)

    results: list[dict[str, Any]] = []
    for href, raw_title in matches:
        title = re.sub(r"<[^>]+>", "", raw_title)
        title = html.unescape(title).strip()
        if not title:
            continue

        resolved_url = _normalize_duckduckgo_link(html.unescape(href).strip())
        if not resolved_url:
            continue

        results.append({"title": title, "url": resolved_url})
        if len(results) >= max_results:
            break

    return results


async def _build_chat_rag_context(
    payload: ChatCompletionRequest,
    current_user: User,
    top_k: int = 6,
) -> tuple[str, list[dict[str, Any]], str]:
    """Retrieve relevant chunks from vector store and format context plus sources."""
    embedding_service = EmbeddingService()

    def _norm(value: Any) -> str:
        return str(value or "").strip().lower()

    def _subject_match(metadata: dict[str, Any], selected_subject: str) -> bool:
        selected = _norm(selected_subject)
        if not selected:
            return True

        haystack = " ".join(
            [
                _norm(metadata.get("subject")),
                _norm(metadata.get("course_name")),
                _norm(metadata.get("course_code")),
                _norm(metadata.get("title")),
                _norm(metadata.get("source")),
            ]
        )
        if not haystack:
            return False

        if selected in haystack or haystack in selected:
            return True

        selected_tokens = [token for token in re.split(r"\W+", selected) if len(token) > 2]
        return bool(selected_tokens) and all(token in haystack for token in selected_tokens)

    def _search(k: int, filter_dict: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        return embedding_service.similarity_search_with_score(
            query=payload.message,
            k=k,
            filter_dict=filter_dict,
        )

    base_filter: dict[str, Any] = {}
    if payload.document_type:
        base_filter["document_type"] = payload.document_type

    selected_subject = _norm(payload.subject)
    staged_results: list[dict[str, Any]] = []

    # Stage 1: user-scoped search first.
    user_filter = {**base_filter, "uploader_id": str(current_user.id)}
    staged_results.extend(_search(max(top_k * 3, 8), filter_dict=user_filter))

    # Stage 2: broaden to shared corpus if subject filter yields poor personal matches.
    if selected_subject:
        scoped = [row for row in staged_results if _subject_match(row.get("metadata") or {}, selected_subject)]
        if len(scoped) < max(2, top_k // 2):
            staged_results.extend(_search(max(top_k * 4, 10), filter_dict=base_filter or None))
    else:
        if not staged_results:
            staged_results.extend(_search(max(top_k * 2, 6), filter_dict=base_filter or None))

    # Stage 3: final broad similarity pass, then subject post-filtering.
    if not staged_results:
        staged_results.extend(_search(max(top_k * 5, 12), filter_dict=None))

    if selected_subject:
        staged_results = [row for row in staged_results if _subject_match(row.get("metadata") or {}, selected_subject)]

    # Deduplicate chunks and cap to top_k.
    seen_keys: set[str] = set()
    results: list[dict[str, Any]] = []
    for row in staged_results:
        metadata = row.get("metadata") or {}
        key = str(metadata.get("chunk_id") or metadata.get("document_id") or "") + "::" + str(row.get("content") or "")[:80]
        if key in seen_keys:
            continue
        seen_keys.add(key)
        results.append(row)
        if len(results) >= top_k:
            break

    context_parts: list[str] = []
    sources: list[dict[str, Any]] = []

    for index, result in enumerate(results, start=1):
        metadata = result.get("metadata") or {}
        content = (result.get("content") or "").strip()
        if not content:
            continue
        if metadata.get("init"):
            continue

        source_name = (
            metadata.get("title")
            or metadata.get("course_name")
            or metadata.get("source")
            or "Unknown source"
        )
        source_type = metadata.get("source_type") or metadata.get("document_type") or "document"

        context_parts.append(f"[Source {index}] {source_name}\n{content}")
        sources.append(
            {
                "type": str(source_type),
                "name": str(source_name),
                "page": metadata.get("page_no"),
            }
        )

    if context_parts:
        return "\n\n".join(context_parts), sources, "materials"

    web_results = await _search_web_fallback(payload.message)
    if not web_results:
        return "", [], "none"

    web_context_parts = []
    web_sources: list[dict[str, Any]] = []
    for index, item in enumerate(web_results, start=1):
        title = item["title"]
        url = item["url"]
        web_context_parts.append(f"[Web {index}] {title}\nURL: {url}")
        web_sources.append(
            {
                "type": "internet",
                "name": title,
                "url": url,
            }
        )

    return "\n\n".join(web_context_parts), web_sources, "internet"


@router.post("/chat")
async def chat_with_openrouter(
    payload: ChatCompletionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate assistant response, persist chat history, and enforce daily token limits."""
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured on backend")

    session_id = payload.session_id or str(uuid.uuid4())
    today = date.today()

    daily_limit = _resolve_daily_limit(db, current_user.id)
    daily_usage = _get_or_create_daily_usage(db, current_user.id, today)
    remaining_before = daily_limit - int(daily_usage.tokens_used)
    if remaining_before <= 0:
        raise HTTPException(
            status_code=429,
            detail="Daily token limit reached. Contact admin to increase your limit.",
        )

    history_rows = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id, ChatHistory.session_id == session_id)
        .order_by(ChatHistory.timestamp.asc())
        .all()
    )

    rag_context = ""
    sources: list[dict[str, Any]] = []
    source_mode = "none"
    try:
        rag_context, sources, source_mode = await _build_chat_rag_context(payload, current_user)
    except Exception:
        # RAG retrieval is best-effort; fall back to plain chat when retrieval fails.
        rag_context = ""
        sources = []
        source_mode = "none"

    conversation_messages: list[dict[str, Any]] = []

    if rag_context and source_mode == "materials":
        conversation_messages.append(
            {
                "role": "system",
                "content": (
                    "You are a RAG academic assistant. Use the retrieved context below as your primary source of truth. "
                    "If the answer is not present in the context, say you do not have enough context and ask for more documents. "
                    "In your final answer, clearly mention that these points came from uploaded materials and reference the source names.\n\n"
                    f"Retrieved context:\n{rag_context}"
                ),
            }
        )
    elif rag_context and source_mode == "internet":
        conversation_messages.append(
            {
                "role": "system",
                "content": (
                    "No relevant uploaded material context was found. Use the web search results below as fallback evidence. "
                    "In your answer, explicitly state that the content is from internet sources and cite the source names.\n\n"
                    f"Web search results:\n{rag_context}"
                ),
            }
        )

    for row in history_rows:
        message_payload: dict[str, Any] = {
            "role": row.message_role.value if isinstance(row.message_role, MessageRole) else str(row.message_role),
            "content": row.message_content,
        }
        if message_payload["role"] == "assistant" and row.reasoning_details is not None:
            message_payload["reasoning_details"] = row.reasoning_details
        conversation_messages.append(message_payload)

    conversation_messages.append({"role": "user", "content": payload.message})

    estimated_prompt_tokens = _estimate_messages_tokens(conversation_messages)
    if estimated_prompt_tokens >= remaining_before:
        raise HTTPException(
            status_code=429,
            detail="Token budget too low for this message today. Try again tomorrow or ask admin to raise your limit.",
        )

    max_completion_tokens = max(64, min(1500, remaining_before - estimated_prompt_tokens))

    selected_model = payload.model.strip() if payload.model and payload.model.strip() else settings.OPENROUTER_MODEL

    request_body = {
        "model": selected_model,
        "messages": conversation_messages,
        "reasoning": {"enabled": True},
        "max_tokens": max_completion_tokens,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        upstream_response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )

    try:
        result = upstream_response.json()
    except Exception:
        result = {}

    if upstream_response.status_code >= 400:
        detail = result.get("error", {}).get("message") if isinstance(result.get("error"), dict) else None
        raise HTTPException(status_code=upstream_response.status_code, detail=detail or "OpenRouter request failed")

    assistant_message = (result.get("choices") or [{}])[0].get("message") or {}
    assistant_content = assistant_message.get("content", "")
    reasoning_details = assistant_message.get("reasoning_details")
    usage_payload = result.get("usage") or {}

    reported_total_tokens = usage_payload.get("total_tokens")
    if isinstance(reported_total_tokens, int) and reported_total_tokens > 0:
        tokens_used = reported_total_tokens
    else:
        tokens_used = _estimate_text_tokens(payload.message) + _estimate_text_tokens(assistant_content)

    user_row = ChatHistory(
        user_id=current_user.id,
        session_id=session_id,
        message_role=MessageRole.USER,
        message_content=payload.message,
    )
    assistant_row = ChatHistory(
        user_id=current_user.id,
        session_id=session_id,
        message_role=MessageRole.ASSISTANT,
        message_content=assistant_content,
        reasoning_details=reasoning_details,
    )
    db.add(user_row)
    db.add(assistant_row)

    daily_usage.tokens_used = int(daily_usage.tokens_used) + int(tokens_used)
    daily_usage.request_count = int(daily_usage.request_count) + 1

    db.commit()

    remaining_after = max(0, daily_limit - int(daily_usage.tokens_used))

    return {
        "session_id": session_id,
        "message": {
            "role": "assistant",
            "content": assistant_content,
            "reasoning_details": reasoning_details,
        },
        "sources": sources,
        "usage": {
            "tokens_used": int(tokens_used),
            "daily_used": int(daily_usage.tokens_used),
            "daily_limit": int(daily_limit),
            "remaining_tokens": int(remaining_after),
        },
    }


@router.get("/chat/history")
async def get_chat_history(
    session_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get persisted chat message history for current user."""
    query = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)
    if session_id:
        query = query.filter(ChatHistory.session_id == session_id)

    rows = query.order_by(ChatHistory.timestamp.asc()).offset(skip).limit(limit).all()

    messages = [
        {
            "id": str(row.id),
            "session_id": row.session_id,
            "role": row.message_role.value if isinstance(row.message_role, MessageRole) else str(row.message_role),
            "content": row.message_content,
            "reasoning_details": row.reasoning_details,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        }
        for row in rows
    ]
    return {"messages": messages, "total": len(messages)}


@router.get("/chat/sessions")
async def get_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of user's saved chat sessions with title and message counts."""
    session_rows = (
        db.query(ChatHistory.session_id, func.max(ChatHistory.timestamp).label("last_message_time"))
        .filter(ChatHistory.user_id == current_user.id)
        .group_by(ChatHistory.session_id)
        .order_by(func.max(ChatHistory.timestamp).desc())
        .all()
    )

    sessions = []
    for row in session_rows:
        session_id = row.session_id
        first_user_message = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.user_id == current_user.id,
                ChatHistory.session_id == session_id,
                ChatHistory.message_role == MessageRole.USER,
            )
            .order_by(ChatHistory.timestamp.asc())
            .first()
        )
        message_count = (
            db.query(ChatHistory)
            .filter(ChatHistory.user_id == current_user.id, ChatHistory.session_id == session_id)
            .count()
        )
        preview = first_user_message.message_content if first_user_message else "New chat"
        sessions.append(
            {
                "session_id": session_id,
                "title": preview[:60],
                "last_message_time": row.last_message_time.isoformat() if row.last_message_time else None,
                "message_count": message_count,
            }
        )

    return {"sessions": sessions, "total": len(sessions)}


@router.delete("/chat/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete one saved chat session for current user."""
    db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.session_id == session_id,
    ).delete()
    db.commit()
    return None


@router.get("/chat/token-usage")
async def get_my_token_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return current user's daily token usage and configured limit."""
    today = date.today()
    daily_limit = _resolve_daily_limit(db, current_user.id)
    usage = (
        db.query(UserDailyTokenUsage)
        .filter(
            UserDailyTokenUsage.user_id == current_user.id,
            UserDailyTokenUsage.usage_date == today,
        )
        .first()
    )
    used = int(usage.tokens_used) if usage else 0
    return {
        "usage_date": today.isoformat(),
        "daily_limit": daily_limit,
        "daily_used": used,
        "remaining_tokens": max(0, daily_limit - used),
        "request_count": int(usage.request_count) if usage else 0,
    }


@router.post("/query", response_model=RAGResponse)
async def query_documents(
    query_data: RAGQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Query documents using the RAG pipeline and save response metadata."""
    session_id = query_data.session_id or str(uuid.uuid4())

    try:
        result = rag_pipeline.query(
            user_query=query_data.user_query,
            subject=query_data.subject,
            document_type=query_data.document_type,
            session_id=session_id,
            current_college_id=getattr(current_user, "college_id", None),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error processing query: {exc}")

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
            session_id=session_id,
        )
        db.add(new_query)
        db.commit()
        db.refresh(new_query)
    except Exception as exc:
        print(f"Error saving query to database: {exc}")

    sources = [SourceInfo(**source) for source in result.get("sources", [])]

    return RAGResponse(answer=result["answer"], sources=sources, session_id=session_id)


@router.get("/history")
async def get_query_history(
    skip: int = 0,
    limit: int = 50,
    session_id: Optional[str] = None,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's RAG query history (legacy query log)."""
    query = db.query(Query).filter(Query.user_id == current_user.id)

    if session_id:
        query = query.filter(Query.session_id == session_id)
    if subject:
        query = query.filter(Query.subject == subject)

    query = query.order_by(Query.timestamp.desc())
    total = query.count()
    queries = query.offset(skip).limit(limit).all()

    return {"queries": [q.to_dict() for q in queries], "total": total}


@router.get("/history/{query_id}")
async def get_query_by_id(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get specific RAG query by ID."""
    query = db.query(Query).filter(Query.id == query_id, Query.user_id == current_user.id).first()

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    return query.to_dict()


@router.delete("/history/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_query(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a single RAG query from history."""
    query = db.query(Query).filter(Query.id == query_id, Query.user_id == current_user.id).first()

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    db.delete(query)
    db.commit()
    return None


@router.get("/sessions")
async def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of user's RAG sessions (legacy query log)."""
    sessions = (
        db.query(Query.session_id)
        .filter(Query.user_id == current_user.id, Query.session_id.isnot(None))
        .distinct()
        .all()
    )

    session_list = []
    for session in sessions:
        session_id = session[0]

        first_query = (
            db.query(Query)
            .filter(Query.user_id == current_user.id, Query.session_id == session_id)
            .order_by(Query.timestamp.asc())
            .first()
        )

        last_query = (
            db.query(Query)
            .filter(Query.user_id == current_user.id, Query.session_id == session_id)
            .order_by(Query.timestamp.desc())
            .first()
        )

        query_count = (
            db.query(Query)
            .filter(Query.user_id == current_user.id, Query.session_id == session_id)
            .count()
        )

        session_list.append(
            {
                "session_id": session_id,
                "first_query": first_query.query if first_query else None,
                "first_query_time": first_query.timestamp if first_query else None,
                "last_query_time": last_query.timestamp if last_query else None,
                "query_count": query_count,
            }
        )

    return {"sessions": session_list, "total": len(session_list)}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Clear conversation memory for a legacy RAG session."""
    rag_pipeline.clear_memory(session_id)

    db.query(Query).filter(Query.user_id == current_user.id, Query.session_id == session_id).delete()
    db.commit()

    return None


@router.get("/stats")
async def get_rag_stats(current_user: User = Depends(get_current_active_user)):
    """Get RAG system statistics."""
    embedding_service = EmbeddingService()
    stats = embedding_service.get_stats()

    return {
        "vector_store": stats,
        "model": settings.PERPLEXITY_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
    }
