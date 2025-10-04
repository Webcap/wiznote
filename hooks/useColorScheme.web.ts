import { useContext, useEffect, useState } from 'react';
import { ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '../ThemeContext';

export function useColorScheme(): ColorSchemeName {
  const theme = useContext(ThemeContext);
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemColorScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (theme && theme !== 'auto') {
    return theme;
  }
  if (hasHydrated) {
    return systemColorScheme;
  }
  return 'light';
}
