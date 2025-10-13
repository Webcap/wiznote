# Google Play Data Safety Declaration Guide for WizNote

## ⚠️ CRITICAL: Data Being Transmitted by Your App

Google Play detected data transmission that wasn't declared in your Data Safety form. This guide provides the **complete and accurate** declaration based on your app's actual SDKs and features.

---

## 📊 Data Safety Form - Complete Declaration

### Your Third-Party SDKs That Collect Data:

1. **Stripe SDK** (`@stripe/stripe-react-native`)
2. **Supabase** (`@supabase/supabase-js`)
3. **Expo Modules** (various)
4. **AsyncStorage** (local storage)
5. **NetInfo** (network state)

---

## ✅ REQUIRED Data Safety Declarations

### 1. **Does your app collect or share user data?**
- ✅ **YES**

### 2. **Data Types You MUST Declare:**

#### A. **Personal Information**

##### Email Address
- **Collected:** ✅ YES
- **Shared:** ❌ NO (stored in Supabase)
- **Purpose:** 
  - Account management
  - App functionality
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

##### User Account Info (User ID)
- **Collected:** ✅ YES
- **Shared:** ❌ NO
- **Purpose:**
  - Account management
  - App functionality
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

#### B. **Financial Information**

##### Payment Info
- **Collected:** ✅ YES (via Stripe SDK)
- **Shared:** ✅ YES (with Stripe - payment processor)
- **Purpose:**
  - Payment processing
  - Fraud prevention
- **Collection method:** Optional (Premium features only)
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

##### Purchase History
- **Collected:** ✅ YES
- **Shared:** ✅ YES (with Stripe)
- **Purpose:**
  - Account management
  - Subscription management
- **Collection method:** Optional (Premium features only)
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

#### C. **App Activity**

##### App Interactions
- **Collected:** ✅ YES (feature usage tracking)
- **Shared:** ❌ NO
- **Purpose:**
  - Analytics
  - App functionality
  - Personalization
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

##### In-app Search History
- **Collected:** ✅ YES (if you have search features)
- **Shared:** ❌ NO
- **Purpose:**
  - App functionality
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

#### D. **Files and Docs**

##### User-Generated Content
- **Collected:** ✅ YES (notes, audio recordings, PDFs)
- **Shared:** ❌ NO (except when user explicitly shares)
- **Purpose:**
  - App functionality
  - AI processing
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **Encrypted at rest:** ✅ YES
- **User can request deletion:** ✅ YES

##### Voice or Sound Recordings
- **Collected:** ✅ YES (audio notes)
- **Shared:** ❌ NO
- **Purpose:**
  - App functionality
  - AI transcription
- **Collection method:** Optional (user-initiated)
- **Encrypted in transit:** ✅ YES
- **Encrypted at rest:** ✅ YES
- **User can request deletion:** ✅ YES

#### E. **Device or Other IDs**

##### Device IDs
- **Collected:** ✅ YES (Stripe collects for fraud prevention)
- **Shared:** ✅ YES (with Stripe)
- **Purpose:**
  - Fraud prevention
  - Security
  - Analytics
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ⚠️ Partial (Stripe retains for legal compliance)

#### F. **App Info and Performance**

##### Crash Logs
- **Collected:** ✅ YES (Expo may collect)
- **Shared:** ⚠️ Possibly (check if you use Expo's error reporting)
- **Purpose:**
  - Bug fixes
  - App performance
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

##### Diagnostics
- **Collected:** ✅ YES
- **Shared:** ❌ NO
- **Purpose:**
  - Bug fixes
  - App performance
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

##### Other Performance Data
- **Collected:** ✅ YES (network state via NetInfo)
- **Shared:** ❌ NO
- **Purpose:**
  - App functionality
  - User experience
- **Collection method:** Required
- **Encrypted in transit:** ✅ YES
- **User can request deletion:** ✅ YES

---

## 🔍 SDK-Specific Data Collection

### Stripe SDK Data Collection

The Stripe SDK (`@stripe/stripe-react-native`) automatically collects:

1. **Device Information:**
   - Device model
   - Operating system version
   - Screen size
   - Device fingerprint

2. **Network Information:**
   - IP address (for fraud detection)
   - Network type

3. **Payment Information:**
   - Card details (tokenized)
   - Billing address
   - Payment method metadata

4. **Transaction Data:**
   - Purchase amounts
   - Timestamps
   - Transaction IDs

**Google Play SDK Index Entry:** Check [https://play.google.com/sdks](https://play.google.com/sdks) for Stripe's official declaration.

### Supabase Data Collection

1. **Authentication Data:**
   - Email addresses
   - User IDs
   - Session tokens
   - Authentication timestamps

2. **User Content:**
   - Notes
   - Audio files
   - PDFs
   - User preferences

3. **Usage Data:**
   - Feature usage
   - Subscription status
   - Usage limits

### Expo Modules Data Collection

Depending on which Expo modules you use:

1. **expo-constants:** Device info, app version
2. **expo-audio:** Microphone access, audio recordings
3. **expo-document-picker:** File access
4. **@react-native-async-storage/async-storage:** Local data storage
5. **@react-native-community/netinfo:** Network state

---

## 📝 Step-by-Step: How to Update Your Data Safety Form

### Step 1: Go to Google Play Console
1. Navigate to your app in Google Play Console
2. Go to **Policy** → **App content** → **Data safety**

### Step 2: Answer the Questions

#### Question 1: Does your app collect or share user data?
- Select: **Yes**

#### Question 2: Data Collection and Security

For EACH data type listed above, you must:

1. Select the data type category (Personal info, Financial info, etc.)
2. Check which specific data you collect
3. For each item, specify:
   - ☑️ Is data **collected**?
   - ☑️ Is data **shared** with third parties?
   - ☑️ Is collection **required** or **optional**?
   - ☑️ What **purposes** is it used for?

4. Security practices:
   - ✅ Data is encrypted in transit
   - ✅ Data is encrypted at rest (for stored content)
   - ✅ Users can request that data be deleted
   - ❌ Data is NOT sold to third parties
   - ⚠️ Data IS shared with service providers (Stripe, Supabase)

### Step 3: Third-Party Data Sharing

You MUST declare:

1. **Stripe (Payment Processor)**
   - Purpose: Payment processing, fraud prevention
   - Data shared: Payment info, device IDs, purchase history

2. **Supabase (Backend Service)**
   - Purpose: App functionality, data storage
   - Data shared: Email, user content, authentication data

### Step 4: Review Common Mistakes

❌ **Don't:**
- Omit data collected by third-party SDKs
- Forget device identifiers (Stripe collects these)
- Ignore crash logs or diagnostics
- Miss network/connectivity data

✅ **Do:**
- Check the [Google Play SDK Index](https://play.google.com/sdks)
- Declare ALL data types accurately
- Be specific about third-party sharing
- Include optional/required distinctions

---

## 🔒 Data Security Declarations

For ALL data types, you can declare:

### Encryption
- ✅ **In transit:** HTTPS/TLS encryption (Supabase, Stripe)
- ✅ **At rest:** Supabase encrypts stored data

### User Controls
- ✅ **Deletion:** Your app has account deletion feature
- ✅ **Access:** Users can view their data in the app

### No Third-Party Sales
- ✅ You do NOT sell user data to third parties

---

## 📋 Quick Reference Checklist

Before submitting, verify you've declared:

- [ ] Email addresses (auth)
- [ ] User IDs (auth)
- [ ] Payment information (Stripe)
- [ ] Purchase history (subscriptions)
- [ ] User-generated content (notes, audio, PDFs)
- [ ] Voice recordings (audio notes)
- [ ] App interactions (feature usage)
- [ ] Device IDs (Stripe fraud detection)
- [ ] Crash logs (if using error reporting)
- [ ] Diagnostics (performance data)
- [ ] Network state (NetInfo)
- [ ] Third-party sharing with Stripe
- [ ] Third-party sharing with Supabase

---

## 🔧 If You Want to Reduce Data Collection

If you want to minimize what you need to declare:

### Option 1: Disable Analytics (Not Recommended)
- Remove feature usage tracking
- Set `EXPO_PUBLIC_ENABLE_ANALYTICS=false` in your env

### Option 2: Remove Expo Error Reporting
- Ensure you're not sending crash data to Expo
- Check `app.config.js` for any error reporting configs

### Option 3: Local-First Storage
- Store more data locally (AsyncStorage) instead of Supabase
- Reduces "shared data" declarations

---

## 📞 Support Resources

1. **Google Play SDK Index:**
   [https://play.google.com/sdks](https://play.google.com/sdks)
   - Search for "Stripe" to see their official data safety guidance

2. **Google Play Policy Help:**
   [https://support.google.com/googleplay/android-developer/answer/10787469](https://support.google.com/googleplay/android-developer/answer/10787469)

3. **Stripe Privacy Center:**
   [https://stripe.com/privacy](https://stripe.com/privacy)

4. **Supabase Privacy:**
   [https://supabase.com/privacy](https://supabase.com/privacy)

---

## ⚡ Quick Fix Template

Copy this template for your Data Safety form:

```
DATA COLLECTED:
✓ Email address (required, app functionality, account management)
✓ User ID (required, app functionality)
✓ Payment info (optional, payment processing) - SHARED WITH STRIPE
✓ Purchase history (optional, subscription management) - SHARED WITH STRIPE
✓ User content: notes, audio, PDFs (required, app functionality)
✓ Voice recordings (optional, transcription feature)
✓ App interactions (required, analytics, personalization)
✓ Device IDs (required, fraud prevention) - SHARED WITH STRIPE
✓ Crash logs (required, bug fixes)
✓ Performance data (required, app optimization)

SECURITY:
✓ All data encrypted in transit (HTTPS/TLS)
✓ User content encrypted at rest
✓ Users can request deletion
✓ No data sold to third parties

THIRD-PARTY SHARING:
✓ Stripe (payment processor) - payment info, device IDs, purchase history
✓ Supabase (backend service) - email, user content, app data
```

---

## 🚨 Critical Notes

1. **Be Accurate:** Google SCANS your APK to detect data transmission. Don't omit anything.

2. **Check SDK Index:** Before submitting, search the Google Play SDK Index for "Stripe" and any other SDKs you use.

3. **Update Regularly:** When you add new SDKs or features, update your Data Safety form.

4. **Privacy Policy:** Ensure your privacy policy (in `app/privacy.tsx`) matches your Data Safety declarations.

---

## ✅ After Updating

1. Save your Data Safety form
2. Submit for review
3. Wait for approval (can take 1-3 days)
4. Monitor for any additional feedback from Google

---

**Last Updated:** October 13, 2025
**App Version:** 1.3.0

