'use client'

import { useState, useCallback, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  getRewardEfficiency,
  getSuggestedBids,
  buildGradeArrays,
  computeScore,
  applyOverround,
  scoreToGrade,
  gradeColors,
  type OrderbookData,
  type GradeArrays,
} from '@/lib/scoring'

export interface RewardMarket {
  conditionId: string
  question: string
  slug: string
  image: string
  active: boolean
  closed: boolean
  endDate: string
  dailyRate: number
  sponsorRate: number
  totalDailyRate: number
  sponsorsCount: number
  minSize: number
  maxSpread: number
  yesPrice: number
  noPrice: number
  yesTokenId: string
  noTokenId: string
  tags: string[]
  volume: number
  liquidity: number
  competitive: number
  holdingRewardsEnabled: boolean
}

export type RewardSortField = 'grade' | 'question' | 'dailyRate' | 'sponsorRate' | 'totalDailyRate' | 'maxSpread' | 'minSize' | 'yesPrice' | 'volume' | 'liquidity' | 'competitive' | 'rewardEfficiency' | 'endDate'
type SortOrder = 'asc' | 'desc'

// --- MarketRow: receives pre-fetched orderbook data, supports manual refresh ---
function MarketRow({ market, score, orderbook }: {
  market: RewardMarket
  score: number
  orderbook: OrderbookData | null
}) {
  // Local override for manual refresh
  const [localOb, setLocalOb] = useState<OrderbookData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const activeOb = localOb ?? orderbook

  // Compute live strategy from active orderbook data
  const liveData = useMemo(() => {
    if (!activeOb) return null
    const yesRef = activeOb.yesBestAsk ?? market.yesPrice
    const noRef = activeOb.noBestAsk ?? market.noPrice
    const yesRefCents = Math.round(yesRef * 100)
    const noRefCents = Math.round(noRef * 100)
    const suggestedYesBid = Math.max(1, Math.ceil(yesRefCents - market.maxSpread))
    const suggestedNoBid = Math.max(1, Math.ceil(noRefCents - market.maxSpread))
    const capital = market.minSize * (suggestedYesBid + suggestedNoBid) / 100
    return {
      yesBestBid: activeOb.yesBestBid,
      yesBestAsk: activeOb.yesBestAsk,
      noBestBid: activeOb.noBestBid,
      noBestAsk: activeOb.noBestAsk,
      suggestedYesBid,
      suggestedNoBid,
      capital,
    }
  }, [activeOb, market])

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const [yesBook, noBook] = await Promise.all([
        market.yesTokenId
          ? fetch(`/api/orderbook?tokenId=${market.yesTokenId}`).then(r => r.json())
          : { bestBid: null, bestAsk: null, midPrice: null },
        market.noTokenId
          ? fetch(`/api/orderbook?tokenId=${market.noTokenId}`).then(r => r.json())
          : { bestBid: null, bestAsk: null, midPrice: null },
      ])
      setLocalOb({
        yesBestBid: yesBook.bestBid?.price ?? null,
        yesBestAsk: yesBook.bestAsk?.price ?? null,
        yesMid: yesBook.midPrice ?? null,
        noBestBid: noBook.bestBid?.price ?? null,
        noBestAsk: noBook.bestAsk?.price ?? null,
        noMid: noBook.midPrice ?? null,
      })
    } catch { /* ignore */ }
    setRefreshing(false)
  }, [market, refreshing])

  const grade = scoreToGrade(score)
  const colors = gradeColors[grade] || gradeColors.F
  const fmtCents = (v: number | null) => v != null ? `${Math.round(v * 100)}¢` : '—'
  const staticBids = getSuggestedBids(market)

  return (
    <tr className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
      {/* Market */}
      <td className="p-2">
        <a
          href={`https://polymarket.com/market/${market.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-200 hover:text-polymarket-blue transition-colors line-clamp-2"
          title={market.question}
        >
          {market.question}
        </a>
      </td>
      {/* Grade */}
      <td className="p-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold border ${colors}`}>
            {grade}
          </span>
          <span className="text-[10px] text-gray-500 tabular-nums">{score}</span>
        </div>
      </td>
      {/* Total Rate */}
      <td className="p-2 text-white font-semibold">
        ${market.totalDailyRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </td>
      {/* Native */}
      <td className="p-2 text-green-400 font-medium">
        ${market.dailyRate.toLocaleString()}
      </td>
      {/* Sponsored */}
      <td className={`p-2 font-medium ${market.sponsorRate > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
        {market.sponsorRate > 0
          ? `+$${market.sponsorRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}${market.sponsorsCount > 0 ? ` (${market.sponsorsCount})` : ''}`
          : '—'}
      </td>
      {/* Max Spread */}
      <td className="p-2 text-gray-300">{market.maxSpread}¢</td>
      {/* Min Size */}
      <td className="p-2 text-gray-300">{market.minSize.toLocaleString()}</td>
      {/* Yes / No — live orderbook prices */}
      <td className="p-2">
        {liveData ? (
          <div className="cursor-pointer" onClick={handleRefresh} title="Click to refresh">
            <div className="flex items-center gap-1">
              <span className="text-green-400">{fmtCents(liveData.yesBestAsk)}</span>
              <span className="text-gray-600">/</span>
              <span className="text-red-400">{fmtCents(liveData.noBestAsk)}</span>
              <span className="text-[8px] font-semibold text-blue-400">LIVE</span>
              {refreshing && (
                <svg className="animate-spin h-2.5 w-2.5 text-blue-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <div className="text-[9px] text-gray-600 mt-0.5">
              <span className="text-gray-500">bid</span>{' '}
              <span className="text-green-400/60">{fmtCents(liveData.yesBestBid)}</span>
              <span className="text-gray-700">/</span>
              <span className="text-red-400/60">{fmtCents(liveData.noBestBid)}</span>
            </div>
          </div>
        ) : (
          <div className="opacity-40">
            <span className="text-green-400">{(market.yesPrice * 100).toFixed(0)}¢</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-red-400">{(market.noPrice * 100).toFixed(0)}¢</span>
          </div>
        )}
      </td>
      {/* Volume */}
      <td className="p-2 text-gray-300">{formatCurrency(market.volume)}</td>
      {/* End Date */}
      <td className="p-2 text-gray-400 whitespace-nowrap">
        {market.endDate
          ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'}
      </td>
      {/* Liquidity */}
      <td className="p-2 text-gray-300">{formatCurrency(market.liquidity)}</td>
      {/* Competitive */}
      <td className="p-2">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                market.competitive >= 0.7 ? 'bg-green-500' :
                market.competitive >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(market.competitive * 100).toFixed(0)}%` }}
            />
          </div>
          <span className="text-gray-400 text-[10px]">
            {(market.competitive * 100).toFixed(0)}%
          </span>
        </div>
      </td>
      {/* Efficiency */}
      <td className="p-2">
        {(() => {
          const eff = getRewardEfficiency(market)
          if (eff >= 999999) {
            return <span className="font-bold text-green-400">MAX</span>
          }
          return (
            <span className={`font-medium ${
              eff >= 1 ? 'text-green-400' :
              eff >= 0.3 ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              {eff.toFixed(2)}%
            </span>
          )
        })()}
      </td>
      {/* Strategy */}
      <td className="p-2">
        {liveData ? (
          <div className="text-[11px] leading-relaxed cursor-pointer" onClick={handleRefresh} title="Click to refresh">
            <div>
              <span className="text-green-400">Y:{liveData.suggestedYesBid}¢</span>
              <span className="text-gray-600 mx-1">/</span>
              <span className="text-red-400">N:{liveData.suggestedNoBid}¢</span>
              <span className="ml-1 text-[9px] font-semibold text-blue-400">LIVE</span>
            </div>
            <div className="text-gray-400">${liveData.capital.toFixed(0)} capital</div>
          </div>
        ) : (
          <div className="text-[11px] leading-relaxed opacity-40">
            <div>
              <span className="text-green-400">Y:{staticBids.yesBid}¢</span>
              <span className="text-gray-700 mx-1">/</span>
              <span className="text-red-400">N:{staticBids.noBid}¢</span>
            </div>
            <div className="text-gray-400">${staticBids.capital.toFixed(0)} capital</div>
          </div>
        )}
      </td>
      {/* Tags */}
      <td className="p-2">
        <div className="flex flex-wrap gap-1">
          {market.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-700 text-gray-400 text-[10px] rounded">
              {tag}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}

interface RewardsTableProps {
  markets: RewardMarket[]
  orderbookMap?: Record<string, OrderbookData>
}

export default function RewardsTable({ markets, orderbookMap: orderbookProp }: RewardsTableProps) {
  const [sortColumns, setSortColumns] = useState<{ field: RewardSortField; order: SortOrder }[]>([
    { field: 'grade', order: 'desc' },
  ])

  // --- Static grade scoring ---
  const gradeArrays = useMemo(() => buildGradeArrays(markets), [markets])
  const scoreCache = useMemo(() => {
    const cache = new Map<string, number>()
    for (const m of markets) cache.set(m.conditionId, computeScore(m, gradeArrays))
    return cache
  }, [markets, gradeArrays])

  // --- Orderbook data from server-side cache (passed as prop) ---
  const orderbookMap = useMemo(() => {
    const map = new Map<string, OrderbookData>()
    if (orderbookProp) {
      for (const [key, val] of Object.entries(orderbookProp)) {
        map.set(key, val)
      }
    }
    return map
  }, [orderbookProp])

  const hasOrderbooks = orderbookMap.size > 0

  // --- Live score cache (includes overround penalty from orderbook data) ---
  const liveScoreCache = useMemo(() => {
    const cache = new Map<string, number>()
    for (const m of markets) {
      const staticScore = scoreCache.get(m.conditionId) ?? 0
      cache.set(m.conditionId, applyOverround(staticScore, orderbookMap.get(m.conditionId), m.volume))
    }
    return cache
  }, [markets, scoreCache, orderbookMap])

  // Use live scores when orderbook data is available, static otherwise
  const activeScoreCache = hasOrderbooks ? liveScoreCache : scoreCache

  const handleSort = (field: RewardSortField, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSortColumns((prev) => {
        const idx = prev.findIndex((s) => s.field === field)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { field, order: prev[idx].order === 'asc' ? 'desc' : 'asc' }
          return updated
        }
        return [...prev, { field, order: 'desc' }]
      })
    } else {
      setSortColumns((prev) => {
        if (prev.length === 1 && prev[0].field === field) {
          return [{ field, order: prev[0].order === 'asc' ? 'desc' : 'asc' }]
        }
        return [{ field, order: 'desc' }]
      })
    }
  }

  const getFieldValue = (m: RewardMarket, field: RewardSortField): number | string => {
    switch (field) {
      case 'grade': return activeScoreCache.get(m.conditionId) ?? 0
      case 'question': return m.question.toLowerCase()
      case 'dailyRate': return m.dailyRate
      case 'sponsorRate': return m.sponsorRate
      case 'totalDailyRate': return m.totalDailyRate
      case 'maxSpread': return m.maxSpread
      case 'minSize': return m.minSize
      case 'yesPrice': return m.yesPrice
      case 'volume': return m.volume
      case 'liquidity': return m.liquidity
      case 'competitive': return m.competitive
      case 'rewardEfficiency': return getRewardEfficiency(m)
      case 'endDate': return m.endDate ? new Date(m.endDate).getTime() : 0
    }
  }

  const sorted = [...markets].sort((a, b) => {
    for (const { field, order } of sortColumns) {
      const aVal = getFieldValue(a, field)
      const bVal = getFieldValue(b, field)

      let cmp = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal)
      } else {
        cmp = (aVal as number) - (bVal as number)
      }

      if (cmp !== 0) {
        return order === 'asc' ? cmp : -cmp
      }
    }
    return 0
  })

  const SortIcon = ({ field }: { field: RewardSortField }) => {
    const idx = sortColumns.findIndex((s) => s.field === field)
    if (idx < 0) return <span className="text-gray-500 ml-1">↕</span>
    const col = sortColumns[idx]
    return (
      <span className="text-polymarket-blue ml-1">
        {col.order === 'asc' ? '↑' : '↓'}
        {sortColumns.length > 1 && (
          <span className="text-[9px] text-polymarket-blue/70 ml-0.5">{idx + 1}</span>
        )}
      </span>
    )
  }

  const thClass = 'text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      {hasOrderbooks && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border-b border-green-500/20 text-[11px] text-green-400">
          <span>Live grades</span>
          <span className="text-green-500/60">({orderbookMap.size} orderbooks)</span>
        </div>
      )}

      {sortColumns.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 border-b border-gray-700/50 text-[10px] text-gray-500">
          <span>Sorting by:</span>
          {sortColumns.map((s, i) => (
            <span key={s.field} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-polymarket-blue/10 text-polymarket-blue rounded">
              {i + 1}. {s.field === 'grade' ? 'Grade' : s.field === 'rewardEfficiency' ? 'Efficiency' : s.field === 'totalDailyRate' ? 'Total Rate' : s.field === 'dailyRate' ? 'Native Rate' : s.field === 'sponsorRate' ? 'Sponsor Rate' : s.field === 'maxSpread' ? 'Max Spread' : s.field === 'minSize' ? 'Min Size' : s.field === 'yesPrice' ? 'Yes/No' : s.field === 'endDate' ? 'End Date' : s.field.charAt(0).toUpperCase() + s.field.slice(1)} {s.order === 'asc' ? '↑' : '↓'}
            </span>
          ))}
          <button
            onClick={() => setSortColumns([sortColumns[0]])}
            className="text-gray-500 hover:text-white ml-1"
          >
            Clear multi-sort
          </button>
          <span className="ml-auto text-gray-600">Shift+click column to add sort</span>
        </div>
      )}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-gray-700/50">
            <th className={`${thClass} w-[320px]`} onClick={(e) => handleSort('question', e)}>
              Market <SortIcon field="question" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('grade', e)}>
              Grade <SortIcon field="grade" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('totalDailyRate', e)}>
              Total Rate <SortIcon field="totalDailyRate" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('dailyRate', e)}>
              Native <SortIcon field="dailyRate" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('sponsorRate', e)}>
              Sponsored <SortIcon field="sponsorRate" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('maxSpread', e)}>
              Max Spread <SortIcon field="maxSpread" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('minSize', e)}>
              Min Size <SortIcon field="minSize" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('yesPrice', e)}>
              Yes / No <SortIcon field="yesPrice" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('volume', e)}>
              Volume <SortIcon field="volume" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('endDate', e)}>
              End Date <SortIcon field="endDate" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('liquidity', e)}>
              Liquidity <SortIcon field="liquidity" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('competitive', e)}>
              Competitive <SortIcon field="competitive" />
            </th>
            <th className={thClass} onClick={(e) => handleSort('rewardEfficiency', e)}>
              Efficiency <SortIcon field="rewardEfficiency" />
            </th>
            <th className={`${thClass} w-[160px]`}>
              Strategy
            </th>
            <th className={`${thClass} w-[140px]`}>
              Tags
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((market) => (
            <MarketRow
              key={market.conditionId}
              market={market}
              score={liveScoreCache.get(market.conditionId) ?? scoreCache.get(market.conditionId) ?? 0}
              orderbook={orderbookMap.get(market.conditionId) ?? null}
            />
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-500">No markets found</div>
      )}
    </div>
  )
}
