import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { NEX, OFF_TOPIC_LINE, personaPrompt } from "../src/lib/nex/persona.ts";
import { ASLEEP_LINE, BORED_LINE, DIZZY_LINE, HOVER_LINE, PET_LINES, WAKE_LINE, greetingFor } from "../src/lib/guide/hero-lines.ts";
import { SECTION_TIPS } from "../src/lib/guide/tips.ts";
import { TOUR_STEPS } from "../src/lib/guide/tour.ts";
import { SECTION_CHIPS, SECTION_IDS } from "../src/lib/guide/anchors.ts";
import { CHAT_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY, WELCOME_MESSAGE } from "../src/lib/chat/shared.ts";
import { configureNexChat, getNexChatSnapshot, hydrateNexChat } from "../src/lib/chat/nex-chat-store.ts";
import { createStoredChatEnvelope } from "../src/lib/chat-storage.ts";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const cannedLines = [
  ...[3, 9, 14, 20].map(greetingFor),
  ...PET_LINES,
  DIZZY_LINE,
  HOVER_LINE,
  BORED_LINE,
  ASLEEP_LINE,
  WAKE_LINE,
];

test("the old brand is gone from everything visitors, crawlers and the model see", () => {
  // The only places "twin" may appear: the two migrations (storage key, #ai-twin
  // anchor), the tool alias and the palette keyword, so old habits still work.
  const allowed = /LEGACY_CHAT_STORAGE_KEY = "nikunj-ai-twin-chat"|LEGACY_SECTION_ID = "ai-twin"|old `#ai-twin` link|"ai twin": "#nex", \/\/ the name before Nex|value="nex ai guide twin chat/;
  const sources = [...files("src").filter((path) => /\.(tsx?|css|json)$/.test(path)), "public/llms.txt", "public/llms-full.txt"];
  const hits = sources.flatMap((path) =>
    readFileSync(path, "utf8")
      .split("\n")
      .map((line, index) => ({ path, line: index + 1, text: line }))
      .filter(({ text }) => /twin/i.test(text) && !allowed.test(text))
  );
  assert.deepEqual(hits, []);
});

test("Nex speaks for itself and about Nikunj, never as him", () => {
  const all = [...cannedLines, ...Object.values(SECTION_TIPS), ...TOUR_STEPS.map((step) => step.line), WELCOME_MESSAGE];
  for (const line of all) {
    assert.doesNotMatch(line, /\bI built\b|\bmy (work|project|projects|case stud|career|resume)\b/i, line);
  }
  // Each greeting names Nex.
  for (const hour of [3, 9, 14, 20]) assert.match(greetingFor(hour), /\bNex\b/);
  assert.match(WELCOME_MESSAGE, /I’m Nex/);
});

test("suggestions ask about Nikunj in the third person (only Nex's own section asks Nex)", () => {
  const route = readFileSync("src/app/api/chat/route.ts", "utf8");
  const fallback = route.slice(route.indexOf("const fallbackByCategory"), route.indexOf("const projectSpecificSuggestions"));
  const defaults = route.slice(route.indexOf("function getDefaultSuggestions"));
  const quoted = [...`${fallback}${defaults}`.matchAll(/"([^"]+\?)"/g)].map((m) => m[1]!);
  assert.ok(quoted.length >= 10);
  for (const chip of quoted) assert.doesNotMatch(chip, /\b(you|your)\b/i, chip);
  for (const [section, chips] of Object.entries(SECTION_CHIPS)) {
    if (section === "nex") continue;
    for (const chip of chips) assert.doesNotMatch(chip, /\b(you|your)\b/i, chip);
  }
});

test("canned lines stay short", () => {
  for (const line of cannedLines) assert.ok(line.split(/\s+/).length <= 14, line);
  for (const tip of Object.values(SECTION_TIPS)) assert.ok(tip.length <= 110, tip);
  for (const chips of Object.values(SECTION_CHIPS)) for (const chip of chips) assert.ok(chip.length <= 44, chip);
  for (const step of TOUR_STEPS) assert.ok(step.line.length <= 140, step.id);
});

test("the system prompt is built from the persona", async () => {
  const prompt = personaPrompt();
  assert.match(prompt, /^You are Nex, /);
  assert.ok(prompt.includes(NEX.backstory));
  assert.match(prompt, /not Nikunj and not a human/);
  const { SYSTEM_PROMPT, SUGGESTION_SYSTEM_PROMPT } = await import("../src/lib/ai-config.ts");
  assert.ok(SYSTEM_PROMPT.includes(prompt));
  assert.ok(SYSTEM_PROMPT.includes(OFF_TOPIC_LINE));
  assert.match(SUGGESTION_SYSTEM_PROMPT, /third person/);
});

test("the section, its spot and the tour use the nex id, and #ai-twin still lands there", () => {
  assert.ok(SECTION_IDS.includes("nex"));
  assert.ok(TOUR_STEPS.some((step) => step.href === "#nex"));
  const section = readFileSync("src/components/NexSection.tsx", "utf8");
  assert.match(section, /<section id="nex"/);
  assert.match(section, /<span id=\{LEGACY_SECTION_ID\}/);
  assert.match(section, /replaceState\([^)]*#nex`\)/);
});

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

test("history saved before the rename moves to the new key, with today's welcome", () => {
  const old = createStoredChatEnvelope([
    { id: "welcome", role: "assistant", content: "Hi — I’m Nikunj’s AI twin." },
    { id: "u1", role: "user", content: "What is RAG?" },
    { id: "a1", role: "assistant", content: "Retrieval-augmented generation." },
  ]);
  const storage = memoryStorage({ [LEGACY_CHAT_STORAGE_KEY]: JSON.stringify(old) });
  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  const contents = getNexChatSnapshot().messages.map((message) => message.content);
  assert.deepEqual(contents, [WELCOME_MESSAGE, "What is RAG?", "Retrieval-augmented generation."]);
  assert.equal(storage.data.has(LEGACY_CHAT_STORAGE_KEY), false, "the old key is removed");
  assert.ok(storage.data.get(CHAT_STORAGE_KEY)?.includes("What is RAG?"), "saved under the new key");
});

test("newer history wins over a leftover old key", () => {
  const fresh = createStoredChatEnvelope([{ id: "u2", role: "user", content: "New question" }]);
  const old = createStoredChatEnvelope([{ id: "u1", role: "user", content: "Old question" }]);
  const storage = memoryStorage({ [CHAT_STORAGE_KEY]: JSON.stringify(fresh), [LEGACY_CHAT_STORAGE_KEY]: JSON.stringify(old) });
  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  const contents = getNexChatSnapshot().messages.map((message) => message.content);
  assert.ok(contents.includes("New question"));
  assert.ok(!contents.includes("Old question"));
  assert.equal(storage.data.has(LEGACY_CHAT_STORAGE_KEY), false);
});
