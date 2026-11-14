# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production server: `npm run start`
- Lint repository: `npm run lint`
- Lint one file: `npx eslint src/components/Navbar.tsx`
- Lint multiple files: `npx eslint src/app/page.tsx src/app/api/contact/route.ts`

## Tests

- Run all tests: `npm test` (Node's built-in runner with type stripping; `@/` imports resolve through `tests/alias-hook.mjs`)
- Run one file: `node --test --experimental-strip-types --import ./tests/alias-hook-register.mjs tests/guide-reducer.test.ts`
- Code under `src/lib/` that tests import must use erasable TypeScript only (no enums, no parameter properties).

For meaningful changes, use:

- `npm run lint`
- `npm test`
- `npm run build` (if Turbopack reports missing native bindings locally, `npx next build --webpack` works)

## Stack

- Next.js 16 App Router
- React 19
- TypeScript (`strict: true`)
- Tailwind CSS v4
- Framer Motion for animation
- next-themes for dark mode
- Radix/shadcn-style UI primitives under `src/components/ui`
- Resend for contact email delivery
- LLM-backed “AI Twin” chat via `src/app/api/chat/route.ts`

## Architecture

### App shell

- `src/app/layout.tsx` owns global metadata, viewport config, JSON-LD injection, theme bootstrapping, skip link, and wraps the app with `SmoothScroll` and `Providers`.
- `src/app/providers.tsx` configures class-based theming via `next-themes` and mounts the global Sonner toaster.
- `src/app/page.tsx` is intentionally compositional: it stitches together the landing-page sections plus the floating AI chat.

### Content model

The portfolio is mostly data-driven.

- `src/data/portfolio.ts` is the source of truth for personal info, experience, projects, skills, stats, and initial AI chat suggestions.
- Multiple parts of the app derive from this file: visible homepage sections, contact links, AI twin context, and SEO metadata.
- When updating resume links, social links, project entries, or career facts, start here and then verify any dependent SEO/chat behavior.

### SEO and metadata

SEO is centralized rather than scattered across sections.

- `src/lib/seo/site.ts` defines canonical site metadata, keywords, geo info, and identity fields.
- `src/lib/seo/jsonld.ts` builds the schema graph for Website, WebPage, Person, and project list entries.
- `src/app/layout.tsx`, `src/app/sitemap.ts`, and `src/app/robots.ts` consume that SEO layer.

### Homepage composition

The homepage is a single long-form landing page with section-based navigation.

- `Navbar` scrolls to hash sections and tracks the active section in view.
- Most visible sections (`HeroSection`, `AboutSection`, `ExperienceSection`, `ProjectsSection`, `SkillsSection`, `AITwinSection`, `ContactSection`) are presentation components backed by portfolio data.
- `SmoothScroll` installs Lenis globally and intercepts in-page hash navigation, so section links should use the existing scroll helpers instead of custom scrolling behavior.

### AI Twin flow

The AI Twin is the most application-like feature in the repo.

- `src/components/AITwinChat.tsx` is the full conversation panel UI (mobile/desktop dialog, suggestion chips, retry). The conversation itself (sending, streaming, retry, persistence) lives in `src/lib/chat/twin-chat-store.ts`, shared with the inline ask bubble.
- `src/components/AITwinSection.tsx` is the landing-page CTA that opens the chat via a custom window event.
- `src/app/api/chat/route.ts` validates input, rate-limits requests, trims conversation history, calls the upstream LLM provider, and generates follow-up suggestions.
- `src/lib/ai-config.ts` contains the system prompts and model selection.
- `src/lib/ai-twin.ts` builds the portfolio knowledge context, normalizes project matching, manages stored chat history, and injects contextual links into AI responses.

Important constraint: the AI assistant is intentionally scoped to Nikunj’s professional profile and project history. If you change portfolio data or project naming, review both the prompt context and link-generation logic.

### Guide (animated avatar companion)

The AI Twin is fronted by an animated guide built on the MIT packages `@bible-strong/avatar-react` and `@bible-strong/avatar-core` (pinned at 1.0.1).

- `src/assets/guide/guide.avatar.json` is the character. It can be imported into https://bible-strong-avatar-lab.vercel.app (Avatars → Import), edited, and re-exported. Colours must be lowercase `#rrggbb`.
- **Hero avatar** (`components/guide/GuideHeroAvatar.tsx`): the large avatar in the hero's right column. Follows the pointer, reacts to hover, and plays a click streak (five quick clicks make it dizzy). Its "Ask me" pill opens the ask bubble.
- **Scroll companion** (`GuideCompanion.tsx`, mounted on idle by `GuideCompanionMount.tsx`): takes over from the hero avatar once it scrolls away, then glides along the side gutter to sit beside the section at viewport middle (`lib/guide/anchors.ts`, `lib/guide/placement.ts`). Docks in the bottom-right corner where the gutter is too narrow, on other routes, and during the tour.
- **Ask bubble** (`TwinBubble.tsx`): one bubble beside the companion that shows an inline ask box, a tip, or the tour narration (`lib/guide/bubble-policy.ts` decides which; ask > tour > tip). A bottom sheet on phones. "Open full conversation" opens the panel.
- **Conversation** (`lib/chat/twin-chat-store.ts`): one module store shared by the ask bubble and the full panel (`AITwinChat.tsx`), so they show the same history. Both anchor the latest question to the top while its answer streams below (`lib/chat/turn-anchor.ts`, `useTurnAnchor.ts`); nothing scrolls per token.
- **Mood** (`lib/guide/reducer.ts`, pure and tested; `store.ts` owns timers): chat phases, tool calls, click reactions, the idle ladder (bored → drowsy → asleep), tour cues. Emitted on the `guide:event` window bus (`bus.ts`). Every avatar instance shares one mood; gaze is per instance.
- `openAiTwin(question)` opens the ask bubble; `openAiTwin(question, answer)` or `{ expand: true }` opens the full panel.
- `navigate_to` can return an allow-listed `highlight` (`lib/guide/targets.ts`); `runGuideAction` in `lib/guide/actions.ts` scrolls and rings it, or routes for `/work/*`. Add new highlight ids to `targets.ts` and a matching `data-guide-target` attribute.
- The tour (`GuideTourNarrator.tsx`, steps in `lib/guide/tour.ts` in page order) scrolls each target into the band above the narrator with `lib/guide/tour-plan.ts`, so it is never covered.
- `GuideAvatar.tsx` must only load through `next/dynamic` with `ssr: false`: the package reads `window` during render and ships no `"use client"`.
- **Never touch fluid-cursor code** (`FluidCursor.tsx`, `hooks/useFluidCursor.tsx`) from guide work. `tests/guide-sources.test.ts` enforces it.

### Contact flow

The contact form is split cleanly between client validation and server delivery.

- `src/components/ContactSection.tsx` manages the form UI, client-side validation, timeout handling, and toast feedback.
- `src/lib/contact.ts` defines the shared Zod schema and allowed contact reasons.
- `src/app/api/contact/route.ts` re-validates the payload, rate-limits submissions, builds sanitized email content, and sends via Resend.
- `src/lib/rate-limit.ts` provides the shared in-memory rate limiting helpers used by both API routes.

### Styling and UI primitives

- Global design tokens, cursors, utility classes, and theme variables live in `src/app/globals.css`.
- Reusable low-level primitives are in `src/components/ui/`; prefer extending those before creating new base components.
- The site relies heavily on Tailwind utility classes plus a few shared helpers like `cn()` from `src/lib/utils.ts`.
- Motion and reduced-motion support are already wired into key components; preserve that behavior when editing animated UI.

## Environment variables

The app currently uses these environment variables:

- `RESEND_API_KEY`
- `CONTACT_EMAIL_FROM`
- `CONTACT_EMAIL_TO`
- `AI_MODEL` (currently `gpt-6-luna` via Bifrost)
- `LLM_API_KEY`
- `LLM_BASE_URL` (an OpenAI-style base such as `https://bifrost.codenex.dev/v1`, or a full `/chat/completions` URL; see `src/lib/llm-url.ts`)
- `BLOB_READ_WRITE_TOKEN`, `ARTIFACT_UPLOAD_TOKEN` (artifact hosting)

## Working conventions

- Use `npm`, not another package manager.
- Prefer `@/*` imports; `tsconfig.json` maps `@/*` to `src/*`.
- Preserve the local formatting style of the file you touch; there is no Prettier config.
- Default to server components; add `"use client"` only when hooks, browser APIs, animation, or event-driven UI require it.
- For backend/API changes, keep the existing pattern of Zod validation + `NextResponse.json(...)` + explicit status codes.
- If you change runtime behavior in a meaningful way, validate with `npm run lint` and `npm run build`.
