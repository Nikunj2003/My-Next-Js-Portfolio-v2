# AGENTS.md
Repository guide for coding agents working in this project.
## Stack
- Next.js 16 App Router
- React 19
- TypeScript with `strict: true`
- ESLint 9 with Next presets
- Tailwind CSS
- shadcn/radix-style UI components
## Package Manager
Use `npm`.
Evidence:
- `package-lock.json` exists
- `package.json` defines npm scripts
## Core Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Lint repo: `npm run lint`
- Test repo: `npm test`
- Lint one file: `npx eslint src/components/Navbar.tsx`
- Lint several files: `npx eslint src/app/page.tsx src/app/api/contact/route.ts`
- Production build: `npm run build`
- Start built app: `npm run start`
## Test Status
The repo now includes a lightweight Node test runner for pure utility tests.
Observed state:
- `package.json` defines `npm test`
- The test command uses Node's built-in test runner with `--experimental-strip-types`
- Tests currently live under `tests/*.test.ts`
Implications:
- UI and route integration coverage is still not configured
- Current validation is `npm test`, `npm run lint`, and `npm run build`
Single-test command:
- `node --test --experimental-strip-types tests/rate-limit.test.ts`
## Verified While Writing This File
These commands were run successfully:
- `npm test`
- `npm run lint`
- `npm run build`
## Project Layout
Main code lives under `src/`.
Important directories:
- `src/app/`: App Router entrypoints, layout, metadata, API routes
- `src/components/`: page sections and reusable components
- `src/components/ui/`: low-level UI primitives
- `src/lib/`: utilities, validation, SEO, AI config, rate limiting
- `src/data/`: portfolio data and content
- `src/hooks/`: reusable hooks
## TypeScript
`tsconfig.json` enables `strict` mode and maps `@/*` to `src/*`.
Rules:
- Prefer precise types over broad ones
- Avoid `any`; use `unknown` and narrow it
- Reuse existing domain types before adding new ones
- Use `zod` for runtime validation of external input
- Use `import type` or inline `type` imports to match the local file
- Add explicit types when inference would be unclear
## Imports
Preferred order:
- Framework and external packages
- Internal alias imports from `@/...`
- Relative imports
Guidance:
- Prefer `@/...` alias imports over long relative paths
- Remove unused imports
- Keep import style consistent with the file you are editing
## Formatting
There is no Prettier config in the repo.
Observed style:
- Most files use semicolons
- Most files use double quotes
- Some files use single quotes and omit semicolons
Agent rule:
- Preserve the formatting style of the file you touch
- Do not mass-reformat unrelated files
- Keep diffs small and local
## Naming
Follow the patterns already present:
- Components: PascalCase
- Hooks: `useSomething`
- Functions and variables: camelCase
- Constants: `ALL_CAPS` for true constants
- Shared data arrays: plural camelCase like `projects`, `experiences`, `skillCategories`
- Next route files: `page.tsx`, `layout.tsx`, `route.ts`, `robots.ts`, `sitemap.ts`
## React And Next.js
Follow the App Router approach already used here.
Rules:
- Default to server components
- Add `"use client"` only when needed for hooks, browser APIs, event handlers, or client-only libraries
- Keep `src/app/page.tsx` mostly compositional
- Use Next primitives already in use, such as `next/image`, `next/script`, and metadata exports
- Preserve accessibility work already present, such as skip links, focus handling, and reduced-motion support
## Styling
Styling is Tailwind-first.
Rules:
- Prefer utility classes in JSX
- Use `cn()` from `@/lib/utils` for conditional class names
- Reuse existing UI primitives from `src/components/ui/` before introducing new base components
- Preserve dark mode behavior; theming is class-based via `next-themes`
- Reuse existing tokens and conventions from `tailwind.config.ts` and `globals.css`
## Validation And Error Handling
API routes establish the expected backend style.
Follow these patterns:
- Validate request bodies with `zod` before doing work
- Return `NextResponse.json(...)` with clear status codes
- Use user-safe error messages in API responses
- Log server-side operational failures with `console.error(...)`
- Check required env vars before calling external services
- Keep rate-limiting and timeout behavior intact unless intentionally changing it
## Environment Variables In Use
Observed env vars:
- `RESEND_API_KEY`
- `CONTACT_EMAIL_FROM`
- `CONTACT_EMAIL_TO`
- `AI_MODEL`
- `LLM_API_KEY`
- `LLM_BASE_URL`
Rules:
- Never hardcode secrets
- Do not rename env vars casually
- If you add a new env var, document it in your final notes
## ESLint
`eslint.config.mjs` uses Next core-web-vitals and Next TypeScript presets.
Practical meaning:
- Expect Next best-practice lint rules
- Expect TypeScript-aware linting
- Build output directories are ignored
## Cursor And Copilot Rules
Checked while preparing this file:
- No existing `AGENTS.md` was present
- No `.cursor/rules/` directory was found
- No `.cursorrules` file was found
- No `.github/copilot-instructions.md` file was found
If any of those files are added later, merge their instructions into this document and follow the more specific repo rule.
## Change Strategy
When making changes:
- Prefer the smallest correct fix
- Preserve existing structure and patterns
- Avoid adding dependencies unless necessary
- Avoid broad refactors unless explicitly requested
- If you change runtime behavior, run `npm run lint` and `npm run build`
## Done Criteria
A safe change is typically done when:
- The touched file keeps its local style
- No new TypeScript or ESLint issues are introduced
- `npm run lint` passes
- `npm run build` passes for meaningful code changes
- New env vars or behavior changes are clearly called out
