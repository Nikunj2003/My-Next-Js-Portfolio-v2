import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTACT_MAX_AGE_MS,
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

test("contactRequestSchema rejects invalid contact reasons", () => {
  const result = contactRequestSchema.safeParse({
    name: "Nikunj",
    email: "njkhitha2003@gmail.com",
    reason: "Sales",
    message: "This is a valid contact message.",
    website: "",
    startedAt: Date.now() - CONTACT_MIN_FILL_MS,
  });

  assert.equal(result.success, false);
});

test("getContactSubmissionIssue flags expired forms", () => {
  const now = 10_000_000;
  const issue = getContactSubmissionIssue(
    {
      website: "",
      startedAt: now - CONTACT_MAX_AGE_MS - 1,
    },
    now,
  );

  assert.deepEqual(issue, {
    kind: "expired",
    message: "This form expired. Please refresh the page and try again.",
  });
});
