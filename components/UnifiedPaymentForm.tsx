import { Platform } from 'react-native';
import { PaymentForm } from './PaymentForm';
import { PaymentSheetForm } from './PaymentSheetForm';

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
  // Use PaymentSheet on mobile platforms, Stripe checkout on web
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <PaymentSheetForm
        planId={props.planId}
        planName={props.planName}
        planPrice={props.planPrice}
        stripePriceId={props.stripePriceId} // Add this line
        productId={props.productId || ''}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    );
  }

  // Use Stripe checkout on web
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
