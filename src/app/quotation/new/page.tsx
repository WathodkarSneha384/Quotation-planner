import { QuotationForm } from "@/components/quotation/QuotationForm";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function NewQuotationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-sm">Add Supabase environment variables to use this page.</p>
      </div>
    );
  }

  return <QuotationForm mode="create" />;
}
