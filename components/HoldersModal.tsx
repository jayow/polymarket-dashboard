'use client'

import { useState, useEffect } from 'react'
import { Holder, HoldersResponse, fetchMarketHolders } from '@/lib/polymarket-api'
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
  const [activeTab, setActiveTab] = useState<'yes' | 'no'>('yes')

  useEffect(() => {
    if (isOpen && marketId) {
      loadHolders()
    }
  }, [isOpen, marketId])

  const loadHolders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch maximum allowed holders (API max is 500)
      const data = await fetchMarketHolders(marketId, 500)
      setHoldersData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load holders')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const currentHolders = activeTab === 'yes' ? holdersData?.yesHolders : holdersData?.noHolders

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-polymarket-dark border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
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

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('yes')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'yes'
                ? 'text-green-400 border-b-2 border-green-400 bg-green-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            YES Holders ({holdersData?.yesCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('no')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'no'
                ? 'text-red-400 border-b-2 border-red-400 bg-red-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            NO Holders ({holdersData?.noCount || 0})
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-4">
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
          ) : currentHolders && currentHolders.length > 0 ? (
            <div className="space-y-2">
              {currentHolders.map((holder, index) => (
                <HolderRow key={holder.proxyWallet || index} holder={holder} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No {activeTab === 'yes' ? 'YES' : 'NO'} holders found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 text-center">
          <p className="text-xs text-gray-500">
            Showing {currentHolders?.length || 0} holders (API max: 500) • Data from Polymarket
          </p>
        </div>
      </div>
    </div>
  )
}

function HolderRow({ holder, rank }: { holder: Holder; rank: number }) {
  const displayName = holder.pseudonym || holder.name || shortenAddress(holder.proxyWallet)
  const showBadge = rank <= 3

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

      {/* Profile Image */}
      {holder.profileImage || holder.profileImageOptimized ? (
        <img
          src={holder.profileImageOptimized || holder.profileImage}
          alt={displayName}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{displayName}</span>
          {holder.displayUsernamePublic && holder.pseudonym && (
            <span className="text-xs text-green-400">✓</span>
          )}
        </div>
        {holder.bio && (
          <p className="text-xs text-gray-400 truncate">{holder.bio}</p>
        )}
      </div>

      {/* Amount */}
      <div className="text-right">
        <div className="font-semibold text-white">
          {formatShareAmount(holder.amount)}
        </div>
        <div className="text-xs text-gray-400">shares</div>
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

