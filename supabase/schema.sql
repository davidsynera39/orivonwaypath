-- Waypath schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- auth.users is managed by Supabase Auth; everything below hangs off it.

create extension if not exists "uuid-ossp";

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  theme text not null default 'light',
  notifications_enabled boolean not null default true,
  weekly_checkins_enabled boolean not null default true,
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- businesses ----------
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  industry text default '',
  business_type text default 'other',
  website text default '',
  start_date date default current_date,
  current_status text default 'idea',
  current_stage_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- business_stages ----------
create table if not exists business_stages (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table businesses
  add constraint fk_current_stage foreign key (current_stage_id)
  references business_stages(id) on delete set null;

-- ---------- milestones ----------
create table if not exists milestones (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  stage_id uuid references business_stages(id) on delete cascade,
  title text not null,
  notes text default '',
  done boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- goals ----------
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  description text default '',
  kind text not null default 'short-term',
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed','paused','cancelled')),
  progress int not null default 0 check (progress between 0 and 100),
  deadline date,
  notes text default '',
  created_at timestamptz not null default now()
);

-- ---------- journal_entries ----------
create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text default 'Untitled entry',
  content text not null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- ---------- timeline_events ----------
create table if not exists timeline_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  text text not null,
  source text not null default 'manual' check (source in ('manual', 'auto')),
  created_at timestamptz not null default now()
);

-- ---------- weekly_checkins ----------
create table if not exists weekly_checkins (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  accomplished text default '',
  not_done text default '',
  problems text default '',
  next_week text default '',
  applied_suggestions jsonb default '[]',
  created_at timestamptz not null default now()
);

-- ---------- ai_conversations / ai_messages ----------
create table if not exists ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- notifications ----------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- subscriptions (stub until Stripe is wired) ----------
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- grants ----------
-- Tracks grant opportunities for a business, whether AI-suggested or added
-- manually. AI suggestions are not written here until the user clicks
-- "Save" (see app/api/grants/suggest, which returns candidates without
-- persisting them) — this table only ever holds grants the person chose to
-- track, the same "AI proposes, user approves" pattern used for weekly
-- check-in suggestions.
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
create policy "own grants" on grants
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));
create index if not exists idx_grants_business on grants(business_id);

-- ---------- spreadsheets ----------
-- A lightweight, flexible-schema spreadsheet founders use to catalog
-- anything (inventory, suppliers, contacts, expenses, equipment...).
-- Columns are user-defined, so row data is stored as JSONB keyed by column
-- id rather than as real SQL columns — this avoids ALTER TABLE churn every
-- time someone adds or removes a column in the UI.
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
  options jsonb default '[]',  -- array of strings, used when type = 'select'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists spreadsheet_rows (
  id uuid primary key default uuid_generate_v4(),
  spreadsheet_id uuid not null references spreadsheets(id) on delete cascade,
  data jsonb not null default '{}',  -- { "<column_id>": value, ... }
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spreadsheets enable row level security;
alter table spreadsheet_columns enable row level security;
alter table spreadsheet_rows enable row level security;

create policy "own spreadsheets" on spreadsheets
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own spreadsheet columns" on spreadsheet_columns
  for all using (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from spreadsheets s join businesses b on b.id = s.business_id
    where s.id = spreadsheet_id and b.owner_id = auth.uid()
  ));

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

-- ---------- rate_limits ----------
-- Backs lib/rate-limit.js. A fixed-window counter per key (e.g. "ai:<user_id>").
-- Deliberately not RLS-protected the normal way — only ever touched by the
-- service-role client from server routes, never queried with the user's own session.
create table if not exists rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table rate_limits enable row level security;
-- No policies: with RLS enabled and zero policies, even the anon/authenticated
-- roles get zero rows. Only the service-role client (which bypasses RLS) can touch it.

create index if not exists idx_stages_business on business_stages(business_id);
create index if not exists idx_milestones_business on milestones(business_id);
create index if not exists idx_milestones_stage on milestones(stage_id);
create index if not exists idx_goals_business on goals(business_id);
create index if not exists idx_journal_business on journal_entries(business_id);
create index if not exists idx_timeline_business on timeline_events(business_id);

-- =========================================================
-- Row Level Security — a user can only ever touch their own
-- businesses and everything hung off them. This is what makes
-- "no user can read another user's business by guessing an id" true.
-- =========================================================

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_stages enable row level security;
alter table milestones enable row level security;
alter table goals enable row level security;
alter table journal_entries enable row level security;
alter table timeline_events enable row level security;
alter table weekly_checkins enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table notifications enable row level security;
alter table subscriptions enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own businesses" on businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Child tables: ownership is proven by joining back to businesses.owner_id.
create policy "own stages" on business_stages
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own milestones" on milestones
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own goals" on goals
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own journal" on journal_entries
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own timeline" on timeline_events
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own checkins" on weekly_checkins
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own ai conversations" on ai_conversations
  for all using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own ai messages" on ai_messages
  for all using (exists (
    select 1 from ai_conversations c join businesses b on b.id = c.business_id
    where c.id = conversation_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from ai_conversations c join businesses b on b.id = c.business_id
    where c.id = conversation_id and b.owner_id = auth.uid()
  ));

create policy "own notifications" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subscription" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomic fixed-window rate limiter used by lib/rate-limit.js. Returns true if
-- the call is allowed (and records it), false if the caller is over the limit.
-- SECURITY DEFINER + no grants to anon/authenticated means this can only be
-- reached via the service-role client, same as the rate_limits table itself.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean as $$
declare
  v_count int;
  v_window_start timestamptz;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
        then 1
      else rate_limits.count + 1
    end,
    window_start = case
      when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
        then now()
      else rate_limits.window_start
    end
  returning count into v_count;

  return v_count <= p_max;
end;
$$ language plpgsql security definer;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
