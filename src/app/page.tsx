import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import SkillsSection from "@/components/SkillsSection";
import AITwinSection from "@/components/AITwinSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { getPortfolioGraph, toJsonLd } from "@/lib/seo/jsonld";


export default function Home() {
  return (
    <>
      {/* Emitted here rather than in the root layout: this graph's WebPage node
          declares the homepage url, name, and description, and the ItemList
          carries the #case-studies @id that /work also declares. From the
          layout it shipped on every route, so case studies claimed to be the
          homepage and /work declared the same @id twice. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(getPortfolioGraph()).replace(/</g, "\\u003c") }}
      />

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
    </>
  );
}
