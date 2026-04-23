#!/bin/sh

set -e

# Usage: ./scripts/publish.sh [--beta]
#   Stable: version in package.json must be a release (no hyphen), e.g. 1.2.0
#   Beta: pass --beta; version must be a prerelease, e.g. 1.2.0-beta.0
# From package.json: pnpm push -- [--beta]

BETA=false
for arg in "$@"; do
  case "$arg" in
    --beta) BETA=true ;;
  esac
done

VERSION=$(node -p "require('./package.json').version")
case "$VERSION" in
  *-*) HAS_PRERELEASE=true ;;
  *) HAS_PRERELEASE=false ;;
esac

if [ "$BETA" = true ]; then
  if [ "$HAS_PRERELEASE" != true ]; then
    echo "Beta release: package.json version must be a prerelease (e.g. 1.2.0-beta.0). Current: $VERSION"
    exit 1
  fi
else
  if [ "$HAS_PRERELEASE" = true ]; then
    echo "Prerelease version in package.json ($VERSION). Use --beta to publish a beta, or bump to a release version."
    exit 1
  fi
fi

# check if the working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Working directory not clean. Please commit all changes before publishing."
  exit 1
fi

# create a new git tag or error out if the tag already exists
if [ "$BETA" = true ]; then
  TAG_MSG="v$VERSION (beta)"
else
  TAG_MSG="v$VERSION"
fi
git tag -a "v$VERSION" -m "$TAG_MSG"

echo "Publishing version: v$VERSION"
if [ "$BETA" = true ]; then
  echo "(CI will publish to npm with dist-tag: beta)"
fi

read -p "Press enter to continue"

git push origin "v$VERSION"
