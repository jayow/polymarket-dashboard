import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

// Use Dome API for accurate all-time PNL
const DOME_API_PNL_ENDPOINT = 'https://api.domeapi.io/v1/polymarket/wallet/pnl'

// Dome API - Get User All-Time PNL
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

    // Use granularity=all to get all-time PNL
    const url = `${DOME_API_PNL_ENDPOINT}/${walletAddress}?granularity=all`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 5 minutes (PNL doesn't change frequently)
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      // If user has no PNL data, return null instead of error
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json(null)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const pnlData = await response.json()
    
    // Extract the latest/all-time PNL from the response
    // The response has pnl_over_time array with cumulative PNL
    // The last entry should be the all-time PNL
    let allTimePnL: number | null = null
    if (pnlData.pnl_over_time && Array.isArray(pnlData.pnl_over_time) && pnlData.pnl_over_time.length > 0) {
      const lastEntry = pnlData.pnl_over_time[pnlData.pnl_over_time.length - 1]
      allTimePnL = lastEntry.pnl_to_date || null
    }
    
    return NextResponse.json({ allTimePnL }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error: any) {
    console.error('Error fetching PNL:', error)
    // Return null on error instead of failing
    return NextResponse.json(null)
  }
}

