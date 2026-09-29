-- Narrow current_owner_attestation to the server. Found by Lovable.
--
-- As granted, an anonymous caller holding an owner's internal UUID could read that
-- owner's assurance level and verification date. No personal data, and those UUIDs
-- are not published — so low severity, but it is avoidable surface that buys us
-- nothing.
--
-- Nothing breaks. The only caller is verify_agent, which is SECURITY DEFINER and
-- therefore executes this function with the definer's privileges rather than the
-- caller's. Public verification is unaffected; the lookup simply stops being
-- independently callable.
--
-- The general rule, now twice learned in this project: grant execute to `anon`
-- only where an anonymous caller genuinely needs it. record_signed_action was the
-- expensive version of this lesson.

revoke execute on function public.current_owner_attestation(uuid) from public;
revoke execute on function public.current_owner_attestation(uuid) from anon;
revoke execute on function public.current_owner_attestation(uuid) from authenticated;
grant  execute on function public.current_owner_attestation(uuid) to service_role;

comment on function public.current_owner_attestation(uuid) is
  'Resolves an owner''s live attestation. service_role only — reached through verify_agent, which is SECURITY DEFINER. Not callable by anon: holding an owner UUID should not reveal their verification standing.';
