import { stopInfrastructure } from '../../../test-tools/e2e/infrastructure.mjs';
import type { GlobalTeardownContext } from 'vitest/node';

export default async function teardown(
  _context: GlobalTeardownContext,
): Promise<void> {
  await stopInfrastructure();
}
