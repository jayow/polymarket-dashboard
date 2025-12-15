import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const DATA_API_POSITIONS_ENDPOINT = 'https://data-api.polymarket.com/positions'
const DATA_API_CLOSED_POSITIONS_ENDPOINT = 'https://data-api.polymarket.com/closed-positions'

// Get User All-Time PNL from Polymarket
// Sums: realizedPnl from closed positions + cashPnl from current positions
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

    // Fetch current positions
    const currentResponse = await fetch(`${DATA_API_POSITIONS_ENDPOINT}?user=${walletAddress}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    })

    // Fetch all closed positions with pagination (max 10000 per request per docs)
    let allClosedPositions: any[] = []
    let offset = 0
    const limit = 10000  // API allows up to 10000
    let hasMore = true

    while (hasMore) {
      const closedResponse = await fetch(`${DATA_API_CLOSED_POSITIONS_ENDPOINT}?user=${walletAddress}&limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      })

      if (!closedResponse.ok) {
        break
      }

      const closedPositions = await closedResponse.json()
      if (!Array.isArray(closedPositions) || closedPositions.length === 0) {
        hasMore = false
      } else {
        allClosedPositions.push(...closedPositions)
        offset += limit
        // If we got fewer than the limit, we've reached the end
        if (closedPositions.length < limit) {
          hasMore = false
        }
      }
    }

    // Process current positions (unrealized PNL)
    let unrealizedPnL = 0
    if (currentResponse.ok) {
      const currentPositions = await currentResponse.json()
      if (Array.isArray(currentPositions)) {
        unrealizedPnL = currentPositions.reduce((sum, position) => {
          const cashPnl = position.cashPnl ?? 0
          return sum + (typeof cashPnl === 'number' ? cashPnl : 0)
        }, 0)
      }
    }

    // Process closed positions (realized PNL)
    let realizedPnL = 0
    if (allClosedPositions.length > 0) {
      realizedPnL = allClosedPositions.reduce((sum, position) => {
        const pnl = position.realizedPnl ?? 0
        return sum + (typeof pnl === 'number' ? pnl : 0)
      }, 0)
    }

    // Total all-time PNL = realized (from closed) + unrealized (from current)
    const allTimePnL = realizedPnL + unrealizedPnL
    
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
    return NextResponse.json({ allTimePnL: null })
  }
}

