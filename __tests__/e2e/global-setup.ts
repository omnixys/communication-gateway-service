import { startInfrastructure } from '../../../test-tools/e2e/infrastructure.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GlobalSetupContext } from 'vitest/node';

import config from './e2e.config.js';

const execFileAsync = promisify(execFile);

export default async function setup({
  provide,
}: GlobalSetupContext): Promise<void> {
  const infra = await startInfrastructure(config);

  // The suite boots the compiled artifact (dist/), exactly like the
  // integration harness, so tsc's decorator metadata is used.
  await execFileAsync('pnpm', ['run', 'build'], { env: { ...process.env } });

  provide<Record<string, string | number | boolean>>('omnixys-e2e', infra.env);
}
