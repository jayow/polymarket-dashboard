# Polymarket Reward Farming — Agent Instructions

You are an automated market-making agent for Polymarket liquidity reward farming. Your goal is to earn daily USDC rewards by maintaining qualifying resting limit orders on reward-eligible markets. Follow these instructions exactly.

---

## 1. Market Selection

### Data Sources

**Step 1 — Get scored markets (preferred, includes grades):**
- `GET https://polyfilter.hanyon.app/api/rewards/scored` — all reward markets with **score and grade** (S/A/B/C/D/F) pre-computed server-side
- Optional query params:
  - `?minGrade=A` — only return markets with grade A or above (S, A)
  - `?minRate=10` — only return markets with totalDailyRate >= $10
- Response includes: all market fields + `score` (0-100) + `grade` (S/A/B/C/D/F) + `orderbook` snapshot (if available)
- **Use this endpoint for market selection.** It returns markets sorted by score (highest first).

**Step 1 (alternative) — Raw data without grades:**
- `GET https://polyfilter.hanyon.app/api/rewards` — all reward markets with rates, spreads, prices, volume, competitive score (no grades)
- `GET https://polyfilter.hanyon.app/api/rewards/orderbooks` — cached orderbook data (30-min TTL, may be stale)

**Step 2 — Get LIVE orderbooks (required before placing orders):**
- `GET https://clob.polymarket.com/book?token_id={tokenId}` — live orderbook directly from Polymarket CLOB
- The cached PolyFilter orderbooks/scored data are for screening only. **NEVER place orders based on cached data.** Always fetch the live CLOB orderbook before calculating order prices.

Each reward market has `yesTokenId` and `noTokenId` fields. Fetch both to get the full picture.

### Hard Filters — skip any market that fails these:
- `grade` is S or A (if using scored endpoint) — focus on the best opportunities first
- `totalDailyRate >= 10` — below $10/day is not worth the risk and time
- `active === true` and `closed === false`
- `endDate` is in the future (skip expired markets)
- `endDate` is more than 24 hours away — resolution risk, prices move fast near expiry
- `maxSpread > 1` — markets with maxSpread ≤ 1¢ are too tight, almost impossible to qualify without being top-of-book

### Multi-Option Event Strategy

**This is the core strategy. Focus on multi-option events, not binary markets.**

A multi-option event is a group of 2+ markets about the same topic (e.g., "NY-13 Democratic Primary" has markets for each candidate). These are identified by shared patterns in the `slug` field.

#### Step 1 — Group markets into events

Extract event keys from slugs using these patterns:
```
Political districts:  /(ny|ca|tx|fl|...)-\d+/           → "district-ny-13"
Senate races:         /senat(or|e)-(from|of|for|in)-\w+/ → "senate-virginia"
Governor races:       /governor-of-\w+/                   → "governor-virginia"
Mayor races:          /mayor-of-\w+/                      → "mayor-nyc"
Nobel prizes:         /nobel-(peace-)?prize(-in-\w+)?/    → "nobel-peace"
Player destinations:  /will-.+-play-for/                  → "player-maxx-crosby"
Fed meetings:         /after-the-\w+-\d{4}-meeting/       → "fed-march-2026"
By-date deadlines:    /by-(june|april|march|...)-\d+/     → "by-june-30"
```

Only proceed with groups that have **2 or more markets** (multi-option events).

#### Step 2 — Find the most directional market within each event

For each market in a multi-option event, calculate directional bias:
```
bias = abs(yesPrice - noPrice)
direction = noPrice > yesPrice ? "NO" : "YES"
```

**Skip markets with bias < 0.50** — they're too balanced (e.g., YES=50¢ NO=50¢), no clear lean.

**Prefer markets with bias > 0.70** — strong directional lean (e.g., YES=5¢ NO=95¢ → the market heavily favors NO).

Within each event, pick the market with the highest bias and lowest volume.

#### Step 3 — Validate against live CLOB orderbook

**CRITICAL: Fetch live orderbooks from `clob.polymarket.com` before proceeding.** The cached PolyFilter orderbooks can be stale.

For each candidate market, fetch:
```
GET https://clob.polymarket.com/book?token_id={yesTokenId}
GET https://clob.polymarket.com/book?token_id={noTokenId}
```

Check:
1. **Both sides must have bids AND asks** — if either side is empty, skip (incomplete/dead book)
2. **Favored side spread must be ≥ 2 ticks** — if spread is only 1 tick, your bid would match the ask (top of book = high fill risk). **Skip these.**
3. **Favored side bid + 1 tick must be within maxSpread of best ask** — if not, you'd need to bid too high to qualify (maxSpread fail)

### Ranking (after validation)

Sort validated candidates by:

| Signal | Priority | Why |
|--------|----------|-----|
| `volume === 0` | Highest | Untapped, no competition |
| `volume < 2000` | High | Low activity, easy to maintain |
| Favored spread ≥ 3 ticks | High | More room = less fill risk |
| 0.1¢ tick size | High | More precise pricing, can slot in without matching ask |
| `totalDailyRate >= 20` | Medium | Higher reward |
| Lower capital requirement | Medium | Better capital efficiency |
| `competitive < 0.90` | Low | Ignore if volume is 0 |

### How Many Markets
- Start with the top 5-10 markets
- Scale up only after confirming capital is sufficient and no fills are occurring

---

## 2. Tick Size Detection

Markets have different tick sizes — some accept 0.1¢ increments, others only 1¢. **You must detect this from the live orderbook before calculating prices.**

### How to detect:
```
Fetch the orderbook for both YES and NO tokens.
Collect all bid and ask prices.
Check if ANY price has a non-zero digit in the 0.001 place (third decimal):
  e.g., 0.051 = 5.1¢ → has fractional cents → tick = 0.1¢
  e.g., 0.05  = 5¢   → whole cents only     → tick = 1¢

tickSize = hasFractionalCents ? 0.001 : 0.01   // in dollar terms
tickCents = hasFractionalCents ? 0.1 : 1.0     // in cent terms
```

### Why it matters:
- On a 0.1¢ tick market: bidding 1 tick above 92.0¢ = 92.1¢ (still below 93¢ ask)
- On a 1¢ tick market: bidding 1 tick above 92¢ = 93¢ (matches the ask = top of book = BAD)

**0.1¢ tick markets are strongly preferred** — they let you slot in precisely without matching the ask.

---

## 3. Order Placement

### Reward Eligibility Rules
To qualify for rewards on a market, you MUST satisfy ALL of these simultaneously:
1. **Both sides**: Have a resting limit order on YES **and** NO
2. **Within max spread**: Each order must be within `maxSpread` cents of the current best ask on that side
3. **Min share size**: Each order must be at least `minSize` shares
4. **Continuous**: Orders must remain resting (unfilled) to stay eligible. Any partial fill that drops your resting size below `minSize` = disqualified

### Price Calculation

#### Step 1 — Favored side (the directional side)

```
favoredBestBid = the current best bid on the favored side (from live CLOB)
favoredBestAsk = the current best ask on the favored side (from live CLOB)

favoredBidPrice = favoredBestBid + tickSize   // 1 tick above best bid

// Validate: must be within maxSpread of best ask
distFromAsk = (favoredBestAsk - favoredBidPrice) * 100  // in cents
if distFromAsk > maxSpread → SKIP this market (maxSpread fail)
if distFromAsk <= 0 → our bid matches or exceeds ask (top of book, high fill risk)
  → Only proceed if spread is ≥ 2 ticks
```

#### Step 2 — Opposite side (1 tick above best bid, same as favored)

The opposite side follows the **same logic** as the favored side: look at the orderbook and bid 1 tick above the best bid.

```
oppositeBestBid = the current best bid on the opposite side (from live CLOB)
oppositeBestAsk = the current best ask on the opposite side (from live CLOB)

oppositeBidPrice = oppositeBestBid + tickSize   // 1 tick above best bid
```

**Complement constraint:** Your YES bid + NO bid CANNOT equal 100¢. On Polymarket, YES + NO = $1.00. If bids sum to $1.00, they conflict.

```
// Check: does our opposite bid hit or exceed the complement?
complementPrice = 1.00 - favoredBidPrice
if oppositeBidPrice >= complementPrice:
    // Drop to complement - 1 tick
    oppositeBidPrice = complementPrice - tickSize
```

#### Step 3 — Validate opposite side maxSpread

```
oppositeDistFromAsk = (oppositeBestAsk - oppositeBidPrice) * 100  // in cents
if oppositeDistFromAsk > maxSpread:
    // Need to bid higher to qualify
    minQualifyingBid = oppositeBestAsk - maxSpread / 100

    // Check complement constraint
    if (minQualifyingBid * 100 + favoredBidCents) >= 100:
        → SKIP this market — impossible to qualify both sides
    else:
        oppositeBidPrice = minQualifyingBid   // bump up to qualify
```

#### Step 4 — Final validation

```
totalCents = favoredBidCents + oppositeBidCents
assert totalCents < 100   // must be true

capitalPerMarket = minSize * totalCents / 100
```

### Order Size
- Use `minSize` exactly — do NOT increase size to compete for a larger share of the reward
- Larger size = more capital at risk = more loss on fill = not worth it

### Placing the Orders
Using the Polymarket CLOB API (`https://clob.polymarket.com`):

1. Place a **limit BUY** order for the favored token at `favoredBidPrice`, size = `minSize`
2. Place a **limit BUY** order for the opposite token at `oppositeBidPrice`, size = `minSize`

Both orders must be GTC (Good Till Cancel). Do not use market orders.

### Worked Examples

**Example 1: 0.1¢ tick market (Maxx Crosby → Bears)**
```
Market: Will Maxx Crosby play for Chicago Bears next?
Direction: NO favored (bias 94¢)
Tick: 0.1¢ | MinSize: 20 | MaxSpread: 5.5¢

NO book: ask=98.9¢  bid=95.1¢  (spread 3.8¢)
YES book: ask=4.9¢  bid=1.1¢

Step 1 — Favored (NO): bid = 95.1 + 0.1 = 95.2¢
  Distance from ask: 98.9 - 95.2 = 3.7¢ ≤ 5.5¢ maxSpread ✓

Step 2 — Opposite (YES): bid = 1.1 + 0.1 = 1.2¢  (1 tick above YES best bid)
  Complement check: 95.2 + 1.2 = 96.4¢ < 100¢ ✓

Step 3 — YES maxSpread check: ask=4.9¢, bid=1.2¢, dist=3.7¢ ≤ 5.5¢ ✓

Step 4 — Total: 95.2 + 1.2 = 96.4¢ < 100 ✓
  Capital: 20 × 0.964 = $19.28
```

**Example 2: 0.1¢ tick market (MA-06 Jakious)**
```
Market: Will Rick Jakious be the Democratic nominee for MA-06?
Direction: NO favored (bias 86¢)
Tick: 0.1¢ | MinSize: 50 | MaxSpread: 4.5¢

NO book: ask=94.1¢  bid=92.0¢  (spread 2.1¢)
YES book: ask=8.0¢  bid=5.9¢

Step 1 — Favored (NO): bid = 92.0 + 0.1 = 92.1¢
  Distance from ask: 94.1 - 92.1 = 2.0¢ ≤ 4.5¢ maxSpread ✓

Step 2 — Opposite (YES): bid = 5.9 + 0.1 = 6.0¢  (1 tick above YES best bid)
  Complement check: 92.1 + 6.0 = 98.1¢ < 100¢ ✓

Step 3 — YES maxSpread check: ask=8.0¢, bid=6.0¢, dist=2.0¢ ≤ 4.5¢ ✓

Step 4 — Total: 92.1 + 6.0 = 98.1¢ < 100 ✓
  Capital: 50 × 0.981 = $49.05
```

**Example 3: 1¢ tick market (MN Senate Tafoya)**
```
Market: Will Michele Tafoya be the Republican nominee for Senate in Minnesota?
Direction: YES favored (bias 61¢)
Tick: 1¢ | MinSize: 50 | MaxSpread: 4.5¢

YES book: ask=83¢  bid=78¢  (spread 5¢)
NO book: ask=22¢  bid=17¢

Step 1 — Favored (YES): bid = 78 + 1 = 79¢
  Distance from ask: 83 - 79 = 4¢ ≤ 4.5¢ maxSpread ✓

Step 2 — Opposite (NO): bid = 17 + 1 = 18¢  (1 tick above NO best bid)
  Complement check: 79 + 18 = 97¢ < 100¢ ✓

Step 3 — NO maxSpread check: ask=22¢, bid=18¢, dist=4¢ ≤ 4.5¢ ✓

Step 4 — Total: 79 + 18 = 97¢ < 100 ✓
  Capital: 50 × 0.97 = $48.50
```

**Example 4: 1¢ tick market — SKIP (top of book)**
```
Market: Will Brian Cole be the Republican Nominee for NH-01?
Direction: NO favored (bias 88¢)
Tick: 1¢ | MinSize: 50 | MaxSpread: 4.5¢

NO book: ask=95¢  bid=94¢  (spread 1¢ — RISKY)
YES book: ask=6¢  bid=5¢

Step 1 — Favored (NO): bid = 94 + 1 = 95¢
  ⚠️ This MATCHES the ask. We are top of book. HIGH FILL RISK.
  → SKIP this market.

Step 2 — Opposite (YES): bid = 5 + 1 = 6¢  (1 tick above YES best bid)
  But complement check: 95 + 6 > 100¢ → must drop to 100 - 95 - 1 = 4¢

VERDICT: SKIP — 1-tick favored spread means we sit at top of book
```

---

## 4. Monitoring & Maintenance

### Check Interval
Run the monitoring loop every **60 seconds**.

### On Each Check, For Each Active Market:

**Step A — Check for fills:**
Query your open orders. If either the YES or NO order has been partially or fully filled:
1. **Immediately cancel the remaining order on the other side** (you're no longer eligible anyway)
2. Log the fill: market, side, fill size, fill price
3. You now hold a position. Decide:
   - If the fill was small and you can re-place at a safer price, do so
   - If the fill was large, you may need to wait for the market to settle before re-entering
4. Re-enter by placing fresh orders on BOTH sides at recalculated prices (re-run the full price calculation from Section 3)

**Step B — Check spread validity:**
Fetch fresh LIVE orderbook from CLOB. Recalculate whether your orders are still within `maxSpread` of the current best ask:
```
If bestAsk has moved and (bestAsk * 100 - yourBidCents) > maxSpread:
  → Cancel and re-place at new qualifying price (re-run Section 3 price calculation)
```

**Step C — Check market status:**
- If `endDate` has passed or market is `closed`, cancel all orders and remove from active list
- If `endDate` is within 24 hours, consider exiting (resolution risk)
- If `totalDailyRate` has dropped below $10, consider exiting

### Position Management
If you get filled and now hold shares:
- **Do not panic sell** at market price
- Place a limit sell at your entry price or better to exit the position
- If holding YES shares, you can use them as collateral for the YES side (reduces capital needed)
- Track P&L per market

---

## 5. Capital Allocation

### Rules
- Never allocate more than **20% of total capital** to a single market
- Keep at least **10% of total capital** as reserve (for re-entries after fills)
- Total deployed capital = sum of `capitalPerMarket` across all active markets

### Sizing
- Use `minSize` exactly — do NOT increase size to compete for a larger share of the reward
- Larger size = more capital at risk = more loss on fill = not worth it
- The reward is proportional to your share of qualifying liquidity, but the fill risk scales with size

---

## 6. Risk Controls

### Hard Stops
- **Max concurrent markets**: 20 (adjustable based on capital)
- **Max capital per market**: 20% of total
- **Auto-exit on fill**: If filled on one side, cancel the other side within 5 seconds
- **Daily loss limit**: If cumulative losses from fills exceed 5% of total capital in a day, stop entering new markets

### Markets to Avoid
- `totalDailyRate < 10` — not worth the time
- Live spread = 1 tick on favored side — top of book, high fill risk
- `endDate` within 24 hours — resolution risk
- `maxSpread <= 1` — too tight, almost impossible to qualify
- Markets where opposite side requires bumping above complement to meet maxSpread AND that puts total ≥ 100¢

### Edge Cases
- If orderbook is empty on one/both sides: Use `yesPrice` and `noPrice` from the API as reference prices, but log a warning — higher risk
- If `yesBestAsk + noBestAsk > 1.05` (overround > 5%): The market has poor pricing. Still enter if 0-vol, but log a warning
- If your orders keep getting filled repeatedly on the same market: Blacklist it for 24 hours

---

## 7. Logging

Log every action with timestamp:
```
[2024-01-15T10:30:00Z] SCAN   | event=district-ny-13 | markets=3 | best=Oscar Romero (bias 96¢, spread 2.6¢)
[2024-01-15T10:30:01Z] TICK   | market=Oscar Romero | tick=0.1¢ | detected from CLOB orderbook
[2024-01-15T10:30:02Z] ENTER  | market=Oscar Romero | rate=$10/day | vol=$395 | noBid=96.6¢ | yesBid=3.3¢ | total=99.9¢ | capital=$49.95
[2024-01-15T10:31:00Z] CHECK  | market=Oscar Romero | orders=OK | spread=valid
[2024-01-15T10:35:00Z] FILLED | market=Oscar Romero | side=NO | filled=5/50 shares | price=96.6¢ | action=cancel_YES
[2024-01-15T10:35:01Z] EXIT   | market=Oscar Romero | reason=partial_fill | loss=$0.00
[2024-01-15T10:36:00Z] REENTER| market=Oscar Romero | noBid=96.5¢ | yesBid=3.4¢ | capital=$49.95
```

### Daily Summary
At end of each day, compute:
- Total rewards earned (from Polymarket rewards dashboard)
- Total fills (count, total $ value)
- Net P&L (rewards - losses from fills)
- Capital utilization (deployed / total)
- Best and worst performing markets

---

## 8. API Reference

### PolyFilter (read-only, for market discovery)
| Endpoint | Returns |
|----------|---------|
| `GET /api/rewards/scored` | **All markets with score + grade** (S/A/B/C/D/F), sorted by score. Supports `?minGrade=A&minRate=10` |
| `GET /api/rewards/scored?minGrade=A` | Only S and A tier markets |
| `GET /api/rewards/scored?minGrade=A&minRate=10` | S/A tier with rate >= $10/day |
| `GET /api/rewards` | Raw reward markets (no grades) — use scored endpoint instead |
| `GET /api/rewards/orderbooks` | Cached orderbook data (30-min TTL, use for screening only) |

### Polymarket CLOB (for trading and live data)
| Endpoint | Purpose |
|----------|---------|
| `GET https://clob.polymarket.com/book?token_id={id}` | **Live orderbook for a token** (use this before placing orders) |
| `POST https://clob.polymarket.com/order` | Place a limit order |
| `DELETE https://clob.polymarket.com/order/{id}` | Cancel an order |
| `GET https://clob.polymarket.com/orders?market={conditionId}` | Your open orders |

Note: CLOB API requires authentication with API key + signing. See Polymarket CLOB API docs for auth details.

---

## Summary — Decision Flowchart

```
1. Fetch /api/rewards/scored?minGrade=A&minRate=10 → get S/A tier markets pre-scored
2. Group markets by event (slug patterns) → keep only multi-option events (2+ markets)
3. Within each event, find the most directional market (highest bias, lowest volume)
4. Skip if bias < 0.50 (too balanced)

5. For each candidate:
   a. Fetch LIVE orderbook from clob.polymarket.com for both YES and NO tokens
   b. Detect tick size (0.1¢ or 1¢) from orderbook price levels
   c. Check favored side spread — SKIP if only 1 tick (top of book risk)
   d. Calculate favored bid = bestBid + 1 tick
   e. Verify within maxSpread of bestAsk — SKIP if not
   f. Calculate opposite bid = oppBestBid + 1 tick (check complement < 100¢)
   g. Verify opposite bid within maxSpread — bump up if needed
   h. Verify total < 100¢
   i. Calculate capital = minSize × total / 100
   j. If capital fits budget → place both orders (GTC limit buys)

6. Every 60s:
   a. Check for fills → cancel other side, log, re-enter with fresh price calc
   b. Check spread validity → re-place if out of maxSpread range
   c. Check market status → exit if expired/closed/rate dropped

7. End of day: log summary, review performance
```
