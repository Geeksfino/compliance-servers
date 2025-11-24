# Publishing Guide

This guide explains how to publish the `@geeksfino/agui-mcpui-servers` package to **GitHub Packages** or **npmjs**.

## Publishing Options

### Option 1: GitHub Packages (Recommended)

Publish to GitHub Packages, which is integrated with your GitHub repository.

### Option 2: npmjs

Publish to the public npm registry at npmjs.com.

## Prerequisites

### For GitHub Packages

1. **GitHub account** with access to the repository
2. **Personal Access Token (PAT)** with `write:packages` permission:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with `write:packages` scope
   - Or use a GitHub Actions token (automated publishing)
3. **Authentication** configured:
   ```bash
   # Login to GitHub Packages
   npm login --scope=@geeksfino --registry=https://npm.pkg.github.com
   # Username: your-github-username
   # Password: your-personal-access-token (not your GitHub password)
   # Email: your-github-email
   ```

### For npmjs

1. **npm account** with username `geeksfino` or access to `@geeksfino` organization
2. **Authentication** configured:
   ```bash
   # Login to npmjs (default registry)
   npm login --scope=@geeksfino
   # Or without scope if using personal account
   npm login
   ```

### For npmjs

1. **npm account** with access to `@geeksfino` scope
2. **Authentication** configured:
   ```bash
   npm login --scope=@geeksfino
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
npm install /path/to/compliance-servers/@geeksfino-agui-mcpui-servers-1.0.0.tgz

# Test the scaffold command
npx scaffold test-project --no-install
```

## Publishing

### Option 1: Publish to GitHub Packages

```bash
# Ensure you're logged in to GitHub Packages
npm login --scope=@geeksfino --registry=https://npm.pkg.github.com

# Publish to GitHub Packages
npm publish

# Or explicitly specify the registry
npm publish --registry=https://npm.pkg.github.com
```

**Verify Publication:**
- Visit: `https://github.com/finclip/compliance-servers/packages`
- Or check via CLI:
  ```bash
  npm view @geeksfino/agui-mcpui-servers --registry=https://npm.pkg.github.com
  ```

**Usage After Publishing:**
Users need to configure npm to use GitHub Packages for the `@geeksfino` scope:

```bash
# Create or edit ~/.npmrc
echo "@geeksfino:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

Then users can use:
```bash
npx @geeksfino/agui-mcpui-servers scaffold my-project
```

### Option 2: Publish to npmjs

**Note:** To publish to npmjs instead of GitHub Packages, you can override the registry at the command line.

**Method 1: Override registry via command line (Recommended)**

```bash
# Login to npmjs (not GitHub Packages)
npm login --scope=@geeksfino

# Publish to npmjs with explicit registry override
npm publish --registry=https://registry.npmjs.org/ --access public
```

**Method 2: Temporarily update package.json**

Edit `package.json` temporarily:
```json
{
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  }
}
```

Then publish:
```bash
npm publish
```

Remember to revert `publishConfig` back to GitHub Packages after publishing if you want to use GitHub Packages by default.

**Method 3: Use .npmrc for session**

Create a temporary `.npmrc` in the project root:
```bash
echo "registry=https://registry.npmjs.org/" > .npmrc
npm publish --access public
rm .npmrc
```

**Verify Publication:**
```bash
npm view @geeksfino/agui-mcpui-servers
```

Or visit: https://www.npmjs.com/package/@geeksfino/agui-mcpui-servers

**Usage After Publishing:**
```bash
# No special configuration needed - works with default npm registry
npx @geeksfino/agui-mcpui-servers scaffold my-project
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
npx @geeksfino/agui-mcpui-servers scaffold test-project --no-install
```

## Package Structure

When published, the package contains:

```
@geeksfino/agui-mcpui-servers/
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
npx @geeksfino/agui-mcpui-servers scaffold my-project

# With options
npx @geeksfino/agui-mcpui-servers scaffold my-project \
  --description "My agent" \
  --author "John Doe" \
  --no-install
```

## Troubleshooting

### Issue: "Package not found" after publishing (GitHub Packages)

- Wait a few minutes for GitHub Packages to propagate
- Check the package name matches exactly: `@geeksfino/agui-mcpui-servers`
- Verify you're logged in: `npm whoami --registry=https://npm.pkg.github.com`
- Ensure users have configured their `.npmrc` to use GitHub Packages for `@geeksfino` scope
- Check package visibility: GitHub Packages packages are private by default for organizations

### Issue: "Package not found" after publishing (npmjs)

- Wait a few minutes for npm to propagate
- Check the package name matches exactly: `@geeksfino/agui-mcpui-servers`
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

### For GitHub Packages

1. Update version in `package.json`
2. Update CHANGELOG.md (if maintained)
3. Build: `pnpm build`
4. Test locally: `npm pack` and install
5. Publish: `npm publish` (uses GitHub Packages by default)
6. Tag release in git: `git tag v1.0.0 && git push --tags`
7. Create GitHub release (optional)

### For npmjs

1. Update version in `package.json`
2. Update CHANGELOG.md (if maintained)
3. Build: `pnpm build`
4. Test locally: `npm pack` and install
5. Temporarily update `publishConfig` in `package.json` or use:
   ```bash
   npm publish --access public --registry=https://registry.npmjs.org/
   ```
6. Tag release in git: `git tag v1.0.0 && git push --tags`
7. Create GitHub release (optional)

## Notes

- The `prepare` script runs automatically before publishing (builds the package)
- The `prepublishOnly` script ensures build happens before publish
- Templates are included as-is (no compilation needed)
- The scaffold tool is compiled TypeScript → JavaScript

