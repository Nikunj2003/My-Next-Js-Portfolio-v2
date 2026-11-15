import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CARD_PATTERN, cardForToolResult, parseCard } from "../src/lib/chat/cards.ts";
import { executeTool } from "../src/lib/ai-tools.ts";
import { sanitizeStoredMessages } from "../src/lib/chat/nex-chat-store.ts";

test("cards parse only ids and slugs the site publishes", () => {
  assert.deepEqual(parseCard("metric:judge-kappa"), { kind: "metric", id: "judge-kappa" });
  assert.deepEqual(parseCard("study:quill"), { kind: "study", slug: "quill" });
  assert.deepEqual(parseCard("compare:quill,serenify"), { kind: "compare", slugs: ["quill", "serenify"] });
  for (const bad of ["metric:nope", "study:nope", "compare:quill", "compare:quill,nope", "study:../x", "script:alert", "", 42, null, `study:${"a".repeat(130)}`]) {
    assert.equal(parseCard(bad), null, String(bad));
  }
});

test("the server builds cards from the tool's own successful output, never from refused calls", () => {
  const metric = executeTool({ id: "1", name: "get_metric", args: { name: "kappa" } });
  assert.equal(cardForToolResult("get_metric", metric.refused, metric.output), "metric:judge-kappa");

  const unmeasured = executeTool({ id: "2", name: "get_metric", args: { name: "salary" } });
  assert.equal(cardForToolResult("get_metric", unmeasured.refused, unmeasured.output), undefined);

  const study = executeTool({ id: "3", name: "get_case_study", args: { slug: "quill", section: "results" } });
  assert.equal(cardForToolResult("get_case_study", study.refused, study.output), "study:quill");

  const compare = executeTool({ id: "4", name: "compare_systems", args: { slugs: ["governed-mcp-registry", "knowledge-graph-rag"] } });
  assert.equal(cardForToolResult("compare_systems", compare.refused, compare.output), "compare:governed-mcp-registry,knowledge-graph-rag");

  const missing = executeTool({ id: "5", name: "get_case_study", args: { slug: "nope" } });
  assert.equal(cardForToolResult("get_case_study", missing.refused, missing.output), undefined);
  assert.equal(cardForToolResult("navigate_to", false, { href: "#work" }), undefined);
});

test("every card the server can build fits the pattern", () => {
  assert.ok(CARD_PATTERN.test("compare:governed-mcp-registry,knowledge-graph-rag,llm-evaluation-platform"));
});

test("a hostile stored card is dropped, a valid one survives a reload", () => {
  const stored = [
    { id: "u", role: "user", content: "q" },
    { id: "a", role: "assistant", content: "x", toolCalls: [{ id: "t1", name: "get_metric", label: "get_metric()", card: "metric:judge-kappa" }, { id: "t2", name: "x", label: "x", card: "study:<img onerror=1>" }] },
  ];
  const [message] = sanitizeStoredMessages(stored).filter((m) => m.id === "a");
  assert.equal(message?.toolCalls?.[0]?.card, "metric:judge-kappa");
  assert.equal(message?.toolCalls?.[1]?.card, undefined);
});

test("the route attaches the card to the tool result it streams", () => {
  const route = readFileSync("src/app/api/chat/route.ts", "utf8");
  assert.match(route, /card: cardForToolResult\(name, result\.refused, result\.output\)/);
});
