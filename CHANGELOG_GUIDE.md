# Changelog Update Guide

This guide explains how to maintain the CHANGELOG.md file for this project.

## Quick Start

### Adding a Change Entry

1. **Manual Method** (Recommended):
   - Open `CHANGELOG.md`
   - Find the `[Unreleased]` section at the top
   - Add your change under the appropriate category:
     - `### Added` - New features
     - `### Changed` - Changes to existing features
     - `### Fixed` - Bug fixes
     - `### Removed` - Removed features
     - `### Security` - Security fixes

2. **Script Method**:
   ```bash
   ./scripts/update-changelog.sh "Unreleased" "Fixed" "Fixed API loading timeout issue"
   ```

### Example Entry Format

```markdown
## [Unreleased]

### Added
- New search functionality for markets
- Category filter dropdown

### Changed
- Reduced initial market fetch from 2000 to 500 for faster loading
- Improved error messages

### Fixed
- Fixed category extraction from event tags
- Resolved API timeout issues
```

## Version Bumping

### When to Bump Version

- **PATCH** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

### How to Bump Version

1. **Using npm scripts** (Recommended):
   ```bash
   npm run version:patch  # 1.0.0 → 1.0.1
   npm run version:minor  # 1.0.0 → 1.1.0
   npm run version:major  # 1.0.0 → 2.0.0
   ```

2. **Using script directly**:
   ```bash
   ./scripts/bump-version.sh patch
   ./scripts/bump-version.sh minor
   ./scripts/bump-version.sh major
   ```

3. **Manual method**:
   - Update version in `package.json`
   - Move `[Unreleased]` entries to new version section in `CHANGELOG.md`
   - Add date to new version section
   - Update `VERSION.md`

### After Bumping Version

1. Review and complete the changelog entry for the new version
2. Commit changes:
   ```bash
   git add CHANGELOG.md VERSION.md package.json
   git commit -m "chore: bump version to X.Y.Z"
   ```
3. Create git tag:
   ```bash
   git tag vX.Y.Z
   ```
4. Push:
   ```bash
   git push origin main
   git push origin vX.Y.Z
   ```

## Change Categories

### Added
- New features
- New components
- New API endpoints
- New dependencies

### Changed
- Changes to existing functionality
- Performance improvements
- UI/UX updates
- Configuration changes

### Fixed
- Bug fixes
- Error handling improvements
- Type fixes
- Build fixes

### Removed
- Removed features
- Removed dependencies
- Deprecated code removal

### Security
- Security patches
- Vulnerability fixes

## Best Practices

1. **Update changelog with every change** - Don't wait until release
2. **Be descriptive** - Explain what changed and why
3. **Group related changes** - Keep similar changes together
4. **Use present tense** - "Add feature" not "Added feature"
5. **Reference issues** - Link to GitHub issues if applicable
6. **Keep it concise** - One line per change, details in commit messages

## Example Workflow

```bash
# 1. Make your changes
# ... edit files ...

# 2. Update changelog
# Edit CHANGELOG.md and add entry under [Unreleased]

# 3. Commit changes
git add .
git commit -m "feat: add new search functionality"

# 4. When ready to release, bump version
npm run version:minor

# 5. Review changelog, then commit and tag
git add .
git commit -m "chore: release v1.1.0"
git tag v1.1.0
git push origin main && git push origin v1.1.0
```

## Questions?

- Check `CHANGELOG.md` for examples
- See `VERSION.md` for version history
- Review this guide for workflow details

