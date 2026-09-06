import test from "node:test";
import assert from "node:assert/strict";

import { TOOL_DEFINITIONS, TOOL_NAMES, executeTool, formatToolCall } from "../src/lib/ai-tools.ts";
import { caseStudies } from "../src/data/case-studies.ts";

const call = (name: string, args: Record<string, unknown>) => executeTool({ id: "t1", name, args });

test("every tool definition is a well-formed OpenAI function schema", () => {
  for (const tool of TOOL_DEFINITIONS) {
    assert.equal(tool.type, "function");
    assert.ok(tool.function.name.length > 0);
    assert.ok(tool.function.description.length > 20, `${tool.function.name} needs a usable description`);
    assert.equal(tool.function.parameters.type, "object");
    assert.ok(Array.isArray(tool.function.parameters.required));
  }
  assert.deepEqual(TOOL_NAMES, ["search_work", "get_case_study", "get_metric", "compare_systems", "navigate_to"]);
});

test("search_work ranks production systems above side projects", () => {
  const result = call("search_work", { query: "evaluation" });
  const output = result.output as { hits: { kind: string; title: string }[] };

  assert.ok(output.hits.length > 0);
  assert.equal(output.hits[0].kind, "system");
  assert.equal(result.refused, false);
  assert.ok(result.sources.length > 0);
});

test("search_work matches multi-word queries against system aliases", () => {
  const output = call("search_work", { query: "tenant isolation" }).output as { hits: { id: string }[] };
  assert.ok(output.hits.some((hit) => hit.id === "knowledge-graph-rag"));
});

test("search_work reports no matches instead of inventing work", () => {
  const result = call("search_work", { query: "quantum blockchain casino" });
  const output = result.output as { hits: unknown[]; note?: string };

  assert.equal(output.hits.length, 0);
  assert.equal(result.refused, true);
  assert.match(String(output.note), /do not invent/i);
});

test("search_work can be narrowed by kind", () => {
  const output = call("search_work", { query: "Go", kind: "projects" }).output as { hits: { kind: string }[] };
  assert.ok(output.hits.every((hit) => hit.kind === "project"));
});

test("get_metric returns a measured value with its context", () => {
  const result = call("get_metric", { name: "cohen kappa" });
  const output = result.output as { measured: boolean; value: string; source: string };

  assert.equal(output.measured, true);
  assert.equal(output.value, "≥ 0.7");
  assert.ok(output.source.length > 0);
  assert.equal(result.refused, false);
});

test("get_metric refuses unknown metrics rather than estimating", () => {
  const result = call("get_metric", { name: "monthly active users" });
  const output = result.output as { measured: boolean; reason: string };

  assert.equal(output.measured, false);
  assert.equal(result.refused, true);
  assert.match(output.reason, /not.*(measured|published)/i);
});

test("get_metric never exposes absolute internal spend", () => {
  const output = call("get_metric", { name: "cost" }).output as { value: string; context: string };
  const combined = `${output.value} ${output.context}`;

  assert.match(output.value, /57%/);
  assert.doesNotMatch(combined, /\$\d/, "dollar figures must never be published");
});

test("get_case_study can fetch a single section", () => {
  const output = call("get_case_study", { slug: "llm-evaluation-platform", section: "ownership" }).output as {
    ownership: string;
    problem?: string;
  };

  assert.match(output.ownership, /platform DevOps/);
  assert.equal(output.problem, undefined, "section fetch should not return the whole study");
});

test("get_case_study reports not-found for an unknown slug", () => {
  const result = call("get_case_study", { slug: "does-not-exist" });
  assert.equal(result.refused, true);
  assert.deepEqual(result.output, { found: false });
});

test("navigate_to resolves sections, case studies, projects, and the resume", () => {
  assert.equal((call("navigate_to", { target: "#contact" }).output as { href: string }).href, "#contact");
  assert.equal(
    (call("navigate_to", { target: "knowledge-graph-rag" }).output as { href: string }).href,
    "/work/knowledge-graph-rag"
  );
  // A slug that is only a project still resolves to its homepage anchor.
  assert.equal(
    (call("navigate_to", { target: "resume-fit-codenex" }).output as { href: string }).href,
    "#project-resume-fit-codenex"
  );
  // A slug that is BOTH a project and a case study resolves to the case study,
  // which covers the same subject in far more depth.
  assert.equal((call("navigate_to", { target: "serenify" }).output as { href: string }).href, "/work/serenify");
  assert.match((call("navigate_to", { target: "resume" }).output as { href: string }).href, /\.pdf$/);
});

test("navigate_to rejects targets outside the allow-list", () => {
  const result = call("navigate_to", { target: "/admin" });
  const output = result.output as { ok: boolean; reason: string };

  assert.equal(output.ok, false);
  assert.equal(result.refused, true);
  assert.match(output.reason, /not a valid destination/i);
});

test("compare_systems needs at least two valid slugs", () => {
  const ok = call("compare_systems", { slugs: ["llm-evaluation-platform", "governed-mcp-registry"] });
  assert.equal(ok.refused, false);
  assert.equal((ok.output as { systems: unknown[] }).systems.length, 2);

  const tooFew = call("compare_systems", { slugs: ["llm-evaluation-platform"] });
  assert.equal(tooFew.refused, true);
});

test("an unknown tool name fails closed", () => {
  const result = call("delete_everything", {});
  assert.equal(result.refused, true);
  assert.match(String((result.output as { reason: string }).reason), /unknown tool/i);
});

test("formatToolCall truncates long arguments for display", () => {
  assert.equal(formatToolCall("search_work", { query: "rag" }), 'search_work("rag")');
  const long = formatToolCall("search_work", { query: "x".repeat(120) });
  assert.ok(long.length < 70, "display label must stay compact");
  assert.match(long, /\.\.\.$|\.\.\."\)$/);
});

test("tools report a duration so the trace can show latency", () => {
  const result = call("search_work", { query: "rag" });
  assert.equal(typeof result.durationMs, "number");
  assert.ok(result.durationMs >= 0);
});

test("get_case_study returns detail for every published slug", () => {
  for (const study of caseStudies) {
    const result = call("get_case_study", { slug: study.slug });
    assert.equal(result.refused, false, `${study.slug} should resolve`);
    const output = result.output as Record<string, unknown>;
    assert.equal(output.title, study.title);
    assert.equal(output.link, `/work/${study.slug}`);
  }
});

test("get_case_study exposes the depth the prompt no longer inlines", () => {
  // Case-study prose was removed from the system prompt, so this path is now the
  // only way the agent can answer an architecture or decision question.
  const output = call("get_case_study", { slug: "code-intelligence-gateway", section: "decisions" })
    .output as { decisions?: Array<{ choice: string; rejected?: string[] }> };

  assert.ok(Array.isArray(output.decisions) && output.decisions.length > 0);
  assert.ok(
    output.decisions.some((decision) => (decision.rejected?.length ?? 0) > 0),
    "expected at least one rejected alternative in the returned decisions"
  );
});

test("navigate_to resolves the case study index", () => {
  const result = call("navigate_to", { target: "case studies" });
  assert.equal(result.refused, false);
  assert.equal((result.output as { href?: string }).href, "/work");
});

test("get_metric answers for a newly published figure and still refuses unknowns", () => {
  const measured = call("get_metric", { name: "dashboards" });
  assert.equal((measured.output as { measured?: boolean }).measured, true);

  const unknown = call("get_metric", { name: "number of coffees per sprint" });
  assert.equal((unknown.output as { measured?: boolean }).measured, false);
});

test("get_metric ranks by specificity instead of array order", () => {
  // Regression: bidirectional substring matching with `find` let a short key
  // swallow a longer query. "8" (business functions) preceded "8 repositories",
  // and "tiers" preceded "3 tiers", so both returned a confidently WRONG number
  // from an unrelated system — the worst failure for a tool whose contract is
  // "never state a figure you did not verify".
  const repos = call("get_metric", { name: "8 repositories" }).output as { value?: string; source?: string };
  assert.equal(repos.source, "Code Intelligence Gateway");
  assert.equal(repos.value, "8");

  const tiers = call("get_metric", { name: "3 tiers" }).output as { source?: string };
  assert.equal(tiers.source, "Quill");

  // An exact key still wins outright.
  const dashboards = call("get_metric", { name: "dashboards" }).output as { value?: string };
  assert.equal(dashboards.value, "19");
});

test("search_work matches two-character technology names", () => {
  // Regression: a `length > 2` term filter dropped every short term, so the
  // tool's own documented example query returned nothing — as did AI and RAG.
  for (const query of ["Go", "AI", "RAG"]) {
    const output = call("search_work", { query }).output as { hits: unknown[] };
    assert.ok(output.hits.length > 0, `"${query}" should return matches`);
  }

  // A genuinely unmatched query must still refuse rather than guess.
  const nonsense = call("search_work", { query: "quantum blockchain casino" });
  assert.equal(nonsense.refused, true);
});
