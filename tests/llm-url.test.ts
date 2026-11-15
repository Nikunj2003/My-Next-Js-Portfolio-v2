import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_CHAT_COMPLETIONS_URL, resolveChatCompletionsUrl } from "../src/lib/llm-url.ts";

test("empty or missing value falls back to the Bifrost endpoint", () => {
  assert.equal(DEFAULT_CHAT_COMPLETIONS_URL, "https://bifrost.codenex.dev/v1/chat/completions");
  assert.equal(resolveChatCompletionsUrl(undefined), DEFAULT_CHAT_COMPLETIONS_URL);
  assert.equal(resolveChatCompletionsUrl("   "), DEFAULT_CHAT_COMPLETIONS_URL);
});

test("an OpenAI-style /v1 base gets /chat/completions appended", () => {
  assert.equal(
    resolveChatCompletionsUrl("https://bifrost.codenex.dev/v1"),
    "https://bifrost.codenex.dev/v1/chat/completions",
  );
  assert.equal(
    resolveChatCompletionsUrl("https://bifrost.codenex.dev/v1/"),
    "https://bifrost.codenex.dev/v1/chat/completions",
  );
});

test("a full endpoint URL is kept as-is", () => {
  assert.equal(
    resolveChatCompletionsUrl("https://llm.example.com/v1/chat/completions/"),
    "https://llm.example.com/v1/chat/completions",
  );
});

test("a bare host gets /v1/chat/completions", () => {
  assert.equal(resolveChatCompletionsUrl("https://llm.example.com"), "https://llm.example.com/v1/chat/completions");
});

test("query strings survive normalization", () => {
  assert.equal(
    resolveChatCompletionsUrl("https://llm.example.com/openai/v1?api-version=2"),
    "https://llm.example.com/openai/v1/chat/completions?api-version=2",
  );
});

test("invalid and insecure URLs are rejected", () => {
  assert.throws(() => resolveChatCompletionsUrl("not a url"), /valid URL/);
  assert.throws(() => resolveChatCompletionsUrl("http://llm.example.com/v1"), /https/);
  assert.equal(
    resolveChatCompletionsUrl("http://localhost:8080/v1"),
    "http://localhost:8080/v1/chat/completions",
  );
});
