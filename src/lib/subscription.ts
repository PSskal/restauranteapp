import type { PlanTier } from "@prisma/client";

import {
  DEFAULT_PLAN,
  PLAN_LIMITS,
  type PlanId,
  type PlanLimits,
} from "@/data/plans";

type NumericLimitKey =
  | "restaurants"
  | "staffSeats"
  | "tables"
  | "menuItems"
  | "categories"
  | "monthlyOrders";

type BooleanLimitKey = Exclude<
  keyof PlanLimits,
  NumericLimitKey
>;

type PlanLike = PlanTier | PlanId | null | undefined;

export function normalizePlan(plan: PlanLike): PlanId {
  if (!plan) {
    return DEFAULT_PLAN;
  }
  return plan as PlanId;
}

export function getLimits(plan: PlanLike): PlanLimits {
  const normalized = normalizePlan(plan);
  return PLAN_LIMITS[normalized];
}

export function checkNumericLimit(
  plan: PlanLike,
  key: NumericLimitKey,
  currentTotal: number
) {
  const limit = getLimits(plan)[key];

  if (limit === null) {
    return { allowed: true, limit: null as number | null };
  }

  return {
    allowed: currentTotal < limit,
    limit,
  };
}

export function planAllows(plan: PlanLike, key: BooleanLimitKey) {
  return Boolean(getLimits(plan)[key]);
}
