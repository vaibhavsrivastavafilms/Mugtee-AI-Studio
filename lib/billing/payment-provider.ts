import 'server-only'

export type PaymentProviderId = 'razorpay' | 'stripe'

export function resolvePaymentProvider(): PaymentProviderId {
  const forced = process.env.PAYMENT_PROVIDER?.trim().toLowerCase()
  if (forced === 'stripe' && process.env.STRIPE_SECRET_KEY?.trim()) return 'stripe'
  if (forced === 'razorpay' && hasRazorpayConfigured()) return 'razorpay'
  if (process.env.STRIPE_SECRET_KEY?.trim()) return 'stripe'
  if (hasRazorpayConfigured()) return 'razorpay'
  return 'razorpay'
}

export function hasRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() &&
      (process.env.RAZORPAY_KEY_SECRET?.trim() || process.env.RAZORPAY_API_SECRET?.trim())
  )
}

export function hasStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

/** Map product plan id → Stripe price env var suffix. */
export function stripePriceIdForPlan(planId: string): string | null {
  if (planId === 'creator') return process.env.STRIPE_PRICE_CREATOR?.trim() ?? null
  if (planId === 'pro') return process.env.STRIPE_PRICE_PRO?.trim() ?? null
  if (planId === 'agency') return process.env.STRIPE_PRICE_AGENCY?.trim() ?? null
  return null
}
