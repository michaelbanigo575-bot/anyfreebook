export type IntegrationStatus = 'connected' | 'partial' | 'disconnected';

export interface Integration {
  id: string;
  name: string;
  icon: string;
  status: IntegrationStatus;
  detail: string;
  cta?: { label: string; href: string };
}

export function getIntegrations(vercelConnected: boolean, githubConnected: boolean): Integration[] {
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adsense = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const gbooks = process.env.GOOGLE_BOOKS_API_KEY;
  const analytics = true; // @vercel/analytics is always mounted
  const cloudflare = !!process.env.CLOUDFLARE_API_TOKEN;
  const gsc = false; // Search Console has no API token in env
  const resend = !!process.env.RESEND_API_KEY;

  return [
    {
      id: 'supabase',
      name: 'Supabase',
      icon: '🗄️',
      status: supa ? 'connected' : 'disconnected',
      detail: supa ? 'Database + Auth active' : 'Set NEXT_PUBLIC_SUPABASE_URL and service role key',
      cta: supa ? undefined : { label: 'Open dashboard', href: 'https://supabase.com/dashboard' },
    },
    {
      id: 'vercel',
      name: 'Vercel',
      icon: '▲',
      status: vercelConnected ? 'connected' : 'partial',
      detail: vercelConnected ? 'Deployment monitoring active' : 'Deploys work; set VERCEL_API_TOKEN to view history here',
      cta: vercelConnected ? undefined : { label: 'Create token', href: 'https://vercel.com/account/tokens' },
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: '⚡',
      status: githubConnected ? 'connected' : 'partial',
      detail: githubConnected ? 'Repo commits streaming' : 'Public API rate-limited to 60/hr — add GITHUB_TOKEN for higher',
      cta: process.env.GITHUB_TOKEN ? undefined : { label: 'Create token', href: 'https://github.com/settings/tokens/new?scopes=repo&description=ANYFREEBOOK+admin' },
    },
    {
      id: 'adsense',
      name: 'Google AdSense',
      icon: '💰',
      status: adsense ? 'connected' : 'disconnected',
      detail: adsense ? `Publisher ID ${adsense} live` : 'Set NEXT_PUBLIC_ADSENSE_CLIENT_ID',
      cta: { label: 'Open AdSense', href: 'https://adsense.google.com' },
    },
    {
      id: 'gbooks',
      name: 'Google Books API',
      icon: '📗',
      status: gbooks ? 'connected' : 'disconnected',
      detail: gbooks ? 'API key active' : 'Set GOOGLE_BOOKS_API_KEY',
      cta: gbooks ? undefined : { label: 'Get key', href: 'https://console.cloud.google.com/apis/credentials' },
    },
    {
      id: 'analytics',
      name: 'Vercel Analytics',
      icon: '📊',
      status: analytics ? 'connected' : 'disconnected',
      detail: 'Traffic tracking mounted',
      cta: { label: 'View analytics', href: 'https://vercel.com/anyfreebookteams/anyfreebook/analytics' },
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      icon: '☁️',
      status: cloudflare ? 'connected' : 'disconnected',
      detail: cloudflare ? 'DNS + zone management ready' : 'Domain registered here — add CLOUDFLARE_API_TOKEN to query DNS from admin',
      cta: cloudflare ? undefined : { label: 'Create token', href: 'https://dash.cloudflare.com/profile/api-tokens' },
    },
    {
      id: 'gsc',
      name: 'Google Search Console',
      icon: '🔍',
      status: gsc ? 'connected' : 'partial',
      detail: 'Property verified — indexing progress lives on the Search Console dashboard',
      cta: { label: 'Open Search Console', href: 'https://search.google.com/search-console?resource_id=sc-domain:anyfreebook.com' },
    },
    {
      id: 'resend',
      name: 'Email (Resend)',
      icon: '✉️',
      status: resend ? 'connected' : 'disconnected',
      detail: resend ? 'Transactional email ready' : 'Not connected — set RESEND_API_KEY when ready to send notifications',
      cta: resend ? undefined : { label: 'Sign up free', href: 'https://resend.com' },
    },
  ];
}
