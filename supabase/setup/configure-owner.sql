-- Privileged, one-time project setup; never run from a browser or expose as RPC.
-- This reserves the email without creating a user, choosing a password, or
-- granting access before email verification and TOTP enrollment.
do $$
begin
  if exists (select 1 from private.cms_owner where user_id is not null) then
    raise exception 'An owner is already bound; do not overwrite the binding';
  end if;
  update private.cms_owner
    set expected_email = 'emanuel.nicholas.nm@gmail.com', updated_at = now()
    where singleton;
end;
$$;
