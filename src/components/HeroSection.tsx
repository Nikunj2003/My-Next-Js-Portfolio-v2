"use client";
import { useInView } from "react-intersection-observer";
import { ArrowDown, Download } from "lucide-react";
import Link from "next/link";
import { personalInfo, stats } from "@/data/portfolio";
import { GuideHeroAvatar } from "@/components/guide/GuideHeroAvatar";
import { HeroIntro } from "@/components/HeroIntro";
import { HeroAskButton } from "@/components/HeroAskButton";

/**
 * The hero. Its markup is static and final: the entrance is played over it by
 * `HeroIntro` (the avatar wakes up in the middle of the screen, takes its place
 * on the right, then the left side appears). The `data-hero-part` attributes
 * are what the intro moves; nothing here animates on its own.
 */
const HeroSection = () => {
  // The two large glow orbs pulse forever; pause them once the hero is off screen.
  const [heroRef, heroInView] = useInView({ threshold: 0 });
  const orbPlayState = heroInView ? "running" : "paused";

  const roleWords = personalInfo.role.split(" ");

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative flex min-h-[100svh] items-start overflow-hidden pt-[calc(5rem+env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:min-h-screen lg:items-center lg:pt-20 lg:pb-12"
    >
      <HeroIntro />

      {/* Subtle background grid & glow orbs */}
      <div data-hero-part="backdrop" aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(hsl(var(--accent)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full animate-[pulse_8s_ease-in-out_infinite] motion-reduce:animate-none opacity-50 bg-[radial-gradient(circle,hsl(var(--primary)/0.2)_0%,transparent_70%)]" style={{ animationPlayState: orbPlayState }} />
        <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] rounded-full animate-[pulse_10s_ease-in-out_infinite_reverse] motion-reduce:animate-none opacity-40 bg-[radial-gradient(circle,hsl(var(--accent)/0.2)_0%,transparent_70%)]" style={{ animationPlayState: orbPlayState }} />
      </div>

      {/* Smooth fade into the next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 sm:h-64 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-0" />

      <div className="container-narrow relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left - Content */}
          <div className="flex flex-col gap-6 sm:gap-8 lg:col-span-7">
            <div data-hero-part="copy" data-hero-glass>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold glass-subtle border border-primary/20 text-primary tracking-wide glow-accent-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                Available for New Opportunities
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h1 data-hero-part="copy" className="text-4xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.1] sm:leading-[1.05]">
                {personalInfo.name}
              </h1>
              {/* A tagline, not a heading: the section headings below are the h2s. */}
              <p data-hero-part="copy" className="text-xl sm:text-4xl font-semibold tracking-tight text-muted-foreground mt-2">
                {roleWords.slice(0, -1).join(" ")} <span className="text-gradient">{roleWords[roleWords.length - 1]}</span>
              </p>
            </div>

            <p data-hero-part="copy" className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl font-medium" style={{ textWrap: "pretty" }}>
              {personalInfo.tagline}
            </p>

            {/* Stats — placed above the CTAs because these numbers are the
                fastest proof in the first viewport, and each one links to the
                surface that backs it up. */}
            <div data-hero-part="copy" data-guide-target="hero-proof" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Deliberately no ask affordance here. Each stat already links to
                  the surface that proves it, and the hero's job in the first
                  viewport is a fast read — a second interactive element per tile
                  competed with that link for the same click. */}
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="group border-l-2 border-primary/30 py-1 pl-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="text-2xl font-bold tracking-tighter text-foreground tabular-nums">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
                    {stat.label}
                  </div>
                </Link>
              ))}
            </div>

            {/* Holds a solid button and a glass one: moved in, never faded. */}
            <div data-hero-part="copy" data-hero-glass className="mt-1 flex flex-col flex-wrap gap-3 sm:mt-2 sm:flex-row sm:gap-4">
              <a
                href="#work"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold tracking-wide text-primary-foreground transition-all duration-300 glow-accent-sm hover:glow-accent-md active:scale-95 sm:w-auto"
              >
                Read the case studies
                <ArrowDown className="ml-1 h-4 w-4" />
              </a>
              <a
                href={personalInfo.resumeUrl}
                download
                className="btn-cta-secondary w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-1 text-primary" />
                Resume
              </a>
              <HeroAskButton />
            </div>
          </div>

          {/* Right - Nex, the live AI guide */}
          <div data-guide-hero-column className="hidden lg:flex items-center justify-end lg:col-span-5 relative">
            <div data-hero-part="avatar-glow" className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--primary)/0.15)_0%,transparent_70%)] rounded-full scale-150" />
            {/* Sized to about the left column's height and centred on it, so
                the group reads as one block beside the copy. */}
            <div className="relative z-10 flex w-full max-w-[500px] justify-center xl:max-w-[600px]">
              <GuideHeroAvatar />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
