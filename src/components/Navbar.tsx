"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, Download } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import logo from "@/assets/logo.png";
import { personalInfo } from "@/data/portfolio";
import { ThemeToggle } from "./ThemeToggle";
import { scrollToHash } from "@/lib/scroll";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#ai-twin", label: "AI Twin" },
  { href: "#contact", label: "Contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const shouldRestoreFocusRef = useRef(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let frameId: number | null = null;

    const updateScrolled = () => {
      frameId = null;
      const nextScrolled = window.scrollY > 40;
      setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));

      const activationLine = window.innerHeight * 0.35;
      let nextActiveSection: string | null = null;

      for (const link of navLinks) {
        const section = document.querySelector(link.href);
        if (!(section instanceof HTMLElement)) continue;

        const rect = section.getBoundingClientRect();
        if (rect.top <= activationLine && rect.bottom >= activationLine) {
          nextActiveSection = link.href;
          break;
        }
      }

      setActiveSection((prev) => (prev === nextActiveSection ? prev : nextActiveSection));
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const closeMenu = useCallback((restoreFocus = true) => {
    shouldRestoreFocusRef.current = restoreFocus;
    setIsOpen(false);
  }, []);

  const scrollToSection = useCallback((href: string) => {
    scrollToHash(href);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isMobile: boolean) => {
    e.preventDefault();
    setActiveSection(href);

    if (isMobile) {
      closeMenu(false);
      window.setTimeout(() => {
        scrollToSection(href);
      }, shouldReduceMotion ? 0 : 150);
    } else {
      scrollToSection(href);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      firstMobileLinkRef.current?.focus();
    }, shouldReduceMotion ? 0 : 120);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !mobileMenuRef.current) return;

      const focusable = Array.from(
        mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      if (shouldRestoreFocusRef.current) {
        menuButton?.focus();
      }

      shouldRestoreFocusRef.current = true;
    };
  }, [closeMenu, isOpen, shouldReduceMotion]);

  const mobileMenuTransition = shouldReduceMotion
    ? { duration: 0.18 }
    : { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.8 };

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[max(1.5rem,env(safe-area-inset-top))] pointer-events-none">
        <nav
          className={`pointer-events-auto transition-all duration-500 rounded-2xl sm:rounded-full w-full max-w-6xl 2xl:max-w-[88rem] flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 border ${
            scrolled ? "glass-strong shadow-2xl shadow-black/20 border-white/10" : "bg-transparent border-transparent"
          }`}
        >
          <a href="#hero" aria-label="Go to hero section" className="flex items-center gap-2 group">
            <Image src={logo} alt="" aria-hidden="true" className="w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-300 group-hover:scale-110 pointer-events-none" draggable={false} />
            <span className="font-bold text-lg tracking-wide hidden sm:block">Nikunj Khitha</span>
          </a>

          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href, false)}
                aria-current={activeSection === link.href ? "location" : undefined}
                className={`px-3 py-2 text-sm font-medium transition-all duration-200 rounded-full ${
                  activeSection === link.href
                    ? "bg-primary/10 text-primary shadow-[0_0_18px_rgba(41,214,185,0.14)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="w-px h-4 bg-white/10 mx-2" />
            <ThemeToggle />
            <a
              href={personalInfo.resumeUrl}
              download
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 active:scale-[0.97] ml-2"
            >
              <Download className="w-3.5 h-3.5" />
              Resume
            </a>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors active:scale-95"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeMenu()}
              className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-navigation"
              ref={mobileMenuRef}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto", y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -10 }}
              transition={mobileMenuTransition}
              className="md:hidden fixed top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] inset-x-4 z-[100] glass-strong border border-white/10 overflow-hidden rounded-2xl shadow-2xl sm:top-[calc(max(1.5rem,env(safe-area-inset-top))+4rem)]"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
            >
            <div className="py-4 flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  ref={link === navLinks[0] ? firstMobileLinkRef : undefined}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, true)}
                  aria-current={activeSection === link.href ? "location" : undefined}
                  className={`block px-4 py-3 text-sm rounded-lg transition-colors font-medium w-full ${
                    activeSection === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <ThemeToggle />
                <a
                  href={personalInfo.resumeUrl}
                  download
                  onClick={() => closeMenu(false)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground active:scale-[0.97]"
                >
                  <Download className="w-4 h-4" />
                  Resume
                </a>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
