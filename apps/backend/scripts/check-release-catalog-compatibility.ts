import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertReleaseCatalogCompatible } from '../src/release-announcement/release-announcement-compatibility';
import { validateReleaseCatalog } from '../src/release-announcement/release-announcement-catalog';

const catalogGitPath =
  'apps/backend/src/release-announcement/data/releases.json';
const backendRoot = resolve(__dirname, '..');
const repositoryRoot = resolve(backendRoot, '../..');
const currentCatalogPath = resolve(
  backendRoot,
  'src/release-announcement/data/releases.json',
);

function readPreviousCatalog(baseSha: string) {
  if (/^0+$/.test(baseSha)) return [];

  execFileSync('git', ['cat-file', '-e', `${baseSha}^{commit}`], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  });

  try {
    execFileSync('git', ['cat-file', '-e', `${baseSha}:${catalogGitPath}`], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
  } catch {
    return [];
  }

  const previousJson = execFileSync(
    'git',
    ['show', `${baseSha}:${catalogGitPath}`],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  return validateReleaseCatalog(JSON.parse(previousJson) as unknown);
}

function main() {
  const baseSha = process.env.RELEASE_CATALOG_BASE_SHA;
  if (!baseSha) {
    throw new Error(
      'RELEASE_CATALOG_BASE_SHA must identify the comparison commit',
    );
  }

  const previous = readPreviousCatalog(baseSha);
  const current = validateReleaseCatalog(
    JSON.parse(readFileSync(currentCatalogPath, 'utf8')) as unknown,
  );
  assertReleaseCatalogCompatible(previous, current);
  console.log(
    `Release catalog is compatible with ${baseSha} (${previous.length} previous, ${current.length} current releases)`,
  );
}

main();
