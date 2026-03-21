"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ExternalLink, Github } from "lucide-react";
import { projects } from "@/data/portfolio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

const ProjectsSection = () => {
  const [filter, setFilter] = useState("All");
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const filtered = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <section id="projects" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-bold text-center mb-6 tracking-tight"
        >
          Projects
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground text-center mb-10 max-w-xl mx-auto"
        >
          Production-grade systems — not toy demos.
        </motion.p>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 ${
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "glass-subtle text-muted-foreground hover:text-foreground hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-xl flex flex-col hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group overflow-hidden border border-white/5"
            >
              <div className="w-full relative bg-black/20 overflow-hidden aspect-video group-hover:bg-black/40 transition-colors">
                {project.images && project.images.length > 0 ? (
                  <Carousel className="w-full h-full">
                    <CarouselContent>
                      {project.images.map((img, idx) => (
                        <CarouselItem key={idx}>
                          <img
                            src={img}
                            alt={`${project.title} screenshot ${idx + 1}`}
                            className="w-full h-full object-cover object-top"
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <CarouselPrevious className="left-2 bg-background/80 hover:bg-background border-none w-8 h-8 pointer-events-auto" />
                      <CarouselNext className="right-2 bg-background/80 hover:bg-background border-none w-8 h-8 pointer-events-auto" />
                    </div>
                  </Carousel>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    No image available
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary mb-3 block">
                  {project.category}
                </span>
                <h3 className="text-xl font-bold mb-3">{project.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                  {project.description}
                </p>
                
                <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 rounded-md text-[10px] font-mono glass-subtle text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-primary transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Source
                  </a>
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Live
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
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
            className="flex items-center gap-2 px-6 py-3 rounded-full glass-subtle text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-all duration-300 active:scale-95"
          >
            <Github className="w-4 h-4" />
            View more on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ProjectsSection;
