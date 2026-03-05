#!/usr/bin/env bash
# Helper utility to fetch and cherry-pick a pull request from the upstream
# repository. Useful when you want to test or apply specific PRs without
# merging the whole branch into your own fork.
#
# Prerequisites:
#   git remote add upstream https://github.com/tutilus/vscode-restclientnext.git
#
# Usage:
#   ./scripts/cherry-pick-pr.sh 733   # cherry-pick PR #733

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <PR-number>"
    exit 1
fi

PR=$1
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Fetching PR #$PR from upstream..."
git fetch upstream pull/${PR}/head:pr-${PR}

echo "Cherry-picking commits from pr-${PR} onto ${ORIG_BRANCH}..."

# Determine which upstream branch is the default (usually master or main)
BASE=$(git rev-parse upstream/master 2>/dev/null)
if [ -z "$BASE" ]; then
    echo "Error: Could not determine the default branch of upstream (tried master and main)."
    exit 1
fi

echo "Finding commits between ${BASE} and pr-${PR}..."

# Only get commits introduced by this PR
COMMITS=$(git log --format=%H ${BASE}..pr-${PR})

if [ -z "$COMMITS" ]; then
    echo "No new commits to cherry-pick (maybe the branch is already merged?)."
    git branch -D pr-${PR} >/dev/null 2>&1 || true
    exit 0
fi

echo "Found commits:"
echo "$COMMITS"
echo ""

# Cherry-pick each commit in reverse order (oldest first)
for commit in $(echo "$COMMITS" | tac); do
    echo "Picking $commit..."

    # run cherry-pick but do not let a conflict abort the whole script;
    # instead, inform the user and stop so they can resolve the conflict
    if ! git cherry-pick $commit; then
        echo ""
        echo "Conflict occurred while applying $commit."
        echo "Please resolve the conflict, run 'git cherry-pick --continue'"
        echo "or 'git cherry-pick --abort' and handle the situation manually." 
        echo "The temporary branch pr-${PR} is still available if you need it." 
        exit 1
    fi
done

echo "Cherry-pick finished; cleaning up temporary branch."
git checkout ${ORIG_BRANCH}
git branch -D pr-${PR}

echo "Done. Please review and push your changes if everything looks good."
