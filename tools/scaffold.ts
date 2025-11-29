#!/usr/bin/env node
/**
 * Scaffold CLI for AG-UI and MCP-UI Servers
 * 
 * Usage:
 *   npx @geeksfino/agui-mcpui-servers scaffold my-project
 *   npx @geeksfino/agui-mcpui-servers scaffold my-project --description "My agent"
 * 
 * Or with pnpm:
 *   pnpm scaffold my-project
 * 
 * This creates a combined project with both AG-UI and MCP-UI servers.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, chmodSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

function error(message: string) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

interface ScaffoldOptions {
  projectName: string;
  description?: string;
  author?: string;
  outputPath?: string;
  install?: boolean;
  git?: boolean;
}

/**
 * Prompt user for input
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(promptText, answer => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Validate project name
 */
function validateProjectName(name: string): boolean {
  // Must be a valid npm package name
  const regex = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return regex.test(name);
}

/**
 * Get git user info
 */
function getGitUserInfo(): { name?: string; email?: string } {
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    return { name, email };
  } catch {
    return {};
  }
}

/**
 * Copy template directory excluding specified patterns
 */
function copyTemplateExcluding(sourceDir: string, destDir: string, excludePatterns: string[]): void {
  const excludeSet = new Set(excludePatterns.map(p => p.toLowerCase()));
  
  function shouldExclude(name: string): boolean {
    const lowerName = name.toLowerCase();
    // Check exact matches
    if (excludeSet.has(lowerName)) {
      return true;
    }
    // Check if it starts with . (hidden files like .git, .DS_Store)
    if (name.startsWith('.') && excludeSet.has('.*')) {
      return true;
    }
    return false;
  }
  
  function copyRecursive(src: string, dest: string): void {
    const entries = readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      
      // Skip excluded directories/files
      if (shouldExclude(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        writeFileSync(destPath, readFileSync(srcPath));
      }
    }
  }
  
  copyRecursive(sourceDir, destDir);
}

/**
 * Replace placeholders in file content
 */
function replacePlaceholders(content: string, options: ScaffoldOptions, gitInfo: ReturnType<typeof getGitUserInfo>): string {
  const author = options.author || gitInfo.name || 'Your Name';
  const authorEmail = gitInfo.email || '';
  const fullAuthor = authorEmail ? `${author} <${authorEmail}>` : author;
  
  return content
    .replace(/{{PROJECT_NAME}}/g, options.projectName)
    .replace(/{{PROJECT_DESCRIPTION}}/g, options.description || `${options.projectName} - Combined AG-UI and MCP-UI servers`)
    .replace(/{{AUTHOR}}/g, fullAuthor)
    .replace(/{{YEAR}}/g, new Date().getFullYear().toString());
}

/**
 * Process template files recursively
 */
function processTemplateFiles(
  _templateDir: string,
  outputDir: string,
  options: ScaffoldOptions,
  gitInfo: ReturnType<typeof getGitUserInfo>
): void {
  const filesToProcess = [
    'package.json',
    'README.md',
    'CUSTOMIZATION.md',
    'scaffold.config.json',
  ];
  
  // Process root files
  for (const file of filesToProcess) {
    const filePath = join(outputDir, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const processed = replacePlaceholders(content, options, gitInfo);
        writeFileSync(filePath, processed, 'utf-8');
      } catch (err) {
        warn(`Could not process ${file}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }
  
  // Process subdirectories (agui-server and mcpui-server)
  // Process agui-server package.json
  const aguiPackagePath = join(outputDir, 'agui-server', 'package.json');
  if (existsSync(aguiPackagePath)) {
    try {
      const content = readFileSync(aguiPackagePath, 'utf-8');
      const packageJson = JSON.parse(content);
      packageJson.name = `${options.projectName}-agui-server`;
      packageJson.description = `${options.description || options.projectName} - AG-UI Server`;
      packageJson.author = options.author || gitInfo.name || '';
      const processed = replacePlaceholders(JSON.stringify(packageJson, null, 2), options, gitInfo);
      writeFileSync(aguiPackagePath, processed, 'utf-8');
    } catch (err) {
      warn(`Could not process agui-server/package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  // Process mcpui-server package.json
  const mcpuiPackagePath = join(outputDir, 'mcpui-server', 'package.json');
  if (existsSync(mcpuiPackagePath)) {
    try {
      const content = readFileSync(mcpuiPackagePath, 'utf-8');
      const packageJson = JSON.parse(content);
      packageJson.name = `${options.projectName}-mcpui-server`;
      packageJson.description = `${options.description || options.projectName} - MCP-UI Server`;
      packageJson.author = options.author || gitInfo.name || '';
      const processed = replacePlaceholders(JSON.stringify(packageJson, null, 2), options, gitInfo);
      writeFileSync(mcpuiPackagePath, processed, 'utf-8');
    } catch (err) {
      warn(`Could not process mcpui-server/package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create template metadata file
 */
function createScaffoldConfig(options: ScaffoldOptions): any {
  return {
    templateType: 'combined-server',
    projectName: options.projectName,
    description: options.description,
    author: options.author,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

/**
 * Scaffold a new project
 */
async function scaffold(options: ScaffoldOptions): Promise<void> {
  log(`\n🚀 Scaffolding combined AG-UI + MCP-UI project: ${options.projectName}\n`, 'bright');
  
  // Determine template directory (support both built dist/ and source tools/ layouts)
  const templateDirCandidates = [
    join(__dirname, '..', '..', 'templates'), // when running from dist/tools
    join(__dirname, '..', 'templates'),       // when running from tools/
    join(process.cwd(), 'templates'),         // fallback to current working dir
  ];

  const templateDir = templateDirCandidates.find(dir => existsSync(dir));
  
  const outputDir = resolve(options.outputPath || options.projectName);
  
  // Validate template exists
  if (!templateDir) {
    error(`Template directory not found. Checked: ${templateDirCandidates.join(', ')}`);
    process.exit(1);
  }
  
  // Check if output directory exists
  if (existsSync(outputDir)) {
    error(`Directory already exists: ${outputDir}`);
    const overwrite = await prompt('Overwrite? (yes/no)', 'no');
    if (overwrite.toLowerCase() !== 'yes') {
      info('Aborted.');
      process.exit(0);
    }
  } else {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Copy template (excluding node_modules and other build artifacts)
  info('Copying template...');
  copyTemplateExcluding(templateDir, outputDir, [
    'node_modules',
    'dist',
    '.git',
    '.DS_Store',
    '*.log',
  ]);
  success('Template copied');
  
  // Make start.sh executable
  const startScriptPath = join(outputDir, 'start.sh');
  if (existsSync(startScriptPath)) {
    try {
      chmodSync(startScriptPath, 0o755); // rwxr-xr-x
    } catch (err) {
      warn('Could not set executable permission on start.sh');
    }
  }
  
  // Get git user info
  const gitInfo = getGitUserInfo();
  
  // Process template files (replace placeholders)
  info('Processing template files...');
  processTemplateFiles(templateDir, outputDir, options, gitInfo);
  success('Template files processed');
  
  // Create scaffold config
  const scaffoldConfig = createScaffoldConfig(options);
  const configPath = join(outputDir, 'scaffold.config.json');
  writeFileSync(configPath, JSON.stringify(scaffoldConfig, null, 2), 'utf-8');
  
  // Initialize git repo
  if (options.git !== false) {
    try {
      info('Initializing git repository...');
      execSync('git init', { cwd: outputDir, stdio: 'ignore' });
      success('Git repository initialized');
    } catch (err) {
      warn('Failed to initialize git repository');
    }
  }
  
  // Install dependencies
  if (options.install) {
    info('Installing dependencies...');
    try {
      // Suppress Node.js deprecation warnings from pnpm dependencies
      // The url.parse() warning is from pnpm's dependencies, not our code
      const env = { ...process.env, NODE_OPTIONS: '--no-deprecation' };
      execSync('pnpm install', { cwd: outputDir, stdio: 'inherit', env });
      success('Dependencies installed');
    } catch (err) {
      warn('Failed to install dependencies. You can run `pnpm install` manually.');
    }
  }
  
  // Print success message
  log(`\n${colors.bright}${colors.green}✨ Project created successfully!${colors.reset}\n`);
  log(`📁 Location: ${outputDir}\n`);
  log(`Next steps:`);
  log(`  cd ${basename(outputDir)}`);
  if (!options.install) {
    log(`  pnpm install`);
  }
  log(`  ./start.sh`);
  log(`  # or: pnpm dev`);
  log(`\n📖 See README.md for getting started guide`);
  log(`📖 See agui-server/CUSTOMIZATION.md and mcpui-server/CUSTOMIZATION.md for customization\n`);
}

/**
 * Parse CLI arguments
 */
async function parseArgs(): Promise<ScaffoldOptions> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}Scaffold CLI for AG-UI and MCP-UI Servers${colors.reset}

${colors.bright}Usage:${colors.reset}
  scaffold <project-name> [options]
  
  # Creates a combined project with both AG-UI and MCP-UI servers

${colors.bright}Options:${colors.reset}
  --description    Project description
  --author         Author name
  --output         Output directory (default: project-name)
  --install        Install dependencies after scaffolding
  --no-git         Skip git initialization
  --help, -h       Show this help message

${colors.bright}Examples:${colors.reset}
  scaffold my-agent
  scaffold my-project --description "My AI agent" --install
  scaffold cool-bot --output ./servers/cool-bot --author "Your Name"
  
${colors.bright}Note:${colors.reset}
  The scaffolded project includes both AG-UI server (LLM agent) and MCP-UI server (UI tools)
  working together. Use ./start.sh to start both servers automatically.
`);
    process.exit(0);
  }
  
  // Project name is the first argument
  const projectName = args[0];
  
  // Get project name (prompt if not provided)
  let finalProjectName = projectName;
  if (!finalProjectName) {
    finalProjectName = await prompt('Project name');
    if (!finalProjectName) {
      error('Project name is required');
      process.exit(1);
    }
  }
  
  // Validate project name
  if (!validateProjectName(finalProjectName)) {
    error(`Invalid project name: ${finalProjectName}`);
    error('Project name must be a valid npm package name (lowercase, alphanumeric, hyphens, no spaces)');
    process.exit(1);
  }
  
  // Parse options
  const options: ScaffoldOptions = {
    projectName: finalProjectName,
  };
  
  // Parse options starting from index 1
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--description' && args[i + 1]) {
      options.description = args[++i];
    } else if (arg === '--author' && args[i + 1]) {
      options.author = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (arg === '--install') {
      options.install = true;
    } else if (arg === '--no-git') {
      options.git = false;
    }
  }
  
  return options;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const options = await parseArgs();
    await scaffold(options);
  } catch (err) {
    error(`Scaffolding failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run when executed as CLI
main();

export { scaffold, type ScaffoldOptions };

