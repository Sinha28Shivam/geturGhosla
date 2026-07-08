# Development Setup Guide — Room Discovery App

Everything needed before writing feature code. Do this once, properly,
and the whole team avoids "works on my machine" problems later.

---

## 0. Blocking decisions — resolve these first

You cannot fully configure the environment without these:

| Decision | Blocks |
|---|---|
| SMS provider (Twilio / MSG91 / Gupshup) | Auth service env vars, SDK install |
| Maps provider (Google / Mapbox / Azure Maps) | Frontend map SDK, backend distance-calc API key |
| Backend framework (NestJS vs Django) | Everything in Section 3 assumes Node/NestJS — swap accordingly if you go Django |
| Expo vs bare React Native | Mobile setup complexity (Section 4) — Expo is dramatically simpler to set up, bare RN gives more native control |

If any of these are still open, setup will be redone once they're decided. Don't half-configure around a guess.

---

## 1. Accounts & subscriptions needed

| What | Why | Cost |
|---|---|---|
| Azure subscription | Hosting, database, storage, auth session layer | Already have it |
| SMS provider account | OTP delivery to Indian numbers | Pay-per-SMS, varies by provider |
| Maps provider account + API key | Distance calc, geocoding | Free tier usually available, check current limits |
| GitHub or Azure DevOps org | Source control, CI/CD | Free for small teams |
| Domain name | Production URL, SSL | ~$10–15/year |
| Firebase project (if using FCM) | Push notifications | Free |

---

## 2. Local machine tooling (every developer needs this)

| Tool | Purpose | Notes |
|---|---|---|
| Node.js (LTS version) | Backend + frontend runtime | Use `nvm` to manage versions — don't install Node globally and hope everyone matches |
| Git | Version control | — |
| Docker + Docker Compose | Runs Postgres+PostGIS and Redis locally without installing them natively | This matters more than it sounds — see Section 5 |
| VS Code (or your team's editor of choice) | — | Standardize on shared extensions (ESLint, Prettier) via a `.vscode/extensions.json` recommendation file |
| Postman or Insomnia | Manual API testing during development | Thunder Client (VS Code extension) also works if you want fewer separate apps |
| Azure CLI | Deploying/managing Azure resources from terminal | `az login` once configured |

**Mobile-specific (if bare React Native, not Expo):**
- Android Studio + Android SDK (for Android builds/emulator)
- Xcode (Mac only, for iOS builds/simulator)
- CocoaPods (iOS dependency management)

If you go with **Expo**, most of the above mobile tooling is unnecessary to start — this is the strongest argument for Expo at MVP stage with a small team.

---

## 3. Repository structure

Recommendation: **monorepo** for a small team — one repo, not three. Easier to coordinate changes across frontend/backend/mobile when the team is small, and you avoid the overhead of synchronizing versions across separate repos.

```
room-discovery-app/
├── apps/
│   ├── api/            # backend (NestJS or Django)
│   ├── web/             # React web app
│   └── mobile/           # React Native app
├── packages/
│   └── shared/           # shared types/constants between web and mobile (if using TypeScript)
├── docker-compose.yml     # local Postgres+PostGIS + Redis
├── .env.example           # template, never commit actual .env
└── docs/                  # architecture docs, schema.sql, api_routes_all_phases.md live here
```

Drop the `schema.sql`, `rate_limiting.sql`, `rateLimitMiddleware.js`, `api_routes_all_phases.md`, and `project_summary.md` files already produced straight into `docs/` — that's their permanent home, not scattered in chat history.

---

## 4. Environment & secrets management

**Never commit secrets to git.** Set this up correctly on day one:

- `.env.example` in the repo — lists every required variable with placeholder values, committed
- `.env` — actual values, in `.gitignore`, never committed
- For production: **Azure Key Vault**, not `.env` files on a server. Pull secrets at deploy time.

Minimum variables you'll need from day one:
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
SMS_PROVIDER_API_KEY=        # blocked on Section 0 decision
MAPS_API_KEY=                 # blocked on Section 0 decision
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=
```

---

## 5. Local database setup

This is the part most teams get wrong: **PostGIS is a Postgres extension, not a separate install.** Use the official PostGIS Docker image so every developer's local database matches production exactly, instead of everyone running slightly different local Postgres versions.

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: room_discovery
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

Run `docker compose up -d`, then apply `schema.sql` against it. Every developer runs the exact same database version — no more "it works on my machine but not yours" from Postgres version drift.

**Migrations tool:** don't run raw `schema.sql` changes by hand after the initial setup. Adopt a migration tool immediately:
- Node/NestJS → Prisma or TypeORM migrations
- Django → Django's built-in migrations (with `django.contrib.gis` for PostGIS support)

Retrofitting migrations onto a schema that's already evolved informally is painful — start with them from commit one.

---

## 6. API contract & documentation

Set up **Swagger/OpenAPI** generation from day one, not as an afterthought:
- NestJS has built-in Swagger decorators
- Django uses `drf-spectacular` or similar with Django REST Framework

This turns `api_routes_all_phases.md` from a static document into a live, testable API explorer as you build — keeps the doc and the actual code from drifting apart, which they will if the doc is the only source of truth.

---

## 7. CI/CD pipeline (minimum viable, not enterprise-grade)

Use **GitHub Actions** (if GitHub) or **Azure DevOps Pipelines** (if you want tighter Azure integration). At minimum, on every pull request:

1. Install dependencies
2. Run linter (ESLint / Pylint)
3. Run tests
4. Build check (does it compile/build without errors)

On merge to `main`:
5. Deploy to staging automatically
6. Deploy to production — manual trigger, not automatic, until you trust the pipeline

Don't skip this to "move faster" — a broken build reaching production because no one ran tests costs more time than the pipeline setup does.

---

## 8. Code quality standards (agree on these before the first PR, not after)

- **Linter + formatter**: ESLint + Prettier (Node) or Pylint + Black (Django), enforced via pre-commit hook (`husky` + `lint-staged` for Node)
- **Commit convention**: pick one (Conventional Commits is a reasonable default) so history is scannable later
- **Branching strategy**: `main` (production), `develop` or feature branches → PR → merge. Keep it simple with a small team — don't adopt a heavyweight Gitflow process for a 3-person team, that's process overhead you don't need yet

---

## 9. Environments

| Environment | Purpose | Notes |
|---|---|---|
| Local | Individual development | Docker Compose, as above |
| Staging | Pre-production testing, QA | Mirrors production config, separate Azure resources, separate database |
| Production | Live | Locked down, deploys require manual approval initially |

**Don't test against production data or production API keys during development** — this sounds obvious but is the single most common way a small team accidentally sends real OTP SMS costs or corrupts real listings during testing. Separate SMS provider test/sandbox credentials specifically for staging.

---

## 10. Setup checklist — run through this in order

1. [ ] Resolve blocking decisions (Section 0)
2. [ ] Create accounts: SMS provider, Maps provider, GitHub/DevOps org, domain
3. [ ] Install local tooling (Section 2)
4. [ ] Create monorepo structure (Section 3)
5. [ ] Set up `.env.example` and Azure Key Vault for production secrets
6. [ ] Bring up local Postgres+PostGIS and Redis via Docker Compose
7. [ ] Apply `schema.sql`, then switch to a migration tool for all future changes
8. [ ] Set up Swagger/OpenAPI docs generation
9. [ ] Set up CI pipeline (lint + test + build on every PR)
10. [ ] Create staging environment on Azure, separate from production
11. [ ] Agree on branching strategy and commit convention as a team, in writing, before the first PR
