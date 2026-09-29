-- Applied 2026-09-29 to the DREAM ONLINE project (nmwxzciaapguzqjynena) as migration rls_hygiene_2026_09_29.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.update_updated_at_column() set search_path = pg_catalog, public;
drop policy if exists paperclip_agent_state_service_only on public.paperclip_agent_state;
create policy paperclip_agent_state_service_only on public.paperclip_agent_state
  for all using (false) with check (false);
