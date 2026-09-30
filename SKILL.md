<!-- repository: services/communication-gateway | kind: SERVICE | stack: typescript -->

# communication-gateway — Skill: Service Development

> Workflow for communication-gateway (services/communication-gateway). Execute this workflow before, during, and
> after changes in this repository.

## Repository Facts

- Kind: Service
- Package: `communication-gateway-service` (version: `3.0.0`)
- Runtime: Node >=26.8.1 <27, pnpm 11.24.0
- Description: Omnixys Communication Gateway – external provider integration layer (email/SMTP and other providers).
- Architecture: layered `src/{domain,application,infrastructure,api,config,shared}` with one Nest module per bounded
  context
- Database: PostgreSQL via Prisma; Migrations: Prisma migrate (`prisma/migrations`, baseline replaces Alembic 001-004)
- API: REST under `/api/v1` plus a GraphQL federation v2 subgraph on `/graphql`
- Messaging: Kafka via `@omnixys/kafka-ts`, topic `gateway.delivery.status`
- Providers: Evolution (WhatsApp), Resend (email), Stalwart (SMTP fallback)
- Tests: `node --test`; `__tests__/unit` and `__tests__/integration` in plain ESM

## Workflow

### 1. Understand the change

- Identify the affected layer. Dependencies point inwards: `api` and `infrastructure` use the `application` ports,
  `application` uses `domain`, `domain` uses nothing but `@omnixys/contracts-ts`.
- Inspect the consumers of the GraphQL operations, the REST routes and the Kafka events you may touch. The GraphQL
  field and enum names stay snake_case; the gateway BFF depends on them.
- Decide whether the route is public. Health probes and webhooks are `@Public()`; everything else, GraphQL included,
  requires `x-internal-api-key`. Never weaken authentication or authorization to make a test pass.

### 2. Implement

- Add a layer in the canonical order and keep the existing module layout and naming conventions.
- Reuse `@omnixys/*` packages (logger-ts, contracts-ts, kafka-ts, context-ts, cache-ts, observability-ts,
  security-ts) before reimplementing shared infrastructure. Do not add a repository-local copy.
- Keep secrets out of logs and files: SMTP credentials, provider tokens and `INTERNAL_API_KEY` are never logged, and
  `.env` is never read by code or tests.
- Configuration changes go through `src/config/configuration.ts`. Every new key needs a default, validation where a
  wrong value is dangerous, and a line in `.env.example`.
- Database changes need a new migration on top of `20260101000000_init`. Never edit an applied migration, and keep
  index and constraint names aligned with the SQL baseline.

### 3. Write tests

- Unit tests exercise isolated business behavior: configuration parsing, domain rules, provider adapters, webhook
  verification, the event bus, the outbox worker and the HTTP forwarder.
- Integration tests boot the real Nest application on an ephemeral port and cover REST, GraphQL, the internal API key
  guard, health probes, readiness and persistence.
- Import `../support/env.mjs` first in every test file. It pins a closed `DATABASE_URL` and a fixed
  `INTERNAL_API_KEY`, because `--env-file` cannot override the ambient environment and a local `.env` exists.
- Cover tenant-isolation and error-contract cases when the code path touches them. A regression test must fail before
  the fix and pass after it.

### 4. Validate

## Validation

Run each applicable check and record the result as `PASS`, `FAIL`, `PRE-EXISTING
FAILURE`, or `NOT RUN` (with a reason). Never convert `NOT RUN` into `PASS`.

  - `pnpm install --frozen-lockfile`
  - `pnpm run prisma:validate`
  - `pnpm run format:check`
  - `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` (the `lint` script rewrites files, so do not use it to verify)
  - `npx tsc -p tsconfig.json --noEmit`
  - `pnpm run build`
  - `node --env-file=__tests__/unit/test.env --test __tests__/unit/*.test.mjs`
  - `node --env-file=__tests__/unit/test.env --test __tests__/integration/*.test.mjs`
  - `pnpm run test` (both suites, each preceded by a build)

A full `docker buildx bake` needs the GitHub Packages token as a build secret. Without
it the build stops at the private registry step with `ERR_PNPM_FETCH_401`; report that as
`NOT RUN` for the credentials, not as a Dockerfile failure.

## Commit

- Use Conventional Commits (`<type>(<scope>): <summary>`), e.g. `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`.
- Stage only files belonging to the logical change. Run `git diff --check` before committing.
- Update `docs/contracts/api-contract.md` in the same change whenever an externally observable contract moves, and
  keep `AGENTS.md` and `SKILL.md` current with the repository.
- Never push, tag, publish or deploy.
