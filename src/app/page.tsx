// src/app/page.tsx — Landing Page
import {
  Navbar,
  HeroSection,
  ProductDemo,
  FeaturesSection,
  TechStack,
  HowItWorks,
  // Pricing, // Hidden for now
  FAQ,
  // Testimonials, // Hidden until we have real users
  CTASection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProductDemo />
      <FeaturesSection />
      <TechStack />
      <HowItWorks />
      {/* <Pricing /> Hidden for now */}
      <FAQ />
      {/* <Testimonials /> Hidden until real testimonials */}
      <CTASection />
      <Footer />
    </main>
  );
}

