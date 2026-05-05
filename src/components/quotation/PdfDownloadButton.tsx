"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadQuotationPdf } from "@/lib/pdf";
import type { QuotationPreviewModel } from "@/lib/types";
import { QuotationPreview } from "./QuotationPreview";

type Props = {
  model: QuotationPreviewModel;
  label?: string;
  filename?: string;
  className?: string;
};

export function PdfDownloadButton({
  model,
  label = "Download PDF",
  filename,
  className,
}: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const reactId = useId().replace(/:/g, "");
  const rootId = `quotation-preview-${reactId}`;

  async function handleClick() {
    const el = captureRef.current?.querySelector(`#${rootId}`) as HTMLElement | null;
    if (!el) {
      toast.error("Could not prepare PDF");
      return;
    }
    setBusy(true);
    try {
      const safeName =
        filename ??
        `${model.quotationNumber ?? "quotation"}-${model.customerName.replace(/\s+/g, "-")}.pdf`;
      await downloadQuotationPdf(el, safeName);
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={
          className ??
          "rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        }
      >
        {busy ? "Preparing…" : label}
      </button>
      <div
        ref={captureRef}
        className="pointer-events-none fixed left-0 top-0 z-[-1] w-[210mm] max-w-[210mm] bg-white p-4 opacity-[0.02]"
        aria-hidden
      >
        <QuotationPreview data={model} rootId={rootId} />
      </div>
    </>
  );
}
