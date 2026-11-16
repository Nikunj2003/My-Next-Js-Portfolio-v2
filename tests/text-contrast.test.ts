import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith(".tsx") ? [path] : [];
  });
}

test("teal text uses the text token (primary-text), not the fill colour", () => {
  // `text-primary` is the button-fill teal: 4.36:1 on the light page, under
  // AA for body text. `text-primary-text` is the darker text teal (4.9:1).
  const offenders = files("src")
    .filter((file) => !/FluidCursor/.test(file))
    .filter((file) => /(?<![\w-])(?:[a-z-]+:)*text-primary(?![-\w/])/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});
