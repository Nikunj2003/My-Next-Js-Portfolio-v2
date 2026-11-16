import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { INTRO, introTotalMs, nameArcFrames, shouldPlayIntro } from "../src/lib/hero-intro.ts";

const base = { path: "/", hash: "", scrollY: 0, width: 1440, reducedMotion: false };

test("the intro plays on every load of the homepage at the top, and only there", () => {
  assert.equal(shouldPlayIntro(base), true);
  assert.equal(shouldPlayIntro({ ...base, hash: "#work" }), false, "a link to a section");
  assert.equal(shouldPlayIntro({ ...base, scrollY: 400 }), false, "a reload that restores a scrolled position");
  assert.equal(shouldPlayIntro({ ...base, width: 390 }), true, "phones and tablets get the intro too");
  assert.equal(shouldPlayIntro({ ...base, width: 300 }), false, "below the narrowest supported phone");
  assert.equal(shouldPlayIntro({ ...base, reducedMotion: true }), false);
  assert.equal(shouldPlayIntro({ ...base, path: "/work" }), false);
});

test("it is not limited to once per tab (refreshing at the top plays it again)", () => {
  const source = readFileSync("src/lib/hero-intro.ts", "utf8") + readFileSync("src/app/layout.tsx", "utf8");
  assert.doesNotMatch(source, /hero-intro-seen/);
});

test("the beats run in order: asleep, wakes, settles with the name, then the rest; inside the 4s failsafe", () => {
  assert.ok(INTRO.sleepMs > 0 && INTRO.wakeMs > 0 && INTRO.moveMs > 0);
  assert.ok(INTRO.copyStartMs > INTRO.nameStartMs, "the name arrives before the rest");
  const hero = readFileSync("src/components/HeroSection.tsx", "utf8") + readFileSync("src/components/HeroAskButton.tsx", "utf8");
  const parts = (hero.match(/data-hero-part="copy"/g) ?? []).length;
  assert.ok(introTotalMs(parts) + INTRO.avatarTimeoutMs <= INTRO.deadlineMs + 1500, "the wait for the avatar runs alongside, bounded");
  assert.ok(introTotalMs(parts) < INTRO.deadlineMs);
  assert.equal(INTRO.deadlineMs, 4000, "the JS deadline matches the CSS failsafe");
});

test("each half of the name travels a mirrored arc and lands exactly in place", () => {
  const left = nameArcFrames({ left: true, distance: 500, lift: 60 });
  const right = nameArcFrames({ left: false, distance: 500, lift: 60 });
  const xy = (frame: { transform: string }) => frame.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/)!.slice(1).map((n) => Number(n) + 0);
  assert.deepEqual(xy(left[0]!), [-500, 60], "starts off its own side, slightly low");
  assert.deepEqual(xy(right[0]!), [500, 60]);
  assert.deepEqual(xy(left[left.length - 1]!), [0, 0], "lands exactly");
  assert.ok(left.some((frame) => xy(frame)[1]! < 0), "rises above the line on the way: an arc, not a slide");
  left.forEach((frame, i) => assert.ok(Math.abs(xy(frame)[0]! + xy(right[i]!)[0]!) < 0.11, "mirrored"));
  for (const frame of left) assert.ok(Math.abs(Number(frame.transform.match(/rotate\(([-\d.]+)deg/)![1])) <= 3);
});

test("a cancelled intro run can never finish the intro for the run that replaced it", () => {
  const intro = readFileSync("src/components/HeroIntro.tsx", "utf8");
  assert.match(intro, /if \(!alive\) return; \/\/ a newer run owns the intro now/);
  assert.match(intro, /window\.setTimeout\(onSkip, INTRO\.deadlineMs\)/);
});

test("the decision is made before the first paint, with a failsafe if JS never runs", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  // A plain blocking script in <head> (next/script's beforeInteractive runs after paint).
  assert.match(layout, /<head>[\s\S]*<script id="hero-intro" dangerouslySetInnerHTML=\{\{ __html: PLAY_SCRIPT \}\} \/>[\s\S]*<\/head>/);
  assert.match(css, /animation: hero-failsafe-show 0s 4s forwards/);
  assert.match(css, /html\[data-hero-intro="play"\] #hero \[data-hero-still\] \{ visibility: hidden; \}/, "no still drawing before the live one");
});

test("glass and solid surfaces are moved in, never faded", () => {
  const intro = readFileSync("src/components/HeroIntro.tsx", "utf8");
  const glass = intro.slice(intro.indexOf("glass\n            ?"), intro.indexOf(": [{ opacity: 0"));
  assert.match(glass, /opacity: 1, transform: "translateY\(\d+px\)", clipPath/);
  assert.doesNotMatch(glass, /opacity: 0/);
  const actions = readFileSync("src/components/HeroAskButton.tsx", "utf8");
  assert.match(actions, /data-hero-part="copy" data-hero-glass className=/, "the button row is moved in");
});

test("the avatar sleeps, then wakes, through the guide's own states", () => {
  const intro = readFileSync("src/components/HeroIntro.tsx", "utf8");
  assert.ok(intro.indexOf('type: "intro/sleep"') < intro.indexOf('type: "intro/wake"'));
  assert.match(intro, /whenAvatarDrawn\(INTRO\.avatarTimeoutMs\)/, "waits for the live avatar");
});

test("the proof links sit in the page flow under the face, never orbiting it", () => {
  // Orbiting pills collided with the name and the availability line.
  const avatar = readFileSync("src/components/guide/GuideHeroAvatar.tsx", "utf8");
  assert.doesNotMatch(avatar, /ORBIT|data-hero-chip/);
  assert.match(avatar, /PROOF_LINKS\.map/);
});

test("a refresh keeps the visitor's place: the route-change scroll reset ignores reloads", () => {
  const smooth = readFileSync("src/components/SmoothScroll.tsx", "utf8");
  assert.match(smooth, /if \(previous === null \|\| previous === pathname\) return;/);
  assert.doesNotMatch(smooth, /isFirstRenderRef/, "a first-run flag breaks under React's double effects");
});

test("Nex's ring is one component everywhere it rests, and the intro draws it on", () => {
  for (const file of ["src/components/guide/GuideHeroAvatar.tsx", "src/components/guide/FooterAskHost.tsx", "src/components/guide/RouteNexSocket.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /<NexRing /, `${file} uses NexRing`);
  }
  const intro = readFileSync("src/components/HeroIntro.tsx", "utf8");
  assert.match(intro, /strokeDashoffset: 1 \}, \{ strokeDashoffset: 0/, "the track draws on");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /prefers-reduced-motion: reduce\)[^}]*\{\s*\.nex-ring-orbit, \.nex-ring-think \{ animation: none; \}/, "still under reduced motion");
  assert.match(css, /\[data-hero-part="ring-track"\],[\s\S]*?hero-failsafe-show 0s 4s/, "the ring has the intro's failsafe");
});
