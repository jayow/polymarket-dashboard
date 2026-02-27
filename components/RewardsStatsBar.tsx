import { formatCurrency } from '@/lib/utils'

interface RewardsStatsBarProps {
  totalDailyRewards: number
  totalNativeDaily: number
  totalRewardMarkets: number
  totalHoldingMarkets: number
  totalSponsoredMarkets: number
  totalSponsoredDaily: number
}

export default function RewardsStatsBar({
  totalDailyRewards,
  totalNativeDaily,
  totalRewardMarkets,
  totalHoldingMarkets,
  totalSponsoredMarkets,
  totalSponsoredDaily,
}: RewardsStatsBarProps) {
  return (
    <div className="flex items-center gap-12 text-white flex-wrap">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Daily Rewards</span>
        <span className="text-2xl font-semibold leading-tight">{formatCurrency(totalDailyRewards)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-green-500/80 uppercase tracking-wider mb-1">Native</span>
        <span className="text-2xl font-semibold leading-tight text-green-400">{formatCurrency(totalNativeDaily)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-amber-500/80 uppercase tracking-wider mb-1">Sponsored</span>
        <span className="text-2xl font-semibold leading-tight text-amber-400">
          {formatCurrency(totalSponsoredDaily)}
          <span className="text-sm text-gray-500 ml-1">({totalSponsoredMarkets})</span>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reward Markets</span>
        <span className="text-2xl font-semibold leading-tight">{totalRewardMarkets.toLocaleString()}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Holding Rewards</span>
        <span className="text-2xl font-semibold leading-tight">{totalHoldingMarkets.toLocaleString()}</span>
      </div>
    </div>
  )
}
