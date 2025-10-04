import { useContext } from 'react';
import { ColorSchemeName, useColorScheme as useSystemColorScheme } from 'react-native';
import { ThemeContext } from '../ThemeContext';

export function useColorScheme(): ColorSchemeName {
  const theme = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme();
  
  if (theme && theme !== 'auto') {
    return theme;
  }
  
  return systemColorScheme;
}
