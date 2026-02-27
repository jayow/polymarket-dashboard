import { NextResponse } from 'next/server'
import { isValidNumericId, parseNumericParam, buildUrl, secureHeaders, safeErrorResponse, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const CLOB_PRICES_HISTORY_ENDPOINT = 'https://clob.polymarket.com/prices-history'

const VALID_INTERVALS = new Set(['1d', '1w', '1m', 'max'])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId')
    const interval = searchParams.get('interval') || 'max'
    const fidelity = parseNumericParam(searchParams.get('fidelity'), 1440, 1, 10080).toString()

    if (!tokenId) {
      return NextResponse.json({ error: 'tokenId parameter is required' }, { status: 400 })
    }

    if (!isValidNumericId(tokenId)) {
      return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
    }

    if (!VALID_INTERVALS.has(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    const url = buildUrl(CLOB_PRICES_HISTORY_ENDPOINT, { market: tokenId, interval, fidelity })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 600 } as any,
    })

    if (!response.ok) {
      console.error(`[price-history] Upstream HTTP ${response.status}`)
      return NextResponse.json(safeErrorResponse(), { status: 502 })
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: secureHeaders(600),
    })
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(safeErrorResponse(), { status: 500 })
  }
}
