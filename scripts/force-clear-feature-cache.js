/**
 * Force Clear Feature Flag Cache
 * This script helps debug and clear all feature flag caches
 */

console.log('🧹 Feature Flag Cache Clearing Guide\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('📱 MOBILE (React Native):');
console.log('   1. Close the app completely');
console.log('   2. Clear app data:');
console.log('      • iOS: Uninstall and reinstall the app');
console.log('      • Android: Settings > Apps > [Your App] > Clear Data');
console.log('   3. Or use the in-app cache clear option if available\n');

console.log('🌐 WEB:');
console.log('   1. Open Developer Console (F12)');
console.log('   2. Go to Application/Storage tab');
console.log('   3. Clear:');
console.log('      • Local Storage');
console.log('      • Session Storage');  
console.log('      • IndexedDB');
console.log('   4. Hard refresh: Ctrl+Shift+R (Win) or Cmd+Shift+R (Mac)\n');

console.log('🔧 PROGRAMMATIC CACHE CLEAR:');
console.log('   Run this in your browser console or add to settings:');
console.log('   ────────────────────────────────────────────────');
console.log(`
// Clear AsyncStorage (React Native) or localStorage (Web)
if (typeof localStorage !== 'undefined') {
  // Web
  localStorage.removeItem('feature_flags_cache');
  localStorage.removeItem('feature_flags_last_sync');
  console.log('✅ Web cache cleared');
} else if (typeof AsyncStorage !== 'undefined') {
  // React Native
  AsyncStorage.removeItem('feature_flags_cache');
  AsyncStorage.removeItem('feature_flags_last_sync');
  console.log('✅ Mobile cache cleared');
}

// Force reload
window.location.reload();
`);
console.log('   ────────────────────────────────────────────────\n');

console.log('✨ QUICK FIX FOR TESTING:');
console.log('   Add this button to your Settings screen:');
console.log('   ────────────────────────────────────────────────');
console.log(`
<TouchableOpacity 
  style={styles.clearCacheButton}
  onPress={async () => {
    try {
      // Clear feature flag cache
      const { featureCacheService } = require('../services/FeatureCacheService');
      const { featureFlagService } = require('../services/FeatureFlagService');
      
      await featureCacheService.invalidate('feature_flags');
      await featureFlagService.clearLocalCache();
      await featureFlagService.forceReloadFromSupabase();
      
      Alert.alert('Success', 'Cache cleared! Please restart the app.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }}
>
  <Text>🧹 Clear Feature Cache</Text>
</TouchableOpacity>
`);
console.log('   ────────────────────────────────────────────────\n');

console.log('🔍 DEBUG CHECKLIST:');
console.log('   ✓ Database has correct values (run: node scripts/check-quiz-feature-status.js)');
console.log('   ✓ Code has correct defaults (constants/DefaultFeatureFlags.ts)');
console.log('   ✓ Cache is cleared (follow steps above)');
console.log('   ✓ App is fully restarted (not just refreshed)');
console.log('   ✓ Check console logs for feature flag status\n');

console.log('📝 CONSOLE LOGS TO CHECK:');
console.log('   Look for these in your console:');
console.log('   • "🔍 NoteDetailScreen: Feature flag status:"');
console.log('   • "ai_quiz: true" or "ai_quiz: false"');
console.log('   • "FeatureFlagService: Loaded X flags from Supabase"\n');

console.log('════════════════════════════════════════════════════\n');
console.log('💡 If still not working, the issue might be:');
console.log('   1. User object not being passed correctly');
console.log('   2. Premium check still active despite database update');
console.log('   3. Feature flag service not initializing properly\n');

console.log('🆘 NUCLEAR OPTION:');
console.log('   Temporarily bypass feature flags for testing:');
console.log('   In app/note/[id].tsx, change line 96 to:');
console.log('   const isAIQuizEnabled = true; // Force enable for testing\n');

