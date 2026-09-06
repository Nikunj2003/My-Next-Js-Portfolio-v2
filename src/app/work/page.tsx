import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { caseStudies, caseStudiesByTheme } from "@/data/case-studies";
import { personalInfo } from "@/data/portfolio";
import { getWorkIndexGraph, toJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/lib/seo/site";
import CaseStudyCard from "@/components/CaseStudyCard";
import Reveal from "@/components/ui/reveal";
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
    images: [{ url: siteConfig.ogImage, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [siteConfig.ogImage],
  },
};

/** Section label plus hairline rule, matching the homepage work section. */
const GroupHeading = ({ label, count, blurb }: { label: string; count: number; blurb: string }) => (
  <Reveal className="mb-6">
    <div className="flex items-center gap-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-primary">{label}</h2>
      <span className="font-mono text-[10.5px] text-muted-foreground/70 tabular-nums">{count}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
    </div>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
      {blurb}
    </p>
  </Reveal>
);

const WorkIndexPage = () => (
  <>
    {/* Inlined rather than via next/script so the graph is present in the
        static HTML that crawlers read, matching the pattern in layout.tsx. */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(getWorkIndexGraph()).replace(/</g, "\\u003c") }}
    />

    <Navbar />

    <main id="main-content" tabIndex={-1} className="relative z-10">
      <section className="section-padding">
        <div className="container-narrow">
          <Reveal className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">Case studies</div>
            <h1 className="heading-xl mb-6">
              Engineering <span className="text-gradient">Case Studies</span>
            </h1>
            <p className="mb-16 max-w-2xl text-lg leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              Each write-up covers the problem, the constraints it ran under, the decisions taken with the
              alternatives rejected, measured results, and an explicit statement of what was mine versus shared.
            </p>
          </Reveal>

          {/* Grouped by capability rather than employer, so the shape of the work
              reads before the logo does. */}
          {caseStudiesByTheme.map((group, groupIndex) => (
            <section key={group.id} className={groupIndex === caseStudiesByTheme.length - 1 ? "" : "mb-20"}>
              <GroupHeading label={group.label} count={group.studies.length} blurb={group.blurb} />
              <div className="grid gap-6 md:grid-cols-2">
                {group.studies.map((study, index) => (
                  <Reveal key={study.slug} delay={index * 0.06} className="h-full">
                    <CaseStudyCard study={study} />
                  </Reveal>
                ))}
              </div>
            </section>
          ))}

          <Reveal className="mt-20 border-t border-white/10 pt-10">
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
          </Reveal>
        </div>
      </section>
    </main>

    <Footer />
  </>
);

export default WorkIndexPage;
