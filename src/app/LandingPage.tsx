'use client';

import {
  Header,
  HeroSection,
  SwipeFeatures,
  HowItWorks,
  TargetUsers,
  PlatformSection,
  PricingSection,
  Footer,
} from '@/components/landing';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <SwipeFeatures />
        <HowItWorks />
        <PlatformSection />
        <TargetUsers />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
