# Mobile Web App Banner Implementation

This document explains how WizNote detects mobile visitors on the web and prompts them to download or open the native app.

## Overview

When users visit WizNote from a mobile browser (iOS Safari, Android Chrome, etc.), they will see a smart app banner at the top of the page that:

1. **Detects the platform** (iOS, Android, iPad, etc.)
2. **Checks if dismissed** (remembers for 7 days)
3. **Attempts to open the app** if installed via deep linking
4. **Redirects to App Store/Play Store** if app is not installed

## Features

### ✅ Implemented

- **Platform Detection**: Automatically detects iOS, Android, iPad, and tablets
- **Smart Deep Linking**: Attempts to open the native app if installed
- **Graceful Fallback**: Redirects to appropriate app store if app not installed
- **User Preferences**: Remembers if user dismissed the banner (7-day timeout)
- **Context Preservation**: Deep links include current page path
- **Theme Support**: Banner adapts to light/dark theme
- **Tablet Control**: Option to show/hide on tablets
- **Accessibility**: Full ARIA labels and roles

## Configuration

### 1. Update App Store URLs

Edit `utils/mobileDetection.ts` and update the app store URLs:

```typescript
export function getAppStoreUrl(mobileInfo: MobileInfo): string | null {
  if (mobileInfo.isIOS || mobileInfo.isIPad) {
    // Replace with your actual App Store ID
    return 'https://apps.apple.com/app/wiznote/id123456789';
  }
  
  if (mobileInfo.isAndroid) {
    // Replace with your actual package name
    return 'https://play.google.com/store/apps/details?id=com.wiznote.app';
  }
  
  return null;
}
```

**How to find your App Store ID:**
- iOS: Go to your App Store Connect, find your app, the ID is in the URL
- Android: Your package name from `android/app/build.gradle`

### 2. Customize Banner Appearance

Edit `app/_layout.web.tsx` to customize the banner:

```tsx
<SmartAppBanner 
  appName="WizNote"
  description="Get our native app for a better experience"
  iconUrl="/icon.png"  // Path to your app icon
  backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'}
  textColor={isDark ? '#FFFFFF' : '#000000'}
  buttonColor="#6A5ACD"
  showOnTablets={false}  // Set to true to show on tablets
/>
```

### 3. Deep Link Configuration

The app already has deep linking configured with the `wiznote://` scheme (see `app.config.web.js`).

**To test deep links:**

1. **iOS**: 
   - Add Associated Domains in your Apple Developer account
   - Add `apple-app-site-association` file to your web server

2. **Android**:
   - Add intent filters in `AndroidManifest.xml`
   - Add `assetlinks.json` file to your web server

Example deep links:
- `wiznote://` - Opens app home
- `wiznote://note/123` - Opens specific note
- `wiznote://create` - Opens create screen

## How It Works

### Detection Flow

```
1. User visits wiznote.com on mobile browser
2. SmartAppBanner detects platform (iOS/Android)
3. Checks if user previously dismissed banner (localStorage)
4. If not dismissed, banner appears at top of page
5. User taps "Open" or "Get" button
6. Attempts to open app via deep link (wiznote://)
7. If app installed → app opens with current context
8. If app not installed → redirects to App Store/Play Store
```

### Platform Detection Logic

The `detectMobile()` function checks:
- **User Agent**: Identifies iOS, Android, tablets
- **Touch Points**: Detects iPad Pro in desktop mode
- **Navigator Properties**: Additional device information

### Banner Dismissal

When user closes the banner:
- Timestamp saved to `localStorage`
- Banner hidden for 7 days
- After 7 days, banner appears again
- Can be customized in `utils/mobileDetection.ts`

## Files Created/Modified

### New Files
1. `utils/mobileDetection.ts` - Mobile detection utilities
2. `components/web/SmartAppBanner.tsx` - Banner component

### Modified Files
1. `app/_layout.web.tsx` - Added SmartAppBanner component

## Customization Options

### Change Dismissal Duration

Edit `hasUserDismissedBanner()` in `utils/mobileDetection.ts`:

```typescript
// Change 7 to desired number of days
return daysSinceDismissal < 7;
```

### Change Deep Link Timeout

Edit `checkAppInstalled()` in `utils/mobileDetection.ts`:

```typescript
// Change 2000 to desired milliseconds
timeout: number = 2000
```

### Show on Tablets

Edit `SmartAppBanner` in `app/_layout.web.tsx`:

```tsx
<SmartAppBanner 
  showOnTablets={true}  // Changed to true
/>
```

### Custom Styling

The banner uses React Native StyleSheet. Edit `components/web/SmartAppBanner.tsx` to customize styles:

```typescript
const styles = StyleSheet.create({
  container: {
    // Customize container styles
  },
  // ... other styles
});
```

## Testing

### Local Testing

1. **Start the web app**:
   ```bash
   npm run web
   ```

2. **Open Chrome DevTools**:
   - Press F12
   - Click "Toggle device toolbar" (Ctrl+Shift+M)
   - Select a mobile device (iPhone, Pixel, etc.)

3. **Test the banner**:
   - Banner should appear at the top
   - Click the close button to test dismissal
   - Clear localStorage to reset: `localStorage.removeItem('wiznote_app_banner_dismissed')`
   - Click "Open"/"Get" button to test deep link

### Production Testing

1. **Deploy to your web hosting**
2. **Visit from actual mobile device**
3. **Test both scenarios**:
   - Without app installed (should redirect to store)
   - With app installed (should open app)

## Advanced: Universal Links

For a seamless experience where tapping web links automatically opens the app:

### iOS Universal Links

1. Create `apple-app-site-association` file:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.wiznote.app",
      "paths": ["*"]
    }]
  }
}
```

2. Host at `https://yourdomain.com/.well-known/apple-app-site-association`

3. Add Associated Domains capability in Xcode:
   - Select your project
   - Signing & Capabilities
   - Add "Associated Domains"
   - Add `applinks:yourdomain.com`

### Android App Links

1. Create `assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.wiznote.app",
    "sha256_cert_fingerprints": ["YOUR_CERT_FINGERPRINT"]
  }
}]
```

2. Host at `https://yourdomain.com/.well-known/assetlinks.json`

3. Add intent filters in `AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" 
        android:host="yourdomain.com" />
</intent-filter>
```

## Browser Support

- ✅ iOS Safari 9+
- ✅ Android Chrome 40+
- ✅ Samsung Internet
- ✅ Firefox Mobile
- ✅ Edge Mobile
- ✅ Opera Mobile

## Privacy & Analytics

The banner:
- ✅ Uses only localStorage (no cookies)
- ✅ No external tracking
- ✅ No personal data collected
- ✅ User preference respected

Consider adding analytics to track:
- Banner impressions
- Button clicks
- Dismissal rate
- Store visits
- App opens

## Troubleshooting

### Banner Not Showing

1. **Check Platform**: Only shows on web (`Platform.OS === 'web'`)
2. **Check Mobile Detection**: Open console, check `detectMobile()` result
3. **Check Dismissal**: Clear localStorage
4. **Check Tablet Settings**: Might be hidden on tablets

### Deep Link Not Working

1. **Check URL Scheme**: Verify `wiznote://` matches `app.config.web.js`
2. **Check App Installation**: Deep links only work if app is installed
3. **Check Browser**: Some browsers block deep links
4. **Check HTTPS**: Deep links work better on HTTPS

### Store Redirect Not Working

1. **Update Store URLs**: Verify URLs in `getAppStoreUrl()`
2. **Check Platform Detection**: Verify iOS/Android detected correctly
3. **Check Console**: Look for errors in browser console

## Next Steps

1. ✅ Update your App Store URLs in `utils/mobileDetection.ts`
2. ✅ Customize banner appearance in `app/_layout.web.tsx`
3. ✅ Test on actual mobile devices
4. ✅ Set up Universal Links for production
5. ✅ Add analytics tracking (optional)
6. ✅ Deploy and monitor user engagement

## Related Documentation

- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

---

**Questions?** Check the inline code comments in:
- `utils/mobileDetection.ts`
- `components/web/SmartAppBanner.tsx`

