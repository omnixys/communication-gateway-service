/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

/**
 * Normalizes a database connection string for the Prisma client.
 *
 * The deployments still inject the SQLAlchemy flavoured URL
 * (`postgresql+asyncpg://…`, sometimes `postgresql+psycopg://…`) because the
 * Python runtime owned that contract. The Node runtime must consume the very
 * same variable, therefore the driver suffix is stripped here instead of
 * changing the secret in the infrastructure.
 */
export function normalizeDatabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return '';
  }

  return trimmed.replace(
    /^postgres(ql)?(\+[a-z0-9]+)?:\/\//i,
    (_match, _scheme: string | undefined, _driver: string | undefined) =>
      'postgresql://',
  );
}
