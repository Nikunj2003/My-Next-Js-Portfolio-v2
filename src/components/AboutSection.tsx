"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { about } from "@/data/portfolio";
import logo from "@/assets/logo.png";

import { SpotlightCard } from "@/components/ui/spotlight-card";

const AboutSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="about" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <img src={logo.src} alt="NK" className="w-12 h-12 opacity-80 relative z-10 pointer-events-none" draggable="false" />
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary">
                  Profile
                </div>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                About <br className="hidden lg:block" />
                <span className="text-gradient">Nikunj</span>
              </h2>
            </motion.div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:w-2/3 flex flex-col gap-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed"
            >
              <p className="text-xl sm:text-2xl font-medium text-foreground tracking-tight leading-snug mb-6" style={{ textWrap: "pretty" }}>
                I am a passionate Full Stack Developer focused on architecting intelligent systems and seamless user experiences.
              </p>
              <p style={{ textWrap: "pretty" }}>
                {about.summary}
              </p>
            </motion.div>

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
