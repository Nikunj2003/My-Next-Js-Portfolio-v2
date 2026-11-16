"use client";

import Image from "next/image";
import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { ArrowRight, ExternalLink, Github, Maximize2 } from "lucide-react";
import { projects, type Project } from "@/data/portfolio";
import AskAboutThis from "@/components/AskAboutThis";
import { SectionNexDock } from "@/components/guide/SectionNexDock";
import { SectionAskRow } from "@/components/guide/InPageAskHost";
import { PROJECT_ANCHOR_PREFIX } from "@/lib/chat/shared";
import { caseStudyIndex } from "@/data/case-study-index";
import { THESIS } from "@/data/thesis";
import { PillarRow } from "@/components/PillarRow";

/** Project cards whose product also has a case study: the card links to the deeper write-up. */
const PROJECT_STUDY: Record<string, string> = { codenex: "codenex", "codenex-ai-api-proxy": "codenex-ai-proxy", serenify: "serenify" };
const studyPath = (projectSlug: string) => {
  const slug = PROJECT_STUDY[projectSlug];
  return slug && caseStudyIndex.some((entry) => entry.slug === slug) ? `/work/${slug}` : null;
};
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import dynamic from "next/dynamic";

// Only needed once a screenshot is opened, so it isn't in the page's bundle.
const ProjectImageViewer = dynamic(() => import("@/components/ProjectImageViewer"), { ssr: false });

const featuredProjects = projects.filter((project) => project.featured);
const otherProjects = projects.filter((project) => !project.featured);
const PROJECT_IMAGE_SIZES = "(min-width: 1536px) 42rem, (min-width: 1024px) 40vw, 100vw";

/**
 * Image gallery half of a project card.
 *
 * Mounts the carousel only when it scrolls near. Every slide is a
 * `next/image`, so neighbours load as optimised, sized images; the old raw
 * `new Image()` prefetch downloaded the 1-2MB source PNGs on top of that.
 * Clicking opens the full-screen viewer.
 */
/** True once the page has loaded and the browser has been idle (shared by every card). */
let idleAfterLoad = false;
const idleListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const mark = () => {
    const done = () => {
      idleAfterLoad = true;
      idleListeners.forEach((listener) => listener());
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    // A few seconds in, so it never competes with the hero's intro.
    window.setTimeout(() => (ric ? ric(done, { timeout: 3000 }) : done()), 3500);
  };
  if (document.readyState === "complete") mark();
  else window.addEventListener("load", mark, { once: true });
}
function useIdleAfterLoad() {
  return useSyncExternalStore(
    (listener) => {
      idleListeners.add(listener);
      return () => {
        idleListeners.delete(listener);
      };
    },
    () => idleAfterLoad,
    () => false
  );
}

function ProjectGallery({
  project,
  priority,
  onOpenViewer,
}: {
  project: Project;
  priority: boolean;
  onOpenViewer: (project: Project, index: number) => void;
}) {
  const [mediaRef, nearView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: "600px 0px" });
  // Set up once the browser is idle after load, not on the visitor's first
  // approach: Embla measures layout when it starts, and the first screenshot
  // decodes, which landed in the middle of the first scroll. Reaching it
  // sooner still mounts it at once.
  const idle = useIdleAfterLoad();
  const mediaInView = nearView || idle;
  if (project.images.length === 0) {
    return (
      <div className="flex items-center justify-center border-t border-white/10 bg-black/30 p-6 font-mono text-sm text-muted-foreground lg:w-[58%] lg:border-l lg:border-t-0">
        {">"} No preview available
      </div>
    );
  }

  return (
    <div
      ref={mediaRef}
      className="group/img relative flex items-stretch overflow-hidden border-t border-white/10 bg-black/30 p-4 sm:p-6 lg:w-[58%] lg:border-l lg:border-t-0"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-60" />

      {mediaInView ? (
        <Carousel className="relative z-10 w-full self-center overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-accent-card">
          <CarouselContent>
            {project.images.map((img, idx) => (
              <CarouselItem key={`${project.title}-${img}`}>
                <button
                  type="button"
                  onClick={() => onOpenViewer(project, idx)}
                  className="group/viewer relative block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label={`Open ${project.title} screenshot ${idx + 1} of ${project.images.length} full screen`}
                >
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-xl">
                    <div className="relative h-full w-full">
                      <Image
                        src={img}
                        alt={`${project.title} screenshot ${idx + 1}`}
                        fill
                        priority={priority && idx === 0}
                        sizes={PROJECT_IMAGE_SIZES}
                        className="pointer-events-none object-cover object-left-top transition-transform duration-700 ease-out group-hover/viewer:scale-[1.02] motion-reduce:transition-none"
                        draggable={false}
                      />
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover/viewer:opacity-100" />
                  <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 font-mono text-[11px] text-white/90 glass-tier-surface">
                    <Maximize2 className="h-3 w-3" />
                    Full screen
                  </span>
                  {project.images.length > 1 && (
                    <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-black/55 px-2 py-1 font-mono text-[10px] text-white/80 glass-tier-surface">
                      {idx + 1}/{project.images.length}
                    </span>
                  )}
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>

          {project.images.length > 1 && (
            <div className="opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover/img:opacity-100 lg:group-focus-within/img:opacity-100">
              <CarouselPrevious className="left-3 z-20 flex h-9 w-9 items-center justify-center border border-white/15 bg-background/85 glass-tier-surface text-foreground transition-colors hover:bg-background hover:text-primary-text" />
              <CarouselNext className="right-3 z-20 flex h-9 w-9 items-center justify-center border border-white/15 bg-background/85 glass-tier-surface text-foreground transition-colors hover:bg-background hover:text-primary-text" />
            </div>
          )}
        </Carousel>
      ) : (
        <div className="relative z-10 w-full self-center overflow-hidden rounded-xl border border-white/10 bg-black/60">
          <div className="aspect-[16/10] w-full" />
        </div>
      )}
    </div>
  );
}

/**
 * Stacked project card: content on one side, gallery on the other.
 */
function ProjectCard({
  project,
  index,
  onOpenViewer,
}: {
  project: Project;
  index: number;
  onOpenViewer: (project: Project, index: number) => void;
}) {
  const isEven = index % 2 === 0;

  return (
    <div
      id={`${PROJECT_ANCHOR_PREFIX}${project.slug}`}
      data-project-slug={project.slug}
      className="static w-full scroll-mt-28 lg:sticky"
      // Offsets stack the cards into a deck as you scroll. CSS-native, no listener.
      style={{ top: `calc(10vh + ${index * 30}px)`, zIndex: index }}
    >
      {/*
        Opaque on purpose, with blur explicitly disabled.

        These cards stack into a sticky deck, so each one must fully hide the
        cards behind it. Any translucency at all — even the 80% `glass-strong`
        tier — lets the previous card's screenshot show through, which is what
        the original `backdrop-blur-none backdrop-saturate-100` was guarding
        against. This is the one surface on the site that is deliberately not
        glass; do not "fix" it to use a glass tier.
      */}
      {/*
       : the reveal animation fades element opacity from 0
        to 1, and a half-faded opaque card is translucent — so on refresh the card
        below showed through for the length of the animation. Fading in a member
        of a deliberately opaque stack cannot work; the deck reveals itself
        through the sticky scroll offsets instead.
      */}
      <SpotlightCard opaque className="relative w-full border-black/10 dark:border-white/10">
        <div className={`flex min-h-[26rem] flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
          {/* Content */}
          <div className="static z-10 flex flex-1 flex-col justify-center p-6 sm:p-8 lg:w-[42%] lg:p-10">
            <div className="mb-3 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-primary-text">{project.category}</span>
              {project.live && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary-text">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Live
                </span>
              )}
            </div>

            {/*
              A sibling below the title, not inline inside it.

              Inline, the pill lands wherever the heading text happens to end,
              so its position moved between cards with a short title ("Serenify")
              and a long or wrapping one ("CodeNex AI API Proxy"). Anchored under
              the heading it sits in the same place on every card, and a display
              heading no longer has to reserve vertical space for a control.
            */}
            <h4 className="heading-lg leading-tight">{project.title}</h4>
            <div className="mb-4 mt-2 flex min-h-6 items-center">
              <AskAboutThis question={`Tell me about ${project.title}.`} className="ml-0" />
            </div>

            <p className="text-base leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              {project.summary}
            </p>

            {/* Always visible: the ratio carries it without a hover reveal. */}
            <dl className="mt-5 flex flex-col gap-2 border-l-2 border-primary/30 pl-3 text-xs">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground sm:w-14">Role</dt>
                <dd className="text-foreground/80">{project.role}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground sm:w-14">Impact</dt>
                <dd className="text-muted-foreground">{project.impact}</dd>
              </div>
            </dl>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.tech.map((tech) => (
                <li
                  key={tech}
                  className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs text-primary-text"
                >
                  {tech}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2">
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Live demo
                </a>
              )}
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 glass-subtle px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary-text"
              >
                <Github className="h-3.5 w-3.5" />
                Source
              </a>
              {studyPath(project.slug) && (
                <Link
                  href={studyPath(project.slug)!}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-primary-text transition-colors hover:text-primary-text"
                >
                  Case study
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <ProjectGallery project={project} priority={index === 0} onOpenViewer={onOpenViewer} />
        </div>
      </SpotlightCard>
    </div>
  );
}

/**
 * The featured case-study cards are rendered by the server page and passed in,
 * so this client component never imports the case-study dataset.
 */
const ProjectsSection = ({ featured, caseStudyCount }: { featured: ReactNode; caseStudyCount: number }) => {
  const [viewerState, setViewerState] = useState<{ open: boolean; project: Project | null; index: number }>({
    open: false,
    project: null,
    index: 0,
  });

  const activeViewerProject = viewerState.project;

  const handleOpenViewer = useCallback((project: Project, index: number) => {
    setViewerState({ open: true, project, index });
  }, []);

  return (
    <section id="work" className="section-padding relative z-10">
      {/* Retained so existing deep links, llms.txt entries, and Nex
          anchors that point at #projects still resolve after the rename. */}
      <span id="projects" aria-hidden="true" className="block scroll-mt-28" />

      <div className="container-narrow">
        {/* Centered Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 px-3 py-1.5 font-mono text-xs text-primary-text glass-subtle">
            Work
          </div>
          <h2 className="heading-xl mb-6">
            Selected <span className="text-gradient">Work</span>
          </h2>
          <p className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {THESIS} Each case study below is evidence for one of four things.
          </p>
          <SectionNexDock section="work" layout="stack" className="mt-4" />
        </div>

        <SectionAskRow section="work" />

        <PillarRow />

        {/* Tier 1 — the featured case studies, the only cards carrying metrics on
            their face. Labelled by what they are rather than by employer, since the
            row sits above a link to all 13 studies across three contexts. */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-primary-text">Featured case studies</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3" data-guide-target="work-featured">
          {featured}
        </div>

        {/* The row is a fixed three-column grid, so the rest of the studies are
            reached here rather than by growing it into a lopsided second row. */}
        <div className="mb-24 mt-6">
          <Link
            href="/work"
            className="group/all inline-flex items-center gap-2 text-sm font-semibold text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View all {caseStudyCount} case studies
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </div>

        {/* Tier 2 — shipped personal products */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-primary-text">
              Built and shipped
            </h3>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
        </div>

        {/* Sticky stacked deck — cards overlap into a stack as you scroll. */}
        <div className="relative mb-20 flex flex-col gap-8 pb-20">
          {featuredProjects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} onOpenViewer={handleOpenViewer} />
          ))}
        </div>


        {/* Also built — kept in the data and in Nex's context, just not
            consuming a full card each. */}
        <div>
          <div>
            <div className="mb-6 flex items-center gap-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-primary-text">Also built</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {otherProjects.map((project) => (
                /* Anchor retained even though these no longer get a full card,
                   so Nex's #project-<slug> links still resolve. */
                <li
                  key={project.slug}
                  id={`${PROJECT_ANCHOR_PREFIX}${project.slug}`}
                  data-project-slug={project.slug}
                  className="scroll-mt-28"
                >
                  <div className="flex h-full flex-col gap-2 rounded-xl border border-white/10 px-5 py-4 transition-colors glass-subtle hover:border-primary/30">
                    <p className="text-sm font-semibold text-foreground">{project.title}</p>
                    <div className="flex min-h-6 items-center">
                      <AskAboutThis question={`Tell me about ${project.title}.`} className="ml-0" />
                    </div>
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{project.summary}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs font-semibold">
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary-text"
                      >
                        <Github className="h-3.5 w-3.5" />
                        Source
                      </a>
                      {project.live && (
                        <a
                          href={project.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary-text transition-colors hover:text-primary-text/80"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Live
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* View more on GitHub */}
        <div className="mt-12 flex justify-center">
          <a
            href="https://github.com/Nikunj2003"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/10 border-b-white/5 px-8 py-4 text-sm font-bold text-foreground shadow-accent-soft transition-all duration-300 glass hover:bg-white/10 hover:text-primary-text active:scale-95"
          >
            <Github className="h-5 w-5" />
            Explore more repositories
          </a>
        </div>

        {activeViewerProject && (
          <ProjectImageViewer
            projectTitle={activeViewerProject.title}
            images={activeViewerProject.images}
            open={viewerState.open}
            currentIndex={viewerState.index}
            onIndexChange={(index) => setViewerState((current) => ({ ...current, index }))}
            onOpenChange={(open) => setViewerState((current) => ({ ...current, open }))}
          />
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
