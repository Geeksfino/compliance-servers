/**
 * System Prompt Configuration
 * 
 * CUSTOMIZE: This file controls the system prompt for the LLM agent.
 * 
 * The system prompt is loaded in the following order:
 * 1. Environment variable AGUI_SYSTEM_PROMPT
 * 2. File at system-prompt.txt (if exists)
 * 3. Default prompt defined below
 * 
 * To customize:
 * - Edit the DEFAULT_SYSTEM_PROMPT constant below
 * - Or set AGUI_SYSTEM_PROMPT environment variable
 * - Or create a system-prompt.txt file in the project root
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CUSTOMIZE: Default system prompt
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

/**
 * Load system prompt from a file
 * @param filename - Relative path from project root
 */
function loadFromFile(filename: string): string | null {
  try {
    // Try project root first
    const rootPath = join(__dirname, '../../..', filename);
    if (existsSync(rootPath)) {
      const content = readFileSync(rootPath, 'utf-8').trim();
      if (content) {
        return content;
      }
    }
    
    // Try relative to config directory
    const configPath = join(__dirname, filename);
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8').trim();
      if (content) {
        return content;
      }
    }
  } catch (error) {
    // File doesn't exist or couldn't be read, that's ok
  }
  return null;
}

/**
 * The system prompt used by the LLM agent
 * 
 * Priority:
 * 1. AGUI_SYSTEM_PROMPT environment variable
 * 2. system-prompt.txt file
 * 3. DEFAULT_SYSTEM_PROMPT constant
 */
export const SYSTEM_PROMPT = 
  process.env.AGUI_SYSTEM_PROMPT || 
  loadFromFile('system-prompt.txt') ||
  DEFAULT_SYSTEM_PROMPT;


