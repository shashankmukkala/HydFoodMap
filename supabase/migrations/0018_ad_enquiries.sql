create table if not exists public.ad_enquiries (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null check (char_length(brand_name) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 160),
  image_url text,
  target_url text,
  campaign_start date,
  campaign_end date,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.ad_enquiries enable row level security;

create policy "Anyone can submit ad enquiries"
  on public.ad_enquiries for insert
  with check (status = 'pending');
