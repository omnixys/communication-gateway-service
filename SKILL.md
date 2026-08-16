<!-- repository: services/communication-gateway | kind: SERVICE | stack: python -->

# communication-gateway — Skill: Service Development

> Workflow for communication-gateway (services/communication-gateway). Execute this workflow before, during, and
> after changes in this repository.

## Repository Facts

- Kind: Service
- Package: `omnixys-communication-gateway` (version: 1.2.1)
- Runtime: Python >=3.14 (uv)
- Description: Omnixys Communication Gateway – external provider integration layer (email/SMTP and other providers).
- Architecture: src/communication_gateway/ with tests under src/communication_gateway/tests (testpaths in pyproject)
- Database: PostgreSQL via SQLAlchemy 2 async + asyncpg; Migrations: Alembic (migrations/)
- API: GraphQL (Strawberry) on FastAPI
- Messaging: Kafka via omnixys-kafka
- Tests: pytest with pytest-asyncio; tests colocated under src/communication_gateway/tests


## Workflow

### 1. Understand the change

- Identify the affected bounded context within `src/communication_gateway/ with tests under src/communication_gateway/tests (testpaths in pyproject)`.
- Inspect consumers of the GraphQL operations and Kafka events you may touch.
- Never weaken authentication or authorization to make a test pass.

### 2. Implement

- Follow the existing module layout and naming conventions.
- Reuse `omnixys/packages` (shared contracts, cache, kafka, observability, security, ...)
  before reimplementing shared infrastructure.
- Keep tenant isolation intact (`External provider adapters; secrets (SMTP credentials, provider tokens) must never be logged. Ruff select=ALL, mypy strict.`).

### 3. Write tests

- Unit tests exercise isolated business behavior.
- Integration tests cover repository/Prisma, GraphQL, Kafka, and auth boundaries.
- Cover tenant-isolation and error-contract cases when the code path touches them.

### 4. Validate

## Validation

Run each applicable check and record the result as `PASS`, `FAIL`, `PRE-EXISTING
FAILURE`, or `NOT RUN` (with a reason). Never convert `NOT RUN` into `PASS`.

  - `uv sync --frozen`
  - `uv run ruff format --check src/`
  - `uv run ruff check src/`
  - `uv run mypy src/`
  - `uv run pytest -m unit (when markers exist)`
  - `uv run pytest`
  - `uv build (hatchling)`

## Commit

- Use Conventional Commits (`<type>(<scope>): <summary>`), e.g. `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`.
- Stage only files belonging to the logical change. Run `git diff --check` before committing.
- Commit locally; never push.

## Definition of Done

See the "Definition of Done" section in `AGENTS.md`. Before finishing, confirm
`AGENTS.md` and `SKILL.md` remain accurate for this repository.
