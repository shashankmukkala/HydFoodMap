-- Bug fix: 0031's award_repeat_visit_points() trigger inserts
-- points_ledger rows with reason = 'repeat_visit', but the reason check
-- constraint (last set in 0029) only allowed
-- ('review', 'bonus', 'welcome_bonus', 'visit', 'photo') — 'repeat_visit'
-- was never added. Every genuine return-visit log would violate this
-- constraint and fail the whole /api/cafes/[id]/log-visit request inside
-- the same transaction, even though the visit itself was legitimately
-- GPS-verified. Same "find by inspecting pg_constraint" approach as
-- every prior touch of this constraint (0025/0026/0029), since the name
-- isn't guaranteed.
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

alter table public.points_ledger add constraint points_ledger_reason_check
  check (reason in ('review', 'bonus', 'welcome_bonus', 'visit', 'photo', 'repeat_visit'));
