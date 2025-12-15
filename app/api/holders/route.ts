import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const DATA_API_HOLDERS_ENDPOINT = 'https://data-api.polymarket.com/holders'

// Polymarket Data API - Get Market Holders
// Max limit: 500 holders per request
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market') // conditionId
    // Max allowed by Polymarket API is 500
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 500).toString()
    const minBalance = searchParams.get('minBalance') || '1'

    if (!market) {
      return NextResponse.json(
        { error: 'market (conditionId) parameter is required' },
        { status: 400 }
      )
    }

    const url = `${DATA_API_HOLDERS_ENDPOINT}?market=${market}&limit=${limit}&minBalance=${minBalance}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const holdersData = await response.json()
    
    return NextResponse.json(holdersData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error: any) {
    console.error('Error fetching holders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch holders' },
      { status: 500 }
    )
  }
}

