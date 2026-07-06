'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  THEMES, applyTheme, applyCustomGradient, clearCustomGradient,
  saveThemePreference, loadThemePreference, saveCustomGradient, loadCustomGradient,
  type Theme, type ThemeColors, type CustomGradientTheme,
} from '@/lib/themes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (id: string) => void;
  customGradient: CustomGradientTheme | null;
  setCustomGradient: (gradient: CustomGradientTheme | null) => void;
  isCustom: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEMES[1],
  setTheme: () => {},
  customGradient: null,
  setCustomGradient: () => {},
  isCustom: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[1]);
  const [customGradient, setCustomGradientState] = useState<CustomGradientTheme | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
    }
  }, []);

  const setTheme = useCallback((id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (!theme) return;
    setCurrentTheme(theme);
    setIsCustom(false);
    clearCustomGradient();
    applyTheme(theme.colors);
    saveThemePreference(id);
  }, []);

  const setCustomGradient = useCallback((gradient: CustomGradientTheme | null) => {
    if (gradient) {
      setCustomGradientState(gradient);
      setIsCustom(true);
      applyCustomGradient(gradient);
      saveCustomGradient(gradient);
      saveThemePreference('custom');
    } else {
      setCustomGradientState(null);
      setIsCustom(false);
      clearCustomGradient();
      applyTheme(currentTheme.colors);
      saveThemePreference(currentTheme.id);
    }
  }, [currentTheme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, customGradient, setCustomGradient, isCustom }}>
      {children}
    </ThemeContext.Provider>
  );
}
