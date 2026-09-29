revoke execute on function public.current_owner_attestation(uuid) from public;
revoke execute on function public.current_owner_attestation(uuid) from anon;
revoke execute on function public.current_owner_attestation(uuid) from authenticated;
grant  execute on function public.current_owner_attestation(uuid) to service_role;
comment on function public.current_owner_attestation(uuid) is
  'Resolves an owner''s live attestation. service_role only — reached through verify_agent, which is SECURITY DEFINER. Not callable by anon: holding an owner UUID should not reveal their verification standing.';