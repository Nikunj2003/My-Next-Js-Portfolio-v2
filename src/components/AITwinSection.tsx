"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Bot, MessageCircle } from "lucide-react";
import { chatSuggestions } from "@/data/portfolio";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const AITwinSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });

  const handlePromptClick = (question: string) => {
    window.dispatchEvent(new CustomEvent("open-ai-twin", { detail: { question } }));
  };

  return (
    <section id="ai-twin" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <SpotlightCard className="w-full relative shadow-2xl shadow-black/50">
            <div className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 text-center lg:text-left">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 pointer-events-none" />
              
              {/* Left Content */}
              <div className="flex-1 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle border border-black/10 dark:border-white/10 text-xs font-mono text-primary mb-6">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(41,214,185,0.8)]" />
                  Interactive Mode
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Talk to my <br className="hidden lg:block"/>
                  <span className="text-gradient">AI Twin</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl text-pretty lg:mx-0 mx-auto">
                  Curious about my work? My AI twin can walk you through my projects, architecture decisions, and experience — just like I would.
                </p>
                <button 
                  onClick={() => handlePromptClick("")}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(41,214,185,0.3)] hover:shadow-[0_0_30px_rgba(41,214,185,0.4)] transition-all duration-300 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open AI Chat
                </button>
              </div>

              {/* Right Content - The Prompt Chips */}
              <div className="w-full lg:w-1/2 relative z-10 flex flex-col gap-3">
                <p className="text-xs font-mono text-foreground/50 mb-2 uppercase tracking-widest hidden lg:block ml-2">Suggested prompts</p>
                {chatSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handlePromptClick(s)}
                    className="group w-full text-left px-5 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-md"
                  >
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mr-4">
                      "{s}"
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                       <Bot className="w-4 h-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    </section>
  );
};

export default AITwinSection;
