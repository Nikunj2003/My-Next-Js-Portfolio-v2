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
- LLM-backed AI guide, Nex, via `src/app/api/chat/route.ts`

## Architecture

### App shell

- `src/app/layout.tsx` owns global metadata, viewport config, JSON-LD injection, theme bootstrapping, skip link, and wraps the app with `SmoothScroll` and `Providers`.
- `src/app/providers.tsx` configures class-based theming via `next-themes` and mounts the global Sonner toaster.
- `src/app/page.tsx` is intentionally compositional: it stitches together the landing-page sections plus the floating AI chat.

### Content model

The portfolio is mostly data-driven.

- `src/data/portfolio.ts` is the source of truth for personal info, experience, projects, skills, stats, and initial AI chat suggestions.
- Multiple parts of the app derive from this file: visible homepage sections, contact links, Nex's context, and SEO metadata.
- When updating resume links, social links, project entries, or career facts, start here and then verify any dependent SEO/chat behavior.

### SEO and metadata

SEO is centralized rather than scattered across sections.

- `src/lib/seo/site.ts` defines canonical site metadata, keywords, geo info, and identity fields.
- `src/lib/seo/jsonld.ts` builds the schema graph for Website, WebPage, Person, and project list entries.
- `src/app/layout.tsx`, `src/app/sitemap.ts`, and `src/app/robots.ts` consume that SEO layer.

### Homepage composition

The homepage is a single long-form landing page with section-based navigation.

- `Navbar` scrolls to hash sections and tracks the active section in view.
- Most visible sections (`HeroSection`, `AboutSection`, `ExperienceSection`, `ProjectsSection`, `SkillsSection`, `NexSection`, `ContactSection`) are presentation components backed by portfolio data.
- `SmoothScroll` installs Lenis globally and intercepts in-page hash navigation, so section links should use the existing scroll helpers instead of custom scrolling behavior.

### Nex (AI guide) flow

Nex is the most application-like feature in the repo.

- **Persona** (`src/lib/nex/persona.ts`): the one source for who Nex is and how it talks. Nex is an AI guide, not Nikunj: "I" is Nex, Nikunj is "Nikunj" or "he", never "I built" or "my work". It is precise with a dry wit (one understated line at most, never in errors, refusals or "not measured"). The system prompt's persona block is `personaPrompt()`. Every static line (hero lines, tips, tour, chips, welcome, errors, fallback suggestions) follows the same rules; `tests/nex-persona.test.ts` checks the voice, the lengths, and that "twin" appears nowhere except the migrations.
- **Renamed from "AI Twin"**: saved history moves once from `nikunj-ai-twin-chat` to `nikunj-nex-chat`, and old `#ai-twin` links land on the section through a hidden anchor and are rewritten to `#nex`.

- `src/components/NexChat.tsx` is the full conversation panel UI (mobile/desktop dialog, suggestion chips, retry). The conversation itself (sending, streaming, retry, persistence) lives in `src/lib/chat/nex-chat-store.ts`, shared with the inline ask bubble.
- `src/components/NexSection.tsx` is the landing-page CTA that opens the chat via a custom window event.
- `src/app/api/chat/route.ts` validates input, rate-limits requests, trims conversation history, calls the upstream LLM provider, and generates follow-up suggestions.
- `src/lib/ai-config.ts` contains the system prompts and model selection.
- `src/lib/nex-knowledge.ts` builds the portfolio knowledge context, normalizes project matching, manages stored chat history, and injects contextual links into AI responses.

Important constraint: the AI assistant is intentionally scoped to Nikunj’s professional profile and project history. If you change portfolio data or project naming, review both the prompt context and link-generation logic.

### Guide (animated avatar companion)

Nex is fronted by an animated guide built on the MIT packages `@bible-strong/avatar-react` and `@bible-strong/avatar-core` (pinned at 1.0.1).

- `src/assets/guide/guide.avatar.json` is the character. It can be imported into https://bible-strong-avatar-lab.vercel.app (Avatars → Import), edited, and re-exported. Colours must be lowercase `#rrggbb`.
- **One Nex** (`GuideCompanion.tsx`): there is one live avatar on the site. On desktop it sits in the hero's socket (`GuideHeroAvatar.tsx`: ring, disc and a still stand-in that hides via `html[data-nex-in-hero]` once the live one has drawn), drawn at the socket's face size (`HERO_FACE_SHARE`/`COMPANION_FACE_SHARE`, `heroFaceScale`), follows the pointer and reacts to clicks with lines (`lib/guide/spoken.ts`, `sayPetLine`). Clicking Nex where it rests in a socket (hero, `/work` and case-study headers, the footer) pets it (`petMode`); elsewhere it opens the ask box. Phones keep the still drawing in the hero and the companion in the corner.
- **Where the conversation opens** (`lib/guide/ask-hosts.ts`, `AskHost`: `hero | footer | section:<id> | page:<id> | float`): one decision, `resolveAskHost` (called by `chooseAskHost` in `companion-store.ts`): phones use the sheet; a requested host wins if it is laid out (`data-nex-host`); else the hero while Nex sits there (`heroVisible`), the footer once it has landed, the section in view, off the homepage the page row for what is being read (the last `page:*` row above 60% of the screen), and the bubble beside the companion last (phones only, in practice). Every in-page host goes through `InPageAskHost.tsx` (`useInPageHost`: opener focus, Escape, one scroll into view; `HostConversation` is the one live `AskContent`, marked `data-nex-host-live`): the hero (`HeroAskHost`, its height animates so the role, actions and figures slide), the footer (`FooterAskHost`, in the links' column), About/Experience/Skills (`PanelAskSwap`: the conversation replaces the sticky panel's body at about the body's height, so the pinned panel and the column beside it don't move), Work/Nex/Contact (`SectionAskRow`: a full-width row outside cards and grids), and on `/work` and case studies `PageAskRow` (`page:header` under the header, opened by the header socket's Ask; on a case study also one under each section heading, `page:<anchor>`, which that section's "Ask about this" chips open with a label naming it; the 224px contents column never holds one). On `/work` the "Not sure where to start?" box is itself `page:header` (`PageAskSwap`): asking there, its examples or the header socket's Ask replace its input with the conversation at the box's width, so the page never shows two chats. Rows span their column and reserve the answer area once (`ROW_BODY`). Every row (Work, Nex, Contact and the page rows) reserves a ringed 68px place for Nex at the head of the conversation (`data-guide-ask-socket`, `AskContent socket`): while it is open that is Nex's spot (`askSocketRule`, one glide there and back on close; the margin once it scrolls off), so Nex sits beside the conversation it is having. The sticky panels keep Nex in their own dock. Opening one host often collapses another above it, so the open scroll waits for the layout to settle (`revealWhenSettled`: place and size still for 4 frames) and then scrolls once, measured from the settled page; the browser's scroll anchoring keeps the reader's place while things collapse. The conversation also grows after it opens (the first question adds the answer area; chips return when an answer ends): when it grows while its composer was on screen, the same settled reveal runs again, so the composer and the answer stay in view. It never follows streaming text (the answer scrolls inside a fixed area), and a reader who has scrolled it out of view stays where they are; Enter does not cancel the reveal, scrolling does. Scrolling never moves an open conversation; another section's dock offers "Continue here", which moves it (history and draft are shared). `openNex(q, answer, { inPage: true })` appends an answered exchange (Experience's `InlineAnswer` "Continue with Nex") and opens it in the page.
- **Scroll companion** (`GuideCompanion.tsx`, mounted on idle by `GuideCompanionMount.tsx`): one loop places it, on Framer Motion's frame loop (`frame.update`), after Lenis has scrolled (`SmoothScroll` drives Lenis from `frame.read`) and before the render step, so the avatar, the hero and the bubble draw in the frame the page moved in. Stable lookups (nodes, sticky offsets, padding) are cached and cleared on resize or DOM change; anchors are `data-guide-*` attributes (`data-guide-panel`, `data-guide-spot`, `data-guide-hero-column`), never layout class names. Phones use the corner (touch scroll is native, so riding content would trail it). Each homepage section has a dock (`SectionNexDock`: a 68px ringed socket, `data-guide-section-socket`, with Nex's line and Ask) and its spot rule (`SECTION_RULES`, `socketRule`) is that socket: in the sticky panel for About, Experience and Skills (it pins with the panel), in the header for Work, Nex and Contact; the left margin otherwise, the bottom-right corner for the tour, the panel, unknown routes and narrow screens. Other pages have their own rules (`ROUTE_RULES`, anchored on `data-guide-route-spot`): on a case study it waits beside the intro, then rides under the sticky "On this page" contents; on `/work` it sits beside the header, then walks down the group headings in the margin. Every frame the loop reads the current rule's point from the live layout, clamps it to the screen (`lib/guide/placement.ts`) and writes it, so riding on content never lags or jitters. A section change (with hysteresis, `activeSectionAt`) starts one eased glide; a jump bigger than a scroll can explain is smoothed the same way.
- **Leaving the hero** (`heroDockFrame`, `heroHandoffProgress` in `lib/guide/placement.ts`): a pure function of one number taken from the scroll position, so the same scroll draws the same frame and scrolling back reverses it. The same element shrinks from the socket's face size along a curve (down to the spot's height, then across) and lands on its spot at full size; its own disc and ring (`chrome`) fade in on the way. It starts 40px into the scroll and runs over 1.1 screen heights (`HANDOFF_LEAD`, `HANDOFF_SPAN`). The hero is measured by its layout box (`heroLayoutRect`). Nothing is cross-faded.
- **The ring** (`NexRing.tsx`): every place Nex rests (hero socket, footer slot, page-header sockets) has the same SVG ring just outside the disc: a faint ticked track, an arc with a fading tail and a bright head orbiting every 18s, and a quicker arc while Nex is answering (`useNexChat().isLoading`). Dim while a slot is empty; the orbit pauses off screen and stops under reduced motion. The hero intro draws the track on as Nex wakes and fades the orbit in as it settles.
- **Page-header sockets** (`RouteNexSocket`, `data-guide-route-socket`, 120px) on `/work` and every case study: Nex rests in it with its line under it, and leaves by the time the socket reaches the navbar (`routeSocketProgress`). Then it waits in the free strip right of the content (`rightRailPoint`); on a case study it makes one hop (a `routeTravelFrame` arc) to the column under the pinned "On this page" contents, with hysteresis (`CONTENTS_RELEASE`) so a fast scroll never bounces it.
- **Footer landing** (`footerDockProgress`, `footerDockFrame`): as the page ends Nex curves into the footer's 150px slot (`data-guide-footer-socket`), paced over the same span of scrolling as the hero exit and reversible; tips close as it starts in. Its line shows in a glass speech pill above the slot (`FooterNexLine`).
- **Panel and tour flights**: opening the full conversation or the tour flies Nex from its pose (hero, spot, slot) to the corner (`PANEL_FLIGHT_MS`), and back to wherever it belongs at the current scroll when they close. The tour card appears once Nex has landed, always above it, and reserves the longest step's height.
- **Between pages**: a change of page is one hop (`routeTravelFrame`) from where Nex was drawn on the old page (`lastDrawn`: position, scale and disc) to its place on the new one: the hero socket, a page-header socket, the footer slot or its spot. Lines are cleared on a page change (`hush`).
- **Load and refresh**: the companion draws nothing until the page has settled (300ms, and the intro done); it loads at once when the intro is about to play, since the intro moves it. A reload partway down a page is held hidden (`html[data-restoring]`, set by `PLAY_SCRIPT`) until the browser has restored the scroll (700ms cap, CSS failsafe at 0.9s), so the top of the page never flashes first.
- **Section docks** (`socketDockPoint`): one continuous function of the socket's position: wait in the margin while the socket is below the screen, slide into it over 240px as it rises into view, rest in it while it is on screen (a pinned socket keeps Nex), slide back out over 280px once it passes just under the navbar. Smoothstep, so a fast scroll never jumps. Fully in its socket (and nothing else moving it) Nex is "docked" (`dockSection`): clicking pets it, and that section's tip shows as the dock's line (with Ask now, dismiss and "Don't show tips") instead of a bubble.
- **Bubble** (`NexBubble.tsx`): one bubble beside the companion that shows the ask box (`AskContent.tsx`), a tip, or the tour narration (`lib/guide/bubble-policy.ts` decides which; ask > tour > tip). Its position is `placeBubbleBeside` of the avatar's position, computed on Framer Motion's `frame.preRender`, so it draws in the same frame as the avatar. Its side (`chooseBubbleSide`) is the fitting side that covers the least reading text; the ask box chooses for its reserved height (`ASK_RESERVE`), so it never opens on one side and jumps. A tip only opens on a side that covers no text (`freeBubbleSide`) and leaves if the page moves text under it. A bottom sheet on phones (modal only for ask).
- **Conversation** (`lib/chat/nex-chat-store.ts`): one module store shared by the ask bubble and the full panel (`NexChat.tsx`), so they show the same history. Both anchor the latest question to the top while its answer streams below (`lib/chat/turn-anchor.ts`, `useTurnAnchor.ts`); nothing scrolls per token.
- **Mood** (`lib/guide/reducer.ts`, pure and tested; `store.ts` owns timers): chat phases, tool calls, click reactions, the idle ladder (bored → drowsy → asleep), tour cues. Emitted on the `guide:event` window bus (`bus.ts`). Every avatar instance shares one mood; gaze is per instance.
- `openNex(question)` opens the ask bubble; `openNex(question, answer)` or `{ expand: true }` opens the full panel.
- `navigate_to` can return an allow-listed `highlight` (`lib/guide/targets.ts`); `runGuideAction` in `lib/guide/actions.ts` scrolls and rings it, or routes for `/work/*`. Add new highlight ids to `targets.ts` and a matching `data-guide-target` attribute.
- The tour (`GuideTourNarrator.tsx`) scrolls each target into the band above the narrator with `lib/guide/tour-plan.ts` (eased, paced by distance), so it is never covered. **Visitor paths** (`lib/guide/paths.ts`): "Take a tour" (hero and `/work`) opens `TourChooser`: the 60-second tour (`lib/guide/tour.ts`) or a 4-stop path for a recruiter, hiring manager, engineer or founder, each in page order over existing highlights. The path rides on the start event (`startGuideTour(pathId)`, replayed by `GuideCompanionMount`), is kept in prefs (`visitor`), and is sent with chat requests as an id; the route validates it (`z.enum(VISITOR_IDS)`) and adds a short authored note (`visitorContext`) that changes emphasis only.
- `GuideAvatar.tsx` must only load through `next/dynamic` with `ssr: false`: the package reads `window` during render and ships no `"use client"`.
- **Never touch fluid-cursor code** (`FluidCursor.tsx`, `hooks/useFluidCursor.tsx`) from guide work. `tests/guide-sources.test.ts` enforces it.

### Contact flow

The contact form is split cleanly between client validation and server delivery.

- `src/components/ContactSection.tsx` manages the form UI, client-side validation, timeout handling, and toast feedback. Role fit runs in Nex's chat, not the section: in Contact the ask box offers "Check a role's fit" (and the Contact tip's "Ask now" opens straight into it, `openRoleFit`); the composer then takes a role and sends it wrapped by `roleFitQuestion` (`lib/chat/role-fit.ts`, within the 1200-character limit).
- `src/lib/contact.ts` defines the shared Zod schema and allowed contact reasons.
- `src/app/api/contact/route.ts` re-validates the payload, rate-limits submissions, builds sanitized email content, and sends via Resend.
- `src/lib/rate-limit.ts` provides the shared in-memory rate limiting helpers used by both API routes.

### Styling and UI primitives

- Global design tokens, cursors, utility classes, and theme variables live in `src/app/globals.css`.
- Teal text uses `text-primary-text` (AA on both themes), never `text-primary` (the button-fill teal); `tests/text-contrast.test.ts` enforces it. Actions use `.btn-cta-primary` / `.btn-cta-secondary` (one 48px family).
- Reusable low-level primitives are in `src/components/ui/`; prefer extending those before creating new base components.
- The site relies heavily on Tailwind utility classes plus a few shared helpers like `cn()` from `src/lib/utils.ts`.
- Motion and reduced-motion support are already wired into key components; preserve that behavior when editing animated UI.
- Only the hero animates in. Its markup (`HeroSection.tsx`) is static; `HeroIntro.tsx` plays the intro over it: Nex appears asleep, larger, at the centre of the screen, wakes (the guide's `intro/sleep` and `intro/wake` events), settles into its socket between the names, shrinking, while "Nikunj" and "Khitha" sweep in on mirrored arcs (`nameArcFrames`), then the rest resolves top to bottom. The intro moves the socket's wrapper and the live companion is drawn wherever it is. One Web Animations timeline with a per-run token and a 4s deadline matching the CSS failsafe; it plays on a load of `/` at the top on screens ≥1024px with motion allowed (`PLAY_SCRIPT`). Glass surfaces (`data-hero-glass`) are moved and clipped in, never faded. A click, key or wheel skips to the end. The hero's stage and gaps follow the screen height (`--stage`, `--hero-gap`) so it fits one screen. Other sections have no entrance animations (`tests/reveal-motion.test.ts`).

## Environment variables

The app currently uses these environment variables:

- `RESEND_API_KEY`
- `CONTACT_EMAIL_FROM`
- `CONTACT_EMAIL_TO`
- `AI_MODEL` (currently `gpt-6-luna` via Bifrost)
- `LLM_API_KEY`
- `LLM_BASE_URL` (an OpenAI-style base such as `https://bifrost.codenex.dev/v1`, or a full `/chat/completions` URL; see `src/lib/llm-url.ts`)
- `BLOB_READ_WRITE_TOKEN`, `ARTIFACT_UPLOAD_TOKEN` (artifact hosting)
- `TRUSTED_PROXY_HEADER` (optional): the client-IP header your proxy sets, for rate limiting off Vercel (e.g. `cf-connecting-ip`). On Vercel `x-vercel-forwarded-for` is used; otherwise the rightmost `x-forwarded-for` hop. Never trust a header the client can set.

## Working conventions

- Use `npm`, not another package manager.
- Prefer `@/*` imports; `tsconfig.json` maps `@/*` to `src/*`.
- Preserve the local formatting style of the file you touch; there is no Prettier config.
- Default to server components; add `"use client"` only when hooks, browser APIs, animation, or event-driven UI require it.
- For backend/API changes, keep the existing pattern of Zod validation + `NextResponse.json(...)` + explicit status codes.
- If you change runtime behavior in a meaningful way, validate with `npm run lint` and `npm run build`.

### Scroll lock

`lib/scroll-lock.ts` is the one reference-counted page lock (`useLenisLock` wraps it). It sets `lenis.isLocked`, is re-applied after `lenis.start()` (its reset clears the lock), and falls back to `overflow: hidden` on html and body without Lenis and on touch screens. Components never set body overflow themselves.
