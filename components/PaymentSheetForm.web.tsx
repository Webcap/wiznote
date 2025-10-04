import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface PaymentSheetFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  productId: string;
  stripePriceId?: string; // Add this to match mobile version
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentSheetForm(props: PaymentSheetFormProps) {
  // This component should never be rendered on web
  // It's here just to satisfy the import requirements
  return (
    <ThemedView style={{ padding: 20, alignItems: 'center' }}>
      <ThemedText>PaymentSheet is not available on web platform</ThemedText>
      <ThemedText>Please use the web checkout flow instead</ThemedText>
    </ThemedView>
  );
}
