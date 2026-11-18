import test from "node:test";
import assert from "node:assert/strict";

import { career, chatSuggestions, recognition } from "../src/data/portfolio.ts";
import { PORTFOLIO_CONTEXT } from "../src/lib/nex-knowledge.ts";

test("Nex is given the answers recruiters ask for first, so it never says 'not on this site'", () => {
  for (const fact of [career.location, career.relocation, career.workModes, career.engagement, career.noticePeriod, career.education, career.search, career.relocationPreference, career.companyPreference, career.workAuthorization, career.languages, career.compensation, ...career.targetRoles]) {
    assert.ok(PORTFOLIO_CONTEXT.includes(fact), `missing from Nex's context: ${fact}`);
  }
  assert.ok(PORTFOLIO_CONTEXT.includes(recognition.reason), "Nex knows what the AI Ninja Award was for");
});

test("the award text keeps out internal details Nikunj chose not to publish", () => {
  const text = `${recognition.detail} ${recognition.reason}`;
  assert.doesNotMatch(text, /\bBTA\b/, "no internal team name");
  assert.doesNotMatch(text, /\bCTO\b|director/i, "no reporting line");
  assert.doesNotMatch(text, /\b(two|2)[- ](person|member)/i, "no team size");
});

test("Meet Nex lists six prompts (the right column balances the left), and each one has an answer", () => {
  assert.equal(chatSuggestions.length, 6);
  assert.ok(!chatSuggestions.includes("Which role is he looking for next?"));
});

test("no pay figure is ever in Nex's context (pay is negotiable and discussed directly)", () => {
  assert.doesNotMatch(PORTFOLIO_CONTEXT, /(₹|\bINR\b|\bRs\.?\s?\d|\bLPA\b|\blakh|\bcrore|\bCTC\s*(is|of|:)\s*\d|\d{2},?\d{2},?\d{3})/i);
});
