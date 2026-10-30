# gbc-to-go: design

Date: 2026-10-30. Status: draft for approval.

## Intent

A public, forkable repo that lets one person run their own Game Boy / Game Boy Color emulator on the web, on their own free Firebase project. They upload their own ROMs in the browser, play on phone or laptop, and their saves follow them between devices.

Why: the owner built a similar private player (poke-recomp, binjgb + Firebase). This generalises it so anyone can fork, follow the instructions (by hand or with a coding agent), and have their own site live, without a credit card.

The owner's own hosted instance is the proof of concept and stays private to them. Auth (and optionally App Check) exists only to keep strangers out.

## Goals

- Free: Firebase Spark plan only. Hosting, Auth, Firestore. No Cloud Storage (needs Blaze since 2024-10-30, see [Firebase FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)), no Cloud Functions.
- One player per deployment. Exactly one account; everything else gets nothing.
- Upload `.gb` / `.gbc` ROMs in the web app; library to switch between them.
- In-game (battery) saves synced to the cloud, and save states. Both toggleable.
- Works on phone (touch pad) and laptop (keyboard).
- Setup instructions for humans (`README.md`) and for agents (`AGENTS.md`, `CLAUDE.md` pointing to it), so a fork reaches a live site with minimal guessing.
- Open repo that invites contributions and mods.

## Non-goals

- Multi-user, sharing, public libraries, sign-up flows.
- Box art or any fetched metadata.
- Link cable, netplay, cheats, rewind, fast-forward, shaders (all good future contributions).
- Offline play / service worker (future contribution).
- Other systems (GBA, NES).

## Anti-goals (failure even if it works)

- ROMs reachable by anyone but the owner, or committed to the repo.
- A setup that needs a credit card or the Blaze plan.
- A fork that goes live with a known default password.
- A framework/build pipeline that makes casual contributions hard.

## Constraints

- Firestore document limit 1 MiB; Spark: 1 GiB stored, 50k reads/day, 20k writes/day.
- GB/GBC ROMs are 32 KiB to 8 MiB.
- Emulator core: binjgb (MIT, WASM), vendored as in poke-recomp (`~/repositories/poke-recomp/web/vendor/`).
- No Firebase emulators anywhere (owner's rule). Tests run on pure logic; integration checks use the live project.

## Decided

### Stack
- Plain HTML/CSS/JS ES modules in `web/`, no framework, no bundler. Firebase JS SDK (modular) from the gstatic CDN, pinned version.
- Firebase Hosting serves `web/`. Firestore `(default)` database. Firebase Auth email/password.
- Reuse from poke-recomp: `player.js` (binjgb wrapper, SRAM load/dirty callback, audio), `touch.js` (gamepad), save logic patterns. Copy and adapt; no dependency on that repo.

### Access (single owner)
- Setup creates exactly one Auth user (email/password).
- Firestore rules allow read/write only when `request.auth.uid == OWNER_UID`. The UID is substituted into a rules template at deploy (pattern: poke-recomp `rules/firestore.rules` + `scripts/deploy.mjs`). Accounts anyone else creates get nothing.
- Password: the setup step generates a random password and shows it once; never committed. *(Claude's call; owner first suggested a plain-text default with a loud warning. Generated avoids forks going live with a known password.)*
- App Check (reCAPTCHA v3): optional, documented step. If `appCheckSiteKey` is set in `web/firebase-config.js` the app initialises it. Enabled on the owner's instance, off by default for forks.

### Data model (Firestore)
- `roms/{romId}`: `romId` = SHA-1 hex of ROM bytes. Fields: `title` (from ROM header 0x134), `cgb` (bool, header 0x143), `size`, `chunks` (count), `uploadedAt`, `lastPlayedAt`.
- `roms/{romId}/chunks/{n}`: `{ data: bytes }`, at most 900 KiB each. Written in one batched write with the meta doc (meta written last or in the same batch so a half upload never shows in the library).
- `saves/{romId}`: `{ sram: bytes, updatedAt }`. Last write wins. `sram` is the core's full ext-RAM file as binjgb returns it, stored opaque. *(Claude's call: the builder checks whether the vendored binjgb includes MBC3 RTC data in that file. If yes, clock games such as Pokémon Gold/Silver/Crystal keep their clock for free. If no, the README notes that the RTC only persists through save states, and RTC support goes on the ideas list.)*
- `states/{romId}`: `{ state: bytes, updatedAt }`. One slot per ROM.
- `settings/main`: the toggles below.
- Rules enforce owner-only plus size caps (chunk ≤ 900 KiB, sram ≤ 128 KiB, state < 1 MiB).
- Each device caches ROM bytes in IndexedDB by `romId`, so Firestore chunk reads happen once per device per ROM.
- Uploading the same ROM twice is a no-op (same SHA-1).
- Deleting a ROM deletes its chunks, save and state, after an in-app confirm (no `window.confirm`).

### Screens (mockup option B chosen)
1. **Sign in**: email, password, button. No sign-up link.
2. **Home = library**: header with app name, Upload (＋), Settings (⚙). Big "Continue: <last played>" button. Grid of tiles: title, GB/GBC badge, save/state markers. Tile tap plays; long-press or ⋯ for delete.
3. **Settings**: Cloud in-game saves (on), Save states (on), Auto save state on exit (off), Touch pad (auto / on / off), Sound (on), Sign out. Stored in `settings/main`.
4. **Play**: back to menu, save status pill, 160×144 canvas scaled pixelated, Save state / Load state (hidden when save states are off), touch pad, keyboard on desktop.

Toggle meaning:
- Cloud in-game saves off: SRAM saved to IndexedDB only on that device.
- Save states off: no state buttons, no state writes.
- Auto save state on exit: writes a state when leaving Play or when the tab is hidden.

### Repo and open source
- Repo `moeritze/gbc-to-go`, public, MIT license (binjgb licence kept in `web/vendor/`).
- `README.md`: what it is, legal note (bring your own legally dumped ROMs; they stay in your project), setup click-by-click, "Ideas welcome" list of the non-goals above.
- `AGENTS.md` (+ `CLAUDE.md` with `@AGENTS.md`): setup runbook an agent can execute with the Firebase CLI, marking which steps need the human in the Firebase console, and a verification checklist. Includes a prominent security alert about the owner account and password.
- `CONTRIBUTING.md`, GitHub issue templates (bug, feature).
- `.gitignore` blocks `*.gb`, `*.gbc`, `*.sav`, `.firebaserc`, `deploy.env` (project ID, owner UID) and `web/firebase-config.js`. The repo ships `deploy.env.example` and `web/firebase-config.example.js`; setup copies and fills them. So the owner's instance deploys from the public repo without its config being committed, and forks never point at the owner's project. *(Claude's call.)*
- Small modules so mods stay local: `emulator.js`, `roms.js`, `saves.js`, `settings.js`, one file per screen.
- `.claude/autonomy.json` with `stage: dev`.

### Proof of concept
- Owner approved: Claude creates a new Spark Firebase project (e.g. `gbc-to-go`) with the CLI, enables Firestore `(default)` and Auth email/password, deploys, and creates the owner account. The generated password is shown once in the terminal only.
- The public GitHub repo `moeritze/gbc-to-go` is created and pushed only after the PoC works.
- Deploy the owner's instance to their Firebase project, create their owner account, upload a ROM, play, save, reload on another device size, confirm the save persists.

## Left to the builder

- File layout beyond the modules named above; CSS look (calm, dark, game screen is the focus; may borrow poke-recomp tokens).
- How the owner user gets created (console click vs. a small script using the web API key), as long as the runbook is clear.
- Exact binjgb state API usage (`emulator_write_state` / `emulator_read_state`), confirmed against the vendored build.
- Upload progress UI, error copy, empty-library state.
- Unit tests for pure logic: ROM header parse, chunk split/join, save-key logic.
