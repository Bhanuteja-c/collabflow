// src/app/page.tsx — Landing Page
// Above-the-fold components loaded eagerly via DIRECT imports (not barrel)
import dynamic from "next/dynamic";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";

// Lazy-load below-the-fold sections — ssr:false to keep them off the initial JS bundle entirely
const ProductDemo = dynamic(() => import("@/components/landing/ProductDemo"), { ssr: true });
const FeaturesSection = dynamic(() => import("@/components/landing/FeaturesSection"), { ssr: true });
const TechStack = dynamic(() => import("@/components/landing/TechStack"), { ssr: true });
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"), { ssr: true });
const FAQ = dynamic(() => import("@/components/landing/FAQ"), { ssr: true });
const CTASection = dynamic(() => import("@/components/landing/CTASection"), { ssr: true });
const Footer = dynamic(() => import("@/components/landing/Footer"), { ssr: true });

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
