import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { GUIDE_HIGHLIGHT_IDS, guideTargetSelector, isGuideHighlight } from "../src/lib/guide/targets.ts";
import { TOUR_STEPS } from "../src/lib/guide/tour.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const COMPONENTS = walk("src/components").map((file) => readFileSync(file, "utf8")).join("\n");
const PAGE = readFileSync("src/app/page.tsx", "utf8");

test("every allow-listed highlight exists as a data-guide-target in the components", () => {
  for (const id of GUIDE_HIGHLIGHT_IDS) {
    assert.match(COMPONENTS, new RegExp(`data-guide-target="${id}"`), `no element carries data-guide-target="${id}"`);
  }
});

test("every tour step points at a real section and an allow-listed highlight", () => {
  for (const step of TOUR_STEPS) {
    assert.match(COMPONENTS, new RegExp(`id="${step.href.slice(1)}"`), `${step.id}: no section with ${step.href}`);
    if (step.highlight) assert.ok(isGuideHighlight(step.highlight), `${step.id}: ${step.highlight} is not allow-listed`);
    assert.ok(step.line.length <= 140, `${step.id}: line is ${step.line.length} chars`);
  }
});

test("tour steps follow the homepage section order", () => {
  const order = ["HeroSection", "AboutSection", "ExperienceSection", "ProjectsSection", "SkillsSection", "AITwinSection", "ContactSection"];
  const positions = order.map((name) => PAGE.indexOf(`<${name}`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "page.tsx section order changed; update the tour");
});

test("tour steps visit sections in page order", () => {
  const sectionOrder = ["#hero", "#about", "#experience", "#work", "#skills", "#ai-twin", "#contact"];
  const indexes = TOUR_STEPS.map((step) => sectionOrder.indexOf(step.href));
  assert.ok(indexes.every((index) => index >= 0), "a tour step points at an unknown section");
  assert.deepEqual([...indexes].sort((a, b) => a - b), indexes, "tour steps jump backwards on the page");
});

test("target selectors cannot be used to inject arbitrary CSS", () => {
  assert.equal(guideTargetSelector('work"] , body [x="'), '[data-guide-target="workbodyx"]');
  assert.equal(guideTargetSelector("project:resume-fit"), '[data-project-slug="resume-fit"]');
});
