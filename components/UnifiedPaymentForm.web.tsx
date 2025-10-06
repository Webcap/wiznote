import { PaymentForm } from './PaymentForm';

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
  // For web platform, always use PaymentForm
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
