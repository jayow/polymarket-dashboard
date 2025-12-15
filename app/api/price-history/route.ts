import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const CLOB_PRICES_HISTORY_ENDPOINT = 'https://clob.polymarket.com/prices-history'

// Price history API for sparkline charts
// Uses CLOB token ID (from market.clobTokenIds[0] for YES)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId') // CLOB token ID
    const interval = searchParams.get('interval') || 'max' // 1d, 1w, 1m, max
    const fidelity = searchParams.get('fidelity') || '1440' // 1440 = daily data points

    if (!tokenId) {
      return NextResponse.json(
        { error: 'tokenId parameter is required' },
        { status: 400 }
      )
    }

    const url = `${CLOB_PRICES_HISTORY_ENDPOINT}?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 10 minutes
      next: { revalidate: 600 },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    })
  } catch (error: any) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}

