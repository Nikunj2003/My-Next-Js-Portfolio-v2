"use client";
import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import { Briefcase } from "lucide-react";
import Link from "next/link";

const OLD_EXPERIENCE_DATA = [
  {
    title: "Software Development Intern",
    organisation: {
      name: "Central Electricity Authority, Government of India",
    },
    date: "May 2023 - July 2023",
    description:
      "At the CEA, I got to work on several impactful projects. My main task was to improve a national renewable energy dashboard that monitors over 150 power stations. By integrating it with the National Power Portal using Java, I successfully boosted its data accuracy by 30%. I also took the lead on building a secure file management system from scratch using PHP and MySQL. I implemented role-based access control and optimized it to handle over 5,000 files, making retrieval 25% faster. To improve office efficiency, I built a full-stack MERN conference room booking system, which was a big hit—it cut booking times by 60% and reduced scheduling errors by 40%.",
  },
  {
    title: "Software Development Engineer (SDE) Intern",
    organisation: {
      name: "Xansr Software Private Ltd.",
    },
    date: "June 2024 - Jan 2025",
    description:
      "My time at Xansr was a deep dive into AI and scalable back-end systems. I was responsible for developing microservices with Node.js and FastAPI, where I applied Test-Driven Development to hit 100% test coverage and increase API performance by 40%. To streamline our workflow, I designed and implemented CI/CD pipelines using Docker and GitHub Actions, which cut our deployment time by 42%. I'm especially proud of two AI projects I engineered: 'Fantasy GPT,' a chatbot for sports fans that I built to 98% accuracy using RAG and LangGraph, and 'AIKO,' a media assistant that generates personalized sports highlights with real-time commentary. I also built the data foundation for these services, creating scalable ETL pipelines with MSSQL and Azure that ensured 100% data accuracy.",
  },
  {
    title: "AI Automation Intern",
    organisation: {
      name: "Armorcode Inc.",
    },
    date: "Jan 2025 - Nov 2025",
    description:
      "At Armorcode, I focused on backend development for the core platform agent using Java and Spring Boot. I designed and implemented new APIs, refined AI prompts for security workflows, and managed the AWS S3 vector knowledge base. I spearheaded AI-driven code-to-documentation automation using CrewAI and MCP servers, generating documentation for 250+ security integrations and reducing update latency by 99% (72h to 45m). I also established a universal LLM access layer by building an OpenAI-compatible proxy API supporting Gemini and Claude, deployed LiteLLM for monitoring 15+ AI APIs with centralized cost management.",
  },
  {
    title: "Associate Engineer",
    organisation: {
      name: "Armorcode Inc.",
    },
    date: "Dec 2025 - Present",
    description:
      "Promoted to Associate Engineer, I now architect enterprise-scale GenAI platforms serving 200+ enterprise customers. I designed a GraphRAG platform using Neo4j and PGVector unifying 500,000+ data entities from 5+ systems (Jira, Qmetry, Zendesk), achieving 40% improved retrieval accuracy. I orchestrated advanced GraphRAG and LightRAG ETL pipelines, reducing LLM data indexing costs by 50% and saving $15,000+ annually. I enhanced the core Armorcode platform backend (Java, Spring Boot), deploying 10+ REST APIs serving 5,000+ daily requests with 99.8% uptime. I devised end-to-end automation suites for enterprise operations (Zendesk support, QA triage, HR screening, marketing AI images) using n8n, Java microservices, and Python scripts, eliminating 200+ manual hours monthly.",
  },
];

function TimelineIcon({ iconRef }: { iconRef: React.RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({
    target: iconRef,
    offset: ["center 90%", "center 80%"],
  });

  return (
    <figure className="absolute left-[38px] -translate-x-1/2 w-[75px] h-[75px] flex items-center justify-center stroke-foreground top-0 md:top-4">
      <svg width="75" height="75" viewBox="0 0 100 100" className="rotate-[-90deg]">
        <circle cx="50" cy="50" r="20" className="fill-background stroke-primary/20 stroke-1" />
        <motion.circle
          style={{ pathLength: scrollYProgress }}
          cx="50"
          cy="50"
          r="20"
          className="fill-none stroke-primary stroke-[5px]"
        />
        <circle cx="50" cy="50" r="10" className="fill-primary stroke-1" />
      </svg>
    </figure>
  );
}

const ExperienceItem = ({ exp }: { exp: typeof OLD_EXPERIENCE_DATA[0] }) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li ref={ref} className="relative mx-auto mb-16 flex w-full flex-col gap-1 pl-[90px] md:pl-[120px]">
      <TimelineIcon iconRef={ref} />
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ ease: "easeOut", duration: 0.5 }}
        className="glass rounded-xl border border-primary/10 p-6 md:p-8 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 relative"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {exp.title}
            </h3>
            <span className="text-primary font-medium mt-1 block">
              @{exp.organisation.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-primary/5 px-3 py-1 rounded-full w-fit">
            <Briefcase className="w-3.5 h-3.5" />
            {exp.date}
          </div>
        </div>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {exp.description}
        </p>
      </motion.div>
    </li>
  );
};

const ExperienceSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 80%"],
  });

  return (
    <section id="experience" className="section-padding overflow-hidden">
      <div className="container-narrow">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-bold text-center mb-20 tracking-tight"
        >
          <span className="bg-gradient-to-r from-primary/70 to-primary bg-clip-text text-transparent">
            Experience & Education
          </span>
        </motion.h2>

        <div className="relative w-full md:mx-auto md:max-w-4xl" ref={ref}>
          {/* Background Timeline Line */}
          <div className="absolute left-[36px] bottom-0 top-0 w-[4px] rounded-full bg-primary/10 origin-top" />

          {/* Glowing Animated Scroll Line */}
          <motion.div
            style={{ scaleY: scrollYProgress }}
            className="absolute left-[36px] bottom-0 top-0 w-[4px] rounded-full bg-primary origin-top shadow-[0_0_15px_rgba(var(--primary),0.5)]"
          />

          <ul className="w-full relative py-4">
            {OLD_EXPERIENCE_DATA.map((exp, index) => (
              <ExperienceItem key={index} exp={exp} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
