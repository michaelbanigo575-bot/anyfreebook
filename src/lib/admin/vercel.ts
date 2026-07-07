export interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  readyState: string;
  target: 'production' | 'preview' | null;
  createdAt: number;
  branch?: string;
  commitMsg?: string;
  commitSha?: string;
  authorUsername?: string;
  buildingAt?: number;
  ready?: number;
}

export interface VercelSummary {
  latest: VercelDeployment | null;
  latestProduction: VercelDeployment | null;
  recent: VercelDeployment[];
  errorCount24h: number;
  connected: boolean;
  hint?: string;
}

const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_LceJngeKzMATMzyO61BNTxrZ';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_2Vwv1cmYRLCTMoHHEEkQ3BlTuFq1';

export async function getVercelSummary(): Promise<VercelSummary> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    return {
      latest: null,
      latestProduction: null,
      recent: [],
      errorCount24h: 0,
      connected: false,
      hint: 'Set VERCEL_API_TOKEN env var to enable deployment monitoring',
    };
  }

  const url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=20`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { latest: null, latestProduction: null, recent: [], errorCount24h: 0, connected: false, hint: `Vercel API returned ${res.status}` };
    }
    const data = await res.json() as { deployments?: Array<Record<string, unknown>> };
    const recent: VercelDeployment[] = (data.deployments || []).map((d) => {
      const meta = (d.meta as Record<string, string> | undefined) || {};
      return {
        uid: d.uid as string,
        url: `https://${d.url as string}`,
        state: d.state as string,
        readyState: d.readyState as string,
        target: d.target as VercelDeployment['target'],
        createdAt: d.createdAt as number,
        branch: meta.githubCommitRef,
        commitMsg: meta.githubCommitMessage?.split('\n')[0],
        commitSha: meta.githubCommitSha?.slice(0, 7),
        authorUsername: meta.githubCommitAuthorLogin,
        buildingAt: d.buildingAt as number | undefined,
        ready: d.ready as number | undefined,
      };
    });

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const errorCount24h = recent.filter(d => (d.state === 'ERROR' || d.readyState === 'ERROR') && d.createdAt > dayAgo).length;

    return {
      latest: recent[0] || null,
      latestProduction: recent.find(d => d.target === 'production' && (d.state === 'READY' || d.readyState === 'READY')) || null,
      recent,
      errorCount24h,
      connected: true,
    };
  } catch (err) {
    return {
      latest: null,
      latestProduction: null,
      recent: [],
      errorCount24h: 0,
      connected: false,
      hint: err instanceof Error ? err.message : 'Failed to reach Vercel API',
    };
  }
}
