/**
 * claude-cli.ts
 * Thin wrapper around the Claude Code CLI (`claude -p`) for non-interactive
 * use in the video-creator agent. Requires Claude Code to be installed and
 * authenticated (no separate CLAUDE_API_KEY needed).
 */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 180_000; // 3 minutes — enough for long storyboard prompts
const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

/**
 * Send a prompt to Claude via the CLI and return the text response.
 * Falls back gracefully if the CLI is not available.
 */
export async function askClaude(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync('claude', ['-p', prompt], {
    timeout: TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });
  return stdout.trim();
}

/**
 * Check whether `claude` CLI is available on this machine.
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('claude', ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract first JSON object {...} from a Claude response string.
 */
export function extractJsonObject(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in Claude response');
  return match[0];
}

/**
 * Extract first JSON array [...] from a Claude response string.
 */
export function extractJsonArray(text: string): string {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in Claude response');
  return match[0];
}
