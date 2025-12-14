import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const GAMMA_EVENTS_ENDPOINT = 'https://gamma-api.polymarket.com/events'

// Cache duration: 2 minutes (120 seconds)
const CACHE_DURATION = 120

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const closed = searchParams.get('closed') || 'false'

    const url = `${GAMMA_EVENTS_ENDPOINT}?order=id&ascending=false&limit=${limit}&offset=${offset}&closed=${closed}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 2 minutes
      next: { revalidate: CACHE_DURATION },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const events = await response.json()
    
    return NextResponse.json(events, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Add cache headers for client-side caching
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
      },
    })
  } catch (error: any) {
    console.error('Error fetching markets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}

