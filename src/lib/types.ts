export type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  company_id: string;
  name: string;
};

export type QuotationLineItem = {
  id: string;
  quotation_id: string;
  company_id: string;
  product_id: string;
  unit_price: number;
  quantity: number;
  sort_order: number;
  created_at?: string;
};

export type Quotation = {
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
  /** Percentage 0–100 */
  discount: number;
  total: number;
  created_at: string;
};

export type QuotationRow = Quotation & {
  companies: Pick<Company, "id" | "name" | "logo_url"> | null;
};

export type QuotationLinePreview = {
  companyName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type QuotationPreviewModel = {
  quotationNumber: string | null;
  customerName: string;
  customerAddress: string;
  contactNo: string;
  headerCompanyName: string;
  headerCompanyLogoUrl: string | null;
  allSuppliersSame: boolean;
  lineItems: QuotationLinePreview[];
  discountPercent: number;
  labourCost: number;
  rcc: number;
  cement: number;
  reti: number;
  gitti: number;
  transport: number;
  total: number;
  dateLabel: string;
};
