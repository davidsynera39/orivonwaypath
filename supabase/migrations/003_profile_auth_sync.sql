-- Shows email, verification time and last sign-in on the profiles table, and
-- keeps them in sync automatically. Safe to run any number of times.
--
-- The source of truth stays in auth.users (managed by Supabase Auth); these
-- columns are a read-only mirror so you can see them in Table Editor > public >
-- profiles. Signed-in users cannot edit the mirrored columns (guard trigger
-- below) — otherwise anyone could mark themselves "verified" via the API.

alter table profiles add column if not exists email text;
alter table profiles add column if not exists email_confirmed_at timestamptz;
alter table profiles add column if not exists last_sign_in_at timestamptz;

-- New signups: copy the auth fields into the profile at creation.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, email_confirmed_at, last_sign_in_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email, new.email_confirmed_at, new.last_sign_in_at);
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Later changes: when someone confirms their email or signs in, mirror it.
create or replace function public.sync_profile_from_auth()
returns trigger as $$
begin
  update public.profiles
     set email = new.email,
         email_confirmed_at = new.email_confirmed_at,
         last_sign_in_at = new.last_sign_in_at
   where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, email_confirmed_at, last_sign_in_at on auth.users
  for each row execute procedure public.sync_profile_from_auth();

-- Guard: only the system (dashboard SQL editor, Supabase Auth, the server's
-- service-role key) may write the mirrored columns. A signed-in user's own
-- requests run as the "authenticated" role and are rejected if they try.
create or replace function public.protect_profile_auth_columns()
returns trigger as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') then
    if tg_op = 'INSERT' then
      if new.email is not null or new.email_confirmed_at is not null or new.last_sign_in_at is not null then
        raise exception 'email, email_confirmed_at and last_sign_in_at are managed by the system';
      end if;
    elsif new.email is distinct from old.email
       or new.email_confirmed_at is distinct from old.email_confirmed_at
       or new.last_sign_in_at is distinct from old.last_sign_in_at then
      raise exception 'email, email_confirmed_at and last_sign_in_at are managed by the system';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_profile_auth_columns on public.profiles;
create trigger protect_profile_auth_columns
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_auth_columns();

-- Fill in existing users once.
update public.profiles p
   set email = u.email,
       email_confirmed_at = u.email_confirmed_at,
       last_sign_in_at = u.last_sign_in_at
  from auth.users u
 where u.id = p.id;
