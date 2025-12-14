export default function Header() {
  return (
    <header className="bg-polymarket-gray border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-polymarket-blue rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Polymarket Dashboard</h1>
              <p className="text-sm text-gray-400">Prediction Markets</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Markets
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Analytics
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              About
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}

