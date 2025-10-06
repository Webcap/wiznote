import { PaymentForm } from './PaymentForm';
import { PaymentSheetForm } from './PaymentSheetForm.native';

interface UnifiedPaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  stripePriceId?: string;
  productId?: string; // iOS/Android product ID for in-app purchase
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
        stripePriceId={props.stripePriceId}
        productId={props.productId || ''}
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
        stripePriceId={props.stripePriceId}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    );
  }
}
