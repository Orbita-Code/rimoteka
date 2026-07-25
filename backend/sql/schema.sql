-- Rimoteka Pro — Supabase šema
-- Pokrenuti u Supabase → SQL Editor.
--
-- Napomena o bezbednosti: obe tabele imaju RLS uključen BEZ ijedne policy-je.
-- To znači da im anon/authenticated ključ NE MOŽE pristupiti — samo backend
-- preko service_role ključa (koji zaobilazi RLS). Pro status se nikad ne čita
-- direktno iz browsera, uvek kroz /api/status.

create table if not exists public.pro_users (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  -- active | trialing | past_due | canceled | inactive
  status                 text not null default 'inactive',
  plan                   text,              -- 'monthly' | 'yearly'
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists pro_users_customer_idx
  on public.pro_users (stripe_customer_id);

-- Idempotencija webhook-a: Stripe ume da isporuči isti event više puta
-- (retry posle timeout-a). Bez ovoga bi se ista pretplata obradila dvaput.
create table if not exists public.stripe_events (
  id           text primary key,   -- Stripe event.id, npr. evt_1Abc...
  type         text not null,
  processed_at timestamptz not null default now()
);

-- Automatsko osvežavanje updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pro_users_touch_updated_at on public.pro_users;
create trigger pro_users_touch_updated_at
  before update on public.pro_users
  for each row execute function public.touch_updated_at();

alter table public.pro_users    enable row level security;
alter table public.stripe_events enable row level security;
