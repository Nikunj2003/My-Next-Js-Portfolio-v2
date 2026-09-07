<div align="center">

# Nikunj Khitha — Applied AI Engineer Portfolio

A production Next.js portfolio built around real proof, not slideware: 13 in-depth engineering case
studies, an AI Twin that answers questions by calling real tools over the site's own data, and a
data-driven content model that keeps the résumé, LinkedIn, case studies, and the AI Twin's answers
from drifting apart.

<!-- ![Homepage Screenshot](public/static/home.png) -->

</div>

---

## Feature Highlights

### 1. Case studies, not project cards
13 case studies under `/work` and `/work/[slug]`, each with a problem statement, the constraints it
ran under, decisions with their **rejected alternatives**, measured results, and an explicit
statement of what was individually owned versus shared. Grouped by theme with a "what should I read
for X" box that answers through the same AI Twin backend. Source of truth: `src/data/case-studies.ts`.

### 2. AI Twin — a tool-calling agent, not a chat widget
`src/components/AITwinChat.tsx` and `src/app/api/chat/route.ts` implement a real agent loop against
an OpenAI-compatible LLM (NVIDIA NIM by default):
- **Real tools** (`src/lib/ai-tools.ts`): `search_work`, `get_case_study`, `get_metric`,
  `compare_systems`, `navigate_to` — all pure, in-process lookups over the site's own data, so the
  agent cites the same facts the pages show.
- **Streams from round zero**, including tool-selection rounds, with retry-on-stall against
  first-token latency rather than total generation time — tuned against measured provider latency,
  not guessed at.
- **Every tool call is shown**, not narrated: the trace (tool name, arguments, duration, refusal) is
  part of the response UI.
- **`get_metric` refuses to invent numbers.** If a figure isn't in the portfolio's source of truth,
  the agent says so instead of estimating — the whole site's pitch is measurement, so a fabricated
  number would undercut it.
- **Inline answers** expand under experience bullets in place; every other "Ask about this"
  affordance opens the AI Twin panel, since an answer of unpredictable length inside a narrow card
  breaks the layout around it.

### 3. One content model, many surfaces
`src/data/portfolio.ts` and `src/data/case-studies.ts` are the source of truth for experience,
projects, skills, stats, and case-study depth. The homepage, `/work`, the AI Twin's tool responses,
and the JSON-LD SEO graph all derive from the same data — a number or a claim only has to be correct
in one place. Experience bullets can carry an optional case-study slug (compile-time checked against
the real slug list), surfacing a "Read case study" link and an inline follow-up right where the claim
is made.

### 4. Consistent glassmorphism, tiered on purpose
Blur and fill are tiered by surface role — in-page cards/panels, floating chrome, and modal overlays
each get a distinct blur radius and fill opacity (`src/app/globals.css`) — rather than one blur value
reused everywhere and drifting inconsistent by accident. Scroll-reveal animations slide rather than
fade, since fading a translucent glass panel in from `opacity: 0` makes it read as flat for the
length of the animation.

### 5. Smooth scroll that behaves like the browser
Lenis-backed smooth scrolling (`src/components/SmoothScroll.tsx`) that still respects native scroll
restoration on refresh, resets correctly on client-side navigation, and — critically — only locks
page scroll behind an overlay that is actually modal. The AI Twin's mobile layout is a full-screen
modal and locks the page; its desktop layout is a non-modal corner panel and does not.

### 6. Cross-device animation and interaction polish
- 3D card tilt on hover (`src/components/Card3D.tsx`)
- A custom fluid-cursor canvas effect (`src/hooks/useFluidCursor.tsx`)
- Scroll-triggered reveals via Framer Motion, honoring `prefers-reduced-motion`
- A live contact form backed by a real API route with Zod validation and Resend delivery

---

## Technology Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — utility-first styling, tiered glass tokens
- **Framer Motion** — declarative, reduced-motion-aware animation
- **Radix UI / shadcn-style primitives** (`src/components/ui/`)
- **Zod** — request validation for the chat and contact API routes
- **Resend** — contact form delivery
- **NVIDIA NIM (OpenAI-compatible)** — the AI Twin's LLM provider

---

## Environment Variables

Create a `.env.local`:

```bash
# LLM / AI Twin — used in src/app/api/chat/route.ts
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://integrate.api.nvidia.com/v1/chat/completions
AI_MODEL=openai/gpt-oss-20b

# Contact form (Resend)
RESEND_API_KEY=re_your_resend_api_key
CONTACT_EMAIL_FROM="Nikunj Portfolio <contact@yourdomain.com>"
CONTACT_EMAIL_TO=you@example.com
```

Notes:
- `CONTACT_EMAIL_TO` accepts a comma-separated list to deliver to multiple inboxes.
- To send from a custom address, verify that domain in Resend and add the SPF/DKIM records it
  provides.
- `AI_MODEL` must support OpenAI-style `tools`/function calling — the AI Twin depends on it for
  every one of its five tools.
- Never commit real credentials; set them in your hosting provider's dashboard for production.

---

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Testing & Linting

```bash
npm run lint        # ESLint
npm test             # node:test, TypeScript-native (no build step, no Jest)
npm run build        # Production build
```

Tests run via Node's built-in test runner against the TypeScript source directly (see
`tests/alias-hook-register.mjs` for the `@/` path-alias resolver), covering the case-study data
model, the AI Twin's tools and streaming route, contact/rate-limit logic, and UI consistency rules
for the "Ask about this" affordance and the glass design tokens.

---

## Codex Job Hunt Toolkit

This repo also includes Codex skills and subagents for resume and job-search workflows, unrelated to
the site itself:

- `$portfolio-resume-refresh with subagents` refreshes the base one-page ATS LaTeX résumé from the
  latest portfolio facts.
- `$jd-tailored-resume with subagents` rewrites the résumé for a specific job description using
  portfolio facts, JD keywords, company research, and ATS best practices.
- `$resume-scorecard with subagents` scores the résumé against a JD without editing.
- `$application-packet with subagents` produces cover letters, recruiter messages, LinkedIn notes,
  referral asks, and follow-ups.
- `$interview-story-bank with subagents` builds STAR interview stories from verified résumé and
  portfolio facts.
- `$portfolio-fact-gap-audit with subagents` finds missing metrics, links, dates, and evidence that
  would strengthen an application.

Detailed instructions live in `.codex/job-hunt/INSTRUCTIONS.md`.

---

## Project Structure (excerpt)

```
src/
  app/                    # App Router: layout, homepage, /work, /work/[slug], API routes
    api/chat/             # AI Twin backend: streaming, tool loop, retry
    work/                 # Case-study index and detail pages
  components/
    ai/                   # AnswerBody, InlineAnswer, useAssistantAnswer — the shared answer UI
    ui/                   # Radix/shadcn-style primitives
    AITwinChat.tsx         # The AI Twin panel
    AskAboutThis.tsx       # The single "ask about this" affordance used everywhere
  data/
    portfolio.ts           # Experience, projects, skills, stats — the content source of truth
    case-studies.ts        # All 13 case studies
  lib/
    ai-tools.ts             # The AI Twin's real tools (search_work, get_case_study, ...)
    ai-config.ts            # System prompt, model selection, guardrails
    chat-contract.ts        # Shared client/server streaming contract and timeout tuning
tests/                     # node:test suites (data model, AI tools, chat route, UI rules)
```

---

## License

See `LICENSE`.

---

<div align="center">Built with Next.js, TypeScript, and a real tool-calling agent.</div>
