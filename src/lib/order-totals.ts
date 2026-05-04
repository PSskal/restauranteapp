/**
 * Helpers puros para cálculos de saldos de orden.
 * Aislamos la aritmética del acceso a DB para poder testearla sin mocks.
 */

export type OrderTotalsInput = {
  totalC: number;
  discounts: { amountC: number }[];
  payments: { amountC: number; tipC: number; status: "PAID" | "PENDING" }[];
};

export type OrderTotals = {
  discountsC: number;
  netDueC: number;
  paidC: number;
  tipsC: number;
  remainingC: number;
  isPaid: boolean;
};

export function computeOrderTotals(order: OrderTotalsInput): OrderTotals {
  const discountsC = order.discounts.reduce((sum, d) => sum + d.amountC, 0);
  const netDueC = Math.max(0, order.totalC - discountsC);

  const paidPayments = order.payments.filter((p) => p.status === "PAID");
  const paidC = paidPayments.reduce((sum, p) => sum + p.amountC, 0);
  const tipsC = paidPayments.reduce((sum, p) => sum + p.tipC, 0);

  const remainingC = Math.max(0, netDueC - paidC);
  const isPaid = netDueC === 0 ? false : paidC >= netDueC;

  return { discountsC, netDueC, paidC, tipsC, remainingC, isPaid };
}

/**
 * Calcula el monto a descontar dado el tipo y la base del descuento.
 * - PERCENT: usa puntos básicos (1500 = 15%) para evitar floats
 * - FIXED: monto en centavos, capeado a la base
 * - COMP: cubre toda la base
 */
export function computeDiscountAmountC(args: {
  type: "PERCENT" | "FIXED" | "COMP";
  baseC: number;
  valueBp?: number;
  valueC?: number;
}): number {
  const { type, baseC, valueBp, valueC } = args;
  if (baseC <= 0) return 0;
  if (type === "PERCENT") {
    if (!valueBp || valueBp <= 0) return 0;
    return Math.floor((baseC * valueBp) / 10000);
  }
  if (type === "FIXED") {
    if (!valueC || valueC <= 0) return 0;
    return Math.min(valueC, baseC);
  }
  // COMP
  return baseC;
}
