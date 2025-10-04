/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C', // Main text
    textSecondary: '#687076', // Secondary text
    textMuted: '#A0A0A0', // Muted/placeholder text
    background: '#fff', // Main background
    backgroundSecondary: '#F5F6FA', // Cards, inputs, containers
    backgroundTertiary: '#E5E7EB', // Borders, dividers
    tint: tintColorLight, // Accent
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    accentPrimary: '#6A5ACD', // Primary actions, buttons
    accentDanger: '#FF6B6B', // Destructive actions
    accentSuccess: '#3CB371', // Success states
    accentWarning: '#FF8C00', // Warning states
    border: '#E5E7EB', // Border color
    // Additional colors for flashcards and other components
    card: '#F5F6FA', // Card background
    mutedText: '#A0A0A0', // Muted text
    primary: '#6A5ACD', // Primary color
    // Additional theme colors
    success: '#3CB371', // Success color
    warning: '#FF8C00', // Warning color
    danger: '#FF6B6B', // Danger color
    info: '#0a7ea4', // Info color
  },
  dark: {
    text: '#ECEDEE', // Main text
    textSecondary: '#9BA1A6', // Secondary text
    textMuted: '#A0A0A0', // Muted/placeholder text
    background: '#151718', // Main background
    backgroundSecondary: '#1A1A1A', // Cards, inputs, containers
    backgroundTertiary: '#282828', // Borders, dividers
    tint: tintColorDark, // Accent
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    accentPrimary: '#6A5ACD', // Primary actions, buttons
    accentDanger: '#FF6B6B', // Destructive actions
    accentSuccess: '#3CB371', // Success states
    accentWarning: '#FF8C00', // Warning states
    border: '#333333', // Border color
    // Additional colors for flashcards and other components
    card: '#1A1A1A', // Card background
    mutedText: '#A0A0A0', // Muted text
    primary: '#6A5ACD', // Primary color
    // Additional theme colors
    success: '#3CB371', // Success color
    warning: '#FF8C00', // Warning color
    danger: '#FF6B6B', // Danger color
    info: '#0a7ea4', // Info color
  },
};
