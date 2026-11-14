import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CHAT = readFileSync("src/components/AITwinChat.tsx", "utf8");
// The conversation logic moved into a shared store used by the panel and the ask bubble.
const STORE = readFileSync("src/lib/chat/twin-chat-store.ts", "utf8");
const ROUTE = readFileSync("src/app/api/chat/route.ts", "utf8");

/**
 * Guards two bugs that shipped together in the chat panel.
 *
 * Both came from the same root cause: the panel was written when a pending
 * answer had NOTHING on screen, and streaming changed that without the
 * surrounding UI being revisited.
 */

test("the typing indicator does not duplicate a streaming bubble", () => {
  /*
   * The standalone indicator predates streaming. Once the assistant bubble
   * started being placed on the first event — carrying its own status label and
   * tool trace — an unconditional `isLoading` indicator rendered a SECOND empty
   * bubble underneath the real one.
   */
  const guard = /\{isLoading && !messages\.some\(\(message\) => message\.streaming\)/;
  assert.match(
    CHAT,
    guard,
    "the typing indicator must only render when no assistant bubble is already streaming"
  );
});

test("a streaming bubble is marked as streaming when placed", () => {
  // The guard above is only correct if the seed actually sets the flag.
  assert.match(
    STORE,
    /role: "assistant", content: "", streaming: true/,
    "the placed bubble must set streaming: true, or the indicator guard never fires"
  );
});

test("status labels never leak retry internals", () => {
  /*
   * The keep-alive heartbeat is called once per retry attempt and originally
   * interpolated the attempt number, so the UI showed "attempt 1 Thinking …".
   * The attempt count is internal; the heartbeat's job is only to keep the
   * client's idle timer alive.
   */
  const statusSends = ROUTE.match(/send\(\{\s*type:\s*"status"[\s\S]{0,160}?\}\)/g) ?? [];
  assert.ok(statusSends.length > 0, "expected the route to send status events");

  for (const send of statusSends) {
    assert.doesNotMatch(send, /attempt/i, `a status label leaks retry internals: ${send.slice(0, 90)}`);
    assert.doesNotMatch(send, /\$\{attempt/, "the attempt number must not be interpolated into a label");
  }
});

test("the heartbeat callback ignores its attempt argument", () => {
  // Structural: the onAttempt callback passed at the call site must not thread
  // the attempt number into anything user-visible.
  const callSite = ROUTE.slice(ROUTE.indexOf("streamCompletionWithRetry("), ROUTE.indexOf("} catch (error) {", ROUTE.indexOf("streamCompletionWithRetry(")));
  assert.doesNotMatch(
    callSite,
    /\(attempt\)\s*=>\s*send/,
    "the heartbeat must not pass the attempt number through to a status label"
  );
});

test("the chat never chases the bottom while an answer streams", () => {
  /*
   * The old panel pinned the scroll to the bottom on every delta and every
   * reveal tick, so the question scrolled away while its answer was still
   * being read. A new question is now anchored to the top once per turn, and
   * a spacer below the answer makes that possible for short answers.
   */
  assert.doesNotMatch(CHAT, /isPinnedToBottomRef|keepPinnedToBottom|onReveal/, "bottom-pinning must not come back");
  assert.doesNotMatch(CHAT, /scrollTop\s*=\s*[^=]*scrollHeight/, "no unconditional scroll-to-bottom");
  assert.match(CHAT, /useTurnAnchor\(/, "the panel anchors turns with useTurnAnchor");
  assert.match(CHAT, /ref=\{spacerRef\}/, "the panel renders the anchor spacer");
});

test("tool calls lead only until the answer starts, then sit under it", () => {
  const body = readFileSync("src/components/ai/TwinAssistantBody.tsx", "utf8");
  const answerAt = body.indexOf("<PacedAnswer");
  assert.ok(body.indexOf("{!answered && toolList}") < answerAt, "running tools show above an empty answer");
  assert.ok(body.indexOf("{answered && toolList}") > answerAt, "once text arrives the tools move below it");
});
