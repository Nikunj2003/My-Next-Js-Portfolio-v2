"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Bot } from "lucide-react";
import { chatSuggestions } from "@/data/portfolio";

const AITwinSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section id="ai-twin" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center glow-accent">
              <Bot className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">AI Twin</h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8" style={{ textWrap: "pretty" }}>
            Curious about my work? My AI twin can walk you through my projects, architecture decisions, and experience — just like I would. Click the chat button in the bottom-left corner.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {chatSuggestions.map((s) => (
              <span
                key={s}
                className="px-4 py-2 rounded-full text-xs font-medium glass-subtle text-muted-foreground"
              >
                "{s}"
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AITwinSection;
