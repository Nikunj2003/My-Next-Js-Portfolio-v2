import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors the reference-counting in src/hooks/useLenisLock.ts, where `stops`
 * and `starts` stand for setting and removing `data-lenis-prevent` on body.
 *
 * Two failures this guards against: a nested overlay's teardown releasing the
 * lock while another overlay is still open (background scrolls again), and a
 * stray release driving the count negative so a later lock is off by one and
 * the attribute is never applied.
 */
function createLock() {
  let count = 0;
  let stops = 0;
  let starts = 0;

  return {
    acquire() {
      count += 1;
      if (count === 1) stops += 1;
    },
    release() {
      count = Math.max(0, count - 1);
      if (count === 0) starts += 1;
    },
    get state() {
      return { count, stops, starts };
    },
  };
}

test("a single overlay applies then removes the prevent attribute once", () => {
  const lock = createLock();

  lock.acquire();
  assert.deepEqual(lock.state, { count: 1, stops: 1, starts: 0 });

  lock.release();
  assert.deepEqual(lock.state, { count: 0, stops: 1, starts: 1 });
});

test("nested overlays keep the lock until the last one closes", () => {
  const lock = createLock();

  lock.acquire(); // chat
  lock.acquire(); // palette over chat
  assert.equal(lock.state.stops, 1, "the attribute should only be applied once");

  lock.release(); // palette closes
  assert.equal(lock.state.starts, 0, "must stay locked while the chat is open");

  lock.release(); // chat closes
  assert.equal(lock.state.starts, 1, "resumes only after the last overlay");
});

test("stray releases cannot drive the count negative", () => {
  const lock = createLock();

  lock.release();
  lock.release();
  assert.equal(lock.state.count, 0, "count must clamp at zero");

  // A later overlay must still lock correctly rather than being off by one.
  lock.acquire();
  assert.equal(lock.state.count, 1);
  assert.equal(lock.state.stops, 1);
});

test("repeated open/close cycles stay balanced", () => {
  const lock = createLock();

  for (let i = 0; i < 5; i += 1) {
    lock.acquire();
    lock.release();
  }

  assert.deepEqual(lock.state, { count: 0, stops: 5, starts: 5 });
});
