import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

// These identities and auth/storage tables exist only in this disposable test DB.
// Real Supabase owns those schemas in production; migrations never create users.
const ownerId = '11111111-1111-4111-8111-111111111111'
const strangerId = '22222222-2222-4222-8222-222222222222'
const docId = '33333333-3333-4333-8333-333333333333'
const assetId = '44444444-4444-4444-8444-444444444444'
const originalId = '55555555-5555-4555-8555-555555555555'
const missingId = '66666666-6666-4666-8666-666666666666'
const ownerEmail = 'emanuel.nicholas.nm@gmail.com'
const imagePath = `${ownerId}/approved.webp`
const originalPath = `${ownerId}/original.png`

test('CMS database authorization and publishing workflow', async (t) => {
  const db = await PGlite.create()
  t.after(() => db.close())
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      is_anonymous boolean default false, deleted_at timestamptz, banned_until timestamptz
    );
    create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid,
      factor_type text, status text);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt()->>'sub', '')::uuid;
    $$;
    grant usage on schema public, auth, storage to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id), name text, metadata jsonb default '{}',
      unique(bucket_id, name));
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    create function public.rls_auto_enable() returns event_trigger language plpgsql
      security definer set search_path = '' as $$ begin end; $$;
  `)
  for (const filename of (await readdir(new URL('../migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(`../migrations/${filename}`, import.meta.url), 'utf8'))
  }
  await db.exec(await readFile(new URL('../setup/configure-owner.sql', import.meta.url), 'utf8'))

  async function asUser(role, id, aal, fn, extra = {}) {
    const claims = { role, ...(id ? { sub: id, aal } : {}), ...extra }
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)])
    await db.exec(`set role ${role}`)
    try { return await fn() }
    finally {
      await db.exec('reset role')
      await db.exec("select set_config('request.jwt.claims', '{}', false)")
    }
  }
  const owner = (fn, aal = 'aal2') => asUser('authenticated', ownerId, aal, fn)
  const visitor = (fn) => asUser('anon', null, null, fn)
  const stranger = (fn) => asUser('authenticated', strangerId, 'aal2', fn,
    { email: ownerEmail, user_metadata: { admin: true, email: ownerEmail } })
  const rows = async (query, params) => (await db.query(query, params)).rows
  const denied = (fn) => assert.rejects(fn, (e) => e.code === '42501')

  await t.test('new project is locked, and all six CMS tables have RLS', async () => {
    assert.deepEqual(await rows('select expected_email, user_id from private.cms_owner'),
      [{ expected_email: ownerEmail, user_id: null }])
    const tables = await rows(`select c.relname, c.relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where (n.nspname = 'public' and c.relname like 'cms_%' and c.relkind = 'r')
        or (n.nspname = 'private' and c.relname = 'cms_owner')`)
    assert.equal(tables.length, 6)
    assert.ok(tables.every((r) => r.relrowsecurity))
    await owner(async () => assert.equal((await rows('select private.is_cms_owner() as ok'))[0].ok, false))
    assert.deepEqual(await rows('select public from storage.buckets order by id'), [{ public: false }, { public: false }])
  })

  await t.test('owner binding rejects missing or unverified accounts and requires verified TOTP', async () => {
    await assert.rejects(() => db.query('select private.bind_cms_owner()'), /verified, active owner/)
    await db.query('insert into auth.users (id, email) values ($1, $2)', [ownerId, ownerEmail])
    await assert.rejects(() => db.query('select private.bind_cms_owner()'), /verified, active owner/)
    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [ownerId])
    await assert.rejects(() => db.query('select private.bind_cms_owner()'), /TOTP/)
    await db.query("insert into auth.mfa_factors (user_id, factor_type, status) values ($1, 'totp', 'unverified')", [ownerId])
    await assert.rejects(() => db.query('select private.bind_cms_owner()'), /TOTP/)
    await db.query("update auth.mfa_factors set status = 'verified' where user_id = $1", [ownerId])
    assert.equal((await rows('select private.bind_cms_owner() as id'))[0].id, ownerId)
    assert.equal((await rows('select private.bind_cms_owner() as id'))[0].id, ownerId)
  })

  await t.test('browser clients cannot promote themselves or call owner setup functions', async () => {
    await visitor(async () => {
      await denied(() => db.query('select * from private.cms_owner'))
      await denied(() => db.query('select private.bind_cms_owner()'))
    })
    await stranger(async () => {
      assert.deepEqual(await rows('select * from private.cms_owner'), [])
      await denied(() => db.query('update private.cms_owner set user_id = $1', [strangerId]))
      await denied(() => db.query('select private.bind_cms_owner()'))
      assert.equal((await rows('select private.is_cms_owner() as ok'))[0].ok, false)
    })
    await owner(async () => {
      await denied(() => db.query('update private.cms_owner set enabled = false'))
      await denied(() => db.query('select private.bind_cms_owner()'))
    })
  })

  await t.test('only the bound owner at AAL2 can create drafts and upload in their folder', async () => {
    const createDraft = () => db.query(`insert into public.cms_documents (id, kind, slug, title, content)
      values ($1, 'project', 'test-project', 'Draft project', '{"description":"Unpublished"}')`, [docId])
    await visitor(async () => { await denied(createDraft) })
    await stranger(async () => { await denied(createDraft) })
    await owner(async () => { await denied(createDraft) }, 'aal1')
    await owner(async () => {
      await createDraft()
      await db.query("insert into storage.objects (bucket_id, name) values ('portfolio-media', $1)", [imagePath])
      await db.query("insert into storage.objects (bucket_id, name) values ('portfolio-originals', $1)", [originalPath])
      await denied(() => db.query("insert into storage.objects (bucket_id, name) values ('portfolio-media', 'other/fake.webp')"))
      await db.query(`insert into public.cms_assets (id, bucket_id, object_path, original_filename, mime_type, byte_size, alt_text)
        values ($1, 'portfolio-media', $2, 'approved.webp', 'image/webp', 1234, 'Approved example')`, [assetId, imagePath])
      await db.query(`insert into public.cms_assets (id, bucket_id, object_path, original_filename, mime_type, byte_size)
        values ($1, 'portfolio-originals', $2, 'private-original.png', 'image/png', 9999)`, [originalId, originalPath])
      await db.query(`insert into public.cms_assets (id, bucket_id, object_path, original_filename, mime_type, byte_size)
        values ($1, 'portfolio-media', $2, 'missing.webp', 'image/webp', 1)`, [missingId, `${ownerId}/missing.webp`])
    })
  })

  await t.test('visitors, other users, and an AAL1 owner cannot read drafts or original files', async () => {
    await visitor(async () => {
      for (const table of ['cms_documents', 'cms_assets', 'cms_document_assets']) {
        await denied(() => db.query(`select * from public.${table}`))
      }
      assert.deepEqual(await rows('select * from public.cms_publications'), [])
      assert.deepEqual(await rows('select * from storage.objects'), [])
    })
    for (const session of [stranger, (fn) => owner(fn, 'aal1')]) {
      await session(async () => {
        for (const table of ['cms_documents', 'cms_assets', 'cms_document_assets']) {
          assert.deepEqual(await rows(`select * from public.${table}`), [])
        }
        assert.deepEqual(await rows('select * from storage.objects'), [])
        assert.deepEqual(await rows('update public.cms_documents set title = \'Hacked\' returning id'), [])
        assert.deepEqual(await rows('delete from public.cms_documents returning id'), [])
      })
    }
  })

  await t.test('unauthorized sessions cannot publish or write publication snapshots directly', async () => {
    for (const session of [visitor, stranger, (fn) => owner(fn, 'aal1')]) {
      await session(async () => {
        await denied(() => db.query('select public.publish_cms_document($1)', [docId]))
        await denied(() => db.query('select public.unpublish_cms_document($1)', [docId]))
        await denied(() => db.query(`insert into public.cms_publications (document_id, kind, slug, title, content)
          values ($1, 'project', 'fake', 'Fake', '{}')`, [docId]))
      })
    }
  })

  await t.test('publishing rejects original or missing images without leaving a partial publication', async () => {
    await owner(async () => {
      for (const id of [originalId, missingId]) {
        await db.query('insert into public.cms_document_assets (document_id, asset_id) values ($1, $2)', [docId, id])
        await assert.rejects(() => db.query('select public.publish_cms_document($1)', [docId]), /approved copies/)
        assert.deepEqual(await rows('select * from public.cms_publications'), [])
        await db.query('delete from public.cms_document_assets where document_id = $1', [docId])
      }
    })
  })

  await t.test('owner can publish a snapshot with approved image metadata', async () => {
    await owner(async () => {
      await db.query(`insert into public.cms_document_assets (document_id, asset_id, caption)
        values ($1, $2, 'Public caption')`, [docId, assetId])
      await db.query('select public.publish_cms_document($1)', [docId])
    })
    await visitor(async () => {
      assert.deepEqual(await rows('select title, content from public.cms_publications'),
        [{ title: 'Draft project', content: { description: 'Unpublished' } }])
      assert.deepEqual(await rows('select object_path, alt_text, caption from public.cms_publication_assets'),
        [{ object_path: imagePath, alt_text: 'Approved example', caption: 'Public caption' }])
      assert.deepEqual(await rows('select bucket_id, name from storage.objects'),
        [{ bucket_id: 'portfolio-media', name: imagePath }])
    })
  })

  await t.test('further draft and image-description edits stay private until republished', async () => {
    await owner(async () => {
      await db.query(`update public.cms_documents set title = 'Private revision', content = '{"description":"Do not publish yet"}' where id = $1`, [docId])
      await db.query("update public.cms_assets set alt_text = 'Private alt revision' where id = $1", [assetId])
      await db.query("update public.cms_document_assets set caption = 'Private caption' where document_id = $1", [docId])
    })
    await visitor(async () => {
      assert.equal((await rows('select title from public.cms_publications'))[0].title, 'Draft project')
      assert.equal((await rows('select caption from public.cms_publication_assets'))[0].caption, 'Public caption')
      assert.equal((await rows('select alt_text from public.cms_publication_assets'))[0].alt_text, 'Approved example')
    })
  })

  await t.test('published images cannot be replaced, renamed, or deleted accidentally', async () => {
    await owner(async () => {
      assert.deepEqual(await rows('delete from storage.objects where name = $1 returning name', [imagePath]), [])
      assert.deepEqual(await rows("update storage.objects set metadata = '{\"changed\":true}' where name = $1 returning name", [imagePath]), [])
      assert.deepEqual(await rows('update storage.objects set name = $1 where name = $2 returning name', [`${ownerId}/renamed.webp`, imagePath]), [])
      await assert.rejects(() => db.query('delete from public.cms_assets where id = $1', [assetId]),
        (e) => ['23503', '23001'].includes(e.code))
      await assert.rejects(() => db.query('update public.cms_assets set object_path = $1 where id = $2', [`${ownerId}/renamed.webp`, assetId]),
        (e) => ['23503', '23001'].includes(e.code))
    })
  })

  await t.test('other authenticated users may read published content but cannot change it', async () => {
    await stranger(async () => {
      assert.equal((await rows('select * from public.cms_publications')).length, 1)
      assert.equal((await rows('select * from storage.objects')).length, 1)
      assert.deepEqual(await rows('delete from public.cms_publications returning document_id'), [])
      assert.deepEqual(await rows("update public.cms_publications set title = 'Hacked' returning document_id"), [])
      await denied(() => db.query("insert into storage.objects (bucket_id, name) values ('portfolio-media', $1)", [`${strangerId}/fake.webp`]))
      assert.deepEqual(await rows('delete from storage.objects returning name'), [])
    })
  })

  await t.test('republishing updates the whole snapshot, and unpublishing revokes image reads', async () => {
    await owner(async () => { await db.query('select public.publish_cms_document($1)', [docId]) })
    await visitor(async () => {
      assert.equal((await rows('select title from public.cms_publications'))[0].title, 'Private revision')
      assert.equal((await rows('select caption from public.cms_publication_assets'))[0].caption, 'Private caption')
    })
    await owner(async () => { await db.query('select public.unpublish_cms_document($1)', [docId]) })
    await visitor(async () => {
      assert.deepEqual(await rows('select * from public.cms_publications'), [])
      assert.deepEqual(await rows('select * from public.cms_publication_assets'), [])
      assert.deepEqual(await rows('select * from storage.objects'), [])
    })
    await owner(async () => {
      assert.equal((await rows("update storage.objects set metadata = '{\"changed\":true}' where name = $1 returning name", [imagePath])).length, 1)
    })
  })

  await t.test('disabling or removing the owner binding immediately blocks even AAL2 sessions', async () => {
    await db.exec('update private.cms_owner set enabled = false')
    await owner(async () => {
      assert.deepEqual(await rows('select * from public.cms_documents'), [])
      await denied(() => db.query('select public.publish_cms_document($1)', [docId]))
    })
    await db.exec('update private.cms_owner set enabled = true, user_id = null')
    await owner(async () => { assert.deepEqual(await rows('select * from public.cms_documents'), []) })
  })

  await t.test('automatic-RLS helper and private setup functions are not callable by API roles', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await rows("select has_function_privilege($1, 'public.rls_auto_enable()', 'execute') as ok", [role]))[0].ok, false)
      assert.equal((await rows("select has_function_privilege($1, 'private.bind_cms_owner()', 'execute') as ok", [role]))[0].ok, false)
      assert.equal((await rows("select has_schema_privilege($1, 'public', 'create') as ok", [role]))[0].ok, false)
    }
  })
})
