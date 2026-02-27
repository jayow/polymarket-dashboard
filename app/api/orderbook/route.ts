import { NextResponse } from 'next/server'
import { isValidNumericId, buildUrl, secureHeaders, safeErrorResponse, fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const CLOB_ORDERBOOK_ENDPOINT = 'https://clob.polymarket.com/book'

export interface OrderBookLevel {
  price: string
  size: string
}

export interface OrderBookResponse {
  market: string
  asset_id: string
  timestamp: string
  hash: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

export interface ProcessedOrderBook {
  bestBid: { price: number; size: number; usdValue: number } | null
  bestAsk: { price: number; size: number; usdValue: number } | null
  spread: number | null
  spreadPercent: number | null
  midPrice: number | null
  totalBidLiquidity: number
  totalAskLiquidity: number
}

const EMPTY_BOOK: ProcessedOrderBook = {
  bestBid: null,
  bestAsk: null,
  spread: null,
  spreadPercent: null,
  midPrice: null,
  totalBidLiquidity: 0,
  totalAskLiquidity: 0,
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId')

    if (!tokenId) {
      return NextResponse.json({ error: 'tokenId parameter is required' }, { status: 400 })
    }

    if (!isValidNumericId(tokenId)) {
      return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
    }

    const url = buildUrl(CLOB_ORDERBOOK_ENDPOINT, { token_id: tokenId })

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 } as any,
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(EMPTY_BOOK)
      }
      console.error(`[orderbook] Upstream HTTP ${response.status}`)
      return NextResponse.json(EMPTY_BOOK, { status: 502 })
    }

    const data: OrderBookResponse = await response.json()

    if ((data as any).error) {
      return NextResponse.json(EMPTY_BOOK)
    }

    const processedBook = processOrderBook(data)

    return NextResponse.json(processedBook, {
      headers: secureHeaders(30),
    })
  } catch (error) {
    console.error('Error fetching order book:', error)
    return NextResponse.json(EMPTY_BOOK, { status: 500 })
  }
}

function processOrderBook(data: OrderBookResponse): ProcessedOrderBook {
  const bids = data.bids || []
  const asks = data.asks || []

  let bestBid: { price: number; size: number; usdValue: number } | null = null
  if (bids.length > 0) {
    const sortedBids = bids
      .map(b => ({ price: parseFloat(b.price), size: parseFloat(b.size) }))
      .filter(b => !isNaN(b.price) && !isNaN(b.size))
      .sort((a, b) => b.price - a.price)

    if (sortedBids[0]) {
      const bid = sortedBids[0]
      bestBid = { price: bid.price, size: bid.size, usdValue: bid.price * bid.size }
    }
  }

  let bestAsk: { price: number; size: number; usdValue: number } | null = null
  if (asks.length > 0) {
    const sortedAsks = asks
      .map(a => ({ price: parseFloat(a.price), size: parseFloat(a.size) }))
      .filter(a => !isNaN(a.price) && !isNaN(a.size))
      .sort((a, b) => a.price - b.price)

    if (sortedAsks[0]) {
      const ask = sortedAsks[0]
      bestAsk = { price: ask.price, size: ask.size, usdValue: ask.price * ask.size }
    }
  }

  let spread: number | null = null
  let spreadPercent: number | null = null
  let midPrice: number | null = null

  if (bestBid && bestAsk) {
    spread = bestAsk.price - bestBid.price
    midPrice = (bestBid.price + bestAsk.price) / 2
    spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : null
  }

  const totalBidLiquidity = bids.reduce((sum, b) => {
    const price = parseFloat(b.price)
    const size = parseFloat(b.size)
    return sum + (isNaN(price) || isNaN(size) ? 0 : price * size)
  }, 0)

  const totalAskLiquidity = asks.reduce((sum, a) => {
    const price = parseFloat(a.price)
    const size = parseFloat(a.size)
    return sum + (isNaN(price) || isNaN(size) ? 0 : price * size)
  }, 0)

  return { bestBid, bestAsk, spread, spreadPercent, midPrice, totalBidLiquidity, totalAskLiquidity }
}
