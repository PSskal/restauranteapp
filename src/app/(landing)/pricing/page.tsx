import { Metadata } from "next";

import { PricingSection } from "@/components/pricing/pricing-section";

export const metadata: Metadata = {
  title: "Precios | PSskal",
  description:
    "Planes flexibles para restaurantes de todos los tamaños. Empieza gratis y escala cuando lo necesites.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">Planes y Precios</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Elige el plan que mejor se adapte a tu restaurante
          </p>
        </div>
        <PricingSection />
      </div>
    </div>
  );
}
