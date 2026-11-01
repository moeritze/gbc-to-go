# Security policy

## Supported versions

Only the latest release gets fixes. Update by checking out the newest tag (see [CHANGELOG.md](CHANGELOG.md)) and redeploying.

## Reporting a vulnerability

Please do not open a public issue. Report it privately via **Security > Report a vulnerability** on this repository (GitHub private vulnerability reporting).

Include what is affected (Firestore rules, sign-in, deploy scripts, web app), steps to reproduce, and the impact. I aim to reply within a week (single maintainer, best effort).

## Scope

In scope: the Firestore rules in `rules/`, the web app in `web/`, the scripts in `scripts/`, and the CI workflows in `.github/workflows/`.

Out of scope: your own Firebase project configuration, Firebase or Google services themselves, and ROM files. Never attach ROMs, BIOS files or credentials to a report.
