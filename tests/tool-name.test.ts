import test from "node:test";
import assert from "node:assert/strict";
import { mergeToolName } from "../src/lib/chat/tool-name.ts";

const join = (chunks: string[]) => chunks.reduce(mergeToolName, "");

test("a name split across chunks is joined", () => {
  assert.equal(join(["get_", "case_study"]), "get_case_study");
  assert.equal(join(["compare", "_", "systems"]), "compare_systems");
});

test("a name repeated in full is not doubled (seen live: compare_systemscompare_systems)", () => {
  assert.equal(join(["compare_systems", "compare_systems"]), "compare_systems");
  assert.equal(join(["get_case_study", "get_case_study"]), "get_case_study");
  assert.equal(join(["get_", "get_case_study"]), "get_case_study");
});

import { addToolCallDelta, type StreamedToolCall } from "../src/lib/chat/tool-name.ts";

const assemble = (deltas: Parameters<typeof addToolCallDelta>[1][]) => {
  const calls = new Map<number, StreamedToolCall>();
  for (const delta of deltas) addToolCallDelta(calls, delta);
  return [...calls.values()];
};

test("parallel calls sent at the same index stay separate (as this provider streams them)", () => {
  const calls = assemble([
    { index: 0, id: "a", function: { name: "get_case_study", arguments: "" } },
    { index: 0, function: { arguments: '{"slug":"quill"}' } },
    { index: 0, id: "b", function: { name: "compare_systems", arguments: "" } },
    { index: 0, function: { arguments: '{"slugs":["x","y"]}' } },
  ]);
  assert.deepEqual(calls.map((call) => [call.id, call.name, call.args]), [
    ["a", "get_case_study", '{"slug":"quill"}'],
    ["b", "compare_systems", '{"slugs":["x","y"]}'],
  ]);
});

test("standard indexed streaming still works", () => {
  const calls = assemble([
    { index: 0, id: "a", function: { name: "get_", arguments: "" } },
    { index: 1, id: "b", function: { name: "search_work", arguments: "" } },
    { index: 0, function: { name: "metric", arguments: '{"name":' } },
    { index: 0, function: { arguments: '"kappa"}' } },
    { index: 1, function: { arguments: '{"query":"rag"}' } },
  ]);
  assert.deepEqual(calls.map((call) => [call.name, call.args]), [
    ["get_metric", '{"name":"kappa"}'],
    ["search_work", '{"query":"rag"}'],
  ]);
});
