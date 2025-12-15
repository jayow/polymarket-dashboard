import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const DATA_API_POSITIONS_ENDPOINT = 'https://data-api.polymarket.com/positions'

// Polymarket Data API - Get User Positions (includes PNL)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user') // wallet address

    if (!user) {
      return NextResponse.json(
        { error: 'user (wallet address) parameter is required' },
        { status: 400 }
      )
    }

    const url = `${DATA_API_POSITIONS_ENDPOINT}?user=${user}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 1 minute (positions change frequently)
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      // If user has no positions or doesn't exist, return empty array instead of error
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json([])
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const positions = await response.json()
    
    return NextResponse.json(positions, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    console.error('Error fetching positions:', error)
    // Return empty array on error instead of failing
    return NextResponse.json([])
  }
}

