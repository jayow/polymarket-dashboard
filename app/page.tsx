'use client'

import { useEffect, useState, useMemo, useCallback, useTransition, startTransition, useRef } from 'react'
import { fetchMarkets, Market } from '@/lib/polymarket-api'
import MarketCard from '@/components/MarketCard'
import MarketTable, { TableSortField, TableSortOrder } from '@/components/MarketTable'
import MarketFilters, { SortField, SortOrder, FilterValues } from '@/components/MarketFilters'
import { orderBookCache, ProcessedOrderBook } from '@/components/OrderBookCell'
import StatsBar from '@/components/StatsBar'
import ShareFiltersModal from '@/components/ShareFiltersModal'
import { encodeFiltersToURL, decodeFiltersFromURL, ShareableFilters } from '@/lib/share-utils'

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
  const [maxHoursUntil, setMaxHoursUntil] = useState<number | null>(24) // Default to "less than 1 day" for faster initial load
  const [maxSpread, setMaxSpread] = useState<number | null>(null)
  const [minBidUSD, setMinBidUSD] = useState<number | null>(null)
  const [minAskUSD, setMinAskUSD] = useState<number | null>(null)
  const [filterKey, setFilterKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('') // Search input value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('') // Debounced search query for filtering
  const [isPending, startTransition] = useTransition() // For non-blocking updates
  const [showShareModal, setShowShareModal] = useState(false)
  
  // Track if we've initialized from URL to prevent loops
  const initializedFromURL = useRef(false)

  useEffect(() => {
    loadMarkets()
  }, [])

  // Read filters from URL on mount
  useEffect(() => {
    if (!initializedFromURL.current && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.toString()) {
        const urlFilters = decodeFiltersFromURL(searchParams)
        
        if (urlFilters.category) setSelectedCategory(urlFilters.category)
        if (urlFilters.searchQuery) setSearchQuery(urlFilters.searchQuery)
        if (urlFilters.dateStart || urlFilters.dateEnd) {
          setDateRange({ 
            start: urlFilters.dateStart || '', 
            end: urlFilters.dateEnd || '' 
          })
        }
        if (urlFilters.minVolume !== undefined) setMinVolume(urlFilters.minVolume)
        if (urlFilters.maxVolume !== undefined) setMaxVolume(urlFilters.maxVolume)
        if (urlFilters.minLiquidity !== undefined) setMinLiquidity(urlFilters.minLiquidity)
        if (urlFilters.maxLiquidity !== undefined) setMaxLiquidity(urlFilters.maxLiquidity)
        if (urlFilters.minYesPrice !== undefined) setMinYesPrice(urlFilters.minYesPrice)
        if (urlFilters.maxYesPrice !== undefined) setMaxYesPrice(urlFilters.maxYesPrice)
        if (urlFilters.minNoPrice !== undefined) setMinNoPrice(urlFilters.minNoPrice)
        if (urlFilters.maxNoPrice !== undefined) setMaxNoPrice(urlFilters.maxNoPrice)
        if (urlFilters.maxHoursUntil !== undefined) setMaxHoursUntil(urlFilters.maxHoursUntil)
        if (urlFilters.maxSpread !== undefined) setMaxSpread(urlFilters.maxSpread)
        if (urlFilters.minBidUSD !== undefined) setMinBidUSD(urlFilters.minBidUSD)
        if (urlFilters.minAskUSD !== undefined) setMinAskUSD(urlFilters.minAskUSD)
        if (urlFilters.showClosed !== undefined) setShowClosed(urlFilters.showClosed)
        if (urlFilters.sortField) setSortField(urlFilters.sortField as SortField)
        if (urlFilters.sortOrder) setSortOrder(urlFilters.sortOrder as SortOrder)
        if (urlFilters.viewMode) setViewMode(urlFilters.viewMode)
      }
      
      initializedFromURL.current = true
    }
  }, []) // Only run once on mount

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

  // Extract unique categories from all tags (support multi-category)
  const categories = useMemo(() => {
    const cats = new Set<string>()
    allMarkets.forEach(m => {
      // Add primary category
      const cat = m.category?.trim()
      if (cat && cat.length > 0 && cat !== 'NONE' && cat.toLowerCase() !== 'none') {
        cats.add(cat)
      }
      // Add all tags (for multi-category support)
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(tag => {
          // Handle both string tags and object tags
          let tagLabel: string | undefined
          if (typeof tag === 'string') {
            tagLabel = tag.trim()
          } else if (typeof tag === 'object' && tag !== null && 'label' in tag) {
            tagLabel = String(tag.label).trim()
          } else {
            // Skip non-string, non-object tags
            return
          }
          
          if (tagLabel && tagLabel.length > 0 && tagLabel !== 'NONE' && tagLabel.toLowerCase() !== 'none') {
            cats.add(tagLabel)
          }
        })
      }
    })
    const sorted = Array.from(cats).sort()
    console.log(`Found ${sorted.length} unique categories/tags:`, sorted.slice(0, 20))
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

    // Filter by time until resolution
    if (maxHoursUntil !== null && maxHoursUntil > 0) {
      const beforeCount = filtered.length
      const maxMs = maxHoursUntil * 60 * 60 * 1000 // Convert hours to milliseconds
      const now = new Date().getTime()
      
      filtered = filtered.filter(m => {
        if (!m.endDate) return false
        const endDate = new Date(m.endDate).getTime()
        const timeUntil = endDate - now
        
        // Only include markets that haven't resolved yet and are within the time limit
        return timeUntil > 0 && timeUntil <= maxMs
      })
      
      const timeLabel = maxHoursUntil === 24 ? 'a day' : maxHoursUntil === 720 ? '30 days' : `${maxHoursUntil} hours`
      console.log(`Time until filter (< ${timeLabel}): ${beforeCount} → ${filtered.length} markets`)
    }

    // Filter by category - check both primary category AND all tags (multi-category support)
    if (selectedCategory && selectedCategory.trim()) {
      const beforeCount = filtered.length
      const normalizedFilter = selectedCategory.trim()
      
      let matchedByCategory = 0
      let matchedByTags = 0
      
      // Filter markets - include if primary category OR any tag matches
      filtered = filtered.filter(m => {
        // Check primary category
        const marketCategory = (m.category || '').trim()
        if (marketCategory === normalizedFilter) {
          matchedByCategory++
          return true
        }
        
        // Check all tags (multi-category support)
        if (m.tags && Array.isArray(m.tags)) {
          const hasMatchingTag = m.tags.some(tag => {
            // Handle both string tags and object tags
            let tagLabel: string | undefined
            if (typeof tag === 'string') {
              tagLabel = tag.trim()
            } else if (typeof tag === 'object' && tag !== null && 'label' in tag) {
              tagLabel = String(tag.label).trim()
            }
            return tagLabel === normalizedFilter
          })
          
          if (hasMatchingTag) {
            matchedByTags++
            return true
          }
        }
        
        return false
      })
      
      console.log(`Category filter "${normalizedFilter}": ${beforeCount} → ${filtered.length} markets`)
      console.log(`  - Matched by primary category: ${matchedByCategory}`)
      console.log(`  - Matched by tags only: ${matchedByTags}`)
      
      // Debug: Check what categories/tags are in the filtered results
      const categoriesInResults = new Set<string>()
      const tagsInResults = new Set<string>()
      
      filtered.forEach(m => {
        // Track primary categories
        const cat = (m.category || '').trim()
        if (cat) {
          categoriesInResults.add(cat)
        }
        // Track all tags
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach(tag => {
            let tagLabel: string | undefined
            if (typeof tag === 'string') {
              tagLabel = tag.trim()
            } else if (typeof tag === 'object' && tag !== null && 'label' in tag) {
              tagLabel = String(tag.label).trim()
            }
            if (tagLabel) {
              tagsInResults.add(tagLabel)
            }
          })
        }
      })
      
      // Verify that all filtered markets actually match the filter (by category OR tags)
      const invalidMarkets = filtered.filter(m => {
        const marketCategory = (m.category || '').trim()
        if (marketCategory === normalizedFilter) {
          return false // Valid - matches by primary category
        }
        
        // Check if any tag matches
        if (m.tags && Array.isArray(m.tags)) {
          const hasMatchingTag = m.tags.some(tag => {
            let tagLabel: string | undefined
            if (typeof tag === 'string') {
              tagLabel = tag.trim()
            } else if (typeof tag === 'object' && tag !== null && 'label' in tag) {
              tagLabel = String(tag.label).trim()
            }
            return tagLabel === normalizedFilter
          })
          return !hasMatchingTag // Invalid if no tag matches
        }
        
        return true // Invalid - no category or tag match
      })
      
      if (invalidMarkets.length > 0) {
        console.error(`❌ CRITICAL: Category filter is broken! Found ${invalidMarkets.length} markets that don't match filter "${normalizedFilter}"`)
        console.error(`   Sample invalid markets:`, invalidMarkets.slice(0, 5).map(m => ({
          question: m.question.substring(0, 60),
          category: m.category,
          tags: m.tags
        })))
        
        // FIX: Remove invalid markets
        filtered = filtered.filter(m => {
          const marketCategory = (m.category || '').trim()
          if (marketCategory === normalizedFilter) {
            return true
          }
          if (m.tags && Array.isArray(m.tags)) {
            return m.tags.some(tag => {
              let tagLabel: string | undefined
              if (typeof tag === 'string') {
                tagLabel = tag.trim()
              } else if (typeof tag === 'object' && tag !== null && 'label' in tag) {
                tagLabel = String(tag.label).trim()
              }
              return tagLabel === normalizedFilter
            })
          }
          return false
        })
        console.warn(`   Fixed: Re-filtered to ${filtered.length} valid markets`)
      } else {
        console.log(`✅ Category filter working correctly - all ${filtered.length} markets match "${normalizedFilter}" (by category or tags)`)
        if (categoriesInResults.size > 0) {
          console.log(`   Primary categories in results:`, Array.from(categoriesInResults).slice(0, 10))
        }
        if (tagsInResults.has(normalizedFilter)) {
          console.log(`   ✓ Filter "${normalizedFilter}" found in tags`)
        }
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

    // Filter by YES or NO price range (OR logic)
    const yesPriceFilterActive = minYesPrice !== 0 || maxYesPrice !== 100
    const noPriceFilterActive = minNoPrice !== 0 || maxNoPrice !== 100
    
    if (yesPriceFilterActive || noPriceFilterActive) {
      const beforeCount = filtered.length
      filtered = filtered.filter(m => {
        let matchesYes = false
        let matchesNo = false
        
        // Check YES price range
        if (yesPriceFilterActive) {
          const priceStr = m.outcomePrices?.[0]
          const yesPrice = typeof priceStr === 'string' 
            ? parseFloat(priceStr) * 100 
            : (typeof priceStr === 'number' ? priceStr * 100 : 50)
          matchesYes = yesPrice >= minYesPrice && yesPrice <= maxYesPrice
        }
        
        // Check NO price range
        if (noPriceFilterActive) {
          const priceStr = m.outcomePrices?.[1]
          const noPrice = typeof priceStr === 'string' 
            ? parseFloat(priceStr) * 100 
            : (typeof priceStr === 'number' ? priceStr * 100 : 50)
          matchesNo = noPrice >= minNoPrice && noPrice <= maxNoPrice
        }
        
        // Match if YES price is in range OR NO price is in range
        return matchesYes || matchesNo
      })
      
      const filters = []
      if (yesPriceFilterActive) filters.push(`YES: ${minYesPrice}%-${maxYesPrice}%`)
      if (noPriceFilterActive) filters.push(`NO: ${minNoPrice}%-${maxNoPrice}%`)
      console.log(`Price filter applied (OR): ${beforeCount} → ${filtered.length} markets (${filters.join(' OR ')})`)
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

    // Order book filters (spread, bid/ask liquidity)
    // Note: These filters only work on markets that have cached order book data
    const orderBookFilterActive = maxSpread !== null || minBidUSD !== null || minAskUSD !== null
    
    if (orderBookFilterActive) {
      const beforeCount = filtered.length
      
      filtered = filtered.filter(m => {
        const tokenId = m.clobTokenIds?.[0]
        if (!tokenId) return false // No token ID means no order book possible
        
        // Check if we have cached order book data for this market
        const cached = orderBookCache.get(tokenId)
        if (!cached?.data) {
          // No cached data - exclude from filtered results when order book filters are active
          // This encourages users to scroll through results to load order book data
          return false
        }
        
        const orderBook = cached.data
        
        // Check spread filter
        if (maxSpread !== null) {
          if (orderBook.spread === null) return false
          const spreadCents = orderBook.spread * 100
          if (spreadCents > maxSpread) return false
        }
        
        // Check min bid USD filter
        if (minBidUSD !== null) {
          if (!orderBook.bestBid) return false
          if (orderBook.bestBid.usdValue < minBidUSD) return false
        }
        
        // Check min ask USD filter
        if (minAskUSD !== null) {
          if (!orderBook.bestAsk) return false
          if (orderBook.bestAsk.usdValue < minAskUSD) return false
        }
        
        return true
      })
      
      const filters = []
      if (maxSpread !== null) filters.push(`spread ≤ ${maxSpread}¢`)
      if (minBidUSD !== null) filters.push(`bid ≥ $${minBidUSD}`)
      if (minAskUSD !== null) filters.push(`ask ≥ $${minAskUSD}`)
      console.log(`Order book filter: ${beforeCount} → ${filtered.length} markets (${filters.join(', ')})`)
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
  }, [allMarkets, sortField, sortOrder, tableSortField, tableSortOrder, dateRange, showClosed, selectedCategory, minVolume, maxVolume, minLiquidity, maxLiquidity, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice, maxHoursUntil, maxSpread, minBidUSD, minAskUSD, viewMode, filterKey, debouncedSearchQuery])

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field)
    setSortOrder(order)
  }

  // Get current filters as ShareableFilters
  const getCurrentFilters = useCallback((): ShareableFilters => ({
    category: selectedCategory || undefined,
    searchQuery: searchQuery || undefined,
    dateStart: dateRange.start || undefined,
    dateEnd: dateRange.end || undefined,
    minVolume: minVolume > 0 ? minVolume : undefined,
    maxVolume: maxVolume !== Infinity ? maxVolume : undefined,
    minLiquidity: minLiquidity > 0 ? minLiquidity : undefined,
    maxLiquidity: maxLiquidity !== Infinity ? maxLiquidity : undefined,
    minYesPrice: minYesPrice > 0 ? minYesPrice : undefined,
    maxYesPrice: maxYesPrice < 100 ? maxYesPrice : undefined,
    minNoPrice: minNoPrice > 0 ? minNoPrice : undefined,
    maxNoPrice: maxNoPrice < 100 ? maxNoPrice : undefined,
    maxHoursUntil: maxHoursUntil !== null ? maxHoursUntil : undefined,
    maxSpread: maxSpread !== null ? maxSpread : undefined,
    minBidUSD: minBidUSD !== null ? minBidUSD : undefined,
    minAskUSD: minAskUSD !== null ? minAskUSD : undefined,
    showClosed: showClosed || undefined,
    sortField: sortField || undefined,
    sortOrder: sortOrder || undefined,
    viewMode: viewMode || undefined,
  }), [selectedCategory, searchQuery, dateRange, minVolume, maxVolume, minLiquidity, maxLiquidity, minYesPrice, maxYesPrice, minNoPrice, maxNoPrice, maxHoursUntil, maxSpread, minBidUSD, minAskUSD, showClosed, sortField, sortOrder, viewMode])

  // Sync filters to URL (use replaceState to avoid navigation loops)
  useEffect(() => {
    // Skip on initial mount - let URL read effect handle initialization
    if (!initializedFromURL.current) {
      return
    }
    
    const filters = getCurrentFilters()
    const urlParams = encodeFiltersToURL(filters)
    const currentParams = new URLSearchParams(window.location.search).toString()
    
    // Only update if URL actually changed
    if (currentParams !== urlParams) {
      const newUrl = urlParams ? `${window.location.pathname}?${urlParams}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [getCurrentFilters])

  const handleShare = () => {
    setShowShareModal(true)
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
      {/* Top Header Section - PolyFilter Title and Stats */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Left: PolyFilter Title */}
          <div>
            <h1 className="text-4xl font-bold text-white">PolyFilter</h1>
            <p className="text-sm font-medium text-gray-400 mt-1 italic">We filter the prediction noise</p>
          </div>
          
          {/* Right: Stats */}
          <StatsBar 
            totalVolume={totalVolume}
            totalLiquidity={totalLiquidity}
            activeMarkets={activeMarkets}
          />
        </div>
      </div>
      
      <div className="container mx-auto px-6 pb-6">
        <div className="mt-6">
          {/* Markets Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-gray-400">
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
            maxHoursUntil={maxHoursUntil}
            onMaxHoursUntilChange={setMaxHoursUntil}
            maxSpread={maxSpread}
            onMaxSpreadChange={setMaxSpread}
            minBidUSD={minBidUSD}
            onMinBidUSDChange={setMinBidUSD}
            minAskUSD={minAskUSD}
            onMinAskUSDChange={setMinAskUSD}
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
              setMaxHoursUntil(filters.maxHoursUntil)
              setMaxSpread(filters.maxSpread)
              setMinBidUSD(filters.minBidUSD)
              setMinAskUSD(filters.minAskUSD)
              // Force re-filter by updating filterKey (triggers useMemo recalculation)
              setFilterKey(prev => prev + 1)
              console.log('Filters applied - filtering cached data:', filters)
            }}
            onShare={handleShare}
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

      {/* Share Filters Modal */}
      <ShareFiltersModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        filters={getCurrentFilters()}
        resultCount={filteredAndSortedMarkets.length}
      />
    </main>
  )
}

