import Image from "next/image";
import { Award, Download, MapPin } from "lucide-react";
import { about, experiences, personalInfo, recognition } from "@/data/portfolio";
import { siteConfig } from "@/lib/seo/site";
import logo from "@/assets/logo.png";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import Reveal from "@/components/ui/reveal";

/** Latest entry is the current role; the earliest ArmorCode entry sets tenure. */
const currentRole = experiences[experiences.length - 1];
const armorCodeStart = experiences.find((experience) => experience.company === "ArmorCode");
const tenureLabel = armorCodeStart ? `${armorCodeStart.period.split(/\s*[-–]\s*/)[0]} — present` : currentRole.period;

/**
 * About section.
 *
 * Built on the same skeleton as Experience and Skills — sticky `panel-sticky`
 * sidebar (badge, two-line gradient heading, intro) beside a long scrolling
 * content column — so the three read as one system.
 *
 * Earlier attempts put the identity facts in the sidebar and only two
 * paragraphs beside them, which left the sidebar taller than its own column and
 * produced a large void. The highlights now live in the right column, which is
 * what gives the sticky something to travel against.
 */
const AboutSection = () => {
  return (
    <section id="about" className="section-padding relative z-10">
      <div className="container-narrow">
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:gap-20">

          {/* Left Column: Sticky Header */}
          <div className="w-full shrink-0 lg:sticky lg:top-32 lg:w-1/3">
            <Reveal axis="x" offset={-24}>
              <div className="panel-sticky">
                <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div aria-hidden="true" className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--accent)/0.6)]" />
                    Profile
                  </div>

                  <h2 className="heading-xl mb-6">
                    About <br className="hidden lg:block" />
                    <span className="text-gradient">Nikunj</span>
                  </h2>

                  <p className="max-w-md leading-relaxed text-muted-foreground">
                    {personalInfo.tagline}
                  </p>

                  {/* Identity facts, matching the weight of the FlipWords line
                      that closes the Experience and Skills sidebars. */}
                  <dl className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm">
                    <div className="flex items-start gap-3">
                      <dt className="w-14 shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        Role
                      </dt>
                      <dd className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug text-foreground">{currentRole.role}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {currentRole.company} · {tenureLabel}
                        </span>
                      </dd>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <dt className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        Based
                      </dt>
                      <dd className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                        {siteConfig.geo.placename}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
                    <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                      Open to new roles
                    </p>
                    <a
                      href={personalInfo.resumeUrl}
                      download
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Resume
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Content */}
          <div className="flex w-full min-w-0 flex-col gap-6 lg:w-2/3">
            <Reveal>
              <div className="flex items-start gap-5">
                <div className="relative hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 sm:flex">
                  <div aria-hidden="true" className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
                  <Image
                    src={logo}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none relative z-10 h-10 w-10 opacity-90"
                    draggable={false}
                  />
                </div>
                <p className="text-lg leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                  {about.summary}
                </p>
              </div>
            </Reveal>

            {/* Metric-led proof. Two across inside a 2/3 column keeps each card
                at a readable measure — three across gave ~23 chars per line. */}
            <div className="grid gap-4 sm:grid-cols-2">
              {about.highlights.map((highlight, i) => (
                <SpotlightCard key={highlight.label} delay={i * 0.05} className="h-full">
                  <div className="flex h-full flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-2xl font-bold leading-none tracking-tighter text-foreground tabular-nums">
                        {highlight.metric}
                      </span>
                      <span className="font-mono text-[11px] uppercase leading-snug tracking-wider text-primary">
                        {highlight.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                      {highlight.detail}
                    </p>
                  </div>
                </SpotlightCard>
              ))}
            </div>

            <Reveal delay={0.1}>
              <SpotlightCard className="overflow-hidden">
                <div className="flex items-start gap-5 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary glow-accent-sm">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary/80">Recognition</p>
                    <h3 className="heading-md mt-1 text-foreground">{recognition.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                      {recognition.detail}
                    </p>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
