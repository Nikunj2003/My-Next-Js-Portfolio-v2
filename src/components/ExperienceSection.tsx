"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Briefcase, CalendarDays, GraduationCap } from "lucide-react";
import { experiences, type Experience } from "@/data/portfolio";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const CHAPTER_WORDS = ["adventure", "chapter", "journey"];

function FlipChapter() {
  const [currentWord, setCurrentWord] = useState(CHAPTER_WORDS[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  const startAnimation = useCallback(() => {
    const word = CHAPTER_WORDS[CHAPTER_WORDS.indexOf(currentWord) + 1] || CHAPTER_WORDS[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord]);

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
      className="mt-10 whitespace-nowrap text-left text-base font-semibold text-foreground sm:text-lg md:text-xl"
    >
      And a new{" "}
      <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
        <motion.span
          key={currentWord}
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
          className="relative inline-block px-2 text-left text-primary"
        >
          {currentWord.split("").map((letter, index) => (
            <motion.span
              key={`${currentWord}-${index}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: index * (shouldReduceMotion ? 0.02 : 0.08), duration: shouldReduceMotion ? 0.18 : 0.4 }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>{" "}
      ahead
    </motion.h3>
  );
}

function TimelineIcon({
  timelineRef,
  lineProgress,
}: {
  timelineRef: React.RefObject<HTMLDivElement | null>;
  lineProgress: MotionValue<number>;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [fillWindow, setFillWindow] = useState({ start: 0, end: 1 });

  useEffect(() => {
    const timeline = timelineRef.current;
    const figure = figureRef.current;
    if (!timeline || !figure) return;

    const measure = () => {
      const timelineRect = timeline.getBoundingClientRect();
      const figureRect = figure.getBoundingClientRect();
      const totalHeight = Math.max(timelineRect.height, 1);
      const start = Math.max(0, Math.min(1, (figureRect.top - timelineRect.top) / totalHeight));
      const end = Math.max(start + 0.001, Math.min(1, (figureRect.bottom - timelineRect.top) / totalHeight));

      setFillWindow({ start, end });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(timeline);
    resizeObserver.observe(figure);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [timelineRef]);

  const rawPathLength = useTransform(lineProgress, [fillWindow.start, fillWindow.end], [0, 1], {
    clamp: true,
  });
  const pathLength = useSpring(rawPathLength, { stiffness: 180, damping: 24, mass: 0.25 });
  const fillOpacity = useTransform(pathLength, [0.82, 1], [0, 1], { clamp: true });

  return (
    <figure
      ref={figureRef}
      className="absolute left-[25px] top-2 flex h-[50px] w-[50px] -translate-x-1/2 items-center justify-center stroke-foreground sm:left-[45px] sm:h-[75px] sm:w-[75px] md:top-4"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full rotate-[-90deg]">
        <circle cx="50" cy="50" r="20" className="fill-background stroke-primary/20 stroke-1" />
        <motion.circle
          style={{ pathLength: shouldReduceMotion ? 1 : pathLength }}
          cx="50"
          cy="50"
          r="20"
          className="fill-none stroke-primary stroke-[5px]"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="10"
          style={{ opacity: shouldReduceMotion ? 1 : fillOpacity }}
          className="fill-primary stroke-1"
        />
      </svg>
    </figure>
  );
}

function ExperienceItem({
  exp,
  index,
  timelineRef,
  lineProgress,
}: {
  exp: Experience;
  index: number;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  lineProgress: MotionValue<number>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const MetaIcon = exp.type === "education" ? GraduationCap : Briefcase;
  const metaLabel = exp.type === "education" ? "Education" : "Experience";

  return (
    <li ref={ref} className="relative mb-12 flex w-full flex-col gap-1 pl-[50px] sm:mb-16 sm:pl-[90px]">
      <TimelineIcon timelineRef={timelineRef} lineProgress={lineProgress} />
      <SpotlightCard delay={index * 0.05} className="h-full">
        <div className="p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground md:text-2xl">{exp.role}</h3>
              <span className="mt-1 block font-medium text-primary">{exp.company}</span>
            </div>

            <div className="flex w-full flex-col items-end gap-2 md:w-auto md:flex-none">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
                <MetaIcon className="h-3.5 w-3.5" />
                {metaLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {exp.period}
              </span>
            </div>
          </div>

          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            <li className="flex gap-3 text-foreground/90">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{exp.summary}</span>
            </li>
            {exp.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-pretty">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </SpotlightCard>
    </li>
  );
}

const ExperienceSection = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      scrollYProgress.set(1);
      return;
    }

    const element = timelineRef.current;
    if (!element) return;

    let frameId: number | null = null;
    let isTracking = false;

    const updateProgress = () => {
      const rect = element.getBoundingClientRect();
      const viewportThreshold = window.innerHeight * 0.8;
      const total = Math.max(rect.height, 1);
      const rawProgress = (viewportThreshold - rect.top) / total;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));

      scrollYProgress.set(clampedProgress);
      frameId = null;
    };

    const requestUpdate = () => {
      if (!isTracking || frameId !== null) return;
      frameId = window.requestAnimationFrame(updateProgress);
    };

    const startTracking = () => {
      if (isTracking) return;
      isTracking = true;
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);
      requestUpdate();
    };

    const stopTracking = () => {
      if (!isTracking) return;
      isTracking = false;
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTracking();
        } else {
          stopTracking();
        }
      },
      { rootMargin: "20% 0px 20% 0px" }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      stopTracking();
    };
  }, [scrollYProgress, shouldReduceMotion]);

  const [sectionRef, inView] = useInView({ triggerOnce: true, threshold: 0 });

  return (
    <section id="experience" className="section-padding relative z-10">
      <div className="container-narrow" ref={sectionRef}>
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:gap-20">
          <div className="shrink-0 lg:sticky lg:top-32 lg:w-1/3">
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 glass-subtle p-6 shadow-[0_0_40px_rgba(41,214,185,0.08)] sm:p-7 lg:p-8">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute -bottom-20 left-6 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-mono text-primary">
                    Journey
                  </div>
                  <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                    Professional <br className="hidden lg:block" />
                    <span className="text-gradient">Experience</span>
                  </h2>
                  <p className="mb-8 max-w-md leading-relaxed text-muted-foreground">
                    I’ve grown from building public-sector software into shipping backend systems, platform tooling, and AI products where reliability, delivery speed, retrieval quality, and usability all have to work together.
                  </p>

                  <div className="hidden lg:block">
                    <FlipChapter />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="relative w-full lg:w-2/3" ref={timelineRef}>
            <div className="absolute bottom-0 left-[24px] top-0 w-[2px] rounded-full bg-white/10 sm:left-[44px]" />

            <motion.div
              style={{ scaleY: shouldReduceMotion ? 1 : scrollYProgress }}
              className="absolute bottom-0 left-[24px] top-0 w-[2px] origin-top rounded-full bg-primary shadow-[0_0_6px_rgba(41,214,185,0.18)] sm:left-[44px] sm:shadow-[0_0_12px_rgba(41,214,185,0.24)]"
            />

            <ul className="relative w-full py-4">
              {experiences.map((experience, index) => (
                <ExperienceItem
                  key={`${experience.company}-${experience.period}`}
                  exp={experience}
                  index={index}
                  timelineRef={timelineRef}
                  lineProgress={scrollYProgress}
                />
              ))}
            </ul>

            <div className="mt-8 pl-[50px] lg:hidden sm:pl-[90px]">
              <FlipChapter />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
