'use client'

import { useState, useEffect } from 'react'

interface ProcessedOrderBook {
  bestBid: { price: number; size: number; usdValue: number } | null
  bestAsk: { price: number; size: number; usdValue: number } | null
  spread: number | null
  spreadPercent: number | null
  midPrice: number | null
  totalBidLiquidity: number
  totalAskLiquidity: number
}

interface OrderBookCellProps {
  tokenId: string | undefined
  className?: string
}

// Fetch order book for a token
async function fetchOrderBook(tokenId: string): Promise<ProcessedOrderBook | null> {
  try {
    const response = await fetch(`/api/orderbook?tokenId=${tokenId}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Shared cache for order book data - exported so filtering can access it
export const orderBookCache = new Map<string, { data: ProcessedOrderBook | null, timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 seconds (order book changes frequently)

// Export ProcessedOrderBook type for use in filtering
export type { ProcessedOrderBook }

// Format large numbers compactly
function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toFixed(0)
}

// Format USD value
function formatUSD(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

export default function OrderBookCell({ tokenId, className = '' }: OrderBookCellProps) {
  const [orderBook, setOrderBook] = useState<ProcessedOrderBook | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokenId) {
      setLoading(false)
      return
    }

    // Check cache first
    const cached = orderBookCache.get(tokenId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrderBook(cached.data)
      setLoading(false)
      return
    }

    // Fetch data
    setLoading(true)
    fetchOrderBook(tokenId)
      .then(data => {
        setOrderBook(data)
        orderBookCache.set(tokenId, { data, timestamp: Date.now() })
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [tokenId])

  if (!tokenId) {
    return <div className={`text-gray-500 text-xs ${className}`}>N/A</div>
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!orderBook || (!orderBook.bestBid && !orderBook.bestAsk)) {
    return <div className={`text-gray-500 text-xs text-center ${className}`}>—</div>
  }

  const { bestBid, bestAsk, spread, spreadPercent } = orderBook

  return (
    <div className={`text-xs space-y-1 ${className}`}>
      {/* Bid/Ask with prices and USD amounts */}
      <div className="flex items-center gap-2 justify-center">
        {/* Bid */}
        <div className="text-right">
          <span className="text-green-400 font-mono">
            {bestBid ? `${(bestBid.price * 100).toFixed(1)}¢` : '—'}
          </span>
          {bestBid && (
            <span className="text-green-600 ml-1 text-[10px]">
              {formatUSD(bestBid.usdValue)}
            </span>
          )}
        </div>
        
        <span className="text-gray-600">/</span>
        
        {/* Ask */}
        <div className="text-left">
          <span className="text-red-400 font-mono">
            {bestAsk ? `${(bestAsk.price * 100).toFixed(1)}¢` : '—'}
          </span>
          {bestAsk && (
            <span className="text-red-600 ml-1 text-[10px]">
              {formatUSD(bestAsk.usdValue)}
            </span>
          )}
        </div>
      </div>

      {/* Spread */}
      {spread !== null && (
        <div className="text-center text-gray-400">
          <span className="font-semibold">{(spread * 100).toFixed(1)}¢</span>
          <span className="text-gray-500 ml-1">
            ({spreadPercent?.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}

// Simpler spread-only cell for when you just want the spread
export function SpreadCell({ tokenId, className = '' }: OrderBookCellProps) {
  const [orderBook, setOrderBook] = useState<ProcessedOrderBook | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokenId) {
      setLoading(false)
      return
    }

    const cached = orderBookCache.get(tokenId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrderBook(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchOrderBook(tokenId)
      .then(data => {
        setOrderBook(data)
        orderBookCache.set(tokenId, { data, timestamp: Date.now() })
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [tokenId])

  if (!tokenId || loading) {
    return <span className={`text-gray-500 ${className}`}>—</span>
  }

  if (!orderBook?.spread) {
    return <span className={`text-gray-500 ${className}`}>—</span>
  }

  const spreadCents = orderBook.spread * 100
  const spreadColor = spreadCents < 2 ? 'text-green-400' : spreadCents < 5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <span className={`font-mono ${spreadColor} ${className}`}>
      {spreadCents.toFixed(1)}¢
    </span>
  )
}

