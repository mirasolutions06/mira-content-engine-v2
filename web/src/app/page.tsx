import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { PipelineDemo } from "@/components/landing/pipeline-demo";
import { Portfolio } from "@/components/landing/portfolio";
import { SocialProof } from "@/components/landing/social-proof";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PipelineDemo />
        <Portfolio />
        <SocialProof />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
