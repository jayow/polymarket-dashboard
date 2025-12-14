'use client'

import { useState, useEffect } from 'react'

export type SortOrder = 'asc' | 'desc'
export type SortField = 'endDate' | 'volume' | 'liquidity' | 'price' | 'daysUntil'

interface FilterValues {
  selectedCategory: string
  minVolume: number
  maxVolume: number
  minLiquidity: number
  maxLiquidity: number
  minYesPrice: number
  maxYesPrice: number
  minNoPrice: number
  maxNoPrice: number
  dateRange: { start: string; end: string }
  showClosed: boolean
  maxHoursUntil: number | null // null = no filter, number = max hours until resolution
}

interface MarketFiltersProps {
  sortField: SortField
  sortOrder: SortOrder
  onSortChange: (field: SortField, order: SortOrder) => void
  dateRange: { start: string; end: string }
  onDateRangeChange: (start: string, end: string) => void
  showClosed: boolean
  onShowClosedChange: (show: boolean) => void
  viewMode: 'grid' | 'table'
  onViewModeChange: (mode: 'grid' | 'table') => void
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  minVolume: number
  maxVolume: number
  onVolumeRangeChange: (min: number, max: number) => void
  minLiquidity: number
  maxLiquidity: number
  onLiquidityRangeChange: (min: number, max: number) => void
  minYesPrice: number
  maxYesPrice: number
  onYesPriceRangeChange: (min: number, max: number) => void
  minNoPrice: number
  maxNoPrice: number
  onNoPriceRangeChange: (min: number, max: number) => void
  maxHoursUntil: number | null
  onMaxHoursUntilChange: (hours: number | null) => void
  onApplyFilters: (filters: FilterValues) => void
}

export default function MarketFilters({
  sortField,
  sortOrder,
  onSortChange,
  dateRange,
  onDateRangeChange,
  showClosed,
  onShowClosedChange,
  viewMode,
  onViewModeChange,
  categories,
  selectedCategory,
  onCategoryChange,
  minVolume,
  maxVolume,
  onVolumeRangeChange,
  minLiquidity,
  maxLiquidity,
  onLiquidityRangeChange,
  minYesPrice,
  maxYesPrice,
  onYesPriceRangeChange,
  minNoPrice,
  maxNoPrice,
  onNoPriceRangeChange,
  maxHoursUntil,
  onMaxHoursUntilChange,
  onApplyFilters,
}: MarketFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  
  // Temporary filter state - only applied when "Apply Filters" is clicked
  const [tempFilters, setTempFilters] = useState<FilterValues>({
    selectedCategory,
    minVolume,
    maxVolume,
    minLiquidity,
    maxLiquidity,
    minYesPrice,
    maxYesPrice,
    minNoPrice,
    maxNoPrice,
    dateRange,
    showClosed,
    maxHoursUntil: maxHoursUntil || null,
  })

  // Sync temp filters when props change (e.g., after reset)
  useEffect(() => {
    setTempFilters({
      selectedCategory,
      minVolume,
      maxVolume,
      minLiquidity,
      maxLiquidity,
      minYesPrice,
      maxYesPrice,
      minNoPrice,
      maxNoPrice,
      dateRange,
      showClosed,
      maxHoursUntil: maxHoursUntil || null,
    })
  }, [selectedCategory, minVolume, maxVolume, minLiquidity, maxLiquidity, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice, dateRange, showClosed, maxHoursUntil])

  return (
    <div className="bg-polymarket-gray rounded-lg border border-gray-700 mb-6 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Filters & View</h3>
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-polymarket-blue text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-polymarket-blue text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
        >
          {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {/* Sort Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sort By</label>
            <select
              value={sortField}
              onChange={(e) => onSortChange(e.target.value as SortField, sortOrder)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="endDate">Resolution Date</option>
              <option value="daysUntil">Days Until Resolution</option>
              <option value="volume">Volume</option>
              <option value="liquidity">Liquidity</option>
              <option value="price">Price</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(sortField, e.target.value as SortOrder)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Start Date</label>
            <input
              type="date"
              value={tempFilters.dateRange.start}
              onChange={(e) => setTempFilters({ ...tempFilters, dateRange: { ...tempFilters.dateRange, start: e.target.value } })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">End Date</label>
            <input
              type="date"
              value={tempFilters.dateRange.end}
              onChange={(e) => setTempFilters({ ...tempFilters, dateRange: { ...tempFilters.dateRange, end: e.target.value } })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            {/* Category Search Input */}
            <input
              type="text"
              placeholder="🔍 Search categories..."
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-polymarket-blue focus:border-transparent"
            />
            <select
              value={tempFilters.selectedCategory}
              onChange={(e) => setTempFilters({ ...tempFilters, selectedCategory: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Categories</option>
              {categories
                .filter(cat => 
                  !categorySearchQuery || cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
                )
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
            {categorySearchQuery && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {categories.filter(cat => 
                  cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
                ).length} of {categories.length} categories
              </p>
            )}
          </div>

          {/* Time Until Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Time Until Resolution</label>
            <select
              value={tempFilters.maxHoursUntil === null ? '' : tempFilters.maxHoursUntil.toString()}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value)
                setTempFilters({ ...tempFilters, maxHoursUntil: value })
              }}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All (except finished)</option>
              <option value="24">Less than a day</option>
              <option value="720">Less than 30 days</option>
            </select>
          </div>

          {/* Volume Range */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Volume</label>
            <input
              type="number"
              value={tempFilters.minVolume || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, minVolume: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Volume</label>
            <input
              type="number"
              value={tempFilters.maxVolume === Infinity ? '' : tempFilters.maxVolume || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, maxVolume: parseFloat(e.target.value) || Infinity })}
              placeholder="No limit"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Liquidity Range */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Liquidity</label>
            <input
              type="number"
              value={tempFilters.minLiquidity || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, minLiquidity: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Liquidity</label>
            <input
              type="number"
              value={tempFilters.maxLiquidity === Infinity ? '' : tempFilters.maxLiquidity || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, maxLiquidity: parseFloat(e.target.value) || Infinity })}
              placeholder="No limit"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* YES Price Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-400">YES Price Range (%)</label>
              <span className="text-sm font-semibold text-white">
                {tempFilters.minYesPrice || 0}% - {tempFilters.maxYesPrice || 100}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">Min:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={tempFilters.minYesPrice || 0}
                  onChange={(e) => {
                    const min = parseInt(e.target.value)
                    // Ensure min doesn't exceed max
                    const max = Math.max(min, tempFilters.maxYesPrice || 100)
                    setTempFilters({ ...tempFilters, minYesPrice: min, maxYesPrice: max })
                  }}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-polymarket-blue"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{tempFilters.minYesPrice || 0}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">Max:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={tempFilters.maxYesPrice || 100}
                  onChange={(e) => {
                    const max = parseInt(e.target.value)
                    // Ensure max doesn't go below min
                    const min = Math.min(max, tempFilters.minYesPrice || 0)
                    setTempFilters({ ...tempFilters, maxYesPrice: max, minYesPrice: min })
                  }}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-polymarket-blue"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{tempFilters.maxYesPrice || 100}%</span>
              </div>
            </div>
          </div>

          {/* NO Price Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-400">NO Price Range (%)</label>
              <span className="text-sm font-semibold text-white">
                {tempFilters.minNoPrice || 0}% - {tempFilters.maxNoPrice || 100}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">Min:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={tempFilters.minNoPrice || 0}
                  onChange={(e) => {
                    const min = parseInt(e.target.value)
                    // Ensure min doesn't exceed max
                    const max = Math.max(min, tempFilters.maxNoPrice || 100)
                    setTempFilters({ ...tempFilters, minNoPrice: min, maxNoPrice: max })
                  }}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-polymarket-blue"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{tempFilters.minNoPrice || 0}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">Max:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={tempFilters.maxNoPrice || 100}
                  onChange={(e) => {
                    const max = parseInt(e.target.value)
                    // Ensure max doesn't go below min
                    const min = Math.min(max, tempFilters.minNoPrice || 0)
                    setTempFilters({ ...tempFilters, maxNoPrice: max, minNoPrice: min })
                  }}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-polymarket-blue"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{tempFilters.maxNoPrice || 100}%</span>
              </div>
            </div>
          </div>

          </div>
          
          {/* Bottom Actions */}
          <div className="border-t border-gray-700 pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tempFilters.showClosed}
                onChange={(e) => setTempFilters({ ...tempFilters, showClosed: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-800 border-gray-600"
              />
              <span className="text-sm text-gray-300">Show closed/finalized markets</span>
            </label>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Apply all temporary filters to actual filter state
                  onCategoryChange(tempFilters.selectedCategory)
                  onVolumeRangeChange(tempFilters.minVolume, tempFilters.maxVolume)
                  onLiquidityRangeChange(tempFilters.minLiquidity, tempFilters.maxLiquidity)
                  onYesPriceRangeChange(tempFilters.minYesPrice, tempFilters.maxYesPrice)
                  onNoPriceRangeChange(tempFilters.minNoPrice, tempFilters.maxNoPrice)
                  onDateRangeChange(tempFilters.dateRange.start, tempFilters.dateRange.end)
                  onShowClosedChange(tempFilters.showClosed)
                  onMaxHoursUntilChange(tempFilters.maxHoursUntil)
                  // Trigger filter application
                  onApplyFilters(tempFilters)
                }}
                className="px-6 py-2 bg-polymarket-blue hover:bg-blue-600 rounded-lg transition-colors font-medium text-white"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  // Reset all temporary filters
                  const resetFilters: FilterValues = {
                    selectedCategory: '',
                    minVolume: 0,
                    maxVolume: Infinity,
                    minLiquidity: 0,
                    maxLiquidity: Infinity,
                    minYesPrice: 0,
                    maxYesPrice: 100,
                    minNoPrice: 0,
                    maxNoPrice: 100,
                    dateRange: { start: '', end: '' },
                    showClosed: false,
                    maxHoursUntil: null,
                  }
                  setTempFilters(resetFilters)
                  setCategorySearchQuery('') // Clear category search
                  // Apply the reset filters immediately
                  onCategoryChange('')
                  onVolumeRangeChange(0, Infinity)
                  onLiquidityRangeChange(0, Infinity)
                  onYesPriceRangeChange(0, 100)
                  onNoPriceRangeChange(0, 100)
                  onDateRangeChange('', '')
                  onShowClosedChange(false)
                  onMaxHoursUntilChange(null)
                  onApplyFilters(resetFilters)
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

