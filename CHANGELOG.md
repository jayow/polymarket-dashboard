# Changelog

All notable changes to the Polymarket Dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Sparkline price charts** in table view showing historical YES price trends
  - New `/api/price-history` API route to proxy CLOB price history endpoint
  - New `Sparkline` component with SVG rendering and gradient fills
  - In-memory cache for price history data (10-minute TTL)
  - Color-coded charts: green for price increase, red for decrease
  - Hover tooltip showing current price and change percentage
  - Graceful handling for markets without price history
- **Order book data** (Bid/Ask/Spread) in table view
  - New `/api/orderbook` API route to proxy CLOB order book endpoint
  - New `OrderBookCell` component showing:
    - Best bid price with USD liquidity in green
    - Best ask price with USD liquidity in red
    - Spread in cents and percentage
  - Color-coded spread: green (<2¢), yellow (2-5¢), red (>5¢)
  - 30-second client-side cache for order book data
  - Shared cache exported for filtering
- **Order book filters** in filter panel
  - Max Spread filter: ≤1¢, ≤2¢, ≤5¢, ≤10¢, ≤20¢
  - Min Bid Liquidity filter: ≥$100, ≥$500, ≥$1K, ≥$5K, ≥$10K
  - Min Ask Liquidity filter: ≥$100, ≥$500, ≥$1K, ≥$5K, ≥$10K
  - Filters work on cached order book data (load markets first by scrolling)

### Changed
- Refactored API fetching to use events as primary data structure (events contain markets)
- Changed `fetchEvents()` to support fetching ALL events by passing `null`, `Infinity`, or `0` as limit
- Updated `fetchMarkets()` to fetch all markets by default (passes `null` to fetch all events)
- Improved pagination logic to continue fetching until API returns empty array
- Added progress logging every 10 pages during fetch
- Enhanced error messages with debug information
- Parse `clobTokenIds` from JSON string format when transforming market data

### Fixed
- Fixed type error: changed `category` return type from `null` to `undefined` to match interface
- Fixed event limit check to properly handle `null` values when fetching all events
- Fixed dev server crash issues (500 errors on static files)

## [1.0.0] - 2025-12-15

### Added
- Initial Polymarket Dashboard implementation
- Market fetching from Polymarket Gamma API via Next.js API proxy route
- Client-side caching using localStorage (2-minute cache duration)
- Market display in both grid (card) and table views
- Comprehensive filtering system:
  - Category filter (extracted from event tags)
  - Volume range filter (min/max)
  - Liquidity range filter (min/max)
  - YES price percentage filter (min/max)
  - NO price percentage filter (min/max)
  - Date range filter (start/end dates)
  - Show/hide closed markets toggle
- Search functionality - search markets by question, description, category, slug
- Sorting capabilities:
  - Sort by resolution date, days until resolution, volume, liquidity, price
  - Ascending/descending order
  - Table-specific sorting for all columns
- Statistics bar showing:
  - Total volume across all markets
  - Total liquidity
  - Active markets count
- Market details display:
  - Market question/title with link to Polymarket
  - Category tags
  - YES/NO prices as percentages
  - Volume (total and 24h)
  - Liquidity
  - Resolution date with granular time display (days, hours, minutes, seconds)
  - Price change indicators (24h change)
- Granular time until resolution:
  - Shows days, hours, minutes, seconds for markets resolving soon
  - Color-coded urgency (red for <1hr, orange for <1day, etc.)
- Event grouping - markets from same event link to same Polymarket event page
- Parallel API fetching - fetches multiple pages simultaneously for faster loading
- Error handling with user-friendly error messages
- Loading states and progress indicators
- Responsive design for mobile and desktop

### Changed
- Default view changed from grid to table view
- Table button positioned before grid button in view toggle
- Reduced initial market fetch from 10,000 to 500 markets for faster loading
- Optimized page fetching (reduced from 5 to 3 concurrent requests)
- Improved category extraction from event tags (primary source)

### Fixed
- CORS issues by implementing Next.js API route proxy
- Category display - properly extracts categories from event tags
- Event URL linking - uses event slug instead of market slug for grouped markets
- Build errors - fixed TypeScript type mismatches (totalSupply, openInterest, volume24h)
- Syntax errors in MarketFilters component (missing closing div tag)
- Removed non-functional traders/trades columns (data not available in API)
- Dev server conflicts - resolved multiple instance issues
- API loading timeouts - added 30-second timeout per request
- Error handling - improved error messages and retry functionality

### Technical Details
- **Framework**: Next.js 14.2.33 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Polymarket Gamma API (`gamma-api.polymarket.com/events`)
- **Caching**: 
  - Server-side: Next.js revalidate (2 minutes)
  - Client-side: localStorage (2 minutes)
- **Fetch Strategy**: 
  - Parallel batch fetching (3 concurrent requests)
  - Page size: 100 events per page
  - Max pages: 10 (configurable)
  - Request timeout: 30 seconds

### Known Issues
- Wallet extension conflicts (Phantom, Backpack) - browser extension issue, not app-related
- Some markets may not appear if they're beyond the fetch limit (currently 500 markets)

---

## Version History

- **v1.0.0** (2025-12-15): Initial release with full market dashboard functionality

---

## How to Use This Changelog

### For Developers
- Document all changes in this file before committing
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Group changes by type: Added, Changed, Fixed, Removed, Security

### Version Bumping
- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, backwards compatible

### Change Types
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

