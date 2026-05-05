import Link from "next/link";
import { PdfDownloadButton } from "@/components/quotation/PdfDownloadButton";
import { QuotationPreview } from "@/components/quotation/QuotationPreview";
import type { QuotationPreviewModel } from "@/lib/types";

type Props = {
  model: QuotationPreviewModel;
  quotationId: string;
};

export function QuotationViewPage({ model, quotationId }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quotation</h1>
          {model.quotationNumber && (
            <p className="text-sm text-slate-500">No. {model.quotationNumber}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            href={`/quotation/${quotationId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <PdfDownloadButton model={model} />
        </div>
      </div>
      <QuotationPreview data={model} />
    </div>
  );
}
