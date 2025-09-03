-- Create the results table
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  score integer not null,
  total_questions integer not null,
  time_spent integer,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.results enable row level security;

-- Allow users to insert their own results
create policy "Users can insert their own results"
on public.results
for insert
with check (auth.uid() = user_id);

-- Allow users to select (read) their own results
create policy "Users can select their own results"
on public.results
for select
using (auth.uid() = user_id);

-- Allow users to update their own results (optional)
create policy "Users can update their own results"
on public.results
for update
using (auth.uid() = user_id);

-- Allow users to delete their own results (optional)
create policy "Users can delete their own results"
on public.results
for delete
using (auth.uid() = user_id);
