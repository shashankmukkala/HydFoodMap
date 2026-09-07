alter table public.ad_enquiries
  add column if not exists payment_proof_url text;
