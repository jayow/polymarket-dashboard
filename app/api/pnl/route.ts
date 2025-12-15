import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

// Official Polymarket PNL endpoint
const USER_PNL_ENDPOINT = 'https://user-pnl-api.polymarket.com/user-pnl'

// Get User All-Time PNL from Polymarket's official PNL API
// Returns time-series PNL data, we extract the latest value
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

    // Fetch from Polymarket's official PNL API
    const response = await fetch(`${USER_PNL_ENDPOINT}?user_address=${walletAddress}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      // Return null if user has no PNL data
      return NextResponse.json({ allTimePnL: null }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    const pnlData = await response.json()
    
    // The API returns an array of {t: timestamp, p: pnl} objects
    // Get the latest (last) PNL value
    let allTimePnL = null
    if (Array.isArray(pnlData) && pnlData.length > 0) {
      const latestEntry = pnlData[pnlData.length - 1]
      allTimePnL = latestEntry.p ?? null
    }
    
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

