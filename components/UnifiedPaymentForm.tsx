import { PaymentForm } from './PaymentForm';
import { PaymentSheetForm } from './PaymentSheetForm.native';

interface UnifiedPaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  planInterval?: string;
  stripePriceId?: string;
  productId?: string; // iOS/Android product ID for in-app purchase
  couponId?: string; // Stripe coupon ID for promotions
  promotionId?: string; // Internal promotion ID for tracking
  hidePlanSummary?: boolean; // Hide plan summary when shown elsewhere
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function UnifiedPaymentForm(props: UnifiedPaymentFormProps) {
  // For mobile platforms, use PaymentSheetForm
  try {
    return (
      <PaymentSheetForm
        planId={props.planId}
        planName={props.planName}
        planPrice={props.planPrice}
        planInterval={props.planInterval}
        stripePriceId={props.stripePriceId}
        productId={props.productId || ''}
        couponId={props.couponId}
        promotionId={props.promotionId}
        hidePlanSummary={props.hidePlanSummary}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    );
  } catch (error) {
    console.warn('PaymentSheetForm not available, falling back to PaymentForm:', error);
    // Fallback to PaymentForm for any error cases
    return (
      <PaymentForm
        planId={props.planId}
        planName={props.planName}
        planPrice={props.planPrice}
        planInterval={props.planInterval}
        stripePriceId={props.stripePriceId}
        couponId={props.couponId}
        promotionId={props.promotionId}
        hidePlanSummary={props.hidePlanSummary}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    );
  }
}
