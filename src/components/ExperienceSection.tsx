"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Briefcase } from "lucide-react";

const CHAPTER_WORDS = ["adventure", "chapter", "journey"];

function FlipChapter() {
  const [currentWord, setCurrentWord] = useState(CHAPTER_WORDS[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

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
      const id = setTimeout(() => startAnimation(), 3000);
      return () => clearTimeout(id);
    }
  }, [isAnimating, isVisible, startAnimation]);

  return (
    <motion.h3
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-10 text-left text-base font-semibold text-foreground sm:text-xl md:text-2xl"
    >
      And a new{" "}
      <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
        <motion.span
          key={currentWord}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          exit={{ opacity: 0, y: -40, x: 40, filter: "blur(8px)", scale: 2, position: "absolute" }}
          className="relative inline-block px-2 text-left text-primary"
        >
          {currentWord.split("").map((letter, i) => (
            <motion.span
              key={currentWord + i}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
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

const OLD_EXPERIENCE_DATA = [
  {
    title: "Software Development Intern",
    organisation: {
      name: "Central Electricity Authority, Government of India",
    },
    date: "May 2023 - July 2023",
    description:
      "At the CEA, I got to work on several impactful projects. My main task was to improve a national renewable energy dashboard that monitors over 150 power stations. By integrating it with the National Power Portal using Java, I successfully boosted its data accuracy by 30%. I also took the lead on building a secure file management system from scratch using PHP and MySQL. I implemented role-based access control and optimized it to handle over 5,000 files, making retrieval 25% faster. To improve office efficiency, I built a full-stack MERN conference room booking system, which was a big hit—it cut booking times by 60% and reduced scheduling errors by 40%.",
  },
  {
    title: "Software Development Engineer (SDE) Intern",
    organisation: {
      name: "Xansr Software Private Ltd.",
    },
    date: "June 2024 - Jan 2025",
    description:
      "My time at Xansr was a deep dive into AI and scalable back-end systems. I was responsible for developing microservices with Node.js and FastAPI, where I applied Test-Driven Development to hit 100% test coverage and increase API performance by 40%. To streamline our workflow, I designed and implemented CI/CD pipelines using Docker and GitHub Actions, which cut our deployment time by 42%. I'm especially proud of two AI projects I engineered: 'Fantasy GPT,' a chatbot for sports fans that I built to 98% accuracy using RAG and LangGraph, and 'AIKO,' a media assistant that generates personalized sports highlights with real-time commentary. I also built the data foundation for these services, creating scalable ETL pipelines with MSSQL and Azure that ensured 100% data accuracy.",
  },
  {
    title: "AI Automation Intern",
    organisation: {
      name: "Armorcode Inc.",
    },
    date: "Jan 2025 - Nov 2025",
    description:
      "At Armorcode, I focused on backend development for the core platform agent using Java and Spring Boot. I designed and implemented new APIs, refined AI prompts for security workflows, and managed the AWS S3 vector knowledge base. I spearheaded AI-driven code-to-documentation automation using CrewAI and MCP servers, generating documentation for 250+ security integrations and reducing update latency by 99% (72h to 45m). I also established a universal LLM access layer by building an OpenAI-compatible proxy API supporting Gemini and Claude, deployed LiteLLM for monitoring 15+ AI APIs with centralized cost management.",
  },
  {
    title: "Associate Engineer",
    organisation: {
      name: "Armorcode Inc.",
    },
    date: "Dec 2025 - Present",
    description:
      "Promoted to Associate Engineer, I now architect enterprise-scale GenAI platforms serving 200+ enterprise customers. I designed a GraphRAG platform using Neo4j and PGVector unifying 500,000+ data entities from 5+ systems (Jira, Qmetry, Zendesk), achieving 40% improved retrieval accuracy. I orchestrated advanced GraphRAG and LightRAG ETL pipelines, reducing LLM data indexing costs by 50% and saving $15,000+ annually. I enhanced the core Armorcode platform backend (Java, Spring Boot), deploying 10+ REST APIs serving 5,000+ daily requests with 99.8% uptime. I devised end-to-end automation suites for enterprise operations (Zendesk support, QA triage, HR screening, marketing AI images) using n8n, Java microservices, and Python scripts, eliminating 200+ manual hours monthly.",
  },
];

function TimelineIcon({ iconRef }: { iconRef: React.RefObject<HTMLLIElement | null> }) {
  const [inView, setInView] = useState(false);
  const pathLength = useSpring(0, { stiffness: 100, damping: 20 });

  useEffect(() => {
    const el = iconRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        pathLength.set(entry.isIntersecting ? 1 : 0);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [iconRef, pathLength]);

  return (
    <figure className="absolute left-[25px] sm:left-[45px] -translate-x-1/2 w-[50px] h-[50px] sm:w-[75px] sm:h-[75px] flex items-center justify-center stroke-foreground top-2 md:top-4">
      <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
        <circle cx="50" cy="50" r="20" className="fill-background stroke-primary/20 stroke-1" />
        <motion.circle
          style={{ pathLength }}
          cx="50"
          cy="50"
          r="20"
          className="fill-none stroke-primary stroke-[5px]"
        />
        <circle cx="50" cy="50" r="10" className={`fill-primary stroke-1 transition-opacity duration-500 ${inView ? "opacity-100" : "opacity-0"}`} />
      </svg>
    </figure>
  );
}

import { SpotlightCard } from "@/components/ui/spotlight-card";

// ... [Keep CHAPTER_WORDS, FlipChapter, OLD_EXPERIENCE_DATA, TimelineIcon as they were] ...

const ExperienceItem = ({ exp, index }: { exp: typeof OLD_EXPERIENCE_DATA[0]; index: number }) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li ref={ref} className="relative mb-12 sm:mb-16 flex w-full flex-col gap-1 pl-[50px] sm:pl-[90px]">
      <TimelineIcon iconRef={ref} />
      <SpotlightCard delay={index * 0.05}>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground">
                {exp.title}
              </h3>
              <span className="text-primary font-medium mt-1 block">
                {exp.organisation.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
              {exp.date}
            </div>
          </div>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed" style={{ textWrap: "pretty" }}>
            {exp.description}
          </p>
        </div>
      </SpotlightCard>
    </li>
  );
};

const ExperienceSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollYProgress = useMotionValue(0);

  useEffect(() => {
    let frameId: number | null = null;

    const updateProgress = () => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportThreshold = window.innerHeight * 0.8;
      const total = Math.max(rect.height, 1);
      const rawProgress = (viewportThreshold - rect.top) / total;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));

      scrollYProgress.set(clampedProgress);
      frameId = null;
    };

    const requestUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateProgress);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [scrollYProgress]);

  const [sectionRef, inView] = useInView({ triggerOnce: true, threshold: 0 });

  return (
    <section id="experience" className="section-padding relative z-10">
      <div className="container-narrow" ref={sectionRef}>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center px-3 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary mb-6">
                Journey
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Professional <br className="hidden lg:block" />
                <span className="text-gradient">Experience</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                My career path from intern to engineering enterprise-scale AI platforms.
              </p>
              
              <div className="hidden lg:block">
                <FlipChapter />
              </div>
            </motion.div>
          </div>

          {/* Right Column: Timeline */}
          <div className="lg:w-2/3 relative w-full" ref={ref} style={{ position: "relative" }}>
            {/* Background Timeline Line */}
            <div className="absolute left-[24px] sm:left-[44px] bottom-0 top-0 w-[2px] rounded-full bg-white/10 origin-top" />

            {/* Glowing Animated Scroll Line */}
            <motion.div
              style={{ scaleY: scrollYProgress }}
              className="absolute left-[24px] sm:left-[44px] bottom-0 top-0 w-[2px] rounded-full bg-primary origin-top shadow-[0_0_8px_rgba(41,214,185,0.4)] sm:shadow-[0_0_15px_rgba(41,214,185,0.6)]"
            />

            <ul className="w-full relative py-4">
              {OLD_EXPERIENCE_DATA.map((exp, index) => (
                <ExperienceItem key={index} exp={exp} index={index} />
              ))}
            </ul>
            
            <div className="lg:hidden mt-8 pl-[50px] sm:pl-[90px]">
              <FlipChapter />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
