"use client";
import { useState, useEffect } from "react";
import { Menu, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { personalInfo } from "@/data/portfolio";
import { ThemeToggle } from "./ThemeToggle";

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
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-strong shadow-lg shadow-black/10" : "bg-transparent"
      }`}
    >
      <div className="container-narrow flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2 group">
          <img src={logo.src} alt="NK" className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
          <span className="font-semibold text-sm tracking-wide hidden sm:block">Nikunj Khitha</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          <a
            href={personalInfo.resumeUrl}
            download
            className="ml-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 active:scale-[0.97]"
          >
            <Download className="w-3.5 h-3.5" />
            Resume
          </a>
          <ThemeToggle />
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong overflow-hidden"
          >
            <div className="container-narrow py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-sm rounded-lg hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={personalInfo.resumeUrl}
                download
                className="mt-2 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground active:scale-[0.97]"
              >
                <Download className="w-4 h-4" />
                Download Resume
              </a>
              <div className="mx-4 mt-2 flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
