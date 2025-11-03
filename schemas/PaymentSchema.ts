/**
 * Payment & Subscription Validation Schema
 * 
 * Validates payment and subscription-related inputs.
 */

import { z } from 'zod';

/**
 * Plan ID Schema
 * - Must match one of the defined plan IDs
 */
export const PlanIdSchema = z.enum(
  ['monthly', 'yearly', 'monthly-ultra', 'yearly-ultra'],
  {
    message: 'Invalid plan ID',
  }
);

/**
 * Subscription Status Schema
 */
export const SubscriptionStatusSchema = z.enum(
  ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'],
  {
    message: 'Invalid subscription status',
  }
);

/**
 * Payment Method Schema
 */
export const PaymentMethodSchema = z.enum(['card', 'paypal', 'apple_pay', 'google_pay'], {
  message: 'Invalid payment method',
});

/**
 * Create Checkout Session Schema
 */
export const CreateCheckoutSchema = z.object({
  planId: PlanIdSchema,
  userId: z.string().uuid('Invalid user ID'),
  userEmail: z.string().email('Invalid email').max(255),
  successUrl: z.string().url('Invalid success URL').max(500),
  cancelUrl: z.string().url('Invalid cancel URL').max(500),
});

/**
 * Create Payment Sheet Schema (Mobile)
 */
export const CreatePaymentSheetSchema = z.object({
  planId: PlanIdSchema,
  userId: z.string().uuid('Invalid user ID'),
  userEmail: z.string().email('Invalid email').max(255),
});

/**
 * Confirm Payment Schema
 */
export const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID required'),
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Cancel Subscription Schema
 */
export const CancelSubscriptionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  subscriptionId: z.string().min(1, 'Subscription ID required'),
  reason: z
    .enum([
      'too_expensive',
      'not_using',
      'missing_features',
      'poor_quality',
      'found_alternative',
      'other',
    ])
    .optional(),
  feedback: z.string().max(1000, 'Feedback too long').optional(),
});

/**
 * Reactivate Subscription Schema
 */
export const ReactivateSubscriptionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  subscriptionId: z.string().min(1, 'Subscription ID required'),
});

/**
 * Webhook Event Schema
 */
export const WebhookEventSchema = z.object({
  type: z.string().min(1, 'Event type required'),
  data: z.record(z.string(), z.any()),
  created: z.number().int().positive(),
});

/**
 * Stripe Customer ID Schema
 */
export const StripeCustomerIdSchema = z
  .string()
  .regex(/^cus_[a-zA-Z0-9]+$/, 'Invalid Stripe customer ID');

/**
 * Stripe Subscription ID Schema
 */
export const StripeSubscriptionIdSchema = z
  .string()
  .regex(/^sub_[a-zA-Z0-9]+$/, 'Invalid Stripe subscription ID');

/**
 * Amount Schema (in cents)
 */
export const AmountSchema = z
  .number()
  .int()
  .positive()
  .max(99999999, 'Amount too large'); // Max $999,999.99

/**
 * Currency Schema
 */
export const CurrencySchema = z
  .string()
  .length(3, 'Currency must be 3 characters')
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Invalid currency code');

/**
 * Price Schema
 */
export const PriceSchema = z.object({
  amount: AmountSchema,
  currency: CurrencySchema,
  interval: z.enum(['month', 'year'], {
    message: 'Invalid billing interval',
  }),
});

/**
 * Type exports
 */
export type CreateCheckout = z.infer<typeof CreateCheckoutSchema>;
export type CreatePaymentSheet = z.infer<typeof CreatePaymentSheetSchema>;
export type ConfirmPayment = z.infer<typeof ConfirmPaymentSchema>;
export type CancelSubscription = z.infer<typeof CancelSubscriptionSchema>;
export type ReactivateSubscription = z.infer<typeof ReactivateSubscriptionSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type Price = z.infer<typeof PriceSchema>;

/**
 * Validation helper functions
 */

export function validateCreateCheckout(data: unknown): CreateCheckout {
  return CreateCheckoutSchema.parse(data);
}

export function validateCancelSubscription(data: unknown): CancelSubscription {
  return CancelSubscriptionSchema.parse(data);
}

export function validateWebhookEvent(data: unknown): WebhookEvent {
  return WebhookEventSchema.parse(data);
}

export function safeValidateCheckout(data: unknown): {
  success: boolean;
  data?: CreateCheckout;
  error?: string;
} {
  const result = CreateCheckoutSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = result.error.issues
      .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }
}

/**
 * Validate plan transition
 * Ensures users can only upgrade/downgrade to valid plans
 */
export function validatePlanTransition(
  currentPlan: string,
  newPlan: string
): { valid: boolean; error?: string } {
  const planHierarchy = {
    monthly: 1,
    yearly: 1,
    'monthly-ultra': 2,
    'yearly-ultra': 2,
  };

  const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy];
  const newLevel = planHierarchy[newPlan as keyof typeof planHierarchy];

  if (!currentLevel || !newLevel) {
    return { valid: false, error: 'Invalid plan' };
  }

  // Can always upgrade
  if (newLevel > currentLevel) {
    return { valid: true };
  }

  // Can switch billing intervals at same level
  if (newLevel === currentLevel) {
    return { valid: true };
  }

  // Downgrade requires special handling
  return {
    valid: false,
    error: 'Downgrades must be done at end of billing period',
  };
}

