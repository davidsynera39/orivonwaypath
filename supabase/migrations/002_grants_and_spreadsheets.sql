-- Safe to run any number of times. Adds the grants and spreadsheets tables
-- without touching anything that already exists. (Postgres has no
-- "create policy if not exists", so each policy is dropped first.)
-- Requires the base tables from schema.sql (businesses) to exist already.

-- ---------- grants ----------
create table if not exists grants (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  organization text default '',
  description text default '',
  fit_reason text default '',
  amount_range text default '',
  category text default '',
  official_url text default '',
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'awarded', 'rejected', 'archived')),
  source text not null default 'ai' check (source in ('ai', 'manual')),
  notes text default '',
  deadline date,
  created_at timestamptz not null default now()
);
alter table grants enable row level security;
drop policy if exists "own grants" on grants;
create policy "own grants" on grants
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));
create index if not exists idx_grants_business on grants(business_id);

-- ---------- spreadsheets ----------
create table if not exists spreadsheets (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists spreadsheet_columns (
  id uuid primary key default uuid_generate_v4(),
  spreadsheet_id uuid not null references spreadsheets(id) on delete cascade,
  name text not null,
  type text not null default 'text' check (type in ('text', 'number', 'date', 'checkbox', 'select')),
  options jsonb default '[]',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists spreadsheet_rows (
  id uuid primary key default uuid_generate_v4(),
  spreadsheet_id uuid not null references spreadsheets(id) on delete cascade,
  data jsonb not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spreadsheets enable row level security;
alter table spreadsheet_columns enable row level security;
alter table spreadsheet_rows enable row level security;

drop policy if exists "own spreadsheets" on spreadsheets;
create policy "own spreadsheets" on spreadsheets
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

drop policy if exists "own spreadsheet columns" on spreadsheet_columns;
create policy "own spreadsheet columns" on spreadsheet_columns
  for all using (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ));

drop policy if exists "own spreadsheet rows" on spreadsheet_rows;
create policy "own spreadsheet rows" on spreadsheet_rows
  for all using (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ));

create index if not exists idx_spreadsheets_business on spreadsheets(business_id);
create index if not exists idx_spreadsheet_columns_sheet on spreadsheet_columns(spreadsheet_id);
create index if not exists idx_spreadsheet_rows_sheet on spreadsheet_rows(spreadsheet_id);
