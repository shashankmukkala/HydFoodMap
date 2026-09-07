-- Lets the 5-slot map rail (components/AdRail.tsx) tell a visitor *when*
-- a full slot opens up, not just that it's full — previously billboards
-- carried no campaign duration at all (that only existed on ad_enquiries,
-- a separate table with no link back to the billboard an approved
-- enquiry becomes), so there was no way to answer "when's the next slot
-- available" for real.
alter table public.billboards add column if not exists campaign_end date;
