import { GraphQLClient } from 'graphql-request';

// Polymarket API Endpoints
const API_ENDPOINTS = {
  // Gamma API for market data
  GAMMA_API: 'https://gamma-api.polymarket.com',
  // Clob API for trading data
  CLOB_API: 'https://clob.polymarket.com',
  // Data API (community maintained)
  DATA_API: 'https://data-api.polymarket.com',
};

// Gamma API uses /events endpoint, each event contains markets
const GAMMA_EVENTS_ENDPOINT = `${API_ENDPOINTS.GAMMA_API}/events`;

export interface Market {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  startDate: string;
  resolutionSource?: string;
  image?: string;
  volume: string;
  volumeNum: number;
  liquidity: string;
  liquidityNum: number;
  outcomePrices: string[];
  outcomes: string[];
  active: boolean;
  closed: boolean;
  finalized: boolean;
  marketMakerAddress: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields
  description?: string;
  category?: string;
  tags?: string[];
  marketType?: string;
  fee?: number;
  totalSupply?: number;
  totalSupplyNum?: number;
  openInterest?: number;
  openInterestNum?: number;
  lastPrice?: number;
  lastPriceYes?: number;
  lastPriceNo?: number;
  priceChange24h?: number;
  volume24h?: number;
  volume24hNum?: number;
  numTraders?: number;
  numTrades?: number;
  endDateISO?: string;
  daysUntilResolution?: number;
  hoursUntilResolution?: number;
  minutesUntilResolution?: number;
  secondsUntilResolution?: number;
  eventSlug?: string; // Event slug for grouping multiple markets
  // Condition ID for fetching holders
  conditionId?: string;
  // CLOB token IDs for YES/NO outcomes
  clobTokenIds?: string[];
}

// Holder data types
export interface Holder {
  proxyWallet: string;
  bio?: string;
  asset?: string;
  pseudonym?: string;
  amount: number;
  displayUsernamePublic?: boolean;
  outcomeIndex: number;
  name?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  // PNL fields (if available from API)
  cashPnl?: number;
  percentPnl?: number;
  pnl?: number;
}

export interface TokenHolders {
  token: string;
  holders: Holder[];
}

export interface HoldersResponse {
  yesHolders: Holder[];
  noHolders: Holder[];
  yesCount: number;
  noCount: number;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  endDate: string;
  startDate?: string;
  resolutionSource?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  volume: number;
  volume24hr: number;
  liquidity: number;
  category?: string;
  tags?: Array<{ id: string; label: string; slug: string }>;
  markets: Market[]; // All markets belonging to this event
  createdAt: string;
  updatedAt: string;
}

export interface MarketsResponse {
  markets: Market[];
}

export interface EventsResponse {
  events: Event[];
}

// Cache key for localStorage
const CACHE_KEY = 'polymarket_events_cache'
const CACHE_TIMESTAMP_KEY = 'polymarket_events_cache_timestamp'
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds
const STALE_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes - allow stale cache

// Request deduplication - prevent multiple concurrent requests
let activeFetchPromise: Promise<Event[]> | null = null

// Fetch events from Polymarket Gamma API (events contain markets)
// Uses Next.js API route as proxy to avoid CORS issues
// Includes client-side caching for faster subsequent loads
// Returns events with all their markets - this is the natural structure
// If eventLimit is Infinity or 0, fetches ALL available events
export async function fetchEvents(eventLimit: number | null = 1000, useCache: boolean = true): Promise<Event[]> {
  const fetchAll = eventLimit === null || eventLimit === Infinity || eventLimit === 0;
  
  // Request deduplication - if there's an active fetch, return that promise
  if (activeFetchPromise && useCache) {
    console.log('Deduplicating request - using active fetch promise')
    return activeFetchPromise
  }

  // Check cache first (client-side only) - stale-while-revalidate pattern
  if (typeof window !== 'undefined' && useCache) {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10)
        const now = Date.now()
        const age = now - timestamp
        
        // Fresh cache - return immediately
        if (age < CACHE_DURATION) {
          console.log('Using fresh cached events data')
          const events = JSON.parse(cachedData) as Event[]
          if (fetchAll) {
            return events
          }
          return events.slice(0, eventLimit || 1000)
        }
        
        // Stale cache - return it but refresh in background (stale-while-revalidate)
        if (age < STALE_CACHE_DURATION) {
          console.log('Using stale cached events data, refreshing in background')
          const events = JSON.parse(cachedData) as Event[]
          
          // Trigger background refresh (don't await)
          fetchEventsInternal(eventLimit, false).catch(err => {
            console.warn('Background refresh failed:', err)
          })
          
          if (fetchAll) {
            return events
          }
          return events.slice(0, eventLimit || 1000)
        }
        
        console.log('Cache expired, fetching fresh data')
      }
    } catch (error) {
      console.warn('Error reading from cache:', error)
    }
  }
  
  // Fetch fresh data
  return fetchEventsInternal(eventLimit, useCache)
}

// Internal fetch function (separated for reuse)
async function fetchEventsInternal(eventLimit: number | null, useCache: boolean): Promise<Event[]> {
  const fetchAll = eventLimit === null || eventLimit === Infinity || eventLimit === 0
  
  const allEvents: Event[] = [];
  const pageSize = 100;
  const concurrentRequests = 10; // Increased from 5 to 10 for faster loading
  
  // Calculate max pages: if fetching all, use a high safety limit
  // Otherwise calculate based on eventLimit
  const maxPages = fetchAll 
    ? 10000 // Safety limit: 1M events max (should never reach this)
    : Math.ceil((eventLimit || 1000) / pageSize) + 2; // Add buffer

  // Use Next.js API route to avoid CORS issues
  const isClient = typeof window !== 'undefined';
  const baseUrl = isClient ? window.location.origin : 'http://localhost:3000';
  const API_ROUTE = `${baseUrl}/api/markets`;

  console.log(`Starting to fetch events: ${fetchAll ? 'ALL events' : `target ${eventLimit} events`} (up to ${maxPages} pages)`);
  console.log(`API Route: ${API_ROUTE}, isClient: ${isClient}, baseUrl: ${baseUrl}`);

  // Fetch pages in parallel batches until we reach limit or run out of data
  let hasMoreData = true;
  let page = 0;
  while (hasMoreData && (fetchAll || allEvents.length < (eventLimit || 1000)) && page < maxPages) {
    const batchPromises: Promise<boolean>[] = [];
    
    // Create batch of parallel requests
    for (let i = 0; i < concurrentRequests && (page + i) < maxPages; i++) {
      const offset = (page + i) * pageSize;
      const pageNumber = page + i + 1;
      const url = `${API_ROUTE}?limit=${pageSize}&offset=${offset}&closed=false`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`Request timeout for page ${pageNumber} after 30 seconds`);
        controller.abort();
      }, 30000); // 30 second timeout
      
      const promise = fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
        .finally(() => {
          clearTimeout(timeoutId);
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
          }

          const events = await response.json();
          
          if (!Array.isArray(events)) {
            throw new Error('Invalid response format: expected array');
          }

          if (events.length === 0) {
            return false; // No more events
          }

          // Transform events and keep markets grouped under them
          let eventsInThisPage = 0;
          events.forEach((event: any) => {
            // Stop if we've reached the event limit (skip check if fetching all)
            if (!fetchAll && eventLimit && allEvents.length >= eventLimit) {
              return;
            }
            
            // Extract all tags from event - support multiple categories
            const eventTags: string[] = []
            if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
              for (const tag of event.tags) {
                if (typeof tag === 'object' && tag.label) {
                  const label = tag.label.trim()
                  if (label && label.length > 0 && label !== 'NONE' && label.toLowerCase() !== 'none') {
                    eventTags.push(label)
                  }
                } else if (typeof tag === 'string' && tag.trim()) {
                  const label = tag.trim()
                  if (label && label !== 'NONE' && label.toLowerCase() !== 'none') {
                    eventTags.push(label)
                  }
                }
              }
            }
            // Primary category is the first tag (for backward compatibility)
            const eventCategory = eventTags.length > 0 ? eventTags[0] : (event.category || null)
            
            // Transform markets within this event
            const transformedMarkets: Market[] = (event.markets || []).map((market: any) => {
              return transformSingleMarket(market, event, eventTags);
            });
            
            // Create event object with all its markets
            const transformedEvent: Event = {
              id: event.id.toString(),
              title: event.title || '',
              slug: event.slug || '',
              description: event.description || '',
              image: event.image || '',
              icon: event.icon || '',
              endDate: event.endDate || event.endDateIso || '',
              startDate: event.startDate || event.startDateIso || '',
              resolutionSource: event.resolutionSource || '',
              active: event.active !== false,
              closed: event.closed || false,
              archived: event.archived || false,
              volume: parseFloat(event.volume) || 0,
              volume24hr: event.volume24hr || 0,
              liquidity: parseFloat(event.liquidity) || 0,
              category: eventCategory,
              tags: event.tags || [],
              markets: transformedMarkets,
              createdAt: event.createdAt || '',
              updatedAt: event.updatedAt || '',
            };
            
            allEvents.push(transformedEvent);
            eventsInThisPage++;
          });

          const totalMarkets = allEvents.reduce((sum, e) => sum + e.markets.length, 0);
          console.log(`Fetched page ${pageNumber}: ${events.length} raw events, ${eventsInThisPage} processed events (${totalMarkets} total markets) - Total events: ${allEvents.length}`);
          
          // If we got events but processed none, something might be wrong
          if (events.length > 0 && eventsInThisPage === 0) {
            console.warn(`Warning: Page ${pageNumber} had ${events.length} events but none were processed. This might indicate a transformation issue.`);
          }
          
          return true; // More data available
        })
        .catch((error) => {
          console.error(`Error fetching page ${pageNumber}:`, error);
          // If it's an abort error, we might have timed out - don't continue
          if (error.name === 'AbortError') {
            console.error(`Request aborted (timeout) for page ${pageNumber}`);
            return false; // Stop fetching if timeout
          }
          // Continue with other pages for other errors
          return true; // Assume more data available on error
        });

      batchPromises.push(promise);
    }

    // Wait for batch to complete before starting next batch
    const batchResults = await Promise.all(batchPromises);
    
    // Check if we got any data - if all pages returned false, we're done
    // Continue if at least one page returned true (has data)
    hasMoreData = batchResults.length > 0 && batchResults.some(result => result === true);
    
    // Move to next batch
    page += concurrentRequests;
    
    // If we got no events in this batch, we've reached the end
    if (!hasMoreData) {
      console.log('Reached end of available events');
      break;
    }
    
    // Log progress every 10 pages
    if (page % (concurrentRequests * 2) === 0) {
      const totalMarkets = allEvents.reduce((sum, e) => sum + e.markets.length, 0);
      console.log(`Progress: ${allEvents.length} events, ${totalMarkets} markets fetched so far...`);
    }
  }
  
  const totalMarkets = allEvents.reduce((sum, e) => sum + e.markets.length, 0);
  console.log(`Finished fetching: ${allEvents.length} total events with ${totalMarkets} total markets`);

  if (allEvents.length === 0) {
    const errorMsg = 'No events fetched from Polymarket API. The API may be down or returning empty results. Check browser console for detailed error messages.';
    console.error(errorMsg);
    console.error('Debug info:', {
      fetchAll,
      eventLimit,
      maxPages,
      page,
      hasMoreData
    });
    throw new Error(errorMsg);
  }
  
  // Cache the results (client-side only) - cache all events even if we limited the return
  if (typeof window !== 'undefined' && useCache) {
    try {
      // Use compression for large datasets (simple JSON compression)
      const dataToCache = JSON.stringify(allEvents);
      
      // Check if data is too large for localStorage (usually 5-10MB limit)
      // If too large, we could use IndexedDB, but for now just warn
      if (dataToCache.length > 5 * 1024 * 1024) {
        console.warn(`Cache data is large (${(dataToCache.length / 1024 / 1024).toFixed(2)}MB). Consider using IndexedDB for better performance.`);
      }
      
      localStorage.setItem(CACHE_KEY, dataToCache);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Events data cached for faster future loads');
    } catch (error: any) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Clearing old cache and retrying...');
        // Clear old cache and try again with just the new data
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          localStorage.setItem(CACHE_KEY, JSON.stringify(allEvents));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (retryError) {
          console.error('Failed to cache even after clearing:', retryError);
        }
      } else {
        console.warn('Error caching events data:', error);
      }
    }
  }

  // Clear the active fetch promise
  activeFetchPromise = null;

  // If fetching all, return everything. Otherwise limit to requested amount
  if (fetchAll) {
    return allEvents;
  }
  return allEvents.slice(0, eventLimit || 1000);
}

// Helper function to transform a single market with event context
// eventTags: pre-extracted tags array to avoid re-extraction
function transformSingleMarket(market: any, event: any, eventTags?: string[]): Market {
  // Parse endDate
  const endDate = market.endDate || market.endDateIso || market.end_date_iso || market.endDateISO || '';
  const endDateObj = endDate ? new Date(endDate) : new Date();
  const now = new Date();
  const diffMs = endDateObj.getTime() - now.getTime();
  
  // Calculate granular time until resolution
  const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const secondsUntil = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  // Parse outcomePrices
  let outcomePrices: string[] = ['0.5', '0.5'];
  if (market.outcomePrices) {
    if (typeof market.outcomePrices === 'string') {
      try {
        outcomePrices = JSON.parse(market.outcomePrices);
      } catch {
        outcomePrices = [market.outcomePrices];
      }
    } else if (Array.isArray(market.outcomePrices)) {
      outcomePrices = market.outcomePrices.map((p: any) => p.toString());
    }
  }
  
  // Parse outcomes
  let outcomes: string[] = ['YES', 'NO'];
  if (market.outcomes) {
    if (typeof market.outcomes === 'string') {
      try {
        outcomes = JSON.parse(market.outcomes);
      } catch {
        outcomes = [market.outcomes];
      }
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes.map((o: any) => o.toString());
    }
  }
  
  // Ensure we have prices for all outcomes
  while (outcomePrices.length < outcomes.length) {
    outcomePrices.push('0.5');
  }
  
  // Parse numeric values
  const volumeNum = market.volumeNum || parseFloat(market.volume) || 0;
  const liquidityNum = market.liquidityNum || parseFloat(market.liquidity) || 0;
  const volume24hNum = market.volume24hr || market.volume24h || 0;
  
  // Extract all tags from event - support multiple categories
  // Use pre-extracted tags if provided, otherwise extract them
  let eventTagsArray: string[] = eventTags || []
  if (eventTagsArray.length === 0) {
    if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
      for (const tag of event.tags) {
        if (typeof tag === 'object' && tag.label) {
          const label = tag.label.trim()
          if (label && label.length > 0 && label !== 'NONE' && label.toLowerCase() !== 'none') {
            eventTagsArray.push(label)
          }
        } else if (typeof tag === 'string' && tag.trim()) {
          const label = tag.trim()
          if (label && label !== 'NONE' && label.toLowerCase() !== 'none') {
            eventTagsArray.push(label)
          }
        }
      }
    }
  }
  
  // Primary category is the first tag (for backward compatibility)
  const eventCategory = eventTagsArray.length > 0 ? eventTagsArray[0] : (event.category || market.category || null)
  
  return {
    id: market.id?.toString() || market.conditionId?.toString() || '',
    question: market.question || event.title || '',
    slug: market.slug || market.id?.toString() || '',
    eventSlug: event.slug || market.slug || '',
    endDate: endDate,
    startDate: market.startDate || market.startDateIso || market.start_date_iso || '',
    resolutionSource: market.resolutionSource || event.resolutionSource || '',
    image: market.image || event.image || '',
    volume: volumeNum.toString(),
    volumeNum: volumeNum,
    liquidity: liquidityNum.toString(),
    liquidityNum: liquidityNum,
    outcomePrices: outcomePrices,
    outcomes: outcomes,
    active: market.active !== false,
    closed: market.closed || false,
    finalized: market.finalized || false,
    marketMakerAddress: market.marketMakerAddress || market.creator || '',
    createdAt: market.createdAt || '',
    updatedAt: market.updatedAt || '',
    description: market.description || event.description || '',
    // Primary category (first tag) for backward compatibility
    category: (() => {
      if (eventCategory && typeof eventCategory === 'string') {
        const cat = eventCategory.trim()
        if (cat && cat.length > 0 && cat !== 'NONE' && cat.toLowerCase() !== 'none') {
          return cat
        }
      }
      return undefined
    })(),
    // All tags/categories for multi-category support
    tags: eventTagsArray.length > 0 ? eventTagsArray : undefined,
    tags: event.tags || market.tags || [],
    marketType: market.marketType || 'binary',
    fee: parseFloat(market.fee) || 0,
    totalSupply: 0,
    totalSupplyNum: 0,
    openInterest: parseFloat(market.openInterest) || 0,
    openInterestNum: parseFloat(market.openInterest) || 0,
    lastPrice: parseFloat(outcomePrices[0]) || 0.5,
    lastPriceYes: parseFloat(outcomePrices[0]) || 0.5,
    lastPriceNo: parseFloat(outcomePrices[1]) || (1 - parseFloat(outcomePrices[0])) || 0.5,
    priceChange24h: market.oneDayPriceChange || 0,
    volume24h: volume24hNum,
    volume24hNum: volume24hNum,
    numTraders: 0,
    numTrades: 0,
    endDateISO: endDate,
    daysUntilResolution: daysUntil,
    hoursUntilResolution: hoursUntil,
    minutesUntilResolution: minutesUntil,
    secondsUntilResolution: secondsUntil,
    // Condition ID for fetching holders (use market.conditionId or market.id)
    conditionId: market.conditionId || market.id?.toString() || '',
    // CLOB token IDs for YES/NO outcomes (parse from JSON string if needed)
    clobTokenIds: (() => {
      if (Array.isArray(market.clobTokenIds)) {
        return market.clobTokenIds
      }
      if (typeof market.clobTokenIds === 'string') {
        try {
          return JSON.parse(market.clobTokenIds)
        } catch {
          return []
        }
      }
      return []
    })(),
  };
}

// Position interface for PNL data
export interface Position {
  proxyWallet: string;
  asset?: string;
  conditionId?: string;
  size?: number;
  avgPrice?: number;
  initialValue?: number;
  currentValue?: number;
  cashPnl?: number;
  percentPnl?: number;
  totalBought?: number;
  realizedPnl?: number;
  percentRealizedPnl?: number;
  curPrice?: number;
  redeemable?: boolean;
  mergeable?: boolean;
  title?: string;
  slug?: string;
  icon?: string;
  eventSlug?: string;
  outcome?: string;
  outcomeIndex?: number;
  oppositeOutcome?: string;
  oppositeAsset?: string;
  endDate?: string;
  negativeRisk?: boolean;
}

// Value response interface
export interface UserValue {
  totalValue?: number;
  totalPnL?: number;
  realizedPnL?: number;
  unrealizedPnL?: number;
  [key: string]: any; // Allow other fields
}

// Fetch all-time PNL for a user using Dome API
// Uses wallet address directly (from holder.proxyWallet) to get accurate all-time PNL
export async function fetchUserPnL(walletAddress: string): Promise<number | null> {
  try {
    // Use Dome API for accurate all-time PNL with granularity=all
    const response = await fetch(`/api/pnl?wallet=${walletAddress}`)
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data && data.allTimePnL !== undefined && data.allTimePnL !== null) {
      return data.allTimePnL
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching PNL for ${walletAddress}:`, error)
    return null
  }
}

// Fetch holders for a specific market
// Note: Polymarket API maximum limit is 500 holders per request
export async function fetchMarketHolders(conditionId: string, limit: number = 500): Promise<HoldersResponse> {
  try {
    const response = await fetch(`/api/holders?market=${conditionId}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holders: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Parse the response - API returns array of token holders
    const yesHolders: Holder[] = []
    const noHolders: Holder[] = []
    
    if (Array.isArray(data)) {
      for (const tokenData of data) {
        if (tokenData.holders && Array.isArray(tokenData.holders)) {
          for (const holder of tokenData.holders) {
            // outcomeIndex 0 = YES, 1 = NO
            if (holder.outcomeIndex === 0) {
              yesHolders.push(holder)
            } else if (holder.outcomeIndex === 1) {
              noHolders.push(holder)
            }
          }
        }
      }
    }
    
    // Sort by amount descending
    yesHolders.sort((a, b) => b.amount - a.amount)
    noHolders.sort((a, b) => b.amount - a.amount)
    
    return {
      yesHolders,
      noHolders,
      yesCount: yesHolders.length,
      noCount: noHolders.length,
    }
  } catch (error) {
    console.error('Error fetching market holders:', error)
    return {
      yesHolders: [],
      noHolders: [],
      yesCount: 0,
      noCount: 0,
    }
  }
}

// Legacy function: Flatten events to markets for backward compatibility with existing UI
// If limit is null/Infinity/0, fetches ALL markets from ALL events
export async function fetchMarkets(limit: number | null = 5000, useCache: boolean = true): Promise<Market[]> {
  const fetchAll = limit === null || limit === Infinity || limit === 0;
  
  // Fetch events - if fetching all markets, fetch all events
  // Otherwise estimate: ~3 markets per event
  const eventLimit = fetchAll ? null : Math.ceil((limit || 5000) / 3);
  const events = await fetchEvents(eventLimit, useCache);
  
  // Flatten events to markets for UI compatibility
  const allMarkets: Market[] = [];
  for (const event of events) {
    allMarkets.push(...event.markets);
    if (!fetchAll && allMarkets.length >= (limit || 5000)) {
      break;
    }
  }
  
  console.log(`Flattened ${events.length} events into ${allMarkets.length} markets`);
  
  if (fetchAll) {
    return allMarkets;
  }
  return allMarkets.slice(0, limit || 5000);
}

function transformMarkets(data: any[]): Market[] {
  return data.map((market: any) => {
    // Parse endDate - handle various formats from Gamma API
    const endDate = market.endDate || market.endDateIso || market.end_date_iso || market.endDateISO || '';
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const now = new Date();
    const diffMs = endDateObj.getTime() - now.getTime();
    
    // Calculate granular time until resolution
    const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsUntil = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    // Parse outcomePrices - Gamma API returns as JSON string array
    let outcomePrices: string[] = ['0.5', '0.5'];
    if (market.outcomePrices) {
      if (typeof market.outcomePrices === 'string') {
        try {
          outcomePrices = JSON.parse(market.outcomePrices);
        } catch {
          outcomePrices = [market.outcomePrices];
        }
      } else if (Array.isArray(market.outcomePrices)) {
        outcomePrices = market.outcomePrices.map((p: any) => p.toString());
      }
    }
    
    // Parse outcomes - Gamma API returns as JSON string array
    let outcomes: string[] = ['YES', 'NO'];
    if (market.outcomes) {
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch {
          outcomes = [market.outcomes];
        }
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes.map((o: any) => o.toString());
      }
    }
    
    // Ensure we have prices for all outcomes
    while (outcomePrices.length < outcomes.length) {
      outcomePrices.push('0.5');
    }
    
    // Parse numeric values
    const volumeNum = market.volumeNum || parseFloat(market.volume) || 0;
    const liquidityNum = market.liquidityNum || parseFloat(market.liquidity) || 0;
    const volume24hNum = market.volume24hr || market.volume24h || 0;
    
    return {
      id: market.id?.toString() || market.conditionId?.toString() || '',
      question: market.question || market.eventTitle || '',
      slug: market.slug || market.id?.toString() || '',
      eventSlug: market.eventSlug || market.slug || '', // Use event slug for URL
      endDate: endDate,
      startDate: market.startDate || market.startDateIso || market.start_date_iso || '',
      resolutionSource: market.resolutionSource || '',
      image: market.image || market.eventImage || '',
      volume: volumeNum.toString(),
      volumeNum: volumeNum,
      liquidity: liquidityNum.toString(),
      liquidityNum: liquidityNum,
      outcomePrices: outcomePrices,
      outcomes: outcomes,
      active: market.active !== false,
      closed: market.closed || false,
      finalized: market.finalized || false,
      marketMakerAddress: market.marketMakerAddress || market.creator || '',
      createdAt: market.createdAt || '',
      updatedAt: market.updatedAt || '',
      description: market.description || market.eventDescription || '',
      // Extract category - eventCategory is already extracted from tags in the fetch step
      category: (() => {
        // eventCategory is already set from event tags during fetch
        if (market.eventCategory && typeof market.eventCategory === 'string') {
          const cat = market.eventCategory.trim()
          if (cat && cat.length > 0 && cat !== 'NONE' && cat.toLowerCase() !== 'none') {
            return cat
          }
        }
        
        // Fallback: try to extract from eventTags if eventCategory wasn't set
        if (market.eventTags && Array.isArray(market.eventTags) && market.eventTags.length > 0) {
          const firstTag = market.eventTags[0]
          if (typeof firstTag === 'object' && firstTag.label) {
            const cat = firstTag.label.trim()
            if (cat && cat.length > 0) return cat
          } else if (typeof firstTag === 'string') {
            const cat = firstTag.trim()
            if (cat && cat.length > 0) return cat
          }
        }
        
        // Last resort: market.category
        if (market.category && typeof market.category === 'string') {
          const cat = market.category.trim()
          if (cat && cat.length > 0 && cat !== 'NONE' && cat.toLowerCase() !== 'none') {
            return cat
          }
        }
        
        return null
      })(),
      tags: market.eventTags || market.tags || [],
      marketType: market.marketType || 'binary',
      fee: parseFloat(market.fee) || 0,
      totalSupply: 0,
      totalSupplyNum: 0,
      openInterest: parseFloat(market.openInterest) || 0,
      openInterestNum: parseFloat(market.openInterest) || 0,
      lastPrice: parseFloat(outcomePrices[0]) || 0.5,
      lastPriceYes: parseFloat(outcomePrices[0]) || 0.5,
      lastPriceNo: parseFloat(outcomePrices[1]) || (1 - parseFloat(outcomePrices[0])) || 0.5,
      priceChange24h: market.oneDayPriceChange || 0,
      volume24h: volume24hNum,
      volume24hNum: volume24hNum,
      numTraders: 0,
      numTrades: 0,
      endDateISO: endDate,
      daysUntilResolution: daysUntil,
      hoursUntilResolution: hoursUntil,
      minutesUntilResolution: minutesUntil,
      secondsUntilResolution: secondsUntil,
    };
  });
}

export async function fetchMarketBySlug(slug: string): Promise<Market | null> {
  try {
    // Fetch from events endpoint and find the market
    const response = await fetch(`${GAMMA_EVENTS_ENDPOINT}?slug=${slug}&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const events = await response.json();
      if (Array.isArray(events) && events.length > 0) {
        const event = events[0];
        if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
          const market = event.markets[0];
          const marketWithEvent = {
            ...market,
            eventId: event.id,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventImage: event.image,
            eventDescription: event.description,
            eventCategory: event.category,
          };
          const transformed = transformMarkets([marketWithEvent]);
          return transformed[0] || null;
        }
      }
    }
    
    throw new Error(`Market not found: ${slug}`);
  } catch (error) {
    console.error('Error fetching market:', error);
    return null;
  }
}

// REMOVED: Mock data function - using only real API data
// This function is kept for reference but should not be used
function getMockMarkets_DEPRECATED(): Market[] {
  const now = new Date();
  const markets: Market[] = [];
  
  const categories = ['Crypto', 'Politics', 'Economics', 'Technology', 'Sports', 'Entertainment', 'Science'];
  const questions = [
    'Will Bitcoin reach $100,000 by end of 2024?',
    'Will the US have a recession in 2024?',
    'Will AI achieve AGI by 2025?',
    'Will Ethereum reach $5,000 in 2024?',
    'Will Trump win the 2024 election?',
    'Will the Fed cut rates by 50bps in Q1 2024?',
    'Will GPT-5 be released in 2024?',
    'Will the Lakers win the NBA championship?',
    'Will Taylor Swift win Album of the Year?',
    'Will SpaceX land humans on Mars by 2026?',
    'Will quantum computing achieve supremacy in 2024?',
    'Will the S&P 500 close above 5,000 in 2024?',
    'Will there be a major cyber attack on US infrastructure?',
    'Will climate change cause record temperatures?',
    'Will autonomous vehicles be legalized in 5+ states?',
    'Will the housing market crash in 2024?',
    'Will renewable energy exceed 50% of US grid?',
    'Will a major social media platform be banned?',
    'Will gene therapy cure a major disease?',
    'Will virtual reality become mainstream?',
    'Will the US default on debt?',
    'Will China invade Taiwan?',
    'Will Russia win the Ukraine war?',
    'Will there be a major earthquake in California?',
    'Will fusion energy achieve net positive?',
    'Will the US ban TikTok?',
    'Will the stock market crash in 2024?',
    'Will inflation fall below 2%?',
    'Will unemployment rise above 5%?',
    'Will the dollar lose reserve status?',
    'Will gold hit $3,000/oz?',
    'Will oil prices exceed $150/barrel?',
    'Will electric vehicles outsell gas?',
    'Will nuclear power expand significantly?',
    'Will lab-grown meat become mainstream?',
    'Will CRISPR cure cancer?',
    'Will life expectancy exceed 100?',
    'Will we discover alien life?',
    'Will time travel be proven possible?',
    'Will teleportation be invented?',
  ];

  // Generate markets with resolution dates spread across different timeframes
  for (let i = 0; i < 100; i++) {
    const questionIndex = i % questions.length;
    const daysOffset = Math.floor(Math.random() * 365) - 30; // -30 to 335 days from now
    const resolutionDate = new Date(now);
    resolutionDate.setDate(resolutionDate.getDate() + daysOffset);
    
    const yesPrice = 0.1 + Math.random() * 0.8; // 10% to 90%
    const noPrice = 1 - yesPrice;
    
    const volume = 10000 + Math.random() * 5000000;
    const liquidity = volume * (0.1 + Math.random() * 0.3);
    
    const market: Market = {
      id: `market-${i + 1}`,
      question: questions[questionIndex],
      slug: `market-${i + 1}-${questions[questionIndex].toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`,
      endDate: resolutionDate.toISOString(),
      startDate: new Date(resolutionDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      resolutionSource: 'Official Sources',
      image: `https://picsum.photos/400/200?random=${i}`,
      volume: volume.toFixed(2),
      volumeNum: volume,
      liquidity: liquidity.toFixed(2),
      liquidityNum: liquidity,
      outcomePrices: [yesPrice.toFixed(4), noPrice.toFixed(4)],
      outcomes: ['YES', 'NO'],
      active: daysOffset > 0,
      closed: daysOffset < 0,
      finalized: daysOffset < -7,
      marketMakerAddress: `0x${Math.random().toString(16).substr(2, 10)}...`,
      createdAt: new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: `Market for: ${questions[questionIndex]}`,
      category: categories[i % categories.length],
      tags: [categories[i % categories.length], 'prediction'],
      marketType: 'binary',
      fee: 0.02,
      totalSupply: volume * 2,
      totalSupplyNum: volume * 2,
      openInterest: liquidity * 0.8,
      openInterestNum: liquidity * 0.8,
      lastPrice: yesPrice,
      lastPriceYes: yesPrice,
      lastPriceNo: noPrice,
      priceChange24h: (Math.random() - 0.5) * 0.1,
      volume24h: volume * 0.05 * Math.random(),
      volume24hNum: volume * 0.05 * Math.random(),
      numTraders: Math.floor(Math.random() * 1000) + 10,
      numTrades: Math.floor(Math.random() * 5000) + 50,
      endDateISO: resolutionDate.toISOString(),
      daysUntilResolution: daysOffset,
    };
    
    markets.push(market);
  }
  
  return markets;
}

