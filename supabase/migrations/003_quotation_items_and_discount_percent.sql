-- Line items (multiple products / multiple companies per quotation)
-- discount column on quotations = percentage (0–100), not a fixed INR amount

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  unit_price numeric(14,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotation_items_quotation on public.quotation_items (quotation_id);
create index if not exists idx_quotation_items_company on public.quotation_items (company_id);

alter table public.quotation_items enable row level security;

drop policy if exists "quotation_items_select" on public.quotation_items;
drop policy if exists "quotation_items_insert" on public.quotation_items;
drop policy if exists "quotation_items_update" on public.quotation_items;
drop policy if exists "quotation_items_delete" on public.quotation_items;

create policy "quotation_items_select" on public.quotation_items for select using (true);
create policy "quotation_items_insert" on public.quotation_items for insert with check (true);
create policy "quotation_items_update" on public.quotation_items for update using (true);
create policy "quotation_items_delete" on public.quotation_items for delete using (true);

-- Backfill from legacy single product columns (one row per quotation)
insert into public.quotation_items (quotation_id, company_id, product_id, unit_price, sort_order)
select
  q.id,
  q.company_id,
  q.product_id,
  coalesce(q.product_price, 0),
  0
from public.quotations q
where q.product_id is not null
  and not exists (
    select 1 from public.quotation_items i where i.quotation_id = q.id
  );

comment on column public.quotations.discount is 'Discount percentage (0–100), applied to subtotal after line items + cost fields';
