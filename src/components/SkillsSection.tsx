"use client";
import { skillCategories } from "@/data/portfolio";
import { Brain, Layers, Database, Server, Wrench } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";

// Icons for each category
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Generative AI & ML": Brain,
  "Full Stack Development": Layers,
  "Databases & Data": Database,
  "DevOps & Infrastructure": Server,
  "Dev Tools & Platforms": Wrench,
};

const SkillsSection = () => {
  return (
    <section id="skills" className="section-padding relative">
      <div className="container-narrow">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">

          {/* Left Column: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 shrink-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary mb-6">
                Expertise
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Technical <br className="hidden lg:block" />
                <span className="text-gradient">Arsenal</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                A carefully curated stack of 60+ technologies. I focus on building scalable architectures, integrating cutting-edge Generative AI models, and shipping beautiful, performant interfaces.
              </p>
            </div>
          </div>

          {/* Right Column: Spotlight Cards */}
          <div className="lg:w-2/3 flex flex-col gap-6 w-full">
            {skillCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.title] ?? Wrench;
              return (
                <SpotlightCard key={cat.title} animateOnEnter={false} className="w-full">
                  <div className="p-8 sm:p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl glass-subtle border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 group-hover:border-primary/30">
                        <Icon className="w-5 h-5 text-primary group-hover:text-primary transition-colors duration-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">{cat.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{cat.skills.length} technologies</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {cat.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-4 py-2 rounded-xl text-sm font-medium glass-subtle text-foreground/80 border border-white/5 hover:bg-white/10 hover:border-primary/40 hover:text-primary transition-all duration-300 select-none"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
