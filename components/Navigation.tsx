'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'

const navLinks = [
  { href: '/', label: 'Markets' },
  { href: '/rewards', label: 'Rewards' },
]

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const PRIVY_CONFIGURED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-polymarket-gray border-b border-gray-700">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white tracking-tight">
              PolyFilter
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-polymarket-blue text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
          {PRIVY_CONFIGURED && <UserMenu />}
        </div>
      </div>
    </nav>
  )
}

function UserMenu() {
  const { user, logout } = usePrivy()

  const displayName = (() => {
    if (user?.wallet?.address) return formatAddress(user.wallet.address)
    if (user?.email?.address) return user.email.address
    if (user?.google?.email) return user.google.email
    return 'Connected'
  })()

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 font-mono">
        {displayName}
      </span>
      <button
        onClick={logout}
        className="px-3 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      >
        Logout
      </button>
    </div>
  )
}
