/**
 * Kept apart from `case-studies.ts` so client components can link to a study
 * without bundling the whole dataset (about 1,300 lines of prose).
 */
export function getCaseStudyPath(slug: string) {
  return `/work/${slug}`;
}
