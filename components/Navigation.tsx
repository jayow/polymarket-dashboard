'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Markets' },
  { href: '/rewards', label: 'Rewards' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-polymarket-gray border-b border-gray-700">
      <div className="container mx-auto px-6">
        <div className="flex items-center h-14 gap-8">
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
      </div>
    </nav>
  )
}
