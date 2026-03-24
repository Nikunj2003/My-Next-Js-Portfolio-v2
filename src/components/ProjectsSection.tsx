"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ExternalLink, Github } from "lucide-react";
import { projects, type Project } from "@/data/portfolio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
const PROJECT_IMAGE_SIZES = "(min-width: 1536px) 42rem, (min-width: 1024px) 40vw, 100vw";

function ProjectPreviewImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="aspect-[16/10] w-full bg-zinc-950 p-1">
      <div className="relative h-full w-full">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={PROJECT_IMAGE_SIZES}
          className="rounded-lg object-contain object-center opacity-90 transition-all duration-500 group-hover/img:opacity-100 pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

function ProjectShowcase({ project }: { project: Project }) {
  const [mediaRef, mediaInView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: "600px 0px" });

  return (
    <div ref={mediaRef} className="lg:w-1/2 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5 p-6 sm:p-10 flex items-center justify-center overflow-hidden group/img relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50 pointer-events-none" />

      {project.images && project.images.length > 0 ? (
        mediaInView ? (
          <Carousel className="w-full relative z-10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
            <CarouselContent>
              {project.images.map((img, idx) => (
                <CarouselItem key={`${project.title}-${img}`}>
                  <ProjectPreviewImage
                    src={img}
                    alt={`${project.title} screenshot ${idx + 1}`}
                    priority={idx === 0}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
              <CarouselPrevious className="left-4 bg-background/80 hover:bg-background border-none w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors z-20 shadow-xl" />
              <CarouselNext className="right-4 bg-background/80 hover:bg-background border-none w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors z-20 shadow-xl" />
            </div>
          </Carousel>
        ) : (
          <div className="w-full relative z-10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
            <ProjectPreviewImage src={project.images[0]} alt={`${project.title} preview`} />
          </div>
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
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const filtered = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <section id="projects" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>
        {/* Centered Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
                onClick={() => setFilter(cat)}
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
                key={project.title}
                className="w-full static lg:sticky"
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
                    <ProjectShowcase project={project} />

                  </div>
                </SpotlightCard>
              </div>
            );
          })}
        </div>

        {/* View more on GitHub */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
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
      </div>
    </section>
  );
};

export default ProjectsSection;
