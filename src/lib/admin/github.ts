export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string;
  authorAvatar?: string;
  date: string;
  htmlUrl: string;
}

export interface GitHubSummary {
  connected: boolean;
  commits: GitHubCommit[];
  openIssues: number;
  defaultBranch: string;
  lastPushISO: string | null;
  stars: number;
  hint?: string;
}

const REPO = process.env.GITHUB_REPO || 'michaelbanigo575-bot/anyfreebook';

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function getGitHubSummary(): Promise<GitHubSummary> {
  try {
    const [repoRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}`, { headers: githubHeaders(), cache: 'no-store', signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.github.com/repos/${REPO}/commits?per_page=15`, { headers: githubHeaders(), cache: 'no-store', signal: AbortSignal.timeout(8000) }),
    ]);

    if (!repoRes.ok) {
      return { connected: false, commits: [], openIssues: 0, defaultBranch: 'main', lastPushISO: null, stars: 0, hint: `GitHub API returned ${repoRes.status}` };
    }

    const repo = await repoRes.json() as { open_issues_count?: number; default_branch?: string; pushed_at?: string; stargazers_count?: number };
    const commitsJson = commitsRes.ok ? await commitsRes.json() as Array<Record<string, unknown>> : [];

    const commits: GitHubCommit[] = commitsJson.map((c) => {
      const commit = c.commit as { message: string; author: { name: string; date: string } };
      const author = c.author as { avatar_url?: string } | null;
      return {
        sha: (c.sha as string).slice(0, 7),
        message: commit.message.split('\n')[0],
        authorName: commit.author.name,
        authorAvatar: author?.avatar_url,
        date: commit.author.date,
        htmlUrl: c.html_url as string,
      };
    });

    return {
      connected: true,
      commits,
      openIssues: repo.open_issues_count ?? 0,
      defaultBranch: repo.default_branch ?? 'main',
      lastPushISO: repo.pushed_at ?? null,
      stars: repo.stargazers_count ?? 0,
    };
  } catch (err) {
    return { connected: false, commits: [], openIssues: 0, defaultBranch: 'main', lastPushISO: null, stars: 0, hint: err instanceof Error ? err.message : 'Failed to reach GitHub API' };
  }
}
