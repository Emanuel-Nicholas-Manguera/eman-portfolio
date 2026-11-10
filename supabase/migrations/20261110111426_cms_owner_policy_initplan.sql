-- Cache the JWT function result once per statement, including on the owner row.
alter policy owner_can_read_own_binding on private.cms_owner
  using (
    enabled and user_id = (select auth.uid())
    and ((select auth.jwt())->>'aal') = 'aal2'
  );
