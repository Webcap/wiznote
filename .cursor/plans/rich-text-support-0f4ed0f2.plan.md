<!-- 0f4ed0f2-328e-4014-8f6d-e036de23b94c a157b320-1a5c-46fc-a2f3-b0b52e4bdcd0 -->
# Rich Text Support Implementation Plan

## Overview

Add rich text editing capabilities to WizNote for both web and mobile platforms with basic formatting (bold, italic, underline, headings, lists), HTML storage, controlled rollout via feature flags, and optional user migration.

## Storage Decision: HTML Format

**Why HTML**: HTML is the most future-proof format because:

- Universal browser support across all platforms
- Easy migration to any future editor library
- Simple rendering without library dependencies
- Can be sanitized for security using existing DOMPurify
- Web-standard format that will be supported indefinitely
- Allows progressive enhancement (plain text fallback)

## Implementation Strategy

### Phase 1: Database & Type Updates

**1. Add Rich Text Field to Database**

- Create migration: `database/add-rich-text-content.sql`
- Add `content_html` column (TEXT) to `notes` table
- Add `content_format` column (VARCHAR) with values: 'plain' or 'html'
- Keep existing `content` column for backward compatibility
- Add indexes for performance

**2. Update TypeScript Types**

- File: `types/Note.ts`
- Add `contentHtml?: string` to `Note` interface
- Add `contentFormat?: 'plain' | 'html'` to `Note` interface
- Update `NoteFormData` and `UpdateNoteData` interfaces similarly

**3. Add Feature Flag**

- File: `constants/DefaultFeatureFlags.ts`
- Add `rich_text_editor` feature flag (disabled by default)
- Set `premiumOnly: false` for testing
- Set `trackingEnabled: true` for usage monitoring
- Set `rolloutPercentage: 0` initially

- File: `types/FeatureFlags.ts`
- Add `'rich_text_editor'` to `FeatureFlagKey` type union

### Phase 2: Web Implementation (Priority)

**4. Install Rich Text Library for Web**

```bash
npm install react-quill quill
npm install --save-dev @types/react-quill @types/quill
```

**Why Quill**: Lightweight, well-maintained, excellent web support, produces clean HTML

**5. Create Rich Text Editor Component (Web)**

- File: `components/RichTextEditor.web.tsx`
- Wrap `react-quill` with WizNote styling
- Configure toolbar: Bold, Italic, Underline, Headings (H1-H3), Bullet List, Numbered List
- Add keyboard shortcuts support
- Sanitize HTML output using DOMPurify
- Handle plain text fallback when feature disabled

**6. Create Rich Text Viewer Component (Web)**

- File: `components/RichTextViewer.web.tsx`
- Safely render HTML content using `dangerouslySetInnerHTML` with DOMPurify
- Apply WizNote theme styling to rendered HTML
- Handle plain text fallback

**7. Update Create Note Screen (Web)**

- File: `app/create.tsx`
- Check `isFeatureEnabled('rich_text_editor')`
- Conditionally render `RichTextEditor` or plain `TextInput`
- Convert between HTML and plain text formats
- Update save logic to store both formats

**8. Update Note Detail Screen (Web)**

- File: `app/note/[id].tsx`
- Check feature flag for rendering
- Use `RichTextViewer` when content is HTML
- Fallback to plain text display

### Phase 3: Mobile Implementation

**9. Install Rich Text Library for Mobile**

```bash
npm install react-native-pell-rich-editor
npm install react-native-webview
```

**Why Pell**: Best React Native support, uses WebView for consistency, similar API to web editors

**10. Create Rich Text Editor Component (Mobile)**

- File: `components/RichTextEditor.native.tsx`
- Wrap `react-native-pell-rich-editor`
- Match toolbar configuration with web version
- Handle keyboard avoiding behavior
- Implement HTML sanitization

**11. Create Rich Text Viewer Component (Mobile)**

- File: `components/RichTextViewer.native.tsx`
- Use WebView to render HTML content
- Apply theme styling via injected CSS
- Handle plain text fallback

**12. Update Create Note Screen (Mobile)**

- File: `app/create.tsx` (mobile section)
- Add conditional rendering for rich text editor
- Ensure feature flag checks work on mobile

**13. Update Note Detail Screen (Mobile)**

- File: `app/note/[id].tsx` (mobile section)
- Add rich text viewer for HTML content

### Phase 4: Data Services & Validation

**14. Update Note Storage Service**

- File: `services/SupabaseNoteStorage.ts`
- Modify save methods to handle `contentHtml` and `contentFormat`
- Ensure backward compatibility with plain text notes
- Add migration helper method for converting plain to HTML

**15. Update Note Schema Validation**

- File: `schemas/NoteSchema.ts`
- Add validation for `contentHtml` (max 1MB)
- Add validation for `contentFormat` enum
- Ensure HTML is sanitized before storage

**16. Add HTML Sanitization**

- File: `utils/sanitization.ts` (already exists)
- Enhance existing sanitization for rich text HTML
- Configure DOMPurify rules for allowed tags/attributes
- Add tests for XSS prevention

### Phase 5: User Migration & Testing

**17. Add Opt-in Migration UI**

- File: `components/ConvertToRichTextModal.tsx`
- Modal dialog to convert individual notes
- Preview before/after conversion
- Explain benefits of rich text

**18. Update Note Card Component**

- File: `components/NoteCard.tsx`
- Add badge/indicator for rich text notes
- Render preview with basic HTML stripping

**19. Admin Feature Flag Management**

- File: `app/admin/feature-flags.tsx` (if exists) or create
- Add UI to enable/disable rich text feature
- Show usage statistics
- Control rollout percentage

**20. Testing & Rollout**

- Test on web with sample notes
- Test on iOS and Android
- Test with existing plain text notes
- Enable for beta users (rolloutPercentage: 10)
- Monitor for issues
- Gradually increase rollout
- Full release when stable

## Key Files to Create/Modify

### New Files:

- `database/add-rich-text-content.sql` - Database migration
- `components/RichTextEditor.web.tsx` - Web editor
- `components/RichTextEditor.native.tsx` - Mobile editor
- `components/RichTextViewer.web.tsx` - Web viewer
- `components/RichTextViewer.native.tsx` - Mobile viewer
- `components/ConvertToRichTextModal.tsx` - Migration UI

### Modified Files:

- `types/Note.ts` - Add rich text fields
- `types/FeatureFlags.ts` - Add feature flag type
- `constants/DefaultFeatureFlags.ts` - Add feature flag config
- `app/create.tsx` - Conditional editor rendering
- `app/note/[id].tsx` - Conditional viewer rendering
- `services/SupabaseNoteStorage.ts` - Rich text storage logic
- `schemas/NoteSchema.ts` - Rich text validation
- `utils/sanitization.ts` - Enhanced HTML sanitization
- `components/NoteCard.tsx` - Rich text preview
- `package.json` - New dependencies

## Dependencies to Install

### Web:

```json
{
  "react-quill": "^2.0.0",
  "quill": "^2.0.0",
  "@types/react-quill": "^2.0.0",
  "@types/quill": "^2.0.0"
}
```

### Mobile:

```json
{
  "react-native-pell-rich-editor": "^1.9.0"
}
```

Note: `react-native-webview` already in dependencies

## Rollout Strategy

1. **Week 1**: Web only, 10% rollout to beta users
2. **Week 2**: Web 50% rollout if no issues
3. **Week 3**: Add mobile, 10% rollout
4. **Week 4**: Both platforms 50% rollout
5. **Week 5**: Full rollout 100% if stable

## Security Considerations

- All HTML content sanitized with DOMPurify before storage
- All HTML content sanitized again before rendering
- XSS protection through whitelist approach
- Only allow safe HTML tags: p, br, strong, em, u, h1-h3, ul, ol, li
- No JavaScript, iframes, or dangerous attributes
- Existing sanitization patterns in `utils/sanitization.ts` extended

## Backward Compatibility

- Existing plain text notes remain unchanged
- `content` column preserved for plain text fallback
- Notes without `contentHtml` render as plain text
- Migration is opt-in per note
- No breaking changes to API

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Feature flag toggles correctly
- [ ] Web editor loads and saves HTML
- [ ] Mobile editor loads and saves HTML
- [ ] Plain text notes still render correctly
- [ ] HTML is properly sanitized
- [ ] XSS attacks are prevented
- [ ] Theme styling applies to rich text
- [ ] Keyboard shortcuts work
- [ ] Conversion modal works correctly
- [ ] Performance is acceptable
- [ ] Works on iOS, Android, and web browsers

### To-dos

- [ ] Create database migration to add content_html and content_format columns
- [ ] Update TypeScript types for Note interfaces with rich text fields
- [ ] Add rich_text_editor feature flag to constants and types
- [ ] Create RichTextEditor.web.tsx component with Quill integration
- [ ] Create RichTextViewer.web.tsx component for safe HTML rendering
- [ ] Update app/create.tsx to use rich text editor on web when feature enabled
- [ ] Update app/note/[id].tsx to use rich text viewer on web
- [ ] Create RichTextEditor.native.tsx component with Pell integration
- [ ] Create RichTextViewer.native.tsx component for mobile
- [ ] Update app/create.tsx mobile section for rich text editor
- [ ] Update app/note/[id].tsx mobile section for rich text viewer
- [ ] Update SupabaseNoteStorage.ts to handle contentHtml and contentFormat
- [ ] Update NoteSchema.ts to validate rich text fields
- [ ] Enhance utils/sanitization.ts for rich text HTML sanitization
- [ ] Create ConvertToRichTextModal.tsx for opt-in note conversion
- [ ] Update NoteCard.tsx to show rich text indicator and preview
- [ ] Test all features and perform phased rollout via feature flag