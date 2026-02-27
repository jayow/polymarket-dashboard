import { NextResponse } from 'next/server'
import { parseNumericParam, buildUrl, secureHeaders, safeErrorResponse, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const GAMMA_EVENTS_ENDPOINT = 'https://gamma-api.polymarket.com/events'

const CACHE_DURATION = 120

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseNumericParam(searchParams.get('limit'), 100, 1, 500)
    const offset = parseNumericParam(searchParams.get('offset'), 0, 0, 100000)
    const closed = searchParams.get('closed') === 'true' ? 'true' : 'false'

    const url = buildUrl(GAMMA_EVENTS_ENDPOINT, {
      order: 'id',
      ascending: 'false',
      limit: limit.toString(),
      offset: offset.toString(),
      closed,
    })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: CACHE_DURATION } as any,
    })

    if (!response.ok) {
      console.error(`[markets] Upstream HTTP ${response.status}`)
      return NextResponse.json(safeErrorResponse(), { status: 502 })
    }

    const events = await response.json()

    return NextResponse.json(events, {
      headers: secureHeaders(CACHE_DURATION),
    })
  } catch (error) {
    console.error('Error fetching markets:', error)
    return NextResponse.json(safeErrorResponse(), { status: 500 })
  }
}
