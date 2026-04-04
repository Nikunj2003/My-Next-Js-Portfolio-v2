import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import SkillsSection from "@/components/SkillsSection";
import AITwinSection from "@/components/AITwinSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const FluidCursor = dynamic(() => import("@/components/FluidCursor"));
const AITwinChat = dynamic(() => import("@/components/AITwinChat"));

export default function Home() {
  return (
    <>
      <FluidCursor />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <AboutSection />
        <ExperienceSection />
        <ProjectsSection />
        <SkillsSection />
        <AITwinSection />
        <ContactSection />
      </main>
      <Footer />
      <AITwinChat />
    </>
  );
}
