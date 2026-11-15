import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bubble = readFileSync(new URL("../src/components/guide/NexBubble.tsx", import.meta.url), "utf8");
const companion = readFileSync(new URL("../src/components/guide/GuideCompanion.tsx", import.meta.url), "utf8");

test("one frame loop places the avatar; the bubble is derived from the same values in the same frame", () => {
  // On Framer Motion's frame loop, after Lenis (read step) and before render.
  assert.match(companion, /frameLoop\.update\(tick, true\)/);
  assert.doesNotMatch(companion, /requestAnimationFrame\(tick\)/);
  const smooth = readFileSync(new URL("../src/components/SmoothScroll.tsx", import.meta.url), "utf8");
  assert.match(smooth, /frame\.read\(step, true\)/, "Lenis scrolls in the read step of the same loop");
  assert.match(companion, /anchorX=\{posX\}/);
  // The bubble is placed by its own step on the same frame loop, after the companion's.
  assert.match(bubble, /frame\.preRender\(step, true\)/);
  assert.match(bubble, /placeBubbleBeside/);
});

test("no springs chasing targets, no async positioning, no freezing", () => {
  assert.doesNotMatch(companion, /useSpring/);
  assert.doesNotMatch(bubble, /floating-ui/);
  assert.doesNotMatch(companion, /frozenRef/);
});

test("scrolling the page is never blocked by the bubble riding under a still pointer", () => {
  // The bubble used to cancel every wheel event over it, so the page froze
  // whenever it slid under the cursor. Only the answer area takes the wheel,
  // and only while it actually overflows.
  assert.doesNotMatch(bubble, /addEventListener\("wheel"/);
  assert.doesNotMatch(bubble, /preventDefault/);
  const ask = readFileSync(new URL("../src/components/guide/AskContent.tsx", import.meta.url), "utf8");
  assert.match(ask, /data-lenis-prevent=\{bodyScrolls \|\| undefined\}/);
});

test("the hand-off has no timer or rate cap: it is drawn from the scroll position each frame", () => {
  assert.doesNotMatch(companion, /MORPH_MS/);
  assert.match(companion, /heroHandoffProgress\(heroBox\.top/);
  // The hero is styled from the same frame object as the companion.
  assert.match(companion, /styleHero\(frame\)/);
});

test("nothing is drawn until the page has settled after a load or refresh", () => {
  assert.match(companion, /const visible = settled &&/);
  const slot = readFileSync(new URL("../src/components/guide/GuideAvatarSlot.tsx", import.meta.url), "utf8");
  // The still drawing stays until the live avatar has drawn, then they cross-fade.
  assert.match(slot, /opacity: drawn \? 0 : 1/);
});

test("the hero hand-off measures the hero's layout box, not the box it is scaling", () => {
  // Reading the transformed box fed each frame's shrink into the next frame's
  // progress, so the hand-off never settled near its midpoint.
  assert.match(companion, /heroLayoutRect\(hero\)/);
  assert.doesNotMatch(companion, /hero\?\.getBoundingClientRect\(\)/);
});

test("the hero hands off straight to About's spot (no second hop at the hero/About boundary)", () => {
  assert.match(companion, /hero: ABOUT,\n\s+about: ABOUT,/);
  assert.match(companion, /underPanelPoint\(/);
});

test("the faded hero never catches clicks", () => {
  assert.match(companion, /hero\.style\.pointerEvents = frame && frame\.heroOpacity < 0\.5 \? "none" : ""/);
});

test("phones keep the companion in the corner (touch scroll is native; riding it trails)", () => {
  assert.match(companion, /const cornerOnly = touring \|\| companion\.panelOpen \|\| isMobile;/);
});

test("other pages have their own spots; only an unknown page uses the corner", () => {
  // It was cornered on every page but the homepage (a regression of 18003a6).
  assert.doesNotMatch(companion, /cornerOnly = [^;]*!isHome/);
  assert.match(companion, /if \(route !== "home"\) return ROUTE_RULES\[route\] \?\? CORNER;/);
  assert.match(companion, /"case-study": CASE_STUDY_RULE,/);
  assert.match(companion, /"work-index": WORK_INDEX_RULE,/);
  const toc = readFileSync(new URL("../src/components/CaseStudyToc.tsx", import.meta.url), "utf8");
  assert.match(toc, /data-guide-route-spot="toc"/);
});

test("changing page is one hop from where it was to its new spot (links, the agent, back)", () => {
  assert.match(companion, /let lastDrawn: /);
  assert.match(companion, /departed\.path !== pathname/);
  assert.match(companion, /routeTravelFrame\(/);
  // Into the homepage with the hero on screen it lands on the hero avatar.
  assert.match(companion, /travel\.toHero = heroGuides;/);
});

test("the bubble is never shown before it has been measured and placed on its real side", () => {
  assert.match(bubble, /visibility: ready \? "visible" : "hidden"/);
});

test("the companion and the hero avatar pause when they can't be seen", () => {
  assert.match(companion, /paused=\{!visible && !travelling\}/, "live while travelling to its spot");
  assert.match(companion, /prefersStatic\(\)/, "low-power devices get the still drawing");
  const hero = readFileSync(new URL("../src/components/guide/GuideHeroAvatar.tsx", import.meta.url), "utf8");
  assert.match(hero, /paused=\{isMobile \|\| handedOff\}/);
});

test("the companion finds its anchors by data attributes, not layout class names", () => {
  assert.doesNotMatch(companion, /col-span-5|\.panel-sticky|container-narrow > div|\.grid\.items-stretch/);
});

test("the bubble keeps the side being read after a spot change, and follows its current node", () => {
  assert.match(bubble, /setTimeout\(\(\) => choose\(false\), 600\)/);
  assert.match(bubble, /ref=\{setNode\}/);
  assert.match(bubble, /AnimatePresence mode="wait"/);
});

test("the hand-off is paced for a normal scroll, and a change of bubble side fades", () => {
  assert.match(companion, /const HANDOFF_SPAN = 1\.1;/);
  const placement = readFileSync(new URL("../src/lib/guide/placement.ts", import.meta.url), "utf8");
  assert.match(placement, /export const FADE_SHARE = 0\.45;/);
  assert.match(bubble, /const SIDE_SWITCH_MS = 260;/);
  assert.match(bubble, /el\.style\.filter = filter;/);
});

test("placing the bubble never schedules itself (it used to double its callbacks every frame)", () => {
  assert.doesNotMatch(bubble, /useTransform/);
  const placement = bubble.slice(bubble.indexOf("placeRef.current = (now: number) =>"), bubble.indexOf("frame.preRender(step, true)"));
  assert.doesNotMatch(placement, /requestAnimationFrame/);
});

test("during the cross-fade both discs show one face (the companion mirrors the hero's drawing)", () => {
  assert.match(companion, /mirrorHero\(hero, mirrorRef\.current, size\)/);
  assert.match(companion, /const mirroring = handingOff && morph < FADE_SHARE;/);
  // Sized by style: the library's inline 300px style beats a width attribute.
  assert.match(companion, /copy\.style\.width = inner;/);
});
