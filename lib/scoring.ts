// Shared scoring logic — used by both the API and the React component

export interface ScoringMarket {
  totalDailyRate: number
  yesPrice: number
  noPrice: number
  maxSpread: number
  minSize: number
  volume: number
  liquidity: number
  competitive: number
  endDate: string
}

export interface OrderbookData {
  yesBestBid: number | null
  yesBestAsk: number | null
  yesMid: number | null
  noBestBid: number | null
  noBestAsk: number | null
  noMid: number | null
}

export interface GradeArrays {
  efficiency: number[]
  rate: number[]
  edge: number[]
  competitive: number[]
  volume: number[]
  capital: number[]
  runway: number[]
}

const LIQ_FLOOR = 500

export function getRewardEfficiency(m: ScoringMarket): number {
  return (m.totalDailyRate / Math.max(m.liquidity, LIQ_FLOOR)) * 100
}

export function getSuggestedBids(m: ScoringMarket) {
  const yesCents = Math.round(m.yesPrice * 100)
  const noCents = Math.round(m.noPrice * 100)
  const yesBid = Math.max(1, Math.ceil(yesCents - m.maxSpread))
  const noBid = Math.max(1, Math.ceil(noCents - m.maxSpread))
  const capital = m.minSize * (yesBid + noBid) / 100
  const edge = 100 - yesBid - noBid
  return { yesBid, noBid, capital, edge }
}

export function getRunway(m: ScoringMarket): number {
  if (!m.endDate) return 90
  const ms = new Date(m.endDate).getTime() - Date.now()
  return Math.min(90, Math.max(0, ms / (1000 * 60 * 60 * 24)))
}

export function percentileRank(val: number, sorted: number[]): number {
  if (sorted.length === 0) return 0.5
  let low = 0, high = sorted.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (sorted[mid] <= val) low = mid + 1
    else high = mid
  }
  return low / sorted.length
}

export function buildGradeArrays(markets: ScoringMarket[]): GradeArrays {
  return {
    efficiency: markets.map(m => getRewardEfficiency(m)).sort((a, b) => a - b),
    rate: markets.map(m => m.totalDailyRate).sort((a, b) => a - b),
    edge: markets.map(m => getSuggestedBids(m).edge).sort((a, b) => a - b),
    competitive: markets.map(m => m.competitive).sort((a, b) => a - b),
    volume: markets.map(m => m.volume).sort((a, b) => a - b),
    capital: markets.map(m => getSuggestedBids(m).capital).sort((a, b) => a - b),
    runway: markets.map(m => getRunway(m)).sort((a, b) => a - b),
  }
}

export function computeScore(m: ScoringMarket, g: GradeArrays): number {
  const bids = getSuggestedBids(m)

  // RETURN (50 pts)
  const effScore = percentileRank(getRewardEfficiency(m), g.efficiency) * 17
  const rateScore = percentileRank(m.totalDailyRate, g.rate) * 25
  const edgeScore = percentileRank(bids.edge, g.edge) * 8

  // RISK (50 pts, inverted — lower risk = better)
  const volScore = (1 - percentileRank(m.volume, g.volume)) * 18
  const compScore = (1 - percentileRank(m.competitive, g.competitive)) * 15
  const capScore = (1 - percentileRank(bids.capital, g.capital)) * 10
  const runwayScore = percentileRank(getRunway(m), g.runway) * 7

  const rawScore = effScore + rateScore + edgeScore +
    volScore + compScore + capScore + runwayScore

  // Balance multiplier (floor 0.65) — extreme prices can't completely kill score
  const imbalance = Math.abs(m.yesPrice - 0.5)
  const balanceMultiplier = Math.max(0.65, 1 - imbalance)

  // High-competition penalty — BUT skip for 0-vol markets (high comp + 0 vol = untapped opportunity)
  const compMultiplier = (m.competitive > 0.90 && m.volume > 0)
    ? 1 - (m.competitive - 0.90) * 2.5  // 1.0 at 0.90, 0.75 at 1.0
    : 1.0

  // Zero/low volume bonus — untapped markets are the best opportunities
  const volMultiplier = m.volume === 0 ? 1.40
    : m.volume < 5000 ? 1.15
    : m.volume < 20000 ? 1.05
    : 1.0

  // Rate threshold — $10+/day is the sweet spot, below isn't worth the risk/time
  const rateMultiplier = m.totalDailyRate >= 10 ? 1.0
    : m.totalDailyRate >= 5 ? 0.75
    : 0.55

  return Math.round(rawScore * balanceMultiplier * compMultiplier * volMultiplier * rateMultiplier)
}

// Apply live orderbook adjustments: overround penalty + tight spread = already competitive
export function applyOverround(staticScore: number, ob: OrderbookData | undefined, volume?: number): number {
  if (!ob) return staticScore
  let score = staticScore

  // Overround penalty
  if (ob.yesBestAsk && ob.noBestAsk) {
    const askSum = Math.round(ob.yesBestAsk * 100) + Math.round(ob.noBestAsk * 100)
    if (askSum > 105) score = Math.round(score * (105 / askSum))
  }

  // Tight spread = already competitive (spread ≤1¢ means someone is actively making this market)
  // Skip penalty for 0-vol markets — tight spread + 0 vol is still a good opportunity
  if (ob.yesBestBid && ob.yesBestAsk && (volume ?? 0) > 0) {
    const yesSpread = Math.round(ob.yesBestAsk * 100) - Math.round(ob.yesBestBid * 100)
    if (yesSpread <= 1) score = Math.round(score * 0.85)
  }

  return score
}

export function scoreToGrade(score: number): string {
  if (score >= 85) return 'S'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

export const gradeColors: Record<string, string> = {
  S: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  A: 'bg-green-500/20 text-green-400 border-green-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/20 text-red-500 border-red-500/30',
}
