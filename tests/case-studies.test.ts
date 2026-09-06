import test from "node:test";
import assert from "node:assert/strict";

import {
  caseStudies,
  caseStudiesByTheme,
  caseStudyBySlug,
  featuredCaseStudies,
  getAdjacentCaseStudies,
  getCaseStudyPath,
  productCaseStudies,
  systemCaseStudies,
} from "../src/data/case-studies.ts";

/** Diagram keys that `src/components/diagrams/index.tsx` actually resolves. */
const REGISTERED_DIAGRAMS = new Set(["eval", "mcp", "kgrag", "docs", "gateway"]);

test("every case study is complete enough to render", () => {
  for (const study of caseStudies) {
    const where = `case study "${study.slug}"`;

    assert.match(study.slug, /^[a-z0-9-]+$/, `${where} needs a URL-safe slug`);
    assert.ok(study.title.length > 0, `${where} needs a title`);
    assert.ok(study.period.length > 0, `${where} needs a period`);
    assert.ok(study.oneLiner.length > 40, `${where} needs a substantive one-liner`);
    assert.ok(study.summary.length > 80, `${where} needs a substantive summary`);
    assert.ok(study.problem.length > 80, `${where} needs a substantive problem statement`);
    assert.ok(study.ownership.length > 40, `${where} must state its ownership boundary`);

    // Empty arrays type-check but render as empty headings, so guard them here.
    assert.ok(study.constraints.length >= 3, `${where} needs at least three constraints`);
    assert.ok(study.decisions.length >= 3, `${where} needs at least three decisions`);
    assert.ok(study.results.length >= 3, `${where} needs at least three results`);
    assert.ok(study.stack.length >= 4, `${where} needs a stack`);
    assert.ok(study.tags.length >= 2, `${where} needs tags`);
    assert.ok(study.aliases.length >= 5, `${where} needs aliases for AI Twin matching`);

    for (const decision of study.decisions) {
      assert.ok(decision.choice.length > 0, `${where} has a decision with no choice`);
      assert.ok(decision.why.length > 60, `${where} decision "${decision.choice}" needs real reasoning`);
    }

    for (const result of study.results) {
      assert.ok(result.metric.length > 0, `${where} has a result with no metric`);
      assert.ok(result.label.length > 10, `${where} result "${result.metric}" needs a label`);
    }

    for (const section of study.sections) {
      assert.ok(section.heading.length > 0, `${where} has a section with no heading`);
      assert.ok(section.body.length > 60, `${where} section "${section.heading}" needs a body`);
    }
  }
});

test("at least one decision per study records a rejected alternative", () => {
  // A case study with no rejected alternatives anywhere is a description, not a
  // set of decisions — this is the bar the write-ups are meant to clear.
  for (const study of caseStudies) {
    const hasRejected = study.decisions.some((decision) => (decision.rejected?.length ?? 0) > 0);
    assert.ok(hasRejected, `case study "${study.slug}" records no rejected alternatives`);
  }
});

test("slugs are unique and resolve through the lookup map", () => {
  const slugs = caseStudies.map((study) => study.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate case study slug");

  for (const study of caseStudies) {
    assert.equal(caseStudyBySlug.get(study.slug), study);
    assert.equal(getCaseStudyPath(study.slug), `/work/${study.slug}`);
  }
});

test("every diagram key resolves to a registered component", () => {
  // The `diagram` union and the registry if-chain live in different files, so a
  // widened union with no matching branch would silently render nothing.
  for (const study of caseStudies) {
    if (study.diagram === null) continue;
    assert.ok(
      REGISTERED_DIAGRAMS.has(study.diagram),
      `case study "${study.slug}" uses unregistered diagram "${study.diagram}"`
    );
  }
});

test("a study with a diagram also has a caption", () => {
  for (const study of caseStudies) {
    if (study.diagram === null) continue;
    assert.ok(study.diagramCaption.length > 40, `case study "${study.slug}" needs a diagram caption`);
  }
});

test("systems precede products in array order", () => {
  // Not findLastIndex: the tsconfig lib target predates it.
  const lastSystem = caseStudies.reduce((last, study, i) => (study.kind === "system" ? i : last), -1);
  const firstProduct = caseStudies.findIndex((study) => study.kind === "product");

  assert.ok(firstProduct > lastSystem, "product case studies must come after all system case studies");
  assert.equal(systemCaseStudies.length + productCaseStudies.length, caseStudies.length);
});

test("every study has a theme and every theme group is reachable", () => {
  const grouped = caseStudiesByTheme.flatMap((group) => group.studies);
  assert.equal(grouped.length, caseStudies.length, "a study is missing from the theme grouping");

  for (const group of caseStudiesByTheme) {
    assert.ok(group.label.length > 0 && group.blurb.length > 20, `theme "${group.id}" needs a label and blurb`);
  }
});

test("adjacent navigation chains every study with correct ends", () => {
  const first = getAdjacentCaseStudies(caseStudies[0].slug);
  assert.equal(first.previous, null);
  assert.equal(first.next, caseStudies[1]);

  const last = getAdjacentCaseStudies(caseStudies[caseStudies.length - 1].slug);
  assert.equal(last.next, null);
  assert.equal(last.previous, caseStudies[caseStudies.length - 2]);

  // Walking forward from the first study must reach every other study exactly once.
  let cursor = caseStudies[0];
  let visited = 1;
  while (true) {
    const { next } = getAdjacentCaseStudies(cursor.slug);
    if (!next) break;
    cursor = next;
    visited += 1;
  }
  assert.equal(visited, caseStudies.length, "prev/next chain does not cover every study");

  assert.deepEqual(getAdjacentCaseStudies("does-not-exist"), { previous: null, next: null });
});

test("exactly three studies are featured, because the homepage row is a fixed three-column grid", () => {
  assert.equal(featuredCaseStudies.length, 3);
  for (const study of featuredCaseStudies) {
    assert.equal(study.kind, "system");
  }
});
