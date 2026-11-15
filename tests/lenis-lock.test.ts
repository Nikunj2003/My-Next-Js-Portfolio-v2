import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SOURCE = readFileSync("src/lib/scroll-lock.ts", "utf8");

test("the lock never uses data-lenis-prevent on body", () => {
  // Lenis slices composedPath() up to html, and body survives the slice, so the
  // attribute on body matches every wheel event and disables smooth scroll site-wide.
  assert.doesNotMatch(SOURCE, /data-lenis-prevent/);
  assert.doesNotMatch(SOURCE, /setAttribute/);
});

test("the lock uses isLocked, not stop()", () => {
  // stop() also halts the animation loop, so the first scroll after closing jumps.
  assert.match(SOURCE, /lenis\.isLocked = locked/);
  assert.doesNotMatch(SOURCE, /\.stop\(\)/);
});

test("the lock is re-asserted after Lenis restarts", () => {
  // lenis.start() resets the instance and clears isLocked: after a tab switch
  // the page scrolled behind an open overlay.
  const smooth = readFileSync("src/components/SmoothScroll.tsx", "utf8");
  const resume = smooth.slice(smooth.indexOf("lenis.start();"));
  assert.match(resume.slice(0, 200), /reapplyScrollLock\(\)/, "re-lock right after start()");
  assert.match(smooth, /appWindow\.__lenis = lenis;\n\s*\/\/[^\n]*\n\s*reapplyScrollLock\(\)/, "and once Lenis exists");
});

function fakeDom(lenis: { isLocked: boolean } | undefined, coarse = false) {
  const body = { style: { overflow: "" } };
  const html = { style: { overflow: "" } };
  (globalThis as unknown as { window: unknown }).window = { __lenis: lenis, matchMedia: () => ({ matches: coarse }) };
  (globalThis as unknown as { document: unknown }).document = { body, documentElement: html };
  return { body, html };
}

test("nested overlays lock once and release once; a stray release is ignored", async () => {
  const lock = await import("../src/lib/scroll-lock.ts");
  const lenis = { isLocked: false };
  fakeDom(lenis);
  lock.acquireScrollLock();
  lock.acquireScrollLock();
  assert.equal(lenis.isLocked, true);
  lock.releaseScrollLock();
  assert.equal(lenis.isLocked, true, "the first to close must not release the other's lock");
  lock.releaseScrollLock();
  assert.equal(lenis.isLocked, false);
  lock.releaseScrollLock();
  assert.equal(lock.isScrollLocked(), false, "count must not go negative");
});

test("after Lenis resets itself, reapply locks it again", async () => {
  const lock = await import("../src/lib/scroll-lock.ts");
  const lenis = { isLocked: false };
  fakeDom(lenis);
  lock.acquireScrollLock();
  lenis.isLocked = false; // what lenis.start() does
  lock.reapplyScrollLock();
  assert.equal(lenis.isLocked, true);
  lock.releaseScrollLock();
});

test("without Lenis (reduced motion) the page is locked with overflow, restored in order", async () => {
  const lock = await import("../src/lib/scroll-lock.ts");
  const { body, html } = fakeDom(undefined);
  body.style.overflow = "clip";
  lock.acquireScrollLock();
  assert.equal(body.style.overflow, "hidden");
  assert.equal(html.style.overflow, "hidden");
  lock.acquireScrollLock();
  lock.releaseScrollLock();
  assert.equal(body.style.overflow, "hidden", "still locked while another overlay is open");
  lock.releaseScrollLock();
  assert.equal(body.style.overflow, "clip", "the original value comes back once");
  assert.equal(html.style.overflow, "");
});

test("on touch screens overflow is locked too (touch bypasses Lenis)", async () => {
  const lock = await import("../src/lib/scroll-lock.ts");
  const lenis = { isLocked: false };
  const { body } = fakeDom(lenis, true);
  lock.acquireScrollLock();
  assert.equal(lenis.isLocked, true);
  assert.equal(body.style.overflow, "hidden");
  lock.releaseScrollLock();
  assert.equal(body.style.overflow, "");
});

/**
 * The lock must match modality, not merely "an overlay is open".
 *
 * The Nex renders two different surfaces: a `fixed inset-0` modal with a
 * backdrop on mobile, and a 20-24rem corner panel with NO scrim on desktop.
 * Locking both froze the page behind a non-modal panel the visitor is meant to
 * read alongside the page.
 */
test("Nex only locks scroll on mobile", () => {
  const source = readFileSync("src/components/NexChat.tsx", "utf8");

  assert.match(
    source,
    /useLenisLock\(isOpen && isMobile\)/,
    "the chat must only lock the page for its full-screen mobile layout"
  );

  /*
   * Guards the premise rather than just the current code: the mobile-only lock
   * is correct *because* the desktop panel has no scrim. If it ever gains one it
   * becomes modal, and this decision must be revisited rather than left
   * silently wrong.
   *
   * Anchored on the code comment marking the branch, not the bare word
   * "Desktop" — that also appears in prose above and swallowed the mobile
   * branch, which does legitimately have a backdrop.
   */
  const desktopBranch = source.slice(source.indexOf("// Desktop:"));
  assert.ok(desktopBranch.length > 0, "expected a marked desktop branch");
  assert.doesNotMatch(
    desktopBranch,
    /fixed inset-0 z-50 bg-black/,
    "the desktop panel gained a scrim, so it is now modal — revisit the mobile-only lock"
  );
});

test("genuinely modal overlays still lock", () => {
  // Both have a full-screen scrim, so the page behind them must not move.
  const palette = readFileSync("src/components/CommandPalette.tsx", "utf8");
  assert.match(palette, /useLenisLock\(open\)/, "the command palette is modal and must lock");
  assert.match(palette, /fixed inset-0[^"]*bg-black\//, "…because it renders a full-screen scrim");

  const navbar = readFileSync("src/components/Navbar.tsx", "utf8");
  assert.match(navbar, /useLenisLock\(isOpen\)/, "the mobile menu is modal and must lock");
});
