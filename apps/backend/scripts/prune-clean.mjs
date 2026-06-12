#!/usr/bin/env node
/**
 * Post-prune cleanup: strip non-runtime files from apps/backend/dist
 * Run after prune-lockfile + copy-workspace-modules (via backend:prune target).
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const distRoot = join(process.cwd(), 'apps/backend/dist');
const sharedModule = join(distRoot, 'workspace_modules/@oneohm-epc/shared');

const sharedStrip = ['src', 'README.md', 'CHANGELOG.md', 'project.json', 'tsup.config.ts', 'tsconfig.json'];

for (const name of sharedStrip) {
  const target = join(sharedModule, name);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

for (const junk of ['tsconfig.tsbuildinfo', 'apps']) {
  const target = join(distRoot, junk);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

const pkgPath = join(distRoot, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (pkg.dependencies) {
    delete pkg.dependencies['@nestjs/testing'];
    delete pkg.dependencies.supertest;
  }

  if (pkg.scripts) {
    const keep = {};
    for (const [key, value] of Object.entries(pkg.scripts)) {
      if (!String(value).includes('ts-node')) {
        keep[key] = value;
      }
    }
    pkg.scripts = keep;
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log('✅ backend dist pruned and cleaned');
