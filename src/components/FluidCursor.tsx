"use client";
import { useEffect, useState, useRef } from "react";
import useFluidCursor from "@/hooks/useFluidCursor";

const FluidCursor = () => {
  const [shouldRender, setShouldRender] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Only render on desktop with pointer devices (not touch-only)
    const hasPointer = window.matchMedia("(pointer: fine)").matches;
    const isDesktop = window.innerWidth >= 1024;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setShouldRender(hasPointer && isDesktop && !prefersReducedMotion);
  }, []);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;
    
    // Initialize the fluid cursor logic and get cleanup function if provided
    const cleanup = useFluidCursor(canvasRef.current);
    
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden">
      <canvas 
        ref={canvasRef}
        id="fluid" 
        className="h-full w-full" 
      />
    </div>
  );
};

export default FluidCursor;
