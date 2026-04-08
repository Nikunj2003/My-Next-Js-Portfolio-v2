import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTACT_MIN_FILL_MS,
  contactRequestSchema,
  getContactSubmissionIssue,
} from "../src/lib/contact.ts";

test("contactRequestSchema accepts the visible form fields plus anti-spam metadata", () => {
  const result = contactRequestSchema.safeParse({
    name: "Nikunj",
    email: "njkhitha2003@gmail.com",
    reason: "Hiring",
    message: "This is a valid contact message.",
    website: "",
    startedAt: Date.now() - CONTACT_MIN_FILL_MS,
  });

  assert.equal(result.success, true);
});

test("getContactSubmissionIssue flags honeypot submissions", () => {
  const issue = getContactSubmissionIssue({
    website: "https://spam.example",
    startedAt: Date.now() - CONTACT_MIN_FILL_MS,
  });

  assert.deepEqual(issue, { kind: "honeypot", message: null });
});

test("getContactSubmissionIssue flags unrealistically fast submissions", () => {
  const issue = getContactSubmissionIssue({
    website: "",
    startedAt: Date.now(),
  });

  assert.equal(issue?.kind, "timing");
});
