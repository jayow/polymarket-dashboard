import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const DATA_API_POSITIONS_ENDPOINT = 'https://data-api.polymarket.com/positions'

// Get User All-Time PNL from Polymarket positions
// Sums cashPnl (unrealized) + realizedPnl (realized) from all positions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet') || searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'wallet (address) parameter is required' },
        { status: 400 }
      )
    }

    // Fetch all positions for the user
    const url = `${DATA_API_POSITIONS_ENDPOINT}?user=${walletAddress}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 1 minute (positions change frequently)
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      // If user has no positions, return null instead of error
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json({ allTimePnL: null })
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const positions = await response.json()
    
    if (!Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({ allTimePnL: null })
    }
    
    // Sum up both cashPnl (unrealized) and realizedPnl (realized) for total all-time PNL
    // cashPnl = unrealized profit/loss from open positions
    // realizedPnl = realized profit/loss from closed positions
    const allTimePnL = positions.reduce((sum, position) => {
      const cashPnl = position.cashPnl ?? 0
      const realizedPnl = position.realizedPnl ?? 0
      return sum + (typeof cashPnl === 'number' ? cashPnl : 0) + (typeof realizedPnl === 'number' ? realizedPnl : 0)
    }, 0)
    
    return NextResponse.json({ allTimePnL }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    console.error('Error fetching PNL:', error)
    // Return null on error instead of failing
    return NextResponse.json({ allTimePnL: null })
  }
}

