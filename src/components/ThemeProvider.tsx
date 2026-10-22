'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import {
  THEMES, applyTheme, applyCustomGradient, clearCustomGradient,
  saveThemePreference, loadThemePreference, saveCustomGradient, loadCustomGradient,
  colorLightness, type Theme, type ThemeColors, type CustomGradientTheme,
} from '@/lib/themes';

// useLayoutEffect on the client (applies the theme before the browser paints
// the hydrated tree) and useEffect on the server (React warns otherwise).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (id: string) => void;
  customGradient: CustomGradientTheme | null;
  setCustomGradient: (gradient: CustomGradientTheme | null) => void;
  isCustom: boolean;
  /** True when the active theme has a dark background. */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEMES[1],
  setTheme: () => {},
  customGradient: null,
  setCustomGradient: () => {},
  isCustom: false,
  isDark: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[1]);
  const [customGradient, setCustomGradientState] = useState<CustomGradientTheme | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Kept false until mount so the server HTML and the first client render
  // agree — the theme itself is applied by the inline bootstrap script in
  // layout.tsx before the first paint.
  const [isDark, setIsDark] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
    const savedId = loadThemePreference();
    const theme = THEMES.find(t => t.id === savedId) || THEMES[1];
    setCurrentTheme(theme);
    applyTheme(theme.colors);

    const savedCustom = loadCustomGradient();
    if (savedId === 'custom' && savedCustom) {
      setCustomGradientState(savedCustom);
      setIsCustom(true);
      applyCustomGradient(savedCustom);
      setIsDark(colorLightness(savedCustom.bgFrom) < 0.5);
    } else {
      setIsDark(colorLightness(theme.colors.bg) < 0.5);
    }
  }, []);

  const setTheme = useCallback((id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (!theme) return;
    setCurrentTheme(theme);
    setIsCustom(false);
    clearCustomGradient();
    applyTheme(theme.colors);
    setIsDark(colorLightness(theme.colors.bg) < 0.5);
    saveThemePreference(id);
  }, []);

  const setCustomGradient = useCallback((gradient: CustomGradientTheme | null) => {
    if (gradient) {
      setCustomGradientState(gradient);
      setIsCustom(true);
      applyCustomGradient(gradient);
      setIsDark(colorLightness(gradient.bgFrom) < 0.5);
      saveCustomGradient(gradient);
      saveThemePreference('custom');
    } else {
      setCustomGradientState(null);
      setIsCustom(false);
      clearCustomGradient();
      applyTheme(currentTheme.colors);
      setIsDark(colorLightness(currentTheme.colors.bg) < 0.5);
      saveThemePreference(currentTheme.id);
    }
  }, [currentTheme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, customGradient, setCustomGradient, isCustom, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
