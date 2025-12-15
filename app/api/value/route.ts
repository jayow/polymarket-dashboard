import { NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const DATA_API_VALUE_ENDPOINT = 'https://data-api.polymarket.com/value'

// Polymarket Data API - Get User Value (includes total PNL)
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

    const url = `${DATA_API_VALUE_ENDPOINT}?user=${user}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 1 minute (value changes frequently)
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      // If user has no value or doesn't exist, return null instead of error
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json(null)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const valueData = await response.json()
    
    return NextResponse.json(valueData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    console.error('Error fetching value:', error)
    // Return null on error instead of failing
    return NextResponse.json(null)
  }
}

