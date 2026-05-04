import { describe, it, expect } from "vitest";
import { computeOrderTotals, computeDiscountAmountC } from "./order-totals";

describe("computeOrderTotals", () => {
  it("orden sin pagos ni descuentos: saldo = total", () => {
    const totals = computeOrderTotals({
      totalC: 5000,
      discounts: [],
      payments: [],
    });
    expect(totals).toEqual({
      discountsC: 0,
      netDueC: 5000,
      paidC: 0,
      tipsC: 0,
      remainingC: 5000,
      isPaid: false,
    });
  });

  it("solo cuenta pagos PAID, ignora PENDING", () => {
    const totals = computeOrderTotals({
      totalC: 5000,
      discounts: [],
      payments: [
        { amountC: 2000, tipC: 0, status: "PAID" },
        { amountC: 3000, tipC: 0, status: "PENDING" },
      ],
    });
    expect(totals.paidC).toBe(2000);
    expect(totals.remainingC).toBe(3000);
    expect(totals.isPaid).toBe(false);
  });

  it("split por pago: dos pagos suman el total", () => {
    const totals = computeOrderTotals({
      totalC: 5000,
      discounts: [],
      payments: [
        { amountC: 2500, tipC: 250, status: "PAID" },
        { amountC: 2500, tipC: 500, status: "PAID" },
      ],
    });
    expect(totals.paidC).toBe(5000);
    expect(totals.tipsC).toBe(750);
    expect(totals.remainingC).toBe(0);
    expect(totals.isPaid).toBe(true);
  });

  it("descuento 15% reduce el saldo neto", () => {
    const totals = computeOrderTotals({
      totalC: 5000,
      discounts: [{ amountC: 750 }],
      payments: [],
    });
    expect(totals.discountsC).toBe(750);
    expect(totals.netDueC).toBe(4250);
    expect(totals.remainingC).toBe(4250);
  });

  it("propinas no entran en saldo, sólo se acumulan", () => {
    const totals = computeOrderTotals({
      totalC: 5000,
      discounts: [],
      payments: [{ amountC: 5000, tipC: 800, status: "PAID" }],
    });
    expect(totals.tipsC).toBe(800);
    expect(totals.isPaid).toBe(true);
    expect(totals.remainingC).toBe(0);
  });

  it("netDueC nunca es negativo aunque haya descuento mayor que el total", () => {
    const totals = computeOrderTotals({
      totalC: 1000,
      discounts: [{ amountC: 5000 }],
      payments: [],
    });
    expect(totals.netDueC).toBe(0);
    expect(totals.isPaid).toBe(false); // no se considera pagada si nunca hubo saldo
  });
});

describe("computeDiscountAmountC", () => {
  it("PERCENT 15% sobre 5000c = 750c (basis points)", () => {
    expect(
      computeDiscountAmountC({ type: "PERCENT", baseC: 5000, valueBp: 1500 })
    ).toBe(750);
  });

  it("PERCENT redondea hacia abajo", () => {
    // 1234c * 7.5% = 92.55 -> 92
    expect(
      computeDiscountAmountC({ type: "PERCENT", baseC: 1234, valueBp: 750 })
    ).toBe(92);
  });

  it("FIXED capea al baseC", () => {
    expect(
      computeDiscountAmountC({ type: "FIXED", baseC: 1000, valueC: 5000 })
    ).toBe(1000);
  });

  it("FIXED dentro del rango", () => {
    expect(
      computeDiscountAmountC({ type: "FIXED", baseC: 5000, valueC: 1500 })
    ).toBe(1500);
  });

  it("COMP cubre toda la base", () => {
    expect(computeDiscountAmountC({ type: "COMP", baseC: 4500 })).toBe(4500);
  });

  it("base 0 no descuenta", () => {
    expect(
      computeDiscountAmountC({ type: "PERCENT", baseC: 0, valueBp: 1500 })
    ).toBe(0);
    expect(computeDiscountAmountC({ type: "COMP", baseC: 0 })).toBe(0);
  });
});
