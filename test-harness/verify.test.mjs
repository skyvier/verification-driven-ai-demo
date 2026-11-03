import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const verifier = resolve('scripts/verify-candidate.sh');

test('verification copies the complete implementation while preserving trusted tests', () => {
  const directory = mkdtempSync(join(tmpdir(), 'booking-verifier-test-'));
  try {
    const baseline = join(directory, 'baseline');
    const candidate = join(directory, 'candidate');
    const bin = join(directory, 'bin');
    for (const root of [baseline, candidate]) {
      mkdirSync(join(root, 'src/implementation'), { recursive: true });
      mkdirSync(join(root, 'test'), { recursive: true });
    }
    mkdirSync(bin);
    mkdirSync(join(baseline, 'scripts'));
    writeFileSync(join(baseline, 'scripts/demo-permissions.sh'), "verification_filesystem_permissions='test-profile'\n");
    writeFileSync(join(baseline, 'test/check'), 'trusted');
    writeFileSync(join(candidate, 'test/check'), 'tampered');
    writeFileSync(join(baseline, 'src/implementation/booking-service.ts'), 'stub');
    writeFileSync(join(baseline, 'src/implementation/removed.ts'), 'obsolete');
    writeFileSync(join(candidate, 'src/implementation/booking-service.ts'), 'solution');
    mkdirSync(join(candidate, 'src/implementation/helpers'));
    writeFileSync(join(candidate, 'src/implementation/helpers/check.ts'), 'helper');
    writeFileSync(join(bin, 'npm'), '#!/bin/sh\ntest "$(cat test/check)" = trusted && test "$(cat src/implementation/booking-service.ts)" = solution && test "$(cat src/implementation/helpers/check.ts)" = helper && test ! -e src/implementation/removed.ts\n', { mode: 0o755 });
    writeFileSync(join(bin, 'codex'), '#!/bin/sh\nwhile [ "$1" != "-C" ]; do shift; done\ncd "$2"\nwhile [ "$1" != "--" ]; do shift; done\nshift\nexec "$@"\n', { mode: 0o755 });
    const result = spawnSync('sh', [verifier, baseline, candidate], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(baseline, 'src/implementation/booking-service.ts'), 'utf8'), 'stub');

    writeFileSync(join(candidate, 'src/implementation/booking-service.ts'), 'incorrect');
    const failure = spawnSync('sh', [verifier, baseline, candidate], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8',
    });
    assert.notEqual(failure.status, 0);
    writeFileSync(join(candidate, 'src/implementation/booking-service.ts'), 'solution');
    execFileSync('ln', ['-s', join(baseline, 'test/check'), join(candidate, 'src/implementation/helpers/link.ts')]);
    const nestedSymlink = spawnSync('sh', [verifier, baseline, candidate], { encoding: 'utf8' });
    assert.notEqual(nestedSymlink.status, 0);
    assert.match(nestedSymlink.stderr, /only regular files and directories/);
    rmSync(join(candidate, 'src/implementation/helpers/link.ts'));
    execFileSync('ln', ['-sf', join(baseline, 'test/check'), join(candidate, 'src/implementation/booking-service.ts')]);
    const symlink = spawnSync('sh', [verifier, baseline, candidate], { encoding: 'utf8' });
    assert.notEqual(symlink.status, 0);
    assert.match(symlink.stderr, /regular file, not a symlink/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
