import type { Metadata } from "next";
import Link from "next/link";
import { RouteNexSocket } from "@/components/guide/RouteNexSocket";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { caseStudies, caseStudiesByTheme } from "@/data/case-studies";
import { personalInfo } from "@/data/portfolio";
import { getWorkIndexGraph, toJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/lib/seo/site";
import CaseStudyCard from "@/components/CaseStudyCard";
import { ReadingPathAsk } from "@/components/ai/ReadingPathAsk";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const title = `Engineering Case Studies — ${personalInfo.name}`;
const description = `${caseStudies.length} deep-dive write-ups: the problem, the constraints, the decisions with their rejected alternatives, measured results, and an explicit statement of what was individually owned.`;
const url = `${siteConfig.siteUrl}/work`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    title,
    description,
    siteName: siteConfig.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

/** Section label plus hairline rule, matching the homepage work section. */
const GroupHeading = ({ label, count, blurb }: { label: string; count: number; blurb: string }) => (
  <div className="mb-6">
    <div data-guide-route-spot="group" className="flex items-center gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-primary-text">{label}</h2>
      <span className="font-mono text-[10.5px] text-muted-foreground/70 tabular-nums">{count}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
    </div>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
      {blurb}
    </p>
  </div>
);

const WorkIndexPage = () => (
  <>
    {/* Inlined rather than via next/script so the graph is present in the
        static HTML that crawlers read, matching the pattern in layout.tsx. */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(getWorkIndexGraph()) }}
    />

    <Navbar />

    <main id="main-content" tabIndex={-1} className="relative z-10 scroll-mt-0 focus:outline-none">
      <section className="section-padding">
        <div className="container-narrow">
          <div className="mb-8">
            <Link
              href="/"
              className="-my-3 inline-flex min-h-11 items-center gap-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>

          <div className="flex items-start justify-between gap-10">
            <div className="min-w-0">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary-text">Case studies</div>
            <h1 className="heading-xl mb-6">
              Engineering <span className="text-gradient">Case Studies</span>
            </h1>
            <p data-guide-route-spot="header" className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              Each write-up covers the problem, the constraints it ran under, the decisions taken with the
              alternatives rejected, measured results, and an explicit statement of what was mine versus shared.
            </p>
            </div>
            <RouteNexSocket prompt={`${caseStudies.length} studies. Tell me the role and I'll pick three to read first.`} />
          </div>

          <div>
            <ReadingPathAsk />
          </div>

          {/* Grouped by capability rather than employer, so the shape of the work
              reads before the logo does. */}
          {caseStudiesByTheme.map((group, groupIndex) => (
            <section key={group.id} className={groupIndex === caseStudiesByTheme.length - 1 ? "" : "mb-20"}>
              <GroupHeading label={group.label} count={group.studies.length} blurb={group.blurb} />
              <div className="grid gap-6 md:grid-cols-2">
                {group.studies.map((study) => (
                  <div key={study.slug} className="h-full">
                    <CaseStudyCard study={study} />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-20 border-t border-foreground/10 pt-10">
            <p className="mb-6 text-base leading-relaxed text-muted-foreground">
              Looking for the shorter version, or the side projects? Both are on the homepage.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/#work"
                className="group/cta btn-cta-primary"
              >
                Browse the work section
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none" />
              </Link>
              <Link
                href="/#contact"
                className="btn-cta-secondary"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </>
);

export default WorkIndexPage;
