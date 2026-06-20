"""Notes generator service."""

from __future__ import annotations

import json
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.document import Document
from app.models.note import Note
from app.services.chunk import ChunkService
from app.services.ai.provider import get_generation_provider

logger = logging.getLogger(__name__)


class NotesGeneratorService:
    """Service to generate structured notes from documents."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._chunk_svc = ChunkService(session)
        self._ai_provider = get_generation_provider()

    async def generate_notes(
        self,
        user_id: UUID,
        document_ids: list[UUID] | None = None,
        workspace_id: UUID | None = None,
    ) -> Note:
        """Generate structured notes from specified documents or workspace."""
        
        target_docs = []
        if document_ids:
            # Fetch specific documents
            stmt = select(Document).where(
                Document.id.in_(document_ids),
                Document.owner_id == user_id,
            )
            result = await self._session.execute(stmt)
            target_docs = result.scalars().all()
        elif workspace_id:
            # Fetch all documents in the workspace for this user
            stmt = select(Document).where(
                Document.workspace_id == workspace_id,
                Document.owner_id == user_id,
            )
            result = await self._session.execute(stmt)
            target_docs = result.scalars().all()
            
        if not target_docs:
            raise AppError("No accessible documents found for note generation", status_code=400)
            
        # Extract text chunks
        all_text = []
        for doc in target_docs:
            chunks = await self._chunk_svc.get_chunks(doc.id)
            doc_text = f"\n\n--- Document: {doc.title} ---\n\n"
            for chunk in chunks:
                doc_text += chunk.content + "\n"
            all_text.append(doc_text)
            
        combined_text = "".join(all_text)
        
        # Limit text length just in case to avoid going over API limits
        # Max ~500k characters for safety (Gemini supports 1M tokens)
        if len(combined_text) > 500000:
            combined_text = combined_text[:500000] + "\n...[truncated for length]"

        # Construct prompt
        system_prompt = (
            "You are an expert academic research assistant. "
            "Your task is to analyze the provided documents and generate comprehensive, well-structured notes. "
            "Respond ONLY with a valid JSON object matching this structure EXACTLY:\n"
            "{\n"
            '  "summary": "High-level summary of the documents",\n'
            '  "key_concepts": ["Concept 1", "Concept 2"],\n'
            '  "important_findings": ["Finding 1", "Finding 2"],\n'
            '  "limitations": ["Limitation 1", "Limitation 2"],\n'
            '  "future_work": ["Future Work 1", "Future Work 2"],\n'
            '  "research_ideas": ["Idea 1", "Idea 2"]\n'
            "}"
        )
        
        prompt = f"Please generate structured notes based on the following documents:\n\n{combined_text}"
        
        # Call LLM
        generation_result = await self._ai_provider.generate(
            prompt=prompt,
            system=system_prompt,
            temperature=0.2,
            max_tokens=8192,
            response_json=True
        )
        
        try:
            # Clean up the response if it has markdown formatting
            response_text = generation_result.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"):
                response_text = response_text[3:-3].strip()
                
            parsed_json = json.loads(response_text)
        except Exception as e:
            logger.error(f"Failed to parse generated notes JSON: {e}\nResponse: {generation_result.text}")
            raise AppError("Failed to parse AI response into structured notes", status_code=500)
            
        # Format as Markdown
        md_content = self._format_as_markdown(parsed_json)
        
        # Generate a title
        doc_titles = [doc.title for doc in target_docs[:2]]
        title = "AI Notes: " + ", ".join(doc_titles)
        if len(target_docs) > 2:
            title += f" & {len(target_docs) - 2} more"
            
        # Determine document_id
        document_id = target_docs[0].id if len(target_docs) == 1 else None
            
        # Create and save Note
        note = Note(
            user_id=user_id,
            workspace_id=workspace_id,
            document_id=document_id,
            title=title[:255], # Ensure it fits in typical string columns
            content=md_content,
        )
        
        self._session.add(note)
        await self._session.commit()
        await self._session.refresh(note)
        
        return note
        
    def _format_as_markdown(self, data: dict) -> str:
        lines = []
        
        if "summary" in data and data["summary"]:
            lines.append("## Summary\n")
            lines.append(f"{data['summary']}\n")
            
        def add_list_section(title, key):
            if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                lines.append(f"## {title}\n")
                for item in data[key]:
                    lines.append(f"- {item}")
                lines.append("")
                
        add_list_section("Key Concepts", "key_concepts")
        add_list_section("Important Findings", "important_findings")
        add_list_section("Limitations", "limitations")
        add_list_section("Future Work", "future_work")
        add_list_section("Research Ideas", "research_ideas")
        
        return "\n".join(lines).strip()
