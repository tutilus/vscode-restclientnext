#!/usr/bin/env bash
# Simple helper script to cherry-pick a pull request from the upstream
# repository into your current branch. The script assumes you have an
# `upstream` remote configured pointing at the original repo (the one
# you forked from).  If not, add it with:
#
#     git remote add upstream https://github.com/tutilus/vscode-restclientnext.git
#
# Usage: ./scripts/cherry-pick-pr.sh <PR-number>
#
# The script will fetch the head of the pull request, create a temporary
# branch named "pr-<number>", then cherry-pick all commits from that PR
# onto whatever branch you currently have checked out.  After the
# operation it leaves you on your original branch and deletes the temporary
# ref.  Any conflicts must be resolved by hand; the script will abort if
# cherry-pick fails.

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <PR-number>"
    exit 1
fi

PR=$1
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# fetch the pull request head into a temporary branch
echo "Fetching PR #$PR from upstream..."
git fetch upstream pull/${PR}/head:pr-${PR}

echo "Cherry-picking commits from pr-${PR} onto ${ORIG_BRANCH}..."

# compute list of commits in the PR that are not already in the target branch
COMMITS=$(git log --format=%H ${ORIG_BRANCH}..pr-${PR})

if [ -z "$COMMITS" ]; then
    echo "No new commits to cherry-pick (maybe the branch is already merged?)."
    git branch -D pr-${PR} >/dev/null 2>&1 || true
    exit 0
fi

# cherry-pick each commit in order
for commit in $(echo "$COMMITS" | tac); do
    echo "Picking $commit";
    git cherry-pick $commit
done

echo "Cherry-pick finished; cleaning up temporary branch."
git checkout ${ORIG_BRANCH}
git branch -D pr-${PR}

echo "Done.  Please review and push your changes if everything looks good."