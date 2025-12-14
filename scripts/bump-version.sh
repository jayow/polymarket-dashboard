#!/bin/bash

# Script to bump version and update changelog
# Usage: ./scripts/bump-version.sh [patch|minor|major]

TYPE=${1:-"patch"}

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: ${CURRENT_VERSION}"

# Parse version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Bump version based on type
case $TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Invalid version type. Use: patch, minor, or major"
        exit 1
        ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "New version: ${NEW_VERSION}"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update CHANGELOG.md
DATE=$(date +%Y-%m-%d)
sed -i '' "s/## \[Unreleased\]/## [${NEW_VERSION}] - ${DATE}/" CHANGELOG.md

# Add new Unreleased section
sed -i '' "1a\\
## [Unreleased]\\
\\
### Added\\
\\
### Changed\\
\\
### Fixed\\
\\
---\\
\\
" CHANGELOG.md

# Update VERSION.md
sed -i '' "s/^\*\*v.*\*\*/**v${NEW_VERSION}**/" VERSION.md
sed -i '' "s/^| 1.0.0 |/| ${NEW_VERSION} |/" VERSION.md

echo "✅ Version bumped to ${NEW_VERSION}"
echo "✅ Updated CHANGELOG.md and VERSION.md"
echo ""
echo "Next steps:"
echo "1. Review CHANGELOG.md and add details for this version"
echo "2. Commit changes: git add . && git commit -m 'chore: bump version to ${NEW_VERSION}'"
echo "3. Create tag: git tag v${NEW_VERSION}"
echo "4. Push: git push origin main && git push origin v${NEW_VERSION}"

