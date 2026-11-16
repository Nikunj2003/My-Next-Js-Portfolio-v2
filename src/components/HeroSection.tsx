"use client";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { personalInfo, stats } from "@/data/portfolio";
import { GuideHeroAvatar, HeroAskHost } from "@/components/guide/GuideHeroAvatar";
import { HeroIntro } from "@/components/HeroIntro";
import { HeroRestOffset } from "@/components/HeroRestOffset";
import { HeroActions } from "@/components/HeroAskButton";

/**
 * The hero: Nikunj · Nex · Khitha, one identity row built around the live
 * guide, then the role, the line, one row of actions and the proof figures.
 *
 * Height budget (desktop, Sora name at its measured width):
 *   nav bottom + 48 · availability 24 · 28 · identity 240 (200 when short)
 *   · 16 · caption 44 · links 32 · 24 · role 36 · 12 · tagline 54 · 28
 *   · actions 48 · 32 · proof 56
 * which is ~838px from the top at 1440x900, so identity to actions sit above
 * the fold and the figures at its edge; on shorter screens the stage drops to
 * 200px and the figures continue below the fold rather than anything being
 * hidden or squeezed.
 *
 * Its markup is static; `HeroIntro` plays the entrance over it. The
 * `data-hero-part` / `data-hero-name` attributes are what the intro moves.
 */
const HeroSection = () => {
  // The two large glow orbs pulse forever; pause them once the hero is off screen.
  const [heroRef, heroInView] = useInView({ threshold: 0 });
  const orbPlayState = heroInView ? "running" : "paused";

  const [firstName, ...rest] = personalInfo.name.split(" ");
  const lastName = rest.join(" ");

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative flex min-h-[100svh] flex-col overflow-hidden pb-[calc(var(--hero-gap)*1.5)] pt-[calc(var(--nav-top)+var(--nav-height)+var(--hero-gap))]"
    >
      <HeroIntro />

      {/* Background: a faint dot grid and two slow glows, behind everything. */}
      <div data-hero-part="backdrop" aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(hsl(var(--accent)) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute -right-1/4 top-1/4 h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.16)_0%,transparent_70%)] opacity-50 motion-safe:animate-[pulse_8s_ease-in-out_infinite]" style={{ animationPlayState: orbPlayState }} />
        <div className="absolute -left-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.16)_0%,transparent_70%)] opacity-40 motion-safe:animate-[pulse_10s_ease-in-out_infinite_reverse]" style={{ animationPlayState: orbPlayState }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <HeroRestOffset />
      {/* Its top offset holds it centred at rest; opening things below never moves it up. */}
      <div data-hero-content className="container-narrow relative z-10 mt-[var(--hero-rest,0px)] flex w-full flex-col items-center text-center">
        <p data-hero-part="copy" data-hero-glass className="hero-availability inline-flex items-center gap-2 rounded-full border border-foreground/10 glass-subtle px-4 py-1.5 text-sm leading-6 text-muted-foreground shadow-accent-soft">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" />
          Available for new opportunities
        </p>

        {/* The name, split around Nex. The visible words are the h1 itself
            (selectable, readable by voice control); the avatar between them
            is its own labelled control. */}
        <div className="hero-identity w-full">
          <h1 className="hero-identity-row">
            <span data-hero-name="left" className="hero-name">{firstName}</span>
            <span className="sr-only"> </span>
            <GuideHeroAvatar />
            <span data-hero-name="right" className="hero-name">{lastName}</span>
          </h1>
        </div>

        {/* The conversation opens here, in the page: what follows moves down
            instead of being covered. */}
        <HeroAskHost />

        <p data-hero-part="copy" className="hero-role mt-[var(--hero-gap)] text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {personalInfo.role}
        </p>
        <p data-hero-part="copy" className="hero-tagline mt-3 max-w-[38rem] text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]" style={{ textWrap: "pretty" }}>
          {personalInfo.tagline}
        </p>

        <HeroActions />

        {/* The figures: each links to the work that backs it. */}
        <div data-hero-part="copy" data-hero-glass data-guide-target="hero-proof" className="hero-figures mt-[var(--hero-gap)] grid w-full max-w-3xl grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-foreground/10 glass-subtle px-5 py-4 text-left shadow-accent-soft sm:grid-cols-4 sm:px-6">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group border-l-2 border-primary/25 py-1 pl-3.5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stat.value}
                {stat.suffix}
              </span>
              <span className="hero-figure-label mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                {stat.label.charAt(0) + stat.label.slice(1).toLowerCase()}
              </span>
              {/* Phones: one row of four, so the label is the short one. */}
              <span aria-hidden="true" className="hero-figure-short hidden text-muted-foreground transition-colors group-hover:text-foreground">
                {stat.short}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
