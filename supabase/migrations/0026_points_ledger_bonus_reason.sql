-- Admins can now award bonus points to a user from /admin/users
-- (app/api/admin/users/[userId]/bonus-points), separate from the
-- automatic 'review' reward in lib/usePoints.ts. Extends 0025's reason
-- check rather than replacing it wholesale, same "find by inspecting
-- pg_constraint" approach since the name isn't guaranteed.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.points_ledger'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.points_ledger drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.points_ledger add constraint points_ledger_reason_check check (reason in ('review', 'bonus'));
