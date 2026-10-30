# AGENTS.md

Guide for coding agents working on gbc-to-go: a single-owner Game Boy / Game Boy Color web player on a free Firebase Spark project. Humans: see [README.md](README.md).

## SECURITY (read before any setup step)

- **One owner account only.** The Firestore rules allow exactly one UID (`OWNER_UID`). Never create extra accounts, never add a second UID.
- **The password is generated and shown once.** `scripts/create-owner.mjs` prints it a single time. Never write it to a file, commit, issue, log or memory. Only exception: for the rules check the human may put it in `.env.test.local` themselves (step 8); you never create, read, `cat` or echo that file. Never pick or suggest a password yourself.
- **Never commit** `deploy.env`, `web/firebase-config.js`, `.firebaserc`, `.env.test.local`, or any `*.gb`, `*.gbc`, `*.sav`. Check `git status` before every commit.
- **Never deploy with a placeholder `OWNER_UID`** (empty, `abc123`, `your-uid`, ...). `scripts/deploy.mjs` refuses an empty or malformed value; a well-formed fake one would still lock the owner out. Use the UID that `create-owner.mjs` wrote.
- **Never upgrade the project to Blaze**, and never add Cloud Storage or Cloud Functions.
- **Never commit or upload ROMs** to the repo. ROMs go in through the app's upload button only.

## Start here (beginner)

The human says "set this up for me". You create their own free Firebase project, deploy the site and make one owner account. It takes about 15-20 minutes, is free, and needs no credit card.

- **Detect the OS.** On Windows, you run every command (through Node/npx); tell the human to use you, not copy-paste into `cmd`. Where docs say `cp`, write the file yourself.
- **Check prerequisites:** run `node --version` (needs 20+) and `git --version`. If Node is missing or older, the human installs the LTS from https://nodejs.org/, then reopens the terminal and you. Run `npm install`; its install-script warnings are harmless. `gcloud` is optional.
- **Keep a numbered checklist visible** (the runbook steps below) and tick it off as you go.
- **At each human step** give the exact URL, what to click, and what to reply ("tell me 'done'").
- **If any console page offers "Upgrade" or asks for billing:** tell the human to close it. Nothing here needs it.

## Setup runbook

All CLI calls use `npx -y firebase-tools@15.34.2` (pinned; keep this version). Steps marked **ask the human** need the Firebase console or a human decision: stop and ask, then continue.

Prerequisites: Node.js 20+, `npm install` done.

1. **Log in.** Check with `npx -y firebase-tools@15.34.2 projects:list`. If not logged in, run `npx -y firebase-tools@15.34.2 login`. Inside an AI agent firebase-tools runs non-interactively and does not open a browser: it prints a URL. Give the human that URL, they sign in and paste back the code, then you run `npx -y firebase-tools@15.34.2 login <code>`. In a plain terminal it opens a browser.
2. **Create the project** (Spark by default; never upgrade). Propose the ID `gbc-to-go-<random 4-6 digits>` and **ask the human** to confirm. The site URL will be `<project-id>.web.app`.
   ```sh
   npx -y firebase-tools@15.34.2 projects:create <project-id> --display-name gbc-to-go
   ```
   `<project-id>` must be globally unique (6-30 chars, lowercase, digits, hyphens). If it is taken, pick a new suffix. If it fails with "has not accepted the Firebase Terms of Service" (first-time Firebase users), **ask the human** to open https://console.firebase.google.com/?forceCheckTos=true, accept, and tell you 'done'; then retry. Then:
   ```sh
   cp deploy.env.example deploy.env   # set PROJECT=<project-id>, leave OWNER_UID= empty
   ```
3. **Create the web app and write its config:**
   ```sh
   npx -y firebase-tools@15.34.2 apps:create web gbc-to-go --project <project-id>
   npx -y firebase-tools@15.34.2 apps:sdkconfig web <app-id> --project <project-id>
   ```
   `apps:create` ends with a line `firebase apps:sdkconfig WEB <app-id>`: take the app ID from there. It also creates the default Hosting site named after the project ID. `apps:sdkconfig` prints a JSON config. Copy `web/firebase-config.example.js` to `web/firebase-config.js` and fill `firebaseConfig` with only `apiKey`, `authDomain`, `projectId` and `appId` from that JSON. Keep `appCheckSiteKey = ''`.
4. **Create Firestore `(default)`.** **Ask the human** for a region: suggest `eur3` (Europe) or `nam5` (US) multi-region. It cannot be changed later. (`npx -y firebase-tools@15.34.2 firestore:locations` lists all.) The free tier applies to the `(default)` database only.
   ```sh
   npx -y firebase-tools@15.34.2 firestore:databases:create "(default)" --location=<region> --project <project-id>
   ```
   On a brand-new project this can fail with HTTP 403 "Cloud Firestore API has not been used in project ... or it is disabled". Fix: `gcloud services enable firestore.googleapis.com --project <project-id>`; if `gcloud` is not installed, **ask the human** to open the URL from the error and click Enable. Wait a minute, retry. The new database denies everything until step 7 deploys the rules.
5. **Enable Email/Password sign-in.** **Ask the human.** The CLI cannot do this: a new project has no Auth config yet (the Identity Toolkit admin API returns `CONFIGURATION_NOT_FOUND`). The human opens `https://console.firebase.google.com/project/<project-id>/authentication` > Get started > Sign-in method > Email/Password > Enable > Save. Wait for them to confirm.
6. **Create the owner account.** **Ask the human** for the owner email and repeat it back. There is no email verification: a typo makes password reset impossible. The password must only appear in the human's own terminal. Tell them, with the real absolute repo path:
   > Open Terminal (Mac: Cmd+Space, type Terminal; Windows: open "Git Bash", "Terminal" or "PowerShell"; any shell works), run `cd <absolute repo path>` then `node scripts/create-owner.mjs <email>`, save the password in a password manager, then tell me 'done'.

   Do not run `create-owner.mjs` through your own shell (the password would enter your context) unless the human explicitly prefers that. If you do, show the printed password to the human once, tell them to store it in their password manager, and never repeat or save it. The script writes `OWNER_UID=<uid>` into `deploy.env`. Errors are self-explaining (sign-in not enabled, sign-ups disabled, email in use, bad config).

   Lost password: Firebase console > Authentication > Users > ⋮ > Reset password (sends mail to the owner email). Or delete the user there, clear `OWNER_UID=` in `deploy.env`, rerun `create-owner.mjs`, redeploy.
7. **Deploy:**
   ```sh
   npm run deploy -- --dry-run   # optional: checks config, writes .build/firestore.rules, prints the deploy command
   npm run deploy
   ```
   The script (`scripts/deploy.mjs`, plain Node, works on Windows) refuses a missing `deploy.env`, a placeholder `PROJECT`, a malformed `OWNER_UID`, or a `PROJECT` that does not match `projectId` in `web/firebase-config.js`. It substitutes `OWNER_UID` into `rules/firestore.rules`, deploys hosting + Firestore rules, and checks that `https://<project-id>.web.app/` returns 200. Hosting uses the project's default site `<project-id>.web.app`; no `hosting` init is needed. If deploy says the site is missing, run `npx -y firebase-tools@15.34.2 hosting:sites:create <project-id> --project <project-id>` (the site ID must equal the project ID, because deploy checks `<project-id>.web.app`), then deploy again.
8. **Verify the rules.** **Ask the human** to create `.env.test.local` (gitignored) themselves in a text editor with `OWNER_EMAIL=...` and `OWNER_PASSWORD=...`, run `node scripts/verify-rules.mjs` in their own terminal, and delete the file afterwards. You never create, read, `cat` or echo that file. Do not put the password on the command line (shell history). See the checklist below.
9. **Optional App Check.** **Ask the human** whether they want it. If yes, they create a reCAPTCHA v3 key and register it in App Check (README step 7); you set `appCheckSiteKey` in `web/firebase-config.js` and redeploy; they click Enforce for Cloud Firestore after the site still works.
10. **Finish.** Give the human the URL `https://<project-id>.web.app/`. They sign in on their phone, upload one `.gb`/`.gbc` via **＋**, and play. Explain Add to Home Screen (iPhone Safari: Share > Add to Home Screen; Android Chrome: ⋮ > Add to Home screen).
11. **Optional: disable new sign-ups.** **Ask the human**, after the rules check passed: Authentication > Settings > User actions > untick "Enable create (sign-up)".
12. **Remind the human:** `deploy.env` and `web/firebase-config.js` stay local. Never commit or share them.

## Verification checklist

Run after every deploy of a new instance. All must hold:

- [ ] `https://<project-id>.web.app/` returns 200.
- [ ] `node scripts/verify-rules.mjs` prints only PASS. It reads `OWNER_EMAIL`/`OWNER_PASSWORD` from the env or from a gitignored `.env.test.local`; prefer the file, written and deleted by the human (step 8), over env vars on the command line. It signs in as the owner and creates and deletes a throwaway user, so run it **before** disabling sign-ups. Ask the human to run it if you do not have the password. It checks: owner can read/write `settings/main`; a throwaway user is denied on `roms/x`, `saves/x`, `states/x`, `settings/main`; an oversize chunk (921601 bytes) is denied for the owner; the throwaway user is deleted afterwards.
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
