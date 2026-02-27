import { NextResponse } from 'next/server'
import { isValidWallet, buildUrl, secureHeaders, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const USER_PNL_ENDPOINT = 'https://user-pnl-api.polymarket.com/user-pnl'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet') || searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json({ error: 'wallet parameter is required' }, { status: 400 })
    }

    if (!isValidWallet(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const url = buildUrl(USER_PNL_ENDPOINT, { user_address: walletAddress })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 } as any,
    })

    if (!response.ok) {
      return NextResponse.json({ allTimePnL: null }, {
        headers: secureHeaders(),
      })
    }

    const pnlData = await response.json()

    let allTimePnL = null
    if (Array.isArray(pnlData) && pnlData.length > 0) {
      const latestEntry = pnlData[pnlData.length - 1]
      allTimePnL = typeof latestEntry?.p === 'number' ? latestEntry.p : null
    }

    return NextResponse.json({ allTimePnL }, {
      headers: secureHeaders(60),
    })
  } catch (error) {
    console.error('Error fetching PNL:', error)
    return NextResponse.json({ allTimePnL: null })
  }
}
