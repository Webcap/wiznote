<!-- b7f045e8-7dc5-4332-922a-842a18c5887a 92fff5bc-4e0c-47bf-9705-91c031feefd5 -->
# Add Internationalization (i18n) Support to WizNote

Add internationalization to support English and Spanish with automatic language detection, language persistence, and a language switcher in settings.

## Implementation Overview

Set up i18next with AsyncStorage, add translation files, create a context provider with automatic device locale detection, and wire components to use translations. The app will automatically detect the user's device language and default to Spanish if supported, otherwise fall back to English.

## Implementation Steps

### 1. Install Dependencies

Install i18n packages in `package.json`:

- `i18next` - Core i18n library
- `react-i18next` - React bindings for i18next
- `expo-localization` - Device locale detection

### 2. Create Translation Files

- `locales/en/translations.json` - English translations
- `locales/es/translations.json` - Spanish translations
- Organize keys by feature (auth, settings, notes, etc.)

### 3. Create i18n Configuration

- `lib/i18n.ts` - Initialize i18next with AsyncStorage backend
- `lib/i18nStorage.ts` - Handle language preference persistence

### 4. Create Language Context

- `contexts/LanguageContext.tsx` - Context provider for language state
- Integrate with existing `AppContent` in `app/_layout.tsx`

### 5. Add Language Switcher to Settings

- Update `components/settings/SettingsMobile.tsx` with language selection
- Update `components/settings/SettingsWeb.tsx` with language selection
- Add language preference to user preferences update flow

### 6. Update Auth Service

- Update `services/AuthService.ts` to include language in user preferences
- Ensure language preference syncs with backend

### 7. Translate Key Components

Start with high-impact areas:

- `components/LandingPage.tsx` - Landing page copy
- `app/(auth)/login.tsx` - Login page
- `app/(tabs)/settings.tsx` and related components
- `app/(tabs)/index.tsx` - Home page

### 8. Add Translation Hook

- `hooks/useTranslation.ts` - Custom hook wrapping react-i18next's useTranslation
- Provides easy access to translation function

## Files to Create/Modify

**New Files:**

- `locales/en/translations.json`
- `locales/es/translations.json`
- `lib/i18n.ts`
- `lib/i18nStorage.ts`
- `contexts/LanguageContext.tsx`
- `hooks/useTranslation.ts`

**Modified Files:**

- `package.json` - Add dependencies
- `app/_layout.tsx` - Add LanguageContext provider
- `components/settings/SettingsMobile.tsx` - Add language switcher
- `components/settings/SettingsWeb.tsx` - Add language switcher
- `services/AuthService.ts` - Add language to preferences
- Initial key components for translation (as time permits)

## Technical Approach

- Use i18next with AsyncStorage backend for persistence
- Detect device locale on first launch via expo-localization
- Store language preference in AsyncStorage and sync with user preferences
- Create translation key structure following existing feature organization
- Implement incrementally, starting with most visible/user-facing components

### To-dos

- [ ] Install i18next, react-i18next, and expo-localization packages
- [ ] Create i18n configuration files (lib/i18n.ts and lib/i18nStorage.ts)
- [ ] Create translation files for English and Spanish (locales/en/translations.json and locales/es/translations.json)
- [ ] Create LanguageContext provider and integrate into app layout
- [ ] Add language switcher to SettingsMobile and SettingsWeb components
- [ ] Update AuthService to handle language preference sync
- [ ] Translate key user-facing components (landing page, auth pages, settings)