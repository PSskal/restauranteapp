import type { Organization } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type OrgWithPlanMeta = Pick<
  Organization,
  "id" | "plan" | "planExpiresAt" | "planUpdatedAt"
> & {
  [key: string]: unknown;
};

export function calculateExpirationDate(months = 1) {
  const now = new Date();
  now.setMonth(now.getMonth() + months);
  return now;
}

function planHasExpired(org: OrgWithPlanMeta) {
  if (org.plan !== "PREMIUM") {
    return false;
  }
  if (!org.planExpiresAt) {
    return false;
  }
  return new Date(org.planExpiresAt).getTime() <= Date.now();
}

export async function ensureActivePlan<T extends OrgWithPlanMeta | null | undefined>(
  org: T
): Promise<T> {
  if (!org) {
    return org;
  }

  if (!planHasExpired(org)) {
    return org;
  }

  const now = new Date();

  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: "FREE", planExpiresAt: null, planUpdatedAt: now },
  });

  return {
    ...org,
    plan: "FREE",
    planExpiresAt: null,
    planUpdatedAt: now,
  } as T;
}

export async function ensureActivePlans<T extends OrgWithPlanMeta>(
  orgs: T[]
): Promise<T[]> {
  return Promise.all(orgs.map((org) => ensureActivePlan(org)));
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    return false;
  }
  return email.toLowerCase() === adminEmail.toLowerCase();
}
