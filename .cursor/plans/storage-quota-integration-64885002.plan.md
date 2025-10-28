<!-- 64885002-e2b2-425e-ad65-eec813aa1fc0 a15e4c44-0db2-421f-b22c-d60491490992 -->
# Storage Quota Integration Plan

## Overview

Integrate note storage quotas: 5GB for free users, configurable limits for premium users set via admin plan editor. Track all attachments (audio, PDFs, images, flashcard audio) and display usage on the existing usage tracking page (`app/usage.tsx`).

## Implementation Steps

### 1. Database Schema Updates

**File: `database/storage-quota-setup.sql`** (new)

Add storage tracking fields to `user_profiles` table:

- `storage_used_bytes` (bigint, default 0)
- `storage_quota_bytes` (bigint, default 5368709120 for 5GB)
- `last_storage_sync` (timestamp)

Add `premium_plans` table field:

- `maxStorage` already exists (line 25 in `types/EnhancedPlans.ts`) - just needs to be used

Create RLS policies for storage quota access.

### 2. Update Type Definitions

**File: `types/User.ts`**

Add to `User` interface (after line 23):

```typescript
storage?: {
  usedBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  lastSyncedAt: Date;
};
```

**File: `types/EnhancedPlans.ts`**

Already has `maxStorage: number` (line 25) - ensure it's in GB.

### 3. Storage Quota Service

**File: `services/StorageQuotaService.ts`** (new)

Create comprehensive service with methods:

- `getUserStorageQuota(userId: string)` - Get current usage and quota
- `calculateTotalStorage(userId: string)` - Calculate all file sizes retroactively
- `checkQuotaAvailable(userId: string, fileSize: number)` - Pre-upload validation
- `incrementStorage(userId: string, fileSize: number)` - After successful upload
- `decrementStorage(userId: string, fileSize: number)` - After file deletion
- `syncStorageQuota(userId: string)` - Recalculate from actual files
- `getQuotaForPlan(planId: string, isPremium: boolean)` - Get quota based on plan

Constants:

- `FREE_TIER_QUOTA_GB = 5`
- `FREE_TIER_QUOTA_BYTES = 5 * 1024 * 1024 * 1024`

### 4. Update File Upload Services

**Files: `services/AudioStorage.ts`, `services/PDFStorage.ts`**

For each upload method (around line 67 in AudioStorage, line 86 in PDFStorage):

1. Add quota check before upload:
```typescript
const fileSize = await getFileSize(fileOrUri);
const canUpload = await storageQuotaService.checkQuotaAvailable(userId, fileSize);
if (!canUpload) {
  throw new Error('QUOTA_EXCEEDED');
}
```

2. After successful upload, increment quota:
```typescript
await storageQuotaService.incrementStorage(userId, fileSize);
```

3. In delete methods, decrement quota:
```typescript
await storageQuotaService.decrementStorage(userId, fileSize);
```


### 5. Update Usage Tracking Page

**File: `app/usage.tsx`**

Add storage quota to `FEATURES` array (after line 78):

```typescript
{
  id: 'storage_quota',
  name: 'Storage Quota',
  icon: 'cloud',
  color: '#1E90FF',
  period: 'monthly'
}
```

In `loadUsageData` function (around line 150), fetch storage quota:

```typescript
const storageData = await storageQuotaService.getUserStorageQuota(user.id);
```

Add storage to `usageData` state with formatted display.

**File: `components/UnifiedUsageDisplay.tsx`**

The `formatBytes` function already exists (line 63) - use for storage display.

Ensure `storage` type is handled in `formatUsage` function (line 54).

### 6. Quota Exceeded Handler

**File: `components/QuotaExceededModal.tsx`** (new)

Create modal component that:

- Shows current usage vs quota
- Displays what files are taking up space
- Has "Upgrade to Premium" button that opens in-app upgrade flow
- Links to `app/join-premium.tsx`

**File: `hooks/useStorageQuota.ts`** (new)

Create hook that:

- Fetches current quota status
- Provides `checkBeforeUpload(fileSize)` helper
- Shows quota exceeded modal when needed
- Returns `{ quota, used, available, percentage, canUpload, showUpgradeModal }`

### 7. Update Admin Plan Editor

**File: `app/admin/enhanced-plans.tsx`**

In the `PlanForm` component (imported from `components/admin/PlanForm`), ensure the `maxStorage` field is editable:

- Display as GB input (convert to/from bytes internally)
- Default to 5GB for free plans
- Validation: must be >= 5GB

**File: `components/admin/PlanForm.tsx`**

Add storage quota input field to form (check if it exists, if not add):

```typescript
<TextInput
  label="Storage Quota (GB)"
  value={maxStorage}
  onChangeText={(val) => setMaxStorage(Number(val))}
  keyboardType="numeric"
/>
```

### 8. Quota Enforcement in Upload Contexts

**Files: `contexts/AudioUploadContext.tsx`, `contexts/PDFUploadContext.tsx`**

Wrap upload functions with quota checks:

```typescript
try {
  await storageQuotaService.checkQuotaAvailable(userId, fileSize);
  // existing upload logic
} catch (error) {
  if (error.message === 'QUOTA_EXCEEDED') {
    showQuotaExceededModal();
    return;
  }
  throw error;
}
```

### 9. Retroactive Storage Calculation Script

**File: `scripts/calculate-existing-storage.js`** (new)

One-time script to:

1. Query all users
2. For each user, sum file sizes from:

   - `audio-files` bucket
   - `pdf-files` bucket
   - Any image attachments in notes

3. Update `user_profiles.storage_used_bytes`
4. Log results

Run once during deployment.

### 10. Storage Sync Service

**File: `services/StorageSyncService.ts`** (new)

Background service that periodically:

- Verifies storage_used_bytes matches actual file sizes
- Corrects discrepancies
- Can be triggered manually or via cron

## Key Files Modified

- `database/storage-quota-setup.sql` (new)
- `types/User.ts` (add storage field)
- `services/StorageQuotaService.ts` (new)
- `services/AudioStorage.ts` (add quota checks)
- `services/PDFStorage.ts` (add quota checks)
- `app/usage.tsx` (display storage quota)
- `components/UnifiedUsageDisplay.tsx` (format storage)
- `components/QuotaExceededModal.tsx` (new)
- `hooks/useStorageQuota.ts` (new)
- `app/admin/enhanced-plans.tsx` (ensure maxStorage editable)
- `contexts/AudioUploadContext.tsx` (quota enforcement)
- `contexts/PDFUploadContext.tsx` (quota enforcement)
- `scripts/calculate-existing-storage.js` (new)
- `services/StorageSyncService.ts` (new)

## Behavior Summary

- **Free users**: 5GB quota, hard limit enforced
- **Premium users**: Quota set in plan (retrieved from `premium_plans.maxStorage`)
- **Quota exceeded**: Block upload → Show modal → Prompt upgrade with direct link
- **Display**: Usage tracking page shows storage bar with used/total
- **Retroactive**: Calculate all existing files on deployment
- **Real-time**: Track on every upload/delete operation

### To-dos

- [ ] Create database migration for storage quota fields in user_profiles table
- [ ] Update User interface to include storage tracking fields
- [ ] Implement StorageQuotaService with quota calculation and validation methods
- [ ] Create useStorageQuota hook for quota checking and modal management
- [ ] Add quota checks to AudioStorage upload and delete methods
- [ ] Add quota checks to PDFStorage upload and delete methods
- [ ] Create QuotaExceededModal component with upgrade prompt
- [ ] Add storage quota display to usage tracking page
- [ ] Add quota enforcement to AudioUploadContext and PDFUploadContext
- [ ] Ensure maxStorage field is editable in admin plan editor
- [ ] Create script to calculate existing storage for all users
- [ ] Implement StorageSyncService for periodic quota verification
- [ ] Test quota enforcement, upgrade flow, and usage display