import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  getGitRoot,
  isGitRepo,
  getGitStatus,
  gitPull,
  gitFetch,
  getCurrentBranch,
  hasUncommittedChanges,
  runGitWorkflow,
  type GitStatus,
} from './git-operations';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

const execAsync = promisify(exec);

describe('git-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGitRepo', () => {
    it('returns true when in a git repository', async () => {
      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: '/path/to/repo\n', stderr: '' });
        return {} as any;
      });

      const result = await isGitRepo();
      expect(result).toBe(true);
    });

    it('returns false when not in a git repository', async () => {
      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(new Error('not a git repository'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await isGitRepo();
      expect(result).toBe(false);
    });
  });

  describe('getGitStatus', () => {
    it('parses clean git status correctly', async () => {
      const mockOutput = `## main...origin/main
`;

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const status = await getGitStatus();

      expect(status.branch).toBe('main');
      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
      expect(status.clean).toBe(true);
      expect(status.staged).toEqual([]);
      expect(status.modified).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('parses ahead/behind status correctly', async () => {
      const mockOutput = `## main...origin/main [ahead 2, behind 1]
`;

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const status = await getGitStatus();

      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(1);
    });

    it('parses file changes correctly', async () => {
      const mockOutput = `## main...origin/main
 M src/modified.ts
A  src/staged.ts
?? src/untracked.ts
`;

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const status = await getGitStatus();

      expect(status.clean).toBe(false);
      expect(status.modified).toContain('src/modified.ts');
      expect(status.staged).toContain('src/staged.ts');
      expect(status.untracked).toContain('src/untracked.ts');
    });
  });

  describe('runGitWorkflow', () => {
    it('skips gracefully when not in a git repo', async () => {
      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        if (cmd.includes('rev-parse')) {
          callback(new Error('not a git repository'), { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await runGitWorkflow();

      expect(result.proceed).toBe(true);
      expect(result.message).toContain('Not a git repository');
    });

    it('passes when repo is clean and up to date', async () => {
      const mockStatusOutput = `## main...origin/main
`;
      const mockBranchOutput = 'main\n';

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        if (cmd.includes('rev-parse')) {
          callback(null, { stdout: '/path/to/repo\n', stderr: '' });
        } else if (cmd.includes('branch --show-current')) {
          callback(null, { stdout: mockBranchOutput, stderr: '' });
        } else if (cmd.includes('status --porcelain')) {
          callback(null, { stdout: mockStatusOutput, stderr: '' });
        } else if (cmd.includes('fetch')) {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await runGitWorkflow();

      expect(result.proceed).toBe(true);
      expect(result.message).toBe('Git checks passed');
    });

    it('fails when requireClean is true and repo has changes', async () => {
      const mockStatusOutput = `## main...origin/main
 M src/modified.ts
`;
      const mockBranchOutput = 'main\n';

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        if (cmd.includes('rev-parse')) {
          callback(null, { stdout: '/path/to/repo\n', stderr: '' });
        } else if (cmd.includes('branch --show-current')) {
          callback(null, { stdout: mockBranchOutput, stderr: '' });
        } else if (cmd.includes('status --porcelain')) {
          callback(null, { stdout: mockStatusOutput, stderr: '' });
        }
        return {} as any;
      });

      const result = await runGitWorkflow(process.cwd(), {
        checkStatus: true,
        pull: false,
        requireClean: true,
      });

      expect(result.proceed).toBe(false);
      expect(result.message).toContain('uncommitted changes');
    });

    it('pulls successfully when behind remote', async () => {
      const mockStatusOutput = `## main...origin/main [behind 1]
`;
      const mockBranchOutput = 'main\n';
      const mockPullOutput = 'Fast-forward\n';

      let callCount = 0;
      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        if (cmd.includes('rev-parse')) {
          callback(null, { stdout: '/path/to/repo\n', stderr: '' });
        } else if (cmd.includes('branch --show-current')) {
          callback(null, { stdout: mockBranchOutput, stderr: '' });
        } else if (cmd.includes('status --porcelain')) {
          // Return behind on first call, up-to-date after fetch
          const output = callCount === 0 ? mockStatusOutput : `## main...origin/main\n`;
          callCount++;
          callback(null, { stdout: output, stderr: '' });
        } else if (cmd.includes('fetch')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('pull --rebase')) {
          callback(null, { stdout: mockPullOutput, stderr: '' });
        }
        return {} as any;
      });

      const result = await runGitWorkflow();

      expect(result.proceed).toBe(true);
      expect(result.message).toBe('Git checks passed');
    });

    it('fails when pull results in conflicts', async () => {
      const mockStatusOutput = `## main...origin/main [behind 1]
`;
      const mockBranchOutput = 'main\n';
      const mockPullOutput = 'CONFLICT (content): Merge conflict in src/file.ts\n';

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        if (cmd.includes('rev-parse')) {
          callback(null, { stdout: '/path/to/repo\n', stderr: '' });
        } else if (cmd.includes('branch --show-current')) {
          callback(null, { stdout: mockBranchOutput, stderr: '' });
        } else if (cmd.includes('status --porcelain')) {
          callback(null, { stdout: mockStatusOutput, stderr: '' });
        } else if (cmd.includes('fetch')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('pull --rebase')) {
          callback(null, { stdout: mockPullOutput, stderr: '' });
        }
        return {} as any;
      });

      const result = await runGitWorkflow();

      expect(result.proceed).toBe(false);
      expect(result.message).toContain('conflicts');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('returns true when there are uncommitted changes', async () => {
      const mockOutput = `## main...origin/main
 M src/modified.ts
`;

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const result = await hasUncommittedChanges();
      expect(result).toBe(true);
    });

    it('returns false when working directory is clean', async () => {
      const mockOutput = `## main...origin/main
`;

      vi.mocked(exec).mockImplementation((cmd, opts, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const result = await hasUncommittedChanges();
      expect(result).toBe(false);
    });
  });
});
