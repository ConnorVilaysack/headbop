-- headbop songs table (no RLS policies yet by request)
create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  subject text not null,
  key_points text not null,
  style text not null,
  artist_inspiration text null,
  prompt text not null,
  lyrics text null,
  audio_url text null,
  stream_audio_url text null,
  audio_id text null,
  image_url text null,
  duration double precision null,
  task_id text unique null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_user_created_idx on public.songs (user_id, created_at desc);
create index if not exists songs_user_task_idx on public.songs (user_id, task_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

-- Stripe billing (no RLS policies yet by request)
create table if not exists public.billing_customers (
  user_id uuid primary key,
  stripe_customer_id text unique null,
  stripe_subscription_id text unique null,
  subscription_status text null,
  price_id text null,
  trial_end timestamptz null,
  current_period_end timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_customers_status_idx on public.billing_customers (subscription_status);

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row
execute function public.set_updated_at();

