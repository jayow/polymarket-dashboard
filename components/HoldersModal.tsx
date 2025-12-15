'use client'

import { useState, useEffect, useMemo } from 'react'
import { Holder, HoldersResponse, fetchMarketHolders, fetchUserPnL } from '@/lib/polymarket-api'
import { formatCurrency } from '@/lib/utils'

interface HoldersModalProps {
  isOpen: boolean
  onClose: () => void
  marketId: string
  marketQuestion: string
}

export default function HoldersModal({ isOpen, onClose, marketId, marketQuestion }: HoldersModalProps) {
  const [holdersData, setHoldersData] = useState<HoldersResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pnlMap, setPnlMap] = useState<Map<string, number | null>>(new Map())
  const [loadingPnL, setLoadingPnL] = useState(false)

  useEffect(() => {
    if (isOpen && marketId) {
      loadHolders()
    } else {
      // Reset when modal closes
      setHoldersData(null)
      setPnlMap(new Map())
    }
  }, [isOpen, marketId])

  const loadHolders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch maximum allowed holders (API max is 500)
      const data = await fetchMarketHolders(marketId, 500)
      setHoldersData(data)
      
      // Fetch PNL for all holders after holders are loaded
      if (data.yesHolders.length > 0 || data.noHolders.length > 0) {
        loadPnLForHolders(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load holders')
    } finally {
      setLoading(false)
    }
  }

  const loadPnLForHolders = async (data: HoldersResponse) => {
    setLoadingPnL(true)
    const allHolders = [...data.yesHolders, ...data.noHolders]
    const uniqueWallets = Array.from(new Set(allHolders.map(h => h.proxyWallet)))
    
    // Fetch PNL in batches of 10 to avoid overwhelming the API
    const batchSize = 10
    const pnlResults = new Map<string, number | null>()
    
    for (let i = 0; i < uniqueWallets.length; i += batchSize) {
      const batch = uniqueWallets.slice(i, i + batchSize)
      const promises = batch.map(async (wallet) => {
        try {
          const pnl = await fetchUserPnL(wallet)
          return { wallet, pnl }
        } catch (err) {
          console.error(`Error fetching PNL for ${wallet}:`, err)
          return { wallet, pnl: null }
        }
      })
      
      const results = await Promise.allSettled(promises)
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          pnlResults.set(result.value.wallet, result.value.pnl)
        }
      })
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uniqueWallets.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    setPnlMap(pnlResults)
    setLoadingPnL(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-polymarket-dark border border-gray-700 rounded-xl w-full max-w-7xl max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Market Holders</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{marketQuestion}</p>
        </div>

        {/* Content - Side by Side */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-polymarket-blue"></div>
              <span className="ml-3 text-gray-400">Loading holders...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadHolders}
                className="px-4 py-2 bg-polymarket-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4">
              {/* YES Holders Column */}
              <div className="space-y-3">
                <div className="sticky top-0 bg-polymarket-dark pb-2 border-b border-green-400/30">
                  <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">
                    YES Holders ({holdersData?.yesCount || 0})
                  </h3>
                </div>
                <div className="space-y-2">
                  {holdersData?.yesHolders && holdersData.yesHolders.length > 0 ? (
                    holdersData.yesHolders.map((holder, index) => (
                      <HolderRow 
                        key={holder.proxyWallet || `yes-${index}`} 
                        holder={holder} 
                        rank={index + 1}
                        variant="yes"
                        pnl={pnlMap.get(holder.proxyWallet) ?? undefined}
                        loadingPnL={loadingPnL}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No YES holders found
                    </div>
                  )}
                </div>
              </div>

              {/* NO Holders Column */}
              <div className="space-y-3">
                <div className="sticky top-0 bg-polymarket-dark pb-2 border-b border-red-400/30">
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                    NO Holders ({holdersData?.noCount || 0})
                  </h3>
                </div>
                <div className="space-y-2">
                  {holdersData?.noHolders && holdersData.noHolders.length > 0 ? (
                    holdersData.noHolders.map((holder, index) => (
                      <HolderRow 
                        key={holder.proxyWallet || `no-${index}`} 
                        holder={holder} 
                        rank={index + 1}
                        variant="no"
                        pnl={pnlMap.get(holder.proxyWallet) ?? undefined}
                        loadingPnL={loadingPnL}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No NO holders found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 text-center">
          <p className="text-xs text-gray-500">
            Showing {holdersData?.yesHolders?.length || 0} YES holders and {holdersData?.noHolders?.length || 0} NO holders (API max: 500 each)
            {loadingPnL && <span className="ml-2 text-blue-400">• Loading PNL data...</span>}
            {!loadingPnL && <span> • Data from Polymarket</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

function HolderRow({ holder, rank, variant, pnl, loadingPnL }: { 
  holder: Holder
  rank: number
  variant: 'yes' | 'no'
  pnl?: number | null
  loadingPnL?: boolean
}) {
  // Polymarket UI prioritizes name (username) over pseudonym, then falls back to shortened address
  // This matches how Polymarket displays holder names on their UI
  const displayName = holder.name || holder.pseudonym || shortenAddress(holder.proxyWallet)
  const showBadge = rank <= 3
  const variantColor = variant === 'yes' ? 'green' : 'red'
  const profileUrl = buildProfileUrl(holder)

  // Use fetched PNL data (all-time PNL from positions API)
  const hasPnl = pnl !== undefined && pnl !== null

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
      {/* Rank */}
      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
        rank === 1 ? 'bg-yellow-500 text-black' :
        rank === 2 ? 'bg-gray-300 text-black' :
        rank === 3 ? 'bg-amber-600 text-white' :
        'bg-gray-700 text-gray-300'
      }`}>
        {rank}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white truncate hover:text-polymarket-blue hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </a>
          {holder.displayUsernamePublic && holder.pseudonym && (
            <span className="text-xs text-green-400">✓</span>
          )}
        </div>
        {holder.bio && (
          <p className="text-xs text-gray-400 truncate">{holder.bio}</p>
        )}
      </div>

      {/* Amount and PNL */}
      <div className="text-right space-y-1">
        <div className={`font-semibold ${variant === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
          {formatShareAmount(holder.amount)}
        </div>
        <div className="text-xs text-gray-400">shares</div>
        {loadingPnL && !hasPnl && (
          <div className="text-xs text-gray-500 mt-1">—</div>
        )}
        {!loadingPnL && hasPnl && (
          <div className="mt-1">
            <div className={`text-xs font-medium ${
              pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(pnl)}
            </div>
            <div className="text-[10px] text-gray-500">all-time PNL</div>
          </div>
        )}
      </div>
    </div>
  )
}

function shortenAddress(address: string): string {
  if (!address) return 'Unknown'
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatShareAmount(amount: number): string {
  // Show exact amount with commas, no rounding
  return amount.toLocaleString(undefined, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  })
}

// Build a profile URL. Prefer handle-style URLs (polymarket.com/@username) when we
// have a name or pseudonym. Otherwise fall back to the account (wallet) URL.
function buildProfileUrl(holder: Holder): string {
  const handle = holder.name || holder.pseudonym
  if (handle) {
    const sanitized = handle.startsWith('@') ? handle.slice(1) : handle
    return `https://polymarket.com/@${sanitized}`
  }
  return `https://polymarket.com/account/${holder.proxyWallet}`
}
