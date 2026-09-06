"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="theme">
      {/*
        reducedMotion="user" makes framer-motion honour prefers-reduced-motion for
        every animation in the tree, so a component that forgets to check the
        preference itself still behaves. The architecture diagrams were exactly
        that case: their Box/Arrow entrance animations played regardless, because
        DiagramFrame computed the preference but never passed it down.
      */}
      <MotionConfig reducedMotion="user">
        {children}
        <Sonner />
      </MotionConfig>
    </ThemeProvider>
  );
}
