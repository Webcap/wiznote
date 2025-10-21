# Audio Playback Fix for Web

## Issue
Audio playback on web was failing with the error: `NotSupportedError: The element has no supported sources`

## Root Cause
1. **Expired Signed URLs**: Audio files were stored with signed URLs that could expire, and these expired URLs were being used directly for playback
2. **expo-audio Compatibility**: The `createAudioPlayer` function from expo-audio had issues properly handling Supabase signed URLs on web
3. **Missing Source Refresh**: The system wasn't refreshing signed URLs before attempting playback

## Solution

### 1. Always Generate Fresh Signed URLs (`services/AudioUtils.ts`)
- Added `extractSupabaseFilePath()` method to extract file paths from both signed and public Supabase URLs
- Modified `createSound()` to always generate a fresh signed URL with 1-hour expiry for any Supabase audio file
- This ensures the URL is valid and not expired when attempting playback

```typescript
// Extract file path from Supabase signed or public URL
private static extractSupabaseFilePath(url: string): string | null {
  // Handle signed URLs: /storage/v1/object/sign/audio-files/path/to/file?token=...
  // Handle public URLs: /storage/v1/object/public/audio-files/path/to/file
  // Returns the file path for use with createSignedUrl()
}
```

### 2. Prefer HTML5 Audio for Web (`services/AudioUtils.ts`)
- Changed web audio handling to use HTML5 Audio API by default instead of expo-audio
- HTML5 Audio has better compatibility with Supabase signed URLs and handles CORS properly
- Added expo-audio as a fallback only if HTML5 Audio fails

```typescript
if (isWeb) {
  // Use HTML5 Audio directly for better compatibility with Supabase signed URLs
  return await this.createWebAudioHandler(finalUri);
}
```

### 3. Enhanced HTML5 Audio Handler (`services/AudioUtils.ts`)
- Improved error handling with detailed MediaError codes
- Removed `crossOrigin` setting for Supabase URLs (they handle CORS internally)
- Added multiple event listeners (`loadedmetadata`, `canplay`, `error`)
- Added 10-second timeout for audio loading
- Better cleanup of event listeners to prevent memory leaks

```typescript
// Detailed error messages based on MediaError codes:
// - MEDIA_ERR_ABORTED: Audio loading aborted
// - MEDIA_ERR_NETWORK: Network error while loading audio
// - MEDIA_ERR_DECODE: Audio decoding error - format may not be supported
// - MEDIA_ERR_SRC_NOT_SUPPORTED: Audio source not supported
```

### 4. Updated AudioPlayer Component (`components/AudioPlayer.tsx`)
- Enhanced `loadAudio()` to properly detect and handle both HTML5 Audio and expo-audio
- Added type checking for HTMLAudioElement vs expo-audio
- Properly extracts duration from both audio types

```typescript
const isWebAudio = typeof HTMLAudioElement !== 'undefined' && newSound instanceof HTMLAudioElement;

if (isWebAudio) {
  // For HTML5 Audio element
  const webAudio = newSound as HTMLAudioElement;
  status = {
    isLoaded: webAudio.readyState >= 2,
    durationMillis: (webAudio.duration || 0) * 1000,
    duration: webAudio.duration || 0
  };
}
```

## Benefits
1. ✅ **No More Expired URLs**: Fresh signed URLs are generated on every playback attempt
2. ✅ **Better Web Compatibility**: HTML5 Audio works reliably with Supabase signed URLs
3. ✅ **Improved Error Messages**: Users get clear, actionable error messages
4. ✅ **Proper CORS Handling**: Removed crossOrigin setting that was causing issues with signed URLs
5. ✅ **Robust Fallbacks**: If HTML5 Audio fails, system falls back to expo-audio

## Testing Recommendations
1. Test audio playback on web with fresh audio recordings
2. Test audio playback on web with older audio recordings (to verify signed URL refresh works)
3. Verify audio playback still works on mobile (iOS/Android)
4. Test with different audio formats (m4a, webm, mp3)
5. Test network error scenarios

## Files Modified
- `services/AudioUtils.ts`: Core audio handling logic
- `components/AudioPlayer.tsx`: Audio player UI component

## Future Improvements
- Consider caching fresh signed URLs for a short period to reduce API calls
- Add retry logic for network failures during signed URL generation
- Consider migrating audio storage to use public buckets if appropriate for the use case

