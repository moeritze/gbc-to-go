# Contributing

Thanks for helping. Ideas, bug reports and pull requests are all welcome. Good starting points are in the README under **Ideas welcome**.

## Run it locally

1. Set up your own Firebase project once (README **Setup**, steps 1-6). Step 6 deploys the database rules; until then Firestore denies everything. There is no local fake backend: you develop against your own real project.
2. Serve the `web/` folder with any static server, for example:
   ```sh
   python3 -m http.server 8000 -d web
   ```
3. Open `http://localhost:8000/` and sign in with your owner account. `localhost` is an authorized Auth domain by default, so sign-in works there.

No build step: edit a file, reload the page.

## Test

```sh
npm test
```

- Tests cover pure logic (ROM header, chunking, save picking, settings). Add one for any new logic.
- Do not use Firebase emulators. Check Firebase behaviour against your own project.

## Keep it free (Spark plan)

- Only Firebase Hosting, Authentication and Firestore `(default)`.
- No Cloud Storage, no Cloud Functions, nothing that needs the Blaze plan or a credit card.
- Keep Firestore documents under 1 MiB (ROM chunks are at most 900 KiB).
- Mind the free quota: 1 GiB stored, 50,000 reads/day, 20,000 writes/day. Avoid features that read or write a lot.

## Keep it single-owner

- One owner account per site. The rules allow exactly one UID.
- No sign-up flow, sharing, public libraries or multi-user features.
- Never commit ROMs, saves, `deploy.env` or `web/firebase-config.js`.
- Do not attach or link ROMs or BIOS files in issues or pull requests; such issues will be deleted.

## Code style

- Plain HTML/CSS/JS ES modules. No framework, no bundler.
- One module per concern; one file per screen in `web/screens/`.
- No `window.alert/confirm/prompt`; use the in-app dialog.
- English copy.

## Pull request checklist

- [ ] `npm test` passes.
- [ ] Tried the change on your own deployed site (phone width and desktop if it touches the UI).
- [ ] Still runs on the Spark plan.
- [ ] Still single-owner; rules still deny everyone else.
- [ ] No ROMs, saves, `deploy.env` or `web/firebase-config.js` in the diff.
- [ ] README / AGENTS.md updated if setup or behaviour changed.

## Releasing

Versions follow [semver](https://semver.org/): patch for fixes, minor for features, major for breaking changes.

- Add an entry under `## [Unreleased]` in `CHANGELOG.md` in every PR that changes behavior.
- To release: open a release PR that bumps `version` in `package.json` and `web/version.js`, moves the Unreleased entries into a dated `## [X.Y.Z] - YYYY-MM-DD` section, and updates the compare links at the bottom. Merge it.
- That is all. On the merge to `main`, the Release workflow sees a version without a tag, tags the merge commit `vX.Y.Z` and publishes a GitHub Release from the changelog section. Do not push tags by hand.
