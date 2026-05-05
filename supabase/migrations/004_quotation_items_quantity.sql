-- Per-line quantity: line amount = unit_price * quantity

alter table public.quotation_items
  add column if not exists quantity numeric(14,3) not null default 1;

comment on column public.quotation_items.quantity is 'Quantity for this line; amount = unit_price * quantity';
