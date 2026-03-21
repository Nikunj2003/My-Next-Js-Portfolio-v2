"use client";
import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

const Card3D = ({ children, className = "" }: Card3DProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card || !glare) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.transition = "transform 0.1s ease-out";

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
    glare.style.opacity = "1";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card || !glare) return;

    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    card.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
    glare.style.opacity = "0";
  }, []);

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-accent/10 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
        <div
          ref={glareRef}
          className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0"
        />
      </div>
    </motion.div>
  );
};

export default Card3D;
