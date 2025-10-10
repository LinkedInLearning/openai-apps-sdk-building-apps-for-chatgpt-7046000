#!/usr/bin/env node
/**
 * Automated version bump + build + URI report.
 *
 * Features:
 *  - Prompts for semver increment (major/minor/patch) if not passed as first arg
 *  - Updates package.json version
 *  - Runs `npm run build`
 *  - Prints new manifest version + resource URIs
 *  - Provides dry-run mode via --dry
 *
 * Usage:
 *    pnpm bump               # interactive
 *    pnpm bump patch         # non-interactive patch bump
 *    pnpm bump minor --dry   # show result without writing/building
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

type Inc = 'major' | 'minor' | 'patch';

const ROOT = process.cwd();
const pkgPath = path.join(ROOT, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found. Run inside rememberbook-app.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string } & Record<string, any>;

function incVersion(v: string, type: Inc): string {
  const parts = v.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error(`Invalid semver: ${v}`);
  let [maj, min, pat] = parts;
  if (type === 'major') { maj += 1; min = 0; pat = 0; }
  else if (type === 'minor') { min += 1; pat = 0; }
  else { pat += 1; }
  return [maj, min, pat].join('.');
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(question, ans => { rl.close(); res(ans); }));
}

async function main() {
  const argType = process.argv[2] as Inc | undefined;
  const dry = process.argv.includes('--dry');
  let inc: Inc | undefined = argType && ['major','minor','patch'].includes(argType) ? argType : undefined;
  if (!inc) {
    const ans = (await ask('Select increment (major/minor/patch) [patch]: ')).trim().toLowerCase();
    inc = (['major','minor','patch'].includes(ans) ? ans : 'patch') as Inc;
  }

  const oldVersion = pkg.version;
  const newVersion = incVersion(oldVersion, inc);

  console.log(`\nCurrent version: ${oldVersion}`);
  console.log(`Increment type:  ${inc}`);
  console.log(`New version:     ${newVersion}${dry ? ' (dry-run)' : ''}`);

  if (!dry) {
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated package.json version.');
  }

  if (!dry) {
    console.log('\nBuilding project...');
    const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
    if (build.status !== 0) {
      console.error('Build failed; aborting.');
      process.exit(build.status || 1);
    }
  }

  // Read manifest (if exists after build or from previous build in dry mode)
  const manifestPath = path.join(ROOT, 'assets', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as any;
    console.log('\nManifest version:', manifest.version);
    if (manifest.components) {
      console.log('\nComponent Resource URIs:');
      for (const [name, meta] of Object.entries<any>(manifest.components)) {
        console.log(`  - ${name}: ${meta.resourceUri || '(no resourceUri)'}`);
      }
    }
  } else {
    console.warn('Manifest not found (was a build skipped?).');
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
