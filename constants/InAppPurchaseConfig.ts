// In-App Purchase Product ID Configuration
// These IDs must match what's configured in App Store Connect and Google Play Console

export interface InAppPurchaseProduct {
  planId: string;
  iosProductId: string;
  androidProductId: string;
  description: string;
}

export const IN_APP_PURCHASE_PRODUCTS: InAppPurchaseProduct[] = [
  {
    planId: 'premium_monthly',
    iosProductId: 'com.wiznote.premium.monthly',
    androidProductId: 'premium_monthly_subscription',
    description: 'Premium Monthly Subscription'
  },
  {
    planId: 'premium_yearly',
    iosProductId: 'com.wiznote.premium.yearly',
    androidProductId: 'premium_yearly_subscription',
    description: 'Premium Yearly Subscription'
  },
  {
    planId: 'premium_weekly',
    iosProductId: 'com.wiznote.premium.weekly',
    androidProductId: 'premium_weekly_subscription',
    description: 'Premium Weekly Subscription'
  }
];

export function getProductId(planId: string, platform: 'ios' | 'android'): string | undefined {
  const product = IN_APP_PURCHASE_PRODUCTS.find(p => p.planId === planId);
  if (!product) return undefined;
  
  return platform === 'ios' ? product.iosProductId : product.androidProductId;
}

export function getProductByPlanId(planId: string): InAppPurchaseProduct | undefined {
  return IN_APP_PURCHASE_PRODUCTS.find(p => p.planId === planId);
}

export function getAllProductIds(platform: 'ios' | 'android'): string[] {
  return IN_APP_PURCHASE_PRODUCTS.map(p => 
    platform === 'ios' ? p.iosProductId : p.androidProductId
  );
}
