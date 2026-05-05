-- Quotation system — run once in Supabase SQL editor (or supabase db push)

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  unique (company_id, name)
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text unique,
  customer_name text not null,
  customer_address text not null default '',
  contact_no text not null default '',
  company_id uuid not null references public.companies (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  product_price numeric(14,2) not null default 0,
  labour_cost numeric(14,2) not null default 0,
  rcc numeric(14,2) not null default 0,
  cement numeric(14,2) not null default 0,
  reti numeric(14,2) not null default 0,
  gitti numeric(14,2) not null default 0,
  transport numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  unit_price numeric(14,2) not null default 0,
  quantity numeric(14,3) not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotation_items_quotation on public.quotation_items (quotation_id);
create index if not exists idx_quotation_items_company on public.quotation_items (company_id);

create index if not exists idx_products_company on public.products (company_id);
create index if not exists idx_quotations_company on public.quotations (company_id);
create index if not exists idx_quotations_created on public.quotations (created_at desc);

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

alter table public.companies enable row level security;
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

drop policy if exists "quotation_items_select" on public.quotation_items;
drop policy if exists "quotation_items_insert" on public.quotation_items;
drop policy if exists "quotation_items_update" on public.quotation_items;
drop policy if exists "quotation_items_delete" on public.quotation_items;
create policy "quotation_items_select" on public.quotation_items for select using (true);
create policy "quotation_items_insert" on public.quotation_items for insert with check (true);
create policy "quotation_items_update" on public.quotation_items for update using (true);
create policy "quotation_items_delete" on public.quotation_items for delete using (true);

drop policy if exists "companies_select" on public.companies;
drop policy if exists "companies_insert" on public.companies;
drop policy if exists "companies_update" on public.companies;
drop policy if exists "companies_delete" on public.companies;
create policy "companies_select" on public.companies for select using (true);
create policy "companies_insert" on public.companies for insert with check (true);
create policy "companies_update" on public.companies for update using (true);
create policy "companies_delete" on public.companies for delete using (true);

drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;
create policy "products_select" on public.products for select using (true);
create policy "products_insert" on public.products for insert with check (true);
create policy "products_update" on public.products for update using (true);
create policy "products_delete" on public.products for delete using (true);

drop policy if exists "quotations_select" on public.quotations;
drop policy if exists "quotations_insert" on public.quotations;
drop policy if exists "quotations_update" on public.quotations;
drop policy if exists "quotations_delete" on public.quotations;
create policy "quotations_select" on public.quotations for select using (true);
create policy "quotations_insert" on public.quotations for insert with check (true);
create policy "quotations_update" on public.quotations for update using (true);
create policy "quotations_delete" on public.quotations for delete using (true);

drop policy if exists "logos_public_read" on storage.objects;
drop policy if exists "logos_insert" on storage.objects;
drop policy if exists "logos_update" on storage.objects;
drop policy if exists "logos_delete" on storage.objects;
create policy "logos_public_read" on storage.objects for select using (bucket_id = 'company-logos');
create policy "logos_insert" on storage.objects for insert with check (bucket_id = 'company-logos');
create policy "logos_update" on storage.objects for update using (bucket_id = 'company-logos');
create policy "logos_delete" on storage.objects for delete using (bucket_id = 'company-logos');

-- Seed companies
insert into public.companies (name) values
  ('1 Fence'),
  ('Simo Wirotek Pvt Ltd'),
  ('TATA Wiron')
on conflict (name) do nothing;

-- Seed products for 1 Fence
insert into public.products (company_id, name)
select c.id, v.name
from public.companies c
cross join (values
  ('DuraKnot Fence 4 FT 48"-13/30 MTR'),
  ('DuraKnot Fence 5 FT 60"-15/30 MTR'),
  ('DuraKnot Fence 6 FT 72"-17/30 MTR'),
  ('DuraKnot Fence 4 FT 48"-13/50 MTR'),
  ('DuraKnot Fence 5 FT 60"-15/50 MTR'),
  ('DuraKnot Fence 6 FT 72"-17/50 MTR'),
  ('A-1 Suraksha GI Barbed Wire')
) as v(name)
where c.name = '1 Fence'
on conflict (company_id, name) do nothing;

-- Simo Wirotek Pvt Ltd
insert into public.products (company_id, name)
select c.id, v.name
from public.companies c
cross join (values
  ('Fixed Knot Fence PI'),
  ('Fixed Knot Fence ZETA'),
  ('Fixed Knot Fence ALFA'),
  ('A-1 SURKSHA SMART 1.7/1.6 MM -200 MTR')
) as v(name)
where c.name = 'Simo Wirotek Pvt Ltd'
on conflict (company_id, name) do nothing;

-- TATA Wiron
insert into public.products (company_id, name)
select c.id, v.name
from public.companies c
cross join (values
  ('Angle 50x50x5 MAIN'),
  ('SUPPORT'),
  ('REGULAR'),
  ('TATA STAMBH')
) as v(name)
where c.name = 'TATA Wiron'
on conflict (company_id, name) do nothing;
