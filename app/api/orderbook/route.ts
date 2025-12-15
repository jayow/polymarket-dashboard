import { NextResponse } from 'next/server'

// Mark route as dynamic
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

// Get order book for a token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId') // CLOB token ID

    if (!tokenId) {
      return NextResponse.json(
        { error: 'tokenId parameter is required' },
        { status: 400 }
      )
    }

    const url = `${CLOB_ORDERBOOK_ENDPOINT}?token_id=${tokenId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short cache since order book changes frequently
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      // Return empty order book for markets without order books
      if (response.status === 404) {
        return NextResponse.json({
          bestBid: null,
          bestAsk: null,
          spread: null,
          spreadPercent: null,
          midPrice: null,
          totalBidLiquidity: 0,
          totalAskLiquidity: 0,
        })
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: OrderBookResponse = await response.json()
    
    // Check for error response
    if ((data as any).error) {
      return NextResponse.json({
        bestBid: null,
        bestAsk: null,
        spread: null,
        spreadPercent: null,
        midPrice: null,
        totalBidLiquidity: 0,
        totalAskLiquidity: 0,
      })
    }

    // Process the order book
    const processedBook = processOrderBook(data)
    
    return NextResponse.json(processedBook, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('Error fetching order book:', error)
    return NextResponse.json(
      { 
        bestBid: null,
        bestAsk: null,
        spread: null,
        spreadPercent: null,
        midPrice: null,
        totalBidLiquidity: 0,
        totalAskLiquidity: 0,
        error: error.message 
      },
      { status: 200 } // Return 200 with empty data instead of error
    )
  }
}

function processOrderBook(data: OrderBookResponse): ProcessedOrderBook {
  const bids = data.bids || []
  const asks = data.asks || []

  // Find best bid (highest price)
  let bestBid: { price: number; size: number; usdValue: number } | null = null
  if (bids.length > 0) {
    const sortedBids = bids
      .map(b => ({ price: parseFloat(b.price), size: parseFloat(b.size) }))
      .sort((a, b) => b.price - a.price)
    
    if (sortedBids[0]) {
      const bid = sortedBids[0]
      bestBid = {
        price: bid.price,
        size: bid.size,
        usdValue: bid.price * bid.size, // USD value = price * shares
      }
    }
  }

  // Find best ask (lowest price)
  let bestAsk: { price: number; size: number; usdValue: number } | null = null
  if (asks.length > 0) {
    const sortedAsks = asks
      .map(a => ({ price: parseFloat(a.price), size: parseFloat(a.size) }))
      .sort((a, b) => a.price - b.price)
    
    if (sortedAsks[0]) {
      const ask = sortedAsks[0]
      bestAsk = {
        price: ask.price,
        size: ask.size,
        usdValue: ask.price * ask.size,
      }
    }
  }

  // Calculate spread
  let spread: number | null = null
  let spreadPercent: number | null = null
  let midPrice: number | null = null

  if (bestBid && bestAsk) {
    spread = bestAsk.price - bestBid.price
    midPrice = (bestBid.price + bestAsk.price) / 2
    spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : null
  }

  // Calculate total liquidity
  const totalBidLiquidity = bids.reduce((sum, b) => {
    const price = parseFloat(b.price)
    const size = parseFloat(b.size)
    return sum + (price * size)
  }, 0)

  const totalAskLiquidity = asks.reduce((sum, a) => {
    const price = parseFloat(a.price)
    const size = parseFloat(a.size)
    return sum + (price * size)
  }, 0)

  return {
    bestBid,
    bestAsk,
    spread,
    spreadPercent,
    midPrice,
    totalBidLiquidity,
    totalAskLiquidity,
  }
}

