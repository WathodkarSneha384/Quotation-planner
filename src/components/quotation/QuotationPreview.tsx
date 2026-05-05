import type { QuotationPreviewModel } from "@/lib/types";
import { SHREE_SALES_DETAILS } from "@/lib/shreeSales";
import { formatInr, quotationGrossSubtotal, quotationOtherCostsSubtotal } from "@/lib/utils";

type Props = {
  data: QuotationPreviewModel;
  /** Root id for PDF capture */
  rootId?: string;
  className?: string;
};

export function QuotationPreview({ data, rootId = "quotation-preview-root", className = "" }: Props) {
  const gstDisplay =
    SHREE_SALES_DETAILS.gstNo && SHREE_SALES_DETAILS.gstNo !== "ADD_GST_NUMBER_HERE"
      ? SHREE_SALES_DETAILS.gstNo
      : "-";
  const lineSum = data.lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const gross = quotationGrossSubtotal({
    lineItems: data.lineItems.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
    labour_cost: data.labourCost,
    rcc: data.rcc,
    cement: data.cement,
    reti: data.reti,
    gitti: data.gitti,
    transport: data.transport,
  });
  const otherCostsTotal = quotationOtherCostsSubtotal({
    labour_cost: data.labourCost,
    rcc: data.rcc,
    cement: data.cement,
    reti: data.reti,
    gitti: data.gitti,
    transport: data.transport,
  });
  const discountAmount = lineSum * (Math.min(Math.max(data.discountPercent, 0), 100) / 100);

  const costRows = [
    { label: "Labour cost", value: data.labourCost },
    { label: "RCC", value: data.rcc },
    { label: "Cement", value: data.cement },
    { label: "Reti", value: data.reti },
    { label: "Gitti", value: data.gitti },
    { label: "Transport", value: data.transport },
  ];

  return (
    <div
      id={rootId}
      className={`print-root rounded-lg border border-slate-200 bg-white p-8 text-slate-900 shadow-sm ${className}`}
    >
      <header className="border-b-2 border-slate-300 pb-4 text-center">
        <h1 className="text-[30px] font-bold tracking-wide">{SHREE_SALES_DETAILS.name}</h1>
        <p className="mt-0.5 text-[13px] leading-tight text-slate-700">{SHREE_SALES_DETAILS.addressLine1}</p>
        <p className="mt-0.5 text-[13px] leading-tight text-slate-700">
          Contact No: {SHREE_SALES_DETAILS.contactNo} | GST No: {gstDisplay}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-slate-700">
          {data.quotationNumber ? (
            <span className="rounded border border-slate-300 bg-slate-50 px-2 py-1">
              Quotation No: <span className="font-semibold text-slate-900">{data.quotationNumber}</span>
            </span>
          ) : null}
          <span className="rounded border border-slate-300 bg-slate-50 px-2 py-1">
            Date: <span className="font-semibold text-slate-900">{data.dateLabel}</span>
          </span>
        </div>
      </header>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">Customer</h2>
          <p className="mt-1 text-base font-semibold">{data.customerName}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{data.customerAddress}</p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Contact:</span> {data.contactNo}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Supplier / Brand</h2>
          <p className="mt-1 text-base font-semibold">{data.headerCompanyName}</p>
          {data.allSuppliersSame && data.headerCompanyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.headerCompanyLogoUrl}
              alt={`${data.headerCompanyName} logo`}
              className="mt-3 h-16 max-w-[200px] object-contain"
              crossOrigin="anonymous"
            />
          ) : !data.allSuppliersSame ? (
            <p className="mt-2 max-w-md text-right text-xs text-slate-600">
              Multiple suppliers — see product lines for details.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Products</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <th className="border border-slate-200 px-3 py-2">Company</th>
              <th className="border border-slate-200 px-3 py-2">Product</th>
              <th className="border border-slate-200 px-3 py-2 text-right">Rate (₹)</th>
              <th className="border border-slate-200 px-3 py-2 text-right">Qty</th>
              <th className="border border-slate-200 px-3 py-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((li, idx) => (
              <tr key={`${li.companyName}-${li.productName}-${idx}`}>
                <td className="border border-slate-200 px-3 py-2">{li.companyName}</td>
                <td className="border border-slate-200 px-3 py-2">{li.productName}</td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {formatInr(li.unitPrice)}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {li.quantity}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {formatInr(li.lineTotal)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-medium">
              <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right">
                Subtotal (products)
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                {formatInr(lineSum)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Other costs</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <th className="border border-slate-200 px-3 py-2">Description</th>
              <th className="border border-slate-200 px-3 py-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {costRows.map((r) => (
              <tr key={r.label}>
                <td className="border border-slate-200 px-3 py-2">{r.label}</td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {formatInr(r.value)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100">
              <td className="border border-slate-200 px-3 py-2 font-semibold">
                Amount before discount
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold tabular-nums">
                {formatInr(gross)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-200 px-3 py-2">
                Discount on product subtotal ({data.discountPercent}%)
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-red-700">
                −{formatInr(discountAmount)}
              </td>
            </tr>
            <tr className="bg-slate-900 text-white">
              <td className="border border-slate-900 px-3 py-2 font-semibold">Total payable</td>
              <td className="border border-slate-900 px-3 py-2 text-right text-base font-bold tabular-nums">
                {formatInr(data.total)}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600">
                Formula
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right text-xs text-slate-600">
                ({formatInr(lineSum)} - {formatInr(discountAmount)}) + {formatInr(otherCostsTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-md bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>100% advance payment</li>
          <li>Transport extra if applicable</li>
        </ul>
      </section>

      <footer className="mt-10 text-center text-xs text-slate-500">
        This is a computer-generated quotation and is valid without signature unless stated otherwise.
      </footer>
    </div>
  );
}
