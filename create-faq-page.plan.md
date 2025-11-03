<!-- b793ab9b-5541-453e-b8b9-f9eaf23a359e cd3f63b9-902f-4662-9801-533807d59bba -->
# Create FAQ Page

## Overview

Build a fully functional FAQ page that works on both web and mobile platforms, follows the design system from `design.json`, and is accessible as a public route. Add navigation from settings page below the changelog button.

## Implementation Steps

### 1. Create FAQ Data File

Create `data/faq.json` with structured FAQ content including:

- Categories (Getting Started, Features, Account & Billing, Technical Issues, Privacy & Security)
- Questions with detailed answers
- Support contact information
- Similar structure to `changelog.json` for consistency

### 2. Create FAQ Page Component

Create `app/faq.tsx` with:

- **Web Layout**: Use `WebLayout` with optional `UserSidebar` (shown only if authenticated)
- **Mobile Layout**: Scrollable layout with mobile header
- **Design Patterns**: Follow `changelog.tsx` structure for consistency
- Three-section web header (back button, title, spacer)
- Expandable/collapsible FAQ items
- Category sections with icons
- Theme-aware components (`ThemedView`, `ThemedText`)
- Proper color usage with `useThemeColor` hook
- **Features**:
- Search/filter functionality for FAQ items
- Expandable answers with smooth animations
- Category navigation
- Contact support CTA at bottom

### 3. Add Translation Keys

Update translation files (`locales/en/translations.json` and `locales/es/translations.json`) with:

- FAQ page title and subtitle
- Category names
- Search placeholder
- Contact support text
- All user-facing strings

### 4. Add Navigation Button in Settings

Update both `components/settings/SettingsWeb.tsx` and `components/settings/SettingsMobile.tsx`:

- Add FAQ button in the Actions section, positioned after the changelog button (around lines 586-591 for web, 576-581 for mobile)
- Use `help-circle-outline` icon to distinguish from the main help/support page
- Route to `/faq`

### 5. Configure as Public Route

Update `app/_layout.tsx`:

- Add Stack.Screen configuration for FAQ route (similar to changelog around line 356-365)
- Add `isFaqPage` check in public route validation (around line 215)
- Ensure unauthenticated users can access `/faq`

### 6. Update User Sidebar (Optional)

If FAQ should appear in sidebar navigation, update `components/web/UserSidebar.tsx` to include FAQ link.

## Key Files to Modify

- `data/faq.json` (new)
- `app/faq.tsx` (new)
- `locales/en/translations.json`
- `locales/es/translations.json`
- `components/settings/SettingsWeb.tsx`
- `components/settings/SettingsMobile.tsx`
- `app/_layout.tsx`

## Design Consistency

- Use same color palette as defined in `design.json`
- Follow web header pattern: `paddingHorizontal: 0, paddingTop: 40, paddingBottom: 30, gap: 20`
- Use `WebLayout` for web with conditional sidebar
- Implement expandable items similar to changelog version cards
- Maintain consistent spacing and typography

### To-dos

- [x] Create data/faq.json with categories and FAQ content
- [x] Create app/faq.tsx with web and mobile layouts following design.json patterns
- [x] Add FAQ translation keys to English and Spanish translation files
- [x] Add FAQ navigation button in SettingsWeb and SettingsMobile components
- [x] Update app/_layout.tsx to configure FAQ as a public route
- [x] Test FAQ page on web and mobile, authenticated and unauthenticated states

