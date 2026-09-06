"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Briefcase, CalendarDays, GraduationCap } from "lucide-react";
import { experiences, type Experience } from "@/data/portfolio";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import FlipWords from "@/components/ui/flip-words";
import Reveal from "@/components/ui/reveal";

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
      <SpotlightCard delay={index * 0.08} className="h-full">
        <div className="p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="heading-md text-foreground">{exp.role}</h3>
              <span className="mt-1 block font-medium text-primary">{exp.company}</span>
            </div>

            <div className="flex w-full flex-col items-end gap-2 md:w-auto md:flex-none">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 glass-subtle px-3 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
                <MetaIcon className="h-3.5 w-3.5" />
                {metaLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 glass-subtle px-3 py-1.5 text-xs font-mono font-medium text-muted-foreground">
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


  return (
    <section id="experience" className="section-padding relative z-10">
      <div className="container-narrow">
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:gap-20">
          <div className="w-full shrink-0 lg:sticky lg:top-32 lg:w-1/3">
            <Reveal axis="x" offset={-24}>
              <div className="panel-sticky">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-mono text-primary">
                    Journey
                  </div>
                  <h2 className="heading-xl mb-6">
                    Professional <br className="hidden lg:block" />
                    <span className="text-gradient">Experience</span>
                  </h2>
                  <p className="max-w-md leading-relaxed text-muted-foreground">
                    I’ve grown from building public-sector software into delivering Applied AI systems, working through stakeholder discovery, agent architecture, governed tool integration, rollout, debugging, and iteration.
                  </p>

                  <div className="hidden lg:block">
                    <p className="mt-6 inline-flex flex-nowrap items-baseline whitespace-nowrap text-base font-semibold text-foreground sm:text-xl lg:mt-8">
                    And a new{" "}
                    <FlipWords words={["adventure", "chapter", "journey"]} slotWidth={9} className="px-2 text-primary" />{" "}
                    ahead
                  </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="relative w-full lg:w-2/3" ref={timelineRef}>
            <div className="absolute bottom-0 left-[24px] top-0 w-[2px] rounded-full bg-white/10 sm:left-[44px]" />

            <motion.div
              style={{ scaleY: shouldReduceMotion ? 1 : scrollYProgress }}
              className="absolute bottom-0 left-[24px] top-0 w-[2px] origin-top rounded-full bg-primary glow-accent-xs sm:left-[44px]"
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
              <p className="mt-6 inline-flex flex-nowrap items-baseline whitespace-nowrap text-base font-semibold text-foreground sm:text-xl lg:mt-8">
                    And a new{" "}
                    <FlipWords words={["adventure", "chapter", "journey"]} slotWidth={9} className="px-2 text-primary" />{" "}
                    ahead
                  </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
