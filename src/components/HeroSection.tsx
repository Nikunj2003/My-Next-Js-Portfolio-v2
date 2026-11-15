"use client";
import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowDown, MessageCircle, Download } from "lucide-react";
import Link from "next/link";
import { personalInfo, stats } from "@/data/portfolio";
import { GuideHeroAvatar } from "@/components/guide/GuideHeroAvatar";

/** Where a count starts, as a share of its value: it never reads as a wrong number. */
const COUNT_FROM = 0.6;

const AnimatedCounter = ({ value, suffix, start, delayMs = 0 }: { value: number; suffix: string; start: boolean; delayMs?: number }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  // The figure is the final value in the HTML and while its tile rises in, so
  // it is never seen as "0+". Once it has landed it counts the last stretch
  // (from 60%) up to the value, writing the text node directly, not React.
  useEffect(() => {
    const node = textRef.current;
    // Small figures (1M+, 9) don't count: there is no run-up to show, and
    // 60% of 1 would read as "0M+".
    if (!node || !start || started.current || shouldReduceMotion || value < 10) return;
    if (document.documentElement.dataset.heroIntro === "skip") return;
    started.current = true;

    const duration = 900;
    const from = Math.floor(value * COUNT_FROM);
    let frame = 0;
    let startTime = 0;
    const timer = window.setTimeout(() => {
      node.textContent = `${from}${suffix}`;
      startTime = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = `${Math.round(from + (value - from) * eased)}${suffix}`;
        if (progress < 1) frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
      // Starts as the figure finishes rising (the rise is ~1s; count on its last half).
    }, delayMs + 450);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      // Interrupted (unmount, or a dev re-run): show the true value, and let a
      // re-run count again.
      node.textContent = `${value}${suffix}`;
      started.current = false;
    };
  }, [delayMs, shouldReduceMotion, start, suffix, value]);

  // The final value is always in the markup (server HTML, assistive tech); the
  // animated number is decorative and hidden from them.
  return (
    <>
      <span className="sr-only">{value}{suffix}</span>
      <span ref={textRef} aria-hidden="true" className="tabular-nums">{value}{suffix}</span>
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
  // the first paint. Start times, in one place, top to bottom:
  //   0     backdrop glow; the avatar's glow ring
  //   60    badge wipes in, its dot sends out one ring
  //   160   "Nikunj", 260 "Khitha": each rises out of a mask, a slight skew settling
  //   380   the role rises; "Engineer" catches the light (480)
  //   560   tagline unmasks upward
  //   680   stats: hairline grows down, then the figure rises (70ms apart)
  //   840   actions: primary pops open from its centre, Resume wipes up, Talk fades
  //   right: the avatar rises out of a blur once it is alive (not before 380),
  //          then its chips burst out, then its caption and buttons
  // Readable by ~0.8s, settled by ~1.6s. Skipped on reload and under reduced motion.
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
      <div aria-hidden="true" className="hero-anim hero-backdrop-in absolute inset-0 pointer-events-none">
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
              <span style={delay(60)} className="hero-anim hero-wipe inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold glass-subtle border border-primary/20 text-primary tracking-wide glow-accent-xs">
                <span className="hero-ping w-2 h-2 rounded-full bg-primary text-primary animate-pulse motion-reduce:animate-none" style={delay(560)} />
                Available for New Opportunities
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Each word rises out of its own mask, one after the other. The
                  real text is in the markup from the first byte (no JS needed). */}
              <h1 className="text-4xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.1] sm:leading-[1.05]">
                {/* The space sits between the masks: inside one, at the end of an
                    inline-block, it collapsed ("NikunjKhitha"). */}
                {nameWords.map((word, index) => (
                  <Fragment key={word}>
                    {index > 0 ? " " : null}
                    <span className="hero-mask">
                      <span className="hero-anim hero-rise" style={delay(160 + index * 100)}>
                        {word}
                      </span>
                    </span>
                  </Fragment>
                ))}
              </h1>
              {/* A tagline, not a heading: the section headings below are the h2s. */}
              <p className="text-xl sm:text-4xl font-semibold tracking-tight text-muted-foreground mt-2">
                <span className="hero-mask">
                  <span className="hero-anim hero-rise" style={delay(380)}>
                    {roleWords.slice(0, -1).join(" ")}
                  </span>
                </span>{" "}
                <span className="hero-mask">
                  <span className="hero-anim hero-rise" style={delay(440)}>
                    <span className="text-gradient hero-sheen" style={delay(480)}>{roleWords[roleWords.length - 1]}</span>
                  </span>
                </span>
              </p>
            </div>

            <p className="hero-anim hero-unmask text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl font-medium" style={{ textWrap: "pretty", ...delay(560) }}>
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
                  style={delay(680 + index * 70)}
                  className="hero-stat group border-l-2 border-primary/30 py-1 pl-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="text-2xl font-bold tracking-tighter text-foreground">
                    <span className="hero-mask">
                      <span className="hero-anim hero-rise" style={delay(760 + index * 70)}>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} start={statsInView} delayMs={shouldReduceMotion ? 0 : 760 + index * 70} />
                      </span>
                    </span>
                  </div>
                  <div style={delay(820 + index * 70)} className="hero-anim hero-fade mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
                    {stat.label}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-1 flex flex-col flex-wrap gap-3 sm:mt-2 sm:flex-row sm:gap-4">
              <a
                href="#work"
                style={delay(840)}
                // A solid button: popped open from its centre, never shown translucent.
                className="hero-anim hero-pop inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold tracking-wide text-primary-foreground transition-all duration-300 glow-accent-sm hover:glow-accent-md active:scale-95 sm:w-auto"
              >
                Read the case studies
                <ArrowDown className="ml-1 h-4 w-4" />
              </a>
              <a
                href={personalInfo.resumeUrl}
                download
                style={delay(920)}
                // Glass: wiped up rather than faded.
                className="hero-anim hero-wipe-up btn-cta-secondary w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-1 text-primary" />
                Resume
              </a>
              <a
                href="#ai-twin"
                style={delay(1000)}
                className="hero-anim hero-fade inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full hover:bg-foreground/5 transition-all duration-300 font-semibold text-sm text-muted-foreground hover:text-foreground active:scale-95"
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
               <div className="hero-anim hero-glow-in h-full w-full rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.15)_0%,transparent_70%)]" style={delay(0)} />
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
