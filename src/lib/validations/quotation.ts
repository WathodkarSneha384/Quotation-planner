import { z } from "zod";

const lineItemSchema = z.object({
  company_id: z.string().min(1, "Select company").uuid("Select company"),
  product_id: z.string().min(1, "Select product").uuid("Select product"),
  unit_price: z.coerce.number().min(0),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const quotationFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_address: z.string().min(1, "Address is required"),
  contact_no: z.string().min(1, "Contact number is required"),
  line_items: z.array(lineItemSchema).min(1, "Add at least one product line"),
  labour_cost: z.coerce.number().min(0),
  rcc: z.coerce.number().min(0),
  cement: z.coerce.number().min(0),
  reti: z.coerce.number().min(0),
  gitti: z.coerce.number().min(0),
  transport: z.coerce.number().min(0),
  discount: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
});

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
export type QuotationLineItemFormValue = z.infer<typeof lineItemSchema>;

export const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  products: z
    .array(z.object({ name: z.string().min(1, "Product name required") }))
    .min(1, "Add at least one product"),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
