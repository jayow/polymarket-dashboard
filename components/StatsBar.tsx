import { formatCurrency } from '@/lib/utils'

interface StatsBarProps {
  totalVolume: number
  totalLiquidity: number
  activeMarkets: number
}

export default function StatsBar({ totalVolume, totalLiquidity, activeMarkets }: StatsBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Total Volume Card - Blue/Purple Gradient */}
      <div className="relative group overflow-hidden rounded-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 opacity-90" />
        {/* Glow Effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl group-hover:bg-blue-400/40 transition-all duration-500" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-400/20 rounded-full blur-xl" />
        
        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200/80 text-sm font-medium mb-1">Total Volume</p>
              <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalVolume)}</p>
            </div>
            {/* Modern Icon */}
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <svg className="w-7 h-7 text-blue-200" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {/* Mini trend indicator */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-blue-100">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              All time
            </span>
          </div>
        </div>
      </div>

      {/* Total Liquidity Card - Green/Teal Gradient */}
      <div className="relative group overflow-hidden rounded-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 opacity-90" />
        {/* Glow Effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/30 rounded-full blur-2xl group-hover:bg-emerald-400/40 transition-all duration-500" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl" />
        
        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200/80 text-sm font-medium mb-1">Total Liquidity</p>
              <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalLiquidity)}</p>
            </div>
            {/* Modern Icon */}
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <svg className="w-7 h-7 text-emerald-200" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
          </div>
          {/* Mini indicator */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-emerald-100">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Active Markets Card - Pink/Red Gradient */}
      <div className="relative group overflow-hidden rounded-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 opacity-90" />
        {/* Glow Effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/30 rounded-full blur-2xl group-hover:bg-rose-400/40 transition-all duration-500" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-fuchsia-400/20 rounded-full blur-xl" />
        
        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-200/80 text-sm font-medium mb-1">Active Markets</p>
              <p className="text-3xl font-bold text-white tracking-tight">{activeMarkets.toLocaleString()}</p>
            </div>
            {/* Modern Icon */}
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <svg className="w-7 h-7 text-rose-200" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 16l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17" cy="10" r="2" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
          </div>
          {/* Mini indicator */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-rose-100">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
