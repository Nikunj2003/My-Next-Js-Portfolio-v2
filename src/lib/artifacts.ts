import { z } from "zod";

/**
 * Shared schema and constants for the hosted-artifact upload/proxy routes.
 *
 * These back the `hosted-html-report` skill's `host-file.sh`, which POSTs a
 * base64-encoded HTML file here to publish it at
 * https://nikunj.codenex.dev/artifacts/<slug>/<filename>.
 */

// Slug/filename segments become Vercel Blob pathnames, so they are restricted
// to a safe charset (no `..`, no `/`, no encoded path traversal tricks).
const SLUG_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export const artifactSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(64, "Slug is too long.")
  .regex(SLUG_SEGMENT_PATTERN, "Slug must be alphanumeric with hyphens only.");

export const artifactFilenameSchema = z
  .string()
  .trim()
  .min(1, "Filename is required.")
  .max(80, "Filename is too long.")
  .regex(/^[a-z0-9][a-z0-9-]{0,63}\.html$/i, "Filename must be alphanumeric with hyphens and end in .html.");

export const artifactUploadSchema = z.object({
  slug: artifactSlugSchema,
  filename: artifactFilenameSchema,
  contentBase64: z.string().trim().min(1, "File content is required."),
});

export type ArtifactUploadRequest = z.infer<typeof artifactUploadSchema>;

export const ARTIFACT_PREFIX = "artifacts";
export const ARTIFACT_COUNTER_PREFIX = "artifacts/_meta/counters";

// Daily caps are enforced globally (not per-IP) — see hosted-html-report plan
// notes: Vercel Blob has no concept of "who uploaded this", and adding a
// separate durable per-IP store (e.g. Upstash Redis) was explicitly declined.
export const MAX_NEW_HOSTS_PER_DAY = 10;
export const MAX_UPDATES_PER_DAY = 30;

export function artifactPathname(slug: string, filename: string) {
  return `${ARTIFACT_PREFIX}/${slug}/${filename}`;
}

export function todayCounterPathname(date = new Date()) {
  const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `${ARTIFACT_COUNTER_PREFIX}/${iso}.json`;
}

export type ArtifactDailyCounters = {
  newHosts: number;
  updates: number;
};

export function isValidArtifactHtml(decoded: string) {
  const trimmed = decoded.trimStart().slice(0, 200).toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}
