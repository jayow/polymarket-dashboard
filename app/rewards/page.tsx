'use client'

import { useEffect, useState, useMemo } from 'react'
import RewardsStatsBar from '@/components/RewardsStatsBar'
import RewardsTable, { RewardMarket } from '@/components/RewardsTable'
import { formatCurrency } from '@/lib/utils'

type Tab = 'liquidity' | 'holding'

interface HoldingMarket {
  conditionId: string
  question: string
  slug: string
  image: string
  volume: number
  liquidity: number
  holdingRewardsEnabled: boolean
  annualRate: number
}

interface OrderbookData {
  yesBestBid: number | null
  yesBestAsk: number | null
  yesMid: number | null
  noBestBid: number | null
  noBestAsk: number | null
  noMid: number | null
}

interface RewardsData {
  rewardMarkets: RewardMarket[]
  holdingMarkets: HoldingMarket[]
  sponsoredMarkets: RewardMarket[]
  stats: {
    totalRewardMarkets: number
    totalDailyRewards: number
    totalNativeDaily: number
    totalHoldingMarkets: number
    totalSponsoredMarkets: number
    totalSponsoredDaily: number
  }
}

interface FilterPreset {
  name: string
  filters: FilterValues
}

interface FilterValues {
  selectedTag: string
  minYesPrice: number
  maxYesPrice: number
  minNoPrice: number
  maxNoPrice: number
  minCompetitive: number
  maxCompetitive: number
  minTotalRate: number
  minDailyRate: number
  minEfficiency: number
  minSponsorRate: number
  minMinSize: number
  maxVolume: number | null
  maxEndDate: string
  priceOperator: 'AND' | 'OR'
}

const DEFAULT_FILTERS: FilterValues = {
  selectedTag: '',
  minYesPrice: 0,
  maxYesPrice: 100,
  minNoPrice: 0,
  maxNoPrice: 100,
  minCompetitive: 0,
  maxCompetitive: 100,
  minTotalRate: 0,
  minDailyRate: 0,
  minEfficiency: 0,
  minSponsorRate: 0,
  minMinSize: 0,
  maxVolume: null,
  maxEndDate: '',
  priceOperator: 'AND',
}

const PRESETS_KEY = 'polyfilter-reward-presets'

function loadPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePresetsToStorage(presets: FilterPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

export default function RewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null)
  const [orderbookMap, setOrderbookMap] = useState<Record<string, OrderbookData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('liquidity')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Draft filter state (what sliders/inputs show while adjusting)
  const [selectedTag, setSelectedTag] = useState('')
  const [minYesPrice, setMinYesPrice] = useState(0)
  const [maxYesPrice, setMaxYesPrice] = useState(100)
  const [minNoPrice, setMinNoPrice] = useState(0)
  const [maxNoPrice, setMaxNoPrice] = useState(100)
  const [minCompetitive, setMinCompetitive] = useState(0)
  const [maxCompetitive, setMaxCompetitive] = useState(100)
  const [minTotalRate, setMinTotalRate] = useState(0)
  const [minDailyRate, setMinDailyRate] = useState(0)
  const [minEfficiency, setMinEfficiency] = useState(0)
  const [minSponsorRate, setMinSponsorRate] = useState(0)
  const [minMinSize, setMinMinSize] = useState(0)
  const [maxVolume, setMaxVolume] = useState<number | null>(null)
  const [maxEndDate, setMaxEndDate] = useState('')
  const [priceOperator, setPriceOperator] = useState<'AND' | 'OR'>('AND')

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showPresetSave, setShowPresetSave] = useState(false)

  useEffect(() => { setPresets(loadPresets()) }, [])

  const draftSnapshot = (): FilterValues => ({
    selectedTag, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice,
    minCompetitive, maxCompetitive, minTotalRate, minDailyRate,
    minEfficiency, minSponsorRate, minMinSize, maxVolume, maxEndDate, priceOperator,
  })

  const loadDraftFromValues = (f: FilterValues) => {
    setSelectedTag(f.selectedTag); setMinYesPrice(f.minYesPrice); setMaxYesPrice(f.maxYesPrice)
    setMinNoPrice(f.minNoPrice); setMaxNoPrice(f.maxNoPrice)
    setMinCompetitive(f.minCompetitive); setMaxCompetitive(f.maxCompetitive)
    setMinTotalRate(f.minTotalRate); setMinDailyRate(f.minDailyRate)
    setMinEfficiency(f.minEfficiency); setMinSponsorRate(f.minSponsorRate)
    setMinMinSize(f.minMinSize); setMaxVolume(f.maxVolume)
    setMaxEndDate(f.maxEndDate); setPriceOperator(f.priceOperator)
  }

  const resetFilters = () => {
    loadDraftFromValues(DEFAULT_FILTERS)
  }

  const savePreset = () => {
    const name = presetName.trim()
    if (!name) return
    const newPreset: FilterPreset = { name, filters: draftSnapshot() }
    const updated = [...presets.filter((p) => p.name !== name), newPreset]
    setPresets(updated)
    savePresetsToStorage(updated)
    setPresetName('')
    setShowPresetSave(false)
  }

  const loadPreset = (preset: FilterPreset) => {
    loadDraftFromValues(preset.filters)
  }

  const deletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name)
    setPresets(updated)
    savePresetsToStorage(updated)
  }

  useEffect(() => {
    async function loadRewards() {
      try {
        setLoading(true)
        const [rewardsRes, obRes] = await Promise.all([
          fetch('/api/rewards'),
          fetch('/api/rewards/orderbooks'),
        ])
        if (!rewardsRes.ok) throw new Error(`HTTP ${rewardsRes.status}`)
        const rewardsJson = await rewardsRes.json()
        setData(rewardsJson)

        if (obRes.ok) {
          const obJson = await obRes.json()
          if (obJson.orderbooks) setOrderbookMap(obJson.orderbooks)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load rewards')
      } finally {
        setLoading(false)
      }
    }
    loadRewards()
  }, [])

  const allTags = useMemo(() => {
    if (!data) return []
    const tagSet = new Set<string>()
    for (const m of data.rewardMarkets) {
      if (m.tags) m.tags.forEach((t) => tagSet.add(t))
    }
    return Array.from(tagSet).sort()
  }, [data])

  const maxTotalRateValue = useMemo(() => {
    if (!data) return 2000
    return Math.max(...data.rewardMarkets.map((m) => m.totalDailyRate), 1)
  }, [data])

  const maxDailyRateValue = useMemo(() => {
    if (!data) return 1000
    return Math.max(...data.rewardMarkets.map((m) => m.dailyRate), 1)
  }, [data])

  const maxEfficiencyValue = useMemo(() => {
    if (!data) return 10
    const effs = data.rewardMarkets
      .filter((m) => m.liquidity > 0)
      .map((m) => (m.totalDailyRate / m.liquidity) * 100)
    return Math.ceil(Math.max(...effs, 1) * 10) / 10
  }, [data])

  const maxSponsorRateValue = useMemo(() => {
    if (!data) return 1000
    return Math.max(...data.rewardMarkets.map((m) => m.sponsorRate), 1)
  }, [data])

  const maxVolumeValue = useMemo(() => {
    if (!data) return 1000000
    return Math.max(...data.rewardMarkets.map((m) => m.volume), 1)
  }, [data])

  const maxMinSizeValue = useMemo(() => {
    if (!data) return 1000
    return Math.max(...data.rewardMarkets.map((m) => m.minSize), 1)
  }, [data])

  const query = searchQuery.toLowerCase()
  const filteredLiquidity = !data ? [] : data.rewardMarkets.filter((m) => {
    if (query && !m.question.toLowerCase().includes(query)) return false
    if (selectedTag && (!m.tags || !m.tags.includes(selectedTag))) return false
    const compPercent = m.competitive * 100
    if (compPercent < minCompetitive || compPercent > maxCompetitive) return false
    if (minTotalRate > 0 && m.totalDailyRate < minTotalRate) return false
    if (minDailyRate > 0 && m.dailyRate < minDailyRate) return false
    if (minEfficiency > 0) {
      const eff = m.liquidity > 0 ? (m.totalDailyRate / m.liquidity) * 100 : (m.totalDailyRate > 0 ? 999999 : 0)
      if (eff < minEfficiency) return false
    }
    if (minSponsorRate > 0 && m.sponsorRate < minSponsorRate) return false
    if (minMinSize > 0 && m.minSize < minMinSize) return false
    if (maxVolume !== null && m.volume > maxVolume) return false
    if (maxEndDate && m.endDate) {
      const marketEnd = new Date(m.endDate).getTime()
      const filterEnd = new Date(maxEndDate + 'T23:59:59Z').getTime()
      if (marketEnd > filterEnd) return false
    }
    const yesPercent = m.yesPrice * 100
    const noPercent = m.noPrice * 100
    const yesInRange = yesPercent >= minYesPrice && yesPercent <= maxYesPrice
    const noInRange = noPercent >= minNoPrice && noPercent <= maxNoPrice
    const hasPriceFilter = minYesPrice > 0 || maxYesPrice < 100 || minNoPrice > 0 || maxNoPrice < 100
    if (hasPriceFilter) {
      if (priceOperator === 'AND') {
        if (!yesInRange || !noInRange) return false
      } else {
        if (!yesInRange && !noInRange) return false
      }
    }
    return true
  })

  const filteredHolding = useMemo(() => {
    if (!data) return []
    const query = searchQuery.toLowerCase()
    return data.holdingMarkets.filter((m) => !query || m.question.toLowerCase().includes(query))
  }, [data, searchQuery])

  const hasActiveFilters = !!(selectedTag || minYesPrice > 0 || maxYesPrice < 100 || minNoPrice > 0 || maxNoPrice < 100 || minCompetitive > 0 || maxCompetitive < 100 || minTotalRate > 0 || minDailyRate > 0 || minEfficiency > 0 || minSponsorRate > 0 || minMinSize > 0 || maxVolume !== null || maxEndDate || searchQuery)

  const tabs: { key: Tab; label: string; count: string }[] = [
    {
      key: 'liquidity',
      label: 'Liquidity Rewards',
      count: hasActiveFilters
        ? `${filteredLiquidity.length}/${data?.rewardMarkets.length ?? 0}`
        : `${data?.rewardMarkets.length ?? 0}`,
    },
    { key: 'holding', label: 'Holding Rewards', count: `${data?.holdingMarkets.length ?? 0}` },
  ]

  const numInputClass = 'w-16 bg-gray-700 text-white text-[11px] rounded px-1.5 py-1 border border-gray-600 focus:border-polymarket-blue focus:outline-none text-center tabular-nums shrink-0'

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Rewards</h1>
            <p className="text-sm text-gray-400 mt-1">Active reward markets, sponsorships, and holding rewards</p>
          </div>
          {data && (
            <RewardsStatsBar
              totalDailyRewards={data.stats.totalDailyRewards}
              totalNativeDaily={data.stats.totalNativeDaily}
              totalRewardMarkets={data.stats.totalRewardMarkets}
              totalHoldingMarkets={data.stats.totalHoldingMarkets}
              totalSponsoredMarkets={data.stats.totalSponsoredMarkets}
              totalSponsoredDaily={data.stats.totalSponsoredDaily}
            />
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-6">
        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-polymarket-blue text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
                <span className={`ml-2 text-xs ${activeTab === key ? 'text-blue-200' : 'text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 text-white text-sm rounded-lg px-4 py-2 pl-9 w-72 border border-gray-700 focus:border-polymarket-blue focus:outline-none transition-colors"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-polymarket-blue border-polymarket-blue text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Filters {hasActiveFilters && '●'}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 mb-6">
            {/* Row 1: Tag, Competitive, Yes Price, No Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tag Filter */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Tag</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-polymarket-blue focus:outline-none"
                >
                  <option value="">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Competitive Range */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Competitive</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={minCompetitive} onChange={(e) => setMinCompetitive(Math.min(Number(e.target.value), maxCompetitive))} className={numInputClass} />
                  <RangeSlider min={0} max={100} value={minCompetitive} onChange={(v) => setMinCompetitive(Math.min(v, maxCompetitive))} color="#a855f7" />
                  <RangeSlider min={0} max={100} value={maxCompetitive} onChange={(v) => setMaxCompetitive(Math.max(v, minCompetitive))} color="#a855f7" />
                  <input type="number" min={0} max={100} value={maxCompetitive} onChange={(e) => setMaxCompetitive(Math.max(Number(e.target.value), minCompetitive))} className={numInputClass} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>{minCompetitive}%</span><span>{maxCompetitive}%</span></div>
              </div>

              {/* Yes Price Range */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Yes Price</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={minYesPrice} onChange={(e) => setMinYesPrice(Math.min(Number(e.target.value), maxYesPrice))} className={numInputClass} />
                  <RangeSlider min={0} max={100} value={minYesPrice} onChange={(v) => setMinYesPrice(Math.min(v, maxYesPrice))} color="#22c55e" />
                  <RangeSlider min={0} max={100} value={maxYesPrice} onChange={(v) => setMaxYesPrice(Math.max(v, minYesPrice))} color="#22c55e" />
                  <input type="number" min={0} max={100} value={maxYesPrice} onChange={(e) => setMaxYesPrice(Math.max(Number(e.target.value), minYesPrice))} className={numInputClass} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>{minYesPrice}¢</span><span>{maxYesPrice}¢</span></div>
              </div>

              {/* No Price Range */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">No Price</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={minNoPrice} onChange={(e) => setMinNoPrice(Math.min(Number(e.target.value), maxNoPrice))} className={numInputClass} />
                  <RangeSlider min={0} max={100} value={minNoPrice} onChange={(v) => setMinNoPrice(Math.min(v, maxNoPrice))} color="#ef4444" />
                  <RangeSlider min={0} max={100} value={maxNoPrice} onChange={(v) => setMaxNoPrice(Math.max(v, minNoPrice))} color="#ef4444" />
                  <input type="number" min={0} max={100} value={maxNoPrice} onChange={(e) => setMaxNoPrice(Math.max(Number(e.target.value), minNoPrice))} className={numInputClass} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>{minNoPrice}¢</span><span>{maxNoPrice}¢</span></div>
              </div>
            </div>

            {/* Row 2: Total Rate, Native Rate, Sponsor Rate, Efficiency */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Min Total Rate</label>
                <div className="flex items-center gap-2">
                  <RangeSlider min={0} max={maxTotalRateValue} step={1} value={minTotalRate} onChange={setMinTotalRate} color="#ffffff" />
                  <div className="flex items-center shrink-0">
                    <span className="text-gray-500 text-[11px] mr-0.5">$</span>
                    <input type="number" min={0} max={maxTotalRateValue} value={minTotalRate} onChange={(e) => setMinTotalRate(Number(e.target.value))} className={numInputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Min Native Rate</label>
                <div className="flex items-center gap-2">
                  <RangeSlider min={0} max={maxDailyRateValue} step={1} value={minDailyRate} onChange={setMinDailyRate} color="#4ade80" />
                  <div className="flex items-center shrink-0">
                    <span className="text-gray-500 text-[11px] mr-0.5">$</span>
                    <input type="number" min={0} max={maxDailyRateValue} value={minDailyRate} onChange={(e) => setMinDailyRate(Number(e.target.value))} className={numInputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Min Sponsor Rate</label>
                <div className="flex items-center gap-2">
                  <RangeSlider min={0} max={maxSponsorRateValue} step={1} value={minSponsorRate} onChange={setMinSponsorRate} color="#fbbf24" />
                  <div className="flex items-center shrink-0">
                    <span className="text-gray-500 text-[11px] mr-0.5">$</span>
                    <input type="number" min={0} max={maxSponsorRateValue} value={minSponsorRate} onChange={(e) => setMinSponsorRate(Number(e.target.value))} className={numInputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Min Efficiency</label>
                <div className="flex items-center gap-2">
                  <RangeSlider min={0} max={maxEfficiencyValue} step={0.01} value={minEfficiency} onChange={setMinEfficiency} color="#22d3ee" />
                  <div className="flex items-center shrink-0">
                    <input type="number" min={0} max={maxEfficiencyValue} step={0.01} value={minEfficiency} onChange={(e) => setMinEfficiency(Number(e.target.value))} className={numInputClass} />
                    <span className="text-gray-500 text-[11px] ml-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Volume, Min Size, End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Max Volume</label>
                <div className="flex items-center gap-2">
                  <RangeSlider
                    min={0}
                    max={maxVolumeValue}
                    step={Math.max(1, Math.floor(maxVolumeValue / 1000))}
                    value={maxVolume ?? maxVolumeValue}
                    onChange={(v) => setMaxVolume(v >= maxVolumeValue ? null : v)}
                    color="#60a5fa"
                    invert
                  />
                  <div className="flex items-center shrink-0">
                    <span className="text-gray-500 text-[11px] mr-0.5">$</span>
                    <input
                      type="number"
                      min={0}
                      value={maxVolume ?? ''}
                      placeholder="Any"
                      onChange={(e) => setMaxVolume(e.target.value ? Number(e.target.value) : null)}
                                           className={numInputClass + ' w-20'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Min Order Size</label>
                <div className="flex items-center gap-2">
                  <RangeSlider min={0} max={maxMinSizeValue} step={1} value={minMinSize} onChange={setMinMinSize} color="#f472b6" />
                  <input type="number" min={0} max={maxMinSizeValue} value={minMinSize} onChange={(e) => setMinMinSize(Number(e.target.value))} className={numInputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Resolves Before
                </label>
                <input
                  type="date"
                  value={maxEndDate}
                  onChange={(e) => setMaxEndDate(e.target.value)}
                  className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-polymarket-blue focus:outline-none"
                />
              </div>

            </div>

            {/* AND/OR toggle for price filters */}
            {(minYesPrice > 0 || maxYesPrice < 100 || minNoPrice > 0 || maxNoPrice < 100) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Price match:</span>
                <div className="flex items-center bg-gray-700 rounded-md p-0.5">
                  <button
                    onClick={() => setPriceOperator('AND')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      priceOperator === 'AND'
                        ? 'bg-polymarket-blue text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setPriceOperator('OR')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      priceOperator === 'OR'
                        ? 'bg-polymarket-blue text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    OR
                  </button>
                </div>
                <span className="text-[10px] text-gray-500">
                  {priceOperator === 'AND' ? 'Both Yes AND No must match' : 'Either Yes OR No must match'}
                </span>
              </div>
            )}

            {/* Reset / Presets */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-700">
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
              >
                Reset All
              </button>

              {/* Preset save/load */}
              <div className="ml-auto flex items-center gap-2">
                {presets.length > 0 && (
                  <div className="flex items-center gap-1">
                    {presets.map((p) => (
                      <div key={p.name} className="inline-flex items-center gap-0.5 bg-gray-700 rounded-md">
                        <button
                          onClick={() => loadPreset(p)}
                          className="px-2 py-1 text-xs text-gray-300 hover:text-white transition-colors"
                          title={`Load "${p.name}"`}
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => deletePreset(p.name)}
                          className="px-1 py-1 text-gray-500 hover:text-red-400 text-xs transition-colors"
                          title="Delete preset"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showPresetSave ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                      placeholder="Preset name..."
                      className="bg-gray-700 text-white text-xs rounded px-2 py-1.5 w-32 border border-gray-600 focus:border-polymarket-blue focus:outline-none"
                      autoFocus
                    />
                    <button onClick={savePreset} className="px-2 py-1.5 bg-polymarket-blue text-white text-xs rounded hover:bg-blue-600 transition-colors">Save</button>
                    <button onClick={() => setShowPresetSave(false)} className="px-1.5 py-1.5 text-gray-400 hover:text-white text-xs">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPresetSave(true)}
                    className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md hover:border-gray-500 transition-colors"
                  >
                    Save Preset
                  </button>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700">
                {selectedTag && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-polymarket-blue/20 text-polymarket-blue text-xs rounded-full">
                    {selectedTag}
                  </span>
                )}
                {(minCompetitive > 0 || maxCompetitive < 100) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                    Competitive: {minCompetitive}–{maxCompetitive}%
                  </span>
                )}
                {minTotalRate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-white text-xs rounded-full">
                    Total Rate ≥ ${minTotalRate}
                  </span>
                )}
                {minDailyRate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-400/20 text-green-300 text-xs rounded-full">
                    Native ≥ ${minDailyRate}
                  </span>
                )}
                {minSponsorRate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                    Sponsor ≥ ${minSponsorRate}
                  </span>
                )}
                {minEfficiency > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    Efficiency ≥ {minEfficiency.toFixed(2)}%
                  </span>
                )}
                {minMinSize > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">
                    Min Size ≥ {minMinSize}
                  </span>
                )}
                {maxVolume !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    Volume ≤ {formatCurrency(maxVolume)}
                  </span>
                )}
                {maxEndDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                    Resolves by {maxEndDate}
                  </span>
                )}
                {(minYesPrice > 0 || maxYesPrice < 100) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Yes: {minYesPrice}–{maxYesPrice}¢
                  </span>
                )}
                {(minYesPrice > 0 || maxYesPrice < 100 || minNoPrice > 0 || maxNoPrice < 100) && (
                  <span className="text-[10px] text-gray-500 font-medium">{priceOperator}</span>
                )}
                {(minNoPrice > 0 || maxNoPrice < 100) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                    No: {minNoPrice}–{maxNoPrice}¢
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-polymarket-blue border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading reward markets...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'liquidity' && (
              <div className="bg-polymarket-gray rounded-lg border border-gray-700 overflow-hidden">
                {filteredLiquidity.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {hasActiveFilters ? 'No markets match your filters' : 'No reward markets found'}
                  </div>
                ) : (
                  <RewardsTable markets={filteredLiquidity} orderbookMap={orderbookMap} />
                )}
              </div>
            )}

            {activeTab === 'holding' && (
              <div className="bg-polymarket-gray rounded-lg border border-gray-700 overflow-hidden">
                <HoldingRewardsTable markets={filteredHolding} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function RangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  color = '#3b82f6',
  invert = false,
}: {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  step?: number
  color?: string
  invert?: boolean
}) {
  const range = max - min || 1
  const percent = ((value - min) / range) * 100

  return (
    <div className="relative flex-1 h-6 flex items-center">
      <div className="absolute inset-x-[2px] h-[6px] rounded-full bg-gray-600/80">
        {invert ? (
          <div
            className="absolute right-0 top-0 h-full rounded-full opacity-80"
            style={{ width: `${100 - percent}%`, backgroundColor: color }}
          />
        ) : (
          <div
            className="h-full rounded-full opacity-80"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full relative z-10 slider-overlay"
      />
    </div>
  )
}

function HoldingRewardsTable({ markets }: { markets: HoldingMarket[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-gray-700/50">
            <th className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[400px]">
              Market
            </th>
            <th className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Annual Rate
            </th>
            <th className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Volume
            </th>
            <th className="text-left p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Liquidity
            </th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr
              key={market.conditionId}
              className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors"
            >
              <td className="p-2">
                <a
                  href={`https://polymarket.com/market/${market.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-polymarket-blue transition-colors line-clamp-2"
                >
                  {market.question}
                </a>
              </td>
              <td className="p-2 text-green-400 font-medium">
                {market.annualRate}% APY
              </td>
              <td className="p-2 text-gray-300">
                {formatCurrency(market.volume)}
              </td>
              <td className="p-2 text-gray-300">
                {formatCurrency(market.liquidity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {markets.length === 0 && (
        <div className="text-center py-12 text-gray-500">No holding reward markets found</div>
      )}
    </div>
  )
}
