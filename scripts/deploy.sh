#!/bin/sh
# Render owner-only Firestore rules, then deploy hosting + firestore to the Firebase project.
# Usage: scripts/deploy.sh   (DRY_RUN=1 stops after rendering the rules)
set -eu
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here"
. ./deploy.env

case "${OWNER_UID:-}" in ''|*[!A-Za-z0-9]*) echo "deploy: bad OWNER_UID in deploy.env" >&2; exit 1;; esac
[ -f web/firebase-config.js ] || { echo "deploy: web/firebase-config.js missing (copy firebase-config.example.js)" >&2; exit 1; }

mkdir -p .build
sed "s/__OWNER_UID__/$OWNER_UID/g" rules/firestore.rules > .build/firestore.rules
echo "deploy: project $PROJECT, targets hosting,firestore, rules .build/firestore.rules"
[ -z "${DRY_RUN:-}" ] || { echo "deploy: DRY_RUN, stopping."; exit 0; }

npx -y firebase-tools@latest --project "$PROJECT" deploy --only hosting,firestore
code="$(curl -s -o /dev/null -w '%{http_code}' "https://$PROJECT.web.app/")"
echo "deploy: https://$PROJECT.web.app/ -> $code"
[ "$code" = 200 ]
