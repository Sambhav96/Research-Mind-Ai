"""RAG service — retrieval-augmented generation with Gemini."""

from __future__ import annotations

import logging
import time
from typing import AsyncGenerator, Sequence

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.chat import Citation, ChatSource
from app.schemas.vector_search import SearchResult
from app.services.ai.provider import get_generation_provider
from app.services.embedding import EmbeddingService
from app.services.vector_search import VectorService
from app.services.admin_ai_logs import AdminAILogsService


class RAGService:
    """Retrieval-Augmented Generation pipeline with citation tracking."""

    def __init__(self, session) -> None:
        self._settings = get_settings()
        self._embedding_svc = EmbeddingService(session)
        self._vector_svc = VectorService(session)
        self._gen = get_generation_provider()
        self._logger = logging.getLogger("scholarmind.rag")

    async def retrieve(
        self,
        query: str,
        owner_id: str | None = None,
        document_ids: list[str] | None = None,
        limit: int | None = None,
        min_similarity: float | None = None,
    ) -> tuple[list[SearchResult], list[Citation], list[ChatSource]]:
        """Retrieve relevant chunks and build citations.

        Args:
            query: User question.
            owner_id: Optional owner filter (user isolation).
            document_ids: Optional document filter.
            limit: Override default context chunk limit.
            min_similarity: Override default similarity threshold.

        Returns:
            Tuple of (search_results, citations, sources).
        """
        limit = limit or self._settings.chat_max_context_chunks
        min_similarity = min_similarity or self._settings.chat_similarity_threshold

        query_embedding = await self._embedding_svc.embed_query(query)

        response = await self._vector_svc.search(
            query_embedding=query_embedding,
            limit=limit,
            min_similarity=min_similarity,
            owner_id=owner_id,
            document_ids=document_ids,
        )

        query_lower = query.lower()
        is_summary_intent = any(w in query_lower for w in ["summarize", "summary", "overview", "key contributions"])
        
        if is_summary_intent and response.results:
            max_pages = {}
            for r in response.results:
                if r.document_id not in max_pages or r.page > max_pages[r.document_id]:
                    max_pages[r.document_id] = r.page
            
            for r in response.results:
                if r.page <= 3:
                    r.score += 0.15
                elif r.page >= max_pages.get(r.document_id, 0) - 2 and max_pages.get(r.document_id, 0) > 5:
                    r.score += 0.10
            
            response.results.sort(key=lambda x: x.score, reverse=True)

        citations: list[Citation] = []
        sources: list[ChatSource] = []
        seen_doc_pages: set[tuple[str, int]] = set()

        for result in response.results:
            citations.append(
                Citation(
                    chunk_id=result.chunk_id,
                    document_id=result.document_id,
                    document_title=result.document_title,
                    page=result.page,
                    content=result.content,
                    score=result.score,
                )
            )

            page_key = (result.document_id, result.page)
            if page_key not in seen_doc_pages:
                seen_doc_pages.add(page_key)
                sources.append(
                    ChatSource(
                        document_id=result.document_id,
                        title=result.document_title,
                        page=result.page,
                        chunk_id=result.chunk_id,
                        relevance_score=result.score,
                    )
                )

        self._logger.debug(
            "RAG retrieval complete",
            extra={
                "query_length": len(query),
                "chunks_found": len(citations),
                "sources": len(sources),
            },
        )

        chunk_log = [f"{idx}. {c.document_title} page {c.page}" for idx, c in enumerate(citations, 1)]
        chunk_log_str = "\n".join(chunk_log)
        retrieval_log = (
            f"\n{'='*40}\n"
            f"Retrieved Chunks:\n{chunk_log_str}\n"
            f"{'='*40}"
        )
        self._logger.info(retrieval_log)

        return response.results, citations, sources

    def build_context(self, chunks: Sequence[SearchResult]) -> str:
        """Assemble retrieved chunks into a context block with page citations.

        Args:
            chunks: Retrieved search results.

        Returns:
            Formatted context string with [Source: doc_title, p.X] markers.
        """
        if not chunks:
            return "No relevant context found."

        parts: list[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            parts.append(
                f"[{idx}] Source: {chunk.document_title}, p.{chunk.page}\n{chunk.content}"
            )
        return "\n\n".join(parts)

    def build_prompt(
        self,
        query: str,
        context: str,
        history: list[dict[str, str]] | None = None,
        source_document_count: int = 1,
    ) -> list[dict[str, str]]:
        """Assemble the message list for the LLM.

        Args:
            query: Current user question.
            context: Retrieved context block.
            history: Optional conversation history.
            source_document_count: Number of unique documents in context.

        Returns:
            List of message dicts compatible with both OpenAI and Gemini adapter.
        """
        system_prompt = (
            "You are a scholarly research assistant. "
            "Answer the user's question using ONLY the provided context. "
            "If the answer cannot be found in the context, say so honestly. "
            "Always cite sources using the [N] reference markers from the context. "
            "Be concise, accurate, and academic in tone."
        )

        query_lower = query.lower()
        compare_keywords = ["compare", "difference", "versus", "vs", "strengths", "weaknesses"]
        is_comparison = any(kw in query_lower for kw in compare_keywords)

        if source_document_count > 1 and is_comparison:
            system_prompt += (
                "\n\nThe user wants to compare multiple papers. Format your response EXACTLY as follows:\n\n"
                "Paper 1\n"
                "Methodology: ...\n"
                "Strengths: ...\n"
                "Weaknesses: ...\n\n"
                "Paper 2\n"
                "Methodology: ...\n"
                "Strengths: ...\n"
                "Weaknesses: ...\n\n"
                "Comparison\n"
                "Similarities: ...\n"
                "Differences: ...\n"
                "Conclusion: ..."
            )

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

        if history:
            for entry in history:
                messages.append({"role": entry["role"], "content": entry["content"]})

        user_message = f"Context:\n{context}\n\nQuestion: {query}"
        messages.append({"role": "user", "content": user_message})

        return messages

    async def generate_answer(
        self,
        messages: list[dict[str, str]],
        stream: bool = False,
    ) -> str | AsyncGenerator[str, None]:
        """Call Gemini with the assembled prompt.

        Args:
            messages: Chat message list (system + history + user).
            stream: If True, returns an async generator of text deltas.

        Returns:
            Full response string, or async generator if streaming.
        """
        if stream:
            return self._stream_answer(messages)

        try:
            parts: list[str] = []
            for m in messages:
                role = m.get("role", "user")
                content = m.get("content", "")
                if role == "system":
                    parts.insert(0, content)
                elif role == "assistant":
                    parts.append(f"Assistant: {content}")
                else:
                    parts.append(content)
            combined = "\n\n".join(parts)
            
            start_time = time.time()
            result = await self._gen.generate(combined)
            latency_ms = int((time.time() - start_time) * 1000)
            
            provider_name = "Gemini" if "gemini" in getattr(self._gen, "_model", result.model).lower() else "OpenRouter"

            AdminAILogsService.log_ai_request_background(
                user_id=None,
                provider=provider_name,
                model=result.model,
                prompt=combined,
                response=result.text,
                latency_ms=latency_ms,
                status="success"
            )

            self._logger.debug(
                "RAG generation complete",
                extra={
                    "input_tokens": result.input_tokens,
                    "output_tokens": result.output_tokens,
                    "model": result.model,
                },
            )
            return result.text
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            AdminAILogsService.log_ai_request_background(
                user_id=None,
                provider="Unknown",
                model="Unknown",
                prompt=combined if 'combined' in locals() else str(messages),
                response=None,
                latency_ms=latency_ms,
                status="error",
                error_message=str(e)
            )
            import traceback
            self._logger.error(f"EXCEPTION TYPE: {type(e).__name__}")
            self._logger.error(f"EXCEPTION REPR: {repr(e)}")
            self._logger.error(traceback.format_exc())
            raise

    async def _stream_answer(self, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
        """Internal Gemini streaming generator."""
        try:
            start_time = time.time()
            combined_prompt = "\\n\\n".join([m.get("content", "") for m in messages])
            provider_name = "Gemini" if "gemini" in getattr(self._gen, "_model", "").lower() else "OpenRouter"
            model_name = getattr(self._gen, "_model", "Unknown")

            async for delta in self._gen.generate_stream(messages):
                yield delta
                
            latency_ms = int((time.time() - start_time) * 1000)
            AdminAILogsService.log_ai_request_background(
                user_id=None,
                provider=provider_name,
                model=model_name,
                prompt=combined_prompt,
                response="<Streamed Response>",
                latency_ms=latency_ms,
                status="success"
            )
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            AdminAILogsService.log_ai_request_background(
                user_id=None,
                provider="Unknown",
                model="Unknown",
                prompt=str(messages),
                response=None,
                latency_ms=latency_ms,
                status="error",
                error_message=str(e)
            )
            self._logger.error(f"Failed to stream answer from Gemini: {e}")
            raise AppError(
                code="ai_generation_failed",
                message="Failed to generate streaming response. Please check your Gemini API key and quota.",
                status_code=502,
            )
