"use client";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { about } from "@/data/portfolio";
import logo from "@/assets/logo.png";

const AboutSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section id="about" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="flex justify-center mb-8">
            <div className="relative">
              <img src={logo.src} alt="NK" className="w-16 h-16 opacity-60" />
              <div className="absolute inset-0 w-16 h-16 bg-primary/20 rounded-full blur-xl" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">About Me</h2>

          <p className="text-muted-foreground text-lg leading-relaxed mb-8" style={{ textWrap: "pretty" }}>
            {about.summary}
          </p>

          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {about.highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-subtle rounded-xl p-5"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">{h}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
