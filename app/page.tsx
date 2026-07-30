import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Rewards from "@/components/Rewards";
import Faq from "@/components/Faq";
import Submit from "@/components/Submit";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />

      <Hero />

      <div className="wave-divider">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30 Q360 0 720 30 T1440 30 V60 H0 Z" fill="#0c1019" />
        </svg>
      </div>

      <Rewards />
      <Faq />
      <Submit />
      <Footer />
    </>
  );
}
