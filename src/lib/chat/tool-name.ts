/**
 * Reassembling streamed tool calls (OpenAI-style `delta.tool_calls`).
 *
 * Two provider quirks, both seen live through Bifrost:
 *  - Parallel calls all arrive at `index: 0`, told apart only by a new `id`.
 *    Keying on index alone merged two calls into one unknown tool
 *    ("compare_systemsget_case_study") and both were refused.
 *  - A name can be repeated in full in a later chunk; plain appending doubled
 *    it ("compare_systemscompare_systems").
 */
export type StreamedToolCall = { id?: string; name: string; args: string };
export type ToolCallDelta = { index?: number; id?: string; function?: { name?: string; arguments?: string } };

export function mergeToolName(current: string, chunk: string) {
  if (!current) return chunk;
  if (chunk === current || chunk.startsWith(current)) return chunk;
  return current + chunk;
}

/**
 * Adds one streamed fragment. A fragment goes to the call at its `index`,
 * except that a new `id` at an index already holding a different call opens a
 * new slot, and from then on that index's id-less fragments follow the newest
 * call opened there (`latestAt`).
 */
export function addToolCallDelta(calls: Map<number, StreamedToolCall>, delta: ToolCallDelta, latestAt = latestSlots(calls)) {
  const wire = delta.index ?? 0;
  let slot = latestAt.get(wire) ?? wire;
  const current = calls.get(slot);
  if (delta.id && current?.id && current.id !== delta.id) {
    slot = Math.max(...calls.keys()) + 1;
    latestAt.set(wire, slot);
  }
  const call = calls.get(slot) ?? { id: undefined, name: "", args: "" };
  if (delta.id) call.id = delta.id;
  if (delta.function?.name) call.name = mergeToolName(call.name, delta.function.name);
  if (delta.function?.arguments) call.args += delta.function.arguments;
  calls.set(slot, call);
}

/** Per-map memory of which slot each wire index currently writes to. */
const slotMemory = new WeakMap<Map<number, StreamedToolCall>, Map<number, number>>();
function latestSlots(calls: Map<number, StreamedToolCall>) {
  let memory = slotMemory.get(calls);
  if (!memory) slotMemory.set(calls, (memory = new Map()));
  return memory;
}
