#!/usr/bin/env node
// Creates the single owner account and writes its UID into deploy.env.
// Usage: node scripts/create-owner.mjs you@example.com
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const fail = (msg) => { console.error(`Error: ${msg}`); process.exit(1); };

const email = process.argv[2];
if (!email || !email.includes('@')) fail('usage: node scripts/create-owner.mjs you@example.com');

const configUrl = new URL('../web/firebase-config.js', import.meta.url);
const envUrl = new URL('../deploy.env', import.meta.url);
const envExampleUrl = new URL('../deploy.env.example', import.meta.url);

if (!existsSync(configUrl)) fail('web/firebase-config.js is missing. Copy web/firebase-config.example.js and fill in your web app config first.');
const { firebaseConfig } = await import(configUrl);

let env = existsSync(envUrl) ? readFileSync(envUrl, 'utf8')
  : existsSync(envExampleUrl) ? readFileSync(envExampleUrl, 'utf8') : '';
// Rules allow exactly one UID: never silently replace an existing owner.
const current = env.match(/^OWNER_UID=(.*)$/m)?.[1].trim();
if (current) fail(`deploy.env already has OWNER_UID=${current}. Remove that value first if you really want a new owner account.`);

const password = randomBytes(18).toString('base64url');
let user;
try {
  user = (await createUserWithEmailAndPassword(getAuth(initializeApp(firebaseConfig)), email, password)).user;
} catch (e) {
  const hints = {
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Enable it in the Firebase console: Authentication > Sign-in method > Email/Password.',
    'auth/admin-restricted-operation': 'New sign-ups are disabled for this project. Re-enable them (Authentication > Settings > User actions), run this again, then disable them again.',
    'auth/email-already-in-use': 'An account with this email already exists. Delete it in the Firebase console (Authentication > Users) or use another email.',
    'auth/invalid-email': 'That email address is not valid.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'The apiKey in web/firebase-config.js is not valid. Check the config you copied.',
  };
  fail(hints[e.code] || `${e.code || ''} ${e.message}`);
}

const line = `OWNER_UID=${user.uid}`;
env = /^OWNER_UID=.*$/m.test(env) ? env.replace(/^OWNER_UID=.*$/m, line) : `${env}${env && !env.endsWith('\n') ? '\n' : ''}${line}\n`;
writeFileSync(envUrl, env);

console.log(`
Owner account created.
  Email:    ${email}
  Password: ${password}

Store this in your password manager now. It is not saved anywhere.

Wrote ${line} to deploy.env.`);
process.exit(0); // the Auth SDK keeps timers alive
