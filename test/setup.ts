/**
 * Vitest global setup. Runs once before any test module is imported.
 * We use this to set XDG_DATA_HOME / HOME to a per-test-run temp directory
 * so tests don't pollute the user's real grotto data.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'grotto-test-'));
process.env.HOME = home;
process.env.XDG_DATA_HOME = home;
process.env.GROTTO_TEST_HOME = home;
rmSync(join(home, 'grotto', 'db'), { recursive: true, force: true });
