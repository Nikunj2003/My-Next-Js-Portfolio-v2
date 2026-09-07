import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the "ask about this" / "read case study" affordances.
 *
 * History worth keeping, because each rule here comes from a real bug:
 *  - Four separate components once did this one job, each styled differently.
 *  - Three surfaces had no affordance at all while every existing one looked
 *    consistent, so a consistency check alone passed.
 *  - Rendering the pill inline inside a data-driven heading moved it to a
 *    different spot on every card.
 *  - The affordances were hover-revealed; they are now always visible, and the
 *    tests below assert that directly so hiding cannot quietly return.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const AFFORDANCE_FILE = join("src", "components", "AskAboutThis.tsx");
const SOURCES = walk("src").map((file) => ({ file, source: readFileSync(file, "utf8") }));

test("only one component renders the ask affordance", () => {
  const offenders = SOURCES.filter(
    ({ file, source }) => file !== AFFORDANCE_FILE && /aria-label={`?\$?\{?.*Ask about this/i.test(source)
  );

  assert.deepEqual(
    offenders.map((entry) => entry.file),
    [],
    "these files render their own ask affordance instead of using AskAboutThis"
  );
});

test("the affordances are always visible, never hover-revealed", () => {
  const source = readFileSync(AFFORDANCE_FILE, "utf8");

  // The inverse of the old contract. Any of these reintroduces hiding.
  assert.doesNotMatch(source, /opacity-0/, "must not hide itself at rest");
  assert.doesNotMatch(
    source,
    /group-hover\//,
    "must not depend on a group-hover scope; visibility is unconditional now"
  );
  assert.doesNotMatch(
    source,
    /group-focus-within\//,
    "focus-within reveal is only needed when something is hidden"
  );

  // Still must be a properly focusable control with a visible focus ring.
  assert.match(source, /focus-visible:ring/, "must show a visible focus ring");
  assert.match(source, /motion-reduce:transition-none/, "must respect prefers-reduced-motion");
});

test("no call site reintroduces a reveal wrapper", () => {
  // The `group/card`, `group/row`, `group/heading` scopes existed only to drive
  // the reveal. `group/system` is exempt: it also drives CaseStudyCard's glyph
  // border and arrow slide, which are unrelated to the affordance.
  for (const { file, source } of SOURCES) {
    for (const scope of ["card", "row", "heading"]) {
      assert.ok(
        !source.includes(`group/${scope}"`) && !source.includes(`group/${scope} `),
        `${file} declares \`group/${scope}\`, but the affordances no longer reveal on hover`
      );
    }
  }
});

test("both affordances share one visual treatment", () => {
  const source = readFileSync(AFFORDANCE_FILE, "utf8");

  // The "Read case study" link was previously hand-styled at its call site with
  // a duplicated class string, which is how the two drifted apart visually.
  assert.match(source, /ReadCaseStudyLink/, "the link must live beside the pill");
  assert.match(
    source,
    /const AFFORDANCE_BASE/,
    "both must draw from one shared class constant rather than repeating classes"
  );

  const usesShared = (name: string) => {
    const body = source.slice(source.indexOf(name));
    return /AFFORDANCE_BASE/.test(body.slice(0, 900));
  };
  assert.ok(usesShared("export default function AskAboutThis"), "the pill must use AFFORDANCE_BASE");
  assert.ok(usesShared("export function ReadCaseStudyLink"), "the link must use AFFORDANCE_BASE");
});

test("the read-case-study link is never hand-styled at a call site", () => {
  /*
   * `CaseStudyCard` is exempt and deliberately so: its "Read case study" line
   * is the card's full-width CTA *and* its stretched navigation target
   * (after:inset-0 covering the whole card). That is a different component from
   * the small inline pill this rule governs — forcing the shared pill there
   * would remove the card's click target.
   */
  const EXEMPT = new Set([join("src", "components", "CaseStudyCard.tsx")]);

  for (const { file, source } of SOURCES) {
    if (file === AFFORDANCE_FILE || EXEMPT.has(file)) continue;

    // A raw <Link> whose visible text is "Read case study" means the shared
    // component was bypassed.
    assert.ok(
      !/<Link[^>]*>[\s\S]{0,200}?Read case study/.test(source),
      `${file} hand-styles a "Read case study" link; use ReadCaseStudyLink instead`
    );
  }
});

test("every content surface offers the ask affordance", () => {
  // Consistency across what exists says nothing about what is missing: three
  // surfaces once had no affordance at all while every other check passed.
  const REQUIRED = [
    "src/components/ExperienceSection.tsx",
    "src/components/AboutSection.tsx",
    "src/components/ProjectsSection.tsx",
    "src/components/CaseStudyCard.tsx",
    "src/components/SkillsSection.tsx",
    "src/app/work/[slug]/page.tsx",
  ];

  for (const file of REQUIRED) {
    assert.match(
      readFileSync(file, "utf8"),
      /<AskAboutThis\b/,
      `${file} renders askable content but offers no ask affordance`
    );
  }
});

test("experience covers the summary bullet as well as the detail bullets", () => {
  const source = readFileSync(join("src", "components", "ExperienceSection.tsx"), "utf8");
  const asks = source.match(/<AskAboutThis\b/g) ?? [];

  assert.ok(asks.length >= 2, `expected the summary and the bullets to be askable, found ${asks.length}`);
  assert.match(source, /exp\.summary/, "the summary must still render");
});

test("the pill is never inline inside a heading that renders variable-length data", () => {
  // Inline, the pill lands wherever the heading text ends — so it sat in a
  // different place on each project card, case-study card, and skills category.
  // This matters more now that it is always visible: it would leave every
  // heading's ragged edge permanently uneven.
  for (const { file, source } of SOURCES) {
    if (!source.includes("<AskAboutThis")) continue;

    const headingWithAsk = /<(h[1-4]|Heading)\b[^>]*>([\s\S]{0,400}?)<\/(?:h[1-4]|Heading)>/g;

    for (const match of source.matchAll(headingWithAsk)) {
      const [, tag, inner] = match;
      if (!inner.includes("<AskAboutThis")) continue;

      const beforeAsk = inner.slice(0, inner.indexOf("<AskAboutThis"));
      const rendersData = /\{[^}]*\.(title|choice|heading|label|name)[^}]*\}/.test(beforeAsk);

      assert.ok(
        !rendersData,
        `${file}: <${tag}> renders variable-length data and holds the pill inline, ` +
          `so its position shifts per item. Move it to a sibling container below the heading.`
      );
    }
  }
});

/**
 * Inline answers are opt-in, and only where the container can absorb them.
 *
 * An answer of unpredictable length inside a narrow grid cell blew the card's
 * height, broke row alignment against its neighbours, and repeated text that
 * was already visible a few pixels above. The panel is the default because it
 * scrolls independently and cannot disturb page layout; `inline` is reserved
 * for full-width prose that can simply grow downward.
 */
test("inline answers are limited to full-width prose surfaces", () => {
  const ALLOWED = new Set(["src/components/ExperienceSection.tsx"]);

  for (const { file, source } of SOURCES) {
    // Match an <AskAboutThis ...> that carries the bare `inline` prop.
    const usesInline = /<AskAboutThis\b[^>]*?\binline\b[^>]*?\/>/s.test(source);
    if (!usesInline) continue;

    assert.ok(
      ALLOWED.has(file),
      `${file} opts into an inline answer, but only full-width prose surfaces may. ` +
        `Grid cards must open the panel instead, or a long answer breaks the row.`
    );
  }
});

test("the panel is the default target for an ask", () => {
  const source = readFileSync(AFFORDANCE_FILE, "utf8");

  // The default branch of the click handler must reach the panel, so a new call
  // site that forgets to think about layout gets the safe behaviour.
  assert.match(
    source,
    /inline\s*\?\s*setOpen[\s\S]{0,40}:\s*openAiTwin\(question\)/,
    "an ask must open the panel unless the call site explicitly opts into inline"
  );
});

test("the inline answer never shows a bare tool trace with no message", () => {
  const source = readFileSync(join("src", "components", "ai", "InlineAnswer.tsx"), "utf8");

  // A tool call flips status to "streaming" before any prose exists; gating the
  // spinner on "loading" alone left a lone get_case_study(...) line on screen.
  assert.match(
    source,
    /!content/,
    "the pending state must also cover streaming-with-no-text-yet, not just loading"
  );
});

/**
 * A superseded request must never write to state.
 *
 * `ask()` aborts whatever is in flight, and React StrictMode double-invokes
 * effects in development, so the first request is routinely cancelled by the
 * second. Without an ownership check both runs reached the error handler and
 * wrote "That took too long to answer" over the run that was still working —
 * the error flashed on screen, then the real answer replaced it.
 */
test("only the request that still owns the controller may write state", () => {
  const source = readFileSync(join("src", "components", "ai", "useAssistantAnswer.ts"), "utf8");

  const guards = source.match(/abortRef\.current !== controller/g) ?? [];
  assert.ok(
    guards.length >= 3,
    `expected the ownership guard on the error path, the stream loop, and completion; found ${guards.length}`
  );

  // The guard has to come before the error is written, not after. Comments are
  // stripped first: the guard's own doc comment quotes the error string, which
  // made a naive indexOf compare against prose rather than code.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  const catchBlock = code.slice(code.indexOf("} catch (error) {"));
  const guardAt = catchBlock.indexOf("abortRef.current !== controller");
  const errorAt = catchBlock.indexOf("setState");
  assert.ok(guardAt >= 0, "the catch block must check request ownership");
  assert.ok(guardAt < errorAt, "the ownership guard must precede any state write");
});

test("the inline answer requests once per question", () => {
  const source = readFileSync(join("src", "components", "ai", "InlineAnswer.tsx"), "utf8");

  // Keying the effect on `status` re-ran it on every transition, which under
  // StrictMode's double-invoke produced two competing requests per click.
  const effect = source.slice(source.indexOf("void ask(question)"));
  const deps = effect.slice(effect.indexOf("}, ["), effect.indexOf("]", effect.indexOf("}, [")) + 1);
  assert.doesNotMatch(deps, /status/, "the ask effect must not depend on status");
});

/**
 * An affordance must never be nested inside a link.
 *
 * `CaseStudyCard` wrapped the entire card in an `<a>`, which put the ask pill
 * inside it: one click both opened the chat AND navigated to the case study.
 * A `<button>` inside an `<a>` is also invalid HTML, so `stopPropagation`
 * would have masked the symptom without fixing the markup. The card now uses a
 * stretched link (`after:inset-0`) on its "Read case study" line, leaving the
 * pill a sibling that sits above the overlay.
 */
test("no ask affordance is wrapped in a card-wide link", () => {
  for (const { file, source } of SOURCES) {
    if (!source.includes("<AskAboutThis")) continue;

    // A <Link> opened before the pill and closed only after it means the pill
    // is inside the link's subtree.
    const askAt = source.indexOf("<AskAboutThis");
    const linkBefore = source.lastIndexOf("<Link", askAt);
    if (linkBefore === -1) continue;

    const linkCloseAfter = source.indexOf("</Link>", linkBefore);
    assert.ok(
      linkCloseAfter === -1 || linkCloseAfter < askAt,
      `${file}: an ask pill sits inside a <Link>, so clicking it would also navigate. ` +
        `Use a stretched link (after:inset-0) on a sibling instead.`
    );
  }
});

test("a card that navigates keeps its pill above the stretched overlay", () => {
  const source = readFileSync(join("src", "components", "CaseStudyCard.tsx"), "utf8");

  assert.match(source, /after:absolute after:inset-0/, "the card must navigate via a stretched link");
  assert.match(
    source,
    /relative z-10[^"]*"[\s\S]{0,120}<AskAboutThis/,
    "the pill must be lifted above the stretched-link overlay, or the overlay swallows its clicks"
  );
});
