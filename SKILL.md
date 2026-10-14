<!-- repository: services/communication-gateway | kind: SERVICE | stack: typescript -->

# communication-gateway — Skill: Service Development

> Workflow for communication-gateway (services/communication-gateway). Execute this workflow before, during, and
> after changes in this repository.

## Repository Facts

- Kind: Service
- Package: `communication-gateway-service` (version currently set by release automation)
- Runtime: Node >=26.8.1 <27, pnpm 11.24.0
- Description: Omnixys Communication Gateway – external provider integration layer (email/SMTP and other providers).
- Architecture: `src/communication-gateway` uses `controllers`, `resolvers`, `services`, `errors`, `utils`,
  and `models/{dto,entities,enums,inputs,interfaces,mappers,payloads}`;
  `src/{adapter,analytics,config,core,health,prisma,security}` are service infrastructure
- Database: required PostgreSQL via Prisma 7; Migrations: Prisma migrate (`prisma/migrations`, baseline replaces Alembic 001-004)
- API: REST under `/api/v1` plus a GraphQL federation v2 subgraph on `/graphql`
- Messaging: Kafka via `@omnixys/kafka-ts`, topic `gateway.delivery.status`
- Providers: Evolution (WhatsApp), Resend (email), Stalwart (SMTP fallback)
- Tests: `node --test`; `__tests__/unit` and `__tests__/integration` in plain ESM

## Workflow

### 1. Understand the change

- Identify the affected gateway controller, resolver, service, or model interface. Model types stay
  framework independent where possible; adapter and Prisma modules implement service interfaces.
- Inspect the consumers of the GraphQL operations, the REST routes and the Kafka events you may touch. The GraphQL
  field and enum names stay snake_case; the gateway BFF depends on them.
- Decide whether the route is public. Health probes and webhooks are `@Public()`; everything else, GraphQL included,
  requires `x-internal-api-key`. Never weaken authentication or authorization to make a test pass.

### 2. Implement

- Keep gateway business behavior in the existing `controllers`, `resolvers`, `services`, `errors`,
  `models`, and `utils` folders of `src/communication-gateway`. Put provider and event adapters in
  `src/adapter`, persistence in `src/prisma`, and shared service concerns in their named directories.
  Compose them in the static `src/app.module.ts` as the user and event services do.
  Do not introduce technical layer folders such as `domain`, `application`, `api`, or `infrastructure` inside the context.
- Reuse `@omnixys/*` packages (logger-ts, contracts-ts, kafka-ts, context-ts, cache-ts, observability-ts,
  security-ts) before reimplementing shared infrastructure. Do not add a repository-local copy.
- Keep secrets out of logs and files: SMTP credentials, provider tokens and `INTERNAL_API_KEY` are never logged, and
  tests must never read `.env`; the application loads deployment environment through `dotenv/config`.
- Configuration changes go through the flat `src/config/env.ts` using `SERVICE` and `NODE_ENV` as in the user service. The startup banner is registered in `AppModule`. New optional keys need a default; required keys
  need validation and a line in `.env.example`.
- `DATABASE_URL` is mandatory; startup verifies a real query. Database changes need a new migration on top of `20260101000000_init`. Never edit an applied migration, and keep
  index and constraint names aligned with the SQL baseline.

### 3. Write tests

- Unit tests exercise isolated business behavior: configuration parsing, domain rules, provider adapters, webhook
  verification, the event bus, the outbox worker and the HTTP forwarder.
- API integration tests use Fastify request injection. PostgreSQL persistence is exercised against an isolated
  Testcontainers instance when a container runtime is available.
- The service-internal integration suite runs only through the local harness:
  `OMNIXYS_TEST_DB_PASSWORD='postgres' node ../test-tools/run-local-integration.mjs communication-gateway -- pnpm run test:integration`
  (from the repository root). Map every public method to a test with
  `@covers Klassenname.methode` in `__tests__/integration/*.test.mjs`; the harness boots the real `AppModule` over an
  isolated PostgreSQL.
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
  - `OMNIXYS_TEST_DB_PASSWORD='postgres' node ../test-tools/run-local-integration.mjs communication-gateway -- pnpm run test:integration` (integration; boots the real app over an isolated PostgreSQL)
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

## Test workflow

Follow `docs/TESTING.md` for the separate unit command and migration-backed container integration requirements. Record executed test evidence and concrete scenarios in `docs/testing-methods.json`; candidate references alone do not establish coverage. Verify the sealing with `node test-tools/method-inventory.mjs --write` followed by `node test-tools/method-inventory.mjs --require-integration --strict` from the `services` folder.

TS unit tests run in the existing Node runner with `--experimental-test-module-mocks`; include both `.test.mjs` and `.test.ts` in the unit command. Run `test:typecheck` after the application build. The environment fixture disables dotenv files explicitly; container connection data must be set before loading the application.
