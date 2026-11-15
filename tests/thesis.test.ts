import test from "node:test";
import assert from "node:assert/strict";

import { PILLARS, PILLAR_IDS, THESIS } from "../src/data/thesis.ts";
import { METRICS } from "../src/data/metrics.ts";
import { METRIC_IDS, isMetricId } from "../src/data/metric-ids.ts";
import { caseStudies, caseStudyBySlug, caseStudiesByTheme, getRelatedCaseStudies, getThemeAdjacent } from "../src/data/case-studies.ts";
import { skillCategories, skillEvidence } from "../src/data/portfolio.ts";

test("the metric id list matches the metrics exactly, and ids are unique", () => {
  assert.deepEqual(METRICS.map((metric) => metric.id), [...METRIC_IDS]);
  assert.equal(new Set(METRIC_IDS).size, METRIC_IDS.length);
  for (const id of METRIC_IDS) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(isMetricId("mcp-servers"), true);
  assert.equal(isMetricId("constructor"), false);
});

test("every pillar points at a real metric, and at a real study when it names one", () => {
  assert.ok(THESIS.length > 0);
  assert.equal(new Set(PILLAR_IDS).size, 4);
  for (const pillar of PILLARS) {
    assert.ok(isMetricId(pillar.metricId), pillar.id);
    if (pillar.studySlug) assert.ok(caseStudyBySlug.has(pillar.studySlug), pillar.id);
    assert.match(pillar.askPrompt, /\?$/);
    assert.doesNotMatch(pillar.askPrompt, /\b(you|your)\b/i, "pillar prompts ask Nex about Nikunj in the third person");
  }
});

test("case-study results link only to real metrics, pillars are valid, summaries are one short line", () => {
  for (const study of caseStudies) {
    for (const result of study.results) if (result.metricId) assert.ok(isMetricId(result.metricId), `${study.slug}: ${result.metric}`);
    for (const pillar of study.pillars ?? []) assert.ok(PILLAR_IDS.includes(pillar), `${study.slug}: ${pillar}`);
    assert.ok(study.ownershipSummary.length > 0 && study.ownershipSummary.length <= 160, study.slug);
    assert.doesNotMatch(study.ownershipSummary, /\b(I|my|mine)\b/, `${study.slug}: summaries are about Nikunj, in the third person`);
  }
});

test("a result's metric is the same figure the study shows", () => {
  const byId = new Map(METRICS.map((metric) => [metric.id, metric]));
  const digits = (text: string) => text.replace(/[^0-9.]/g, "");
  for (const study of caseStudies) {
    for (const result of study.results) {
      if (!result.metricId) continue;
      const metric = byId.get(result.metricId)!;
      assert.ok(digits(metric.value).startsWith(digits(result.metric).slice(0, 2)), `${study.slug}: ${result.metric} vs ${metric.value}`);
    }
  }
});

test("theme order: prev/next walks the /work groups in order and visits every study once", () => {
  const ordered = caseStudiesByTheme.flatMap((group) => group.studies.map((study) => study.slug));
  assert.equal(ordered.length, caseStudies.length);
  assert.equal(getThemeAdjacent(ordered[0]!).previous, null);
  assert.equal(getThemeAdjacent(ordered[ordered.length - 1]!).next, null);
  for (let i = 1; i < ordered.length; i += 1) assert.equal(getThemeAdjacent(ordered[i]!).previous?.slug, ordered[i - 1]);
  assert.deepEqual(getThemeAdjacent("nope"), { previous: null, next: null });
});

test("related studies never include the study itself and share a pillar or theme", () => {
  for (const study of caseStudies) {
    const related = getRelatedCaseStudies(study.slug);
    assert.ok(related.length <= 3);
    for (const other of related) {
      assert.notEqual(other.slug, study.slug);
      const sharesPillar = (other.pillars ?? []).some((id) => (study.pillars ?? []).includes(id));
      assert.ok(sharesPillar || other.theme === study.theme, `${study.slug} -> ${other.slug}`);
    }
  }
});

test("skill evidence names real skills and links to real studies or sections", () => {
  const skills = new Set(skillCategories.flatMap((category) => category.skills));
  for (const [skill, evidence] of Object.entries(skillEvidence)) {
    assert.ok(skills.has(skill), `unknown skill "${skill}"`);
    const slug = evidence.href.match(/^\/work\/(.+)$/)?.[1];
    if (slug) assert.ok(caseStudyBySlug.has(slug), `${skill}: ${evidence.href}`);
    else assert.match(evidence.href, /^#[a-z-]+$/, `${skill}: ${evidence.href}`);
  }
});
