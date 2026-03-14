'use client'

import { usePrivy } from '@privy-io/react-auth'

const PRIVY_CONFIGURED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

export default function AuthGate({ children }: { children: React.ReactNode }) {
  if (!PRIVY_CONFIGURED) {
    return <>{children}</>
  }

  return <AuthGateInner>{children}</AuthGateInner>
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-polymarket-blue" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-4xl font-bold text-white mb-2">PolyFilter</h1>
          <p className="text-gray-400 mb-8">
            We filter the prediction noise
          </p>
          <button
            onClick={login}
            className="px-8 py-3 bg-polymarket-blue hover:bg-blue-600 rounded-lg text-white font-medium transition-colors text-lg"
          >
            Sign In
          </button>
          <p className="text-gray-500 text-sm mt-4">
            Connect your wallet, email, or social account
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
