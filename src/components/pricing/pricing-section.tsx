import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import Link from "next/link";

import {
  PLAN_CARDS,
  PLAN_FEATURE_SECTIONS,
  PLAN_LIMITS,
  type PlanFeatureRow,
  type PlanId,
} from "@/data/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS: Array<{
  label: string;
  format: (plan: PlanId) => string;
}> = [
  {
    label: "Usuarios incluidos",
    format: (plan) => {
      const seats = PLAN_LIMITS[plan].staffSeats;
      return seats === 1 ? "1 usuario" : `${seats} usuarios`;
    },
  },
  {
    label: "Mesas activas",
    format: (plan) => {
      const tables = PLAN_LIMITS[plan].tables;
      return tables === null ? "Ilimitadas" : `${tables} mesas`;
    },
  },
  {
    label: "Pedidos mensuales",
    format: (plan) => {
      const orders = PLAN_LIMITS[plan].monthlyOrders;
      return orders === null ? "Ilimitados" : `${orders} pedidos`;
    },
  },
];

function renderFeatureValue(planId: PlanId, feature: PlanFeatureRow) {
  const value = feature.values[planId];
  if (value.type === "boolean") {
    return value.value ? (
      <span className="inline-flex items-center gap-2 font-medium">
        <Check className="h-4 w-4" /> Incluido
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Minus className="h-4 w-4" /> No
      </span>
    );
  }

  return <span className="font-medium text-foreground">{value.value}</span>;
}

export function PricingSection() {
  return (
    <section id="planes" className="bg-background py-20">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 space-y-12">
        <div className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Planes sugeridos
          </p>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Escala tu restaurante a tu propio ritmo
          </h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground">
            Comienza gratis con lo esencial y da el salto a Premium cuando
            necesites branding avanzado, POS completo y reportes con todo el
            detalle que te pide el negocio.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {Object.values(PLAN_CARDS).map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-3xl border bg-card p-6 shadow-sm",
                plan.highlight && "ring-2 ring-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-muted-foreground">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-4xl font-semibold">
                    {plan.priceLabel}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      /mes
                    </span>
                  </p>
                </div>
                {plan.ribbon ? (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {plan.ribbon}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {HIGHLIGHTS.map((highlight) => (
                  <li
                    key={`${plan.id}-${highlight.label}`}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <span className="text-muted-foreground">
                      {highlight.label}
                    </span>
                    <span className="font-semibold">
                      {highlight.format(plan.id)}
                    </span>
                  </li>
                ))}
              </ul>
              {plan.id === "FREE" ? (
                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full",
                    "bg-muted text-foreground hover:bg-muted/80"
                  )}
                  variant="default"
                >
                  <Link href="/login">Empieza gratis</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full",
                    "bg-foreground text-background hover:bg-foreground/90"
                  )}
                  variant="default"
                >
                  <Link
                    href="https://wa.me/51900878539?text=Hola,%20quiero%20el%20plan%20Premium%20de%20PSskal"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Quiero el plan Premium
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-muted-foreground">
              Comparativa detallada
            </p>
            <p className="text-2xl font-semibold">
              Todo lo que incluye cada plan
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pr-4 font-semibold">Característica</th>
                  <th className="py-3 pr-4 font-semibold">Free</th>
                  <th className="py-3 pr-4 font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURE_SECTIONS.map((section) => (
                  <Fragment key={section.category}>
                    <tr>
                      <td
                        colSpan={3}
                        className="pt-6 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature) => (
                      <tr
                        key={feature.key}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {feature.label}
                        </td>
                        <td className="py-3 pr-4">
                          {renderFeatureValue("FREE", feature)}
                        </td>
                        <td className="py-3 pr-4">
                          {renderFeatureValue("PREMIUM", feature)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
