# أكسا داتا

Aksa Data is a Saudi entertainment and social community platform. Arabic and English are both first-class, and the admin panel is part of the core architecture: operational policy lives in the database, not in scattered constants.

This repository is the Phase 1 foundation. It is not the full social network.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- PostgreSQL and Prisma ORM
- Docker Compose
- next-intl for Arabic (RTL) and English (LTR)

## Local setup

1. Copy the environment file and replace the placeholder secrets:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d db
```

The database is published on host port **5433**. The application container, when used, is published on host port **3001**. Production Compose does not publish the database.

3. Apply migrations and seed the governance catalog:

```bash
npm install
npx prisma generate
npm run db:migrate
npm run db:seed
```

4. Start the site:

```bash
npm run dev -- --port 3001
```

Open `http://localhost:3001/ar` and `http://localhost:3001/en`.

To create the first Super Admin, set `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` in `.env` before seeding. The seed creates that account only when it does not already exist. It never overwrites a password.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:seed` | Seed roles, permissions, settings, and feature flags |
| `npm run db:studio` | Prisma Studio |

## Production shape

`docker-compose.prod.yml` runs PostgreSQL, applies migrations, then starts the Next.js standalone server on `127.0.0.1:3000`. Nginx on the VPS terminates TLS and proxies to that port. See `deploy/nginx.conf.example`.

Set `TRUST_PROXY=true` only with that Nginx configuration, because it replaces `X-Forwarded-For` with the address Nginx actually saw. Set `ENABLE_HSTS=true` only after HTTPS works.

Uploaded files go to `MEDIA_ROOT` (a Docker volume in production). They are not stored in the source tree.

## Where to read the architecture

- `docs/ARCHITECTURE.md` — boundaries, admin model, configuration, and what Phase 2 should add
- `docs/adr/` — decisions that affect later change

## Repository

https://github.com/saudibinali/aksadata.git

Do not commit `.env`, database passwords, or files under `var/`.
