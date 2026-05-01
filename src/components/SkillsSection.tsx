"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, Layers, Database, Server, Wrench } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { skillCategories } from "@/data/portfolio";

const SKILL_LINES = ["Learning fast.", "Building deep.", "Shipping reliably."];

function FlipSkill() {
  const [currentLine, setCurrentLine] = useState(SKILL_LINES[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  const startAnimation = useCallback(() => {
    const line = SKILL_LINES[SKILL_LINES.indexOf(currentLine) + 1] || SKILL_LINES[0];
    setCurrentLine(line);
    setIsAnimating(true);
  }, [currentLine]);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!isAnimating && isVisible) {
      const id = window.setTimeout(() => startAnimation(), 3000);
      return () => window.clearTimeout(id);
    }
  }, [isAnimating, isVisible, startAnimation]);

  return (
    <motion.h3
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
      className="mt-10 text-left text-base font-semibold text-foreground sm:text-xl md:text-2xl"
    >
      <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
        <motion.span
          key={currentLine}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 100, damping: 10 }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -40, x: 40, filter: "blur(8px)", scale: 2, position: "absolute" }
          }
          className="relative inline-block text-left text-primary"
        >
          {currentLine.split("").map((letter, index) => (
            <motion.span
              key={`${currentLine}-${index}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: index * (shouldReduceMotion ? 0.02 : 0.08), duration: shouldReduceMotion ? 0.18 : 0.4 }}
              className="inline-block"
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.h3>
  );
}

// Icons for each category
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Backend & Product Engineering": Layers,
  "GenAI, Agents & Retrieval": Brain,
  "Data & Search Infrastructure": Database,
  "Platform, DevOps & Delivery": Server,
  "Product Tooling & UX": Wrench,
};

const SkillsSection = () => {
  return (
    <section id="skills" className="section-padding relative">
      <div className="container-narrow">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">

          {/* Left Column: Sticky Header */}
          <div className="w-full lg:w-1/3 lg:sticky lg:top-32 shrink-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 glass-subtle p-6 shadow-[0_0_40px_rgba(41,214,185,0.08)]">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-mono text-primary mb-6">
                  Expertise
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                  Technical <br className="hidden lg:block" />
                  <span className="text-gradient">Stack</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                  The technologies I reach for most often when building backend systems, full-stack products, gateways, production infrastructure, and AI-powered workflows.
                </p>

                <FlipSkill />
              </div>
            </div>
          </div>

          {/* Right Column: Spotlight Cards */}
          <div className="lg:w-2/3 flex flex-col gap-6 w-full">
            {skillCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.title] ?? Wrench;
              return (
                <SpotlightCard key={cat.title} animateOnEnter={false} className="w-full">
                  <div className="p-8 sm:p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl glass-subtle border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 group-hover:border-primary/30">
                        <Icon className="w-5 h-5 text-primary group-hover:text-primary transition-colors duration-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">{cat.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{cat.skills.length} technologies</p>
                      </div>
                    </div>

                    <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {cat.description}
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      {cat.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-4 py-2 rounded-xl text-sm font-medium glass-subtle text-foreground/80 border border-white/5 hover:bg-white/10 hover:border-primary/40 hover:text-primary transition-all duration-300 select-none"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
