create table if not exists public.member_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  dose_label text not null default '',
  start_date date not null,
  end_date date,
  frequency text not null default 'As scheduled',
  time_of_day time,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_calendar_entries enable row level security;
create policy "members read own calendar" on public.member_calendar_entries for select using (auth.uid() = user_id);
create policy "members insert own calendar" on public.member_calendar_entries for insert with check (auth.uid() = user_id);
create policy "members update own calendar" on public.member_calendar_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "members delete own calendar" on public.member_calendar_entries for delete using (auth.uid() = user_id);
create index if not exists member_calendar_user_date_idx on public.member_calendar_entries(user_id,start_date);
