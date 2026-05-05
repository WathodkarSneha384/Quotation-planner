import { notFound } from "next/navigation";
import { QuotationForm, type InitialLineItem } from "@/components/quotation/QuotationForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Quotation } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

type RawQuotation = Quotation & {
  quotation_items?: Array<{
    company_id: string;
    product_id: string;
    unit_price: number;
    quantity?: number;
    sort_order: number;
  }>;
};

export default async function QuotationDetailPage({ params }: PageProps) {
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
      *,
      quotation_items (
        company_id,
        product_id,
        unit_price,
        quantity,
        sort_order
      )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const raw = data as unknown as RawQuotation;
  const { quotation_items: qi, ...quotationRest } = raw;

  let initialLineItems: InitialLineItem[] = (qi ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((row) => ({
      company_id: row.company_id,
      product_id: row.product_id,
      unit_price: Number(row.unit_price),
      quantity: Number(row.quantity ?? 1),
    }));

  if (
    initialLineItems.length === 0 &&
    raw.company_id &&
    raw.product_id
  ) {
    initialLineItems = [
      {
        company_id: raw.company_id,
        product_id: raw.product_id,
        unit_price: Number(raw.product_price ?? 0),
        quantity: 1,
      },
    ];
  }

  return (
    <QuotationForm
      mode="edit"
      initial={quotationRest as Quotation}
      initialLineItems={initialLineItems}
    />
  );
}
