"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PdfDownloadButton } from "@/components/quotation/PdfDownloadButton";
import { createClient } from "@/lib/supabase/client";
import type { QuotationPreviewModel } from "@/lib/types";
import { formatDate, formatInr, quotationLineAmount, whatsappShareUrl } from "@/lib/utils";

export type QuotationListRow = {
  id: string;
  quotation_number: string | null;
  customer_name: string;
  customer_address: string;
  contact_no: string;
  company_id: string | null;
  product_id: string | null;
  product_price: number;
  labour_cost: number;
  rcc: number;
  cement: number;
  reti: number;
  gitti: number;
  transport: number;
  discount: number;
  total: number;
  created_at: string;
  companies: { id: string; name: string; logo_url: string | null } | null;
  products: { name: string } | null;
  quotation_items: Array<{
    unit_price: number;
    quantity?: number;
    sort_order: number;
    companies: { name: string; logo_url: string | null } | null;
    products: { name: string } | null;
  }>;
};

function rowToPreview(row: QuotationListRow): QuotationPreviewModel {
  const items = [...(row.quotation_items ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  let lineItems = items.map((i) => {
    const unit = Number(i.unit_price);
    const qty = Number(i.quantity ?? 1);
    return {
      companyName: i.companies?.name ?? "—",
      productName: i.products?.name ?? "—",
      unitPrice: unit,
      quantity: qty,
      lineTotal: quotationLineAmount(unit, qty),
    };
  });
  if (
    lineItems.length === 0 &&
    row.product_id &&
    row.company_id
  ) {
    const unit = Number(row.product_price ?? 0);
    const qty = 1;
    lineItems = [
      {
        companyName: row.companies?.name ?? "—",
        productName: row.products?.name ?? "—",
        unitPrice: unit,
        quantity: qty,
        lineTotal: quotationLineAmount(unit, qty),
      },
    ];
  }
  const companyNames = Array.from(
    new Set(lineItems.map((l) => l.companyName).filter((n) => n !== "—")),
  );
  const allSuppliersSame = companyNames.length <= 1;
  const headerCompanyName = allSuppliersSame
    ? lineItems[0]?.companyName ?? row.companies?.name ?? "—"
    : "Multiple suppliers";
  const headerCompanyLogoUrl = allSuppliersSame
    ? (items[0]?.companies?.logo_url ?? row.companies?.logo_url ?? null)
    : null;

  return {
    quotationNumber: row.quotation_number,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    contactNo: row.contact_no,
    headerCompanyName,
    headerCompanyLogoUrl,
    allSuppliersSame,
    lineItems,
    discountPercent: Number(row.discount),
    labourCost: Number(row.labour_cost),
    rcc: Number(row.rcc),
    cement: Number(row.cement),
    reti: Number(row.reti),
    gitti: Number(row.gitti),
    transport: Number(row.transport),
    total: Number(row.total),
    dateLabel: formatDate(row.created_at),
  };
}

export function QuotationsTable({ rows }: { rows: QuotationListRow[] }) {
  const router = useRouter();
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this quotation? This cannot be undone.")) return;
    setPendingId(id);
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    setPendingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Quotation deleted");
    router.refresh();
  }

  function shareWhatsapp(row: QuotationListRow) {
    const msg = `Quotation for ${row.customer_name} - Total ${formatInr(Number(row.total))}`;
    window.open(whatsappShareUrl(msg), "_blank", "noopener,noreferrer");
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
        No quotations yet.{" "}
        <Link href="/quotation/new" className="font-medium text-blue-600 hover:underline">
          Create your first quotation
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3 text-slate-800">{row.companies?.name ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.customer_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {formatInr(Number(row.total))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link
                      href={`/quotation/${row.id}/view`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/quotation/${row.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(row.id)}
                      disabled={pendingId === row.id}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <PdfDownloadButton model={rowToPreview(row)} label="PDF" />
                    <button
                      type="button"
                      onClick={() => shareWhatsapp(row)}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      WhatsApp
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
