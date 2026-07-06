export interface Theme {
  id: string;
  name: string;
  icon: string;
  colors: ThemeColors;
}

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface CustomGradientTheme {
  bgFrom: string;
  bgVia?: string;
  bgTo: string;
  bgAngle: number;
  text: string;
  accent: string;
  surface: string;
}

export const THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f8fafc',
      surface: '#ffffff',
      surfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      borderSubtle: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryLight: '#eff6ff',
      accent: '#10b981',
      accentLight: '#ecfdf5',
      gradientStart: '#3b82f6',
      gradientEnd: '#10b981',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      bg: '#0a0f1a',
      bgSecondary: '#111827',
      surface: '#1e293b',
      surfaceHover: '#334155',
      border: '#1e293b',
      borderSubtle: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryLight: 'rgba(59, 130, 246, 0.1)',
      accent: '#34d399',
      accentLight: 'rgba(16, 185, 129, 0.1)',
      gradientStart: '#60a5fa',
      gradientEnd: '#34d399',
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    icon: '📜',
    colors: {
      bg: '#f4ecd8',
      bgSecondary: '#ebe3cf',
      surface: '#faf6eb',
      surfaceHover: '#ede5d0',
      border: '#d4c9a8',
      borderSubtle: '#ebe3cf',
      text: '#3d3222',
      textSecondary: '#5c4f3a',
      textMuted: '#8a7d68',
      primary: '#b8860b',
      primaryHover: '#9a7209',
      primaryLight: 'rgba(184, 134, 11, 0.1)',
      accent: '#6b8e23',
      accentLight: 'rgba(107, 142, 35, 0.1)',
      gradientStart: '#b8860b',
      gradientEnd: '#6b8e23',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    icon: '🌌',
    colors: {
      bg: '#0c1222',
      bgSecondary: '#111a30',
      surface: '#1a2744',
      surfaceHover: '#243558',
      border: '#1e3050',
      borderSubtle: '#162240',
      text: '#e2e8f0',
      textSecondary: '#94a3b8',
      textMuted: '#5a7098',
      primary: '#818cf8',
      primaryHover: '#6366f1',
      primaryLight: 'rgba(129, 140, 248, 0.1)',
      accent: '#a78bfa',
      accentLight: 'rgba(167, 139, 250, 0.1)',
      gradientStart: '#818cf8',
      gradientEnd: '#a78bfa',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    icon: '🌲',
    colors: {
      bg: '#0c1a0e',
      bgSecondary: '#112215',
      surface: '#1a3320',
      surfaceHover: '#244430',
      border: '#1e3822',
      borderSubtle: '#162e1a',
      text: '#e2f0e4',
      textSecondary: '#8faa93',
      textMuted: '#5a7860',
      primary: '#4ade80',
      primaryHover: '#22c55e',
      primaryLight: 'rgba(74, 222, 128, 0.1)',
      accent: '#a3e635',
      accentLight: 'rgba(163, 230, 53, 0.1)',
      gradientStart: '#4ade80',
      gradientEnd: '#a3e635',
    },
  },
];

export function getThemeById(id: string): Theme | undefined {
  return THEMES.find(t => t.id === id);
}

export function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--surface', colors.surface);
  root.style.setProperty('--surface-hover', colors.surfaceHover);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  root.style.setProperty('--text', colors.text);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-hover', colors.primaryHover);
  root.style.setProperty('--primary-light', colors.primaryLight);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-light', colors.accentLight);
  root.style.setProperty('--gradient-start', colors.gradientStart);
  root.style.setProperty('--gradient-end', colors.gradientEnd);
}

export function applyCustomGradient(custom: CustomGradientTheme) {
  const root = document.documentElement;
  const bgGradient = custom.bgVia
    ? `linear-gradient(${custom.bgAngle}deg, ${custom.bgFrom}, ${custom.bgVia}, ${custom.bgTo})`
    : `linear-gradient(${custom.bgAngle}deg, ${custom.bgFrom}, ${custom.bgTo})`;
  root.style.setProperty('--bg', custom.bgFrom);
  root.style.setProperty('--bg-secondary', custom.bgTo);
  root.style.setProperty('--surface', custom.surface);
  root.style.setProperty('--surface-hover', custom.surface);
  root.style.setProperty('--text', custom.text);
  root.style.setProperty('--text-secondary', custom.text + 'cc');
  root.style.setProperty('--text-muted', custom.text + '88');
  root.style.setProperty('--primary', custom.accent);
  root.style.setProperty('--gradient-start', custom.accent);
  root.style.setProperty('--gradient-end', custom.accent);
  document.body.style.backgroundImage = bgGradient;
}

export function clearCustomGradient() {
  document.body.style.backgroundImage = '';
}

export function saveThemePreference(themeId: string) {
  localStorage.setItem('anyfreebook-theme', themeId);
}

export function loadThemePreference(): string {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('anyfreebook-theme') || 'dark';
}

export function saveCustomGradient(custom: CustomGradientTheme) {
  localStorage.setItem('anyfreebook-custom-gradient', JSON.stringify(custom));
}

export function loadCustomGradient(): CustomGradientTheme | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('anyfreebook-custom-gradient');
  return saved ? JSON.parse(saved) : null;
}
