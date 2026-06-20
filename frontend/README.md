# ResearchMind AI

A production-grade frontend for an AI-powered research operating system — built with Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, and Zustand.

## Features

- Cinematic landing page with AI orb, particles, and gradient mesh
- Full dashboard with animated metrics, charts, and quick actions
- AI chat with markdown, citations, and streaming demo
- PDF reader with split-screen AI sidebar
- Semantic search with AI suggestions
- Flashcards, quizzes, analytics, workspaces, notes
- Command palette (⌘K), search overlay (⌘⇧K), AI copilot (⌘J)
- Dark/light theme, reduced motion, PWA manifest
- Mobile bottom navigation

## Getting Started

```bash
cd researchmind-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/           # App Router (marketing, auth, app, onboarding)
├── components/    # UI, layout, landing, chat, dashboard, effects, motion
├── hooks/         # Custom hooks
├── lib/           # Utils, motion tokens, API client, mock data
├── providers/     # Theme, Query, Lenis, Motion
├── stores/        # Zustand state
└── types/         # TypeScript types
```

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Zustand + TanStack Query
- React Hook Form + Zod
- Radix UI primitives
- Lenis smooth scroll
- cmdk command palette

## Connect Backend

Set `NEXT_PUBLIC_API_URL` and replace mock data in `src/lib/api/mock-data.ts` with real API calls via `src/lib/api/client.ts`.
