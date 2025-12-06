---
name: Mobile Web Layout Optimization
overview: Optimize the mobile web experience by fixing the squished grid layout, enforcing a readable single-column list view, and adjusting spacing for smaller screens.
todos: []
---

# Mobile Web Layout Optimization

## Problem

The web application currently renders note cards in a grid layout that becomes squished and unreadable on mobile devices. The user has identified this layout issue as the primary optimization gap.

## Solution

We will implement a responsive "List View" for mobile devices while maintaining the "Grid View" for desktop. This involves updating CSS-in-JS styles to enforce full-width cards and adjusted spacing on smaller screens.

## Implementation Steps

### 1. Optimize Note Card Layout (`wiznote/components/web/WebNoteCard.tsx`)

- **Force Single Column**: Update the `container` style media queries to enforce `width: '100%'` (or equivalent flex basis) on mobile (< 768px).
- **Improve Readability**: Increase font sizes for mobile:
    - Title: 12px -> 16px
    - Preview: 12px -> 14px
    - Date/Tags: 10px -> 12px
- **Adjust Sizing**: Increase `minHeight` and padding to create comfortable touch targets.

### 2. Adjust Container Styles (`wiznote/styles/HomeStyles.ts`)

- **Grid Container**: Modify `webNotesGrid` to handle the single-column layout gracefully on mobile (ensure `gap` doesn't cause overflow).
- **Header Spacing**: Reduce `webHeader` padding on mobile (currently 40px) to reclaim screen real estate.
- **Content Padding**: Reduce `webContent` side padding on mobile for better edge-to-edge use.

### 3. Refine Mobile Header (`wiznote/components/web/WebLayout.tsx`)

- **Header Logic**: Ensure the desktop header content (which might be passed as children) adapts or hides redundant elements when in mobile mode to prevent "double header" visual clutter.

## Verification

- Verify that notes stack vertically on mobile screen widths (< 768px).
- Verify that text is legible without zooming.
- Verify that the layout remains a multi-column grid on desktop (> 768px).