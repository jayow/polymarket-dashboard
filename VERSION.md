# Version Information

## Current Version
**v1.0.0** - Initial Release (2025-12-15)

## Version Format
This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-12-15 | Initial release with full dashboard functionality |

## How to Update Version

### Manual Update
1. Update version in `package.json`
2. Add new entry to `CHANGELOG.md` under `[Unreleased]` or new version
3. Update this file with new version info
4. Commit with message: `chore: bump version to X.Y.Z`

### Using npm version
```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

## Release Checklist
- [ ] Update CHANGELOG.md with all changes
- [ ] Update VERSION.md with new version
- [ ] Update package.json version
- [ ] Test all functionality
- [ ] Build and verify production build
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`

