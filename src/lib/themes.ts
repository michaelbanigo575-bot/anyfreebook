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
  surfaceHover?: string;
  border?: string;
  borderSubtle?: string;
  gradientEnd?: string;
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

/** CSS custom property that carries each theme colour. */
const VAR_MAP: Record<keyof ThemeColors, string> = {
  bg: '--bg',
  bgSecondary: '--bg-secondary',
  surface: '--surface',
  surfaceHover: '--surface-hover',
  border: '--border',
  borderSubtle: '--border-subtle',
  text: '--text',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  primary: '--primary',
  primaryHover: '--primary-hover',
  primaryLight: '--primary-light',
  accent: '--accent',
  accentLight: '--accent-light',
  gradientStart: '--gradient-start',
  gradientEnd: '--gradient-end',
};

const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/** Perceived lightness of a #rrggbb colour: 0 = black, 1 = white. */
export function colorLightness(hex: string): number {
  const m = HEX_RE.exec((hex || '').trim());
  if (!m) return 0.5;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Nudge a #rrggbb colour lighter or darker. */
function shiftLightness(hex: string, delta: number): string {
  const m = HEX_RE.exec((hex || '').trim());
  if (!m) return hex;
  const channels = [m[1], m[2], m[3]].map(c => {
    const next = Math.max(0, Math.min(255, Math.round(parseInt(c, 16) + delta * 255)));
    return next.toString(16).padStart(2, '0');
  });
  return '#' + channels.join('');
}

/** Append an alpha suffix to a hex colour; non-hex colours pass through. */
function withAlpha(color: string, alpha: string): string {
  return HEX_RE.test((color || '').trim()) ? color.trim() + alpha : color.trim();
}

/**
 * A second gradient stop guaranteed to differ from the first. The custom
 * theme used to set --gradient-start and --gradient-end to the same accent,
 * which collapsed the sitewide flowing gradient into a flat colour.
 */
export function gradientEndFor(accent: string): string {
  return shiftLightness(accent, colorLightness(accent) > 0.55 ? -0.22 : 0.22);
}

/**
 * The full colour set for a custom theme. The custom builder only asks for
 * six colours, so borders, hover states and the gradient's second stop are
 * derived from them — previously they were left unset, so a custom theme
 * inherited the borders and accents of whichever built-in theme ran last.
 */
export function customThemeColors(custom: CustomGradientTheme): ThemeColors {
  const accent = custom.accent || '#c084fc';
  return {
    bg: custom.bgFrom,
    bgSecondary: custom.bgTo,
    surface: custom.surface,
    surfaceHover: custom.surfaceHover || shiftLightness(custom.surface, 0.07),
    border: custom.border || shiftLightness(custom.surface, 0.16),
    borderSubtle: custom.borderSubtle || shiftLightness(custom.surface, 0.08),
    text: custom.text,
    textSecondary: withAlpha(custom.text, 'cc'),
    textMuted: withAlpha(custom.text, '88'),
    primary: accent,
    primaryHover: shiftLightness(accent, colorLightness(accent) > 0.55 ? -0.12 : 0.12),
    primaryLight: withAlpha(accent, '22'),
    accent,
    accentLight: withAlpha(accent, '22'),
    gradientStart: accent,
    gradientEnd: custom.gradientEnd || gradientEndFor(accent),
  };
}

/** The body background gradient for a custom theme. */
export function customBackgroundImage(custom: CustomGradientTheme): string {
  return custom.bgVia
    ? `linear-gradient(${custom.bgAngle}deg, ${custom.bgFrom}, ${custom.bgVia}, ${custom.bgTo})`
    : `linear-gradient(${custom.bgAngle}deg, ${custom.bgFrom}, ${custom.bgTo})`;
}

function writeVars(colors: ThemeColors) {
  const root = document.documentElement;
  (Object.keys(VAR_MAP) as (keyof ThemeColors)[]).forEach(key => {
    root.style.setProperty(VAR_MAP[key], colors[key]);
  });
}

/**
 * Apply a built-in theme.
 *
 * This also owns the `dark` class on <html>. The class drives the shadow
 * scale, the glass header tint and the scrollbar colours; it used to be
 * toggled independently by the navbar, so a light theme still got the dark
 * header treatment (a near-black bar with near-black text).
 */
export function applyTheme(colors: ThemeColors) {
  writeVars(colors);
  document.documentElement.classList.toggle('dark', colorLightness(colors.bg) < 0.5);
}

export function applyCustomGradient(custom: CustomGradientTheme) {
  writeVars(customThemeColors(custom));
  document.documentElement.classList.toggle('dark', colorLightness(custom.bgFrom) < 0.5);
  document.body.style.backgroundImage = customBackgroundImage(custom);
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
  // Corrupted storage must not white-screen the site — fall back to no gradient.
  try {
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Inline script that applies the saved theme before the first paint.
 *
 * Without it the page renders with the light `:root` defaults and then
 * repaints dark once ThemeProvider hydrates — a white flash on every load
 * for the ~70% of visitors who use the default dark theme.
 *
 * The data comes from the same THEMES/VAR_MAP constants the React path uses,
 * so the two can never drift apart.
 */
export function themeBootstrapScript(): string {
  return `(function(){try{
var T=${JSON.stringify(THEMES)},V=${JSON.stringify(VAR_MAP)},r=document.documentElement,s=r.style;
function L(h){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec((h||'').trim());if(!m)return .5;return (0.2126*parseInt(m[1],16)+0.7152*parseInt(m[2],16)+0.0722*parseInt(m[3],16))/255}
function A(c,a){return /^#?[a-f\\d]{6}$/i.test((c||'').trim())?c.trim()+a:c.trim()}
function set(o){for(var k in V){if(o[k]!=null)s.setProperty(V[k],o[k])}}
var id=localStorage.getItem('anyfreebook-theme')||'dark';
var c=null;try{c=JSON.parse(localStorage.getItem('anyfreebook-custom-gradient')||'null')}catch(e){}
if(id==='custom'&&c){
var ac=c.accent||'#c084fc',tx=c.text||'#f1f5f9',sf=c.surface||'#1e1b4b';
var ge=c.gradientEnd||ac;
set({bg:c.bgFrom,bgSecondary:c.bgTo,surface:sf,surfaceHover:sf,border:sf,borderSubtle:sf,text:tx,textSecondary:A(tx,'cc'),textMuted:A(tx,'88'),primary:ac,primaryHover:ac,primaryLight:A(ac,'22'),accent:ac,accentLight:A(ac,'22'),gradientStart:ac,gradientEnd:ge});
r.classList.toggle('dark',L(c.bgFrom)<.5);
if(document.body){document.body.style.backgroundImage=c.bgVia?('linear-gradient('+c.bgAngle+'deg,'+c.bgFrom+','+c.bgVia+','+c.bgTo+')'):('linear-gradient('+c.bgAngle+'deg,'+c.bgFrom+','+c.bgTo+')')}
}else{
var t=T.find(function(x){return x.id===id})||T[1];
set(t.colors);
r.classList.toggle('dark',L(t.colors.bg)<.5);
}
}catch(e){}})();`;
}
