# Tests: communication-gateway

Die Unit- und Integrationsschicht haben getrennte Nachweise. Eine grüne Unit-Suite ersetzt keinen Test mit echter Datenbank.

## Unit-Tests

Runner: Node test runner.

```sh
node --experimental-test-module-mocks --env-file=__tests__/unit/test.env --test __tests__/unit/*.test.mjs __tests__/unit/*.test.ts
```

Aktueller Nachweis vom 2026-10-11: **PASS**, 336 Tests, Exit 0. `test:unit` baut zuvor frische `dist`-Artefakte und aktiviert `--experimental-test-module-mocks`; historische Integration-/E2E-Suiten sind darin nicht enthalten.

Die [Methodenmatrix](testing-methods.json) enthält 34 enumerierte Methoden. Alle 34 haben manuell beschriebene Szenarien und erfolgreiche Unit-Nachweise. Kandidatenverweise und `@covers` allein zählen nicht als geprüfte Abdeckung.

## Integration (lokaler Harness, Stand 2026-10-11)

Serviceinterne Integration über den lokalen Harness:

```sh
# Vom Ordner communication-gateway aus:
OMNIXYS_TEST_DB_PASSWORD='postgres' node ../test-tools/run-local-integration.mjs communication-gateway -- pnpm run test:integration
```

- Lauf: **59 Integrationstests bestanden**, 0 Fehler, 0 übersprungen, Exit 0 (`__tests__/integration/{api,local-service,persistence,postgres}.test.mjs`). `test:integration` baut zuerst (`pnpm run build`) und führt dann die Integrationstests unter einem isolierten PostgreSQL aus; der Harness verbindet zusätzlich Kafka/Redpanda-Valkey/Keycloak-Konfiguration.
- Abgedeckt sind alle 34 enumerierten Methoden. `local-service.test.mjs` bootet das echte `AppModule` über den Harness und deckt REST (`MessagesController.send`, `ProvidersController.list`/`health`, `WebhooksController.receive`), GraphQL (`ProvidersResolver.providers`/`provider`/`gatewayHealth`), Health-Probes, den `InternalApiKeyGuard`, Dispatch inkl. `DefaultProviderResolver`, Adressauflösung (`DictAddressResolver.resolve` über `recipientId`, `reverseLookup`), Webhook-Flows mit realem `MessageMappingRepository` sowie `incrementRetry`/`health` gegen die echte Datenbank und Bootstrap-/Shutdown-Hooks ab. `api.test.mjs` prüft `WebhooksController.challenge` (GET → 405) über Fastify-Injection; `postgres.test.mjs` prüft `MessageMappingRepository.save`/`getByInternalId` über Testcontainers; `persistence.test.mjs` deckt die Prisma-Lifecycle-Fehlerpfade ab.
- Alle 34 Methoden tragen `integrationVerification` mit `@covers`-Zuordnung und Quell-/Test-/Support-Hashes nach `test-tools/INTEGRATION-CONVENTION.md`. Da die Integrationsexemplare `__tests__/unit/test.env` statt `__tests__/integration/test.env` verwenden, ist die tatsächlich verwendete Env-Datei in den `supportHashes` festgehalten. Keine Methode muss ausgeschlossen werden.
- Container-Verbindungsdaten werden vor dem Laden von Anwendung und Prisma-Konfiguration gesetzt (`configureEnvironment`); die vorhandenen Prisma-Produktionsmigrationen werden verwendet.

## End-to-End / Smoke (Stand 2026-10-12)

Serviceinterner E2E-Lauf über HTTP/GraphQL:

```sh
pnpm run test:e2e
```

- Läuft über **vitest** mit **Testcontainers** (isoliertes PostgreSQL). Kafka ist deaktiviert (`KAFKA_BROKER=''`); kein Valkey, kein Keycloak.
- Konfiguration: `__tests__/e2e/e2e.config.ts` und die geteilte Infrastruktur aus `test-tools/e2e/infrastructure.mjs`. Das Global-Setup baut `dist/`; `__tests__/e2e/setup-e2e.ts` bootet `dist/app.module.js` über den `FastifyAdapter` mit `{ rawBody: true }`, damit die Webhook-HMAC-Verifikation den unveränderten Body sieht.
- Lauf: **PASS**, 10 Tests, Exit 0. Szenarien: Health-Liveness/Readiness, Internal-API-Key-Gate (401 ohne Key, 200 mit Key), REST-Providerliste, GraphQL-Providerliste (unauthent `/errors`, authent `/data`), Webhook-Verifikation (401 ohne Credential, 200 `IGNORED` bei gültigem API-Key und unbekanntem Event, GET-Challenge → 405) und der fail-closed Sende-Pfad ohne erreichbaren Provider (503 `NO_PROVIDER_AVAILABLE`).
- Kein `@covers`; die Methodenmatrix bleibt unverändert, da E2E nicht als Integrationsnachweis zählt.

## Build und statische Prüfungen

```sh
pnpm run build
pnpm run format:check
pnpm run lint
```

Stand 2026-10-11: `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` (check-only) **PASS** (Exit 0); `npx tsc -p tsconfig.json --noEmit` **PASS** (Exit 0); `git diff --check` **PASS**. `pnpm run format:check` meldet **PRE-EXISTING FAILURE** für 8 unveränderte Bestandsdateien (`__tests__/integration/persistence.test.mjs`, `__tests__/support/message-mapping-store.mjs`, `__tests__/unit/{config,domain,events,evolution-provider,http-forwarder,persistence,webhook-service}.test.mjs`); die in dieser Änderung angefassten Integrationsdateien sind Prettier-konform. Die Typprüfung neuer MJS-Tests ist noch nicht durchgängig eingerichtet.

## Arbeitsablauf

Vom Ordner `services` aus:

```sh
node test-tools/method-inventory.mjs --write
node test-tools/method-inventory.mjs --strict
node test-tools/method-inventory.mjs --require-integration --strict
```

Der strikte Audit darf bei fehlenden Nachweisen nicht als erfolgreich gewertet werden. Nach Änderungen an Quelle oder referenziertem Test wird die geprüfte Zuordnung wegen geändertem Hash ungültig. Checkpoint-Vertragstests bleiben eine eigene, unveränderte Testschicht.

Neue TS-Unit-Tests nutzen den vorhandenen Node-Runner mit kontrollierten Modulexporten. `pnpm run test:typecheck` baut aktuelle Deklarationen und prüft Quelle und TS-Unit-Tests. Build, neue Test-Typprüfung sowie Lint/Formatierung der neuen TS-Dateien bestehen. Die gemeinsame Env-Fixture setzt `DOTENV_CONFIG_PATH=/dev/null` und verhindert das Laden der Entwicklerkonfiguration. Historische MJS-Typprüfung und vollständige Service-Prüfungen bleiben offen.
