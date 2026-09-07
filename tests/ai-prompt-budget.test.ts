import test from "node:test";
import assert from "node:assert/strict";

import { caseStudies } from "../src/data/case-studies.ts";
import { PORTFOLIO_CONTEXT, PORTFOLIO_CONTEXT_BRIEF } from "../src/lib/ai-twin.ts";
import { SYSTEM_PROMPT } from "../src/lib/ai-config.ts";

/**
 * The system prompt is resent on every chat request, so its size is a recurring
 * cost rather than a one-off. Case-study prose used to be inlined in full, which
 * made that cost grow with every study added — the exact thing that would silently
 * regress if someone reinstates the full text "just for this one study".
 *
 * These budgets are deliberately generous. They are not style rules; they are here
 * to fail loudly if the per-request payload starts scaling with the archive again.
 */
const SYSTEM_PROMPT_BUDGET = 40_000;
const PORTFOLIO_CONTEXT_BUDGET = 28_000;
const BRIEF_BUDGET = 8_000;

test("the system prompt stays within its per-request budget", () => {
  assert.ok(
    SYSTEM_PROMPT.length < SYSTEM_PROMPT_BUDGET,
    `SYSTEM_PROMPT is ${SYSTEM_PROMPT.length} chars, over the ${SYSTEM_PROMPT_BUDGET} budget. ` +
      `If case-study prose was reinlined into PORTFOLIO_CONTEXT, use get_case_study instead.`
  );
});

test("portfolio context stays lean and the brief stays leaner", () => {
  assert.ok(
    PORTFOLIO_CONTEXT.length < PORTFOLIO_CONTEXT_BUDGET,
    `PORTFOLIO_CONTEXT is ${PORTFOLIO_CONTEXT.length} chars, over the ${PORTFOLIO_CONTEXT_BUDGET} budget.`
  );
  assert.ok(
    PORTFOLIO_CONTEXT_BRIEF.length < BRIEF_BUDGET,
    `PORTFOLIO_CONTEXT_BRIEF is ${PORTFOLIO_CONTEXT_BRIEF.length} chars, over the ${BRIEF_BUDGET} budget.`
  );
  assert.ok(
    PORTFOLIO_CONTEXT_BRIEF.length < PORTFOLIO_CONTEXT.length,
    "the brief must be smaller than the full context, or it serves no purpose"
  );
});

test("case-study depth is not inlined in the prompt", () => {
  // Sample the longest section body and decision rationale. Either appearing
  // verbatim means the full prose is back in the per-request payload.
  const longestBody = caseStudies
    .flatMap((study) => study.sections.map((section) => section.body))
    .sort((a, b) => b.length - a.length)[0];

  const longestWhy = caseStudies
    .flatMap((study) => study.decisions.map((decision) => decision.why))
    .sort((a, b) => b.length - a.length)[0];

  assert.ok(longestBody && longestWhy, "expected case studies to have sections and decisions");
  assert.ok(
    !PORTFOLIO_CONTEXT.includes(longestBody),
    "a section body is inlined in PORTFOLIO_CONTEXT; depth should come from get_case_study"
  );
  assert.ok(
    !PORTFOLIO_CONTEXT.includes(longestWhy),
    "a decision rationale is inlined in PORTFOLIO_CONTEXT; depth should come from get_case_study"
  );
});

test("the prompt still carries what must never be paraphrased", () => {
  // Ownership boundaries and the tool-fetch instruction have to survive slimming.
  for (const study of caseStudies) {
    assert.ok(
      PORTFOLIO_CONTEXT.includes(study.ownership),
      `ownership boundary for "${study.slug}" is missing from the prompt`
    );
    assert.ok(
      PORTFOLIO_CONTEXT.includes(study.slug),
      `slug "${study.slug}" is missing from the prompt, so get_case_study cannot be called for it`
    );
  }

  assert.match(SYSTEM_PROMPT, /get_case_study/, "the prompt must tell the model how to fetch depth");
  // The MCP figure is "10+" delivered into a shared registry — no total is
  // published, so the prompt must carry the count without a denominator.
  assert.match(SYSTEM_PROMPT, /10\+ production MCP servers/i, "the MCP count must stay in the prompt");
  assert.doesNotMatch(SYSTEM_PROMPT, /9 of (the )?14/, "the retired 9-of-14 ratio must not reappear");
});
