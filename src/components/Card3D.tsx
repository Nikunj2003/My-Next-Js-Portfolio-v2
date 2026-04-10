import { useEffect, useRef, useState, type PointerEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

const Card3D = ({ children, className = "" }: Card3DProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const glareOpacity = useTransform(mouseXSpring, (v) => Math.abs(v) + Math.abs(y.get()));
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.4) 0%, transparent 60%)`;
  const glareVisibility = useTransform(glareOpacity, (v) => Math.min(v * 1.5, 1));

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsInteractive(false);
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateInteractivity = (event?: MediaQueryListEvent) => {
      setIsInteractive(event ? event.matches : mediaQuery.matches);
    };

    updateInteractivity();
    mediaQuery.addEventListener("change", updateInteractivity);

    return () => mediaQuery.removeEventListener("change", updateInteractivity);
  }, [shouldReduceMotion]);

  const flushPointerPosition = () => {
    frameRef.current = null;

    const nextBounds = elementRef.current?.getBoundingClientRect() ?? boundsRef.current;
    if (!nextBounds || !pointRef.current) return;

    boundsRef.current = nextBounds;

    const width = nextBounds.width;
    const height = nextBounds.height;

    if (width === 0 || height === 0) return;

    const mouseX = pointRef.current.x - nextBounds.left;
    const mouseY = pointRef.current.y - nextBounds.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handlePointerEnter = ({ currentTarget, clientX, clientY }: PointerEvent<HTMLDivElement>) => {
    elementRef.current = currentTarget;
    boundsRef.current = currentTarget.getBoundingClientRect();
    pointRef.current = { x: clientX, y: clientY };
    flushPointerPosition();
  };

  const handlePointerMove = ({ currentTarget, clientX, clientY }: PointerEvent<HTMLDivElement>) => {
    elementRef.current = currentTarget;
    if (!boundsRef.current) {
      boundsRef.current = currentTarget.getBoundingClientRect();
    }

    pointRef.current = { x: clientX, y: clientY };

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(flushPointerPosition);
    }
  };

  const handlePointerLeave = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    elementRef.current = null;
    boundsRef.current = null;
    pointRef.current = null;
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0.2 : 1.0, delay: shouldReduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        onPointerEnter={isInteractive ? handlePointerEnter : undefined}
        onPointerMove={isInteractive ? handlePointerMove : undefined}
        onPointerLeave={isInteractive ? handlePointerLeave : undefined}
        className="relative rounded-2xl overflow-hidden shadow-accent-strong will-change-transform"
        style={{
          rotateX: isInteractive ? rotateX : "0deg",
          rotateY: isInteractive ? rotateY : "0deg",
          transformStyle: "preserve-3d"
        }}
        whileHover={isInteractive ? { scale: 1.02 } : undefined}
      >
        {children}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            background: glareBackground,
            opacity: isInteractive ? glareVisibility : 0,
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default Card3D;
