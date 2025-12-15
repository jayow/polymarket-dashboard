'use client'

import { Market } from '@/lib/polymarket-api'
import { formatCurrency, formatDate, formatDateTime, formatTimeUntil, getTimeUntilColor } from '@/lib/utils'
import { useState, useEffect } from 'react'
import HoldersModal from './HoldersModal'
import Sparkline from './Sparkline'
import OrderBookCell from './OrderBookCell'

export type TableSortField = 'question' | 'category' | 'yesPrice' | 'noPrice' | 'volume' | 'liquidity' | 'volume24h' | 'endDate' | 'daysUntil' | 'status'
export type TableSortOrder = 'asc' | 'desc'

interface MarketTableProps {
  markets: Market[]
  onSort?: (field: TableSortField, order: TableSortOrder) => void
  sortField?: TableSortField
  sortOrder?: TableSortOrder
}

export default function MarketTable({ markets, onSort, sortField, sortOrder }: MarketTableProps) {
  const [localSortField, setLocalSortField] = useState<TableSortField>('endDate')
  const [localSortOrder, setLocalSortOrder] = useState<TableSortOrder>('asc')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [isHoldersModalOpen, setIsHoldersModalOpen] = useState(false)

  const currentSortField = sortField || localSortField
  const currentSortOrder = sortOrder || localSortOrder

  const handleOpenHolders = (market: Market) => {
    setSelectedMarket(market)
    setIsHoldersModalOpen(true)
  }

  const handleCloseHolders = () => {
    setIsHoldersModalOpen(false)
    setSelectedMarket(null)
  }

  // Debug: Log when markets prop changes
  useEffect(() => {
    const marketIds = markets.map(m => m.id)
    const uniqueIds = new Set(marketIds)
    const hasDuplicates = marketIds.length !== uniqueIds.size
    
    console.log(`[MarketTable] Received ${markets.length} markets`, {
      uniqueIds: uniqueIds.size,
      hasDuplicates,
      sampleIds: marketIds.slice(0, 5)
    })
    
    if (hasDuplicates) {
      const duplicates = marketIds.filter((id, index) => marketIds.indexOf(id) !== index)
      console.warn(`[MarketTable] ⚠️ Found ${duplicates.length} duplicate market IDs:`, duplicates.slice(0, 10))
    }
  }, [markets])

  const handleSort = (field: TableSortField) => {
    const newOrder = currentSortField === field && currentSortOrder === 'asc' ? 'desc' : 'asc'
    if (onSort) {
      onSort(field, newOrder)
    } else {
      setLocalSortField(field)
      setLocalSortOrder(newOrder)
    }
  }

  const SortIcon = ({ field }: { field: TableSortField }) => {
    if (currentSortField !== field) {
      return <span className="text-gray-500 ml-1">↕</span>
    }
    return <span className="text-polymarket-blue ml-1">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-gray-700/50">
            <th 
              className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[200px]"
              onClick={() => handleSort('question')}
            >
              Market <SortIcon field="question" />
            </th>
            <th 
              className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[120px]"
              onClick={() => handleSort('category')}
            >
              Tag <SortIcon field="category" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-green-400/80 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[70px]"
              onClick={() => handleSort('yesPrice')}
            >
              YES <SortIcon field="yesPrice" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-red-400/80 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[70px]"
              onClick={() => handleSort('noPrice')}
            >
              NO <SortIcon field="noPrice" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[90px]"
              onClick={() => handleSort('volume')}
            >
              Vol <SortIcon field="volume" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[90px]"
              onClick={() => handleSort('liquidity')}
            >
              Liq <SortIcon field="liquidity" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[90px]"
              onClick={() => handleSort('volume24h')}
            >
              24h <SortIcon field="volume24h" />
            </th>
            <th 
              className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[140px]"
              onClick={() => handleSort('endDate')}
            >
              Resolves <SortIcon field="endDate" />
            </th>
            <th 
              className="text-right p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[80px]"
              onClick={() => handleSort('daysUntil')}
            >
              ETA <SortIcon field="daysUntil" />
            </th>
            <th 
              className="text-center p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap w-[60px]"
              onClick={() => handleSort('status')}
            >
              <SortIcon field="status" />
            </th>
            <th className="text-center p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-[60px]">
              📈
            </th>
            <th className="text-center p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-[120px]">
              Bid/Ask
            </th>
            <th className="text-center p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-[80px]">
              👥
            </th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market, index) => {
            const yesPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0.5
            const noPrice = market.outcomePrices?.[1] ? parseFloat(market.outcomePrices[1]) : 1 - yesPrice
            const statusColor = market.closed
              ? 'bg-gray-500'
              : market.finalized
              ? 'bg-green-500'
              : 'bg-blue-500'
            const statusText = market.closed
              ? 'Closed'
              : market.finalized
              ? 'Finalized'
              : 'Active'

            return (
              <tr
                key={market.id}
                className={`border-b border-gray-800 hover:bg-polymarket-gray/50 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-900/30' : ''
                }`}
              >
                <td className="p-2">
                  <div className="max-w-[200px]">
                    <a
                      href={`https://polymarket.com/event/${market.eventSlug || market.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-xs font-medium line-clamp-2 hover:text-polymarket-blue hover:underline transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault()
                        window.open(`https://polymarket.com/event/${market.eventSlug || market.slug}`, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      {market.question}
                    </a>
                    {market.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{market.description}</p>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {/* Primary category */}
                    {market.category && market.category.trim() && (
                      <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 text-[10px] rounded">
                        {market.category}
                      </span>
                    )}
                    {/* Additional tags */}
                    {market.tags && market.tags.length > 0 && market.tags.slice(1).map((tag, idx) => {
                      // Handle both string tags and object tags
                      const tagLabel = typeof tag === 'string' ? tag : (typeof tag === 'object' && tag !== null && 'label' in tag ? String(tag.label) : String(tag))
                      return (
                        <span key={idx} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] rounded">
                          {tagLabel}
                        </span>
                      )
                    })}
                    {(!market.category || !market.category.trim()) && (!market.tags || market.tags.length === 0) && (
                      <span className="text-[10px] text-gray-500">N/A</span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right">
                  <span className={`text-xs font-semibold ${yesPrice > 0.5 ? 'text-green-400' : 'text-gray-300'}`}>
                    {(yesPrice * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="p-2 text-right">
                  <span className={`text-xs font-semibold ${noPrice > 0.5 ? 'text-red-400' : 'text-gray-300'}`}>
                    {(noPrice * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="p-2 text-right">
                  <span className="text-xs text-gray-300">{formatCurrency(market.volumeNum)}</span>
                </td>
                <td className="p-2 text-right">
                  <span className="text-xs text-gray-300">{formatCurrency(market.liquidityNum)}</span>
                </td>
                <td className="p-2 text-right">
                  <span className="text-xs text-gray-300">
                    {market.volume24hNum ? formatCurrency(market.volume24hNum) : 'N/A'}
                  </span>
                </td>
                <td className="p-2">
                  <span className="text-xs text-gray-300">{formatDateTime(market.endDate)}</span>
                </td>
                <td className="p-2 text-right">
                  <span className={`text-xs font-semibold ${market.endDate ? getTimeUntilColor(market.endDate) : 'text-gray-400'}`}>
                    {market.endDate ? formatTimeUntil(market.endDate) : 'N/A'}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>
                    {statusText}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <Sparkline 
                    tokenId={market.clobTokenIds?.[0]} 
                    width={60} 
                    height={20}
                    className="mx-auto"
                  />
                </td>
                <td className="p-2 text-center">
                  <OrderBookCell 
                    tokenId={market.clobTokenIds?.[0]}
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => handleOpenHolders(market)}
                    className="px-2 py-1 bg-polymarket-gray hover:bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-300 hover:text-white transition-colors flex items-center gap-1 mx-auto"
                    title="View market holders"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    View
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Holders Modal */}
      <HoldersModal
        isOpen={isHoldersModalOpen}
        onClose={handleCloseHolders}
        marketId={selectedMarket?.conditionId || selectedMarket?.id || ''}
        marketQuestion={selectedMarket?.question || ''}
      />
    </div>
  )
}

