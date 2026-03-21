"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ExternalLink, Github } from "lucide-react";
import { projects } from "@/data/portfolio";

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-xl p-6 flex flex-col hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary mb-3">
                {project.category}
              </span>
              <h3 className="text-lg font-bold mb-2">{project.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono glass-subtle text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  Source
                </a>
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Live
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
