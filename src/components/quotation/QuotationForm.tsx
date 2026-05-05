"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AddCompanyModal } from "@/components/company/AddCompanyModal";
import { createClient } from "@/lib/supabase/client";
import type { Company, Product, Quotation, QuotationPreviewModel } from "@/lib/types";
import {
  computeQuotationTotal,
  formatDate,
  formatInr,
  generateQuotationNumber,
  quotationLineAmount,
  quotationLinesSubtotal,
  quotationOtherCostsSubtotal,
} from "@/lib/utils";
import { quotationFormSchema, type QuotationFormValues } from "@/lib/validations/quotation";
import { PdfDownloadButton } from "./PdfDownloadButton";
import { QuotationPreview } from "./QuotationPreview";

export type InitialLineItem = {
  company_id: string;
  product_id: string;
  unit_price: number;
  quantity?: number;
};

type Props = {
  mode: "create" | "edit";
  initial?: Quotation | null;
  initialLineItems?: InitialLineItem[];
};

export function QuotationForm({ mode, initial, initialLineItems }: Props) {
  const router = useRouter();
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [productsByCompany, setProductsByCompany] = useState<Record<string, Product[]>>({});
  const productsLoadedRef = useRef<Set<string>>(new Set());
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<QuotationFormValues | null>(null);
  const [savingFromPreview, setSavingFromPreview] = useState(false);

  const defaultLineItems = useMemo(
    () =>
      initialLineItems?.length
        ? initialLineItems.map((r) => ({
            company_id: r.company_id,
            product_id: r.product_id,
            unit_price: r.unit_price,
            quantity: r.quantity ?? 1,
          }))
        : [{ company_id: "", product_id: "", unit_price: 0, quantity: 1 }],
    [initialLineItems],
  );

  const defaults = useMemo<QuotationFormValues>(
    () => ({
      customer_name: initial?.customer_name ?? "",
      customer_address: initial?.customer_address ?? "",
      contact_no: initial?.contact_no ?? "",
      line_items: defaultLineItems,
      labour_cost: initial?.labour_cost ?? 0,
      rcc: initial?.rcc ?? 0,
      cement: initial?.cement ?? 0,
      reti: initial?.reti ?? 0,
      gitti: initial?.gitti ?? 0,
      transport: initial?.transport ?? 0,
      discount: initial?.discount ?? 0,
    }),
    [initial, defaultLineItems],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "line_items" });

  const watched = useWatch({ control });
  const lineItemsWatched = useMemo(
    () => watched.line_items ?? [],
    [watched.line_items],
  );

  const loadCompanies = useCallback(async () => {
    const { data, error } = await supabase.from("companies").select("*").order("name");
    if (error) {
      toast.error(error.message);
      return;
    }
    setCompanies(data ?? []);
  }, [supabase]);

  const fetchProductsForCompany = useCallback(
    async (companyId: string) => {
      if (!companyId || productsLoadedRef.current.has(companyId)) return;
      productsLoadedRef.current.add(companyId);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) {
        productsLoadedRef.current.delete(companyId);
        toast.error(error.message);
        return;
      }
      setProductsByCompany((prev) => ({ ...prev, [companyId]: data ?? [] }));
    },
    [supabase],
  );

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    const ids = Array.from(
      new Set(lineItemsWatched.map((l) => l?.company_id).filter(Boolean) as string[]),
    );
    ids.forEach((id) => {
      void fetchProductsForCompany(id);
    });
  }, [lineItemsWatched, fetchProductsForCompany]);

  useEffect(() => {
    const ids = Array.from(
      new Set((initialLineItems ?? []).map((l) => l.company_id).filter(Boolean)),
    );
    ids.forEach((id) => {
      void fetchProductsForCompany(id);
    });
  }, [initialLineItems, fetchProductsForCompany]);

  const lineItemsForTotal = useMemo(
    () =>
      lineItemsWatched.map((l) => ({
        unitPrice: Number(l?.unit_price ?? 0),
        quantity: Number(l?.quantity ?? 1),
      })),
    [lineItemsWatched],
  );

  const costInputs = useMemo(
    () => ({
      labour_cost: Number(watched.labour_cost ?? 0),
      rcc: Number(watched.rcc ?? 0),
      cement: Number(watched.cement ?? 0),
      reti: Number(watched.reti ?? 0),
      gitti: Number(watched.gitti ?? 0),
      transport: Number(watched.transport ?? 0),
    }),
    [
      watched.labour_cost,
      watched.rcc,
      watched.cement,
      watched.reti,
      watched.gitti,
      watched.transport,
    ],
  );

  const discountPercentLive = Math.min(
    Math.max(Number(watched.discount ?? 0), 0),
    100,
  );

  const productSubtotal = useMemo(
    () => quotationLinesSubtotal(lineItemsForTotal),
    [lineItemsForTotal],
  );

  const otherCostsTotal = useMemo(
    () => quotationOtherCostsSubtotal(costInputs),
    [costInputs],
  );

  const discountAmountLive = productSubtotal * (discountPercentLive / 100);

  const productsAfterDiscount = Math.max(productSubtotal - discountAmountLive, 0);

  const total = computeQuotationTotal({
    lineItems: lineItemsForTotal,
    labour_cost: costInputs.labour_cost,
    rcc: costInputs.rcc,
    cement: costInputs.cement,
    reti: costInputs.reti,
    gitti: costInputs.gitti,
    transport: costInputs.transport,
    discountPercent: Number(watched.discount ?? 0),
  });

  const linePreviewRows = useCallback(
    (values: QuotationFormValues): QuotationPreviewModel["lineItems"] => {
      return values.line_items.map((li) => {
        const co = companies.find((c) => c.id === li.company_id);
        const prods = productsByCompany[li.company_id] ?? [];
        const pr = prods.find((p) => p.id === li.product_id);
        const unit = Number(li.unit_price ?? 0);
        const qty = Number(li.quantity ?? 1);
        return {
          companyName: co?.name ?? "â€”",
          productName: pr?.name ?? "â€”",
          unitPrice: unit,
          quantity: qty,
          lineTotal: quotationLineAmount(unit, qty),
        };
      });
    },
    [companies, productsByCompany],
  );

  function headerFromLines(lines: QuotationPreviewModel["lineItems"], companiesList: Company[]) {
    const names = Array.from(new Set(lines.map((l) => l.companyName).filter((n) => n !== "â€”")));
    const allSame = names.length <= 1;
    const firstCoName = lines[0]?.companyName ?? "â€”";
    const firstCompanyId = companiesList.find((c) => c.name === firstCoName)?.id;
    const logo =
      allSame && firstCompanyId
        ? (companiesList.find((c) => c.id === firstCompanyId)?.logo_url ?? null)
        : null;
    return {
      headerCompanyName: allSame ? firstCoName : "Multiple suppliers",
      headerCompanyLogoUrl: allSame ? logo : null,
      allSuppliersSame: allSame,
    };
  }

  const previewModel: QuotationPreviewModel = useMemo(() => {
    const vals: QuotationFormValues = {
      customer_name: String(watched.customer_name ?? ""),
      customer_address: String(watched.customer_address ?? ""),
      contact_no: String(watched.contact_no ?? ""),
      line_items: (watched.line_items ?? []) as QuotationFormValues["line_items"],
      labour_cost: Number(watched.labour_cost ?? 0),
      rcc: Number(watched.rcc ?? 0),
      cement: Number(watched.cement ?? 0),
      reti: Number(watched.reti ?? 0),
      gitti: Number(watched.gitti ?? 0),
      transport: Number(watched.transport ?? 0),
      discount: Number(watched.discount ?? 0),
    };
    const lines = linePreviewRows(vals);
    const h = headerFromLines(lines, companies);
    return {
      quotationNumber: initial?.quotation_number ?? null,
      customerName: watched.customer_name?.trim() || "â€”",
      customerAddress: watched.customer_address?.trim() || "â€”",
      contactNo: watched.contact_no?.trim() || "â€”",
      ...h,
      lineItems: lines,
      discountPercent: Number(watched.discount ?? 0),
      labourCost: Number(watched.labour_cost ?? 0),
      rcc: Number(watched.rcc ?? 0),
      cement: Number(watched.cement ?? 0),
      reti: Number(watched.reti ?? 0),
      gitti: Number(watched.gitti ?? 0),
      transport: Number(watched.transport ?? 0),
      total,
      dateLabel: initial?.created_at ? formatDate(initial.created_at) : formatDate(new Date().toISOString()),
    };
  }, [watched, companies, initial, total, linePreviewRows]);

  async function persistQuotation(values: QuotationFormValues) {
    const computedTotal = computeQuotationTotal({
      lineItems: values.line_items.map((l) => ({
        unitPrice: Number(l.unit_price),
        quantity: Number(l.quantity),
      })),
      labour_cost: values.labour_cost,
      rcc: values.rcc,
      cement: values.cement,
      reti: values.reti,
      gitti: values.gitti,
      transport: values.transport,
      discountPercent: values.discount,
    });

    const firstCompanyId = values.line_items[0]?.company_id ?? null;

    const quotationPayload = {
      customer_name: values.customer_name.trim(),
      customer_address: values.customer_address.trim(),
      contact_no: values.contact_no.trim(),
      company_id: firstCompanyId,
      product_id: null as string | null,
      product_price: 0,
      labour_cost: values.labour_cost,
      rcc: values.rcc,
      cement: values.cement,
      reti: values.reti,
      gitti: values.gitti,
      transport: values.transport,
      discount: values.discount,
      total: computedTotal,
    };

    const itemRows = values.line_items.map((li, idx) => ({
      company_id: li.company_id,
      product_id: li.product_id,
      unit_price: li.unit_price,
      quantity: li.quantity,
      sort_order: idx,
    }));

    if (mode === "create") {
      const quotation_number = generateQuotationNumber();
      const { data: created, error } = await supabase
        .from("quotations")
        .insert({ ...quotationPayload, quotation_number })
        .select("id")
        .single();
      if (error || !created) {
        toast.error(error?.message ?? "Could not create quotation");
        return;
      }
      const { error: iErr } = await supabase.from("quotation_items").insert(
        itemRows.map((r) => ({
          quotation_id: created.id,
          ...r,
        })),
      );
      if (iErr) {
        toast.error(iErr.message);
        return;
      }
      toast.success("Quotation created");
      router.push(`/quotation/${created.id}`);
      router.refresh();
      return;
    }

    if (!initial?.id) return;

    const { error: uErr } = await supabase.from("quotations").update(quotationPayload).eq("id", initial.id);
    if (uErr) {
      toast.error(uErr.message);
      return;
    }

    await supabase.from("quotation_items").delete().eq("quotation_id", initial.id);
    const { error: insErr } = await supabase.from("quotation_items").insert(
      itemRows.map((r) => ({
        quotation_id: initial.id,
        ...r,
      })),
    );
    if (insErr) {
      toast.error(insErr.message);
      return;
    }

    toast.success("Quotation updated");
    router.refresh();
  }

  async function onSubmit(values: QuotationFormValues) {
    setPendingValues(values);
    setPreviewOpen(true);
  }

  async function handleConfirmSave() {
    if (!pendingValues) return;
    setSavingFromPreview(true);
    try {
      await persistQuotation(pendingValues);
      setPreviewOpen(false);
      setPendingValues(null);
    } finally {
      setSavingFromPreview(false);
    }
  }

  const previewData: QuotationPreviewModel = useMemo(() => {
    if (!pendingValues) return previewModel;
    const lines = linePreviewRows(pendingValues);
    const h = headerFromLines(lines, companies);
    return {
      quotationNumber: initial?.quotation_number ?? null,
      customerName: pendingValues.customer_name?.trim() || "â€”",
      customerAddress: pendingValues.customer_address?.trim() || "â€”",
      contactNo: pendingValues.contact_no?.trim() || "â€”",
      ...h,
      lineItems: lines,
      discountPercent: Number(pendingValues.discount ?? 0),
      labourCost: Number(pendingValues.labour_cost ?? 0),
      rcc: Number(pendingValues.rcc ?? 0),
      cement: Number(pendingValues.cement ?? 0),
      reti: Number(pendingValues.reti ?? 0),
      gitti: Number(pendingValues.gitti ?? 0),
      transport: Number(pendingValues.transport ?? 0),
      total: computeQuotationTotal({
        lineItems: pendingValues.line_items.map((l) => ({
          unitPrice: Number(l.unit_price),
          quantity: Number(l.quantity),
        })),
        labour_cost: pendingValues.labour_cost,
        rcc: pendingValues.rcc,
        cement: pendingValues.cement,
        reti: pendingValues.reti,
        gitti: pendingValues.gitti,
        transport: pendingValues.transport,
        discountPercent: pendingValues.discount,
      }),
      dateLabel: initial?.created_at ? formatDate(initial.created_at) : formatDate(new Date().toISOString()),
    };
  }, [pendingValues, previewModel, companies, initial, linePreviewRows]);

  function addProductSameCompany() {
    append({
      company_id: "",
      product_id: "",
      unit_price: 0,
      quantity: 1,
    });
  }

  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800">
            {mode === "create" ? "New quotation" : "Edit quotation"}
          </h1>
          <p className="mt-1 text-sm text-emerald-700">
            Create professional quotations with products, costs, discount, and live totals.
          </p>
          {initial?.quotation_number && (
            <p className="text-sm text-emerald-700">No. {initial.quotation_number}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-md border border-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Back
          </Link>
          {mode === "edit" && initial && (
            <PdfDownloadButton
              model={{
                ...previewModel,
                quotationNumber: initial.quotation_number,
              }}
            />
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 shadow-md ring-1 ring-emerald-100/70"
      >
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-emerald-800">Quotation Details</h2>
          <p className="mt-1 text-xs text-emerald-700">
            Fill customer details first, then add product lines and costs.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <section className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                1. Customer Details
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Required
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-emerald-800">Customer name *</label>
                <input
                  {...register("customer_name")}
                  placeholder="Enter customer full name"
                  className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
                {errors.customer_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.customer_name.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-emerald-800">Contact number *</label>
                <input
                  type="tel"
                  {...register("contact_no")}
                  placeholder="Enter mobile / phone number"
                  className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
                {errors.contact_no && (
                  <p className="mt-1 text-xs text-red-600">{errors.contact_no.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-emerald-800">Customer address *</label>
                <textarea
                  {...register("customer_address")}
                  rows={4}
                  placeholder="House/Plot, area, city, state, pin code"
                  className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
                {errors.customer_address && (
                  <p className="mt-1 text-xs text-red-600">{errors.customer_address.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                2. Products
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(true)}
                  className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                >
                  + Add company
                </button>
                <button
                  type="button"
                  onClick={addProductSameCompany}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  + Add product
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="hidden grid-cols-6 gap-2 rounded-lg border border-emerald-100 bg-emerald-100/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 md:grid">
                <div>Company</div>
                <div>Product</div>
                <div>Unit price</div>
                <div>Quantity</div>
                <div>Line total</div>
                <div className="text-right">Action</div>
              </div>
              {fields.map((field, index) => {
                const rowCompanyId = lineItemsWatched[index]?.company_id ?? "";
                const rowProducts = rowCompanyId ? productsByCompany[rowCompanyId] ?? [] : [];
                const regCo = register(`line_items.${index}.company_id` as const);
                const rowUnit = Number(lineItemsWatched[index]?.unit_price ?? 0);
                const rowQty = Number(lineItemsWatched[index]?.quantity ?? 1);
                const rowLineTotal = quotationLineAmount(rowUnit, rowQty);
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border border-emerald-100 bg-white p-3 ring-1 ring-emerald-100"
                  >
                    <div className="grid gap-2 md:grid-cols-6">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase text-emerald-700 md:hidden">
                          Company
                        </label>
                        <select
                          {...regCo}
                          className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          onChange={(e) => {
                            void regCo.onChange(e);
                            setValue(`line_items.${index}.product_id`, "", { shouldValidate: true });
                            void fetchProductsForCompany(e.target.value);
                          }}
                        >
                          <option value="">Select company</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {errors.line_items?.[index]?.company_id && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.line_items[index]?.company_id?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase text-emerald-700 md:hidden">
                          Product
                        </label>
                        <select
                          {...register(`line_items.${index}.product_id` as const)}
                          disabled={!rowCompanyId}
                          className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 disabled:bg-emerald-50"
                        >
                          <option value="">
                            {rowCompanyId ? "Select product" : "Select company first"}
                          </option>
                          {rowProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {errors.line_items?.[index]?.product_id && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.line_items[index]?.product_id?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase text-emerald-700 md:hidden">
                          Unit price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`line_items.${index}.unit_price` as const)}
                          className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                        {errors.line_items?.[index]?.unit_price && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.line_items[index]?.unit_price?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase text-emerald-700 md:hidden">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min={0.001}
                          {...register(`line_items.${index}.quantity` as const)}
                          className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                        {errors.line_items?.[index]?.quantity && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.line_items[index]?.quantity?.message}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-800 md:mt-1">
                        <span className="mr-2 text-[11px] uppercase text-emerald-700 md:hidden">Line total</span>
                        {formatInr(rowLineTotal)}
                      </div>
                      <div className="flex items-center justify-end md:mt-1">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.line_items && typeof errors.line_items.message === "string" && (
              <p className="mt-2 text-xs text-red-600">{errors.line_items.message}</p>
            )}
          </section>

          <section className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              3. Other costs
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["labour_cost", "Labour cost"],
                  ["rcc", "RCC"],
                  ["cement", "Cement"],
                  ["reti", "Reti"],
                  ["gitti", "Gitti"],
                  ["transport", "Transport"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-emerald-800">{label} (Cost INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(key)}
                    className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                  />
                  {errors[key] && (
                    <p className="mt-1 text-xs text-red-600">{errors[key]?.message as string}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              4. Discount &amp; amount summary
            </h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-emerald-800">Discount (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  {...register("discount")}
                  className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                />
                {errors.discount && (
                  <p className="mt-1 text-xs text-red-600">{errors.discount.message}</p>
                )}
                <p className="mt-1 text-xs text-emerald-700">Applied only to product subtotal.</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-100/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Live breakdown</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-emerald-700">Product subtotal</dt>
                    <dd className="tabular-nums font-medium text-emerald-800">{formatInr(productSubtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-red-700">
                    <dt>
                      Discount ({discountPercentLive}%)
                    </dt>
                    <dd className="tabular-nums font-medium">-{formatInr(discountAmountLive)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-emerald-100 pt-2">
                    <dt className="text-emerald-700">Products after discount</dt>
                    <dd className="tabular-nums font-semibold text-emerald-800">
                      {formatInr(productsAfterDiscount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-emerald-700">Other costs</dt>
                    <dd className="tabular-nums font-medium text-emerald-800">{formatInr(otherCostsTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-lg bg-emerald-600 px-3 py-3 text-white">
                    <dt className="font-semibold">Grand total</dt>
                    <dd className="tabular-nums text-lg font-bold">{formatInr(total)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {mode === "create" ? "Preview & Save quotation" : "Preview & Update quotation"}
            </button>
          </div>
        </div>
      </form>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-emerald-900/50 p-4 md:p-8">
          <div className="w-full max-w-4xl rounded-xl bg-white p-4 shadow-2xl md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-emerald-800">Preview before save</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg border border-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  Back to edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmSave()}
                  disabled={savingFromPreview}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingFromPreview
                    ? "Saving..."
                    : mode === "create"
                      ? "Confirm & Save"
                      : "Confirm & Update"}
                </button>
              </div>
            </div>
            <QuotationPreview data={previewData} />
          </div>
        </div>
      )}

      <AddCompanyModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onCreated={() => {
          void loadCompanies();
        }}
      />
    </div>
  );
}






