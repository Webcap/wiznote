import React, { createContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'auto';

export const ThemeContext = createContext<ThemePreference>('auto');
export const ThemeUpdateContext = createContext<(theme: ThemePreference) => void>(() => {});

export function ThemeProvider({ initialTheme, children }: { initialTheme?: ThemePreference, children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme || 'auto');

  // Update theme if initialTheme prop changes
  useEffect(() => {
    if (initialTheme && initialTheme !== theme) {
      console.log('ThemeProvider: Updating theme from', theme, 'to', initialTheme);
      setTheme(initialTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTheme]);

  // Listen to system changes if in auto mode - but don't call setTheme to avoid infinite loops
  useEffect(() => {
    if (theme === 'auto') {
      const listener = ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        console.log('ThemeProvider: System theme changed to', colorScheme);
        // Don't call setTheme here as it can cause infinite loops
        // The theme will still be 'auto' and useColorScheme will return the current system color
      };
      const subscription = Appearance.addChangeListener(listener);
      return () => subscription.remove();
    }
  }, [theme]);

  // Log theme changes for debugging
  useEffect(() => {
    console.log('ThemeProvider: Current theme is', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeUpdateContext.Provider value={setTheme}>
        {children}
      </ThemeUpdateContext.Provider>
    </ThemeContext.Provider>
  );
} 