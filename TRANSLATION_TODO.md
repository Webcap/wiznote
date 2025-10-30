# Translation TODO - User-Facing Strings

This document lists all hardcoded user-facing strings that need to be translated, excluding admin and support dashboards.

## Components

### components/ShareModal.tsx
**Web Modal Section:**
- Line 247: `"Share Note"` (header title)
- Line 262: `"Share with"` (section title)
- Line 267: `"Search users or enter email..."` (placeholder)
- Line 284: `"Searching..."` (loading text)
- Line 301: `"Unknown User"` (fallback user name)
- Line 326: `"Permission Level"` (section title)
- Line 329: `"View Only"`, `"Admin"`, `"Edit"` (permission labels)
- Line 356: `"Message (Optional)"` (section title)
- Line 364: `"Add a message..."` (placeholder)
- Line 373: `"Public Link"` (section title)
- Line 375: `"Anyone with the link can view this note"` (description)
- Line 397: `"Create Public Link"` (button text)
- Line 435: `"Cancel"` (button)
- Line 452: `"Share"` (button)

**Snackbar Messages:**
- Line 80: `"No users found matching your search"`
- Line 82: `Found ${results.length} user${results.length === 1 ? '' : 's'}`
- Line 86: `"Search failed. Please try again."`
- Line 96: `Selected ${user.display_name || user.email}`
- Line 103: `"Selection cleared"`
- Line 115: `"Sharing note..."`
- Line 126: `Note shared successfully with ${selectedUser.display_name || selectedUser.email}!`
- Line 131: `"Failed to share note. Please try again."`
- Line 142: `"Sharing note via email..."`
- Line 153: `Note shared successfully with ${searchQuery}!`
- Line 169: `"Creating public link..."`
- Line 178: `"Public link created!"`
- Line 181: `"Failed to create public link."`
- Line 193: `"Link copied to clipboard!"`
- Line 197: `"Failed to copy link"`

### components/ShareCard.tsx
**Mobile Card Section:**
- Line 194: `"Share Note"` (header title)
- Line 220: `"Share with"` (section title)
- Line 226: `"Search users or enter email..."` (placeholder)
- Line 245: `"Searching..."` (loading text)
- Line 261: `"Unknown User"` (fallback user name)
- Line 294: `"Permission Level"` (section title)
- Line 298: `"View Only"`, `"Admin"`, `"Edit"` (permission labels)
- Line 332: `"Message (Optional)"` (section title)
- Line 340: `"Add a message..."` (placeholder)
- Line 353: `"Public Link"` (section title)
- Line 356: `"Anyone with the link can view this note"` (description)
- Line 371: `"Create Public Link"` (button text)
- Line 397: `"Cancel"` (button)
- Line 417: `"Share"` (button)

**Snackbar Messages:**
- Line 62: `"No users found matching your search"`
- Line 64: `Found ${results.length} user${results.length === 1 ? '' : 's'}`
- Line 68: `"Search failed. Please try again."`
- Line 81: `Selected ${user.display_name || user.email}`
- Line 88: `"Selection cleared"`
- Line 100: `"Sharing note..."`
- Line 111: `Note shared successfully with ${selectedUser.display_name || selectedUser.email}!`
- Line 116: `"Failed to share note. Please try again."`
- Line 127: `"Sharing note via email..."`
- Line 138: `Note shared successfully with ${searchQuery}!`
- Line 154: `"Creating public link..."`
- Line 163: `"Public link created!"`
- Line 166: `"Failed to create public link."`
- Line 179: `"Link copied to clipboard!"`
- Line 183: `"Failed to copy link"`

### components/RichTextEditor.tsx
- Line 126: `"Start writing..."` (default placeholder - but this is passed as prop, so check usage)

## App Screens

### app/(tabs)/search.tsx
**Mobile Version Only (web version appears to use translations):**
- Line 293: `"Search notes..."` (placeholder - should use `t('search.searchNotesPlaceholder')`)
- Line 308: `"Filters"` (section title)
- Line 312: `"Note Type"` (filter label)
- Line 329: `"Tags"` (filter label)
- Line 348: `"Sort By"` (filter label)
- Line 357: `"Last Modified"`, `"Created Date"`, `"Title"` (sort options)
- Line 366: `"Order"` (filter label)
- Line 375: `"Newest First"`, `"Oldest First"` (order options)
- Line 402: `"Clear All Filters"` (button text)
- Line 410: `{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} found` (results count)
- Line 416: `"Searching notes..."` (loading text)

### app/quizzes/[id].tsx
- Line 43: `Alert.alert('Error', 'No quiz ID provided')`
- Line 113: `Alert.alert('Error', 'Failed to load quiz details')`
- Line 142: `Alert.alert('Success', 'Quiz deleted successfully')`
- Line 146: `Alert.alert('Error', 'Failed to delete quiz')`

### app/quizzes/[id]/take.tsx
- Line 57: `Alert.alert('Error', 'No quiz ID provided')`
- Line 126: `Alert.alert('Error', 'Failed to load quiz')`
- Line 214: `Alert.alert('Error', 'Failed to submit quiz')`

### app/create.tsx
- Line 125: `Alert.alert('Save Error', errorMessage)` (though errorMessage may already be translated)

### app/(auth)/signup.tsx
**Labels:**
- Line 268: `"Display Name (Optional)"` (label - web version)
- Line 283: `"Email Address"` (label - web version)
- Line 298: `"Password"` (label - web version)
- Line 327: `"Confirm Password"` (label - web version)
- Line 435: `"Display Name (Optional)"` (label - mobile version)
- Line 448: `"Email Address"` (label - mobile version)
- Line 462: `"Password"` (label - mobile version)
- Line 487: `"Confirm Password"` (label - mobile version)

**Placeholders:**
- Line 271: `"Enter your name"` (placeholder - web version)
- Line 286: `"Enter your email"` (placeholder - web version)
- Line 302: `"Enter your password"` (placeholder - web version)
- Line 331: `"Confirm your password"` (placeholder - web version)
- Line 438: `"Enter your name"` (placeholder - mobile version)
- Line 451: `"Enter your email"` (placeholder - mobile version)
- Line 466: `"Enter your password"` (placeholder - mobile version)
- Line 491: `"Confirm your password"` (placeholder - mobile version)

### app/note/[id].native.tsx
- Line 538: `Alert.alert('', '')` (empty alert - this is a bug, should be removed or have proper message)

## Summary by Category

### Auth/Signup Feature
- Form labels (Display Name, Email Address, Password, etc.)
- Form placeholders

### Share Feature (ShareModal & ShareCard)
- All UI labels (Share Note, Permission Level, etc.)
- All snackbar success/error messages
- All placeholder text
- Permission labels (View Only, Admin, Edit)
- Status messages (Searching..., Sharing..., etc.)

### Search Feature
- Mobile-specific hardcoded strings (web version is already translated)
- Filter labels and options
- Results count messages

### Quiz Feature
- Error alerts in quiz detail and quiz taking screens

### General
- RichTextEditor placeholder (if not already using translation)

## Recommended Translation Keys Structure

### Share Feature (`share` namespace)
```json
{
  "share": {
    "shareNote": "Share Note",
    "shareWith": "Share with",
    "searchUsersOrEmail": "Search users or enter email...",
    "searching": "Searching...",
    "unknownUser": "Unknown User",
    "permissionLevel": "Permission Level",
    "viewOnly": "View Only",
    "admin": "Admin",
    "edit": "Edit",
    "messageOptional": "Message (Optional)",
    "addMessage": "Add a message...",
    "publicLink": "Public Link",
    "publicLinkDescription": "Anyone with the link can view this note",
    "createPublicLink": "Create Public Link",
    "cancel": "Cancel",
    "shareButton": "Share",
    "noUsersFound": "No users found matching your search",
    "usersFound": "Found {{count}} user",
    "usersFoundPlural": "Found {{count}} users",
    "searchFailed": "Search failed. Please try again.",
    "selectedUser": "Selected {{user}}",
    "selectionCleared": "Selection cleared",
    "sharingNote": "Sharing note...",
    "noteSharedSuccess": "Note shared successfully with {{user}}!",
    "shareFailed": "Failed to share note. Please try again.",
    "sharingViaEmail": "Sharing note via email...",
    "noteSharedEmailSuccess": "Note shared successfully with {{email}}!",
    "creatingPublicLink": "Creating public link...",
    "publicLinkCreated": "Public link created!",
    "createPublicLinkFailed": "Failed to create public link.",
    "linkCopied": "Link copied to clipboard!",
    "copyLinkFailed": "Failed to copy link"
  }
}
```

### Search Feature Additions (`search` namespace - additions)
```json
{
  "search": {
    "filters": "Filters",
    "noteType": "Note Type",
    "tags": "Tags",
    "sortBy": "Sort By",
    "lastModified": "Last Modified",
    "createdDate": "Created Date",
    "title": "Title",
    "order": "Order",
    "newestFirst": "Newest First",
    "oldestFirst": "Oldest First",
    "clearAllFilters": "Clear All Filters",
    "noteFound": "{{count}} note found",
    "notesFound": "{{count}} notes found",
    "searchingNotes": "Searching notes..."
  }
}
```

### Quiz Feature Additions (`quizzes` namespace - additions)
```json
{
  "quizzes": {
    "noQuizIdProvided": "No quiz ID provided",
    "failedToLoadQuizDetails": "Failed to load quiz details",
    "quizDeletedSuccess": "Quiz deleted successfully",
    "failedToDeleteQuiz": "Failed to delete quiz",
    "failedToLoadQuiz": "Failed to load quiz",
    "failedToSubmitQuiz": "Failed to submit quiz"
  }
}
```

### Auth/Signup Feature Additions (`signup` namespace - additions)
```json
{
  "signup": {
    "displayNameOptional": "Display Name (Optional)",
    "emailAddress": "Email Address",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "enterYourName": "Enter your name",
    "enterYourEmail": "Enter your email",
    "enterYourPassword": "Enter your password",
    "confirmYourPassword": "Confirm your password"
  }
}
```

**Note:** Some of these may already exist in the `auth` namespace - check existing translations.json first!

