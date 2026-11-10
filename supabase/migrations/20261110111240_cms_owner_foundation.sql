-- The browser may edit only as the explicitly bound owner with an AAL2 session.
-- Drafts and publication snapshots are separate so draft edits never leak publicly.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;

create table private.cms_owner (
  singleton boolean primary key default true check (singleton),
  expected_email text check (expected_email = lower(btrim(expected_email))),
  user_id uuid unique references auth.users(id) on delete set null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into private.cms_owner (singleton) values (true);
alter table private.cms_owner enable row level security;
revoke all on private.cms_owner from public, anon, authenticated;
grant select on private.cms_owner to authenticated;
create policy owner_can_read_own_binding on private.cms_owner
  for select to authenticated
  using (enabled and user_id = (select auth.uid()) and (select auth.jwt()->>'aal') = 'aal2');

create function private.is_cms_owner()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists (
      select 1 from private.cms_owner
      where singleton and enabled and user_id = (select auth.uid())
    );
$$;
revoke all on function private.is_cms_owner() from public, anon, authenticated;
grant execute on function private.is_cms_owner() to authenticated;

-- Run only through the trusted database connection after creating the Auth user
-- and enrolling TOTP. Email locates the account once; UID authorizes every request.
create function private.bind_cms_owner()
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  config private.cms_owner%rowtype;
  candidates uuid[];
  owner_id uuid;
begin
  select * into strict config from private.cms_owner where singleton for update;
  if config.expected_email is null then
    raise exception 'Configure the intended owner email first';
  end if;
  select array_agg(u.id) into candidates from auth.users u
  where lower(u.email) = config.expected_email
    and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false)
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now());
  if coalesce(cardinality(candidates), 0) <> 1 then
    raise exception 'Exactly one verified, active owner account is required';
  end if;
  owner_id := candidates[1];
  if config.user_id is not null and config.user_id <> owner_id then
    raise exception 'An owner is already bound; review any ownership transfer separately';
  end if;
  if not exists (
    select 1 from auth.mfa_factors f
    where f.user_id = owner_id and f.factor_type = 'totp' and f.status = 'verified'
  ) then
    raise exception 'Verify a TOTP factor before enabling CMS access';
  end if;
  update private.cms_owner set user_id = owner_id, updated_at = now() where singleton;
  return owner_id;
end;
$$;
revoke all on function private.bind_cms_owner() from public, anon, authenticated;

create function private.cms_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;
revoke all on function private.cms_touch_updated_at() from public, anon, authenticated;

create table public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('introduction', 'experience', 'project', 'about', 'contact')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(btrim(title)) between 1 and 200),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);
create trigger cms_documents_updated_at before update on public.cms_documents
  for each row execute function private.cms_touch_updated_at();

create table public.cms_publications (
  document_id uuid primary key references public.cms_documents(id) on delete cascade,
  kind text not null check (kind in ('introduction', 'experience', 'project', 'about', 'contact')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(btrim(title)) between 1 and 200),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  sort_order integer not null default 0,
  published_at timestamptz not null default now(),
  unique (kind, slug)
);
create index cms_publications_display_order on public.cms_publications(kind, sort_order, document_id);

create table public.cms_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id in ('portfolio-originals', 'portfolio-media')),
  object_path text not null check (object_path <> '' and object_path !~ '^/'),
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size bigint not null check (byte_size > 0),
  alt_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path),
  unique (id, bucket_id, object_path)
);
create trigger cms_assets_updated_at before update on public.cms_assets
  for each row execute function private.cms_touch_updated_at();

create table public.cms_document_assets (
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  asset_id uuid not null references public.cms_assets(id) on delete restrict,
  sort_order integer not null default 0,
  caption text not null default '',
  primary key (document_id, asset_id)
);
create index cms_document_assets_asset_id on public.cms_document_assets(asset_id);

create table public.cms_publication_assets (
  document_id uuid not null references public.cms_publications(document_id) on delete cascade,
  asset_id uuid not null,
  bucket_id text not null default 'portfolio-media' check (bucket_id = 'portfolio-media'),
  object_path text not null,
  alt_text text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  primary key (document_id, asset_id),
  foreign key (asset_id, bucket_id, object_path)
    references public.cms_assets(id, bucket_id, object_path) on delete restrict
);
create index cms_publication_assets_asset_id on public.cms_publication_assets(asset_id, bucket_id, object_path);
create index cms_publication_assets_storage_path on public.cms_publication_assets(bucket_id, object_path);

-- Explicit grants are needed with automatic table exposure disabled.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'cms_documents', 'cms_publications', 'cms_assets',
    'cms_document_assets', 'cms_publication_assets'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
  foreach table_name in array array['cms_documents', 'cms_assets', 'cms_document_assets'] loop
    execute format(
      'create policy cms_owner_access on public.%I for all to authenticated '
      || 'using ((select private.is_cms_owner())) with check ((select private.is_cms_owner()))',
      table_name
    );
  end loop;
  foreach table_name in array array['cms_publications', 'cms_publication_assets'] loop
    execute format('grant select on public.%I to anon', table_name);
    execute format('create policy published_read on public.%I for select to anon, authenticated using (true)', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select private.is_cms_owner()))', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select private.is_cms_owner())) with check ((select private.is_cms_owner()))', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select private.is_cms_owner()))', table_name);
  end loop;
end;
$$;

-- Both buckets stay private. Only files explicitly included in a publication
-- become readable by visitors. Original uploads can never be published directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio-originals', 'portfolio-originals', false, 20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('portfolio-media', 'portfolio-media', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

create policy cms_visitor_download on storage.objects for select to anon
using (
  bucket_id = 'portfolio-media' and exists (
    select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name
  )
);
create policy cms_authenticated_download on storage.objects for select to authenticated
using (
  (bucket_id in ('portfolio-originals', 'portfolio-media')
    and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text)
  or (bucket_id = 'portfolio-media' and exists (
    select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name
  ))
);
create policy cms_owner_upload on storage.objects for insert to authenticated
with check (
  bucket_id in ('portfolio-originals', 'portfolio-media')
  and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text
);
-- Published files are immutable until unpublished. Replacements use a new path.
create policy cms_owner_replace_unpublished on storage.objects for update to authenticated
using (
  bucket_id in ('portfolio-originals', 'portfolio-media')
  and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text
  and not exists (select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name)
)
with check (
  bucket_id in ('portfolio-originals', 'portfolio-media')
  and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text
  and not exists (select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name)
);
create policy cms_owner_delete_unpublished on storage.objects for delete to authenticated
using (
  bucket_id in ('portfolio-originals', 'portfolio-media')
  and (select private.is_cms_owner()) and split_part(name, '/', 1) = (select auth.uid())::text
  and not exists (select 1 from public.cms_publication_assets p
    where p.bucket_id = objects.bucket_id and p.object_path = objects.name)
);

create function public.publish_cms_document(target_document_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_cms_owner() then
    raise exception 'Owner access with two-factor authentication is required' using errcode = '42501';
  end if;
  perform 1 from public.cms_documents where id = target_document_id for update;
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

create function public.unpublish_cms_document(target_document_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_cms_owner() then
    raise exception 'Owner access with two-factor authentication is required' using errcode = '42501';
  end if;
  perform 1 from public.cms_documents where id = target_document_id for update;
  delete from public.cms_publications where document_id = target_document_id;
end;
$$;
revoke all on function public.unpublish_cms_document(uuid) from public, anon, authenticated;
grant execute on function public.unpublish_cms_document(uuid) to authenticated;

-- Keep the project's automatic-RLS event trigger, remove its unnecessary API access.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end; $$;
