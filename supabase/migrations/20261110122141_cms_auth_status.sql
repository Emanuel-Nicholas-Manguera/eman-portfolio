-- A narrow, read-only bootstrap check. Authenticated users can learn only their
-- own sign-in step; the owner registry and auth.users remain private.
create function private.cms_auth_status()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  config private.cms_owner%rowtype;
  account auth.users%rowtype;
  has_totp boolean;
begin
  if caller_id is null then return 'denied'; end if;
  select * into config from private.cms_owner where singleton;
  if not found or not config.enabled then return 'denied'; end if;
  select * into account from auth.users where id = caller_id;
  if not found or account.email_confirmed_at is null
    or coalesce(account.is_anonymous, false) or account.deleted_at is not null
    or account.banned_until > now() then return 'denied'; end if;
  if config.user_id is not null then
    if config.user_id <> caller_id then return 'denied'; end if;
  elsif config.expected_email is null or lower(account.email) is distinct from config.expected_email then
    return 'denied';
  end if;
  select exists (select 1 from auth.mfa_factors
    where user_id = caller_id and factor_type = 'totp' and status = 'verified') into has_totp;
  if not has_totp then return 'enroll'; end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then return 'verify'; end if;
  if config.user_id is null then return 'pending'; end if;
  return 'ready';
end;
$$;
revoke all on function private.cms_auth_status() from public, anon, authenticated;
grant execute on function private.cms_auth_status() to authenticated;

create function public.cms_auth_status()
returns text language sql stable security invoker set search_path = ''
as $$ select private.cms_auth_status(); $$;
revoke all on function public.cms_auth_status() from public, anon, authenticated;
grant execute on function public.cms_auth_status() to authenticated;
