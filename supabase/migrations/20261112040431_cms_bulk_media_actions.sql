alter table public.cms_assets add column deletion_pending boolean not null default false;

-- Lock the selected display images and their originals before checking links.
create function private.lock_cms_media(target_ids uuid[], check_references boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not private.is_cms_owner() then
    raise exception 'Owner access is required' using errcode = '42501';
  end if;

  perform 1 from public.cms_assets a
    where a.id = any(target_ids) or a.id in (
      select m.original_asset_id from public.cms_assets m where m.id = any(target_ids)
    )
    order by a.id for update;

  if check_references and (
    exists (select 1 from public.cms_document_assets where asset_id = any(target_ids))
    or exists (select 1 from public.cms_publication_assets where asset_id = any(target_ids))
  ) then
    raise exception 'Remove this image from its content before archiving or deleting'
      using errcode = '23503';
  end if;
end;
$$;
revoke all on function private.lock_cms_media(uuid[], boolean) from public, anon, authenticated;
grant execute on function private.lock_cms_media(uuid[], boolean) to authenticated;

-- A draft or publication cannot attach an image during archive or deletion.
create function private.require_active_cms_media()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.cms_assets a
    where a.id = new.asset_id and a.archived_at is null and not a.deletion_pending
    for share;
  if not found then raise exception 'Choose an active image'; end if;
  return new;
end;
$$;
revoke all on function private.require_active_cms_media() from public, anon, authenticated;

create trigger cms_document_assets_require_active
  before insert or update of asset_id on public.cms_document_assets
  for each row execute function private.require_active_cms_media();
create trigger cms_publication_assets_require_active
  before insert or update of asset_id on public.cms_publication_assets
  for each row execute function private.require_active_cms_media();

create function public.archive_cms_assets(target_ids uuid[], restore boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.lock_cms_media(target_ids, not restore);
  if exists (select 1 from public.cms_assets a where a.id = any(target_ids) and a.deletion_pending) then
    raise exception 'Finish deleting pending images before changing their archive status';
  end if;

  update public.cms_assets a
    set archived_at = case when restore then null else coalesce(a.archived_at, now()) end
    where a.id = any(target_ids) and a.bucket_id = 'portfolio-media';

  update public.cms_assets a
    set archived_at = case when restore then null else coalesce(a.archived_at, now()) end
    where a.bucket_id = 'portfolio-originals'
      and a.id in (
        select m.original_asset_id from public.cms_assets m
        where m.id = any(target_ids) and m.bucket_id = 'portfolio-media'
      )
      and not a.deletion_pending
      and (restore or not exists (
        select 1 from public.cms_assets m
        where m.original_asset_id = a.id and m.archived_at is null and not m.deletion_pending
      ));
end;
$$;
revoke all on function public.archive_cms_assets(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.archive_cms_assets(uuid[], boolean) to authenticated;

create or replace function public.archive_cms_asset(target_id uuid, restore boolean default false)
returns void language sql security invoker set search_path = '' as $$
  select public.archive_cms_assets(array[target_id], restore);
$$;

-- Keep the metadata until the Storage API confirms the files are gone.
create function public.prepare_cms_asset_deletion(target_ids uuid[])
returns table(bucket_id text, object_path text)
language plpgsql security invoker set search_path = '' as $$
declare original_ids uuid[];
begin
  perform private.lock_cms_media(target_ids, true);
  select array_agg(a.original_asset_id) into original_ids from public.cms_assets a
    where a.id = any(target_ids) and a.bucket_id = 'portfolio-media';

  update public.cms_assets a set deletion_pending = true
    where a.id = any(target_ids) and a.bucket_id = 'portfolio-media' and not a.deletion_pending;
  update public.cms_assets a set deletion_pending = true
    where a.id = any(original_ids) and a.bucket_id = 'portfolio-originals' and not a.deletion_pending
      and not exists (
        select 1 from public.cms_assets m where m.original_asset_id = a.id and not m.deletion_pending
      );

  return query select a.bucket_id, a.object_path from public.cms_assets a
    where a.deletion_pending and (
      (a.id = any(target_ids) and a.bucket_id = 'portfolio-media')
      or (a.id = any(original_ids) and a.bucket_id = 'portfolio-originals')
    );
end;
$$;
revoke all on function public.prepare_cms_asset_deletion(uuid[]) from public, anon, authenticated;
grant execute on function public.prepare_cms_asset_deletion(uuid[]) to authenticated;

create function public.complete_cms_asset_deletion(target_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare original_ids uuid[];
begin
  perform private.lock_cms_media(target_ids, true);
  select array_agg(a.original_asset_id) into original_ids from public.cms_assets a
    where a.id = any(target_ids) and a.bucket_id = 'portfolio-media' and a.deletion_pending;

  if exists (
    select 1 from public.cms_assets a join storage.objects o
      on o.bucket_id = a.bucket_id and o.name = a.object_path
    where a.deletion_pending and (
      (a.id = any(target_ids) and a.bucket_id = 'portfolio-media')
      or (a.id = any(original_ids) and a.bucket_id = 'portfolio-originals')
    )
  ) then
    raise exception 'Some files are still in storage. Try Delete again to finish.';
  end if;

  delete from public.cms_assets a
    where a.id = any(target_ids) and a.bucket_id = 'portfolio-media' and a.deletion_pending;
  delete from public.cms_assets a
    where a.id = any(original_ids) and a.bucket_id = 'portfolio-originals' and a.deletion_pending
      and not exists (select 1 from public.cms_assets m where m.original_asset_id = a.id);
end;
$$;
revoke all on function public.complete_cms_asset_deletion(uuid[]) from public, anon, authenticated;
grant execute on function public.complete_cms_asset_deletion(uuid[]) to authenticated;

-- Unregistered uploads can still be cleaned up after an upload error.
drop policy cms_owner_delete_unpublished on storage.objects;
create policy cms_owner_delete_unpublished on storage.objects for delete to authenticated
using (
  bucket_id in ('portfolio-originals', 'portfolio-media')
  and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text
  and not exists (
    select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name
  )
  and not exists (
    select 1 from public.cms_assets a
    where a.bucket_id = objects.bucket_id and a.object_path = objects.name and not a.deletion_pending
  )
);
