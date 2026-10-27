# @license GPL-3.0-or-later
# Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# For more information, visit <https://www.gnu.org/licenses/>.
# ---------------------------------------------------------------------------------------
# Dockerfile – Omnixys Communication Gateway Service
# Multi-stage build optimized for security, reproducibility, and minimal runtime size.
# ---------------------------------------------------------------------------------------
# syntax=docker/dockerfile:1.14.0

ARG NODE_VERSION=26.8.1
ARG PNPM_VERSION=11.24.0

# ---------------------------------------------------------------------------------------
# Stage 0: Base image
# - Common setup for all later build stages.
# - pnpm is installed as the package manager.
# ---------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
WORKDIR /home/node
RUN npm install -g pnpm@${PNPM_VERSION}

# ---------------------------------------------------------------------------------------
# Stage 1: Production dependencies
# - Installs the dependency tree and generates the Prisma client.
# - The schema is copied first because the postinstall hook needs it.
# ---------------------------------------------------------------------------------------
FROM base AS dependencies
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node prisma ./prisma

RUN --mount=type=secret,id=omnixys_token \
    TOKEN=$(cat /run/secrets/omnixys_token) && \
    echo "@omnixys:registry=https://git.omnixys.com/api/packages/omnixys/npm/" > .npmrc && \
    echo "//git.omnixys.com/api/packages/omnixys/npm/:_authToken=${TOKEN}" >> .npmrc && \
    pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm run prisma:generate && \
    rm -f .npmrc

# ---------------------------------------------------------------------------------------
# Stage 2: Build (dist)
# - Installs all dependencies (including dev) and compiles the TypeScript project.
# - Result: ./dist folder containing the compiled ESM output.
# ---------------------------------------------------------------------------------------
FROM base AS dist
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node prisma ./prisma

RUN --mount=type=secret,id=omnixys_token \
    TOKEN=$(cat /run/secrets/omnixys_token) && \
    echo "@omnixys:registry=https://git.omnixys.com/api/packages/omnixys/npm/" > .npmrc && \
    echo "//git.omnixys.com/api/packages/omnixys/npm/:_authToken=${TOKEN}" >> .npmrc && \
    pnpm install --frozen-lockfile --ignore-scripts && \
    rm -f .npmrc

COPY --chown=node:node tsconfig.json tsconfig.build.json nest-cli.json eslint.config.mjs ./
COPY --chown=node:node .prettierrc.yaml .prettierignore ./
COPY --chown=node:node src ./src
ENV CI=true
RUN pnpm run build

# ---------------------------------------------------------------------------------------
# Stage 3: Final runtime image
# - Copies only compiled code and the dependency tree.
# - Runs the app as a non-root user for security.
# ---------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS final

# ----- Build-time arguments -----
ARG NODE_VERSION
ARG APP_NAME
ARG APP_VERSION
ARG CREATED
ARG REVISION

# ----- Image metadata (OCI compliant) -----
LABEL org.opencontainers.image.title="${APP_NAME}-service" \
      org.opencontainers.image.description="Omnixys ${APP_NAME}-service – Node.js ${NODE_VERSION}, built with TypeScript and NestJS, version ${APP_VERSION}, based on Debian Bookworm." \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.licenses="GPL-3.0-or-later" \
      org.opencontainers.image.vendor="Omnixys Technologies" \
      org.opencontainers.image.authors="caleb.gyamfi@omnixys.com" \
      org.opencontainers.image.base.name="node:${NODE_VERSION}-bookworm-slim" \
      org.opencontainers.image.url="https://git.omnixys.com/omnixys/${APP_NAME}-service" \
      org.opencontainers.image.source="https://git.omnixys.com/omnixys/${APP_NAME}-service" \
      org.opencontainers.image.created="${CREATED}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.documentation="https://git.omnixys.com/omnixys/${APP_NAME}-service/blob/main/README.md"

# ----- Set working directory -----
WORKDIR /opt/app

# ----- Environment configuration -----
# NODE_ENV=production ensures that dev dependencies are ignored and improves runtime performance.
# TZ=UTC ensures consistent timestamps across environments.
# PORT keeps the port of the previous Python runtime, see docs/port-convention.md.
ENV NODE_ENV=production \
    TZ=UTC \
    PORT=8000

# ----- Install required system packages -----
# dumb-init: lightweight init system for proper signal handling.
# wget + ca-certificates: used for health checks and secure HTTPS.
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init wget ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* && \
    mkdir -p /opt/app/log && chown -R node:node /opt/app

# ----- Enable pnpm (runtime) -----
RUN npm install -g pnpm@${PNPM_VERSION}

# ----- Switch to non-root user -----
USER node

# ----- Copy built artifacts and dependencies -----
COPY --from=dependencies --chown=node:node /home/node/node_modules ./node_modules
COPY --from=dist --chown=node:node /home/node/dist ./dist
COPY --chown=node:node package.json ./
# The Prisma CLI applies the SQL migrations on start, which replaces the
# `alembic upgrade head` call of the previous image.
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node scripts ./scripts

# ----- Expose application port -----
EXPOSE 8000

# ----- Healthcheck -----
# Ensures that Docker and orchestration systems (e.g., Kubernetes) can detect unhealthy containers.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8000/health || exit 1

# ----- Start command -----
# dumb-init ensures proper signal forwarding and zombie process cleanup.
# RUN_MIGRATIONS=false skips the schema step for a read replica or a test run.
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "if [ \"${RUN_MIGRATIONS:-true}\" = \"true\" ]; then pnpm run prisma:deploy; fi && exec node dist/main.js"]
