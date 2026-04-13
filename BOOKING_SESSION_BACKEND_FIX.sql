-- =========================================================
-- COURSEVIA BOOKING + SESSION BACKEND FIX
-- =========================================================
-- This migration aligns the database with the current frontend booking flow.
-- It supports coach + therapist bookings, stores provider_id, and ensures
-- session room / open / end times exist for reliable "Join Session" behavior.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) Ensure bookings table has the columns the frontend/backend use
-- ---------------------------------------------------------
alter table public.bookings
  add column if not exists provider_id uuid,
  add column if not exists therapist_id uuid,
  add column if not exists booking_type text,
  add column if not exists session_room_url text,
  add column if not exists session_opens_at timestamptz,
  add column if not exists session_ends_at timestamptz;

-- Keep older names working by standardising on scheduled_at
alter table public.bookings
  add column if not exists scheduled_at timestamptz;

-- Optional: if you had a scheduled_time column in some earlier schema, copy it over
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'scheduled_time'
  ) then
    execute '
      update public.bookings
      set scheduled_at = coalesce(scheduled_at, scheduled_time)
      where scheduled_time is not null
    ';
  end if;
exception when others then
  null;
end $$;

alter table public.bookings
  alter column duration_minutes set default 60,
  alter column status set default 'pending';

-- ---------------------------------------------------------
-- 2) Helpful indexes
-- ---------------------------------------------------------
create index if not exists bookings_learner_id_idx on public.bookings(learner_id);
create index if not exists bookings_provider_id_idx on public.bookings(provider_id);
create index if not exists bookings_coach_id_idx on public.bookings(coach_id);
create index if not exists bookings_therapist_id_idx on public.bookings(therapist_id);
create index if not exists bookings_scheduled_at_idx on public.bookings(scheduled_at);
create index if not exists bookings_status_idx on public.bookings(status);

-- ---------------------------------------------------------
-- 3) Conflict checker for scheduled sessions
-- ---------------------------------------------------------
drop function if exists public.provider_booking_conflict(uuid, timestamptz);

create function public.provider_booking_conflict(
  p_provider_id uuid,
  p_scheduled_at timestamptz
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.bookings b
    where b.provider_id = p_provider_id
      and b.status in ('pending', 'confirmed', 'in_progress')
      and b.scheduled_at is not null
      and abs(extract(epoch from (b.scheduled_at - p_scheduled_at))) < 60 * 60
  );
$$;

grant execute on function public.provider_booking_conflict(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------
-- 4) Reliable booking creation RPC
-- ---------------------------------------------------------
drop function if exists public.create_booking_and_session(
  uuid, uuid, uuid, uuid, text, timestamptz, integer, text
);

create function public.create_booking_and_session(
  p_provider_id uuid,
  p_learner_id uuid,
  p_service_id uuid default null,
  p_coach_id uuid default null,
  p_booking_type text default 'instant',
  p_scheduled_at timestamptz default null,
  p_duration_minutes integer default 60,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_room_url text;
  v_opens_at timestamptz;
  v_ends_at timestamptz;
  v_provider_is_therapist boolean := false;
  v_therapist_id uuid := null;
begin
  if p_provider_id is null then
    raise exception 'provider_id is required';
  end if;

  if p_learner_id is null then
    raise exception 'learner_id is required';
  end if;

  if p_booking_type not in ('instant', 'scheduled') then
    raise exception 'booking_type must be instant or scheduled';
  end if;

  select exists (
    select 1 from public.therapist_profiles tp where tp.user_id = p_provider_id
  ) into v_provider_is_therapist;

  if v_provider_is_therapist then
    select id into v_therapist_id
    from public.therapist_profiles
    where user_id = p_provider_id
    limit 1;
  end if;

  if p_booking_type = 'scheduled' and p_scheduled_at is null then
    raise exception 'scheduled_at is required for scheduled bookings';
  end if;

  if p_booking_type = 'instant' then
    p_scheduled_at := coalesce(p_scheduled_at, now() + interval '1 hour');
  end if;

  if public.provider_booking_conflict(p_provider_id, p_scheduled_at) then
    raise exception 'Selected time is not available';
  end if;

  insert into public.bookings (
    provider_id,
    learner_id,
    coach_id,
    therapist_id,
    service_id,
    booking_type,
    scheduled_at,
    duration_minutes,
    notes,
    status
  )
  values (
    p_provider_id,
    p_learner_id,
    p_coach_id,
    v_therapist_id,
    p_service_id,
    p_booking_type,
    p_scheduled_at,
    greatest(coalesce(p_duration_minutes, 60), 30),
    p_notes,
    'confirmed'
  )
  returning id into v_booking_id;

  v_room_url := 'https://meet.jit.si/coursevia-' || v_booking_id::text;
  v_opens_at := p_scheduled_at - interval '15 minutes';
  v_ends_at := p_scheduled_at + make_interval(mins => greatest(coalesce(p_duration_minutes, 60), 30));

  update public.bookings
  set
    meeting_url = coalesce(meeting_url, v_room_url),
    session_room_url = coalesce(session_room_url, v_room_url),
    session_opens_at = coalesce(session_opens_at, v_opens_at),
    session_ends_at = coalesce(session_ends_at, v_ends_at)
  where id = v_booking_id;

  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'meeting_url', v_room_url,
    'scheduled_at', p_scheduled_at,
    'session_opens_at', v_opens_at,
    'session_ends_at', v_ends_at
  );
end;
$$;

revoke all on function public.create_booking_and_session(
  uuid, uuid, uuid, uuid, text, timestamptz, integer, text
) from public;

grant execute on function public.create_booking_and_session(
  uuid, uuid, uuid, uuid, text, timestamptz, integer, text
) to authenticated;

-- ---------------------------------------------------------
-- 5) RLS safety: learner can create/view own bookings
-- ---------------------------------------------------------
alter table public.bookings enable row level security;

drop policy if exists "Learners can view own bookings" on public.bookings;
drop policy if exists "Learners can create own bookings" on public.bookings;
drop policy if exists "Learners can update own bookings" on public.bookings;
drop policy if exists "Providers can view assigned bookings" on public.bookings;

create policy "Learners can view own bookings"
on public.bookings
for select
to authenticated
using (auth.uid() = learner_id);

create policy "Learners can create own bookings"
on public.bookings
for insert
to authenticated
with check (auth.uid() = learner_id);

create policy "Learners can update own bookings"
on public.bookings
for update
to authenticated
using (auth.uid() = learner_id)
with check (auth.uid() = learner_id);

create policy "Providers can view assigned bookings"
on public.bookings
for select
to authenticated
using (auth.uid() = provider_id);

-- ---------------------------------------------------------
-- 6) Quick check output
-- ---------------------------------------------------------
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'bookings'
order by ordinal_position;