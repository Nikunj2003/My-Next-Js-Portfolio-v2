import test from "node:test";
import assert from "node:assert/strict";

import { caseStudies } from "../src/data/case-studies.ts";
import { caseStudyIndex } from "../src/data/case-study-index.ts";

test("the palette's search index matches the case studies", () => {
  const expected = caseStudies.map(({ slug, title, tags, stack, aliases }) => ({ slug, title, tags, stack, aliases }));
  assert.deepEqual(caseStudyIndex, expected, "regenerate src/data/case-study-index.ts from case-studies.ts");
});
