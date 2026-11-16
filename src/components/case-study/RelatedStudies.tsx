import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCaseStudyPath, getRelatedCaseStudies } from "@/data/case-studies";

/** Up to three studies that prove the same pillar or share the theme. */
export function RelatedStudies({ slug }: { slug: string }) {
  const related = getRelatedCaseStudies(slug);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-16">
      <h2 id="related-heading" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Related work
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {related.map((study) => (
          <li key={study.slug}>
            <Link
              href={getCaseStudyPath(study.slug)}
              className="group flex h-full flex-col gap-1.5 rounded-xl glass-subtle px-4 py-3 transition-colors hover:border-primary/30"
            >
              <span className="flex items-start justify-between gap-2 text-sm font-semibold text-foreground group-hover:text-primary-text">
                {study.title}
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{study.oneLiner}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
