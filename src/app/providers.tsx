"use client";

import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange storageKey="theme">
      {children}
      <Sonner />
    </ThemeProvider>
  );
}
