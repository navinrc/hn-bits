#!/usr/bin/env bash
# Cuts a release: bumps version, merges via PR (main is protected), tags, pushes.
# Tag push triggers .github/workflows/release.yml (test, build, GitHub Release, npm publish).
#
# Usage: scripts/release.sh [patch|minor|major] [--yes]
set -euo pipefail

BUMP="${1:-patch}"
case "$BUMP" in
  patch|minor|major) ;;
  *) echo "Usage: $0 [patch|minor|major] [--yes]" >&2; exit 1 ;;
esac
AUTO_YES="${2:-}"

command -v gh >/dev/null || { echo "gh CLI required" >&2; exit 1; }

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash first." >&2
  exit 1
fi

git checkout main
git pull --ff-only origin main

npm version "$BUMP" --no-git-tag-version
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
BRANCH="chore/release-$TAG"

if [[ "$AUTO_YES" != "--yes" ]]; then
  read -r -p "Bump to $TAG via PR, merge, and tag+push to release? [y/N] " REPLY
  [[ "$REPLY" == "y" || "$REPLY" == "Y" ]] || { git checkout -- package.json package-lock.json; exit 1; }
fi

git checkout -b "$BRANCH"
git add package.json package-lock.json
git commit -m "chore(release): $TAG"
git push -u origin "$BRANCH"

gh pr create --base main --head "$BRANCH" --title "chore(release): $TAG" \
  --body "Automated release bump to $TAG."

PR_NUMBER="$(gh pr view "$BRANCH" --json number -q .number)"
gh pr merge "$PR_NUMBER" --squash --delete-branch=true

git checkout main
git fetch origin
git reset --hard origin/main

git tag "$TAG"
git push origin "$TAG"

echo "Tag $TAG pushed. Watching release workflow..."
sleep 5
RUN_ID="$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
gh run watch "$RUN_ID" --exit-status
