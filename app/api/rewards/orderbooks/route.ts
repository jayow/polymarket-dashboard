import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLOB_ORDERBOOK_ENDPOINT = 'https://clob.polymarket.com/book'
const CLOB_SAMPLING_ENDPOINT = 'https://clob.polymarket.com/sampling-markets'
const OB_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface OrderbookData {
  yesBestBid: number | null
  yesBestAsk: number | null
  yesMid: number | null
  noBestBid: number | null
  noBestAsk: number | null
  noMid: number | null
}

interface MarketTokens {
  conditionId: string
  yesTokenId: string
  noTokenId: string
}

// Persist across hot reloads via globalThis
const globalForOb = globalThis as unknown as {
  orderbookCache?: {
    data: Record<string, OrderbookData>
    timestamp: number
  }
  // Shared with /api/rewards route
  rewardsCache?: {
    data: {
      rewardMarkets: {
        conditionId: string
        yesTokenId: string
        noTokenId: string
        [key: string]: unknown
      }[]
      [key: string]: unknown
    }
    timestamp: number
  }
}

// Deduplicate concurrent requests
let activeFetchPromise: Promise<Record<string, OrderbookData>> | null = null

function extractBest(levels: { price: string; size: string }[], side: 'bid' | 'ask') {
  if (!levels || levels.length === 0) return null
  const parsed = levels.map(l => ({ price: parseFloat(l.price), size: parseFloat(l.size) }))
  if (side === 'bid') {
    parsed.sort((a, b) => b.price - a.price)
  } else {
    parsed.sort((a, b) => a.price - b.price)
  }
  return parsed[0]?.price ?? null
}

async function fetchSingleOrderbook(tokenId: string): Promise<{ bestBid: number | null; bestAsk: number | null; midPrice: number | null }> {
  try {
    const res = await fetch(`${CLOB_ORDERBOOK_ENDPOINT}?token_id=${tokenId}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return { bestBid: null, bestAsk: null, midPrice: null }
    const data = await res.json()
    if (data.error) return { bestBid: null, bestAsk: null, midPrice: null }

    const bestBid = extractBest(data.bids || [], 'bid')
    const bestAsk = extractBest(data.asks || [], 'ask')
    const midPrice = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null

    return { bestBid, bestAsk, midPrice }
  } catch {
    return { bestBid: null, bestAsk: null, midPrice: null }
  }
}

async function getMarketTokens(): Promise<MarketTokens[]> {
  // Try to get from shared rewards cache first
  if (globalForOb.rewardsCache?.data?.rewardMarkets) {
    return globalForOb.rewardsCache.data.rewardMarkets
      .filter(m => m.yesTokenId || m.noTokenId)
      .map(m => ({
        conditionId: m.conditionId,
        yesTokenId: m.yesTokenId,
        noTokenId: m.noTokenId,
      }))
  }

  // Fallback: fetch from CLOB sampling endpoint directly
  const allMarkets: MarketTokens[] = []
  let cursor: string | undefined

  while (true) {
    const url = cursor
      ? `${CLOB_SAMPLING_ENDPOINT}?limit=1000&next_cursor=${cursor}`
      : `${CLOB_SAMPLING_ENDPOINT}?limit=1000`

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) break

    const data = await res.json()
    if (data.data) {
      for (const m of data.data) {
        const yesToken = m.tokens?.find((t: { outcome: string; token_id: string }) => t.outcome === 'Yes')
        const noToken = m.tokens?.find((t: { outcome: string; token_id: string }) => t.outcome === 'No')
        if (yesToken?.token_id || noToken?.token_id) {
          allMarkets.push({
            conditionId: m.condition_id,
            yesTokenId: yesToken?.token_id ?? '',
            noTokenId: noToken?.token_id ?? '',
          })
        }
      }
    }

    if (!data.next_cursor || data.next_cursor === 'LTE=') break
    cursor = data.next_cursor
  }

  return allMarkets
}

async function fetchAllOrderbooks(): Promise<Record<string, OrderbookData>> {
  const tokens = await getMarketTokens()
  console.log(`[orderbooks] Fetching orderbooks for ${tokens.length} markets...`)

  const result: Record<string, OrderbookData> = {}
  const queue = [...tokens]
  let completed = 0

  const worker = async () => {
    while (queue.length > 0) {
      const market = queue.shift()!
      try {
        const [yesBook, noBook] = await Promise.all([
          market.yesTokenId ? fetchSingleOrderbook(market.yesTokenId) : { bestBid: null, bestAsk: null, midPrice: null },
          market.noTokenId ? fetchSingleOrderbook(market.noTokenId) : { bestBid: null, bestAsk: null, midPrice: null },
        ])

        result[market.conditionId] = {
          yesBestBid: yesBook.bestBid,
          yesBestAsk: yesBook.bestAsk,
          yesMid: yesBook.midPrice,
          noBestBid: noBook.bestBid,
          noBestAsk: noBook.bestAsk,
          noMid: noBook.midPrice,
        }
      } catch {
        // Skip failed markets
      }
      completed++
      if (completed % 50 === 0) {
        console.log(`[orderbooks] Progress: ${completed}/${tokens.length}`)
      }
    }
  }

  // 20 concurrent workers server-side
  const CONCURRENCY = 20
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log(`[orderbooks] Done: ${Object.keys(result).length} orderbooks fetched`)
  return result
}

export async function GET() {
  try {
    // Return cached if fresh
    if (globalForOb.orderbookCache && Date.now() - globalForOb.orderbookCache.timestamp < OB_CACHE_TTL) {
      return NextResponse.json({
        orderbooks: globalForOb.orderbookCache.data,
        cached: true,
        count: Object.keys(globalForOb.orderbookCache.data).length,
        timestamp: globalForOb.orderbookCache.timestamp,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    }

    // Deduplicate concurrent requests
    if (!activeFetchPromise) {
      activeFetchPromise = fetchAllOrderbooks().finally(() => {
        activeFetchPromise = null
      })
    }

    const orderbooks = await activeFetchPromise

    // Cache the result
    globalForOb.orderbookCache = { data: orderbooks, timestamp: Date.now() }

    return NextResponse.json({
      orderbooks,
      cached: false,
      count: Object.keys(orderbooks).length,
      timestamp: Date.now(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    console.error('[orderbooks] Error:', error)
    return NextResponse.json(
      { orderbooks: {}, cached: false, count: 0, error: error.message },
      { status: 200 }
    )
  }
}
