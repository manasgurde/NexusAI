# Phase 1: Foundation — Project Setup, DB Schema & Auth Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 01-foundation-project-setup-db-schema-auth-core
**Areas discussed:** Monorepo layout, JWT strategy, Prisma schema design, Auth pages UX

---

## Monorepo Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single repo, apps/ folders | `apps/frontend` + `apps/backend` + `packages/shared` with npm workspaces | ✓ |
| Two separate repos | `nexusai-frontend` + `nexusai-backend` — independent CI/CD | |
| Single repo, flat structure | `frontend/` + `backend/` at root — simpler than proper monorepo | |

**User's choice:** Single repo with `apps/frontend`, `apps/backend`, `packages/shared` using npm workspaces

| Shared Package | Description | Selected |
|----------------|-------------|----------|
| Yes — `packages/shared` | Shared TypeScript types (User, Subscription, AITool) and Zod schemas | ✓ |
| No — keep separate | Duplication acceptable to keep apps independent | |

| Workspace Manager | Description | Selected |
|------------------|-------------|----------|
| npm workspaces | Built-in, no extra tooling | ✓ |
| Turborepo | Fast task caching, parallel builds, industry standard | |
| pnpm workspaces | Most efficient disk space, needs pnpm | |

**Notes:** User prioritized simplicity and built-in tooling over monorepo optimization features.

---

## JWT Strategy

| Access/Refresh Lifetime | Description | Selected |
|------------------------|-------------|----------|
| 15min + 7 days | Short-lived access + long-lived refresh — industry standard | ✓ |
| 1 hour + 30 days | Fewer refresh cycles, slightly more exposure | |
| 24 hours only | No refresh token — simpler but least secure | |

| Token Storage | Description | Selected |
|--------------|-------------|----------|
| httpOnly cookies (both) | XSS-proof, browser sends automatically, requires CSRF protection | ✓ |
| Cookie (refresh) + Bearer header (access) | Common hybrid; access token in memory | |
| Bearer header only | Access token in memory, refresh in localStorage | |

| Rotation Strategy | Description | Selected |
|------------------|-------------|----------|
| Rotate on every refresh | Most secure — detects token theft | |
| Rotate on suspicious activity | Concurrent use detection; simpler | ✓ |
| No rotation | Simplest but least secure | |

| Refresh Token Storage | Description | Selected |
|----------------------|-------------|----------|
| PostgreSQL RefreshToken table | Server-side revocation, multi-device logout support | ✓ |
| Redis TTL | Faster lookups, auto-cleanup | |
| Stateless JWT only | No server storage; revocation not possible | |

**Notes:** User chose pragmatic balance — httpOnly cookies for security, rotation only on suspicious activity for simplicity, PostgreSQL storage for revocation capability.

---

## Prisma Schema Design

| Soft Delete Strategy | Description | Selected |
|---------------------|-------------|----------|
| Soft deletes: Users, Orgs, AIHistory, Files | `deletedAt DateTime?` on key tables — billing audit compliance | ✓ |
| Hard deletes everywhere | GDPR simplicity — actually remove data | |
| Hybrid | Soft on sensitive + hard on ephemeral | |

| Multi-Tenancy Model | Description | Selected |
|--------------------|-------------|----------|
| User belongs to one Org | Simple FK `organizationId` on User | |
| User belongs to multiple Orgs | `OrganizationMember` junction table — flexible | ✓ |
| Org is optional | Personal accounts work without org | |

**Notes:** User chose multi-org membership for maximum flexibility, even though v1 teams feature is simpler. This avoids a painful migration later.

| Role Model | Description | Selected |
|-----------|-------------|----------|
| Single enum on User | `USER \| ADMIN` — simple, platform-level | |
| Two-level roles | Platform role on User + org role on OrganizationMember | ✓ |
| Full role enum | All variants in one enum — `USER \| ORG_OWNER \| ORG_ADMIN \| ORG_MEMBER \| PLATFORM_ADMIN` | |

**Notes:** Two-level role system cleanly separates platform admin (who can access admin panel) from org management (who can invite members). Chosen for clarity and maintainability.

---

## Auth Pages UX

| Page Layout | Description | Selected |
|------------|-------------|----------|
| Combined `/auth` with tabs | Sign In / Sign Up tabs, Google button prominent at top | ✓ |
| Separate `/login` + `/signup` pages | Cleaner URLs, easier to link to directly | |
| Modal-based auth | Login/signup as overlay over landing page | |

| Post-Login Redirect | Description | Selected |
|--------------------|-------------|----------|
| Always `/dashboard` | Simple and predictable | |
| Previous page / callbackUrl | NextAuth.js built-in `callbackUrl` — lands where intended | ✓ |
| Onboarding page for new users | `/welcome` first, then dashboard | |

**Notes:** `callbackUrl` is NextAuth.js built-in behavior. Best UX for users who bookmark deep links or get redirected mid-flow.

| Visual Design | Description | Selected |
|--------------|-------------|----------|
| Split-screen | Brand illustration left, auth form right | |
| Centered card on gradient | Clean, focused, minimalist | |
| Full-screen gradient + glassmorphism card | Premium, futuristic, blur effect — matches AI SaaS aesthetic | ✓ |

**Notes:** User explicitly chose the premium glassmorphism aesthetic to match the overall AI SaaS product feel.

---

## The Agent's Discretion

- Password field show/hide toggle implementation
- Form validation error positioning (inline below fields)
- Specific gradient colors and animation for auth background (to be aligned with brand palette in Phase 7)
- Database indexes beyond obvious PKs/FKs
- Email template design for password reset

## Deferred Ideas

- Dark/light mode toggle on auth page — deferred to Phase 2 (dashboard theme system)
- "Remember me" checkbox — deferred to Settings page
- Magic link / passwordless login — deferred to v2
- Social login beyond Google (GitHub, LinkedIn) — deferred to v2
