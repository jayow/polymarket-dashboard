// Fetch top traders by PNL for a specific tag/category from Polymarket API

const GAMMA_API = 'https://gamma-api.polymarket.com/events'
const HOLDERS_API = 'https://data-api.polymarket.com/holders'
const POSITIONS_API = 'https://data-api.polymarket.com/positions'

const TARGET_TAG = 'Pre-Market'

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function main() {
  console.log(`\n=== Fetching top traders for "${TARGET_TAG}" tag ===\n`)

  // Step 1: Fetch all events and filter to Pre-Market
  console.log('Step 1: Fetching events from Polymarket...')
  let allEvents = []
  let offset = 0
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const events = await fetchJSON(`${GAMMA_API}?limit=${pageSize}&offset=${offset}&closed=false`)
    if (!Array.isArray(events) || events.length === 0) {
      hasMore = false
      break
    }
    allEvents.push(...events)
    offset += pageSize
    // Safety limit
    if (allEvents.length > 5000) break
  }

  console.log(`  Fetched ${allEvents.length} total events`)

  // Filter to events with the target tag
  const preMarketEvents = allEvents.filter(event => {
    if (!event.tags || !Array.isArray(event.tags)) return false
    return event.tags.some(tag => {
      const label = typeof tag === 'object' ? tag.label : tag
      return label && label.trim() === TARGET_TAG
    })
  })

  console.log(`  Found ${preMarketEvents.length} events with "${TARGET_TAG}" tag`)

  // Collect all markets from those events
  const markets = []
  for (const event of preMarketEvents) {
    if (event.markets && Array.isArray(event.markets)) {
      for (const m of event.markets) {
        markets.push({
          conditionId: m.conditionId || m.id?.toString(),
          question: m.question || event.title,
          volume: parseFloat(m.volume) || 0,
        })
      }
    }
  }

  console.log(`  Total markets in category: ${markets.length}`)
  if (markets.length === 0) {
    console.log('No markets found. Exiting.')
    return
  }

  // Step 2: Fetch holders for all markets
  console.log('\nStep 2: Fetching holders for all markets...')
  const conditionIds = new Set()
  const walletMap = new Map() // wallet -> { name, pseudonym, totalShares }

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i]
    if (!market.conditionId) continue
    conditionIds.add(market.conditionId)

    try {
      const holdersData = await fetchJSON(
        `${HOLDERS_API}?market=${market.conditionId}&limit=500&minBalance=1`
      )

      if (Array.isArray(holdersData)) {
        for (const tokenData of holdersData) {
          if (tokenData.holders && Array.isArray(tokenData.holders)) {
            for (const h of tokenData.holders) {
              const existing = walletMap.get(h.proxyWallet)
              if (existing) {
                existing.totalShares += h.amount || 0
                existing.marketsCount++
              } else {
                walletMap.set(h.proxyWallet, {
                  name: h.name || h.pseudonym || null,
                  pseudonym: h.pseudonym || null,
                  proxyWallet: h.proxyWallet,
                  totalShares: h.amount || 0,
                  marketsCount: 1,
                })
              }
            }
          }
        }
      }

      process.stdout.write(`  Market ${i + 1}/${markets.length}\r`)
    } catch (err) {
      // Skip failed markets
    }

    // Small delay to avoid rate limiting
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n  Found ${walletMap.size} unique traders across all markets`)

  // Step 3: Take top wallets by share amount, fetch their positions
  const sortedWallets = Array.from(walletMap.values())
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 50) // Top 50 by shares — PNL leaders likely among them

  console.log('\nStep 3: Fetching positions for top 50 traders...')

  const traderPnL = []

  for (let i = 0; i < sortedWallets.length; i++) {
    const trader = sortedWallets[i]
    try {
      const positions = await fetchJSON(`${POSITIONS_API}?user=${trader.proxyWallet}`)

      if (Array.isArray(positions)) {
        // Filter to only positions in our category's markets
        let categoryPnl = 0
        let categoryPositions = 0

        for (const pos of positions) {
          if (pos.conditionId && conditionIds.has(pos.conditionId)) {
            categoryPnl += (pos.cashPnl || 0)
            categoryPositions++
          }
        }

        traderPnL.push({
          ...trader,
          categoryPnl,
          categoryPositions,
        })
      }

      process.stdout.write(`  Trader ${i + 1}/${sortedWallets.length}\r`)
    } catch (err) {
      // Skip failed fetches
    }

    // Rate limit
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 200))
  }

  // Step 4: Rank by PNL and display top 10
  const top10 = traderPnL
    .sort((a, b) => b.categoryPnl - a.categoryPnl)
    .slice(0, 10)

  console.log(`\n\n${'='.repeat(70)}`)
  console.log(`  TOP 10 TRADERS BY PNL — "${TARGET_TAG}" Category`)
  console.log(`${'='.repeat(70)}\n`)

  console.log(
    '#'.padEnd(4) +
    'Name'.padEnd(30) +
    'PNL'.padStart(15) +
    'Positions'.padStart(12) +
    'Shares'.padStart(15)
  )
  console.log('-'.repeat(76))

  for (let i = 0; i < top10.length; i++) {
    const t = top10[i]
    const displayName = t.name || t.pseudonym || shortenAddress(t.proxyWallet)
    const pnl = t.categoryPnl >= 0 ? `+$${t.categoryPnl.toFixed(2)}` : `-$${Math.abs(t.categoryPnl).toFixed(2)}`
    console.log(
      `${(i + 1).toString().padEnd(4)}` +
      `${displayName.padEnd(30)}` +
      `${pnl.padStart(15)}` +
      `${t.categoryPositions.toString().padStart(12)}` +
      `${t.totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 }).padStart(15)}`
    )
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`\nNames only (copy-paste):\n`)
  for (const t of top10) {
    const displayName = t.name || t.pseudonym || shortenAddress(t.proxyWallet)
    console.log(displayName)
  }
  console.log()
}

function shortenAddress(address) {
  if (!address) return 'Unknown'
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

main().catch(console.error)
