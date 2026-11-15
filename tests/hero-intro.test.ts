import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { INTRO, introTotalMs, shouldPlayIntro } from "../src/lib/hero-intro.ts";

const base = { path: "/", hash: "", scrollY: 0, width: 1440, reducedMotion: false };

test("the intro plays on every load of the homepage at the top, and only there", () => {
  assert.equal(shouldPlayIntro(base), true);
  assert.equal(shouldPlayIntro({ ...base, hash: "#work" }), false, "a link to a section");
  assert.equal(shouldPlayIntro({ ...base, scrollY: 400 }), false, "a reload that restores a scrolled position");
  assert.equal(shouldPlayIntro({ ...base, width: 900 }), false, "the avatar column is hidden below 1024px");
  assert.equal(shouldPlayIntro({ ...base, reducedMotion: true }), false);
  assert.equal(shouldPlayIntro({ ...base, path: "/work" }), false);
});

test("it is not limited to once per tab (refreshing at the top plays it again)", () => {
  const source = readFileSync("src/lib/hero-intro.ts", "utf8") + readFileSync("src/app/layout.tsx", "utf8");
  assert.doesNotMatch(source, /hero-intro-seen/);
});

test("the beats run in order: asleep, wakes, takes its place, then the left side; under 4s", () => {
  assert.ok(INTRO.sleepMs > 0 && INTRO.wakeMs > 0 && INTRO.moveMs > 0);
  assert.ok(INTRO.copyStartMs > 0, "the left side starts after the avatar starts moving");
  assert.ok(introTotalMs(6) < 4000);
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
  assert.match(glass, /opacity: 1, transform: "translateY\(16px\)", clipPath/);
  assert.doesNotMatch(glass, /opacity: 0/);
  const hero = readFileSync("src/components/HeroSection.tsx", "utf8");
  assert.match(hero, /data-hero-part="copy" data-hero-glass>\s*<span className="inline-flex[^"]*glass-subtle/, "the glass badge");
  assert.match(hero, /data-hero-part="copy" data-hero-glass className="mt-1 flex/, "the solid and glass buttons");
});

test("the avatar sleeps, then wakes, through the guide's own states", () => {
  const intro = readFileSync("src/components/HeroIntro.tsx", "utf8");
  assert.ok(intro.indexOf('type: "intro/sleep"') < intro.indexOf('type: "intro/wake"'));
  assert.match(intro, /whenAvatarDrawn\(INTRO\.avatarTimeoutMs\)/, "waits for the live avatar");
});
