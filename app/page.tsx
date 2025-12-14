'use client'

import { useEffect, useState, useMemo, useCallback, useTransition, startTransition } from 'react'
import { fetchMarkets, Market } from '@/lib/polymarket-api'
import MarketCard from '@/components/MarketCard'
import MarketTable, { TableSortField, TableSortOrder } from '@/components/MarketTable'
import MarketFilters, { SortField, SortOrder } from '@/components/MarketFilters'
import Header from '@/components/Header'
import StatsBar from '@/components/StatsBar'

export default function Home() {
  const [allMarkets, setAllMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('endDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [tableSortField, setTableSortField] = useState<TableSortField>('endDate')
  const [tableSortOrder, setTableSortOrder] = useState<TableSortOrder>('asc')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showClosed, setShowClosed] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [minVolume, setMinVolume] = useState<number>(0)
  const [maxVolume, setMaxVolume] = useState<number>(Infinity)
  const [minLiquidity, setMinLiquidity] = useState<number>(0)
  const [maxLiquidity, setMaxLiquidity] = useState<number>(Infinity)
  const [minYesPrice, setMinYesPrice] = useState<number>(0)
  const [maxYesPrice, setMaxYesPrice] = useState<number>(100)
  const [minNoPrice, setMinNoPrice] = useState<number>(0)
  const [maxNoPrice, setMaxNoPrice] = useState<number>(100)
  const [filterKey, setFilterKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('') // Search input value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('') // Debounced search query for filtering
  const [isPending, startTransition] = useTransition() // For non-blocking updates

  useEffect(() => {
    loadMarkets()
  }, [])

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      // Use startTransition to mark filtering as non-urgent
      startTransition(() => {
        setDebouncedSearchQuery(searchQuery)
      })
    }, 150) // Reduced to 150ms for faster response

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadMarkets = async (clearCache: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // Clear cache if requested (use correct cache keys)
      if (clearCache && typeof window !== 'undefined') {
        localStorage.removeItem('polymarket_events_cache')
        localStorage.removeItem('polymarket_events_cache_timestamp')
        // Also clear old cache keys for backward compatibility
        localStorage.removeItem('polymarket_markets_cache')
        localStorage.removeItem('polymarket_markets_cache_timestamp')
        console.log('Cache cleared, fetching fresh data')
      }
      
      // Fetch ALL markets from Polymarket API for comprehensive analysis
      // Pass null to fetch all events and markets
      console.log('Starting to load ALL markets...');
      const data = await fetchMarkets(null, !clearCache) // null = fetch all
      setAllMarkets(data)
      console.log(`Loaded ${data.length} markets from Polymarket API`)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load markets from Polymarket API'
      let userMessage = `Error: ${errorMessage}`
      
      // Provide more helpful error messages
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        userMessage = 'Request timed out. The API is taking too long to respond. Try refreshing.'
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userMessage = 'Network error. Please check your internet connection and try again.'
      } else if (errorMessage.includes('No markets fetched')) {
        userMessage = 'No markets found. The API may be temporarily unavailable. Please try again later.'
      }
      
      setError(userMessage)
      console.error('Failed to load markets:', err)
      setAllMarkets([]) // Clear markets on error
    } finally {
      setLoading(false)
    }
  }

  // Extract unique categories (normalized for consistency)
  const categories = useMemo(() => {
    const cats = new Set<string>()
    allMarkets.forEach(m => {
      const cat = m.category?.trim()
      if (cat && cat.length > 0 && cat !== 'NONE' && cat.toLowerCase() !== 'none') {
        cats.add(cat) // Keep original case for display
      }
    })
    const sorted = Array.from(cats).sort()
    console.log(`Found ${sorted.length} unique categories:`, sorted.slice(0, 20))
    return sorted
  }, [allMarkets])

  // Filter and sort markets - optimized with useMemo
  const filteredAndSortedMarkets = useMemo(() => {
    // Early return if no markets
    if (allMarkets.length === 0) return []
    
    let filtered = [...allMarkets]

    // Search filter (using debounced query for better performance)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      // Split query into words for multi-word search
      const queryWords = query.split(/\s+/).filter(w => w.length > 0)
      
      filtered = filtered.filter(m => {
        // Search in multiple fields
        const searchableText = [
          m.question,
          m.description || '',
          m.category || '',
          m.slug,
          m.eventSlug || '',
        ].join(' ').toLowerCase()
        
        // Match all words (AND logic) - all words must be found
        return queryWords.every(word => searchableText.includes(word))
      })
    }

    // Remove resolved/finalized markets by default
    if (!showClosed) {
      filtered = filtered.filter(m => m.active && !m.closed && !m.finalized)
    }

    // Filter by category (exact match, case-sensitive, trimmed)
    if (selectedCategory && selectedCategory.trim()) {
      const beforeCount = filtered.length
      const normalizedFilter = selectedCategory.trim()
      
      // Filter markets - only include markets that match the selected category exactly
      filtered = filtered.filter(m => {
        const marketCategory = (m.category || '').trim()
        return marketCategory === normalizedFilter
      })
      
      // Debug: Check for category mismatches in filtered results
      const categoriesInResults = new Set<string>()
      const sampleMismatches: Array<{question: string, category: string}> = []
      
      filtered.forEach(m => {
        const cat = (m.category || '').trim()
        if (cat) {
          categoriesInResults.add(cat)
          // Collect mismatches for debugging
          if (cat !== normalizedFilter && sampleMismatches.length < 10) {
            sampleMismatches.push({
              question: m.question.substring(0, 60),
              category: cat
            })
          }
        }
      })
      
      console.log(`Category filter "${normalizedFilter}": ${beforeCount} → ${filtered.length} markets`)
      
      // CRITICAL: Warn if filtered results contain unexpected categories
      const unexpected = Array.from(categoriesInResults).filter(cat => cat !== normalizedFilter)
      if (unexpected.length > 0) {
        console.error(`❌ CRITICAL: Category filter is broken! Found ${unexpected.length} unexpected categories:`, unexpected)
        console.error(`   Expected ONLY: "${normalizedFilter}"`)
        console.error(`   But found:`, Array.from(categoriesInResults))
        console.error(`   Sample mismatches:`, sampleMismatches)
        
        // FIX: Re-filter to remove mismatches (safety check)
        filtered = filtered.filter(m => {
          const marketCategory = (m.category || '').trim()
          return marketCategory === normalizedFilter
        })
        console.warn(`   Fixed: Re-filtered to ${filtered.length} markets with correct category`)
      } else if (filtered.length > 0) {
        console.log(`✅ Category filter working correctly - all ${filtered.length} markets have category "${normalizedFilter}"`)
      }
    }

    // Filter by volume range
    if (minVolume > 0) {
      filtered = filtered.filter(m => m.volumeNum >= minVolume)
    }
    if (maxVolume !== Infinity && maxVolume > 0) {
      filtered = filtered.filter(m => m.volumeNum <= maxVolume)
    }

    // Filter by liquidity range
    if (minLiquidity > 0) {
      filtered = filtered.filter(m => m.liquidityNum >= minLiquidity)
    }
    if (maxLiquidity !== Infinity && maxLiquidity > 0) {
      filtered = filtered.filter(m => m.liquidityNum <= maxLiquidity)
    }

    // Filter by YES price range (percentage)
    // Apply filter if user has changed from defaults (0-100)
    if (minYesPrice !== 0 || maxYesPrice !== 100) {
      const beforeCount = filtered.length
      filtered = filtered.filter(m => {
        // Handle both string and number formats
        const priceStr = m.outcomePrices?.[0]
        const yesPrice = typeof priceStr === 'string' 
          ? parseFloat(priceStr) * 100 
          : (typeof priceStr === 'number' ? priceStr * 100 : 50)
        
        // Check if price is within range
        const meetsMin = yesPrice >= minYesPrice
        const meetsMax = yesPrice <= maxYesPrice
        const inRange = meetsMin && meetsMax
        
        return inRange
      })
      
      // Debug logging
      console.log(`YES Price filter applied: ${beforeCount} → ${filtered.length} markets (range: ${minYesPrice}%-${maxYesPrice}%)`)
    }

    // Filter by NO price range (percentage)
    // Apply filter if user has changed from defaults (0-100)
    if (minNoPrice !== 0 || maxNoPrice !== 100) {
      const beforeCount = filtered.length
      filtered = filtered.filter(m => {
        // Handle both string and number formats
        const priceStr = m.outcomePrices?.[1]
        const noPrice = typeof priceStr === 'string' 
          ? parseFloat(priceStr) * 100 
          : (typeof priceStr === 'number' ? priceStr * 100 : 50)
        
        // Check if price is within range
        const meetsMin = noPrice >= minNoPrice
        const meetsMax = noPrice <= maxNoPrice
        const inRange = meetsMin && meetsMax
        
        return inRange
      })
      
      // Debug logging
      console.log(`NO Price filter applied: ${beforeCount} → ${filtered.length} markets (range: ${minNoPrice}%-${maxNoPrice}%)`)
    }

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      filtered = filtered.filter(m => new Date(m.endDate) >= startDate)
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(m => new Date(m.endDate) <= endDate)
    }

    // Determine which sort field to use based on view mode
    const currentSortField = viewMode === 'table' ? tableSortField : sortField
    const currentSortOrder = viewMode === 'table' ? tableSortOrder : sortOrder

    // Sort markets
    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      if (viewMode === 'table') {
        // Table-specific sorting
        switch (currentSortField as TableSortField) {
          case 'question':
            aValue = a.question.toLowerCase()
            bValue = b.question.toLowerCase()
            break
          case 'category':
            aValue = (a.category || '').toLowerCase()
            bValue = (b.category || '').toLowerCase()
            break
          case 'yesPrice':
            aValue = parseFloat(a.outcomePrices?.[0] || '0.5')
            bValue = parseFloat(b.outcomePrices?.[0] || '0.5')
            break
          case 'noPrice':
            aValue = parseFloat(a.outcomePrices?.[1] || '0.5')
            bValue = parseFloat(b.outcomePrices?.[1] || '0.5')
            break
          case 'volume':
            aValue = a.volumeNum
            bValue = b.volumeNum
            break
          case 'liquidity':
            aValue = a.liquidityNum
            bValue = b.liquidityNum
            break
          case 'volume24h':
            aValue = a.volume24hNum || 0
            bValue = b.volume24hNum || 0
            break
          case 'endDate':
            aValue = new Date(a.endDate).getTime()
            bValue = new Date(b.endDate).getTime()
            break
          case 'daysUntil':
            aValue = a.daysUntilResolution ?? Infinity
            bValue = b.daysUntilResolution ?? Infinity
            break
          case 'status':
            aValue = a.finalized ? 2 : a.closed ? 1 : 0
            bValue = b.finalized ? 2 : b.closed ? 1 : 0
            break
          default:
            return 0
        }
      } else {
        // Grid view sorting
        switch (currentSortField as SortField) {
          case 'endDate':
            aValue = new Date(a.endDate).getTime()
            bValue = new Date(b.endDate).getTime()
            break
          case 'daysUntil':
            aValue = a.daysUntilResolution ?? Infinity
            bValue = b.daysUntilResolution ?? Infinity
            break
          case 'volume':
            aValue = a.volumeNum
            bValue = b.volumeNum
            break
          case 'liquidity':
            aValue = a.liquidityNum
            bValue = b.liquidityNum
            break
          case 'price':
            aValue = parseFloat(a.outcomePrices?.[0] || '0.5')
            bValue = parseFloat(b.outcomePrices?.[0] || '0.5')
            break
          default:
            return 0
        }
      }

      if (aValue < bValue) return currentSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return currentSortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Debug: Log final filtered count and check for duplicates
    const marketIds = filtered.map(m => m.id)
    const uniqueIds = new Set(marketIds)
    const hasDuplicates = marketIds.length !== uniqueIds.size
    
    console.log(`[Filter Debug] Final filtered markets: ${filtered.length}`, {
      filterKey,
      selectedCategory,
      minYesPrice,
      maxYesPrice,
      minNoPrice,
      maxNoPrice,
      showClosed,
      searchQuery: debouncedSearchQuery,
      uniqueIds: uniqueIds.size,
      hasDuplicates
    })
    
    if (hasDuplicates) {
      const duplicates = marketIds.filter((id, index) => marketIds.indexOf(id) !== index)
      console.warn(`[Filter Debug] ⚠️ Found ${duplicates.length} duplicate market IDs in filtered results:`, duplicates.slice(0, 10))
      
      // Deduplicate: keep first occurrence of each ID
      const seen = new Set<string>()
      filtered = filtered.filter(m => {
        if (seen.has(m.id)) {
          return false
        }
        seen.add(m.id)
        return true
      })
      console.log(`[Filter Debug] Deduplicated: ${marketIds.length} → ${filtered.length} markets`)
    }
    
    return filtered
  }, [allMarkets, sortField, sortOrder, tableSortField, tableSortOrder, dateRange, showClosed, selectedCategory, minVolume, maxVolume, minLiquidity, maxLiquidity, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice, viewMode, filterKey, debouncedSearchQuery])

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field)
    setSortOrder(order)
  }

  const handleTableSortChange = (field: TableSortField, order: TableSortOrder) => {
    setTableSortField(field)
    setTableSortOrder(order)
  }

  const totalVolume = filteredAndSortedMarkets.reduce((sum, market) => sum + market.volumeNum, 0)
  const totalLiquidity = filteredAndSortedMarkets.reduce((sum, market) => sum + market.liquidityNum, 0)
  const activeMarkets = filteredAndSortedMarkets.filter(m => m.active && !m.closed).length

  return (
    <main className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <StatsBar 
          totalVolume={totalVolume}
          totalLiquidity={totalLiquidity}
          activeMarkets={activeMarkets}
        />

        <div className="mt-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold">Markets</h2>
              <p className="text-gray-400 mt-1">
                {loading ? 'Loading markets...' : `Showing ${filteredAndSortedMarkets.length} of ${allMarkets.length} markets`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadMarkets(false)}
                disabled={loading}
                className="px-4 py-2 bg-polymarket-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => loadMarkets(true)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear cache and refresh"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search markets (e.g., 'paradex', 'bitcoin', etc.)..."
                value={searchQuery}
                onChange={(e) => {
                  // Update input immediately - don't block on filtering
                  setSearchQuery(e.target.value)
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-polymarket-blue focus:border-transparent"
              />
              {searchQuery && (
                <>
                  {searchQuery !== debouncedSearchQuery && (
                    <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
                      Searching...
                    </span>
                  )}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
            {debouncedSearchQuery && (
              <p className="mt-2 text-sm text-gray-400">
                {isPending ? (
                  <span className="animate-pulse">Searching...</span>
                ) : (
                  <>
                    Found {filteredAndSortedMarkets.length} market{filteredAndSortedMarkets.length !== 1 ? 's' : ''} matching "{debouncedSearchQuery}"
                  </>
                )}
              </p>
            )}
          </div>

          {/* Loading/Error States */}
          {loading && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-polymarket-blue"></div>
                <p className="text-blue-400">Loading all markets from Polymarket API...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => loadMarkets(true)}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters */}
          <MarketFilters
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            dateRange={dateRange}
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            minVolume={minVolume}
            maxVolume={maxVolume}
            onVolumeRangeChange={(min, max) => {
              setMinVolume(min)
              setMaxVolume(max)
            }}
            minLiquidity={minLiquidity}
            maxLiquidity={maxLiquidity}
            onLiquidityRangeChange={(min, max) => {
              setMinLiquidity(min)
              setMaxLiquidity(max)
            }}
            minYesPrice={minYesPrice}
            maxYesPrice={maxYesPrice}
            onYesPriceRangeChange={(min, max) => {
              setMinYesPrice(min)
              setMaxYesPrice(max)
            }}
            minNoPrice={minNoPrice}
            maxNoPrice={maxNoPrice}
            onNoPriceRangeChange={(min, max) => {
              setMinNoPrice(min)
              setMaxNoPrice(max)
            }}
            onApplyFilters={(filters) => {
              // Update all filter state variables first
              setSelectedCategory(filters.selectedCategory)
              setMinVolume(filters.minVolume)
              setMaxVolume(filters.maxVolume)
              setMinLiquidity(filters.minLiquidity)
              setMaxLiquidity(filters.maxLiquidity)
              setMinYesPrice(filters.minYesPrice)
              setMaxYesPrice(filters.maxYesPrice)
              setMinNoPrice(filters.minNoPrice)
              setMaxNoPrice(filters.maxNoPrice)
              setDateRange(filters.dateRange)
              setShowClosed(filters.showClosed)
              // Force re-filter by updating filterKey (triggers useMemo recalculation)
              setFilterKey(prev => prev + 1)
              console.log('Filters applied - filtering cached data:', filters)
            }}
          />

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {loading && allMarkets.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-polymarket-gray rounded-lg p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            <MarketTable 
              markets={filteredAndSortedMarkets}
              onSort={handleTableSortChange}
              sortField={tableSortField}
              sortOrder={tableSortOrder}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}

          {!loading && filteredAndSortedMarkets.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No markets found matching your filters</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

