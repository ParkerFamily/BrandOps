# BrandOps

AI-powered UGC campaign operations platform — manage creators, launch campaigns, review submissions, and automate payouts from one dark SaaS dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path `/api`)
- `pnpm --filter @workspace/brandops run dev` — run the frontend (port via `$PORT`, path `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 on port 8080, path prefix `/api`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, wouter routing, shadcn/ui, TailwindCSS, recharts, framer-motion
- Auth: Firebase Auth
- AI: OpenAI (`gpt-5.4`, `max_completion_tokens: 8192`, no `temperature`)

## Where things live

- `artifacts/brandops/src/` — React frontend
  - `pages/Landing.tsx` — public SaaS landing page
  - `pages/Onboarding.tsx` — 6-step personalization wizard
  - `pages/AIAssistant.tsx` — context-aware AI chat (injects live campaign/creator data)
  - `pages/Analytics.tsx` — AI insights + charts
  - `pages/Creators.tsx` — creator discovery with AI match scores
  - `components/Layout.tsx` — app shell with upgraded sidebar
  - `App.tsx` — SmartRoot routing (Landing → Onboarding → Dashboard)
- `artifacts/api-server/src/routes/openai/index.ts` — OpenAI chat + insights routes
- `lib/api-client-react/src/generated/` — Orval-generated hooks and Zod schemas
- `lib/db/src/schema.ts` — source of truth for DB schema

## Architecture decisions

- OpenAI messages endpoint accepts optional `context` field injected into system prompt for real-time data-aware AI responses.
- Onboarding state tracked in `localStorage` key `brandops_onboarded`; `SmartRoot` in `App.tsx` routes unauthenticated users to Landing, new users to Onboarding, returning users directly to Dashboard.
- AI match scores on creators are computed client-side from `engagementRate` + `followerCount` (no extra API call).
- Streaming SSE for AI chat responses (`text/event-stream` with `data: {content}` / `data: {done: true}` frames).

## Product

- **Landing page**: full SaaS marketing page with hero, pricing tiers, testimonials, FAQ
- **Onboarding wizard**: 6-step personalization (role, budget, platform, niche, experience)
- **Dashboard**: KPI stats, activity feed, quick actions
- **Campaigns**: create/manage UGC campaigns with briefs and budgets
- **Creators**: discovery with AI match %, platform filters, engagement badges
- **Submissions**: review and approve/reject creator content
- **Analytics**: AI-generated insights panel + recharts visualizations
- **AI Assistant**: context-aware copilot with live campaign/creator data injection
- **Payouts**: automated payment processing

## User preferences

- Theme: lime green `#C6FF00` accent on dark charcoal background
- Motion: framer-motion animations throughout (fadeUp, stagger variants)
- Premium SaaS aesthetic — no rounded-pill everything, tight spacing, high information density

## Gotchas

- OpenAI model is `gpt-5.4` — do not change to other model names
- No `temperature` param on OpenAI calls (not supported by this model)
- `ease` values in framer-motion variants must be typed with `: Variants` import to avoid TS2322
- Use `import { type Creator } from "@workspace/api-client-react"` for Creator type in Creators page
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- Do not run `pnpm dev` at workspace root — use workflow restart instead

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
