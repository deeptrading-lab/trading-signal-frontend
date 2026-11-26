-- Preserve existing asset history; allow server-derived browser identities without a Google profile.
begin;
alter table public.program_paper_asset_events
  drop constraint if exists program_paper_asset_events_owner_sub_fkey;
commit;
