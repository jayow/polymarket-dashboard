import { NextResponse } from 'next/server'
import { isValidWallet, buildUrl, secureHeaders, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const DATA_API_VALUE_ENDPOINT = 'https://data-api.polymarket.com/value'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')

    if (!user) {
      return NextResponse.json({ error: 'user parameter is required' }, { status: 400 })
    }

    if (!isValidWallet(user)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const url = buildUrl(DATA_API_VALUE_ENDPOINT, { user })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 } as any,
    })

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json(null)
      }
      console.error(`[value] Upstream HTTP ${response.status}`)
      return NextResponse.json(null)
    }

    const valueData = await response.json()

    return NextResponse.json(valueData, {
      headers: secureHeaders(60),
    })
  } catch (error) {
    console.error('Error fetching value:', error)
    return NextResponse.json(null)
  }
}
