<!-- GSD:project-start source:PROJECT.md -->

## Project

**NexusAI — Full Stack AI SaaS Platform**

NexusAI is a production-grade, multi-tool AI SaaS platform that gives paying users access to 6 specialized AI features — Content Generator, Chatbot, Code Reviewer, Note Summarizer, Image Generator, and Resume Analyzer — powered by the Gemini API. It targets developers, content creators, and knowledge workers who want AI superpowers without juggling multiple subscriptions. Revenue is driven by a Free-tier-with-limits + Pro subscription model (monthly/yearly) with both Stripe (international) and Razorpay (India/INR) payment integration.

**Core Value:** Users can access every AI tool in one clean dashboard, pay once, and stop hitting walls from per-tool free tiers.

### Constraints

- **Tech Stack**: Next.js 14 + TypeScript + Tailwind CSS + Shadcn UI (frontend); Node.js + Express.js + TypeScript + Prisma (backend)
- **AI Provider**: Gemini API only — single provider reduces cost and complexity in v1
- **Auth**: NextAuth.js only — no custom JWT from scratch on frontend (backend still issues tokens for API calls)
- **Database**: PostgreSQL + Prisma — no MongoDB; relational structure needed for subscriptions, billing, team membership
- **Payments**: Both Stripe + Razorpay required — product targets India + international market
- **Deployment**: Vercel + Railway — simplest path to production without DevOps overhead
- **Language**: English only — i18n complexity deferred

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack (2025 Production Best Practices)

### Frontend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js | 14.x (App Router) | SSR, Server Components, built-in streaming, Vercel native |
| Language | TypeScript | 5.x | Type safety across codebase, better DX, fewer runtime errors |
| Styling | Tailwind CSS | 3.x | Rapid UI, utility-first, pairs perfectly with Shadcn |
| Component Library | Shadcn UI | latest | Accessible, unstyled components built on Radix UI |
| Animations | Framer Motion | 11.x | Production-quality micro-animations, scroll effects |
| HTTP Client | Axios + TanStack Query | latest | Caching, deduplication, background refetching |
| State | Zustand | 4.x | Minimal, scalable global state |
| AI Streaming | Vercel AI SDK (`@ai-sdk/google`) | latest | Industry standard for streaming Gemini responses via SSE |
| Markdown | react-markdown + react-syntax-highlighter | latest | Render AI output with code blocks |
| Charts | Recharts | 2.x | Lightweight charts for dashboard/admin analytics |

### Backend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Stable, widely supported |
| Framework | Express.js | 4.x | Lightweight, battle-tested, full control |
| Language | TypeScript | 5.x | Shared types with frontend |
| ORM | Prisma | 5.x | Type-safe queries, great migration tooling |
| Database | PostgreSQL | 15.x | Relational data for billing/subscriptions; pgvector for RAG |
| Caching | Redis (Upstash/Railway) | 7.x | AI response caching, session store |
| Auth | NextAuth.js v5 (frontend) + JWT (backend API) | v5 | Best Next.js ecosystem fit; handles Google OAuth |
| AI | Google Gemini API (`@google/generative-ai`) | latest | gemini-1.5-pro for text; gemini-1.5-flash for speed |
| Payments | Stripe + Razorpay | latest | International + India/INR markets |
| File Storage | Cloudinary | latest | PDF and image storage for AI analysis |
| Email | Resend or Nodemailer | latest | Email verification, password reset |
| Logging | Winston | latest | Structured logs for production |
| Security | Helmet + cors + express-rate-limit | latest | Standard Express hardening |
| Validation | Zod | 3.x | Runtime type validation shared with frontend |

### Infrastructure & Deployment

| Service | Choice | Rationale |
|---------|--------|-----------|
| Frontend | Vercel | Zero-config Next.js deployment, edge network |
| Backend | Railway | Simple Docker-based deployment, managed PostgreSQL + Redis |
| Database | Railway PostgreSQL | Managed, auto-backups, pgvector extension available |
| Redis | Railway Redis or Upstash | Sub-millisecond caching; Upstash for serverless-friendly |
| File storage | Cloudinary | Free tier generous; image transformations built-in |
| CI/CD | GitHub Actions | Free for public repos, integrates with Vercel/Railway |

## Key Library Versions (Verified 2025)

## What NOT to Use (Anti-patterns)

| Tool | Why to Avoid |
|------|-------------|
| Drizzle ORM | Less mature ecosystem vs Prisma; fewer migration tools |
| MongoDB | Relational billing/subscription data is harder in document DB |
| Pinecone | Extra infra cost; pgvector in PostgreSQL is sufficient for v1 |
| BullMQ | Adds Redis queue complexity; defer to v2 |
| OpenAI | Redundant alongside Gemini; higher cost per token |
| Custom JWT from scratch | NextAuth.js handles this better with less attack surface |

## Confidence Levels

| Decision | Confidence | Notes |
|----------|-----------|-------|
| Next.js 14 App Router | ✅ High | Industry standard for 2025 SaaS |
| Express backend | ✅ High | Familiar, easy Railway deploy |
| PostgreSQL + Prisma | ✅ High | Best for relational SaaS data |
| Gemini API | ✅ High | Generous free tier, strong models |
| Stripe + Razorpay | ✅ High | Required for India + international |
| Redis caching | ✅ High | Critical for AI cost control |
| pgvector for RAG | ⚠️ Medium | Good for v1 but may need Pinecone at scale |
| Multi-tenant v1 | ⚠️ Medium | Adds complexity; validate need early |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
