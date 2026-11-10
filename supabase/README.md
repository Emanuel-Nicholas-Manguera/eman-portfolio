# Portfolio CMS: database foundation

The database and access rules are in place. The public portfolio still uses its
existing content. An Open canvas sign-in page is now available at `/admin/myself`,
with responsive layout, light/dark themes, and password visibility controls.
Sign-in and password recovery are visibly unavailable until Auth is connected.
Sign-out, MFA enrollment, the admin landing page, and editing forms remain future steps.

During development, open `http://localhost:5173/admin/myself` after `npm run dev`.
The production host will need an SPA fallback to `index.html` for this direct URL.

## Hosted project

- Project: `eman-portfolio` (`xqyaysweoidksjkkxxft`), in Professional Portfolio.
- URL: `https://xqyaysweoidksjkkxxft.supabase.co`.
- Intended owner: `emanuel.nicholas.nm@gmail.com`.
- Applied through the project-scoped Supabase MCP connection on 2026-11-10.
- Local migration versions match the versions returned by the hosted migration history.
- No content, images, Auth users, passwords, or API secrets were seeded.

The intended email is reserved in `private.cms_owner`. Its `user_id` is currently
null, so all CMS editing and publishing remain locked. Setting an email does not
create a login account or grant access to a matching profile/email claim.

## Data model

| Table | Purpose | Browser access |
| --- | --- | --- |
| `private.cms_owner` | One trusted owner binding, configured through a privileged database connection | Bound owner with MFA may read their binding; no browser writes |
| `public.cms_documents` | Draft introduction, experience, projects, about, and contact content | Owner with MFA only |
| `public.cms_assets` | Private upload metadata | Owner with MFA only |
| `public.cms_document_assets` | Draft gallery order and captions | Owner with MFA only |
| `public.cms_publications` | Explicitly published document snapshots | Public reads; owner with MFA writes |
| `public.cms_publication_assets` | Approved public gallery snapshots | Public reads; owner with MFA writes |

Every CMS table has RLS enabled and explicit privileges. Authorization uses the
bound Supabase Auth UUID plus a signed JWT with `aal2`. The admin URL, email claims,
and editable `user_metadata` do not authorize editing. The private schema is not
exposed through the Data API. Browser clients cannot bind or change ownership.

Document content is an object in JSONB; form-level fields and validation will be
defined when each editor is built. The database already enforces document kinds,
slugs, titles, file types, foreign keys, and gallery relationships.

## Photos and publishing

Both Storage buckets are **private**:

- `portfolio-originals`: original images, owner-only, up to 20 MiB each.
- `portfolio-media`: approved image copies, up to 10 MiB each. Draft files remain
  private; visitors may read only paths included in a publication.

JPEG, PNG, WebP, and AVIF are accepted. Owner uploads must be under
`<owner-auth-uuid>/<unique-file-name>`. Storage RLS requires both ownership and MFA.

Publishing will upload an approved copy, register its asset metadata, attach it to
a draft, then call `publish_cms_document(target_document_id)`. This function checks
the linked files and atomically copies the content, gallery order, alt text, and
captions to publication snapshots. Original-bucket files cannot be published.
It does not redact images automatically; the owner must review approved copies.

Further draft edits stay private until published again.
`unpublish_cms_document(target_document_id)` removes the public snapshot and its
file-read permission. Published file paths cannot be overwritten, renamed, or
deleted through the Storage API until unpublished; replacements use a new path.
Previously downloaded files, browser caches, and previously issued signed URLs
cannot be recalled. Avoid long-lived signed URLs in the future gallery.

## Next milestone: account setup and sign-in

1. Configure hosted Auth for owner-only use: disable public signup and anonymous
   sign-in, enable TOTP, and set the correct redirect URLs.
2. Create the intended owner's Auth account with a password chosen by the owner,
   and verify the email. No invitation/email was sent during this database step.
3. Build a small sign-in and TOTP enrollment flow. Before owner binding, the
   account may use Auth enrollment APIs but cannot access CMS drafts or uploads.
4. After verified TOTP enrollment, run this using the trusted project connection:

   ```sql
   select private.bind_cms_owner();
   ```

   It resolves the configured email from trusted `auth.users`, requires one active,
   verified account and a verified TOTP factor, then binds its UUID. It refuses
   an unexpected ownership transfer. It is not callable by API/browser roles.
5. Verify real password/MFA sign-in, sign-out, and non-owner rejection before
   building the admin landing page or editors.

`setup/configure-owner.sql` is the privileged initial email configuration script;
it refuses to overwrite an existing owner binding. To suspend CMS access without
changing published content, a trusted operator can set `private.cms_owner.enabled`
to false. Recovery and ownership transfers require a separate privileged review.

`config.toml` describes **local development** defaults only. Its Auth settings
have not been pushed to the hosted project. Never ship a service-role/secret key
in Vite code or commit passwords, tokens, or MFA secrets.

## Verification

```sh
npm run test:cms
npm run build
```

The permission suite uses disposable PGlite PostgreSQL with test-only Supabase
role/Auth/Storage fixtures. It exercises visitors, non-owners (including forged
profile metadata), owner AAL1 versus AAL2, owner-binding requirements, drafts,
publishing snapshots, private images, and published-file protection. It needs no
Docker, remote credentials, or changes to the hosted Auth database. These are
database permission tests, not a real browser password/TOTP login test.

Hosted verification on 2026-11-10 also confirmed private bucket configuration,
RLS and grants, the pending owner binding, and seven read-only HTTP checks:
published endpoints readable, draft/asset endpoints denied, private owner schema
not exposed, and bucket listings hidden. The security advisor reports no findings.
The performance advisor reports only unused indexes on the empty new tables.
The pre-existing automatic-RLS event helper remains enabled, with its unnecessary
browser-role execution privileges revoked.

The portfolio production build passes. Repository-wide lint still reports the
pre-existing unused `next` assignment in `src/Experience.tsx`. Dependency
audit still reports 10 moderate findings in the existing development linter chain;
this milestone adds no production dependency or existing dependency upgrade.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa), and
[Storage access](https://supabase.com/docs/guides/storage/security/access-control).
