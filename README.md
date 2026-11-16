<div align="center">

# Nikunj Khitha — Applied AI Engineer Portfolio

A production Next.js portfolio built around real proof, not slideware: 13 in-depth engineering case
studies, Nex, an AI guide that answers questions by calling real tools over the site's own data, and a
data-driven content model that keeps the résumé, LinkedIn, case studies, and Nex's answers
from drifting apart.

<!-- ![Homepage Screenshot](public/static/home.png) -->

</div>

---

## Feature Highlights

### 1. Case studies, not project cards
13 case studies under `/work` and `/work/[slug]`, each with a problem statement, the constraints it
ran under, decisions with their **rejected alternatives**, measured results, and an explicit
statement of what was individually owned versus shared. Grouped by theme with a "what should I read
for X" box that answers through the same Nex backend. Source of truth: `src/data/case-studies.ts`.

### 2. Nex — a tool-calling AI guide, not a chat widget
`src/components/NexChat.tsx` and `src/app/api/chat/route.ts` implement a real agent loop against
an OpenAI-compatible LLM (`gpt-6-luna` through a self-hosted Bifrost gateway by default):
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
- **Answers carry page components**: when a tool returns a metric, a case study or a comparison,
  the answer shows the matching card, validated against the site's own ids.
- **Nex's own eval** (`npm run eval:nex`): a 30-question golden set with a deterministic scorer,
  run as a development check.
- **One Nex across the site**: a single animated guide sits in the hero between the two halves of
  the name, shrinks into the page as you scroll, rests in a reserved socket in every homepage section,
  on `/work` and every case study, and lands in the footer's slot at the end of every page. The
  conversation opens in the page (the hero, the section you are reading, a row under a case study's
  section, the footer), never over the
  text being read; another section offers "Continue here".
- **Visitor paths**: "Take a tour" offers the 60-second tour or a path for a recruiter, hiring
  manager, engineer or founder; the chosen path is sent to the chat as a fixed id so answers lead with
  what that reader needs.
- **Role fit**: in Contact, Nex's chat offers "Check a role's fit": paste a role and it summarises
  the fit, gaps included.

### 3. One content model, many surfaces
`src/data/portfolio.ts` and `src/data/case-studies.ts` are the source of truth for experience,
projects, skills, stats, and case-study depth. The homepage, `/work`, Nex's tool responses,
and the JSON-LD SEO graph all derive from the same data — a number or a claim only has to be correct
in one place. Experience bullets can carry an optional case-study slug (compile-time checked against
the real slug list), surfacing a "Read case study" link and an inline follow-up right where the claim
is made.

### 4. Consistent glassmorphism, tiered on purpose
Blur and fill are tiered by surface role — in-page cards/panels, floating chrome, and modal overlays
each get a distinct blur radius and fill opacity (`src/app/globals.css`) — rather than one blur value
reused everywhere and drifting inconsistent by accident. Only the hero animates in, and glass
surfaces are moved and clipped in rather than faded, since fading a translucent glass panel in
from `opacity: 0` makes it read as flat for the length of the animation. Text meets WCAG AA in both
themes (a test keeps teal text on the darker text token).

### 5. Smooth scroll that behaves like the browser
Lenis-backed smooth scrolling (`src/components/SmoothScroll.tsx`) that still respects native scroll
restoration on refresh, resets correctly on client-side navigation, and — critically — only locks
page scroll behind an overlay that is actually modal. Nex's mobile layout is a full-screen
modal and locks the page; its desktop layout is a non-modal corner panel and does not.

### 6. Cross-device animation and interaction polish
- 3D card tilt on hover (`src/components/Card3D.tsx`)
- A custom fluid-cursor canvas effect (`src/hooks/useFluidCursor.tsx`)
- One orchestrated hero intro (Web Animations API), honoring `prefers-reduced-motion`
- A live contact form backed by a real API route with Zod validation and Resend delivery

---

## Technology Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — utility-first styling, tiered glass tokens
- **Framer Motion** — declarative, reduced-motion-aware animation
- **Radix UI / shadcn-style primitives** (`src/components/ui/`)
- **Zod** — request validation for the chat and contact API routes
- **Resend** — contact form delivery
- **Bifrost (self-hosted, OpenAI-compatible gateway)** — serves Nex's model, `gpt-6-luna`

---

## Environment Variables

Create a `.env.local`:

```bash
# LLM / Nex — used in src/app/api/chat/route.ts
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://bifrost.codenex.dev/v1
AI_MODEL=gpt-6-luna

# Contact form (Resend)
RESEND_API_KEY=re_your_resend_api_key
CONTACT_EMAIL_FROM="Nikunj Portfolio <contact@yourdomain.com>"
CONTACT_EMAIL_TO=you@example.com
```

Notes:
- `CONTACT_EMAIL_TO` accepts a comma-separated list to deliver to multiple inboxes.
- To send from a custom address, verify that domain in Resend and add the SPF/DKIM records it
  provides.
- `AI_MODEL` must support OpenAI-style `tools`/function calling — Nex depends on it for
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
model, Nex's tools and streaming route, contact/rate-limit logic, and UI consistency rules
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
    api/chat/             # Nex backend: streaming, tool loop, retry
    work/                 # Case-study index and detail pages
  components/
    ai/                   # AnswerBody, InlineAnswer, useAssistantAnswer — the shared answer UI
    ui/                   # Radix/shadcn-style primitives
    NexChat.tsx         # The Nex panel
    AskAboutThis.tsx       # The single "ask about this" affordance used everywhere
  data/
    portfolio.ts           # Experience, projects, skills, stats — the content source of truth
    case-studies.ts        # All 13 case studies
  lib/
    ai-tools.ts             # Nex's real tools (search_work, get_case_study, ...)
    ai-config.ts            # System prompt, model selection, guardrails
    chat-contract.ts        # Shared client/server streaming contract and timeout tuning
tests/                     # node:test suites (data model, AI tools, chat route, UI rules)
```

---

## License

See `LICENSE`.

---

<div align="center">Built with Next.js, TypeScript, and a real tool-calling agent.</div>
