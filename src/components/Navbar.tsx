"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { personalInfo } from "@/data/portfolio";
import { ThemeToggle } from "./ThemeToggle";

type LenisWindow = Window & typeof globalThis & {
  __lenis?: {
    scrollTo: (target: number | string | HTMLElement, options?: { offset?: number }) => void;
  };
};

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frameId: number | null = null;

    const updateScrolled = () => {
      frameId = null;
      const nextScrolled = window.scrollY > 40;
      setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToSection = (href: string) => {
    const target = document.querySelector(href);
    if (!(target instanceof HTMLElement)) return;

    const lenis = (window as LenisWindow).__lenis;
    if (lenis) {
      lenis.scrollTo(target, { offset: -85 });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY - 85;
      window.scrollTo({ top, behavior: "smooth" });
    }

    window.history.pushState(null, "", href);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isMobile: boolean) => {
    e.preventDefault();
    if (isMobile) {
      setIsOpen(false);
      // Wait for menu close & iOS gesture end
      setTimeout(() => {
        scrollToSection(href);
      }, 150);
    } else {
      scrollToSection(href);
    }
  };

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4 sm:pt-6 pointer-events-none">
        <nav
          className={`pointer-events-auto transition-all duration-500 rounded-2xl sm:rounded-full w-full max-w-6xl 2xl:max-w-[88rem] flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 border ${
            scrolled ? "glass-strong shadow-2xl shadow-black/20 border-white/10" : "bg-transparent border-transparent"
          }`}
        >
          <a href="#" className="flex items-center gap-2 group">
            <Image src={logo} alt="NK" className="w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-300 group-hover:scale-110 pointer-events-none" draggable={false} />
            <span className="font-bold text-lg tracking-wide hidden sm:block">Nikunj Khitha</span>
          </a>

          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href, false)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-full hover:bg-white/10"
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
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors active:scale-95"
            aria-label="Toggle menu"
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
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 z-[90] bg-transparent"
            />
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="md:hidden fixed top-[4.5rem] inset-x-4 z-[100] glass-strong border border-white/10 overflow-hidden rounded-2xl shadow-2xl"
            >
            <div className="py-4 flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, true)}
                  className="block px-4 py-3 text-sm rounded-lg hover:bg-white/5 transition-colors font-medium text-muted-foreground hover:text-foreground w-full"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <ThemeToggle />
                <a
                  href={personalInfo.resumeUrl}
                  download
                  onClick={() => setIsOpen(false)}
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
