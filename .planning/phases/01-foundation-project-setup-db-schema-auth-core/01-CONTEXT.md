# Phase 1: Foundation — Project Setup, DB Schema & Auth Core - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the complete project skeleton and identity layer. Specifically:
- Monorepo initialized with npm workspaces (`apps/frontend`, `apps/backend`, `packages/shared`)
- PostgreSQL database schema designed and migrated via Prisma — all models for the entire product
- Express.js backend skeleton running with all middleware (Helmet, CORS, rate-limit, Morgan, Zod)
- Next.js 14 App Router frontend skeleton running with Tailwind + Shadcn configured
- NextAuth.js v5 configured (Google OAuth + credentials provider)
- JWT + refresh token auth system on backend
- Auth pages UI (`/auth` with tabs) — glassmorphism design, working forms
- Email service (Resend) for password reset flows

**NOT in this phase:** Dashboard, AI tools, payments, admin panel, landing page — only auth and skeleton.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- **D-01:** Single git repository with npm workspaces. Structure: `apps/frontend` (Next.js 14), `apps/backend` (Express.js), `packages/shared` (shared types + Zod schemas)
- **D-02:** `packages/shared` contains shared TypeScript types (User, Subscription, AITool enums, API response shapes) and Zod validation schemas used by both frontend (form validation) and backend (request validation)
- **D-03:** Tooling: npm workspaces (not Turborepo or pnpm) — built-in, no extra setup

### JWT & Auth Token Strategy
- **D-04:** Access token lifetime: **15 minutes**; Refresh token lifetime: **7 days**
- **D-05:** Storage: **both tokens in httpOnly cookies** — XSS-proof, browser sends automatically; backend must set `SameSite=Strict` or `SameSite=Lax` + CSRF header check
- **D-06:** Refresh token rotation: **rotate only on suspicious activity** (concurrent use detection); same refresh token valid until expiry under normal use — simpler implementation
- **D-07:** Refresh tokens persisted in **PostgreSQL** `RefreshToken` table with fields: `id`, `userId`, `tokenHash` (SHA-256 of raw token), `expiresAt`, `deviceInfo` (user-agent), `createdAt`, `revokedAt?` — enables server-side revocation and multi-device logout

### Prisma Schema Design
- **D-08:** Soft deletes on: `User`, `Organization`, `AIHistory`, `UploadedFile` — using `deletedAt DateTime?` field. Prisma middleware adds automatic `where: { deletedAt: null }` filter on all queries. Required for billing audit compliance.
- **D-09:** Hard deletes on: `Notification`, `AdminLog`, `RefreshToken` (after rotation/expiry) — ephemeral data, no audit need
- **D-10:** Multi-tenancy model: **Users can belong to multiple Organizations** via `OrganizationMember` junction table. Fields: `userId`, `organizationId`, `role (OWNER | MEMBER)`, `joinedAt`, `invitedBy`
- **D-11:** Two-level role system:
  - Platform level: `role` enum on `User` model → `USER | ADMIN`
  - Org level: `role` enum on `OrganizationMember` → `OWNER | MEMBER`
  - Platform ADMIN has access to admin panel; Org OWNER can manage org settings/invites
- **D-12:** `organizationId` (optional FK) on `Subscription`, `AIHistory`, `TokenUsage`, `UploadedFile` — for org-scoped queries. Nullable because personal-account users have no org.

### Auth Pages UX
- **D-13:** Single `/auth` route with two tabs: **Sign In** and **Sign Up** — avoids duplicate layout, Google OAuth button at top of both tabs above a visual divider ("or continue with email")
- **D-14:** Post-login redirect: **use `callbackUrl` query param** (NextAuth.js built-in) — users attempting a protected route get redirected to `/auth?callbackUrl=/dashboard/chatbot` and land at the intended destination after login
- **D-15:** Visual design: **full-screen animated gradient background + centered glassmorphism card** (backdrop-blur, semi-transparent, rounded corners, subtle border) — premium, AI SaaS aesthetic consistent with overall dark-mode UI

### Agent's Discretion
- Password field show/hide toggle implementation (any standard approach)
- Form validation error positioning (inline below fields is standard)
- Exact gradient colors and animation speed for auth background (match overall brand palette when established in Phase 7)
- Specific indexes on Prisma models beyond obvious ones (agent to determine based on query patterns)
- Email template design for password reset (functional over beautiful at this stage)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Definition
- `.planning/PROJECT.md` — Project goals, constraints, key decisions (Gemini-only, PostgreSQL, NextAuth.js, multi-tenant from start)
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: AUTH-01 to AUTH-05, PUB-03

### Phase 1 Roadmap
- `.planning/ROADMAP.md` §Phase 1 — 4 plans: DB Schema+Prisma, Express Skeleton, Next.js Skeleton, Auth Flow

### Research
- `.planning/research/STACK.md` — Exact library versions and stack rationale
- `.planning/research/PITFALLS.md` — Pitfall #4 (NextAuth v5 edge cases: NEXTAUTH_URL, NEXTAUTH_SECRET, PostgreSQL session adapter), Pitfall #7 (multi-tenant data leakage prevention)
- `.planning/research/ARCHITECTURE.md` — System architecture diagram, data flow, auth split pattern

### External Documentation
- No external specs or ADRs referenced — decisions fully captured above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project; no existing code to reuse

### Established Patterns
- GSD workflow: all plans within a phase should be independently committable
- Multi-tenant pattern: `organizationId` nullable FK on all entity tables (decided above)
- Auth split: NextAuth.js owns frontend session + OAuth; backend Express owns JWT for API calls

### Integration Points
- `packages/shared` types must be importable from both `apps/frontend` and `apps/backend` via npm workspace paths (e.g., `import { UserRole } from '@nexusai/shared'`)
- NextAuth.js session must include: `user.id`, `user.role`, `user.organizationIds` — custom session callback required in `auth.ts`
- Express auth middleware reads JWT from `Authorization` header OR `httpOnly cookie` — must handle both patterns since Next.js API routes will use cookies but direct API testing uses headers

</code_context>

<specifics>
## Specific Ideas

- Auth page visual: full-screen dark gradient (deep purple/indigo tones) with animated subtle particle or neural-net background, centered glassmorphism card with NexusAI logo at top
- Google OAuth button: white button with Google logo (standard design), above "─── or continue with email ───" divider
- Password field: standard eye-icon toggle (show/hide), built into Shadcn Input or custom wrapper
- Error handling: inline field-level errors (e.g., "Email already in use") + toast for network-level errors
- Loading state: button shows spinner + "Signing in..." text while auth is processing

</specifics>

<deferred>
## Deferred Ideas

- Dark/light mode toggle on auth page — design-level decision deferred to Phase 2 (dashboard theme)
- Remember me checkbox (extend refresh token to 30 days) — deferred to settings page
- Magic link / passwordless login — mentioned in research as growing trend, deferred to v2
- Social login beyond Google (GitHub, LinkedIn) — deferred to v2

</deferred>

---

*Phase: 1-Foundation — Project Setup, DB Schema & Auth Core*
*Context gathered: 2026-06-03*
