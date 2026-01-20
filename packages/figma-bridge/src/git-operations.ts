import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  untracked: string[];
  staged: string[];
  clean: boolean;
}

/**
 * Parse git status output
 */
function parseGitStatus(output: string): GitStatus {
  const lines = output.split('\n').filter(Boolean);
  const status: GitStatus = {
    branch: '',
    ahead: 0,
    behind: 0,
    modified: [],
    untracked: [],
    staged: [],
    clean: true,
  };

  for (const line of lines) {
    // Parse branch
    if (line.startsWith('## ')) {
      const branchMatch = line.match(/## ([^\s.]+)/);
      if (branchMatch) {
        status.branch = branchMatch[1];
      }

      // Parse ahead/behind
      const aheadMatch = line.match(/ahead (\d+)/);
      const behindMatch = line.match(/behind (\d+)/);
      if (aheadMatch) status.ahead = parseInt(aheadMatch[1]);
      if (behindMatch) status.behind = parseInt(behindMatch[1]);
      continue;
    }

    // Parse file status
    const statusCode = line.substring(0, 2);
    const file = line.substring(3);

    if (statusCode === '??') {
      status.untracked.push(file);
      status.clean = false;
    } else if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
      status.staged.push(file);
      status.clean = false;
    } else if (statusCode[1] !== ' ') {
      status.modified.push(file);
      status.clean = false;
    }
  }

  return status;
}

/**
 * Get git repository root directory
 */
export async function getGitRoot(cwd: string = process.cwd()): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepo(cwd: string = process.cwd()): Promise<boolean> {
  const root = await getGitRoot(cwd);
  return root !== null;
}

/**
 * Get git status
 */
export async function getGitStatus(cwd: string = process.cwd()): Promise<GitStatus> {
  try {
    const { stdout } = await execAsync('git status --porcelain --branch', { cwd });
    return parseGitStatus(stdout);
  } catch (error: any) {
    throw new Error(`Failed to get git status: ${error.message}`);
  }
}

/**
 * Pull latest changes from remote
 */
export async function gitPull(cwd: string = process.cwd()): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, stderr } = await execAsync('git pull --rebase', { cwd });
    const output = (stdout + stderr).trim();

    // Check if pull was successful
    if (output.includes('Already up to date') || output.includes('Fast-forward')) {
      return { success: true, message: output };
    }

    // Check for conflicts
    if (output.includes('CONFLICT')) {
      return {
        success: false,
        message: 'Pull resulted in conflicts. Please resolve manually.',
      };
    }

    return { success: true, message: output };
  } catch (error: any) {
    return {
      success: false,
      message: `Pull failed: ${error.message}`,
    };
  }
}

/**
 * Fetch latest changes from remote (without merging)
 */
export async function gitFetch(cwd: string = process.cwd()): Promise<void> {
  await execAsync('git fetch', { cwd });
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd });
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`Failed to get current branch: ${error.message}`);
  }
}

/**
 * Check if working directory has uncommitted changes
 */
export async function hasUncommittedChanges(cwd: string = process.cwd()): Promise<boolean> {
  const status = await getGitStatus(cwd);
  return !status.clean;
}

/**
 * Display formatted git status
 */
export function displayGitStatus(status: GitStatus): void {
  console.log(chalk.bold('\n📊 Git Status'));
  console.log(chalk.gray('─'.repeat(50)));

  // Branch info
  console.log(chalk.cyan(`Branch: ${status.branch}`));

  // Remote status
  if (status.ahead > 0) {
    console.log(chalk.yellow(`↑ Ahead by ${status.ahead} commit(s)`));
  }
  if (status.behind > 0) {
    console.log(chalk.yellow(`↓ Behind by ${status.behind} commit(s)`));
  }
  if (status.ahead === 0 && status.behind === 0) {
    console.log(chalk.green('✓ Up to date with remote'));
  }

  // File status
  if (status.staged.length > 0) {
    console.log(chalk.green(`\n✓ Staged files (${status.staged.length}):`));
    status.staged.forEach((file) => console.log(chalk.gray(`  - ${file}`)));
  }

  if (status.modified.length > 0) {
    console.log(chalk.yellow(`\n⚠ Modified files (${status.modified.length}):`));
    status.modified.forEach((file) => console.log(chalk.gray(`  - ${file}`)));
  }

  if (status.untracked.length > 0) {
    console.log(chalk.gray(`\n? Untracked files (${status.untracked.length}):`));
    status.untracked.forEach((file) => console.log(chalk.gray(`  - ${file}`)));
  }

  if (status.clean) {
    console.log(chalk.green('\n✓ Working directory clean'));
  }

  console.log(chalk.gray('─'.repeat(50)));
}

/**
 * Run git operations workflow before Figma bridge
 */
export async function runGitWorkflow(
  cwd: string = process.cwd(),
  options: {
    checkStatus?: boolean;
    pull?: boolean;
    requireClean?: boolean;
  } = {}
): Promise<{ proceed: boolean; message: string }> {
  const { checkStatus = true, pull = true, requireClean = false } = options;

  console.log(chalk.bold('\n🔍 Running git pre-flight checks...\n'));

  // Check if git repo
  const isRepo = await isGitRepo(cwd);
  if (!isRepo) {
    console.log(chalk.yellow('⚠ Not a git repository. Skipping git operations.'));
    return { proceed: true, message: 'Not a git repository' };
  }

  try {
    // Get current branch
    const branch = await getCurrentBranch(cwd);
    console.log(chalk.cyan(`📍 Current branch: ${branch}`));

    // Check status
    if (checkStatus) {
      const status = await getGitStatus(cwd);
      displayGitStatus(status);

      // Check if clean is required
      if (requireClean && !status.clean) {
        return {
          proceed: false,
          message: 'Working directory has uncommitted changes. Commit or stash them first.',
        };
      }
    }

    // Pull latest changes
    if (pull) {
      console.log(chalk.bold('\n⬇️  Pulling latest changes from remote...\n'));

      // Fetch first to check ahead/behind status
      await gitFetch(cwd);

      const status = await getGitStatus(cwd);
      if (status.behind > 0) {
        console.log(chalk.yellow(`Found ${status.behind} new commit(s) on remote. Pulling...`));

        const pullResult = await gitPull(cwd);

        if (pullResult.success) {
          console.log(chalk.green('✓ Successfully pulled latest changes'));
          console.log(chalk.gray(pullResult.message));
        } else {
          console.log(chalk.red('✗ Pull failed'));
          console.log(chalk.gray(pullResult.message));
          return {
            proceed: false,
            message: pullResult.message,
          };
        }
      } else {
        console.log(chalk.green('✓ Already up to date with remote'));
      }
    }

    console.log(chalk.green('\n✓ Git pre-flight checks passed\n'));
    return { proceed: true, message: 'Git checks passed' };
  } catch (error: any) {
    console.log(chalk.red(`\n✗ Git operation failed: ${error.message}\n`));
    return {
      proceed: false,
      message: error.message,
    };
  }
}
