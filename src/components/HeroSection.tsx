"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, MessageCircle, Download } from "lucide-react";
import { personalInfo, stats } from "@/data/portfolio";
import Card3D from "./Card3D";
import cardImage from "@/assets/card.png";

const AnimatedCounter = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(hsl(var(--accent)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium glass text-primary tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" />
                Available for opportunities
              </span>
            </motion.div>

            <motion.h1 variants={item} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              {personalInfo.name}
            </motion.h1>

            <motion.p variants={item} className="text-base sm:text-lg font-mono text-primary font-medium tracking-tight">
              {personalInfo.role}
            </motion.p>

            <motion.p variants={item} className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl" style={{ textWrap: "pretty" }}>
              {personalInfo.tagline}
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap gap-3 mt-2">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
              >
                View Projects
                <ArrowDown className="w-4 h-4" />
              </a>
              <a
                href="#ai-twin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass font-medium text-sm hover:bg-white/10 transition-all duration-300 active:scale-[0.97]"
              >
                <MessageCircle className="w-4 h-4" />
                Talk to my AI Twin
              </a>
              <a
                href={personalInfo.resumeUrl}
                download
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass font-medium text-sm hover:bg-white/10 transition-all duration-300 active:scale-[0.97]"
              >
                <Download className="w-4 h-4" />
                Resume
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-subtle rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-primary">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - 3D Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex justify-center"
          >
            <Card3D className="max-w-md w-full">
              <img
                src={cardImage.src}
                alt="Nikunj Khitha — Codenex"
                className="w-full h-auto rounded-2xl"
              />
            </Card3D>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
