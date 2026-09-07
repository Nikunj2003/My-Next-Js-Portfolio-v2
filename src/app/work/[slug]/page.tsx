import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { caseStudies, caseStudyBySlug, getAdjacentCaseStudies, getCaseStudyPath } from "@/data/case-studies";
import { personalInfo } from "@/data/portfolio";
import { getCaseStudyGraph, toJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/lib/seo/site";
import CaseStudyDiagram from "@/components/diagrams";
import CaseStudyToc, { type TocItem } from "@/components/CaseStudyToc";
import AskAboutThis from "@/components/AskAboutThis";
import Reveal from "@/components/ui/reveal";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudyBySlug.get(slug);

  if (!study) return {};

  const title = `${study.title} — ${personalInfo.name}`;
  const url = `${siteConfig.siteUrl}${getCaseStudyPath(study.slug)}`;

  return {
    title,
    description: study.oneLiner,
    keywords: [...study.tags, ...study.stack],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description: study.oneLiner,
      siteName: siteConfig.siteName,
      images: [{ url: siteConfig.ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: study.oneLiner,
      images: [siteConfig.ogImage],
    },
  };
}

const CaseStudyPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const study = caseStudyBySlug.get(slug);

  if (!study) notFound();

  const { previous, next } = getAdjacentCaseStudies(study.slug);

  const sectionId = (heading: string) =>
    heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const tocItems: TocItem[] = [
    { id: "problem", label: "The problem" },
    { id: "constraints", label: "Constraints" },
    ...(study.diagram ? [{ id: "architecture", label: "Architecture" }] : []),
    { id: "decisions", label: "Decisions" },
    ...study.sections.map((section) => ({ id: sectionId(section.heading), label: section.heading })),
    { id: "stack", label: "Stack" },
    { id: "ownership", label: "What was mine" },
  ];

  return (
    <>
      {/* Inlined rather than via next/script so the graph is present in the
          static HTML that crawlers read, matching the pattern in layout.tsx. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(getCaseStudyGraph(study)) }} />

      <Navbar />

      <main id="main-content" tabIndex={-1} className="relative z-10 scroll-mt-0 focus:outline-none">
        <article id="case-study-article" className="section-padding">
          <div className="container-narrow">
            <Reveal className="mb-8">
              <Link
                href="/work"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                All work
              </Link>
            </Reveal>

            {/* Header: identity and headline metrics sit above the narrative,
                because that is the order these pages actually get read in. */}
            <Reveal delay={0.05}>
              <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs">
                {study.employer && (
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary">
                    {study.employer}
                  </span>
                )}
                <span className="text-muted-foreground">{study.period}</span>
                {study.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="heading-xl mt-6 max-w-3xl">
                <span className="text-gradient">{study.title}</span>
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-foreground/85" style={{ textWrap: "pretty" }}>
                {study.oneLiner}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 glass-subtle glow-accent-panel sm:grid-cols-4">
                {study.results.map((result) => (
                  <div key={result.label} className="bg-background/20 p-5">
                    <dt className="sr-only">{result.label}</dt>
                    <dd>
                      <span className="block text-2xl font-bold tracking-tighter text-foreground sm:text-3xl">
                        {result.metric}
                      </span>
                      <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">{result.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mt-10 max-w-3xl text-lg leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                {study.summary}
              </p>
            </Reveal>

            {/* Two columns from here: sticky TOC beside the prose. */}
            <div className="mt-16 flex flex-col gap-10 lg:flex-row lg:gap-14">
              <aside className="w-full shrink-0 lg:w-56">
                <CaseStudyToc items={tocItems} />
              </aside>

              <div className="min-w-0 flex-1">

                <Reveal>
                  <h2 id="problem" className="heading-md scroll-mt-28">The problem</h2>
                  <div className="mt-2 flex min-h-6 items-center">
                    <AskAboutThis
                      question={`What problem did the ${study.title} solve, and why did it matter?`}
                      className="ml-0"
                    />
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 glass-subtle p-6">
                    <p className="text-base leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                      {study.problem}
                    </p>
                  </div>
                </Reveal>

                <Reveal>
                  <h2 id="constraints" className="heading-md mt-14 scroll-mt-28">Constraints</h2>
                  <div className="mt-2 flex min-h-6 items-center">
                    <AskAboutThis
                      question={`What made the constraints on the ${study.title} hard to work within?`}
                      className="ml-0"
                    />
                  </div>
                  <ul className="mt-4 flex flex-col divide-y divide-white/10 overflow-hidden rounded-2xl glass-subtle">
                    {study.constraints.map((constraint) => (
                      <li key={constraint} className="flex gap-3 p-5 text-base leading-relaxed text-muted-foreground">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span style={{ textWrap: "pretty" }}>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>

                {study.diagram && (
                  <Reveal>
                    <h2 id="architecture" className="heading-md mt-14 scroll-mt-28">Architecture</h2>
                    <div className="mt-2 flex min-h-6 items-center">
                      <AskAboutThis
                        question={`Walk me through the architecture diagram for the ${study.title}.`}
                        className="ml-0"
                      />
                    </div>
                    <CaseStudyDiagram diagram={study.diagram} description={study.diagramCaption} />
                  </Reveal>
                )}

                <Reveal>
                  <h2 id="decisions" className="heading-md mt-14 scroll-mt-28">Decisions</h2>
                  <div className="mt-2 flex min-h-6 items-center">
                    <AskAboutThis
                      question={`What did you consider and reject while building the ${study.title}?`}
                      className="ml-0"
                    />
                  </div>
              <p className="mt-3 text-sm text-muted-foreground">
                What I chose, why, and what I turned down to get there.
              </p>
              <div className="mt-6 flex flex-col gap-4">
                {study.decisions.map((decision, index) => (
                  <SpotlightCard key={decision.choice} delay={index * 0.06}>
                    <div className="p-6 sm:p-7">
                      {/* Sibling below the heading: decision titles vary a lot
                          in length, so inline the pill never sat in the same
                          place twice down the list. */}
                      <h3 className="text-lg font-bold tracking-tight text-foreground">{decision.choice}</h3>
                      <div className="mt-2 flex min-h-6 items-center">
                        <AskAboutThis
                          question={`On the ${study.title}, why did you choose "${decision.choice}" over the alternatives?`}
                          className="ml-0"
                        />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                        {decision.why}
                      </p>
                      {decision.rejected && decision.rejected.length > 0 && (
                        <div className="mt-5 border-t border-white/10 pt-4">
                          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
                            Considered and rejected
                          </p>
                          <ul className="mt-3 flex flex-col gap-2">
                            {decision.rejected.map((item) => (
                              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground/85">
                                <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-muted-foreground/40" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </Reveal>

                {study.sections.map((section) => (
                  <Reveal key={section.heading}>
                    {/* Section headings come from data and vary in length, so
                        the pill anchors below rather than trailing the text —
                        inline, a permanently visible pill would leave every
                        heading's ragged edge permanently uneven. */}
                    <div className="mt-14">
                      <h2 id={sectionId(section.heading)} className="heading-md scroll-mt-28">
                        {section.heading}
                      </h2>
                      <div className="mt-2 flex min-h-6 items-center">
                        <AskAboutThis
                          question={`On the ${study.title}: explain "${section.heading}" in more detail.`}
                          className="ml-0"
                        />
                      </div>
                    </div>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                  {section.body}
                </p>
                {section.points && (
                  <ul className="mt-5 flex flex-col gap-3">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-3 text-base leading-relaxed text-muted-foreground">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span style={{ textWrap: "pretty" }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Reveal>
            ))}

                <Reveal>
                  <h2 id="stack" className="heading-md mt-14 scroll-mt-28">Stack</h2>
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {study.stack.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Stated plainly and on purpose: shared work described as sole
                ownership is the fastest way to lose a technical interview. */}
                <Reveal>
                  <h2 id="ownership" className="heading-md mt-14 scroll-mt-28">What was mine</h2>
                  <div className="mt-2 flex min-h-6 items-center">
                    <AskAboutThis question={`Who owned what on the ${study.title}?`} className="ml-0" />
                  </div>
                  <div className="mt-4 rounded-2xl border border-primary/20 glass-subtle p-6 glow-accent-panel">
                    <p className="text-base leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                      {study.ownership}
                    </p>
                  </div>
                </Reveal>

                {/* Close the prose column and the two-column grid. */}
              </div>
            </div>

            <nav aria-label="More case studies" className="mt-16 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
              {previous ? (
                <Link
                  href={getCaseStudyPath(previous.slug)}
                  className="group flex flex-col gap-1 rounded-xl glass-subtle px-5 py-4 transition-colors hover:border-primary/30"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <ArrowLeft className="h-3 w-3" />
                    Previous
                  </span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary">{previous.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={getCaseStudyPath(next.slug)}
                  className="group flex flex-col gap-1 rounded-xl glass-subtle px-5 py-4 text-right transition-colors hover:border-primary/30 sm:items-end"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Next
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary">{next.title}</span>
                </Link>
              )}
            </nav>

            <Reveal>
              <div className="mt-12 flex flex-wrap gap-4">
                <Link
                  href="/#contact"
                  className="btn-cta-primary shadow-accent-soft"
                >
                  Get in touch
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href={personalInfo.resumeUrl}
                  download
                  className="btn-cta-secondary"
                >
                  <Download className="h-4 w-4 text-primary" />
                  Download resume
                </a>
              </div>
            </Reveal>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
};

export default CaseStudyPage;
