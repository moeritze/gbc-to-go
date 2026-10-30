#!/usr/bin/env node
// Render owner-only Firestore rules, then deploy hosting + firestore to the Firebase project.
// Usage: node scripts/deploy.mjs [--dry-run]   (--dry-run or DRY_RUN=1 stops after rendering the rules)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIREBASE_TOOLS = 'firebase-tools@15.34.2';
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const fail = (msg) => { console.error(`deploy: ${msg}`); process.exit(1); };

if (!existsSync('deploy.env')) fail('deploy.env missing (copy deploy.env.example to deploy.env)');
const env = Object.fromEntries(readFileSync('deploy.env', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^(['"])(.*)\1$/, '$2')]));
const { PROJECT = '', OWNER_UID = '' } = env;

if (!PROJECT || PROJECT === 'your-project-id' || !/^[a-z0-9-]+$/.test(PROJECT)) {
  fail(`PROJECT=${PROJECT} in deploy.env is not a Firebase project ID. Set it to your project ID.`);
}
if (!/^[A-Za-z0-9]{28}$/.test(OWNER_UID)) {
  fail(`OWNER_UID=${OWNER_UID} in deploy.env is not a Firebase UID — run node scripts/create-owner.mjs`);
}
if (!existsSync('web/firebase-config.js')) fail('web/firebase-config.js missing (copy web/firebase-config.example.js and fill it in)');
const projectId = readFileSync('web/firebase-config.js', 'utf8').match(/\bprojectId['"]?\s*:\s*['"]([^'"]*)['"]/)?.[1];
if (projectId !== PROJECT) fail(`PROJECT=${PROJECT} in deploy.env does not match projectId '${projectId}' in web/firebase-config.js`);

mkdirSync('.build', { recursive: true });
writeFileSync('.build/firestore.rules', readFileSync('rules/firestore.rules', 'utf8').replaceAll('__OWNER_UID__', OWNER_UID));
const args = ['-y', FIREBASE_TOOLS, '--project', PROJECT, 'deploy', '--only', 'hosting,firestore'];
console.log(`deploy: project ${PROJECT}, targets hosting,firestore, rules .build/firestore.rules`);
console.log(`deploy: npx ${args.join(' ')}`);
if (process.argv.includes('--dry-run') || process.env.DRY_RUN === '1') { console.log('deploy: dry run, stopping.'); process.exit(0); }

// Windows needs a shell to find npx.cmd; one command string avoids DEP0190. Args are validated above, so no injection risk.
const run = process.platform === 'win32'
  ? spawnSync(`npx ${args.join(' ')}`, { stdio: 'inherit', shell: true })
  : spawnSync('npx', args, { stdio: 'inherit' });
if (run.status !== 0) fail(`firebase deploy failed (exit ${run.status ?? run.error?.message})`);

const url = `https://${PROJECT}.web.app/`;
const code = await fetch(url).then((r) => r.status, (e) => e.message);
console.log(`deploy: ${url} -> ${code}`);
if (code !== 200) process.exit(1);
