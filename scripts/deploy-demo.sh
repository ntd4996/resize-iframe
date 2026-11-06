#!/usr/bin/env bash
# Builds examples/demo and publishes it to the gh-pages branch.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
remote="$(git -C "$root" remote get-url origin)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

npm --prefix "$root" run build
npm --prefix "$root" run build --workspace examples/demo

if git -C "$root" ls-remote --exit-code --heads origin gh-pages >/dev/null; then
  git clone --quiet --depth 1 --branch gh-pages "$remote" "$work"
else
  git -C "$work" init --quiet --initial-branch gh-pages
  git -C "$work" remote add origin "$remote"
fi

find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$root/examples/demo/dist/." "$work/"
git -C "$work" add -A
git -C "$work" diff --cached --quiet && { echo "Nothing to deploy"; exit 0; }
git -C "$work" commit --quiet -m "deploy: demo from $(git -C "$root" rev-parse --short HEAD)"
git -C "$work" push --quiet origin gh-pages
