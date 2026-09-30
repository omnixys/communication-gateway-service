-- SPDX-License-Identifier: GPL-3.0-or-later
-- Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
-- See the GNU General Public License for more details.
--
-- For more information, visit <https://www.gnu.org/licenses/>.

-- Baseline schema of the communication gateway.
--
-- The result matches the end state of the previous Alembic chain
-- (001_initial, 002_add_message_mappings, 003_unique_provider_message_id,
-- 004_analytics_outbox) so existing databases need no data migration.

CREATE TABLE IF NOT EXISTS "provider_configs" (
    "id"           VARCHAR(36)  NOT NULL,
    "provider_type" VARCHAR(50) NOT NULL,
    "enabled"      BOOLEAN      NOT NULL DEFAULT true,
    "settings"     JSONB,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_configs_provider_type_key"
    ON "provider_configs" ("provider_type");

CREATE TABLE IF NOT EXISTS "provider_connections" (
    "id"            VARCHAR(36) NOT NULL,
    "provider_type" VARCHAR(50) NOT NULL,
    "status"        VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    "details"       JSONB,
    "connected_at"  TIMESTAMP(3),
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "delivery_logs" (
    "id"                 VARCHAR(36)   NOT NULL,
    "message_id"         VARCHAR(36)   NOT NULL,
    "provider_type"      VARCHAR(50)   NOT NULL,
    "status"             VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    "provider_message_id" VARCHAR(255),
    "error"              TEXT,
    "attempts"           INTEGER       NOT NULL DEFAULT 0,
    "created_at"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id"          VARCHAR(36)   NOT NULL DEFAULT '',
    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_delivery_logs_message_id"
    ON "delivery_logs" ("message_id");

CREATE TABLE IF NOT EXISTS "message_mappings" (
    "id"                  VARCHAR(36)   NOT NULL,
    "internal_id"         VARCHAR(36)   NOT NULL,
    "provider_message_id" VARCHAR(255)  NOT NULL,
    "provider"            VARCHAR(50)   NOT NULL,
    "channel"             VARCHAR(20)   NOT NULL,
    "conversation_id"     VARCHAR(36)   NOT NULL,
    "sender"              VARCHAR(255)  NOT NULL DEFAULT '',
    "recipient"           VARCHAR(255)  NOT NULL DEFAULT '',
    "status"              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    "tenant_id"           VARCHAR(36)   NOT NULL DEFAULT '',
    "organization_id"     VARCHAR(36)   NOT NULL DEFAULT '',
    "provider_instance"   VARCHAR(100)  NOT NULL DEFAULT '',
    "retry_count"         INTEGER       NOT NULL DEFAULT 0,
    "last_status_change"  TIMESTAMP(3),
    "last_error"          TEXT,
    "metadata"            JSONB,
    "created_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_mappings_internal_id_key"
    ON "message_mappings" ("internal_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_message_mappings_provider_message_id"
    ON "message_mappings" ("provider_message_id");

CREATE INDEX IF NOT EXISTS "ix_message_mappings_internal_id"
    ON "message_mappings" ("internal_id");

CREATE INDEX IF NOT EXISTS "ix_message_mappings_provider_message_id"
    ON "message_mappings" ("provider_message_id");

CREATE INDEX IF NOT EXISTS "ix_message_mappings_conversation_id"
    ON "message_mappings" ("conversation_id");

CREATE INDEX IF NOT EXISTS "ix_message_mappings_provider_provider_msg_id"
    ON "message_mappings" ("provider", "provider_message_id");

CREATE TABLE IF NOT EXISTS "analytics_outbox" (
    "id"                 VARCHAR(36)  NOT NULL,
    "deduplication_key"  VARCHAR(500) NOT NULL,
    "tenant_id"          VARCHAR(36)  NOT NULL,
    "topic"              VARCHAR(200) NOT NULL,
    "payload"            JSONB        NOT NULL,
    "correlation_id"     VARCHAR(255),
    "attempts"           INTEGER      NOT NULL DEFAULT 0,
    "next_attempt_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at"          TIMESTAMP(3),
    "locked_by"          VARCHAR(36),
    "published_at"       TIMESTAMP(3),
    "dead_lettered_at"   TIMESTAMP(3),
    "last_error"         TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_analytics_outbox_deduplication_key"
    ON "analytics_outbox" ("deduplication_key");

CREATE INDEX IF NOT EXISTS "ix_analytics_outbox_tenant_id"
    ON "analytics_outbox" ("tenant_id");

CREATE INDEX IF NOT EXISTS "ix_analytics_outbox_ready"
    ON "analytics_outbox" ("published_at", "dead_lettered_at", "next_attempt_at");
