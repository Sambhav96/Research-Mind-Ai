# ResearchMind AI 🧠

ResearchMind AI is an enterprise-grade, AI-powered platform designed to revolutionize how students, researchers, and professionals interact with complex documents. By leveraging Retrieval-Augmented Generation (RAG) and advanced large language models, the platform allows users to chat with their PDFs, automatically generate study materials (flashcards and quizzes), and track their learning analytics over time.

## 🌟 Key Features

### User Portal
- **Intelligent Document Parsing**: Upload PDFs and extract text and metadata seamlessly.
- **RAG-Powered Chat**: Ask questions about your documents and get accurate answers with inline citations pointing to the exact page of the source document.
- **Automated Study Tools**: Instantly generate interactive Flashcards and Quizzes directly from the contents of your research papers.
- **Study Analytics & Dashboards**: Track your reading streaks, quiz scores, and document engagement over time.
- **Workspaces & Organization**: Group related documents into isolated workspaces for cleaner context.
- **Rich User Settings**: Customize PDF viewer modes, AI response streaming, dark mode, and default behaviors.

### Admin Dashboard
- **System Monitoring**: View real-time AI API request logs, error rates, and system health.
- **User Management**: View user metrics, ban users, and manage subscriptions.
- **Content Moderation**: Global view of all uploaded documents, generated flashcards, and quizzes.
- **Financial Analytics**: Stripe billing integration, revenue tracking, and invoice management.

## 🛠️ Technology Stack

**Frontend**
- Next.js 16 (App Router)
- React 18
- Tailwind CSS & Framer Motion (Styling & Animations)
- Zustand (Global State Management)
- React Query (Server State & Caching)
- Radix UI & Shadcn/ui (Accessible Components)

**Backend**
- Python 3.12+
- FastAPI (High-performance async API)
- SQLAlchemy 2.0 & Asyncpg (ORM and Database Drivers)
- PostgreSQL (Primary Database with pgvector support)
- Alembic (Database Migrations)

**AI & Integrations**
- Google Gemini (Primary LLM for fast parsing and extraction)
- OpenRouter (Meta Llama-3 for conversational generation)
- Local embeddings for vector search
- Brevo (SMTP Email relay for OTPs)
- Stripe (Payment processing)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.12+)
- **PostgreSQL** database (Local or hosted like Supabase)
- API Keys for Gemini and OpenRouter

### 2. Backend Setup

Open a terminal in the root directory and navigate to the `backend` folder:

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
```
Edit the newly created `.env` file and insert your Database URL and API keys.

```bash
# Run Database Migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```
The backend will be running at `http://localhost:8000`.

### 3. Frontend Setup

Open a new terminal and navigate to the `frontend` folder:

```bash
cd frontend

# Install dependencies
npm install

# Environment Setup
# Create a .env.local file with your backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start the development server
npm run dev
```
The frontend will be running at `http://localhost:3000`.

---

## 📁 Repository Structure

```text
Research-Mind-Ai/
├── backend/
│   ├── alembic/          # Database migrations
│   ├── app/              # FastAPI application
│   │   ├── api/          # Route controllers
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── repositories/ # Database query abstractions
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── services/     # Core business logic and AI integrations
│   ├── scripts/          # Diagnostic and utility scripts
│   └── requirements.txt  # Python dependencies
└── frontend/
    ├── public/           # Static assets
    └── src/
        ├── app/          # Next.js App Router pages
        ├── components/   # Reusable UI components
        ├── hooks/        # Custom React hooks
        ├── lib/          # API clients and utility functions
        ├── stores/       # Zustand state stores
        └── types/        # TypeScript type definitions
```

## 🔒 Security
- Passwords are securely hashed using bcrypt.
- Session management is handled via secure HTTP-only JWTs.
- Sensitive environment variables are kept strictly out of version control via `.gitignore`.
