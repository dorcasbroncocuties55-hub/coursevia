-- AUTH / UPSERT CONFLICT SAFETY
-- Run this in Supabase SQL editor

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_user_id_key'
  ) then
    alter table public.profiles
    add constraint profiles_user_id_key unique (user_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_roles_user_id_role_key'
  ) then
    alter table public.user_roles
    add constraint user_roles_user_id_role_key unique (user_id, role);
  end if;
end $$;
