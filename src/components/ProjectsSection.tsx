"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ExternalLink, Github, Maximize2 } from "lucide-react";
import { projects, type Project } from "@/data/portfolio";
import { PROJECT_ANCHOR_PREFIX } from "@/lib/ai-twin";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import ProjectImageViewer from "@/components/ProjectImageViewer";

const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
const PROJECT_IMAGE_SIZES = "(min-width: 1536px) 42rem, (min-width: 1024px) 40vw, 100vw";

function ProjectPreviewImage({ src, alt, priority = false, eager = false }: { src: string; alt: string; priority?: boolean; eager?: boolean }) {
  return (
    <div className="aspect-[16/10] w-full bg-zinc-950 p-1">
      <div className="relative h-full w-full">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={eager ? "eager" : undefined}
          fetchPriority={priority ? "high" : undefined}
          sizes={PROJECT_IMAGE_SIZES}
          className="rounded-lg object-contain object-center opacity-90 transition-all duration-500 group-hover/img:opacity-100 pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

function ProjectShowcase({
  project,
  priority,
  onOpenViewer,
}: {
  project: Project;
  priority: boolean;
  onOpenViewer: (project: Project, index: number) => void;
}) {
  const [mediaRef, mediaInView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: "600px 0px" });
  const hasPrefetchedRef = useRef(false);

  const prefetchProjectImages = useCallback((targetIndex?: number) => {
    if (hasPrefetchedRef.current || project.images.length === 0 || typeof window === "undefined") {
      return;
    }

    hasPrefetchedRef.current = true;

    const indexes = typeof targetIndex === "number"
      ? [targetIndex - 1, targetIndex, targetIndex + 1]
      : [0, 1];

    for (const index of indexes) {
      const src = project.images[index];
      if (!src) continue;

      const image = new window.Image();
      image.decoding = "async";
      image.src = src;
    }
  }, [project.images]);

  useEffect(() => {
    if (!mediaInView || project.images.length === 0) return;

    const timeoutId = window.setTimeout(prefetchProjectImages, 180);
    return () => window.clearTimeout(timeoutId);
  }, [mediaInView, prefetchProjectImages, project.images.length]);

  return (
    <div ref={mediaRef} className="lg:w-1/2 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5 p-6 sm:p-10 flex items-center justify-center overflow-hidden group/img relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50 pointer-events-none" />

      {project.images && project.images.length > 0 ? (
        mediaInView ? (
          <Carousel className="w-full relative z-10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
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
                    aria-label={`Open ${project.title} screenshot ${idx + 1} in viewer`}
                  >
                    <ProjectPreviewImage
                      src={img}
                      alt={`${project.title} screenshot ${idx + 1}`}
                      priority={priority && idx === 0}
                      eager={priority && idx === 0}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover/viewer:opacity-100 transition-opacity duration-300" />
                    <div className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-mono text-white/90 backdrop-blur-md shadow-lg">
                      <Maximize2 className="h-3.5 w-3.5" />
                      {project.images.length > 1 ? "View gallery" : "View image"}
                    </div>
                    {project.images.length > 1 && (
                      <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] font-mono text-white/80 backdrop-blur-md">
                        {idx + 1}/{project.images.length}
                      </div>
                    )}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="opacity-100 lg:opacity-0 lg:group-hover/img:opacity-100 lg:group-focus-within/img:opacity-100 transition-opacity duration-300">
              <CarouselPrevious className="left-4 bg-background/80 hover:bg-background border-none w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors z-20 shadow-xl" />
              <CarouselNext className="right-4 bg-background/80 hover:bg-background border-none w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors z-20 shadow-xl" />
            </div>
          </Carousel>
        ) : (
          <button
            type="button"
            onClick={() => {
              prefetchProjectImages(0);
              onOpenViewer(project, 0);
            }}
            onMouseEnter={() => prefetchProjectImages(0)}
            onFocus={() => prefetchProjectImages(0)}
            onTouchStart={() => prefetchProjectImages(0)}
            className="group/viewer w-full relative z-10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label={`Open ${project.title} preview in viewer`}
          >
            <ProjectPreviewImage src={project.images[0]} alt={`${project.title} preview`} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover/viewer:opacity-100 transition-opacity duration-300" />
            <div className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-mono text-white/90 backdrop-blur-md shadow-lg">
              <Maximize2 className="h-3.5 w-3.5" />
              {project.images.length > 1 ? "View gallery" : "View image"}
            </div>
          </button>
        )
      ) : (
        <div className="aspect-[16/10] w-full flex items-center justify-center rounded-xl ring-1 ring-white/10 bg-zinc-950/50 text-muted-foreground text-sm font-mono z-10">
          {">"} No preview available
        </div>
      )}

    </div>
  );
}

const ProjectsSection = () => {
  const [filter, setFilter] = useState("All");
  const [viewerState, setViewerState] = useState<{ open: boolean; project: Project | null; index: number }>({
    open: false,
    project: null,
    index: 0,
  });
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  const filtered = filter === "All" ? projects : projects.filter((p) => p.category === filter);
  const activeViewerProject = viewerState.project;

  const handleOpenViewer = useCallback((project: Project, index: number) => {
    setViewerState({ open: true, project, index });
  }, []);

  return (
    <section id="projects" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>
        {/* Centered Header */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 flex flex-col items-center"
        >
          <div className="inline-flex items-center px-3 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary mb-6">
            Portfolio
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Featured <span className="text-gradient">Work</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-xl text-lg">
            Production-grade systems, AI platforms, and scalable applications built to solve complex problems.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                aria-pressed={filter === cat}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 border ${
                  filter === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(41,214,185,0.4)]"
                    : "glass-subtle text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/10 hover:border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stacked Cards Layout */}
        <div className="flex flex-col gap-8 relative pb-20 max-w-5xl 2xl:max-w-7xl mx-auto">
          {filtered.map((project, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={project.slug}
                id={`${PROJECT_ANCHOR_PREFIX}${project.slug}`}
                data-project-slug={project.slug}
                className="scroll-mt-28 w-full static lg:sticky"
                // The stack offset calculates top position so cards visually overlap like a deck
                style={{
                  top: `calc(10vh + ${i * 30}px)`,
                  // Z-index increases so subsequent cards go over previous ones
                  zIndex: i,
                }}
              >
                <SpotlightCard className="w-full relative shadow-2xl shadow-black/50 bg-background dark:bg-background border-black/10 dark:border-white/10 backdrop-blur-none backdrop-saturate-100">
                  <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} min-h-[450px]`}>
                    
                    {/* Content Section */}
                    <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center flex-1 lg:w-1/2 static z-10">
                      <span className="text-xs font-mono uppercase tracking-widest text-primary mb-4 block">
                        {project.category}
                      </span>
                      <h3 className="text-3xl font-bold mb-4 tracking-tight leading-tight">{project.title}</h3>
                      <p className="text-base text-muted-foreground leading-relaxed mb-8 flex-1 text-pretty">
                        {project.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-8">
                        {project.tech.map((t) => (
                          <span
                            key={t}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-6 mt-auto">
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors hover:bg-primary/10 px-4 py-2 rounded-lg -ml-4"
                        >
                          <Github className="w-5 h-5" />
                          Source Code
                        </a>
                        {project.live && (
                          <a
                            href={project.live}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors hover:bg-primary/10 px-4 py-2 rounded-lg"
                          >
                            <ExternalLink className="w-5 h-5" />
                            Live Demo
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Image / Carousel Showcase Section */}
                    <ProjectShowcase project={project} priority={i === 0} onOpenViewer={handleOpenViewer} />

                  </div>
                </SpotlightCard>
              </div>
            );
          })}
        </div>

        {/* View more on GitHub */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={shouldReduceMotion ? { duration: 0.2 } : { delay: 0.5 }}
          className="flex justify-center mt-12"
        >
          <a
            href="https://github.com/Nikunj2003"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 rounded-full glass border border-white/10 border-b-white/5 text-sm font-bold text-foreground hover:text-primary hover:bg-white/10 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(41,214,185,0.2)] active:scale-95"
          >
            <Github className="w-5 h-5" />
            Explore more repositories
          </a>
        </motion.div>

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
