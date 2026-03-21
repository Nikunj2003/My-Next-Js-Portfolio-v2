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
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Subtle background grid & Animated Glow Orb */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "radial-gradient(hsl(var(--accent)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      
      {/* Massive Glowing Animated Orbs */}
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite] opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse] opacity-40 pointer-events-none" />
      
      {/* Smooth fade into the next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 sm:h-64 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-0" />

      <div className="container-narrow relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left - Content */}
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-8 lg:col-span-7">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold glass-subtle border border-primary/20 text-primary tracking-wide shadow-[0_0_15px_rgba(41,214,185,0.15)]">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Available for New Opportunities
              </span>
            </motion.div>

            <div className="flex flex-col gap-2">
              <motion.h1 variants={item} className="text-4xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.1] sm:leading-[1.05]">
                {personalInfo.name}
              </motion.h1>
              <motion.h2 variants={item} className="text-xl sm:text-4xl font-semibold tracking-tight text-muted-foreground mt-2">
                Crafting <span className="text-gradient">Intelligent</span> Experiences
              </motion.h2>
            </div>

            <motion.p variants={item} className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl font-medium" style={{ textWrap: "pretty" }}>
              {personalInfo.tagline} I specialize in Full-Stack capabilities and Generative AI, building production-ready scalable systems.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row flex-wrap gap-4 mt-2">
              <a
                href="#projects"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(41,214,185,0.3)] hover:shadow-[0_0_35px_rgba(41,214,185,0.4)] transition-all duration-300 active:scale-95"
              >
                View Projects
                <ArrowDown className="w-4 h-4 ml-1" />
              </a>
              <a
                href={personalInfo.resumeUrl}
                download
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-3.5 rounded-full bg-white/5 dark:bg-white/[0.02] backdrop-blur-lg border border-primary/50 dark:border-primary/50 font-bold text-foreground text-sm tracking-wide hover:bg-primary/10 transition-all duration-300 active:scale-95"
              >
                <Download className="w-4 h-4 mr-1 text-primary" />
                Resume
              </a>
              <a
                href="#ai-twin"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full hover:bg-white/5 transition-all duration-300 font-semibold text-sm text-muted-foreground hover:text-foreground active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-primary" />
                Talk to AI Twin
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {stats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-primary/30 pl-4 py-1">
                  <div className="text-2xl font-bold tracking-tighter text-foreground">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - 3D Card wrapped in a delicate glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex justify-end lg:col-span-5 relative"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-transparent blur-[100px] rounded-full scale-150" />
             <div className="relative z-10 w-full max-w-[500px] xl:max-w-[600px] lg:scale-110 xl:scale-125 lg:origin-right lg:translate-x-4 xl:translate-x-12">
              <Card3D className="w-full">
                <img
                  src={cardImage.src}
                  alt="Nikunj Khitha — Business Card"
                  className="w-full h-auto rounded-3xl border border-white/10 shadow-2xl shadow-black/80"
                />
              </Card3D>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
