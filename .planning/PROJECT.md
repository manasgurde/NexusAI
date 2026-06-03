# NexusAI — Full Stack AI SaaS Platform

## What This Is

NexusAI is a production-grade, multi-tool AI SaaS platform that gives paying users access to 6 specialized AI features — Content Generator, Chatbot, Code Reviewer, Note Summarizer, Image Generator, and Resume Analyzer — powered by the Gemini API. It targets developers, content creators, and knowledge workers who want AI superpowers without juggling multiple subscriptions. Revenue is driven by a Free-tier-with-limits + Pro subscription model (monthly/yearly) with both Stripe (international) and Razorpay (India/INR) payment integration.

## Core Value

Users can access every AI tool in one clean dashboard, pay once, and stop hitting walls from per-tool free tiers.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Frontend**
- [ ] Landing page: hero, features, pricing, testimonials, FAQ, footer, navbar
- [ ] Auth pages: signup / login via NextAuth.js (Google OAuth + email/password)
- [ ] Dashboard: sidebar nav, subscription status, API usage stats, AI tools list, recent history
- [ ] AI Tool Interface: reusable prompt input, streaming response, markdown rendering, code highlighting, copy/download, history
- [ ] Pricing page: Free / Pro / Enterprise plans, monthly/yearly toggle, Stripe + Razorpay checkout UI
- [ ] Settings page: profile edit, password change, API key management, billing settings, theme toggle
- [ ] Admin panel: user management, revenue analytics, AI usage stats, subscription management, charts

**Backend**
- [ ] Auth system: signup/login/logout, JWT + refresh tokens, Google OAuth, email verification, password reset, role-based access (user / admin)
- [ ] User management: profiles, subscription status, account settings, delete account
- [ ] AI service layer: 6 AI feature modules (content gen, chatbot, code review, summarizer, image gen, resume analyzer) — all via Gemini API
- [ ] Streaming AI responses via Server-Sent Events
- [ ] Usage tracking: daily request counts, token usage, per-plan limits, free-tier enforcement
- [ ] Payment system: Stripe + Razorpay subscriptions, webhooks, billing history, plan upgrade/downgrade, cancellation
- [ ] Admin routes: get all users, ban users, platform analytics, revenue stats
- [ ] File upload: PDF and image uploads via Multer + Cloudinary (for Resume Analyzer + Image Gen input)
- [ ] Redis caching for AI responses (avoid duplicate API calls)
- [ ] Security: Helmet, CORS, rate limiting, input validation, XSS/injection protection, HTTP-only cookies

**Database**
- [ ] PostgreSQL + Prisma ORM
- [ ] Schemas: Users, Sessions, Subscriptions, Payments, AIRequestHistory, TokenUsage, UploadedFiles, Notifications, AdminLogs
- [ ] Proper indexing, soft deletes, timestamps, analytics-ready schema

**Advanced (v1 scope)**
- [ ] Redis response caching
- [ ] pgvector (RAG system for AI Note Summarizer — contextual PDF Q&A)
- [ ] Multi-tenant / team support (organization model, invite members, shared usage limits)

**Deployment**
- [ ] Frontend on Vercel
- [ ] Backend on Railway
- [ ] PostgreSQL on Railway (managed)
- [ ] Redis on Railway / Upstash
- [ ] CI/CD via GitHub Actions
- [ ] Docker setup for backend
- [ ] Environment variable management

### Out of Scope

- BullMQ / background job queues — deferred to v2; adds infrastructure complexity not needed at launch
- WebSockets / real-time notifications — deferred to v2; SSE handles streaming needs for now
- Pinecone/Weaviate vector DB — using pgvector (built into PostgreSQL) instead for v1 simplicity
- OpenAI API — using Gemini only to reduce API surface and cost in v1
- Mobile app — web-only for now
- Multi-language / i18n — English only in v1
- Enterprise custom pricing — tiered plans only for now; custom sales pipeline is post-launch
- Pay-per-use credits — subscription model is cleaner for launch; credits deferred to v2

## Context

- **Architecture**: Separate repos — Next.js 14 (App Router) frontend deployed on Vercel, Express.js + TypeScript backend on Railway
- **AI**: All 6 AI features use Google Gemini API (gemini-1.5-pro for text/code/analysis, gemini-imagen or gemini-1.5-pro-vision for image tasks)
- **Auth**: NextAuth.js v5 on frontend; JWT + refresh tokens on backend; Google OAuth + email/password
- **Payments**: Stripe for international (USD), Razorpay for India (INR); both subscription-based
- **Database**: PostgreSQL on Railway with Prisma ORM; pgvector extension for RAG capability
- **Caching**: Redis (Railway/Upstash) for AI response caching to cut API costs
- **File storage**: Cloudinary for uploaded files (resumes, images)
- **Teams**: Multi-tenant from the start — Organization model with owner + member roles, shared subscription
- **Target users**: Developers, content creators, students, freelancers — initially India + global market

## Constraints

- **Tech Stack**: Next.js 14 + TypeScript + Tailwind CSS + Shadcn UI (frontend); Node.js + Express.js + TypeScript + Prisma (backend)
- **AI Provider**: Gemini API only — single provider reduces cost and complexity in v1
- **Auth**: NextAuth.js only — no custom JWT from scratch on frontend (backend still issues tokens for API calls)
- **Database**: PostgreSQL + Prisma — no MongoDB; relational structure needed for subscriptions, billing, team membership
- **Payments**: Both Stripe + Razorpay required — product targets India + international market
- **Deployment**: Vercel + Railway — simplest path to production without DevOps overhead
- **Language**: English only — i18n complexity deferred

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini API only (not OpenAI) | More generous free tier; lower cost at launch; easier billing | — Pending |
| PostgreSQL over MongoDB | Subscription/payment data is highly relational; Prisma gives type safety | — Pending |
| NextAuth.js for frontend auth | Best Next.js ecosystem fit; handles Google OAuth + session management cleanly | — Pending |
| pgvector for RAG (not Pinecone) | Built into PostgreSQL; zero additional infrastructure; good enough for v1 | — Pending |
| Separate frontend/backend repos | Clear boundary between Next.js and Express; backend can scale independently | — Pending |
| Stripe + Razorpay both | India-first market + international ambition; worth the integration complexity | — Pending |
| Redis caching for AI responses | Cut Gemini API costs by caching identical prompts; critical for free-tier users | — Pending |
| Multi-tenant from the start | Harder to retrofit later; team feature is a strong monetization angle for Pro | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-03 after initialization*
