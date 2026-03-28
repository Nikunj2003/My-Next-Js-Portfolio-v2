"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import initializeFluidCursor from "@/hooks/useFluidCursor";

const subscribeToCursorPreferences = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const pointerQuery = window.matchMedia("(pointer: fine)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handleChange = () => onStoreChange();

  pointerQuery.addEventListener("change", handleChange);
  reducedMotionQuery.addEventListener("change", handleChange);
  window.addEventListener("resize", handleChange);

  return () => {
    pointerQuery.removeEventListener("change", handleChange);
    reducedMotionQuery.removeEventListener("change", handleChange);
    window.removeEventListener("resize", handleChange);
  };
};

const getShouldRenderCursor = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const hasPointer = window.matchMedia("(pointer: fine)").matches;
  const isDesktop = window.innerWidth >= 1024;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return hasPointer && isDesktop && !prefersReducedMotion;
};

const FluidCursor = () => {
  const shouldRender = useSyncExternalStore(
    subscribeToCursorPreferences,
    getShouldRenderCursor,
    () => false,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;

    const container = containerRef.current;

    if (container) {
      container.style.opacity = "0";
    }

    const cleanup = initializeFluidCursor(canvasRef.current, () => {
      if (container) {
        container.style.opacity = "1";
      }
    });

    return () => {
      if (container) {
        container.style.opacity = "0";
      }
      if (typeof cleanup === 'function') cleanup();
    };
  }, [shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden"
      style={{ opacity: 0, transition: "opacity 200ms ease" }}
    >
      <canvas
        ref={canvasRef}
        id="fluid"
        className="h-full w-full"
      />
    </div>
  );
};

export default FluidCursor;
