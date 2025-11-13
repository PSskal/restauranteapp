import { Fragment } from "react";
import { Check, Minus } from "lucide-react";

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
      <span className="inline-flex items-center gap-2 font-medium text-emerald-500">
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
    <section id="planes" className="bg-slate-900 py-20 text-white">
      <div className="container mx-auto px-4 space-y-12">
        <div className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Planes sugeridos
          </p>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Escala tu restaurante a tu propio ritmo
          </h2>
          <p className="mx-auto max-w-3xl text-base text-slate-300">
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
                "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur",
                plan.highlight && "ring-2 ring-emerald-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-slate-300">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-4xl font-semibold">
                    {plan.priceLabel}
                    <span className="ml-1 text-base font-normal text-slate-400">
                      /mes
                    </span>
                  </p>
                </div>
                {plan.ribbon ? (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                    {plan.ribbon}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-slate-300">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                {HIGHLIGHTS.map((highlight) => (
                  <li
                    key={`${plan.id}-${highlight.label}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                  >
                    <span className="text-slate-400">{highlight.label}</span>
                    <span className="font-semibold">
                      {highlight.format(plan.id)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "mt-6 w-full",
                  plan.id === "PREMIUM"
                    ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
                variant="default"
              >
                {plan.id === "FREE"
                  ? "Empieza gratis"
                  : "Quiero el plan Premium"}
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-200">
              Comparativa detallada
            </p>
            <p className="text-2xl font-semibold">
              Todo lo que incluye cada plan
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
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
                        className="pt-6 pb-2 text-xs font-semibold uppercase tracking-widest text-emerald-200"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature) => (
                      <tr
                        key={feature.key}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-white">
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
