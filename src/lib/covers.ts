/** Placeholder cover gradients. Kept outside any 'use client' file so server pages can call it too. */
export const PLACEHOLDER_COLORS = [
  'from-[#00628C] to-[#050F26]',
  'from-[#0A1F4A] to-[#050F26]',
  'from-[#0079A8] to-[#0A1F4A]',
  'from-[#1D3F7C] to-[#07142F]',
  'from-[#005F86] to-[#022A41]',
  'from-[#2A549B] to-[#0A1F4A]',
  'from-[#14507A] to-[#050F26]',
  'from-[#0B6E8F] to-[#06283D]',
];

/** Deterministic placeholder gradient for a title. */
export function placeholderGradient(title: string): string {
  const idx = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[idx];
}
