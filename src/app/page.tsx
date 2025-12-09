// src/app/page.tsx — Landing Page
import {
  HeroSection,
  ProductDemo,
  FeaturesSection,
  TechStack,
  HowItWorks,
  Testimonials,
  CTASection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <HeroSection />
      <ProductDemo />
      <FeaturesSection />
      <TechStack />
      <HowItWorks />
      <Testimonials />
      <CTASection />
      <Footer />
    </main>
  );
}