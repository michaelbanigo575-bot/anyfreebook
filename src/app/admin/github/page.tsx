import { getGitHubSummary } from '@/lib/admin/github';
import { Panel, Stat, relTime } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REPO = process.env.GITHUB_REPO || 'michaelbanigo575-bot/anyfreebook';

export default async function GitHubPage() {
  const g = await getGitHubSummary();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Recent commits" value={g.commits.length} sub="last 15" />
        <Stat label="Open issues" value={g.openIssues} tone={g.openIssues === 0 ? 'good' : 'warn'} />
        <Stat label="Default branch" value={g.defaultBranch} />
        <Stat label="Last push" value={relTime(g.lastPushISO)} sub={g.lastPushISO ? new Date(g.lastPushISO).toLocaleDateString() : ''} />
      </div>

      <Panel
        title="Commit history"
        action={
          <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-400 hover:underline">
            Open on GitHub →
          </a>
        }
      >
        {!g.connected ? (
          <div className="p-5 text-sm text-slate-400">{g.hint || 'GitHub API unavailable.'}</div>
        ) : g.commits.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No commits found.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {g.commits.map(c => (
              <a
                key={c.sha}
                href={c.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                    {c.authorAvatar && <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{c.message}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-400">{c.sha}</span> · {c.authorName} · {relTime(c.date)}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
