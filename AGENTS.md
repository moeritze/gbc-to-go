# AGENTS.md

Guide for coding agents working on gbc-to-go: a single-owner Game Boy / Game Boy Color web player on a free Firebase Spark project. Humans: see [README.md](README.md).

## SECURITY (read before any setup step)

- **One owner account only.** The Firestore rules allow exactly one UID (`OWNER_UID`). Never create extra accounts, never add a second UID.
- **The password is generated and shown once.** `scripts/create-owner.mjs` prints it a single time. Never write it to a file, commit, issue, log or memory. Never pick or suggest a password yourself.
- **Never commit** `deploy.env`, `web/firebase-config.js`, `.firebaserc`, or any `*.gb`, `*.gbc`, `*.sav`. Check `git status` before every commit.
- **Never deploy with a placeholder `OWNER_UID`** (empty, `abc123`, `your-uid`, ...). `scripts/deploy.sh` refuses an empty or malformed value; a well-formed fake one would still lock the owner out. Use the UID that `create-owner.mjs` wrote.
- **Never upgrade the project to Blaze**, and never add Cloud Storage or Cloud Functions.
- **Never commit or upload ROMs** to the repo. ROMs go in through the app's upload button only.

## Setup runbook

All CLI calls use `npx -y firebase-tools@latest`. Steps marked **ask the human** need the Firebase console or a human decision: stop and ask, then continue.

Prerequisites: Node.js 20+, `npm install` done.

1. **Log in.** Check with `npx -y firebase-tools@latest projects:list`. If not logged in, **ask the human** to run `npx -y firebase-tools@latest login` (it opens a browser).
2. **Create the project** (Spark by default; never upgrade):
   ```sh
   npx -y firebase-tools@latest projects:create <project-id> --display-name gbc-to-go
   ```
   `<project-id>` must be globally unique (6-30 chars, lowercase, digits, hyphens). Then:
   ```sh
   cp deploy.env.example deploy.env   # set PROJECT=<project-id>, leave OWNER_UID= empty
   ```
3. **Create the web app and write its config:**
   ```sh
   npx -y firebase-tools@latest apps:create web gbc-to-go --project <project-id>
   npx -y firebase-tools@latest apps:sdkconfig web <app-id> --project <project-id>
   ```
   `apps:create` prints the app ID. Copy `web/firebase-config.example.js` to `web/firebase-config.js` and fill `firebaseConfig` with the values `apps:sdkconfig` prints. Keep `appCheckSiteKey = ''`.
4. **Create Firestore `(default)`.** **Ask the human** for a region near them (`npx -y firebase-tools@latest firestore:locations` lists them). The free tier applies to the `(default)` database only.
   ```sh
   npx -y firebase-tools@latest firestore:databases:create "(default)" --location=<region> --project <project-id>
   ```
5. **Enable Email/Password sign-in.** **Ask the human**: Firebase console > Authentication > Get started > Sign-in method > Email/Password > Enable > Save.
6. **Create the owner account.** **Ask the human** for the owner email. Best: ask the human to run it in their own terminal, so the password never enters your context:
   ```sh
   node scripts/create-owner.mjs <owner-email>
   ```
   If you run it yourself, show the printed password to the human once, tell them to store it in their password manager, and never repeat or save it. The script writes `OWNER_UID=<uid>` into `deploy.env`. Errors are self-explaining (sign-in not enabled, sign-ups disabled, email in use, bad config).
7. **Deploy:**
   ```sh
   DRY_RUN=1 npm run deploy   # optional: prints targets, writes .build/firestore.rules
   npm run deploy
   ```
   The script substitutes `OWNER_UID` into `rules/firestore.rules`, deploys hosting + Firestore rules, and checks that `https://<project-id>.web.app/` returns 200.
8. **Optional App Check.** **Ask the human** whether they want it. If yes, they create a reCAPTCHA v3 key and register it in App Check (README step 7); you set `appCheckSiteKey` in `web/firebase-config.js` and redeploy; they click Enforce for Cloud Firestore after the site still works.
9. **Optional: disable new sign-ups.** **Ask the human**, after verification passes: Authentication > Settings > User actions > untick "Enable create (sign-up)".

## Verification checklist

Run after every deploy of a new instance. All must hold:

- [ ] `https://<project-id>.web.app/` returns 200.
- [ ] `node scripts/verify-rules.mjs` (when present) prints only PASS: owner can read/write `settings/main`; a throwaway user is denied on `roms/x`, `saves/x`, `states/x`, `settings/main`; an oversize chunk (921601 bytes) is denied for the owner; the throwaway user is deleted afterwards.
- [ ] Live smoke at phone width and desktop: sign in, upload a ROM the human provides, play, make an in-game save, save a state, reload, both are restored.
- [ ] A non-owner account sees "This account is not the owner of this site."
- [ ] `git ls-files` lists no ROM, `.sav`, `deploy.env`, `.firebaserc` or `web/firebase-config.js`.

## Repo conventions

- **No build step.** Plain HTML/CSS/JS ES modules in `web/`, served as-is. No framework, no bundler.
- **One module per concern:** `rom.js`, `library.js`, `saves.js`, `settings.js`, `emulator.js`, `touch.js`, `firebase.js`, one file per screen in `web/screens/`. Keep pure logic importable without Firebase side effects.
- **Tests:** `npm test` (Node's built-in test runner, `web/*.test.mjs`). Test pure logic only.
- **No Firebase emulators.** Integration checks run against a real project.
- **Firebase SDK pinned to 13.1.0**: the CDN URLs in `web/firebase.js` and the `firebase` devDependency must match.
- **Spark only:** Hosting, Auth, Firestore `(default)`. ROM chunks stay at most 900 KiB (921600 bytes).
- **No `window.alert/confirm/prompt`**: use the in-app dialog.
- **Single owner:** no sign-up flow, no sharing, no multi-user features.
- Copy in English. MIT license.
