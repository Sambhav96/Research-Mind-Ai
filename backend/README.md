# ScholarMind AI Backend (Module 1)

Production-grade FastAPI foundation following Clean Architecture with a minimal, runnable baseline.

## Features

- FastAPI application factory
- Pydantic v2 settings with environment loading
- Structured JSON logging
- Global exception handlers
- Middleware registration (CORS + request ID)
- Health check endpoint
- Async SQLAlchemy 2.0 session factory (PostgreSQL + pgvector ready)
- Alembic migrations setup (async engine)
- Docker + Docker Compose configuration

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── health.py
│   ├── core/
│   │   ├── config.py
│   │   ├── env.py
│   │   ├── exception_handlers.py
│   │   ├── logging.py
│   │   └── middleware.py
│   ├── db/
│   │   └── session.py
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── tasks/
│   └── utils/
├── tests/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Setup

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Run the app:

```bash
uvicorn app.main:app --reload
```

4. Health check:

```bash
curl http://localhost:8000/health
```

## Docker

```bash
docker compose up --build
```

## Alembic migrations

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```
