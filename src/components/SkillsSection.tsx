import { Brain, Layers, Database, Server, Wrench } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import FlipWords from "@/components/ui/flip-words";
import Reveal from "@/components/ui/reveal";
import { skillCategories } from "@/data/portfolio";

/** Keyed by exact category title — a miss falls back to Wrench silently, so
 *  these must be updated in the same edit as any title change in portfolio.ts. */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Applied AI, Agents & Evaluation": Brain,
  "Languages & Backend": Layers,
  "Data, Retrieval & Storage": Database,
  "Platform, Observability & Delivery": Server,
};

const SkillsSection = () => {
  return (
    <section id="skills" className="section-padding relative z-10">
      <div className="container-narrow">
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:gap-20">

          {/* Left Column: Sticky Header */}
          <div className="w-full shrink-0 lg:sticky lg:top-32 lg:w-1/3">
            <div className="panel-sticky">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary">
                  Expertise
                </div>
                <h2 className="heading-xl mb-6">
                  Technical <br className="hidden lg:block" />
                  <span className="text-gradient">Stack</span>
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  The technologies I reach for most often when building agent systems, governed MCP tools, evaluation pipelines, and full-stack AI products.
                </p>

                <p className="mt-10 text-left text-base font-semibold text-foreground sm:text-xl md:text-2xl">
                  <FlipWords
                    variant="line"
                    words={["Learning fast.", "Building deep.", "Shipping reliably."]}
                    className="text-primary"
                  />
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Spotlight Cards */}
          <div className="flex w-full flex-col gap-6 lg:w-2/3">
            {skillCategories.map((cat, index) => {
              const Icon = CATEGORY_ICONS[cat.title] ?? Wrench;
              return (
                <Reveal key={cat.title} delay={index * 0.08}>
                  <SpotlightCard animateOnEnter={false} className="w-full">
                    <div className="p-8 sm:p-10">
                      <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/5 glass-subtle transition-transform duration-500 group-hover:scale-110 group-hover:border-primary/30">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="heading-md transition-colors duration-300 group-hover:text-primary">{cat.title}</h3>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{cat.skills.length} technologies</p>
                        </div>
                      </div>

                      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {cat.description}
                      </p>

                      <ul className="flex flex-wrap gap-2.5">
                        {cat.skills.map((skill) => (
                          <li
                            key={skill}
                            className="select-none rounded-xl border border-white/5 px-4 py-2 text-sm font-medium glass-subtle text-foreground/80 transition-all duration-300 hover:border-primary/40 hover:bg-white/10 hover:text-primary"
                          >
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
