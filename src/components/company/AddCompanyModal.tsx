"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { companyFormSchema, type CompanyFormValues } from "@/lib/validations/quotation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AddCompanyModal({ open, onClose, onCreated }: Props) {
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: { name: "", products: [{ name: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "products" });

  async function onSubmit(values: CompanyFormValues) {
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .insert({ name: values.name.trim() })
      .select("id")
      .single();

    if (cErr || !company) {
      toast.error(cErr?.message ?? "Could not create company");
      return;
    }

    const fileInput = document.getElementById("company-logo-input") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    let logoStoragePath: string | null = null;

    if (file) {
      logoStoragePath = `${company.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uErr } = await supabase.storage.from("company-logos").upload(logoStoragePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (uErr) {
        toast.error(uErr.message);
        await supabase.from("companies").delete().eq("id", company.id);
        return;
      }
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(logoStoragePath);
      await supabase.from("companies").update({ logo_url: pub.publicUrl }).eq("id", company.id);
    }

    const productRows = values.products.map((p) => ({
      company_id: company.id,
      name: p.name.trim(),
    }));

    const { error: pErr } = await supabase.from("products").insert(productRows);
    if (pErr) {
      if (logoStoragePath) {
        await supabase.storage.from("company-logos").remove([logoStoragePath]);
      }
      await supabase.from("companies").delete().eq("id", company.id);
      toast.error(pErr.message);
      return;
    }

    toast.success("Company added");
    reset({ name: "", products: [{ name: "" }] });
    if (fileInput) fileInput.value = "";
    onCreated();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Add company</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm font-medium text-slate-700">Company name</label>
            <input
              {...register("name")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="company-logo-input">
              Logo (optional)
            </label>
            <input
              id="company-logo-input"
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Products</label>
              <button
                type="button"
                onClick={() => append({ name: "" })}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                + Add product
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`products.${index}.name` as const)}
                    placeholder={`Product ${index + 1}`}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-md border border-slate-200 px-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.products?.root?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.products.root.message}</p>
            )}
            {errors.products && typeof errors.products.message === "string" && (
              <p className="mt-1 text-xs text-red-600">{errors.products.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
