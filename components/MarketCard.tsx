'use client'

import { Market } from '@/lib/polymarket-api'
import { formatCurrency, formatDate, formatTimeUntil, getTimeUntilColor } from '@/lib/utils'
import { useMemo, useState } from 'react'
import HoldersModal from './HoldersModal'

interface MarketCardProps {
  market: Market
}

export default function MarketCard({ market }: MarketCardProps) {
  const [isHoldersModalOpen, setIsHoldersModalOpen] = useState(false)

  const yesPrice = useMemo(() => {
    return market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0.5
  }, [market.outcomePrices])

  const noPrice = useMemo(() => {
    return market.outcomePrices?.[1] ? parseFloat(market.outcomePrices[1]) : 1 - yesPrice
  }, [market.outcomePrices, yesPrice])

  const statusColor = market.closed
    ? 'bg-gray-500'
    : market.finalized
    ? 'bg-green-500'
    : 'bg-green-500'

  const statusText = market.closed
    ? 'Closed'
    : market.finalized
    ? 'Finalized'
    : 'Active'

  return (
    <div className="bg-polymarket-gray rounded-lg p-6 border border-gray-700 hover:border-polymarket-blue transition-all cursor-pointer group">
      {market.image && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={market.image}
            alt={market.question}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${statusColor} ${
            market.closed ? 'bg-gray-500' : 'bg-green-500'
          }`}
        >
          {statusText}
        </span>
        <span className="text-xs text-gray-400">
          {formatDate(market.endDate)}
        </span>
      </div>

      <h3 className="text-lg font-semibold mb-4 line-clamp-2">
        <a
          href={`https://polymarket.com/event/${market.eventSlug || market.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group-hover:text-polymarket-blue transition-colors hover:underline cursor-pointer"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open(`https://polymarket.com/event/${market.eventSlug || market.slug}`, '_blank', 'noopener,noreferrer')
          }}
        >
          {market.question}
        </a>
      </h3>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">YES</span>
            <span className="text-sm font-semibold">{(yesPrice * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${yesPrice * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">NO</span>
            <span className="text-sm font-semibold">{(noPrice * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${noPrice * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Volume</p>
            <p className="text-sm font-semibold">{formatCurrency(market.volumeNum)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Liquidity</p>
            <p className="text-sm font-semibold">{formatCurrency(market.liquidityNum)}</p>
          </div>
        </div>
        
        {market.volume24hNum && market.volume24hNum > 0 && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">24h Volume</p>
              <p className="text-sm font-semibold text-blue-400">{formatCurrency(market.volume24hNum)}</p>
            </div>
            {market.priceChange24h !== undefined && (
              <div>
                <p className="text-xs text-gray-400">24h Change</p>
                <p className={`text-sm font-semibold ${market.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {market.priceChange24h >= 0 ? '+' : ''}{(market.priceChange24h * 100).toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-1">
              {/* Primary category */}
              {market.category && market.category.trim() && (
                <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">{market.category}</span>
              )}
              {/* Additional tags */}
              {market.tags && market.tags.length > 0 && market.tags.slice(1).map((tag, idx) => {
                // Handle both string tags and object tags
                const tagLabel = typeof tag === 'string' ? tag : (typeof tag === 'object' && tag !== null && 'label' in tag ? String(tag.label) : String(tag))
                return (
                  <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">{tagLabel}</span>
                )
              })}
            </div>
            {market.endDate && (
              <span className={getTimeUntilColor(market.endDate)}>
                {formatTimeUntil(market.endDate)}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsHoldersModalOpen(true)
            }}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
            title="View market holders"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Holders
          </button>
        </div>
      </div>

      {/* Holders Modal */}
      <HoldersModal
        isOpen={isHoldersModalOpen}
        onClose={() => setIsHoldersModalOpen(false)}
        marketId={market.conditionId || market.id || ''}
        marketQuestion={market.question || ''}
      />
    </div>
  )
}

