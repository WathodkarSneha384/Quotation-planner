"use client";

export async function downloadQuotationPdf(element: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js");
  const html2pdf = (mod as { default?: unknown }).default ?? mod;
  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  type Chain = {
    set: (o: typeof opt) => { from: (el: HTMLElement) => { save: () => Promise<void> | void } };
  };
  const chain = (html2pdf as () => Chain)();
  await Promise.resolve(chain.set(opt).from(element).save());
}
