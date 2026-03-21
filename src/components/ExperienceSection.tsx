"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Briefcase, GraduationCap } from "lucide-react";
import { experiences } from "@/data/portfolio";

const ExperienceSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="experience" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-bold text-center mb-16 tracking-tight"
        >
          Experience & Education
        </motion.h2>

        <div className="relative max-w-3xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

          {experiences.map((exp, i) => {
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isLeft ? -20 : 20, filter: "blur(4px)" }}
                animate={inView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`relative mb-12 md:w-[calc(50%-2rem)] ${
                  isLeft ? "md:mr-auto md:pr-0" : "md:ml-auto md:pl-0"
                } pl-12 md:pl-0`}
              >
                {/* Dot */}
                <div className={`absolute top-2 w-3 h-3 rounded-full bg-primary border-2 border-background left-[14px] md:left-auto ${
                  isLeft ? "md:-right-[1.85rem]" : "md:-left-[1.85rem]"
                }`} />

                <div className="glass rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    {exp.type === "work" ? (
                      <Briefcase className="w-4 h-4 text-primary" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-mono text-muted-foreground">{exp.period}</span>
                  </div>
                  <h3 className="text-lg font-bold">{exp.company}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{exp.role}</p>
                  <ul className="space-y-2">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-primary mt-1.5 shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
