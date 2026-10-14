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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import './../support/env.mjs';

import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { analyzeCommits } from '@semantic-release/commit-analyzer';

import releaseConfig from '../../release.config.js';

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const COMMIT_ANALYZER = releaseConfig.plugins.find(
  (plugin) =>
    Array.isArray(plugin) && plugin[0] === '@semantic-release/commit-analyzer',
);

const silentLogger = { log: () => {} };

async function releaseTypeFor(message) {
  return analyzeCommits(COMMIT_ANALYZER[1], {
    commits: [
      { hash: '0'.repeat(40), message, gitTags: '', committerDate: new Date() },
    ],
    logger: silentLogger,
    cwd: REPOSITORY_ROOT,
  });
}

describe('release.config.js', () => {
  it('configures the commit analyzer', () => {
    assert.ok(COMMIT_ANALYZER, 'the commit analyzer plugin is configured');
    assert.equal(COMMIT_ANALYZER[1].preset, 'conventionalcommits');
  });

  it('releases a major version for a breaking change marker', async () => {
    assert.equal(
      await releaseTypeFor('feat!: drop the python runtime\n'),
      'major',
    );
    assert.equal(await releaseTypeFor('fix!: incompatible fix\n'), 'major');
  });

  it('releases a major version for a breaking change footer', async () => {
    assert.equal(
      await releaseTypeFor(
        'chore: replace the runtime\n\nBREAKING CHANGE: the entrypoint changed.\n',
      ),
      'major',
    );
  });

  it('releases a major version for a breaking chore, not nothing', async () => {
    assert.equal(
      await releaseTypeFor('chore!: replace python with nestjs\n'),
      'major',
    );
  });

  it('maps a feature to a minor and a fix to a patch release', async () => {
    assert.equal(await releaseTypeFor('feat: add a provider\n'), 'minor');
    assert.equal(
      await releaseTypeFor('fix(core): close the bus on shutdown\n'),
      'patch',
    );
  });

  it('releases nothing for housekeeping types', async () => {
    for (const message of [
      'chore: bump a toolchain\n',
      'ci: run on node 26\n',
      'docs: rewrite the guide\n',
      'test: cover the registry\n',
      'build: ship an image\n',
      'style: reformat\n',
    ]) {
      assert.equal(await releaseTypeFor(message), null, message);
    }
  });

  it('bumps package.json instead of the removed python project files', () => {
    const exec = releaseConfig.plugins.find(
      (plugin) =>
        Array.isArray(plugin) && plugin[0] === '@semantic-release/exec',
    );
    assert.equal(exec, undefined, 'no exec plugin rewrites pyproject.toml');

    const npm = releaseConfig.plugins.find(
      (plugin) =>
        Array.isArray(plugin) && plugin[0] === '@semantic-release/npm',
    );
    assert.ok(npm, 'the npm plugin writes the version');
    assert.equal(
      npm[1].npmPublish,
      false,
      'the service is not published to npm',
    );

    const git = releaseConfig.plugins.find(
      (plugin) =>
        Array.isArray(plugin) && plugin[0] === '@semantic-release/git',
    );
    assert.ok(git);
    for (const asset of git[1].assets) {
      assert.ok(
        ['package.json', 'pnpm-lock.yaml', 'CHANGELOG.md'].includes(asset),
        `${asset} is committed back and still exists in the repository`,
      );
    }
  });
});
