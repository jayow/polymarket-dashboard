import { NextResponse } from 'next/server'
import { isValidId, parseNumericParam, buildUrl, secureHeaders, safeErrorResponse, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const DATA_API_HOLDERS_ENDPOINT = 'https://data-api.polymarket.com/holders'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market')
    const limit = parseNumericParam(searchParams.get('limit'), 500, 1, 500).toString()
    const minBalance = parseNumericParam(searchParams.get('minBalance'), 1, 0, 1000000).toString()

    if (!market) {
      return NextResponse.json({ error: 'market parameter is required' }, { status: 400 })
    }

    if (!isValidId(market)) {
      return NextResponse.json({ error: 'Invalid market parameter' }, { status: 400 })
    }

    const url = buildUrl(DATA_API_HOLDERS_ENDPOINT, { market, limit, minBalance })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 } as any,
    })

    if (!response.ok) {
      console.error(`[holders] Upstream HTTP ${response.status}`)
      return NextResponse.json(safeErrorResponse(), { status: 502 })
    }

    const holdersData = await response.json()

    return NextResponse.json(holdersData, {
      headers: secureHeaders(300),
    })
  } catch (error) {
    console.error('Error fetching holders:', error)
    return NextResponse.json(safeErrorResponse(), { status: 500 })
  }
}
