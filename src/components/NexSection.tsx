"use client";
import { useEffect } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { chatSuggestions } from "@/data/portfolio";
import { openNex } from "@/lib/ask-nex";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { SpotlightCard } from "@/components/ui/spotlight-card";

/** The section's id before the assistant was named Nex; links to it still land here. */
export const LEGACY_SECTION_ID = "ai-twin";

const NexSection = () => {
  const { isAvailable, status, canAttemptChat } = useChatAvailability();

  // An old `#ai-twin` link lands on the anchor below; show the current address.
  useEffect(() => {
    const rewrite = () => {
      if (window.location.hash !== `#${LEGACY_SECTION_ID}`) return;
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#nex`);
    };
    rewrite();
    window.addEventListener("hashchange", rewrite);
    return () => window.removeEventListener("hashchange", rewrite);
  }, []);

  const handlePromptClick = (question: string) => {
    openNex(question);
  };

  const statusLabel =
    status === "available"
      ? "Nex · online"
      : status === "checking"
        ? "Nex · checking"
        : status === "unknown"
          ? "Nex · status unknown"
        : "Nex · offline";

  const primaryButtonLabel =
    status === "available"
      ? "Ask Nex"
      : status === "checking"
        ? "Checking Nex…"
        : status === "unknown"
          ? "Try Nex"
        : "View Nex's status";

  return (
    <section id="nex" className="section-padding relative z-10">
      <span id={LEGACY_SECTION_ID} aria-hidden="true" className="absolute top-0 block h-0 w-0" />
      <div className="container-narrow">
        <div data-guide-spot="nex">
          <SpotlightCard className="w-full relative">
            <div className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 text-center lg:text-left">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 pointer-events-none" />
              
              {/* Left Content */}
              <div className="flex-1 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle border border-black/10 dark:border-white/10 text-xs font-mono text-primary-text mb-6">
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
                <h2 className="heading-xl mb-2">
                  Meet <span className="text-gradient">Nex</span>
                </h2>
                <p className="text-xl sm:text-2xl font-semibold tracking-tight text-muted-foreground mb-6">The AI guide to Nikunj&apos;s work</p>
                <p className="text-muted-foreground text-lg leading-relaxed mb-4 max-w-xl text-pretty lg:mx-0 mx-auto">
                  {isAvailable
                    ? "Not a chat widget. Nex is a tool-calling agent over Nikunj\u2019s case studies: it searches them, looks up measured figures, compares systems, and takes you to what it cites. Every tool call is shown to you."
                    : status === "checking"
                      ? "Checking whether Nex is online. You can still open the chat while the status loads."
                      : status === "unknown"
                        ? "This browser couldn\u2019t check Nex\u2019s status ahead of time. You can still open the chat and try a question."
                      : "Nex is offline for now. The case studies, contact form and resume all still work."}
                </p>
                <p className="text-sm text-foreground/75 mb-8 max-w-lg lg:mx-0 mx-auto">
                  Ask for a number that isn&apos;t published and Nex says so instead of estimating, the same discipline Nikunj&apos;s evaluation platform enforces. It can only take you to pages on an allow-list, and it is scored against its own golden set.
                </p>

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
                <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest hidden lg:block ml-2">Suggested prompts</p>
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
                       <Bot className="w-4 h-4 text-primary-text" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
};

export default NexSection;
