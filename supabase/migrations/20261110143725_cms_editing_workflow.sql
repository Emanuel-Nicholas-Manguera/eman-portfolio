alter table public.cms_documents add column deleted_at timestamptz;
alter table public.cms_assets add column archived_at timestamptz;
alter table public.cms_assets add column original_asset_id uuid references public.cms_assets(id) on delete restrict;
create index cms_assets_original_asset on public.cms_assets(original_asset_id);

create unique index cms_singleton_content on public.cms_documents(kind) where deleted_at is null and kind in ('introduction','contact','about');

-- Save the draft and its album in one transaction. Reject stale editor tabs.
create function public.save_cms_document(
  target_id uuid, target_kind text, target_slug text, target_title text,
  target_content jsonb, target_sort_order integer, expected_updated_at timestamptz,
  target_assets uuid[] default '{}'
) returns public.cms_documents
language plpgsql security invoker set search_path = '' as $$
declare saved public.cms_documents; current_row public.cms_documents;
begin
  if not private.is_cms_owner() then raise exception 'Owner access is required' using errcode = '42501'; end if;
  if jsonb_typeof(target_content) <> 'object' then raise exception 'Content must be an object'; end if;
  if exists (select 1 from unnest(target_assets) a(id) where not exists (
    select 1 from public.cms_assets m where m.id = a.id and m.bucket_id = 'portfolio-media' and m.archived_at is null
  )) then raise exception 'Choose active, approved images'; end if;
  if target_kind in ('introduction','contact','about') and exists (
    select 1 from public.cms_documents where kind = target_kind and deleted_at is null and id <> target_id
  ) then raise exception 'This section already exists. Open it from the content list.'; end if;
  select * into current_row from public.cms_documents where id = target_id for update;
  if found then
    if current_row.updated_at is distinct from expected_updated_at then
      raise exception 'This content changed in another tab. Reopen it before saving.' using errcode = '40001';
    end if;
    if current_row.deleted_at is not null then raise exception 'Restore this content before editing'; end if;
    update public.cms_documents set kind=target_kind, slug=target_slug, title=target_title,
      content=target_content, sort_order=target_sort_order where id=target_id returning * into saved;
  else
    if expected_updated_at is not null then raise exception 'Content no longer exists'; end if;
    insert into public.cms_documents(id,kind,slug,title,content,sort_order)
      values(target_id,target_kind,target_slug,target_title,target_content,target_sort_order) returning * into saved;
  end if;
  delete from public.cms_document_assets where document_id=target_id;
  insert into public.cms_document_assets(document_id,asset_id,sort_order)
    select target_id,id,position::integer from unnest(target_assets) with ordinality a(id,position);
  return saved;
end;
$$;
revoke all on function public.save_cms_document(uuid,text,text,text,jsonb,integer,timestamptz,uuid[]) from public, anon, authenticated;
grant execute on function public.save_cms_document(uuid,text,text,text,jsonb,integer,timestamptz,uuid[]) to authenticated;

create function public.archive_cms_document(target_id uuid, restore boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not private.is_cms_owner() then raise exception 'Owner access is required' using errcode='42501'; end if;
  perform 1 from public.cms_documents where id=target_id for update;
  if not found then raise exception 'Content not found'; end if;
  if restore then
    if exists (select 1 from public.cms_documents a join public.cms_documents b on a.kind=b.kind
      where a.id=target_id and b.id<>a.id and b.deleted_at is null and a.kind in ('introduction','contact','about')) then
      raise exception 'Archive the current section before restoring this one';
    end if;
    update public.cms_documents set deleted_at=null where id=target_id;
  else
    delete from public.cms_publications where document_id=target_id;
    update public.cms_documents set deleted_at=now() where id=target_id;
  end if;
end;
$$;
revoke all on function public.archive_cms_document(uuid,boolean) from public,anon,authenticated;
grant execute on function public.archive_cms_document(uuid,boolean) to authenticated;

create function public.archive_cms_asset(target_id uuid, restore boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare source_id uuid;
begin
  if not private.is_cms_owner() then raise exception 'Owner access is required' using errcode='42501'; end if;
  select original_asset_id into source_id from public.cms_assets where id=target_id for update;
  if not found then raise exception 'Image not found'; end if;
  if not restore and (exists(select 1 from public.cms_document_assets where asset_id=target_id)
    or exists(select 1 from public.cms_publication_assets where asset_id=target_id)) then
    raise exception 'Remove this image from its content before archiving';
  end if;
  update public.cms_assets set archived_at=case when restore then null else now() end where id in (target_id,source_id);
end;
$$;
revoke all on function public.archive_cms_asset(uuid,boolean) from public,anon,authenticated;
grant execute on function public.archive_cms_asset(uuid,boolean) to authenticated;

create or replace function public.publish_cms_document(target_document_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_cms_owner() then
    raise exception 'Owner access with two-factor authentication is required' using errcode = '42501';
  end if;
  perform 1 from public.cms_documents where id = target_document_id and deleted_at is null for update;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.cms_document_assets d join public.cms_assets a on a.id = d.asset_id
    where d.document_id = target_document_id and (
      a.bucket_id <> 'portfolio-media' or not exists (
        select 1 from storage.objects o where o.bucket_id = a.bucket_id and o.name = a.object_path
      )
    )
  ) then
    raise exception 'Publish only uploaded, approved copies from portfolio-media';
  end if;
  insert into public.cms_publications (document_id, kind, slug, title, content, sort_order, published_at)
    select id, kind, slug, title, content, sort_order, now()
    from public.cms_documents where id = target_document_id
  on conflict (document_id) do update set
    kind = excluded.kind, slug = excluded.slug, title = excluded.title,
    content = excluded.content, sort_order = excluded.sort_order, published_at = excluded.published_at;
  delete from public.cms_publication_assets where document_id = target_document_id;
  insert into public.cms_publication_assets
    (document_id, asset_id, bucket_id, object_path, alt_text, caption, sort_order)
    select d.document_id, a.id, a.bucket_id, a.object_path, a.alt_text, d.caption, d.sort_order
    from public.cms_document_assets d join public.cms_assets a on a.id = d.asset_id
    where d.document_id = target_document_id;
end;
$$;
revoke all on function public.publish_cms_document(uuid) from public, anon, authenticated;
grant execute on function public.publish_cms_document(uuid) to authenticated;

