'use client'

import { useState, useEffect, useRef } from 'react'

// Searchable Dropdown Component
function SearchableDropdown({
  value,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  onChange
}: {
  value: string
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    !search || opt.toLowerCase().includes(search.toLowerCase())
  )
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])
  
  const handleSelect = (opt: string) => {
    onChange(opt)
    setIsOpen(false)
    setSearch('')
  }
  
  return (
    <div ref={containerRef} className="relative">
      {/* Selected value display / trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-left flex items-center justify-between hover:border-gray-500 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-gray-700">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {/* All option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${!value ? 'bg-gray-700 text-blue-400' : 'text-gray-300'}`}
            >
              {placeholder}
            </button>
            
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No categories found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${value === opt ? 'bg-gray-700 text-blue-400' : 'text-gray-300'}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
          
          {/* Count indicator */}
          {search && (
            <div className="px-3 py-1.5 text-xs text-gray-500 border-t border-gray-700">
              {filteredOptions.length} of {options.length} categories
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
  // Order book filters
  maxSpread: number | null // null = no filter, number = max spread in cents
  minBidUSD: number | null // null = no filter, number = min bid liquidity in USD
  minAskUSD: number | null // null = no filter, number = min ask liquidity in USD
}

export type { FilterValues }

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
  // Order book filters
  maxSpread: number | null
  onMaxSpreadChange: (spread: number | null) => void
  minBidUSD: number | null
  onMinBidUSDChange: (amount: number | null) => void
  minAskUSD: number | null
  onMinAskUSDChange: (amount: number | null) => void
  onApplyFilters: (filters: FilterValues) => void
}

// Custom Dual Range Slider Component using mouse events for reliable interaction
function DualRangeSlider({ 
  label, 
  min, 
  max, 
  onMinChange, 
  onMaxChange,
  color = 'blue'
}: { 
  label: string
  min: number
  max: number
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  color?: 'blue' | 'green' | 'red'
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  
  const colorConfig = {
    blue: { bg: 'bg-blue-500', ring: 'ring-blue-400', border: 'border-blue-500' },
    green: { bg: 'bg-green-500', ring: 'ring-green-400', border: 'border-green-500' },
    red: { bg: 'bg-red-500', ring: 'ring-red-400', border: 'border-red-500' }
  }
  
  const colors = colorConfig[color]
  
  // Convert mouse position to percentage value
  const getValueFromPosition = (clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const percentage = ((clientX - rect.left) / rect.width) * 100
    return Math.round(Math.max(0, Math.min(100, percentage)))
  }
  
  // Handle mouse down on thumb
  const handleThumbMouseDown = (thumb: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(thumb)
  }
  
  // Handle mouse move (drag)
  useEffect(() => {
    if (!dragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const value = getValueFromPosition(e.clientX)
      
      if (dragging === 'min') {
        // Min thumb can't go past max - 1
        const newMin = Math.min(value, max - 1)
        onMinChange(newMin)
      } else {
        // Max thumb can't go below min + 1
        const newMax = Math.max(value, min + 1)
        onMaxChange(newMax)
      }
    }
    
    const handleMouseUp = () => {
      setDragging(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, min, max, onMinChange, onMaxChange])
  
  // Handle click on track to move nearest thumb
  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return // Don't handle track clicks while dragging
    
    const value = getValueFromPosition(e.clientX)
    
    // Move the closest thumb
    const distToMin = Math.abs(value - min)
    const distToMax = Math.abs(value - max)
    
    if (distToMin <= distToMax) {
      // Move min thumb (but not past max)
      onMinChange(Math.min(value, max - 1))
    } else {
      // Move max thumb (but not below min)
      onMaxChange(Math.max(value, min + 1))
    }
  }
  
  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-400">{label}</label>
      
      {/* Value display with editable inputs */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          max="100"
          value={min}
          onChange={(e) => {
            // Allow free typing - clamp to valid range
            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
            onMinChange(val)
          }}
          onBlur={() => {
            // On blur, ensure min < max
            if (min >= max) onMinChange(Math.max(0, max - 1))
          }}
          className={`w-14 bg-gray-800 border ${colors.border} rounded px-2 py-1 text-white text-center text-sm font-mono`}
        />
        
        {/* Custom slider track */}
        <div 
          ref={trackRef}
          className="flex-1 relative h-10 flex items-center cursor-pointer select-none"
          onClick={handleTrackClick}
        >
          {/* Track background */}
          <div className="absolute w-full h-2 bg-gray-700 rounded-full" />
          
          {/* Active range highlight */}
          <div 
            className={`absolute h-2 ${colors.bg} rounded-full opacity-70`}
            style={{
              left: `${min}%`,
              width: `${max - min}%`
            }}
          />
          
          {/* Min Thumb */}
          <div
            className={`absolute w-6 h-6 rounded-full bg-white border-2 ${colors.border} shadow-lg cursor-grab active:cursor-grabbing transform -translate-x-1/2 transition-shadow ${dragging === 'min' ? 'ring-2 ' + colors.ring + ' scale-110' : 'hover:ring-2 hover:' + colors.ring}`}
            style={{ left: `${min}%`, zIndex: dragging === 'min' ? 30 : 20 }}
            onMouseDown={handleThumbMouseDown('min')}
          >
            <div className={`absolute inset-1 rounded-full ${colors.bg} opacity-50`} />
          </div>
          
          {/* Max Thumb */}
          <div
            className={`absolute w-6 h-6 rounded-full bg-white border-2 ${colors.border} shadow-lg cursor-grab active:cursor-grabbing transform -translate-x-1/2 transition-shadow ${dragging === 'max' ? 'ring-2 ' + colors.ring + ' scale-110' : 'hover:ring-2 hover:' + colors.ring}`}
            style={{ left: `${max}%`, zIndex: dragging === 'max' ? 30 : 20 }}
            onMouseDown={handleThumbMouseDown('max')}
          >
            <div className={`absolute inset-1 rounded-full ${colors.bg} opacity-50`} />
          </div>
        </div>
        
        <input
          type="number"
          min="0"
          max="100"
          value={max}
          onChange={(e) => {
            // Allow free typing - clamp to valid range
            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 100))
            onMaxChange(val)
          }}
          onBlur={() => {
            // On blur, ensure max > min
            if (max <= min) onMaxChange(Math.min(100, min + 1))
          }}
          className={`w-14 bg-gray-800 border ${colors.border} rounded px-2 py-1 text-white text-center text-sm font-mono`}
        />
      </div>
      
      {/* Quick select buttons - with proper spacing */}
      <div className="flex gap-2 flex-wrap mt-1">
        <span className="text-xs text-gray-500">Quick:</span>
        <button
          type="button"
          onClick={() => { onMinChange(0); onMaxChange(100); }}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${min === 0 && max === 100 ? colors.bg + ' text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => { onMinChange(0); onMaxChange(10); }}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${min === 0 && max === 10 ? colors.bg + ' text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          0-10%
        </button>
        <button
          type="button"
          onClick={() => { onMinChange(90); onMaxChange(100); }}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${min === 90 && max === 100 ? colors.bg + ' text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          90-100%
        </button>
        <button
          type="button"
          onClick={() => { onMinChange(40); onMaxChange(60); }}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${min === 40 && max === 60 ? colors.bg + ' text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          40-60%
        </button>
      </div>
    </div>
  )
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
  maxSpread,
  onMaxSpreadChange,
  minBidUSD,
  onMinBidUSDChange,
  minAskUSD,
  onMinAskUSDChange,
  onApplyFilters,
}: MarketFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  
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
    maxSpread: maxSpread || null,
    minBidUSD: minBidUSD || null,
    minAskUSD: minAskUSD || null,
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
      maxSpread: maxSpread || null,
      minBidUSD: minBidUSD || null,
      minAskUSD: minAskUSD || null,
    })
  }, [selectedCategory, minVolume, maxVolume, minLiquidity, maxLiquidity, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice, dateRange, showClosed, maxHoursUntil, maxSpread, minBidUSD, minAskUSD])

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

          {/* Category Filter - Searchable Dropdown */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <SearchableDropdown
              value={tempFilters.selectedCategory}
              options={categories}
              placeholder="All Categories"
              searchPlaceholder="Search categories..."
              onChange={(value) => setTempFilters({ ...tempFilters, selectedCategory: value })}
            />
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
          <DualRangeSlider
            label="YES Price Range (%)"
            min={tempFilters.minYesPrice || 0}
            max={tempFilters.maxYesPrice || 100}
            onMinChange={(min) => setTempFilters({ ...tempFilters, minYesPrice: min })}
            onMaxChange={(max) => setTempFilters({ ...tempFilters, maxYesPrice: max })}
            color="green"
          />

          {/* NO Price Range */}
          <DualRangeSlider
            label="NO Price Range (%)"
            min={tempFilters.minNoPrice || 0}
            max={tempFilters.maxNoPrice || 100}
            onMinChange={(min) => setTempFilters({ ...tempFilters, minNoPrice: min })}
            onMaxChange={(max) => setTempFilters({ ...tempFilters, maxNoPrice: max })}
            color="red"
          />

          {/* Order Book Filters Section */}
          <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">📊 Order Book Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Max Spread */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Spread (¢)</label>
                <select
                  value={tempFilters.maxSpread === null ? '' : tempFilters.maxSpread.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : parseFloat(e.target.value)
                    setTempFilters({ ...tempFilters, maxSpread: value })
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">No limit</option>
                  <option value="1">≤ 1¢ (very tight)</option>
                  <option value="2">≤ 2¢ (tight)</option>
                  <option value="5">≤ 5¢ (moderate)</option>
                  <option value="10">≤ 10¢</option>
                  <option value="20">≤ 20¢</option>
                </select>
              </div>

              {/* Min Bid USD */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Bid Liquidity ($)</label>
                <select
                  value={tempFilters.minBidUSD === null ? '' : tempFilters.minBidUSD.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : parseFloat(e.target.value)
                    setTempFilters({ ...tempFilters, minBidUSD: value })
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">No minimum</option>
                  <option value="100">≥ $100</option>
                  <option value="500">≥ $500</option>
                  <option value="1000">≥ $1,000</option>
                  <option value="5000">≥ $5,000</option>
                  <option value="10000">≥ $10,000</option>
                </select>
              </div>

              {/* Min Ask USD */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Ask Liquidity ($)</label>
                <select
                  value={tempFilters.minAskUSD === null ? '' : tempFilters.minAskUSD.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : parseFloat(e.target.value)
                    setTempFilters({ ...tempFilters, minAskUSD: value })
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">No minimum</option>
                  <option value="100">≥ $100</option>
                  <option value="500">≥ $500</option>
                  <option value="1000">≥ $1,000</option>
                  <option value="5000">≥ $5,000</option>
                  <option value="10000">≥ $10,000</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: Order book filters only apply to markets with active order books. Markets without order books will be hidden when these filters are active.
            </p>
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
                  onMaxSpreadChange(tempFilters.maxSpread)
                  onMinBidUSDChange(tempFilters.minBidUSD)
                  onMinAskUSDChange(tempFilters.minAskUSD)
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
                    maxSpread: null,
                    minBidUSD: null,
                    minAskUSD: null,
                  }
                  setTempFilters(resetFilters)
                  // Apply the reset filters immediately
                  onCategoryChange('')
                  onVolumeRangeChange(0, Infinity)
                  onLiquidityRangeChange(0, Infinity)
                  onYesPriceRangeChange(0, 100)
                  onNoPriceRangeChange(0, 100)
                  onDateRangeChange('', '')
                  onShowClosedChange(false)
                  onMaxHoursUntilChange(null)
                  onMaxSpreadChange(null)
                  onMinBidUSDChange(null)
                  onMinAskUSDChange(null)
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

