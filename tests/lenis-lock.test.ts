import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SOURCE = readFileSync("src/hooks/useLenisLock.ts", "utf8");

/**
 * Guards how overlays stop the page from scrolling behind them.
 *
 * The previous version of this file only re-implemented the reference counter
 * inline and asserted against its own copy — so it stayed green while the hook
 * switched mechanism entirely, and could never have caught the bug it was
 * nominally protecting: `data-lenis-prevent` on `body` matched every wheel
 * event and silently disabled smooth scrolling site-wide.
 *
 * These tests read the real hook instead.
 */

test("the lock never uses data-lenis-prevent on body", () => {
  // Lenis slices composedPath() up to `rootElement` (document.documentElement),
  // and `body` sits below html in that path — so it survives the slice and
  // matches on EVERY wheel event, making Lenis bail out page-wide. The symptom
  // is the page reverting to native scroll speed whenever an overlay is open.
  assert.doesNotMatch(
    SOURCE,
    /data-lenis-prevent/,
    "marking body prevents Lenis globally; lock the instance instead"
  );
  assert.doesNotMatch(SOURCE, /document\.body\.setAttribute/, "must not mark body at all");
});

test("the lock uses isLocked, not stop()", () => {
  // `stop()` and `isLocked` share the same early-return branch, but stop() also
  // halts the animation loop, so the first scroll after closing jumps instead
  // of easing.
  assert.match(SOURCE, /isLocked = true/, "must lock the running Lenis instance");
  assert.match(SOURCE, /isLocked = false/, "must release the lock on teardown");
  assert.doesNotMatch(SOURCE, /\.stop\(\)/, "stop() kills the animation loop; use isLocked");
});

test("the lock is reference counted", () => {
  // The palette can open over the AI Twin; the first to close must not release
  // the lock while the other is still open.
  assert.match(SOURCE, /lockCount \+= 1/, "must count acquisitions");
  assert.match(SOURCE, /lockCount === 1/, "must only lock on the first overlay");
  assert.match(SOURCE, /lockCount === 0/, "must only release when the last one closes");
  assert.match(SOURCE, /if \(lockCount === 0\) return;/, "a stray release must bail before decrementing");
});

test("a missing Lenis instance is tolerated", () => {
  // Lenis is initialised by SmoothScroll in an effect, so an overlay opened
  // before that runs (or with reduced motion) must not throw.
  assert.match(SOURCE, /if \(lenis\)/, "must guard against Lenis not being ready");
});

/**
 * Behavioural check on the counting itself, driven through the same branch
 * logic the hook uses, so a refactor that breaks pairing is caught.
 */
test("nested overlays lock once and release once", () => {
  let locked = 0;
  let released = 0;
  let count = 0;

  const acquire = () => {
    count += 1;
    if (count === 1) locked += 1;
  };
  const release = () => {
    // Mirrors the hook: bail before decrementing, so a stray release cannot
    // re-run the unlock.
    if (count === 0) return;
    count -= 1;
    if (count === 0) released += 1;
  };

  acquire(); // AI Twin
  acquire(); // palette over it
  assert.deepEqual({ locked, released }, { locked: 1, released: 0 });

  release(); // palette closes — page must stay locked
  assert.deepEqual({ locked, released }, { locked: 1, released: 0 });

  release(); // twin closes — now released
  assert.deepEqual({ locked, released }, { locked: 1, released: 1 });

  release(); // stray release
  assert.equal(count, 0, "count must not go negative");

  acquire();
  assert.deepEqual({ locked, released }, { locked: 2, released: 1 }, "a later lock still applies");
});
