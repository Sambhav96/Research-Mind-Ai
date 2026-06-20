# ScholarMind — AI Research Assistant Platform
## Master Project Specification (SPEC.md)
> Version 1.0 | Generated for Production-Grade SaaS Development

---

## Table of Contents

1. [Project Vision & Overview](#1-project-vision--overview)
2. [Technology Stack (Justified)](#2-technology-stack-justified)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [AI / ML Pipeline Architecture](#6-ai--ml-pipeline-architecture)
7. [Database Design](#7-database-design)
8. [API Specification](#8-api-specification)
9. [Authentication & Security](#9-authentication--security)
10. [DevOps & Deployment Architecture](#10-devops--deployment-architecture)
11. [UI/UX System & Motion Design](#11-uiux-system--motion-design)
12. [Scalability Strategy](#12-scalability-strategy)
13. [Phase-by-Phase Development Roadmap](#13-phase-by-phase-development-roadmap)
14. [Feature Roadmap (Beginner → Advanced)](#14-feature-roadmap-beginner--advanced)

---

## 1. Project Vision & Overview

### 1.1 Product Name
**ScholarMind** — AI-Powered Research Intelligence Platform

### 1.2 One-Line Description
> ScholarMind is a production-grade AI SaaS platform that transforms how researchers, students, and knowledge workers interact with academic papers — combining RAG-powered chat, semantic search, auto-generated flashcards, quizzes, citations, and personalized research recommendations in a single, beautifully animated interface.

### 1.3 Target Users
| Persona | Pain Point | ScholarMind Solution |
|---|---|---|
| Graduate Students | Can't keep up with paper volume | AI summarization + chat |
| Research Engineers | Manual note-taking is slow | AI-generated structured notes |
| Professors | Hard to surface relevant papers | Semantic recommendation engine |
| Knowledge Workers | No single research hub | Unified upload/search/learn platform |

### 1.4 Core Feature Set

#### Must-Have (MVP)
- PDF upload and ingestion (single + bulk)
- AI-powered paper summarization
- Conversational AI over any uploaded document (RAG)
- Semantic search across all uploaded papers
- AI-generated flashcards
- AI-generated quiz questions
- Citation extraction and formatting (APA, MLA, IEEE)
- Research recommendations (content-based)
- Structured AI note generation

#### Nice-to-Have (Post-MVP)
- Multi-document comparative analysis
- Collaborative workspaces (share collections)
- Browser extension for one-click paper capture
- Annotation and highlighting system
- Research timeline / knowledge graph
- Export to Notion, Obsidian, Roam

---

## 2. Technology Stack (Justified)

### 2.1 Frontend

| Technology | Version | Why Chosen | Trade-off |
|---|---|---|---|
| **Next.js** | 14+ (App Router) | SSR/SSG, edge functions, file-based routing, built-in API routes, Vercel-native | Steeper learning curve than CRA; opinionated structure |
| **TypeScript** | 5.x | Type safety, IDE intelligence, catches bugs at compile time | Initial setup overhead; verbose for small files |
| **Tailwind CSS** | 3.x | Utility-first, zero unused CSS in prod, responsive utilities, design token system | Verbose class strings; custom components need discipline |
| **Framer Motion** | 11.x | Production-grade animation library, gesture support, layout animations, exit animations | Adds ~40KB to bundle; overkill for static content |
| **Shadcn/UI** | Latest | Composable, accessible, unstyled base components — you own the code | Not a traditional component library; requires copy-paste setup |
| **React Query (TanStack)** | 5.x | Server state management, caching, background refetch, optimistic updates | Adds abstraction over fetch; may feel heavy for simple GET calls |
| **Zustand** | 4.x | Minimal, no boilerplate, works outside React, devtools support | Less structure than Redux; requires discipline in larger teams |

**Why NOT Redux?** Redux adds unnecessary boilerplate for a UI-state-light app. Zustand gives 90% of Redux's value in 10% of the code.

**Why NOT SWR over React Query?** React Query has superior mutation handling, offline support, and devtools — critical for file upload flows.

### 2.2 Backend

| Technology | Version | Why Chosen | Trade-off |
|---|---|---|---|
| **FastAPI** | 0.110+ | Async-native, automatic OpenAPI docs, Pydantic validation, Python-native AI/ML | Younger ecosystem than Django; fewer enterprise integrations |
| **PostgreSQL** | 15+ | ACID compliance, JSONB support, excellent indexing, pgvector extension | More ops complexity than SQLite; needs connection pooling |
| **SQLAlchemy** | 2.0 (async) | Industry-standard ORM, async session support, migrations via Alembic | Verbose for simple queries; N+1 problems if careless |
| **Redis** | 7.x | In-memory caching, Celery broker, pub/sub for real-time features | Data is ephemeral; needs persistence config for critical data |
| **Celery** | 5.x | Distributed task queue, retries, rate limiting, scheduling | Adds operational complexity; overkill for tiny deployments |
| **JWT (jose)** | — | Stateless auth, scalable across services, industry standard | Token revocation requires blacklist strategy; expiry management |

**Why NOT Django?** FastAPI's async support is critical for AI/ML workloads where multiple LLM calls run concurrently. Django's synchronous ORM would bottleneck RAG pipelines.

**Why NOT MongoDB?** Relational data (users → documents → chunks → embeddings → quiz questions) benefits from foreign keys and transactions. JSONB in PostgreSQL handles semi-structured data where needed.

### 2.3 AI / ML

| Technology | Why Chosen | Trade-off |
|---|---|---|
| **LangChain** | Orchestrates LLM chains, RAG pipelines, memory — battle-tested for production RAG | Can be overengineered; abstractions hide what's happening; move to LangGraph for agentic flows |
| **OpenAI API (GPT-4o)** | Best summarization and reasoning quality, function calling, JSON mode | Cost per token; rate limits; vendor lock-in risk |
| **text-embedding-3-small** | High quality embeddings, 1536 dims, cheap at $0.02/1M tokens | OpenAI-specific; consider local fallback |
| **Sentence Transformers (BAAI/bge-small)** | Local embedding fallback, no API cost, runs on CPU | Slightly lower quality than OpenAI; cold start on first load |
| **ChromaDB** | Embedded vector DB, zero infra for MVP, persistent storage | Doesn't scale to millions of vectors; migrate to Pinecone post-MVP |
| **Pinecone** | Managed vector DB, horizontal scaling, metadata filtering | Paid; latency across regions; vendor dependency |
| **PyMuPDF (fitz)** | Fast PDF text extraction, handles tables/figures, open source | Scanned PDFs need OCR fallback (Tesseract) |
| **Unstructured.io** | Handles complex PDFs (columns, tables, mixed content) | Slower than PyMuPDF; API has cost |

**Embedding Strategy:** Use OpenAI `text-embedding-3-small` as primary (high quality, cheap). Fall back to local `BAAI/bge-small-en-v1.5` when OpenAI is unavailable or for cost optimization.

---

## 3. System Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│  Next.js Web App | Mobile PWA | Future: iOS/Android │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              CDN / Edge (Vercel Edge Network)        │
│       Static Assets | ISR Pages | Edge Functions     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            API Gateway (FastAPI)                     │
│  Auth Middleware | Rate Limiting | Request Logging   │
│  CORS | JWT Verification | Request Validation        │
└───┬──────────────┬──────────────────────────────────┘
    │              │
┌───▼───┐      ┌───▼──────────────────────────────────┐
│  Auth │      │        Service Layer                  │
│Service│      │  Document | AI | Search | Recommend   │
└───┬───┘      └───┬──────────────────┬────────────────┘
    │              │                  │
┌───▼──────────┐ ┌─▼──────────────┐  │
│  PostgreSQL  │ │  Celery Workers │  │
│  (Primary DB)│ │  (Async Tasks)  │  │
│  + pgvector  │ └────────────────┘  │
└──────────────┘                     │
                               ┌─────▼──────┐
                               │ Vector DB  │
                               │ ChromaDB / │
                               │ Pinecone   │
                               └────────────┘
```

### 3.2 Request Lifecycle

```
User uploads PDF
  → Next.js → FastAPI → File stored in S3/local
  → Celery task queued (async processing)
  → PyMuPDF extracts text
  → Text chunked (512 tokens, 50 overlap)
  → Embeddings generated (OpenAI / local)
  → Vectors stored in ChromaDB
  → Metadata stored in PostgreSQL
  → WebSocket notification → Frontend updates
  → User can now chat with the document
```

---

## 4. Frontend Architecture

### 4.1 Folder Structure

```
scholarmind-web/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Route group: auth pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Route group: authenticated pages
│   │   ├── layout.tsx            # Dashboard shell (sidebar + nav)
│   │   ├── page.tsx              # /dashboard home
│   │   ├── library/              # Paper library
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── chat/                 # AI chat interface
│   │   │   └── [documentId]/page.tsx
│   │   ├── search/page.tsx       # Semantic search
│   │   ├── flashcards/           # Flashcard decks
│   │   │   ├── page.tsx
│   │   │   └── [deckId]/page.tsx
│   │   ├── quiz/                 # Quiz interface
│   │   │   ├── page.tsx
│   │   │   └── [quizId]/page.tsx
│   │   ├── notes/page.tsx        # AI-generated notes
│   │   └── settings/page.tsx
│   ├── api/                      # Next.js API routes (BFF layer)
│   │   └── [...]/route.ts
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── ui/                       # Shadcn base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── common/                   # Shared domain-agnostic components
│   │   ├── AnimatedGradientBg.tsx
│   │   ├── GlassCard.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── PageTransition.tsx
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── StatsCards.tsx
│   │   └── RecentActivity.tsx
│   ├── documents/                # Document management components
│   │   ├── UploadZone.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentGrid.tsx
│   │   └── ProcessingStatus.tsx
│   ├── chat/                     # Chat interface components
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── CitationTag.tsx
│   │   └── SourcePanel.tsx
│   ├── search/                   # Semantic search components
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── SemanticHighlight.tsx
│   ├── flashcards/               # Flashcard components
│   │   ├── FlashcardDeck.tsx
│   │   ├── FlashcardViewer.tsx   # 3D flip animation
│   │   └── ProgressBar.tsx
│   └── quiz/                     # Quiz components
│       ├── QuizCard.tsx
│       ├── AnswerOption.tsx
│       └── QuizResults.tsx
│
├── hooks/
│   ├── useDocuments.ts           # React Query hooks
│   ├── useChat.ts
│   ├── useSearch.ts
│   ├── useFlashcards.ts
│   ├── useWebSocket.ts           # Real-time processing updates
│   └── useUpload.ts              # File upload with progress
│
├── store/
│   ├── useAuthStore.ts           # Zustand: auth state
│   ├── useChatStore.ts           # Zustand: active chat state
│   ├── useUIStore.ts             # Zustand: sidebar, theme, modals
│   └── useSearchStore.ts         # Zustand: search state
│
├── lib/
│   ├── api.ts                    # Axios instance + interceptors
│   ├── queryClient.ts            # React Query client config
│   ├── animations.ts             # Framer Motion variants library
│   ├── constants.ts
│   └── utils.ts
│
├── types/
│   ├── api.types.ts              # API response types
│   ├── document.types.ts
│   ├── chat.types.ts
│   └── user.types.ts
│
└── public/
    ├── manifest.json             # PWA manifest
    ├── sw.js                     # Service worker
    └── icons/                    # PWA icons
```

### 4.2 State Management Strategy

```
┌─────────────────────────────────────────────────┐
│              STATE ARCHITECTURE                  │
│                                                 │
│  Server State (React Query)                      │
│  ├── Documents list, single document            │
│  ├── Chat history (paginated)                   │
│  ├── Search results                             │
│  ├── Flashcard decks                            │
│  └── User profile / subscription               │
│                                                 │
│  Client State (Zustand)                         │
│  ├── Auth: user object, JWT token               │
│  ├── Chat: current session messages, typing     │
│  ├── UI: sidebar open, active theme, modals     │
│  └── Search: query, filters, sort               │
│                                                 │
│  Form State (React Hook Form + Zod)             │
│  └── Upload form, quiz answers, settings        │
└─────────────────────────────────────────────────┘
```

**Rule:** Everything that comes from the server lives in React Query. Everything that is ephemeral UI state lives in Zustand. Never cache server data in Zustand — it creates sync bugs.

### 4.3 Page Hierarchy

```
/ (root)
├── /login          → Auth: Email + OAuth
├── /register       → Auth: Registration + onboarding
├── /dashboard      → Overview: stats, recent papers, recommendations
├── /library        → All uploaded papers grid/list
│   └── /[id]       → Single paper: summary, metadata, actions
├── /chat/[id]      → Full-screen RAG chat interface for a paper
├── /search         → Semantic search across all papers
├── /flashcards     → Flashcard decks list
│   └── /[deckId]   → Active flashcard session
├── /quiz           → Available quizzes
│   └── /[quizId]   → Active quiz session
├── /notes          → AI-generated notes by paper
└── /settings       → Profile, API keys, subscription
```

### 4.4 Responsive Strategy

```
Mobile First Breakpoints:
- xs: 0px     → Single column, bottom nav, full-width cards
- sm: 640px   → Two-column grid begins
- md: 768px   → Sidebar collapses to icon-only mode
- lg: 1024px  → Full sidebar, multi-column layouts
- xl: 1280px  → Three-column layouts, wider content
- 2xl: 1536px → Max-width container, generous whitespace

Navigation Strategy:
- Mobile (<768px): Bottom tab bar with 5 main routes
- Tablet (768-1024px): Collapsible sidebar (icon mode)
- Desktop (>1024px): Full expanded sidebar with labels
```

---

## 5. Backend Architecture

### 5.1 Folder Structure

```
scholarmind-api/
├── app/
│   ├── main.py                   # FastAPI app factory
│   ├── config.py                 # Pydantic Settings
│   │
│   ├── api/
│   │   ├── deps.py               # Dependency injection (DB, auth)
│   │   └── v1/
│   │       ├── router.py         # All v1 routes mounted here
│   │       ├── auth.py           # /auth/* endpoints
│   │       ├── documents.py      # /documents/* endpoints
│   │       ├── chat.py           # /chat/* endpoints
│   │       ├── search.py         # /search/* endpoints
│   │       ├── flashcards.py     # /flashcards/* endpoints
│   │       ├── quiz.py           # /quiz/* endpoints
│   │       ├── notes.py          # /notes/* endpoints
│   │       └── recommendations.py
│   │
│   ├── core/
│   │   ├── security.py           # JWT creation/verification
│   │   ├── config.py             # App settings (env vars)
│   │   ├── exceptions.py         # Custom exceptions + handlers
│   │   └── middleware.py         # CORS, logging, rate limit
│   │
│   ├── db/
│   │   ├── base.py               # SQLAlchemy declarative base
│   │   ├── session.py            # Async session factory
│   │   └── migrations/           # Alembic migrations
│   │       ├── env.py
│   │       └── versions/
│   │
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── chunk.py
│   │   ├── chat.py
│   │   ├── flashcard.py
│   │   ├── quiz.py
│   │   └── note.py
│   │
│   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── chat.py
│   │   └── ...
│   │
│   ├── services/                 # Business logic layer
│   │   ├── auth_service.py
│   │   ├── document_service.py   # Upload, parse, orchestrate
│   │   ├── ai_service.py         # LLM calls, prompt management
│   │   ├── embedding_service.py  # Embedding generation
│   │   ├── vector_service.py     # ChromaDB / Pinecone operations
│   │   ├── chat_service.py       # RAG chat logic
│   │   ├── flashcard_service.py
│   │   ├── quiz_service.py
│   │   └── recommendation_service.py
│   │
│   ├── repositories/             # Data access layer (repository pattern)
│   │   ├── base_repo.py          # Generic CRUD
│   │   ├── user_repo.py
│   │   ├── document_repo.py
│   │   └── ...
│   │
│   ├── tasks/                    # Celery async tasks
│   │   ├── celery_app.py         # Celery factory
│   │   ├── document_tasks.py     # PDF processing pipeline
│   │   ├── ai_tasks.py           # Summarization, flashcard gen
│   │   └── notification_tasks.py # Email, WebSocket events
│   │
│   └── utils/
│       ├── pdf_parser.py         # PyMuPDF wrapper
│       ├── chunker.py            # Text chunking strategies
│       ├── citation_extractor.py # Citation parsing
│       └── file_storage.py       # S3 / local storage
│
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
│
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 5.2 Service Layer Architecture

Every service follows this pattern:
```python
# services/document_service.py
class DocumentService:
    def __init__(
        self,
        db: AsyncSession,          # Injected via FastAPI Depends
        storage: FileStorage,
        embedding_service: EmbeddingService,
        vector_service: VectorService,
        celery: Celery
    ):
        self.db = db
        self.repo = DocumentRepository(db)
        # ...

    async def upload_document(self, user_id: UUID, file: UploadFile) -> Document:
        # 1. Validate file (type, size)
        # 2. Store file (S3 or local)
        # 3. Create DB record (status: PROCESSING)
        # 4. Queue Celery task
        # 5. Return document (with processing status)
        pass

    async def get_document(self, document_id: UUID, user_id: UUID) -> Document:
        # Ownership check + fetch
        pass
```

### 5.3 Repository Pattern

```python
# repositories/base_repo.py
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: UUID) -> Optional[ModelType]: ...
    async def get_multi(self, *, skip: int = 0, limit: int = 100) -> List[ModelType]: ...
    async def create(self, obj_in: dict) -> ModelType: ...
    async def update(self, db_obj: ModelType, obj_in: dict) -> ModelType: ...
    async def delete(self, id: UUID) -> ModelType: ...
```

**Why Repository Pattern?** Decouples business logic (services) from database access (repositories). Makes unit testing services trivial — mock the repository, not the database.

### 5.4 Async Architecture

All database operations use `asyncpg` under SQLAlchemy 2.0:
```python
# db/session.py
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
```

All Celery tasks use `asyncio.run()` or `sync_to_async` wrappers to call async services from the synchronous Celery context.

---

## 6. AI / ML Pipeline Architecture

### 6.1 Document Ingestion Pipeline

```
PDF Upload
    │
    ▼
┌───────────────────┐
│  File Validation  │
│  - Type check     │
│  - Size limit     │
│  - Virus scan     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Text Extraction  │
│  PyMuPDF primary  │
│  Unstructured.io  │
│  fallback         │
│  OCR if needed    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Pre-processing   │
│  - Clean text     │
│  - Remove headers │
│  - Normalize      │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  Chunking Strategy                    │
│  - Primary: Recursive Character       │
│    chunk_size=512 tokens              │
│    chunk_overlap=50 tokens            │
│  - Semantic chunking for papers       │
│    (split at section boundaries)      │
│  - Metadata per chunk:                │
│    {page, section, position, doc_id}  │
└────────┬──────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  Embedding Generation                 │
│  - Batch size: 100 chunks             │
│  - Provider: OpenAI text-embedding-3  │
│  - Fallback: BAAI/bge-small local     │
│  - Store: numpy array in memory       │
│    → write to ChromaDB / Pinecone     │
└────────┬──────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  Vector Storage   │
│  ChromaDB (dev)   │
│  Pinecone (prod)  │
│  Metadata filter  │
│  by user_id       │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  Parallel AI Tasks (Celery Chord)     │
│  ├── Summarization (GPT-4o)           │
│  ├── Citation Extraction              │
│  ├── Flashcard Generation             │
│  ├── Key Concepts Extraction          │
│  └── Metadata enrichment             │
└────────┬──────────────────────────────┘
         │
         ▼
    DB Updated → WebSocket notification → Frontend
```

### 6.2 RAG Chat Pipeline

```
User Question
    │
    ▼
┌──────────────────────────────────────────┐
│  Query Processing                        │
│  1. Rephrase with conversation history  │
│     (LangChain ConversationalRetrieval) │
│  2. Generate query embedding            │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Semantic Retrieval                      │
│  - similarity_search(query_emb, k=5)    │
│  - Filter by document_id (or global)    │
│  - MMR (Max Marginal Relevance)         │
│    for diversity                        │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Context Assembly                        │
│  - Rank chunks by relevance score       │
│  - Fit within context window (8K)       │
│  - Include page numbers                 │
│  - Format: [Source: p.12] ...text...   │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Prompt Construction                     │
│  System: Research assistant persona     │
│  Context: Retrieved chunks              │
│  History: Last N turns                  │
│  Question: User query                   │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  GPT-4o Inference (Streaming)           │
│  - stream=True (token-by-token)         │
│  - JSON mode for structured answers     │
│  - Citation extraction from response   │
└────────┬─────────────────────────────────┘
         │
         ▼
    Streamed to Frontend via SSE
```

### 6.3 Chunking Strategy (Detailed)

```python
# utils/chunker.py

class ScholarChunker:
    """
    Hybrid chunking: structural first, semantic fallback.
    
    Priority:
    1. Split at detected section headers (Abstract, Introduction, etc.)
    2. Within sections, use recursive character splitting (512 tokens)
    3. Maintain 50-token overlap to preserve context across chunks
    4. Each chunk gets enriched metadata
    """
    
    SECTION_PATTERNS = [
        r'^abstract', r'^introduction', r'^related work',
        r'^methodology', r'^results', r'^discussion',
        r'^conclusion', r'^references'
    ]
    
    def chunk(self, text: str, metadata: dict) -> List[Document]:
        sections = self._detect_sections(text)
        chunks = []
        for section in sections:
            sub_chunks = self.text_splitter.split_text(section.content)
            for i, chunk in enumerate(sub_chunks):
                chunks.append(Document(
                    page_content=chunk,
                    metadata={
                        **metadata,
                        "section": section.name,
                        "chunk_index": i,
                        "total_chunks": len(sub_chunks),
                    }
                ))
        return chunks
```

### 6.4 Prompt Engineering Strategy

#### Summarization Prompt
```
System: You are ScholarMind, an expert research assistant specializing 
in academic paper analysis. Your summaries are structured, accurate, 
and citation-aware.

Task: Summarize the following research paper.

Output Format (JSON):
{
  "title": "...",
  "authors": [...],
  "year": "...",
  "one_sentence": "...",
  "abstract_rewrite": "...",
  "key_contributions": [...],
  "methodology": "...",
  "findings": [...],
  "limitations": [...],
  "future_work": "..."
}

Paper: {paper_text}
```

#### Flashcard Generation Prompt
```
Generate {n} flashcards from the following research paper sections.

Rules:
- Front: A clear, atomic question
- Back: A precise, self-contained answer (2-3 sentences max)
- Cover: key terms, concepts, findings, methodology
- Difficulty: {difficulty_level}

Output Format (JSON Array):
[{"front": "...", "back": "...", "topic": "...", "difficulty": "easy|medium|hard"}]

Content: {paper_section}
```

#### Citation-Aware RAG Prompt
```
System: You are a research assistant. Answer questions using ONLY 
the provided context. For every claim, cite the page number.

Rules:
- Never hallucinate beyond the provided context
- If the answer is not in the context, say "Not found in this paper"
- Format citations as [p. X]
- Keep responses concise but complete

Context: {retrieved_chunks}
Chat History: {history}
Question: {question}
```

### 6.5 Hallucination Reduction Strategy

1. **Grounding only:** System prompt explicitly forbids answering beyond context
2. **Temperature = 0** for factual Q&A, **0.7** for generation tasks
3. **Source attribution:** Every answer references specific chunks
4. **Confidence scoring:** Log retrieval scores; surface low-confidence answers differently in UI
5. **Fallback phrases:** Explicit "not found" messaging rather than generation
6. **Chunk-level verification:** Post-generation, verify claims against source chunks

### 6.6 Cost Optimization Strategy

| Strategy | Implementation | Estimated Saving |
|---|---|---|
| Embedding cache | Redis cache for identical queries | 40-60% embedding cost |
| Chunk deduplication | Hash chunks; skip re-embedding duplicates | 30% on re-uploads |
| Model tiering | GPT-4o-mini for flashcards; GPT-4o for chat | 70% cost reduction |
| Batch embedding | Embed 100 chunks per API call | 50% fewer requests |
| Local embeddings | Sentence Transformers fallback | 100% embedding cost (at compute expense) |
| Max tokens | Set response max_tokens based on task type | Predictable cost |

---

## 7. Database Design

### 7.1 PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    avatar_url  TEXT,
    plan        VARCHAR(50) DEFAULT 'free',  -- free | pro | enterprise
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (uploaded papers)
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT,
    authors         JSONB,                   -- ["Author 1", "Author 2"]
    year            VARCHAR(10),
    doi             VARCHAR(255),
    file_url        TEXT NOT NULL,
    file_size       INTEGER,
    page_count      INTEGER,
    status          VARCHAR(50) DEFAULT 'pending',  
                    -- pending|processing|ready|failed
    summary         JSONB,                   -- AI-generated summary object
    metadata        JSONB,                   -- Flexible metadata
    chunk_count     INTEGER DEFAULT 0,
    vector_id       VARCHAR(255),            -- ChromaDB/Pinecone collection ref
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks (for retrieval tracking)
CREATE TABLE document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    section     VARCHAR(255),
    vector_id   VARCHAR(255),               -- ChromaDB point ID
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,   -- user | assistant
    content         TEXT NOT NULL,
    citations       JSONB,                  -- [{chunk_id, page, text_preview}]
    tokens_used     INTEGER,
    model           VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcard decks
CREATE TABLE flashcard_decks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    card_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards
CREATE TABLE flashcards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id     UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front       TEXT NOT NULL,
    back        TEXT NOT NULL,
    topic       VARCHAR(255),
    difficulty  VARCHAR(50),               -- easy | medium | hard
    review_count INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    next_review   TIMESTAMPTZ,             -- Spaced repetition
    ease_factor   FLOAT DEFAULT 2.5,       -- SM-2 algorithm
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    question_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE quiz_questions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    options     JSONB NOT NULL,             -- ["A", "B", "C", "D"]
    correct     VARCHAR(10) NOT NULL,       -- "A" | "B" | "C" | "D"
    explanation TEXT,
    topic       VARCHAR(255),
    difficulty  VARCHAR(50)
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score       FLOAT,
    answers     JSONB,                      -- {question_id: selected_option}
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    content     TEXT NOT NULL,              -- Markdown
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);
```

### 7.2 Vector Database Schema (ChromaDB)

```python
# One collection per user for isolation
collection_name = f"user_{user_id}_documents"

# Document structure in vector DB
{
    "id": "chunk_uuid",
    "embedding": [...],  # 1536 dims
    "document": "chunk text content",
    "metadata": {
        "document_id": "uuid",
        "user_id": "uuid",
        "page_number": 12,
        "section": "Methodology",
        "chunk_index": 5,
        "title": "Paper Title"
    }
}
```

---

## 8. API Specification

### 8.1 Base URL
```
Production: https://api.scholarmind.ai/v1
Development: http://localhost:8000/api/v1
```

### 8.2 Authentication
All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### 8.3 Core Endpoints

#### Auth
```
POST   /auth/register          Create account
POST   /auth/login             Get JWT tokens
POST   /auth/refresh           Refresh access token
POST   /auth/logout            Invalidate refresh token
GET    /auth/me                Get current user
```

#### Documents
```
GET    /documents              List user's documents (paginated)
POST   /documents/upload       Upload PDF (multipart/form-data)
GET    /documents/{id}         Get document + summary
DELETE /documents/{id}         Delete document + vectors
GET    /documents/{id}/status  Processing status (for polling)
GET    /documents/{id}/chunks  List document chunks
```

#### Chat
```
GET    /chat/sessions                    List chat sessions
POST   /chat/sessions                    Create new session
GET    /chat/sessions/{id}/messages      Get messages
POST   /chat/sessions/{id}/messages      Send message (SSE stream)
DELETE /chat/sessions/{id}              Delete session
```

#### Search
```
GET    /search?q={query}&limit=10       Semantic search across all docs
GET    /search?q={query}&doc={id}       Semantic search within a doc
```

#### Flashcards
```
GET    /flashcards/decks               List decks
POST   /flashcards/decks               Create deck
GET    /flashcards/decks/{id}          Get deck + cards
POST   /flashcards/generate            AI generate from document
PUT    /flashcards/{id}/review         Submit review (spaced repetition)
```

#### Quiz
```
GET    /quiz                           List quizzes
POST   /quiz/generate                  AI generate from document
GET    /quiz/{id}                      Get quiz + questions
POST   /quiz/{id}/attempt              Submit answers, get score
```

#### Notes
```
GET    /notes                          List notes
POST   /notes/generate                 AI generate from document
GET    /notes/{id}                     Get note
PUT    /notes/{id}                     Update note
DELETE /notes/{id}                     Delete note
```

#### Recommendations
```
GET    /recommendations                Get personalized recommendations
GET    /recommendations/similar/{id}   Papers similar to a given paper
```

### 8.4 Response Format (Standard)

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  },
  "error": null
}
```

Error response:
```json
{
  "data": null,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with id '...' not found",
    "details": {}
  }
}
```

---

## 9. Authentication & Security

### 9.1 JWT Strategy

```
Access Token:   15 minutes TTL  → Stored in memory (Zustand)
Refresh Token:  30 days TTL     → Stored in HttpOnly cookie

Token Rotation: Each refresh generates a new refresh token
Blacklist:      Redis stores revoked refresh token JTIs
```

### 9.2 Security Checklist

- [ ] **Input validation:** All inputs validated by Pydantic schemas
- [ ] **File validation:** MIME type + magic bytes check (not just extension)
- [ ] **File size limits:** 50MB per upload, 1GB per user (free tier)
- [ ] **Rate limiting:** 100 req/min auth endpoints, 1000 req/min general
- [ ] **CORS:** Whitelist only known frontend origins
- [ ] **SQL injection:** Impossible via SQLAlchemy ORM (parameterized)
- [ ] **XSS:** Content-Security-Policy headers on all responses
- [ ] **CSRF:** SameSite=Strict on cookies; JWT in header for API
- [ ] **Document isolation:** All vector queries filter by user_id
- [ ] **API key storage:** User OpenAI keys encrypted at rest (AES-256)
- [ ] **HTTPS:** Enforced in production; HSTS headers
- [ ] **Secrets:** All secrets in environment variables, never hardcoded
- [ ] **Dependency scanning:** Dependabot + Snyk in CI pipeline

---

## 10. DevOps & Deployment Architecture

### 10.1 Docker Architecture

```yaml
# docker-compose.yml (development)
services:
  api:             # FastAPI application
  worker:          # Celery worker (AI processing)
  beat:            # Celery Beat (scheduled tasks)
  postgres:        # PostgreSQL database
  redis:           # Redis (cache + Celery broker)
  chroma:          # ChromaDB vector database
  flower:          # Celery monitoring (dev only)
```

### 10.2 Production Deployment

```
Frontend:
  Platform: Vercel
  CDN: Vercel Edge Network
  Preview: Automatic per PR
  Production: main branch auto-deploy
  Env: NEXT_PUBLIC_API_URL, etc.

Backend:
  Platform: Render (Web Service)
  Runtime: Python 3.11
  Instance: Standard (1 CPU, 2GB RAM)
  Auto-deploy: main branch

Celery Workers:
  Platform: Render (Background Worker)
  Scaling: 2-4 workers for AI tasks

Database:
  Platform: Render PostgreSQL
  Tier: Starter (upgrade to Standard for prod)
  Backups: Daily automated

Redis:
  Platform: Render Redis
  Persistence: AOF enabled

Vector DB:
  Dev: ChromaDB (local container)
  Prod: Pinecone (Starter plan)
```

### 10.3 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - Lint (ruff, mypy, eslint)
    - Unit tests (pytest, jest)
    - Integration tests

  build:
    - Docker build API image
    - Docker build Worker image
    - Push to GitHub Container Registry

  deploy:
    - Deploy API to Render
    - Deploy Worker to Render
    - Deploy Frontend to Vercel
    - Run database migrations (Alembic)
    - Smoke tests
```

### 10.4 Environment Configuration

```bash
# Backend .env
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
FILE_STORAGE=s3  # local | s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
CORS_ORIGINS=https://scholarmind.ai,https://www.scholarmind.ai
ENVIRONMENT=production  # development | staging | production

# Frontend .env.local
NEXT_PUBLIC_API_URL=https://api.scholarmind.ai/v1
NEXT_PUBLIC_WS_URL=wss://api.scholarmind.ai
```

---

## 11. UI/UX System & Motion Design

### 11.1 Design Tokens

```css
/* Design system tokens */
:root {
  /* Colors */
  --brand-primary: #6366F1;      /* Indigo - primary actions */
  --brand-secondary: #8B5CF6;    /* Purple - accents */
  --brand-accent: #06B6D4;       /* Cyan - highlights */
  
  /* Typography Scale */
  --font-display: 'Cal Sans', 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing (8px base grid) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-4: 1rem;     /* 16px */
  --space-8: 2rem;     /* 32px */
  
  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
  
  /* Animation durations */
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --duration-slow: 500ms;
  --duration-page: 400ms;
  
  /* Easing */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 11.2 Framer Motion Variants Library

```typescript
// lib/animations.ts

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } }
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

export const pageTransition = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: 0.3 }
}

export const glassCardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] } }
}

export const aiTypingVariants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: { scaleY: 1, opacity: 1 },
  // Three bouncing dots: staggered infinite animation
}

export const flashcardFlip = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
  transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
}
```

### 11.3 Key UI Components

#### Glassmorphism Card
```tsx
<motion.div
  variants={glassCardHover}
  initial="rest"
  whileHover="hover"
  className="
    backdrop-blur-xl
    bg-white/5 dark:bg-white/5
    border border-white/10
    rounded-2xl
    shadow-[0_8px_32px_rgba(0,0,0,0.1)]
  "
>
```

#### Animated Gradient Background
```tsx
// Animated mesh gradient background for landing/dashboard
<div className="
  absolute inset-0
  bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
  from-indigo-900/20 via-transparent to-transparent
  animate-gradient-shift
" />
```

#### Skeleton Loading Pattern
```tsx
// Every data-fetching component has a skeleton state
function DocumentCard() {
  const { data, isLoading } = useDocument(id)
  if (isLoading) return <DocumentCardSkeleton />
  return <DocumentCardContent data={data} />
}
```

---

## 12. Scalability Strategy

### 12.1 Horizontal Scaling Plan

```
Phase 1 (0-1K users):
- Single FastAPI instance + Single Celery worker
- ChromaDB embedded
- PostgreSQL Starter

Phase 2 (1K-10K users):
- FastAPI: 2-3 replicas behind load balancer
- Celery: 4-8 workers, separate queues per task type
- Migrate ChromaDB → Pinecone
- PostgreSQL: Add read replicas
- Redis: Sentinel for HA

Phase 3 (10K-100K users):
- FastAPI: Auto-scaling on Render/AWS ECS
- Celery: Autoscale workers by queue depth
- Pinecone: Scale index size
- PostgreSQL: PgBouncer connection pooling
- CDN: All static assets + summaries cached

Phase 4 (100K+ users):
- Microservices split: Auth, Document, AI, Search services
- Kafka for async event streaming (replace direct Celery)
- Multi-region deployment
- GPU servers for local embedding inference
```

### 12.2 Database Optimization

```sql
-- Partition chat_messages by created_at (high-volume table)
CREATE TABLE chat_messages PARTITION BY RANGE (created_at);

-- Partial indexes for common queries
CREATE INDEX idx_docs_ready ON documents(user_id) WHERE status = 'ready';

-- Connection pooling (PgBouncer config)
pool_mode = transaction  -- Transaction-level pooling
max_client_conn = 1000
default_pool_size = 20
```

---

## 13. Phase-by-Phase Development Roadmap

### PHASE 1 — Foundation (Weeks 1-4)
**Goal:** Working authentication, document upload, basic PDF viewing

Deliverables:
- [ ] Next.js project setup + Tailwind + Shadcn
- [ ] FastAPI project setup + PostgreSQL + migrations
- [ ] User registration + login (JWT)
- [ ] PDF upload endpoint + file storage
- [ ] PDF text extraction pipeline (PyMuPDF)
- [ ] Basic document library UI
- [ ] Docker Compose setup
- [ ] CI/CD pipeline (GitHub Actions)

**Demo milestone:** User can register, log in, upload a PDF, and see it in their library.

---

### PHASE 2 — AI Core (Weeks 5-8)
**Goal:** RAG pipeline working, chat with documents, semantic search

Deliverables:
- [ ] Text chunking pipeline
- [ ] OpenAI embedding integration
- [ ] ChromaDB vector storage
- [ ] Celery task queue for async processing
- [ ] WebSocket/SSE for processing status updates
- [ ] RAG chat interface (streaming responses)
- [ ] Semantic search across documents
- [ ] AI summarization pipeline
- [ ] Document status UI (processing → ready)

**Demo milestone:** Upload a paper, watch it process, chat with it, search across papers.

---

### PHASE 3 — Learning Features (Weeks 9-12)
**Goal:** Flashcards, quizzes, notes, citations

Deliverables:
- [ ] AI flashcard generation
- [ ] Flashcard viewer (3D flip animation, spaced repetition)
- [ ] AI quiz generation (MCQ)
- [ ] Quiz taking interface + scoring
- [ ] AI note generation (structured markdown)
- [ ] Citation extraction (APA, MLA, IEEE)
- [ ] Citation panel in chat interface
- [ ] Mobile-first responsive layouts

**Demo milestone:** Full learning workflow — read summary → chat → generate flashcards → take quiz.

---

### PHASE 4 — Polish & Performance (Weeks 13-16)
**Goal:** Production-ready UI, PWA, performance optimization

Deliverables:
- [ ] Motion design system (all animations)
- [ ] Dark/light theme
- [ ] PWA manifest + service worker
- [ ] Skeleton loaders everywhere
- [ ] Page transitions (Framer Motion)
- [ ] Scroll-based animations (landing page)
- [ ] Research recommendations engine
- [ ] Mobile bottom navigation
- [ ] Performance audit (Lighthouse ≥ 90)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Error boundaries + graceful degradation

**Demo milestone:** Visually stunning, mobile-ready platform ready for public launch.

---

### PHASE 5 — Scale & Ship (Weeks 17-20)
**Goal:** Production deployment, monitoring, user onboarding

Deliverables:
- [ ] Pinecone migration from ChromaDB
- [ ] Render production deployment
- [ ] Vercel production deployment
- [ ] Environment parity (staging → production)
- [ ] Database backups + disaster recovery
- [ ] API rate limiting
- [ ] Error monitoring (Sentry)
- [ ] Usage analytics (PostHog)
- [ ] Subscription tiers (free vs pro)
- [ ] Onboarding flow (first-time user experience)
- [ ] Landing page
- [ ] Documentation

**Demo milestone:** Live URL, real users, monitored production system.

---

## 14. Feature Roadmap (Beginner → Advanced)

### Tier 1 — Foundation Features (Build First)
These work independently and validate core infrastructure:
1. User authentication (register, login, JWT)
2. PDF upload + storage
3. Text extraction from PDF
4. Document library (list, view, delete)

### Tier 2 — AI Core (After Tier 1)
5. Text chunking + embedding pipeline
6. Vector storage (ChromaDB)
7. AI summarization (blocking, then async)
8. Basic semantic search

### Tier 3 — Interactivity (After Tier 2)
9. RAG chat (single document)
10. Streaming responses (SSE)
11. Citation extraction
12. AI-generated flashcards
13. AI-generated quizzes

### Tier 4 — Learning System (After Tier 3)
14. Flashcard spaced repetition (SM-2)
15. Quiz scoring + history
16. AI-generated structured notes
17. Multi-document search

### Tier 5 — Advanced Features (Post-MVP)
18. Research recommendations
19. Collaborative workspaces
20. Browser extension
21. Knowledge graph visualization
22. Export to Notion/Obsidian
23. Custom AI personas
24. Bulk paper import (arXiv API, Semantic Scholar)

---

## Appendix A — Key Decisions Log

| Decision | Option A | Option B | Chosen | Reason |
|---|---|---|---|---|
| Frontend | Next.js | Vite+React | Next.js | SSR, routing, Vercel integration |
| State | Redux | Zustand | Zustand | Less boilerplate, simpler for this scale |
| Backend | FastAPI | Django | FastAPI | Async-native, AI/ML ecosystem |
| Vector DB | ChromaDB | Pinecone | ChromaDB (dev), Pinecone (prod) | Zero setup for dev, scalable for prod |
| Embeddings | OpenAI | Local only | OpenAI + local fallback | Quality + cost balance |
| Auth | Auth0 | Custom JWT | Custom JWT | No vendor cost, full control |
| Task Queue | Celery | RQ | Celery | More mature, better retry logic |

---

*End of SPEC.md — ScholarMind AI Research Platform*
*Version 1.0 | Total estimated build time: 20 weeks (solo) / 10 weeks (2-person team)*
