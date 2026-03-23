import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

const Card3D = ({ children, className = "" }: Card3DProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const glareOpacity = useTransform(mouseXSpring, (v) => Math.abs(v) + Math.abs(y.get()));
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-accent/10 will-change-transform"
        style={{ 
          rotateX, 
          rotateY, 
          transformStyle: "preserve-3d" 
        }}
        whileHover={{ scale: 1.02 }}
      >
        {children}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.4) 0%, transparent 60%)`
            ),
            opacity: useTransform(glareOpacity, (v) => Math.min(v * 1.5, 1)),
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default Card3D;
