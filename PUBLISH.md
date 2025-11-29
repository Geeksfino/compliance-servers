# Publishing Guide

This guide explains how to publish the `@finogeek/agui-mcpui-servers` package to **npmjs**.

## Prerequisites

### For npmjs

1. **npm account** with access to `@finogeek` scope
2. **Authentication** configured:
   ```bash
   npm login --scope=@finogeek
   ```

## Pre-Publishing Checklist

### 1. Update Version

Update the version in `package.json`:
```bash
# For patch release
npm version patch

# For minor release
npm version minor

# For major release
npm version major
```

### 2. Build the Package

```bash
# Build the scaffold tool
pnpm build

# Verify the build output
ls -la dist/tools/scaffold.js
```

### 3. Verify Package Contents

Check what will be published:
```bash
npm pack --dry-run
```

This should show:
- `dist/tools/scaffold.js` (the CLI binary)
- `templates/` (all template files)
- `README.md`
- `docs/` (documentation)
- `package.json`

### 4. Test Locally

Test the package locally before publishing:
```bash
# Create a tarball
npm pack

# Install it locally in a test directory
cd /tmp
mkdir test-scaffold
cd test-scaffold
npm init -y
npm install /path/to/compliance-servers/@finogeek-agui-mcpui-servers-1.0.0.tgz

# Test the scaffold command
npx @finogeek/agui-mcpui-servers test-project --no-install
```

## Publishing

### Publish to npmjs

```bash
# Login to npmjs
npm login --scope=@finogeek

# Publish to npmjs
npm publish --access public
```

**Verify Publication:**
```bash
npm view @finogeek/agui-mcpui-servers
```

Or visit: https://www.npmjs.com/package/@finogeek/agui-mcpui-servers

**Usage After Publishing:**
```bash
# No special configuration needed - works with default npm registry
npx @finogeek/agui-mcpui-servers my-project
```

### Test After Publishing

Test that users can use it:
```bash
# In a clean directory
cd /tmp
mkdir test-npx
cd test-npx

# For GitHub Packages: Configure npmrc first (see above)
# For npmjs: No configuration needed

# Test npx command
npx @finogeek/agui-mcpui-servers test-project --no-install
```

## Package Structure

When published, the package contains:

```
@finogeek/agui-mcpui-servers/
├── dist/
│   └── tools/
│       └── scaffold.js      # CLI binary (with shebang)
├── templates/
│   ├── agui-server/         # AG-UI server template
│   ├── mcpui-server/        # MCP-UI server template
│   ├── package.json         # Root package.json template
│   ├── start.sh             # Startup script template
│   ├── README.md            # Template README
│   └── scaffold.config.json # Template config
├── docs/                    # Documentation
│   ├── scaffold-guide.md
│   ├── testing-guide.md
│   ├── cloud-deployment-guide.md
│   └── mcp-logging-guide.md
├── README.md                # Package README
└── package.json            # Package manifest
```

## Usage After Publishing

Users can now use:

```bash
# Create a new project
npx @finogeek/agui-mcpui-servers my-project

# With options
npx @finogeek/agui-mcpui-servers my-project \
  --description "My agent" \
  --author "John Doe" \
  --no-install
```

## Troubleshooting

### Issue: "Package not found" after publishing (GitHub Packages)

- Wait a few minutes for GitHub Packages to propagate
### Issue: "Package not found" after publishing (npmjs)

- Wait a few minutes for npm to propagate
- Check the package name matches exactly: `@finogeek/agui-mcpui-servers`
- Verify you're logged in: `npm whoami`

### Issue: "Template directory not found" when running scaffold

- Verify `templates/` is included in the published package
- Check the path resolution in `scaffold.js` (should be `__dirname/../../templates`)
- Test locally with `npm pack` and `npm install` first

### Issue: Permission denied when running scaffold

- Ensure `dist/tools/scaffold.js` has the shebang: `#!/usr/bin/env node`
- Verify the file is executable (npm should handle this automatically)

## Version Management

Follow semantic versioning:
- **Patch** (1.0.0 → 1.0.1): Bug fixes, template updates
- **Minor** (1.0.0 → 1.1.0): New features, new template options
- **Major** (1.0.0 → 2.0.0): Breaking changes

## Release Process

### For npmjs

1. Update version in `package.json`
2. Update CHANGELOG.md (if maintained)
3. Build: `pnpm build`
4. Test locally: `npm pack` and install
5. Publish: `npm publish --access public`
6. Tag release in git: `git tag v1.0.0 && git push --tags`
7. Create GitHub release (optional)

## Notes

- The `prepare` script runs automatically before publishing (builds the package)
- The `prepublishOnly` script ensures build happens before publish
- Templates are included as-is (no compilation needed)
- The scaffold tool is compiled TypeScript → JavaScript

