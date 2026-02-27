// Shared security utilities for API routes

// Validate hex-like IDs (condition IDs, token IDs, wallet addresses)
// Allows: hex chars, digits, 0x prefix — blocks injection characters
const SAFE_ID_RE = /^[a-fA-F0-9x]+$/
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/
const NUMERIC_RE = /^[0-9]+$/
const GA_ID_RE = /^G-[A-Z0-9]+$/

export function isValidId(value: string): boolean {
  return SAFE_ID_RE.test(value) && value.length <= 256
}

export function isValidWallet(value: string): boolean {
  return WALLET_RE.test(value)
}

export function isValidNumericId(value: string): boolean {
  return NUMERIC_RE.test(value) && value.length <= 128
}

export function isValidGAId(value: string): boolean {
  return GA_ID_RE.test(value)
}

// Validate and clamp a numeric query param
export function parseNumericParam(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

// Safe URL construction with URLSearchParams
export function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

// Standard secure response headers (no wildcard CORS)
export function secureHeaders(cacheMaxAge?: number): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
  }
  if (cacheMaxAge) {
    headers['Cache-Control'] = `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`
  }
  return headers
}

// Generic error — never leak internal details to client
export function safeErrorResponse(status: number = 500) {
  return { error: 'Service temporarily unavailable' }
}

// Fetch with timeout (AbortController)
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}
