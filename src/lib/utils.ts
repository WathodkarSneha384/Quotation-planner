export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export type QuotationLineAmountInput = {
  unitPrice: number;
  quantity: number;
};

/** unit price × quantity */
export function quotationLineAmount(unitPrice: number, quantity: number): number {
  return Number(unitPrice || 0) * Number(quantity || 0);
}

export function quotationLinesSubtotal(lines: QuotationLineAmountInput[]): number {
  return lines.reduce((s, l) => s + quotationLineAmount(l.unitPrice, l.quantity), 0);
}

/** Sum of all extra costs (non-product costs) */
export function quotationOtherCostsSubtotal(input: {
  labour_cost: number;
  rcc: number;
  cement: number;
  reti: number;
  gitti: number;
  transport: number;
}): number {
  return (
    Number(input.labour_cost || 0) +
    Number(input.rcc || 0) +
    Number(input.cement || 0) +
    Number(input.reti || 0) +
    Number(input.gitti || 0) +
    Number(input.transport || 0)
  );
}

/** Subtotal before discount: sum of (unit price × qty) per line + all cost fields */
export function quotationGrossSubtotal(input: {
  lineItems: QuotationLineAmountInput[];
  labour_cost: number;
  rcc: number;
  cement: number;
  reti: number;
  gitti: number;
  transport: number;
}): number {
  return (
    quotationLinesSubtotal(input.lineItems) +
    quotationOtherCostsSubtotal(input)
  );
}

/** discountPercent: 0–100 applied ONLY on product subtotal */
export function computeQuotationTotal(input: {
  lineItems: QuotationLineAmountInput[];
  labour_cost: number;
  rcc: number;
  cement: number;
  reti: number;
  gitti: number;
  transport: number;
  discountPercent: number;
}): number {
  const lineSubtotal = quotationLinesSubtotal(input.lineItems);
  const otherCosts = quotationOtherCostsSubtotal(input);
  const pct = Math.min(Math.max(Number(input.discountPercent || 0), 0), 100);
  const discountAmount = lineSubtotal * (pct / 100);
  const afterDiscountProducts = Math.max(lineSubtotal - discountAmount, 0);
  return afterDiscountProducts + otherCosts;
}

export function generateQuotationNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `QUO-${y}${m}${day}-${rand}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
