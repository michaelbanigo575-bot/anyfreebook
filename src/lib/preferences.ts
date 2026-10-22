/**
 * Appearance preferences that have to be applied before the first paint.
 *
 * The settings page writes `anyfreebook-settings`; without a pre-paint
 * bootstrap the page renders at the default font size and with animations
 * enabled, then jumps once the settings screen is opened.
 */

export const SETTINGS_STORAGE_KEY = 'anyfreebook-settings';

/** The layout is rem-based, so the root font size scales the whole page. */
export const FONT_SCALE: Record<'small' | 'medium' | 'large', string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

/** Appearance preferences have a real effect on the page, so they are applied as soon as they change. */
export function applyAppearance(appearance: {
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.animations = appearance.animations ? 'on' : 'off';
  document.documentElement.style.fontSize = FONT_SCALE[appearance.fontSize] || FONT_SCALE.medium;
}

/**
 * Inline script that applies the saved appearance preferences before the
 * first paint, so the page never renders at the wrong size and then jumps.
 */
export function preferencesBootstrapScript(): string {
  return `(function(){try{
var s=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}')||'null');
if(!s||!s.appearance)return;
var r=document.documentElement;
r.dataset.animations=s.appearance.animations===false?'off':'on';
var F=${JSON.stringify(FONT_SCALE)};
r.style.fontSize=F[s.appearance.fontSize]||F.medium;
}catch(e){}})();`;
}
