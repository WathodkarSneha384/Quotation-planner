import { notFound } from "next/navigation";
import { QuotationViewPage } from "@/components/quotation/QuotationViewPage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { QuotationPreviewModel } from "@/lib/types";
import { formatDate, quotationLineAmount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function QuotationViewRoute({ params }: PageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-sm">Add Supabase environment variables to use this page.</p>
      </div>
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      id,
      quotation_number,
      customer_name,
      customer_address,
      contact_no,
      company_id,
      product_id,
      product_price,
      labour_cost,
      rcc,
      cement,
      reti,
      gitti,
      transport,
      discount,
      total,
      created_at,
      companies (name, logo_url),
      products (name),
      quotation_items (
        unit_price,
        quantity,
        sort_order,
        companies (name, logo_url),
        products (name)
      )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = data as unknown as {
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
    companies: { name: string; logo_url: string | null } | null;
    products: { name: string } | null;
    quotation_items: Array<{
      unit_price: number;
      quantity?: number;
      sort_order: number;
      companies: { name: string; logo_url: string | null } | null;
      products: { name: string } | null;
    }>;
  };

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
  if (lineItems.length === 0 && row.product_id && row.company_id) {
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

  const model: QuotationPreviewModel = {
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

  return <QuotationViewPage model={model} quotationId={row.id} />;
}
