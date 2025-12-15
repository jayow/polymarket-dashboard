'use client'

import { useState, useEffect, useMemo } from 'react'

interface PricePoint {
  t: number // timestamp
  p: number // price (0-1)
}

interface SparklineProps {
  tokenId: string | undefined
  width?: number
  height?: number
  className?: string
}

// Fetch price history for a token
async function fetchPriceHistory(tokenId: string): Promise<PricePoint[]> {
  try {
    const response = await fetch(`/api/price-history?tokenId=${tokenId}&interval=max&fidelity=1440`)
    if (!response.ok) return []
    const data = await response.json()
    return data.history || []
  } catch {
    return []
  }
}

// Simple cache to avoid refetching
const priceHistoryCache = new Map<string, { data: PricePoint[], timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export default function Sparkline({ tokenId, width = 80, height = 24, className = '' }: SparklineProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!tokenId) {
      setLoading(false)
      return
    }

    // Check cache first
    const cached = priceHistoryCache.get(tokenId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPriceHistory(cached.data)
      setLoading(false)
      return
    }

    // Fetch data
    setLoading(true)
    fetchPriceHistory(tokenId)
      .then(data => {
        setPriceHistory(data)
        priceHistoryCache.set(tokenId, { data, timestamp: Date.now() })
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [tokenId])

  // Generate SVG path for sparkline
  const { path, currentPrice, priceChange, minPrice, maxPrice } = useMemo(() => {
    if (priceHistory.length < 2) {
      return { path: '', currentPrice: null, priceChange: null, minPrice: null, maxPrice: null }
    }

    // Get last 30 data points for cleaner visualization
    const data = priceHistory.slice(-30)
    
    const prices = data.map(p => p.p)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 0.01 // Avoid division by zero

    // Normalize prices to SVG coordinates
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((point.p - minP) / range) * (height - 4) - 2 // Leave 2px padding
      return { x, y }
    })

    // Create SVG path
    const pathD = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`
      return `${acc} L ${point.x} ${point.y}`
    }, '')

    const firstPrice = data[0].p
    const lastPrice = data[data.length - 1].p
    const change = lastPrice - firstPrice

    return {
      path: pathD,
      currentPrice: lastPrice,
      priceChange: change,
      minPrice: minP,
      maxPrice: maxP
    }
  }, [priceHistory, width, height])

  if (!tokenId) {
    return <div className={`text-gray-500 text-xs ${className}`}>N/A</div>
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || priceHistory.length < 2) {
    return <div className={`text-gray-500 text-xs ${className}`}>—</div>
  }

  // Determine color based on price change
  const isUp = priceChange !== null && priceChange >= 0
  const strokeColor = isUp ? '#22c55e' : '#ef4444' // green-500 or red-500

  return (
    <div className={`relative group ${className}`}>
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible"
      >
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id={`gradient-${tokenId?.slice(0,8)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#gradient-${tokenId?.slice(0,8)})`}
        />
        
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current price dot */}
        {currentPrice !== null && (
          <circle
            cx={width}
            cy={height - ((currentPrice - (minPrice || 0)) / ((maxPrice || 1) - (minPrice || 0) || 0.01)) * (height - 4) - 2}
            r="2"
            fill={strokeColor}
          />
        )}
      </svg>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {currentPrice !== null && (
          <>
            <span className="font-semibold">{(currentPrice * 100).toFixed(1)}%</span>
            <span className={`ml-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '↑' : '↓'} {Math.abs((priceChange || 0) * 100).toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </div>
  )
}

