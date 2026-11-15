"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowDown, MessageCircle, Download } from "lucide-react";
import Link from "next/link";
import { personalInfo, stats } from "@/data/portfolio";
import { GuideHeroAvatar } from "@/components/guide/GuideHeroAvatar";

const AnimatedCounter = ({ value, suffix, start, delayMs = 0 }: { value: number; suffix: string; start: boolean; delayMs?: number }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  // Counts up by writing the text node directly: four counters re-rendering
  // React every frame for 2.6s was the hero's heaviest entrance work.
  useEffect(() => {
    const node = textRef.current;
    if (!node || !start || started.current) return;
    started.current = true;
    if (shouldReduceMotion) {
      node.textContent = `${value}${suffix}`;
      return;
    }

    // Counts once its tile has landed, over 1.6s (a long count kept the hero
    // busy well after everything else had settled).
    const duration = 1600;
    const startTime = performance.now() + delayMs;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(Math.max(0, now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = `${Math.round(eased * value)}${suffix}`;
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [delayMs, shouldReduceMotion, start, suffix, value]);

  // The final value is always in the markup (server HTML, assistive tech); the
  // animated number is decorative and hidden from them.
  return (
    <>
      <span className="sr-only">{value}{suffix}</span>
      <span ref={textRef} aria-hidden="true" className="tabular-nums">0{suffix}</span>
    </>
  );
};

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const [statsTriggerRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.05,
    rootMargin: "0px 0px -2% 0px",
  });
  // The two large glow orbs pulse forever; pause them once the hero is off screen.
  const [heroRef, heroInView] = useInView({ threshold: 0 });
  const orbPlayState = heroInView ? "running" : "paused";

  // The entrance is CSS (see "Hero entrance" in globals.css), so it plays from
  // the first paint, before hydration. Each element gets its start time here,
  // in one place, so the order reads top to bottom:
  //   0ms     backdrop glow
  //   80ms    badge wipes in
  //   180ms   the name rises line by line out of a mask
  //   420ms   the role
  //   520ms   tagline
  //   620ms   stats (counters start as each one lands)
  //   780ms   the three actions
  //   300ms   avatar glow, then the avatar rises in (380ms), then its chips
  //           and buttons (900ms on)
  // About 1.4s end to end; the copy is readable from about 700ms.
  const delay = (ms: number) => ({ "--hero-d": `${ms}ms` }) as CSSProperties;
  const nameWords = personalInfo.name.split(" ");
  const roleWords = personalInfo.role.split(" ");

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative flex min-h-[100svh] items-start overflow-hidden pt-[calc(5rem+env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:min-h-screen lg:items-center lg:pt-20 lg:pb-12"
    >
      {/* Subtle background grid & Animated Glow Orb */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "radial-gradient(hsl(var(--accent)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      
      {/* Massive Glowing Animated Orbs */}
      <div aria-hidden="true" className="hero-backdrop-in absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full animate-[pulse_8s_ease-in-out_infinite] motion-reduce:animate-none opacity-50 pointer-events-none bg-[radial-gradient(circle,hsl(var(--primary)/0.2)_0%,transparent_70%)]" style={{ animationPlayState: orbPlayState }} />
      <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] rounded-full animate-[pulse_10s_ease-in-out_infinite_reverse] motion-reduce:animate-none opacity-40 pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent)/0.2)_0%,transparent_70%)]" style={{ animationPlayState: orbPlayState }} />
      </div>
      
      {/* Smooth fade into the next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 sm:h-64 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-0" />

      <div className="container-narrow relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left - Content */}
          <div className="flex flex-col gap-6 sm:gap-8 lg:col-span-7">
            <div>
              {/* A glass pill: wiped in, never faded (a fade flattens its blur). */}
              <span style={delay(80)} className="hero-wipe inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold glass-subtle border border-primary/20 text-primary tracking-wide glow-accent-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                Available for New Opportunities
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Each word rises out of its own mask, one after the other. The
                  real text is in the markup from the first byte (no JS needed). */}
              <h1 className="text-4xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.1] sm:leading-[1.05]">
                {nameWords.map((word, index) => (
                  <span key={word} className="hero-mask">
                    <span className="hero-rise" style={delay(180 + index * 110)}>
                      {word}
                    </span>
                    {index < nameWords.length - 1 ? " " : null}
                  </span>
                ))}
              </h1>
              {/* A tagline, not a heading: the section headings below are the h2s. */}
              <p className="text-xl sm:text-4xl font-semibold tracking-tight text-muted-foreground mt-2">
                <span className="hero-mask">
                  <span className="hero-rise" style={delay(420)}>
                    {roleWords.slice(0, -1).join(" ")} <span className="text-gradient">{roleWords[roleWords.length - 1]}</span>
                  </span>
                </span>
              </p>
            </div>

            <p className="hero-fade-up text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl font-medium" style={{ textWrap: "pretty", ...delay(520) }}>
              {personalInfo.tagline}
            </p>

            {/* Stats — placed above the CTAs because these numbers are the
                fastest proof in the first viewport, and each one links to the
                surface that backs it up. */}
            <div ref={statsTriggerRef} data-guide-target="hero-proof" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Deliberately no ask affordance here. Each stat already links to
                  the surface that proves it, and the hero's job in the first
                  viewport is a fast read — a second interactive element per tile
                  competed with that link for the same click. */}
              {stats.map((stat, index) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  style={delay(620 + index * 70)}
                  className="hero-fade-up group border-l-2 border-primary/30 py-1 pl-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="text-2xl font-bold tracking-tighter text-foreground">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} start={statsInView} delayMs={shouldReduceMotion ? 0 : 620 + index * 70} />
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
                    {stat.label}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-1 flex flex-col flex-wrap gap-3 sm:mt-2 sm:flex-row sm:gap-4">
              <a
                href="#work"
                style={delay(780)}
                className="hero-fade-up inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold tracking-wide text-primary-foreground transition-all duration-300 glow-accent-sm hover:glow-accent-md active:scale-95 sm:w-auto"
              >
                Read the case studies
                <ArrowDown className="ml-1 h-4 w-4" />
              </a>
              <a
                href={personalInfo.resumeUrl}
                download
                style={delay(850)}
                // Glass: wiped up rather than faded.
                className="hero-wipe-up btn-cta-secondary w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-1 text-primary" />
                Resume
              </a>
              <a
                href="#ai-twin"
                style={delay(920)}
                className="hero-fade-up inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full hover:bg-foreground/5 transition-all duration-300 font-semibold text-sm text-muted-foreground hover:text-foreground active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-primary" />
                Talk to AI Twin
              </a>
            </div>

          </div>

          {/* Right - the live AI Twin avatar, in the slot the 3D card used to fill */}
          {/* The column itself never fades (it holds glass chips); its glow
              and the avatar animate on their own (GuideHeroAvatar). */}
          <div data-guide-hero-column className="hidden lg:flex items-center justify-end lg:col-span-5 relative">
             <div className="absolute inset-0 scale-150">
               <div className="hero-glow-in h-full w-full rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.15)_0%,transparent_70%)]" style={delay(300)} />
             </div>
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
