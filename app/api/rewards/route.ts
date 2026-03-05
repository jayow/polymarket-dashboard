import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

const CLOB_SAMPLING_ENDPOINT = 'https://clob.polymarket.com/sampling-markets'
const CLOB_REWARDS_ENDPOINT = 'https://clob.polymarket.com/rewards/markets/current'
const GAMMA_MARKETS_ENDPOINT = 'https://gamma-api.polymarket.com/markets'

const CACHE_DURATION = 120

interface ClobRewardMarket {
  condition_id: string
  question: string
  market_slug: string
  icon: string
  image: string
  active: boolean
  closed: boolean
  end_date_iso: string
  neg_risk: boolean
  rewards: {
    rates: { asset_address: string; rewards_daily_rate: number }[]
    min_size: number
    max_spread: number
  }
  tokens: { token_id: string; outcome: string; price: number; winner: boolean }[]
  tags: string[]
}

interface ClobRewardsCurrent {
  condition_id: string
  native_daily_rate: number
  sponsored_daily_rate?: number
  total_daily_rate: number
  sponsors_count?: number
  rewards_max_spread: number
  rewards_min_size: number
}

interface GammaMarket {
  conditionId: string
  question: string
  slug: string
  image: string
  volume: string
  liquidity: string
  competitive: number
  holdingRewardsEnabled: boolean
  closed: boolean
  acceptingOrders: boolean
  rewardsMinSize: number
  rewardsMaxSpread: number
  clobRewards: {
    id: string
    conditionId: string
    assetAddress: string
    rewardsAmount: number
    rewardsDailyRate: number
    startDate: string
    endDate: string
  }[]
}

// Use globalThis to persist cache across hot reloads in dev mode
const MEMORY_CACHE_TTL = CACHE_DURATION * 1000 // ms
const globalForCache = globalThis as unknown as {
  rewardsCache?: { data: any; timestamp: number }
}

async function fetchAllSamplingMarkets(): Promise<ClobRewardMarket[]> {
  const allMarkets: ClobRewardMarket[] = []
  let cursor: string | undefined

  while (true) {
    const url = cursor
      ? `${CLOB_SAMPLING_ENDPOINT}?limit=1000&next_cursor=${cursor}`
      : `${CLOB_SAMPLING_ENDPOINT}?limit=1000`

    const res = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
    }, 30000)

    if (!res.ok) break

    const data = await res.json()
    if (data.data) allMarkets.push(...data.data)

    if (!data.next_cursor || data.next_cursor === 'LTE=') break
    cursor = data.next_cursor
  }

  return allMarkets
}

// Fetch all rewards/markets/current data (has sponsored_daily_rate, total_daily_rate)
async function fetchAllRewardsCurrent(): Promise<ClobRewardsCurrent[]> {
  const allMarkets: ClobRewardsCurrent[] = []
  let cursor: string | undefined

  while (true) {
    const url = cursor
      ? `${CLOB_REWARDS_ENDPOINT}?limit=500&next_cursor=${cursor}`
      : `${CLOB_REWARDS_ENDPOINT}?limit=500`

    const res = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
    }, 30000)

    if (!res.ok) break

    const data = await res.json()
    if (data.data) allMarkets.push(...data.data)

    if (!data.next_cursor || data.next_cursor === 'LTE=') break
    cursor = data.next_cursor
  }

  return allMarkets
}

// Fetch all Gamma markets with batched parallel pagination (500/page, ~31k+ markets)
async function fetchGammaMarkets(): Promise<GammaMarket[]> {
  const PAGE_SIZE = 500
  const BATCH_SIZE = 10 // 10 pages per batch = 5000 markets/batch
  const allMarkets: GammaMarket[] = []

  for (let batch = 0; ; batch += BATCH_SIZE) {
    const pagePromises = Array.from({ length: BATCH_SIZE }, (_, i) => {
      const pageIndex = batch + i
      const url = `${GAMMA_MARKETS_ENDPOINT}?active=true&closed=false&limit=${PAGE_SIZE}&offset=${pageIndex * PAGE_SIZE}`
      return fetchWithTimeout(url, { headers: { 'Content-Type': 'application/json' } }, 30000)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (Array.isArray(data) ? data : null))
        .catch(() => null)
    })

    const pages = await Promise.all(pagePromises)
    let reachedEnd = false
    for (const page of pages) {
      if (page === null) continue
      allMarkets.push(...page)
      if (page.length < PAGE_SIZE) {
        reachedEnd = true
      }
    }
    if (reachedEnd) break
  }

  return allMarkets
}

// Check if specific condition IDs are closed on Gamma (targeted lookups for markets missing from open set)
async function checkClosedOnGamma(conditionIds: string[]): Promise<Set<string>> {
  const closedIds = new Set<string>()
  if (conditionIds.length === 0) return closedIds

  const queue = [...conditionIds]
  const CONCURRENCY = 30

  const worker = async () => {
    while (queue.length > 0) {
      const cid = queue.shift()!
      try {
        const res = await fetchWithTimeout(
          `${GAMMA_MARKETS_ENDPOINT}?conditionId=${cid}&limit=1`,
          { headers: { 'Content-Type': 'application/json' } },
          10000
        )
        if (!res.ok) continue
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          if (data[0].closed === true || data[0].acceptingOrders === false) {
            closedIds.add(cid)
          }
        }
      } catch {
        // Skip on error — better to show than wrongly hide
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return closedIds
}

export async function GET() {
  try {
    // Return cached response if still fresh (and has gamma data)
    if (globalForCache.rewardsCache
      && Date.now() - globalForCache.rewardsCache.timestamp < MEMORY_CACHE_TTL
      && globalForCache.rewardsCache.data?.stats?.gammaMarketsFetched > 0) {
      return NextResponse.json(globalForCache.rewardsCache.data, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    // Fetch CLOB sampling + CLOB rewards/current + Gamma in parallel
    const [clobMarkets, rewardsCurrent, gammaMarkets] = await Promise.all([
      fetchAllSamplingMarkets(),
      fetchAllRewardsCurrent(),
      fetchGammaMarkets(),
    ])

    // Build lookups
    const gammaLookup = new Map<string, GammaMarket>()
    for (const gm of gammaMarkets) {
      if (gm.conditionId) gammaLookup.set(gm.conditionId, gm)
    }

    // Find CLOB markets not in Gamma's open set — these may be closed/resolved
    const missingFromGamma = clobMarkets
      .map((cm) => cm.condition_id)
      .filter((cid) => !gammaLookup.has(cid))
    const closedConditionIds = await checkClosedOnGamma(missingFromGamma)

    console.log(`[rewards] CLOB: ${clobMarkets.length}, Gamma: ${gammaMarkets.length}, Gamma lookup: ${gammaLookup.size}, Missing: ${missingFromGamma.length}, Closed: ${closedConditionIds.size}`)

    const rewardsCurrentLookup = new Map<string, ClobRewardsCurrent>()
    for (const rc of rewardsCurrent) {
      if (rc.condition_id) rewardsCurrentLookup.set(rc.condition_id, rc)
    }

    // Filter out markets past their end date or already resolved
    const now = new Date().toISOString()
    const activeClobMarkets = clobMarkets.filter((cm) => {
      if (cm.end_date_iso && cm.end_date_iso <= now) return false
      // Filter resolved markets: price at 0 or 1 means outcome is decided
      const yesToken = cm.tokens?.find((t: { outcome: string; price: number }) => t.outcome === 'Yes')
      const noToken = cm.tokens?.find((t: { outcome: string; price: number }) => t.outcome === 'No')
      const yesPrice = yesToken?.price ?? 0.5
      const noPrice = noToken?.price ?? 0.5
      if (yesPrice <= 0.01 || yesPrice >= 0.99 || noPrice <= 0.01 || noPrice >= 0.99) return false
      // Filter if any token is marked as winner (resolved)
      if (cm.tokens?.some((t: { winner: boolean }) => t.winner)) return false
      // Filter if Gamma says market is closed (CLOB sampling can lag behind)
      if (closedConditionIds.has(cm.condition_id)) return false
      return true
    })

    // Merge CLOB reward data with rewards/current (sponsored) and Gamma metadata
    const rewardMarkets = activeClobMarkets.map((cm) => {
      const gamma = gammaLookup.get(cm.condition_id)
      const rc = rewardsCurrentLookup.get(cm.condition_id)

      // Native rate: use CLOB sampling (authoritative source of truth)
      // rewards/current can be stale and return outdated rates
      const dailyRate = cm.rewards?.rates?.reduce(
        (sum: number, r: { rewards_daily_rate?: number }) => sum + (r.rewards_daily_rate ?? 0), 0
      ) ?? 0

      // Sponsored rate: only available from rewards/current
      const sponsorRate = rc?.sponsored_daily_rate ?? 0
      const totalDailyRate = dailyRate + sponsorRate
      const sponsorsCount = rc?.sponsors_count ?? 0

      return {
        conditionId: cm.condition_id,
        question: cm.question,
        slug: cm.market_slug,
        image: cm.image || cm.icon,
        active: cm.active && !(gamma?.closed),
        closed: cm.closed || gamma?.closed || false,
        endDate: cm.end_date_iso,
        dailyRate,
        sponsorRate,
        totalDailyRate,
        sponsorsCount,
        minSize: cm.rewards?.min_size ?? 0,
        maxSpread: cm.rewards?.max_spread ?? 0,
        yesPrice: cm.tokens?.find((t) => t.outcome === 'Yes')?.price ?? 0,
        noPrice: cm.tokens?.find((t) => t.outcome === 'No')?.price ?? 0,
        yesTokenId: cm.tokens?.find((t) => t.outcome === 'Yes')?.token_id ?? '',
        noTokenId: cm.tokens?.find((t) => t.outcome === 'No')?.token_id ?? '',
        tags: cm.tags || [],
        volume: gamma?.volume ? parseFloat(gamma.volume) : 0,
        liquidity: gamma?.liquidity ? parseFloat(gamma.liquidity) : 0,
        competitive: gamma?.competitive ?? 0,
        holdingRewardsEnabled: gamma?.holdingRewardsEnabled ?? false,
      }
    })

    // Holding reward markets from Gamma
    const holdingMarkets = gammaMarkets.filter((gm) => gm.holdingRewardsEnabled).map((gm) => ({
      conditionId: gm.conditionId,
      question: gm.question,
      slug: gm.slug,
      image: gm.image,
      volume: gm.volume ? parseFloat(gm.volume) : 0,
      liquidity: gm.liquidity ? parseFloat(gm.liquidity) : 0,
      holdingRewardsEnabled: true,
      annualRate: 4.0,
    }))

    // Sponsored markets (have actual sponsor add-on above base rate)
    const sponsoredMarkets = rewardMarkets.filter((m) => m.sponsorRate > 0)

    // Stats
    const totalDailyRewards = rewardMarkets.reduce((sum, m) => sum + m.totalDailyRate, 0)
    const totalNativeDaily = rewardMarkets.reduce((sum, m) => sum + m.dailyRate, 0)
    const totalSponsoredDaily = rewardMarkets.reduce((sum, m) => sum + m.sponsorRate, 0)
    const gammaMatchCount = rewardMarkets.filter((m) => m.volume > 0 || m.liquidity > 0).length

    console.log(`[rewards] Gamma matches with data: ${gammaMatchCount}/${rewardMarkets.length}`)

    const responseData = {
      rewardMarkets,
      holdingMarkets,
      sponsoredMarkets,
      stats: {
        totalRewardMarkets: rewardMarkets.length,
        totalDailyRewards,
        totalNativeDaily,
        totalHoldingMarkets: holdingMarkets.length,
        totalSponsoredMarkets: sponsoredMarkets.length,
        totalSponsoredDaily,
        gammaMarketsFetched: gammaMarkets.length,
        gammaMatchCount,
        rewardsCurrentFetched: rewardsCurrent.length,
      },
      fetchedAt: Date.now(),
    }

    // Cache in memory (persists across hot reloads via globalThis)
    globalForCache.rewardsCache = { data: responseData, timestamp: Date.now() }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 500 }
    )
  }
}
