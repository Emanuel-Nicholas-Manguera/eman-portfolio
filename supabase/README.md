# Portfolio CMS: database foundation

The database and access rules are in place. The public portfolio still uses its
existing content. An Open canvas sign-in page is now available at `/admin/myself`,
with responsive layout, light/dark themes, and password visibility controls.
The sign-in form now uses Supabase Auth for email/password login, authenticator
enrollment and verification, session restoration, and sign-out. A minimal signed-in
confirmation appears only after the database confirms owner access with MFA.
The admin dashboard, editing forms, and password-recovery UI remain separate steps.

During development, open `http://localhost:5173/admin/myself` after `npm run dev`.
The production host will need an SPA fallback to `index.html` for this direct URL.

## Hosted project

- Project: `eman-portfolio` (`xqyaysweoidksjkkxxft`), in Professional Portfolio.
- URL: `https://xqyaysweoidksjkkxxft.supabase.co`.
- Intended owner: `emanuel.nicholas.nm@gmail.com`.
- Applied through the project-scoped Supabase MCP connection on 2026-11-10.
- Local migration versions match the versions returned by the hosted migration history.
- No content, images, passwords, or API secrets were seeded. The owner creates
  their Auth account and chooses their password directly in the Supabase dashboard.

The intended email is reserved in `private.cms_owner`. CMS editing and publishing
stay locked until a trusted operator binds the verified account UUID. Setting an
email does not create a login account or grant access to a matching profile claim.

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

## Auth configuration and owner setup

The browser uses the project's **publishable** key and URL. Copy `.env.example`
to `.env.local`, replace the publishable-key placeholder, and restart `npm run dev`.
The working checkout has its local values configured; `.env.local` is ignored by Git.
Production hosting must supply the same `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` at build time. Never use a secret or service-role key.

The Auth SDK is loaded only for the admin route. Sessions are kept in tab-scoped
`sessionStorage`: reloads in the same tab retain the session, and closing the tab
removes that tab's stored session. Passwords, TOTP setup secrets, and one-time
codes are never stored by the application or logged. An enrollment QR/setup key
exists only in the current screen state and disappears on sign-out or navigation.

The admin signs out the current tab's session after **60 minutes of inactivity**.
At 59 minutes, an inline warning shows the remaining minute and a **Stay signed
in** button. Trusted clicks, typing, and scrolling reset the timer; Auth/token
refreshes and returning to the tab do not. The activity timestamp and a non-secret
session identifier are kept in the same tab's `sessionStorage`, so reloads retain
the deadline and a new login gets its own timer. Focus/visibility checks handle
deadlines passed during background throttling or laptop sleep. An expired restored
session is signed out before the workspace is mounted. Unsaved edits are not
automatically saved or published; the warning reminds the owner to save them.

This is a browser inactivity safeguard using `signOut({ scope: 'local' })`, not a
new server-enforced session policy. A copied access JWT remains valid until its
existing expiry; owner/MFA RLS stays unchanged. Supabase's managed session limits
are a separate Pro-plan feature. See [sessions](https://supabase.com/docs/guides/auth/sessions)
and [sign-out](https://supabase.com/docs/reference/javascript/auth-signout).

Hosted configuration was set for the development phase: public signup OFF,
anonymous sign-in OFF, email confirmation ON, TOTP ON, and site URL
`http://localhost:5173/admin/myself`. Update the site/allowed redirect URLs when the
production domain is chosen. The login uses email/password directly and does not
consume invitation, recovery, or OAuth callback links in this milestone.

1. Configure hosted Auth for owner-only use: disable public signup and anonymous
   sign-in, enable TOTP, and set the correct redirect URLs.
2. Create the intended owner's Auth account with a password chosen by the owner,
   and verify the email. No invitation/email was sent during this database step.
3. Sign in at `/admin/myself`, choose **Set up authenticator**, scan the QR with an
   authenticator app, and verify its six-digit code. Before owner binding, the
   account may use Auth enrollment APIs but cannot access CMS drafts or uploads.
4. After verified TOTP enrollment, run this using the trusted project connection:

   ```sql
   select private.bind_cms_owner();
   ```

   It resolves the configured email from trusted `auth.users`, requires one active,
   verified account and a verified TOTP factor, then binds its UUID. It refuses
   an unexpected ownership transfer. It is not callable by API/browser roles.
5. Click **Check access again** after trusted activation. Test reload, sign-out,
   and a new password/MFA sign-in before building the admin dashboard or editors.

`public.cms_auth_status()` is the narrow read-only RPC used by the sign-in flow.
It calls a private helper that validates `auth.uid()` against trusted Auth records
and the private owner registry. The helper requires an active, email-confirmed,
non-anonymous account and a verified TOTP factor before returning `ready` for an
AAL2 session. While the registry is unbound, only the configured verified email
may enroll; the browser cannot activate itself. Other identities get `denied`.
The private helper uses a fixed search path and explicit execution grants; its
database access does not expose the owner registry or `auth.users` through the API.

`setup/configure-owner.sql` is the privileged initial email configuration script;
it refuses to overwrite an existing owner binding. To suspend CMS access without
changing published content, a trusted operator can set `private.cms_owner.enabled`
to false. Recovery and ownership transfers require a separate privileged review.

`config.toml` describes **local development** defaults only. Hosted Auth settings
are managed separately in the dashboard. Never ship a service-role/secret key
in Vite code or commit passwords, tokens, or MFA secrets.

## Verification

```sh
npm run test:cms
npm run test:auth
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
not exposed, and bucket listings hidden. The foundation security advisor reported no findings at that checkpoint.
The performance advisor reports only unused indexes on the empty new tables.
The pre-existing automatic-RLS event helper remains enabled, with its unnecessary
browser-role execution privileges revoked.

The Auth service tests cover invalid credentials, untrusted session metadata,
network/identity failures, MFA requirements, unfinished-factor cleanup, activation
gating, and sign-out failure. Live checks confirm signup is disabled, email Auth is
enabled, and anonymous requests cannot call the Auth status RPC. A live browser
check confirmed invalid-login feedback and that the password field is cleared.
Owner password and authenticator steps are performed by the owner; test results
for those steps are recorded after completion without saving their credentials.

The owner created and confirmed the account, enrolled and verified TOTP, and the
trusted project connection successfully bound its UUID on 2026-11-10. The live
browser reached the owner-only confirmation, retained access after a reload,
and returned to the sign-in form after sign-out and another reload.
A fresh password sign-in then required the existing authenticator code and
successfully returned to the owner-only confirmation. The end-to-end flow is
verified; no password, TOTP key, code, or session token was saved as test evidence.

The portfolio production build and repository-wide lint pass. The unused
`next` assignment in `src/Experience.tsx` was resolved while connecting CMS data. Dependency
audit still reports 10 moderate findings in the existing development linter chain;
the Auth milestone pins the added `@supabase/supabase-js` dependency and commits
its lockfile. No existing dependency version was upgraded.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa), and
[Storage access](https://supabase.com/docs/guides/storage/security/access-control).


## Content management and public portfolio

The owner dashboard at `/admin/myself` now manages introduction, experience,
projects, contact details, social links, and images. Manage social icons in
**Introduction → Social links**. The platform picker supports multiple accounts
per platform. Use **Other website** for any additional profile URL and set a display
name to distinguish accounts. Published Introduction records without a social
list use the published Contact links until you publish an edited list. Contact uses
the same profile links and has its own email field. On Overview, **Import existing
portfolio** copies the original
React content and five images into Supabase. The importer is idempotent by
kind/slug and original image filename and fills missing entries while preserving
CMS edits.

- **Save draft** keeps work private, including incomplete work with a CMS title.
- **Preview draft** renders it with the public portfolio components in a private
  dialog; no draft is stored in browser persistence or sent to the public reader.
- **Save & publish** validates the entry, saves the draft, and snapshots it publicly.
- **Unpublish** keeps the draft but removes its public snapshot and asset links.
- **Archive content** unpublishes and hides an entry; **Show archived → Restore**
  brings it back as a draft. It does not automatically republish.
- Display order controls entry ordering; album controls order photos. Image labels,
  captions, and alt text are editable. Changes to image alt text reach the public
  snapshot when the associated content is republished.

Uploads accept JPEG, PNG, WebP, and AVIF up to 20 MB. The original is private in
`portfolio-originals`; the browser makes a metadata-free, maximum-2000px WebP copy
in `portfolio-media`. Selecting and publishing a copy authorizes public reading.
This processing does not redact sensitive content: review the actual photo or slide
before publishing. Image archiving is recoverable and refuses images still linked
to draft or published content. Originals remain recoverable alongside their copies.

`save_cms_document` updates draft content and album links atomically and checks the
editor's original `updated_at`, rejecting stale-tab overwrites. A partial unique
index protects the single introduction/About/contact entry. Archive RPCs preserve
rows and files; publishing refuses archived entries. Owner AAL2 checks and RLS apply
to every mutation. No service-role key is used in the browser.

The public site uses a separate, nonpersistent anonymous Supabase client and reads
only `cms_publications` and `cms_publication_assets`. It obtains short-lived image
URLs only for those approved publication paths. Updates refresh on focus, every
minute while visible, and immediately across local tabs after publication. A
configured CMS outage keeps the currently rendered snapshot or shows an unavailable
message; it never resurrects removed content from bundled defaults. Bundled content
is used only without Supabase configuration and by the initial importer.

Additional checks: `npm run test:content` tests public link filtering, publication
ordering, asset scoping, and input validation. The permission suite also covers
atomic editing, stale saves, archiving/restoring, and used-image protection.

Current hosted security review flags only disabled leaked-password protection
(an Auth configuration notice), with no database/RLS findings. See
[Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Production hosting/domain configuration is separate from this local portfolio CMS.
