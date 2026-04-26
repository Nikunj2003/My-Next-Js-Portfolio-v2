"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Award } from "lucide-react";
import { about, personalInfo } from "@/data/portfolio";
import logo from "@/assets/logo.png";

import { SpotlightCard } from "@/components/ui/spotlight-card";

const profileFocus = ["Production GenAI", "Backend platforms", "Automation systems"];

const AboutSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="about" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Sticky Header */}
          <div className="w-full lg:w-1/3 lg:sticky lg:top-32 shrink-0">
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 glass-subtle p-6 shadow-[0_0_40px_rgba(41,214,185,0.08)]">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-mono font-bold text-primary shadow-[0_0_12px_rgba(41,214,185,0.1)]">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(41,214,185,0.6)]" />
                    Profile
                  </div>

                  <div className="mb-6 flex items-center gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
                      <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl" />
                      <Image src={logo} alt="" aria-hidden="true" className="relative z-10 h-12 w-12 opacity-90 pointer-events-none" draggable={false} />
                    </div>

                    <div>
                      <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">About</p>
                      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                        <span className="text-gradient">Nikunj</span>
                      </h2>
                    </div>
                  </div>

                  <p className="mb-6 text-sm font-medium leading-relaxed text-foreground/85 sm:text-base">
                    {personalInfo.role} focused on reliable AI products, retrieval systems, and backend architecture.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {profileFocus.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:w-2/3 flex flex-col gap-10">
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, delay: shouldReduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed"
            >
              <p className="text-xl sm:text-2xl font-medium text-foreground tracking-tight leading-snug mb-6" style={{ textWrap: "pretty" }}>
                I build AI products and platform systems where accuracy, cost, reliability, and user experience all matter at the same time.
              </p>
              <p style={{ textWrap: "pretty" }}>
                {about.summary}
              </p>
            </motion.div>

            <SpotlightCard delay={0.25} className="overflow-hidden">
              <div className="p-6 sm:p-7">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_24px_rgba(41,214,185,0.12)]">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary/80">Recognition</p>
                    <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">AI Ninja Award at ArmorCode</h3>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  First person to receive ArmorCode&apos;s AI Ninja Award, and the youngest person to receive an award at the company.
                </p>
              </div>
            </SpotlightCard>

            {/* Mini Bento Stats / Highlights as Spotlight Cards */}
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {about.highlights.map((h, i) => (
                <SpotlightCard key={i} delay={0.3 + i * 0.1} className="h-full">
                  <div className="p-6 h-full flex flex-col justify-center">
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                      {h}
                    </p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
