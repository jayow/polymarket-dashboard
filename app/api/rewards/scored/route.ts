import { NextResponse } from 'next/server'
import {
  buildGradeArrays,
  computeScore,
  applyOverround,
  scoreToGrade,
  type ScoringMarket,
  type OrderbookData,
} from '@/lib/scoring'

export const dynamic = 'force-dynamic'

// Reuse the globalThis caches from /api/rewards and /api/rewards/orderbooks
const globalForCache = globalThis as unknown as {
  rewardsCache?: {
    data: {
      rewardMarkets: (ScoringMarket & {
        conditionId: string
        question: string
        slug: string
        yesTokenId: string
        noTokenId: string
        active: boolean
        closed: boolean
        dailyRate: number
        sponsorRate: number
        sponsorsCount: number
        holdingRewardsEnabled: boolean
        image: string
        tags: string[]
      })[]
      [key: string]: unknown
    }
    timestamp: number
  }
  orderbookCache?: {
    data: Record<string, OrderbookData>
    timestamp: number
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minGrade = searchParams.get('minGrade')?.toUpperCase() || null
    const minRate = parseFloat(searchParams.get('minRate') || '0')

    // Get rewards data from shared cache or fetch
    let rewardsData = globalForCache.rewardsCache?.data
    if (!rewardsData) {
      // Trigger a fetch by calling our own rewards endpoint internally
      const baseUrl = request.url.split('/api/')[0]
      const res = await fetch(`${baseUrl}/api/rewards`)
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch rewards data' },
          { status: 502 }
        )
      }
      rewardsData = await res.json()
    }

    const markets = rewardsData?.rewardMarkets || []
    if (markets.length === 0) {
      return NextResponse.json({ markets: [], count: 0, timestamp: Date.now() })
    }

    // Get orderbook data from shared cache (may be null if not yet fetched)
    const orderbooks = globalForCache.orderbookCache?.data || {}

    // Build grade arrays from all markets (needed for percentile ranking)
    const gradeArrays = buildGradeArrays(markets)

    // Grade threshold lookup
    const gradeThresholds: Record<string, number> = {
      S: 85, A: 70, B: 55, C: 40, D: 25, F: 0,
    }
    const minScoreThreshold = minGrade && gradeThresholds[minGrade] !== undefined
      ? gradeThresholds[minGrade]
      : 0

    // Score each market
    const scoredMarkets = markets
      .filter((m: ScoringMarket) => m.totalDailyRate >= minRate)
      .map((m: ScoringMarket & { conditionId: string; question: string; slug: string; volume: number; yesTokenId: string; noTokenId: string; active: boolean; closed: boolean; dailyRate: number; sponsorRate: number; sponsorsCount: number; holdingRewardsEnabled: boolean; image: string; tags: string[] }) => {
        const ob = orderbooks[m.conditionId]
        const staticScore = computeScore(m, gradeArrays)
        const score = applyOverround(staticScore, ob, m.volume)
        const grade = scoreToGrade(score)

        return {
          conditionId: m.conditionId,
          question: m.question,
          slug: m.slug,
          active: m.active,
          closed: m.closed,
          endDate: m.endDate,
          totalDailyRate: m.totalDailyRate,
          dailyRate: m.dailyRate,
          sponsorRate: m.sponsorRate,
          minSize: m.minSize,
          maxSpread: m.maxSpread,
          yesPrice: m.yesPrice,
          noPrice: m.noPrice,
          yesTokenId: m.yesTokenId,
          noTokenId: m.noTokenId,
          volume: m.volume,
          liquidity: m.liquidity,
          competitive: m.competitive,
          tags: m.tags,
          // Scoring fields
          score,
          grade,
          // Orderbook snapshot (if available)
          orderbook: ob || null,
        }
      })
      .filter((m: { score: number }) => m.score >= minScoreThreshold)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    return NextResponse.json({
      markets: scoredMarkets,
      count: scoredMarkets.length,
      totalMarkets: markets.length,
      hasOrderbooks: Object.keys(orderbooks).length > 0,
      timestamp: Date.now(),
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[scored] Error:', error)
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 500 }
    )
  }
}
