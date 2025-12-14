#!/bin/bash

# Script to help update CHANGELOG.md
# Usage: ./scripts/update-changelog.sh [version] [change-type] [description]

VERSION=${1:-"Unreleased"}
CHANGE_TYPE=${2:-"Changed"}
DESCRIPTION=${3:-"Update"}

# Get current date
DATE=$(date +%Y-%m-%d)

# Create changelog entry
ENTRY="### ${CHANGE_TYPE}
- ${DESCRIPTION}"

# Check if Unreleased section exists
if grep -q "## \[Unreleased\]" CHANGELOG.md; then
    # Add to Unreleased section
    sed -i '' "/## \[Unreleased\]/a\\
\\
${ENTRY}
" CHANGELOG.md
else
    # Create Unreleased section
    sed -i '' "1a\\
## [Unreleased]\\
\\
${ENTRY}\\
\\
---\\
\\
" CHANGELOG.md
fi

echo "✅ Added to CHANGELOG.md:"
echo "   ${CHANGE_TYPE}: ${DESCRIPTION}"

