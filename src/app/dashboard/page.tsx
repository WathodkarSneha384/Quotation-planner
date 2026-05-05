import Link from "next/link";
import { QuotationsTable, type QuotationListRow } from "@/components/dashboard/QuotationsTable";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-semibold">Configure Supabase</h1>
        <p className="mt-2 text-sm">
          Copy <code className="rounded bg-amber-100 px-1">.env.local.example</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and set your project URL and
          anon key. Run the SQL in <code className="rounded bg-amber-100 px-1">supabase/migrations</code>{" "}
          in the Supabase SQL editor.
        </p>
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
      companies (id, name, logo_url),
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
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h1 className="text-xl font-semibold">Could not load quotations</h1>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as QuotationListRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">All quotations in one place.</p>
        </div>
        <Link
          href="/quotation/new"
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create new quotation
        </Link>
      </div>

      <QuotationsTable rows={rows} />
    </div>
  );
}
