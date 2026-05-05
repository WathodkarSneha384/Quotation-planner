alter table public.quotations
  add column if not exists product_price numeric(14,2) not null default 0,
  add column if not exists discount numeric(14,2) not null default 0;

update public.quotations
set
  product_price = coalesce(product_price, 0),
  discount = coalesce(discount, 0)
where product_price is null or discount is null;
