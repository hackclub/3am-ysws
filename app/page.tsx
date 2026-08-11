import Hero from "@/components/Hero";
import YswsImpact from "@/components/YswsImpact";
import ProjectMarquee from "@/components/ProjectMarquee";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import BatSpawner from "@/components/BatSpawner";
import SparkTrail from "@/components/SparkTrail";

export default function HomePage() {
  return (
    <main>
      <BatSpawner />
      <SparkTrail />
      <Hero />
      <YswsImpact />
      <ProjectMarquee />
      <Faq />
      <Footer />
    </main>
  );
}
