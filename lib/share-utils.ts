import { FilterValues } from '@/components/MarketFilters'

export interface ShareableFilters {
  category?: string
  searchQuery?: string
  dateStart?: string
  dateEnd?: string
  minVolume?: number
  maxVolume?: number
  minLiquidity?: number
  maxLiquidity?: number
  minYesPrice?: number
  maxYesPrice?: number
  minNoPrice?: number
  maxNoPrice?: number
  maxHoursUntil?: number | null
  maxSpread?: number | null
  minBidUSD?: number | null
  minAskUSD?: number | null
  showClosed?: boolean
  sortField?: string
  sortOrder?: string
  viewMode?: 'grid' | 'table'
}

/**
 * Encode filters to URL search params
 */
export function encodeFiltersToURL(filters: ShareableFilters): string {
  const params = new URLSearchParams()

  if (filters.category) params.set('cat', filters.category)
  if (filters.searchQuery) params.set('q', filters.searchQuery)
  if (filters.dateStart) params.set('start', filters.dateStart)
  if (filters.dateEnd) params.set('end', filters.dateEnd)
  if (filters.minVolume !== undefined && filters.minVolume > 0) params.set('minVol', String(filters.minVolume))
  if (filters.maxVolume !== undefined && filters.maxVolume !== Infinity) params.set('maxVol', String(filters.maxVolume))
  if (filters.minLiquidity !== undefined && filters.minLiquidity > 0) params.set('minLiq', String(filters.minLiquidity))
  if (filters.maxLiquidity !== undefined && filters.maxLiquidity !== Infinity) params.set('maxLiq', String(filters.maxLiquidity))
  if (filters.minYesPrice !== undefined && filters.minYesPrice > 0) params.set('minYes', String(filters.minYesPrice))
  if (filters.maxYesPrice !== undefined && filters.maxYesPrice < 100) params.set('maxYes', String(filters.maxYesPrice))
  if (filters.minNoPrice !== undefined && filters.minNoPrice > 0) params.set('minNo', String(filters.minNoPrice))
  if (filters.maxNoPrice !== undefined && filters.maxNoPrice < 100) params.set('maxNo', String(filters.maxNoPrice))
  if (filters.maxHoursUntil !== undefined && filters.maxHoursUntil !== null) params.set('maxHours', String(filters.maxHoursUntil))
  if (filters.maxSpread !== undefined && filters.maxSpread !== null) params.set('maxSpread', String(filters.maxSpread))
  if (filters.minBidUSD !== undefined && filters.minBidUSD !== null) params.set('minBid', String(filters.minBidUSD))
  if (filters.minAskUSD !== undefined && filters.minAskUSD !== null) params.set('minAsk', String(filters.minAskUSD))
  if (filters.showClosed) params.set('closed', 'true')
  if (filters.sortField) params.set('sort', filters.sortField)
  if (filters.sortOrder) params.set('order', filters.sortOrder)
  if (filters.viewMode) params.set('view', filters.viewMode)

  return params.toString()
}

/**
 * Decode URL search params to filters
 */
export function decodeFiltersFromURL(searchParams: URLSearchParams): Partial<ShareableFilters> {
  const filters: Partial<ShareableFilters> = {}

  const cat = searchParams.get('cat')
  if (cat) filters.category = cat

  const q = searchParams.get('q')
  if (q) filters.searchQuery = q

  const start = searchParams.get('start')
  if (start) filters.dateStart = start

  const end = searchParams.get('end')
  if (end) filters.dateEnd = end

  const minVol = searchParams.get('minVol')
  if (minVol) filters.minVolume = parseFloat(minVol)

  const maxVol = searchParams.get('maxVol')
  if (maxVol) filters.maxVolume = parseFloat(maxVol)

  const minLiq = searchParams.get('minLiq')
  if (minLiq) filters.minLiquidity = parseFloat(minLiq)

  const maxLiq = searchParams.get('maxLiq')
  if (maxLiq) filters.maxLiquidity = parseFloat(maxLiq)

  const minYes = searchParams.get('minYes')
  if (minYes) filters.minYesPrice = parseFloat(minYes)

  const maxYes = searchParams.get('maxYes')
  if (maxYes) filters.maxYesPrice = parseFloat(maxYes)

  const minNo = searchParams.get('minNo')
  if (minNo) filters.minNoPrice = parseFloat(minNo)

  const maxNo = searchParams.get('maxNo')
  if (maxNo) filters.maxNoPrice = parseFloat(maxNo)

  const maxHours = searchParams.get('maxHours')
  if (maxHours) filters.maxHoursUntil = parseFloat(maxHours)

  const maxSpread = searchParams.get('maxSpread')
  if (maxSpread) filters.maxSpread = parseFloat(maxSpread)

  const minBid = searchParams.get('minBid')
  if (minBid) filters.minBidUSD = parseFloat(minBid)

  const minAsk = searchParams.get('minAsk')
  if (minAsk) filters.minAskUSD = parseFloat(minAsk)

  if (searchParams.get('closed') === 'true') filters.showClosed = true

  const sort = searchParams.get('sort')
  if (sort) filters.sortField = sort

  const order = searchParams.get('order')
  if (order) filters.sortOrder = order

  const view = searchParams.get('view')
  if (view === 'grid' || view === 'table') filters.viewMode = view

  return filters
}

/**
 * Get shareable URL with current filters
 */
export function getShareableURL(filters: ShareableFilters): string {
  const params = encodeFiltersToURL(filters)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return params ? `${baseUrl}?${params}` : baseUrl
}

/**
 * Format filter values for display in share modal
 */
export function formatFilterDisplay(filters: ShareableFilters): Array<{ label: string; value: string }> {
  const active: Array<{ label: string; value: string }> = []

  if (filters.category) {
    active.push({ label: 'Category', value: filters.category })
  }
  if (filters.searchQuery) {
    active.push({ label: 'Search', value: filters.searchQuery })
  }
  if (filters.dateStart || filters.dateEnd) {
    const dateRange = [filters.dateStart, filters.dateEnd].filter(Boolean).join(' - ')
    active.push({ label: 'Date Range', value: dateRange })
  }
  if (filters.minVolume !== undefined && filters.minVolume > 0) {
    active.push({ label: 'Min Volume', value: `$${filters.minVolume.toLocaleString()}` })
  }
  if (filters.maxVolume !== undefined && filters.maxVolume !== Infinity) {
    active.push({ label: 'Max Volume', value: `$${filters.maxVolume.toLocaleString()}` })
  }
  if (filters.minLiquidity !== undefined && filters.minLiquidity > 0) {
    active.push({ label: 'Min Liquidity', value: `$${filters.minLiquidity.toLocaleString()}` })
  }
  if (filters.maxLiquidity !== undefined && filters.maxLiquidity !== Infinity) {
    active.push({ label: 'Max Liquidity', value: `$${filters.maxLiquidity.toLocaleString()}` })
  }
  if (filters.minYesPrice !== undefined && filters.minYesPrice > 0) {
    active.push({ label: 'Min YES Price', value: `${filters.minYesPrice}%` })
  }
  if (filters.maxYesPrice !== undefined && filters.maxYesPrice < 100) {
    active.push({ label: 'Max YES Price', value: `${filters.maxYesPrice}%` })
  }
  if (filters.minNoPrice !== undefined && filters.minNoPrice > 0) {
    active.push({ label: 'Min NO Price', value: `${filters.minNoPrice}%` })
  }
  if (filters.maxNoPrice !== undefined && filters.maxNoPrice < 100) {
    active.push({ label: 'Max NO Price', value: `${filters.maxNoPrice}%` })
  }
  if (filters.maxHoursUntil !== undefined && filters.maxHoursUntil !== null) {
    active.push({ label: 'Max Hours Until', value: `< ${filters.maxHoursUntil}h` })
  }
  if (filters.maxSpread !== undefined && filters.maxSpread !== null) {
    active.push({ label: 'Max Spread', value: `${filters.maxSpread}%` })
  }
  if (filters.minBidUSD !== undefined && filters.minBidUSD !== null) {
    active.push({ label: 'Min Bid', value: `$${filters.minBidUSD.toFixed(2)}` })
  }
  if (filters.minAskUSD !== undefined && filters.minAskUSD !== null) {
    active.push({ label: 'Min Ask', value: `$${filters.minAskUSD.toFixed(2)}` })
  }
  if (filters.showClosed) {
    active.push({ label: 'Show Closed', value: 'Yes' })
  }

  return active
}

