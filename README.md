# Polymarket Dashboard

A modern dashboard for viewing and analyzing Polymarket prediction markets.

## Features

- 📊 View active prediction markets
- 💰 Track market volume and liquidity
- 📈 Real-time market prices and odds
- 🎨 Modern, responsive UI
- ⚡ Fast data fetching with caching

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

This dashboard integrates with Polymarket's public APIs:

- **GraphQL Subgraphs**: For market data, positions, and activity
- **REST API**: For market information and trading data

The API service includes fallback mock data for development purposes.

## Project Structure

```
polymarket-dashboard/
├── app/                 # Next.js app directory
│   ├── page.tsx        # Main dashboard page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── Header.tsx      # Navigation header
│   ├── MarketCard.tsx  # Market display card
│   └── StatsBar.tsx    # Statistics bar
├── lib/                # Utilities and API
│   ├── polymarket-api.ts  # API client
│   └── utils.ts        # Helper functions
└── package.json        # Dependencies
```

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **GraphQL** - API queries
- **Recharts** - Data visualization (ready for future use)

## Development

The dashboard currently uses mock data as a fallback. To connect to the real Polymarket API:

1. Check the Polymarket API documentation for the latest endpoints
2. Update the API endpoints in `lib/polymarket-api.ts`
3. Add any required authentication headers

## License

MIT

