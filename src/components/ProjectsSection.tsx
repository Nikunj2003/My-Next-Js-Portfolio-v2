"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { ArrowRight, ExternalLink, Github, Maximize2 } from "lucide-react";
import { projects, type Project } from "@/data/portfolio";
import { caseStudies, featuredCaseStudies } from "@/data/case-studies";
import CaseStudyCard from "@/components/CaseStudyCard";
import { PROJECT_ANCHOR_PREFIX } from "@/lib/ai-twin";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Reveal from "@/components/ui/reveal";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import ProjectImageViewer from "@/components/ProjectImageViewer";

const featuredProjects = projects.filter((project) => project.featured);
const otherProjects = projects.filter((project) => !project.featured);
const PROJECT_IMAGE_SIZES = "(min-width: 1536px) 42rem, (min-width: 1024px) 40vw, 100vw";

/**
 * Image gallery half of a project card.
 *
 * Mounts the carousel only when it scrolls near, and warms the neighbouring
 * images so paging feels instant. Clicking opens the full-screen viewer.
 */
function ProjectGallery({
  project,
  priority,
  onOpenViewer,
}: {
  project: Project;
  priority: boolean;
  onOpenViewer: (project: Project, index: number) => void;
}) {
  const [mediaRef, mediaInView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: "600px 0px" });
  /**
   * Which image indexes have already been warmed.
   *
   * This was a single boolean, latched true by the index-less call the mount
   * effect makes — so only images 0 and 1 were ever prefetched and every later
   * targeted call (hover, focus, paging) returned early. Tracking per index
   * makes neighbour warming actually work while still never re-fetching one.
   */
  const prefetchedRef = useRef<Set<number>>(new Set());

  const prefetchProjectImages = useCallback(
    (targetIndex?: number) => {
      if (project.images.length === 0 || typeof window === "undefined") return;

      const indexes = typeof targetIndex === "number" ? [targetIndex - 1, targetIndex, targetIndex + 1] : [0, 1];
      for (const index of indexes) {
        const src = project.images[index];
        if (!src || prefetchedRef.current.has(index)) continue;
        prefetchedRef.current.add(index);
        const image = new window.Image();
        image.decoding = "async";
        image.src = src;
      }
    },
    [project.images]
  );

  useEffect(() => {
    if (!mediaInView || project.images.length === 0) return;
    const timeoutId = window.setTimeout(prefetchProjectImages, 180);
    return () => window.clearTimeout(timeoutId);
  }, [mediaInView, prefetchProjectImages, project.images.length]);

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
                  onClick={() => {
                    prefetchProjectImages(idx);
                    onOpenViewer(project, idx);
                  }}
                  onMouseEnter={() => prefetchProjectImages(idx)}
                  onFocus={() => prefetchProjectImages(idx)}
                  onTouchStart={() => prefetchProjectImages(idx)}
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
              <CarouselPrevious className="left-3 z-20 flex h-9 w-9 items-center justify-center border border-white/15 bg-background/85 glass-tier-surface text-foreground transition-colors hover:bg-background hover:text-primary" />
              <CarouselNext className="right-3 z-20 flex h-9 w-9 items-center justify-center border border-white/15 bg-background/85 glass-tier-surface text-foreground transition-colors hover:bg-background hover:text-primary" />
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
        animateOnEnter={false}: the reveal animation fades element opacity from 0
        to 1, and a half-faded opaque card is translucent — so on refresh the card
        below showed through for the length of the animation. Fading in a member
        of a deliberately opaque stack cannot work; the deck reveals itself
        through the sticky scroll offsets instead.
      */}
      <SpotlightCard opaque animateOnEnter={false} className="relative w-full border-black/10 dark:border-white/10">
        <div className={`flex min-h-[26rem] flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
          {/* Content */}
          <div className="static z-10 flex flex-1 flex-col justify-center p-6 sm:p-8 lg:w-[42%] lg:p-10">
            <div className="mb-3 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-primary">{project.category}</span>
              {project.live && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Live
                </span>
              )}
            </div>

            <h4 className="heading-lg mb-4 leading-tight">{project.title}</h4>

            <p className="text-base leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              {project.summary}
            </p>

            {/* Always visible: the ratio carries it without a hover reveal. */}
            <dl className="mt-5 flex flex-col gap-2 border-l-2 border-primary/30 pl-3 text-xs">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground/60 sm:w-14">Role</dt>
                <dd className="text-foreground/80">{project.role}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground/60 sm:w-14">Impact</dt>
                <dd className="text-muted-foreground">{project.impact}</dd>
              </div>
            </dl>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.tech.map((tech) => (
                <li
                  key={tech}
                  className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 glass-subtle px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Github className="h-3.5 w-3.5" />
                Source
              </a>
            </div>
          </div>

          <ProjectGallery project={project} priority={index === 0} onOpenViewer={onOpenViewer} />
        </div>
      </SpotlightCard>
    </div>
  );
}

const ProjectsSection = () => {
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
      {/* Retained so existing deep links, llms.txt entries, and AI Twin
          anchors that point at #projects still resolve after the rename. */}
      <span id="projects" aria-hidden="true" className="block scroll-mt-28" />

      <div className="container-narrow">
        {/* Centered Header */}
        <Reveal className="mb-16 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 px-3 py-1.5 font-mono text-xs text-primary glass-subtle">
            Work
          </div>
          <h2 className="heading-xl mb-6">
            Selected <span className="text-gradient">Work</span>
          </h2>
          <p className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Agent systems, retrieval, and platform work I own at ArmorCode, GenAI products shipped at Xansr Media,
            and the products I have built on my own.
          </p>
        </Reveal>

        {/* Tier 1 — the featured case studies, the only cards carrying metrics on
            their face. Labelled by what they are rather than by employer, since the
            row sits above a link to all 13 studies across three contexts. */}
        <Reveal className="mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-primary">Featured case studies</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {featuredCaseStudies.map((study, index) => (
            <Reveal key={study.slug} delay={index * 0.08} className="h-full">
              {/* h4: the group label above this row is an h3. */}
              <CaseStudyCard study={study} headingLevel="h4" />
            </Reveal>
          ))}
        </div>

        {/* The row is a fixed three-column grid, so the rest of the studies are
            reached here rather than by growing it into a lopsided second row. */}
        <Reveal className="mb-24 mt-6">
          <Link
            href="/work"
            className="group/all inline-flex items-center gap-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View all {caseStudies.length} case studies
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </Reveal>

        {/* Tier 2 — shipped personal products */}
        <Reveal className="mb-8">
          <div className="flex items-center gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-primary">
              Built and shipped
            </h3>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
        </Reveal>

        {/* Sticky stacked deck — cards overlap into a stack as you scroll. */}
        <div className="relative mb-20 flex flex-col gap-8 pb-20">
          {featuredProjects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} onOpenViewer={handleOpenViewer} />
          ))}
        </div>


        {/* Also built — kept in the data and in the AI Twin context, just not
            consuming a full card each. */}
        <Reveal>
          <div>
            <div className="mb-6 flex items-center gap-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-primary">Also built</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {otherProjects.map((project) => (
                /* Anchor retained even though these no longer get a full card,
                   so the AI Twin's #project-<slug> links still resolve. */
                <li
                  key={project.slug}
                  id={`${PROJECT_ANCHOR_PREFIX}${project.slug}`}
                  data-project-slug={project.slug}
                  className="scroll-mt-28"
                >
                  <div className="flex h-full flex-col gap-2 rounded-xl border border-white/10 px-5 py-4 transition-colors glass-subtle hover:border-primary/30">
                    <p className="text-sm font-semibold text-foreground">{project.title}</p>
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{project.summary}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs font-semibold">
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Github className="h-3.5 w-3.5" />
                        Source
                      </a>
                      {project.live && (
                        <a
                          href={project.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
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
        </Reveal>

        {/* View more on GitHub */}
        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <a
            href="https://github.com/Nikunj2003"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/10 border-b-white/5 px-8 py-4 text-sm font-bold text-foreground shadow-accent-soft transition-all duration-300 glass hover:bg-white/10 hover:text-primary active:scale-95"
          >
            <Github className="h-5 w-5" />
            Explore more repositories
          </a>
        </Reveal>

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
