import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { planAllows } from "@/lib/subscription";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

const DEFAULT_RANGE: RangeKey = "7d";

type DateRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  days: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function parseRange(url: URL): DateRange {
  const now = new Date();
  const rangeParam = (url.searchParams.get("range") as RangeKey | null) ?? DEFAULT_RANGE;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const to = endOfDay(now);
  let resolved: DateRange | null = null;

  switch (rangeParam) {
    case "today": {
      const from = startOfDay(now);
      resolved = { key: "today", from, to, days: 1 };
      break;
    }
    case "30d": {
      const from = addDays(startOfDay(now), -29);
      resolved = { key: "30d", from, to, days: 30 };
      break;
    }
    case "90d": {
      const from = addDays(startOfDay(now), -89);
      resolved = { key: "90d", from, to, days: 90 };
      break;
    }
    case "custom": {
      if (fromParam && toParam) {
        const parsedFrom = startOfDay(new Date(fromParam));
        const parsedTo = endOfDay(new Date(toParam));
        if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
          const orderedFrom = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
          const orderedTo = parsedTo >= parsedFrom ? parsedTo : parsedFrom;
          const days = Math.max(1, Math.ceil((orderedTo.getTime() - orderedFrom.getTime()) / 86_400_000) + 1);
          resolved = { key: "custom", from: orderedFrom, to: orderedTo, days };
        }
      }
      break;
    }
    case "7d":
    default: {
      const from = addDays(startOfDay(now), -6);
      resolved = { key: "7d", from, to, days: 7 };
      break;
    }
  }

  if (resolved) {
    return resolved;
  }

  const fallbackFrom = addDays(startOfDay(now), -6);
  return { key: DEFAULT_RANGE, from: fallbackFrom, to, days: 7 };
}

type ReportsTimelineEntry = {
  date: string;
  orderCount: number;
  servedCount: number;
  cancelledCount: number;
  revenueCents: number;
  averageTicketCents: number;
};

type PaymentAggregate = {
  amountCents: number;
  count: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const organizationAccess = await prisma.organization.findFirst({
      where: {
        id: orgId,
        OR: [
          { ownerId: session.user.id },
          {
            memberships: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      select: { id: true, plan: true },
    });

    if (!organizationAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a esta organizacion" },
        { status: 403 }
      );
    }

    if (!planAllows(organizationAccess.plan, "allowReportsAdvanced")) {
      return NextResponse.json(
        {
          error:
            "Los reportes avanzados est�n disponibles solo en el plan Premium.",
        },
        { status: 402 }
      );
    }

    const range = parseRange(new URL(request.url));

    const orders = await prisma.order.findMany({
      where: {
        orgId,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        status: true,
        totalC: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            menuItemId: true,
            name: true,
            quantity: true,
            totalC: true,
          },
        },
        payments: {
          select: {
            id: true,
            method: true,
            status: true,
            amountC: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const statusCounts: Record<OrderStatus, number> = {
      [OrderStatus.DRAFT]: 0,
      [OrderStatus.PLACED]: 0,
      [OrderStatus.ACCEPTED]: 0,
      [OrderStatus.PREPARING]: 0,
      [OrderStatus.READY]: 0,
      [OrderStatus.SERVED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    const timelineMap = new Map<string, ReportsTimelineEntry>();
    const itemAccumulator = new Map<
      string,
      { id: string; name: string; quantity: number; revenueCents: number }
    >();

    const paymentBreakdown: Record<PaymentMethod, PaymentAggregate> = {
      [PaymentMethod.CASH]: { amountCents: 0, count: 0 },
      [PaymentMethod.CARD]: { amountCents: 0, count: 0 },
    };

    let totalRevenueCents = 0;
    let servedOrders = 0;
    let cancelledOrders = 0;

    for (const order of orders) {
      statusCounts[order.status] += 1;

      const dayKey = startOfDay(order.createdAt).toISOString().slice(0, 10);
      const existing = timelineMap.get(dayKey) ?? {
        date: dayKey,
        orderCount: 0,
        servedCount: 0,
        cancelledCount: 0,
        revenueCents: 0,
        averageTicketCents: 0,
      };
      existing.orderCount += 1;

      if (order.status === OrderStatus.SERVED) {
        totalRevenueCents += order.totalC ?? 0;
        servedOrders += 1;
        existing.servedCount += 1;
        existing.revenueCents += order.totalC ?? 0;

        for (const item of order.items) {
          const itemKey = item.menuItemId ?? item.id;
          const accumulator = itemAccumulator.get(itemKey) ?? {
            id: item.menuItemId ?? item.id,
            name: item.name,
            quantity: 0,
            revenueCents: 0,
          };
          accumulator.quantity += item.quantity;
          accumulator.revenueCents += item.totalC ?? 0;
          accumulator.name = item.name;
          itemAccumulator.set(itemKey, accumulator);
        }
      }

      if (order.status === OrderStatus.CANCELLED) {
        cancelledOrders += 1;
        existing.cancelledCount += 1;
      }

      for (const payment of order.payments) {
        if (payment.status !== PaymentStatus.PAID) {
          continue;
        }
        const bucket = paymentBreakdown[payment.method];
        if (bucket) {
          bucket.amountCents += payment.amountC;
          bucket.count += 1;
        }
      }

      timelineMap.set(dayKey, existing);
    }

    const timeline: ReportsTimelineEntry[] = [];
    let cursor = startOfDay(new Date(range.from));
    while (cursor <= range.to) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = timelineMap.get(key) ?? {
        date: key,
        orderCount: 0,
        servedCount: 0,
        cancelledCount: 0,
        revenueCents: 0,
        averageTicketCents: 0,
      };
      entry.averageTicketCents =
        entry.servedCount > 0
          ? Math.round(entry.revenueCents / entry.servedCount)
          : 0;
      timeline.push(entry);
      cursor = addDays(cursor, 1);
    }

    const topItems = Array.from(itemAccumulator.values())
      .sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity)
      .slice(0, 5);

    const bestDay = timeline.reduce<ReportsTimelineEntry | null>(
      (acc, day) => {
        if (!acc || day.revenueCents > acc.revenueCents) {
          return day;
        }
        return acc;
      },
      null
    );

    const totalOrders = orders.length;
    const averageTicketCents =
      servedOrders > 0 ? Math.round(totalRevenueCents / servedOrders) : 0;
    const cancellationRate =
      totalOrders > 0 ? cancelledOrders / totalOrders : 0;

    return NextResponse.json({
      range: {
        key: range.key,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        days: range.days,
      },
      totals: {
        revenueCents: totalRevenueCents,
        totalOrders,
        servedOrders,
        cancelledOrders,
        averageTicketCents,
        cancellationRate,
      },
      statusCounts,
      paymentBreakdown,
      topItems,
      timeline,
      highlights: {
        bestDay,
        topItem: topItems[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
