import { formatCurrency } from '@/lib/utils'

interface StatsBarProps {
  totalVolume: number
  totalLiquidity: number
  activeMarkets: number
}

export default function StatsBar({ totalVolume, totalLiquidity, activeMarkets }: StatsBarProps) {
  return (
    <div className="flex items-center gap-12 text-white">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Volume</span>
        <span className="text-2xl font-semibold leading-tight">{formatCurrency(totalVolume)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Liquidity</span>
        <span className="text-2xl font-semibold leading-tight">{formatCurrency(totalLiquidity)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Markets</span>
        <span className="text-2xl font-semibold leading-tight">{activeMarkets.toLocaleString()}</span>
      </div>
    </div>
  )
}
