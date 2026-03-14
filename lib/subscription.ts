export type SubscriptionTier = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'expired' | 'none'

export interface UserSubscription {
  tier: SubscriptionTier
  status: SubscriptionStatus
  expiresAt: Date | null
}

// For now, everyone gets free active access
// When billing is added, this will check against a database/payment provider
export function getUserSubscription(_privyUserId: string): UserSubscription {
  return {
    tier: 'free',
    status: 'active',
    expiresAt: null,
  }
}

export function isSubscriptionActive(sub: UserSubscription): boolean {
  if (sub.status !== 'active') return false
  if (sub.expiresAt && sub.expiresAt < new Date()) return false
  return true
}
