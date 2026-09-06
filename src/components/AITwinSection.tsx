"use client";
import { Bot, MessageCircle } from "lucide-react";
import { chatSuggestions } from "@/data/portfolio";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import Reveal from "@/components/ui/reveal";

const AITwinSection = () => {
  const { isAvailable, status, canAttemptChat } = useChatAvailability();

  const handlePromptClick = (question: string) => {
    window.dispatchEvent(new CustomEvent("open-ai-twin", { detail: { question } }));
  };

  const statusLabel =
    status === "available"
      ? "Live Assistant"
      : status === "checking"
        ? "Checking availability"
        : status === "unknown"
          ? "Status unknown"
        : "Assistant offline";

  const primaryButtonLabel =
    status === "available"
      ? "Open AI Chat"
      : status === "checking"
        ? "Checking AI Chat..."
        : status === "unknown"
          ? "Try AI Chat"
        : "View Chat Status";

  return (
    <section id="ai-twin" className="section-padding relative z-10">
      <div className="container-narrow">
        <Reveal>
          <SpotlightCard className="w-full relative">
            <div className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 text-center lg:text-left">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 pointer-events-none" />
              
              {/* Left Content */}
              <div className="flex-1 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle border border-black/10 dark:border-white/10 text-xs font-mono text-primary mb-6">
                  <span
                    className={`w-2 h-2 rounded-full motion-reduce:animate-none ${
                      status === "available"
                        ? "bg-primary animate-pulse"
                        : status === "checking"
                          ? "bg-amber-400 animate-pulse"
                          : status === "unknown"
                            ? "bg-amber-400/70"
                          : "bg-muted-foreground/60"
                    }`}
                  />
                  {statusLabel}
                </div>
                <h2 className="heading-xl mb-6">
                  Talk to my <br className="hidden lg:block"/>
                  <span className="text-gradient">AI Twin</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-4 max-w-xl text-pretty lg:mx-0 mx-auto">
                  {isAvailable
                    ? "Not a chat widget \u2014 a tool-calling agent over my actual work. It searches the case studies, looks up measured figures, compares systems, and navigates you to what it cites. Every tool call and its grounding is shown to you."
                    : status === "checking"
                      ? "Checking whether the live assistant is available right now. You can still open the chat panel while the status loads."
                      : status === "unknown"
                        ? "This browser could not verify the live assistant ahead of time. You can still open the chat and try sending a message."
                      : "The live assistant is temporarily unavailable. You can still browse the portfolio and open the chat panel for status details."}
                </p>
                <p className="text-sm text-foreground/75 mb-8 max-w-lg lg:mx-0 mx-auto">
                  It will also tell you when something is not measured rather than estimating a number \u2014 which is the same discipline the evaluation platform enforces.
                </p>

                {/* The tool surface, stated plainly. It is the artifact. */}
                <ul className="mb-8 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {["search_work", "get_case_study", "get_metric", "compare_systems", "navigate_to"].map((tool) => (
                    <li
                      key={tool}
                      className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[11px] text-primary/90"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handlePromptClick("")}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm tracking-wide transition-all duration-300 active:scale-95 ${
                    isAvailable
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--accent)/0.16)] hover:shadow-[0_0_24px_hsl(var(--accent)/0.22)]"
                      : "glass-subtle border border-black/10 dark:border-white/10 text-foreground"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {primaryButtonLabel}
                </button>
              </div>

              {/* Right Content - The Prompt Chips */}
              <div className="w-full lg:w-1/2 relative z-10 flex flex-col gap-3">
                <p className="text-xs font-mono text-foreground/50 mb-2 uppercase tracking-widest hidden lg:block ml-2">Suggested prompts</p>
                {chatSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handlePromptClick(s)}
                    disabled={!canAttemptChat}
                    className={`group w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 flex items-center justify-between shadow-accent-soft ${
                      canAttemptChat
                        ? "glass-subtle border-black/5 dark:border-white/5 hover:border-primary/30 hover:shadow-[0_14px_40px_hsl(var(--accent)/0.14)]"
                        : "glass-subtle border-black/5 dark:border-white/5 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mr-4">
                      &ldquo;{s}&rdquo;
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                       <Bot className="w-4 h-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
};

export default AITwinSection;
