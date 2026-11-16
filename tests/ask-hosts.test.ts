import test from "node:test";
import assert from "node:assert/strict";

import { hostDomId, hostSection, resolveAskHost, sectionHost, type AskHost } from "../src/lib/guide/ask-hosts.ts";
import { initialBubbleState, reduceBubble } from "../src/lib/guide/bubble-policy.ts";

const base = { isMobile: false, heroVisible: false, footerDocked: false, section: null as string | null, available: (() => true) as (host: AskHost) => boolean };

test("phones always use the sheet", () => {
  assert.equal(resolveAskHost({ ...base, isMobile: true, requested: "section:work", heroVisible: true }), "float");
});

test("a requested host wins when it is on the page, and falls back when it isn't", () => {
  assert.equal(resolveAskHost({ ...base, requested: "section:contact", heroVisible: true }), "section:contact");
  assert.equal(resolveAskHost({ ...base, requested: "section:contact", section: "work", available: (h) => h !== "section:contact" }), "section:work");
  assert.equal(resolveAskHost({ ...base, requested: "float", heroVisible: true }), "float");
});

test("with nothing requested: hero, then footer, then the section in view, then the bubble", () => {
  assert.equal(resolveAskHost({ ...base, heroVisible: true, footerDocked: true, section: "work" }), "hero");
  assert.equal(resolveAskHost({ ...base, footerDocked: true, section: "work" }), "footer");
  assert.equal(resolveAskHost({ ...base, section: "skills" }), "section:skills");
  assert.equal(resolveAskHost({ ...base, section: "hero" }), "float");
  assert.equal(resolveAskHost({ ...base, section: "skills", available: () => false }), "float");
});

test("off the homepage, the row for what is being read; a page row by name when asked for", () => {
  assert.equal(resolveAskHost({ ...base, nearest: "page:decisions" }), "page:decisions");
  assert.equal(resolveAskHost({ ...base, requested: "page:header", nearest: "page:decisions" }), "page:header");
  assert.equal(resolveAskHost({ ...base, nearest: "page:decisions", available: () => false }), "float");
  // Landed in the footer beats the page row; a phone still gets the sheet.
  assert.equal(resolveAskHost({ ...base, footerDocked: true, nearest: "page:decisions" }), "footer");
  assert.equal(resolveAskHost({ ...base, isMobile: true, requested: "page:header" }), "float");
});

test("host ids map to sections and DOM ids", () => {
  assert.equal(sectionHost("about"), "section:about");
  assert.equal(sectionHost("hero"), null);
  assert.equal(hostSection("section:nex"), "nex");
  assert.equal(hostSection("footer"), null);
  assert.equal(hostDomId("section:work"), "nex-host-section-work");
  assert.equal(hostDomId("page:decisions"), "nex-host-page-decisions");
});

test("one host at a time: asking in another section moves the conversation; Escape clears it", () => {
  let state = reduceBubble(initialBubbleState, { type: "ask/open", host: "section:about" });
  assert.equal(state.askHost, "section:about");
  state = reduceBubble(state, { type: "ask/open", host: "section:work" });
  assert.equal(state.bubble, "ask");
  assert.equal(state.askHost, "section:work");
  state = reduceBubble(state, { type: "escape" });
  assert.equal(state.askHost, null);
});
