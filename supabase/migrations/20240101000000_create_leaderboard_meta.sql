-- Create leaderboard_meta table to track reset dates
create table if not exists public.leaderboard_meta (
  id uuid primary key default uuid_generate_v4(),
  next_reset timestamp with time zone not null,
  last_reset timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set RLS policies for leaderboard_meta
alter table public.leaderboard_meta enable row level security;

-- Allow authenticated users to read leaderboard_meta
create policy "Allow authenticated users to read leaderboard_meta"
  on public.leaderboard_meta
  for select
  to authenticated
  using (true);

-- Only allow service role to update leaderboard_meta
create policy "Only service role can update leaderboard_meta"
  on public.leaderboard_meta
  for all
  to service_role
  using (true);

-- Insert initial leaderboard_meta record with next reset date
-- Calculate the next Monday two weeks from now
insert into public.leaderboard_meta (next_reset)
select
  case
    -- If today is Monday, set next_reset to two weeks from today
    when extract(dow from now()) = 1 then (now() + interval '14 days')::date
    -- Otherwise, find the next Monday and add one more week
    else (now() + interval '1 day' * (8 - extract(dow from now()) + 7))::date
  end;