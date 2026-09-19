---
name: hosted-html-report
description: Build a self-contained HTML report styled after Nikunj Khitha's portfolio (dark glassmorphism, teal accent, inline-SVG diagrams), verify it renders correctly, and host it at a shareable nikunj.codenex.dev link. Use when asked to produce a design doc, analysis, plan, dashboard or any shareable HTML artifact, or to host/re-host an HTML file and get a link. Examples: "write this up as an HTML report and host it", "make a shareable page for this analysis", "re-host the updated doc".
---

# Hosted HTML report

Produce a single self-contained HTML file, prove it renders correctly, and publish it
to `https://nikunj.codenex.dev/artifacts/<slug>/<name>.html`.

Everything fiddly is in the bundled scripts. Read this file for the decisions; run the
scripts for the mechanics.

```
hosted-html-report/
  scripts/host-file.sh          upload + live byte-verify
  scripts/verify-report.sh      structure + rendered-layout checks
  assets/report-template.html   starter with the portfolio's theme already correct
```

## Workflow

```bash
S=<wherever this skill is installed>   # e.g. ~/.claude/skills/hosted-html-report

# 1. start from the template (never from a blank file — it encodes the theme
#    tokens, glassmorphism, and diagram pattern below)
cp $S/assets/report-template.html ./my-report.html

# 2. write the content

# 3. verify BEFORE hosting
$S/scripts/verify-report.sh ./my-report.html

# 4. host (verifies the live copy is byte-identical)
$S/scripts/host-file.sh ./my-report.html <slug>
```

Make both scripts executable once: `chmod +x $S/scripts/*.sh`

## Auth & config

`host-file.sh` POSTs the file, base64-encoded, to the portfolio's own
`/api/artifacts` route — a plain JSON endpoint backed by Vercel Blob, no MCP
handshake involved. It needs an upload token, resolved in this order:

1. `ARTIFACT_UPLOAD_URL` / `ARTIFACT_UPLOAD_TOKEN` environment variables
2. A JSON config file at `~/.config/hosted-html-report/config.json`:
   ```json
   { "uploadUrl": "https://nikunj.codenex.dev/api/artifacts", "token": "..." }
   ```

The token is a shared secret configured server-side as `ARTIFACT_UPLOAD_TOKEN`
(alongside `BLOB_READ_WRITE_TOKEN` for the Blob store itself). Without a valid
token the route returns `401`.

**No size ceiling.** Unlike the old MCP-based transport, a plain HTTP POST has
no argv-length bug to work around — the only limit is the platform's own
request body size. Write reports as long as they need to be.

## Same slug/name.html replaces the report in place

Uploading to a `slug/name.html` that already exists **overwrites it** — same
URL, updated content, no separate "delete first" step. This is intentional:
cross-link related reports from the header badges (see the template) and
re-host the same path whenever a report changes, so shared links never break.

The server tracks two independent daily caps, enforced globally (not
per-caller): **10 new reports/day** and **30 updates to existing reports/day**.
Hitting either returns `429` with a message naming which cap it was. These
reset at UTC midnight.

## The diagram pattern: hand-authored inline SVG, not Mermaid

Diagrams are plain `<svg viewBox="...">` markup — boxes, arrows, text — styled
to match the portfolio's own diagram components
(`src/components/diagrams/DiagramFrame.tsx`). There is no diagramming DSL to
learn and no rendering-engine defects to work around; you're writing the exact
SVG that ends up on the page.

**Pattern** (see the template's example section for the full markup):
- Wrap the diagram in `<div class="diagram">` for the glass-panel frame.
- Boxes are `<rect rx="10">` with a `<text>` label centered on it:
  - Accent/highlighted node: `fill="rgba(41,214,185,.12)" stroke="rgba(41,214,185,.55)"`
  - Default node: `fill="rgba(27,36,54,.5)" stroke="#252E3F"`
  - Label text: `fill="#E4EDE9"` at `font-size="13.5"` `font-weight="600"`
- Arrows are `<path d="M x1 y1 L x2 y2">` with `marker-end="url(#arrow)"`, using
  the shared arrowhead `<marker>` defined once in the template's `<defs>`
  (teal fill, `#29D6B9`).
- Give every `<svg>` a `viewBox` sized to fit its content with ~20px margin —
  `verify-report.sh` fails any `<svg>` missing one.
- Keep diagrams wide rather than tall: a diagram narrower than ~380px and
  taller than ~1200px is hard to read on a normal screen.
- Add a `<title>` inside the `<svg>` describing what it shows, for
  accessibility and because it doubles as a sanity check that the diagram has
  a clear one-sentence point.

Because this is hand-written SVG rather than a rendering engine's output,
there's no equivalent of Mermaid's opaque edge-label-opacity or curve-routing
bugs — what you write is what renders. The only thing worth double-checking is
label collisions on a dense diagram; keep box spacing generous (≥70px gaps)
and this doesn't come up.

## Verify by measuring, not by looking

Screenshots are easy to skim past a real defect (a diagram with no labels, a
header where text quietly renders dark-on-dark). `verify-report.sh` measures
the actual rendered DOM in headless Chrome instead:

- tag balance, dangling nav anchors, every `<svg>` has a `viewBox`
- every `.diagram svg` has at least one `<text>` label (catches an empty/broken diagram)
- no dark text sits on a dark/gradient background (the CSS inheritance trap below)
- no page or console errors

Use `--quick` to skip the browser pass (structure checks only, no npx downloads).
Needs Chrome; override with `CHROME_PATH`.

## The CSS trap that keeps recurring

Setting `color` on a container does **not** reach descendants that have their
own rule. `header{color:#fff}` plus a generic `p{color:var(--fg))}` renders
dark text on the dark gradient header, because a direct rule always beats an
inherited value regardless of specificity. Set the colour explicitly on the
header's `h1`, `p`, `.eyebrow`, `.brand a` and badges — the template does this
and comments why; `verify-report.sh` flags regressions.

## Writing quality

The report should stand alone — assume the reader has no prior context.

- Lead with the answer, then support it. Put the conclusion in the first paragraph.
- **Never refer back by label.** "As in approach B", "see option 2", "the row-four case"
  force the reader to hold a lookup table in their head. Name the thing each time.
- Mark every number as measured or assumed, and say what would change if an assumption is
  wrong. A reader cannot calibrate trust otherwise.
- Check derived arithmetic against its inputs. Timelines and capacity figures computed
  from an assumption are the easiest thing to get wrong and the most load-bearing.
- Captions say what the diagram shows, not that it is a diagram.
- Use `.callout.bad` for real problems, `.callout.warn` for risks, `.callout.ok` for
  things that work, `.callout.info` for orientation. Don't decorate neutral prose.

## Re-hosting

Same `slug/name.html` overwrites in place and the URL is unchanged (see "Same
slug/name.html replaces the report in place" above). `host-file.sh` waits a
few seconds then byte-compares the live URL against the local file to confirm
the write actually landed; tune the wait with `VERIFY_DELAY`. A stale live
copy and a silently-rejected upload can look similar — check the script's
error output rather than assuming propagation lag if it keeps failing.

Cross-link related reports from the header badges so a reader can move between them.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401` on upload | missing/wrong bearer token | check `ARTIFACT_UPLOAD_TOKEN` / config file |
| `503` on upload | server env not configured | `ARTIFACT_UPLOAD_TOKEN` or `BLOB_READ_WRITE_TOKEN` unset on the server |
| `429` "Daily limit reached" | 10 new-reports/day or 30 updates/day cap hit | wait until UTC midnight |
| `404` on the live URL | slug/filename typo, or never uploaded | check `host-file.sh`'s output for the exact path used |
| Diagram source shows as plain text on the page | wrote it inside a `<pre>` instead of a real `<svg>` | this skill uses inline SVG, not a text-block DSL — write actual `<svg>` markup |
| `verify-report.sh` FAILs "svg without a viewBox" | missing `viewBox` attribute | add one sized to the diagram's content |
| Header text dark on the gradient | generic rule beats inheritance | set colour on the element itself |
| Live copy differs after upload | brief propagation lag, or rejected write | wait a few seconds and retry; check the response body for an `error` field |
| `verify-report.sh` skips browser checks | Chrome not at the default path | set `CHROME_PATH` |
