"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { skillCategories } from "@/data/portfolio";

const SkillsSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="skills" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-bold text-center mb-16 tracking-tight"
        >
          Tech Stack
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCategories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-xl p-6"
            >
              <h3 className="text-sm font-mono font-semibold text-primary mb-4 tracking-wide">
                {cat.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium glass-subtle text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-200 cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
