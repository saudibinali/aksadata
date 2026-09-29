# Aksa Data architecture

Phase 1 is a modular monolith. The public site, signed-in account area, admin panel, and versioned HTTP API live in one Next.js application. Domain rules live under `src/server` and do not import React components. Route handlers and server actions call that layer.

A later mobile client should call `/api/v1`. A later split into a separate API service should move `src/server`, `prisma/`, and the route handlers, not rewrite the UI.

## Boundaries

| Area | Path | Role |
| --- | --- | --- |
| Public site | `src/app/[locale]/(site)` | Arabic and English pages |
| Account | `src/app/[locale]/(site)/account` | Signed-in identity |
| Admin panel | `src/app/[locale]/admin` | Governance UI |
| HTTP API | `src/app/api/v1` | Locale-independent contract for web and future mobile |
| Domain | `src/server` | Auth, settings, audit, media, validation |
| Database | `prisma/` | Schema and migrations |
| Messages | `messages/ar.json`, `messages/en.json` | User-facing copy |

Locale routing is `/ar/...` and `/en/...`. The default locale is Arabic. Direction is set on the document element.

## Admin model

There is no single `isAdmin` flag.

- Permission keys are a software catalog in `src/server/auth/permissions.ts`. Adding a permission means adding a feature that code can check, so that change belongs in development.
- Roles and role-permission assignments are data. Administrators with `roles.manage` can create roles and edit assignments.
- `SUPER_ADMIN` always receives the full catalog at seed time. Its permission set is not editable in the panel, so the governance role cannot be locked out by a permission edit.
- The last active Super Admin cannot be suspended, disabled, or removed from that role.
- A person cannot change their own account status.

Seeded roles: Super Admin, Administrator, Moderator, Content Manager, Event Manager, Support, and Marketing. Event Manager can open the dashboard only. Event permissions will be added with the events module.

Every working admin control writes to PostgreSQL and records an audit entry.

## Configuration

`src/server/config/registry.ts` is the typed catalog of setting keys and feature flags. The database stores the current values. Code reads values through `getSetting` and `isFeatureEnabled`. Defaults in the registry apply only when a row is missing.

Feature flags have two states in code:

- **Implemented.** The panel can enable or disable them, and the product checks them. Registration is implemented and off by default. Username/password sign-in is implemented and locked on, because it is the only sign-in method that exists.
- **Planned.** Comments, photos, messaging, ratings, Aksa Global, following, verification, gamification, custom events, advertising, and social profile links are stored as flags but cannot be turned on. The server rejects that change. Their screens are not built.

Some numeric limits for those future modules are already editable settings. The admin screen says the consuming module is not built yet. The value is still stored.

Reserved usernames are rows, grouped as system, government, place, public figure, or custom. The seed inserts a small system list only when the table is empty. After that, the list belongs to the admin panel. Government and public-figure names are not invented in code.

## Authentication

Web sessions are random tokens stored only as a SHA-256 hash. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Passwords use bcrypt. The cost comes from `BCRYPT_COST` (10–14), which is a security parameter rather than a business setting.

Accounts are separate from users (`accounts.provider`), so another login provider can be added later without reshaping the user table. Phase 1 implements the `credentials` provider only.

Browser API writes check the `Origin` host. Server Actions use the framework origin check. Login and registration are rate-limited in process memory. That limiter must be replaced with a shared store before the app runs as more than one instance.

Audit IP addresses are saved only when `TRUST_PROXY=true`.

## Media

`src/server/media/storage.ts` is the storage boundary. Phase 1 writes files under `MEDIA_ROOT` using generated keys, not user file names. The public media route serves only approved site logos and favicons. Bytes are checked against file signatures, the configured MIME list, and the configured size limit. SVG is not accepted.

## Content

Posts, translations, and comments exist so bilingual content and moderation status have a place to live. There is no composer and no public feed. Administrators can change the status of a post when one exists.

## Audit

`audit_logs` records the actor, action, entity, previous value, new value, time, user agent, and — when the proxy is trusted — the client IP. Setting changes are the configuration history. Passwords and session tokens are not written to the log.

## Security defaults

- Security headers are set in `next.config.ts`. HSTS is off until `ENABLE_HSTS=true`.
- Secrets stay in environment variables. `.env` is gitignored.
- Queries in the admin lists select explicit columns and do not load password hashes.
- Upload size has a technical ceiling of 10 MB because that is the server-action body limit. The business limit is the setting, and it cannot be set above that ceiling.

## Phase 2

Do not start these until the foundation is accepted:

- Public registration policy beyond the existing flag, email verification, and password reset
- Bearer tokens for iOS and Android, beside the current cookie session
- Shared rate limiting (Redis or equivalent)
- OAuth providers
- Posts, comments, photos, and moderation workflows
- Government event ingestion and event administration
- Verification workflow and its privileges
- Points, levels, and streaks
- Messaging and following
- Advertising placements
- A separate API process, if mobile traffic or scaling requires it
- Content Security Policy without `unsafe-inline`, after the production asset policy is measured

## Decisions waiting for approval

1. Keep the modular monolith until a mobile client exists, instead of splitting services now.
2. Arabic is the default locale, with an explicit `/ar` and `/en` prefix.
3. Web authentication stays cookie-session based until a native app needs bearer tokens.
4. Stay on Prisma ORM 7.10. Prisma 8 is still a release candidate in npm.
5. Site media is stored on the local disk behind a storage module, not in object storage yet.
6. Super Admin permissions stay code-owned so they cannot be edited away in the panel.
7. Development Compose uses host ports 5433 and 3001.
