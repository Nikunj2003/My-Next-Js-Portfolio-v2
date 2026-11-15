import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("answer links treat protocol-relative URLs as external and never load images", () => {
  const source = read("src/components/ai/AnswerBody.tsx");
  assert.ok(source.includes("const isInternalPath = /^\\/(?![/\\\\])/.test(href);"), "`//host` must not count as an internal path");
  assert.match(source, /img: \(/, "images must be overridden, not auto-loaded");
});

test("guide actions never route a protocol-relative href", () => {
  assert.doesNotMatch(read("src/lib/guide/actions.ts"), /href\.startsWith\("\/"\)/);
});

test("the contact route caps the request body before parsing", () => {
  const source = read("src/app/api/contact/route.ts");
  assert.match(source, /readBodyTextCapped\(request, MAX_REQUEST_BODY_BYTES\)/);
  assert.doesNotMatch(source, /request\.json\(\)/);
});

test("the chat route has a global budget and caps the suggestions call", () => {
  const source = read("src/app/api/chat/route.ts");
  assert.match(source, /checkGlobalBudget\("chat"/);
  assert.match(source, /max_tokens: MAX_SUGGESTION_TOKENS/);
});

test("hosted artifacts can't send data anywhere", () => {
  const source = read("src/app/api/artifacts/[slug]/[file]/route.ts");
  assert.match(source, /connect-src 'none'/);
  assert.match(source, /form-action 'none'/);
});

test("pages send baseline security headers", () => {
  const source = read("next.config.ts");
  for (const header of ["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy"]) {
    assert.match(source, new RegExp(header));
  }
});
