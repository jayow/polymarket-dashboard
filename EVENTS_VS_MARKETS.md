# Events vs Markets: Understanding the Polymarket API Structure

## Overview

Polymarket's API uses a **hierarchical structure** where **Events** contain **Markets**. Understanding this relationship is crucial for using the API effectively.

## Key Concepts

### Events (Containers)
- **What they are**: Events are groupings or containers that organize related markets
- **Example**: "Which CEOs will be gone in 2025?" is an event
- **Purpose**: Groups related prediction markets together
- **URL**: `https://polymarket.com/event/{event-slug}`

### Markets (Individual Predictions)
- **What they are**: Markets are individual prediction questions that users can trade
- **Example**: "Tim Cook out as Apple CEO in 2025?" is a market
- **Purpose**: Each market is a specific, tradable prediction
- **Relationship**: Multiple markets belong to one event

## Relationship Structure

```
Event (1)
  ├── Market (1) - "Tim Cook out as Apple CEO in 2025?"
  ├── Market (2) - "Sundar Pichai out as Google CEO in 2025?"
  ├── Market (3) - "Dan Clancy out as Twitch CEO in 2025?"
  └── Market (4) - ... (more markets)
```

**One Event → Many Markets** (1-to-many relationship)

## Real Example

**Event**: "Which CEOs will be gone in 2025?"
- **Event ID**: 16086
- **Event Slug**: `which-ceos-will-be-out-in-2025`
- **Markets**: 6 markets
  1. Tim Cook out as Apple CEO in 2025?
  2. Sundar Pichai out as Google CEO in 2025?
  3. Dan Clancy out as Twitch CEO in 2025?
  4. ... (3 more)

## API Structure

### What We Fetch
```javascript
GET /api/markets?limit=100&offset=0&closed=false
```

**Returns**: Array of Events
```json
[
  {
    "id": 16086,
    "title": "Which CEOs will be gone in 2025?",
    "slug": "which-ceos-will-be-out-in-2025",
    "markets": [
      {
        "id": 516838,
        "question": "Tim Cook out as Apple CEO in 2025?",
        "slug": "tim-cook-out-as-apple-ceo-in-2025",
        ...
      },
      {
        "id": 516840,
        "question": "Dan Clancy out as Twitch CEO in 2025?",
        ...
      }
    ]
  }
]
```

### What We Extract
From each event, we extract all its markets and add event context:

```javascript
event.markets.forEach((market) => {
  const marketWithEvent = {
    ...market,
    eventId: event.id,
    eventTitle: event.title,
    eventSlug: event.slug,  // Used for URL linking
    eventCategory: event.tags[0].label,
    ...
  };
  allMarkets.push(marketWithEvent);
});
```

## Why 500 Markets?

### Current Limitation
- **Limit**: 500 markets (not 500 events)
- **Reason**: Performance and loading speed

### The Math
- **Average markets per event**: ~3-5 markets
- **500 markets** = ~100-170 events
- **Events per page**: 100 events
- **Pages needed**: ~1-2 pages

### Why Not More?
1. **Loading Speed**: Fetching more markets takes longer
2. **API Timeouts**: Large requests can timeout
3. **Memory**: Less data = faster rendering

**Note**: The limit can be adjusted based on your analysis needs. For probability compression analysis, you may need more markets to find trading opportunities.

### How to Increase
If you need more markets, you can:

1. **Increase limit in code**:
   ```typescript
   // In app/page.tsx
   const data = await fetchMarkets(2000, !clearCache) // Change from 500
   ```

2. **Adjust page calculation**:
   ```typescript
   // In lib/polymarket-api.ts
   const maxPages = Math.min(30, estimatedPagesNeeded + 5); // Increase from 10
   ```

## Current Fetching Process

```
1. Fetch Events (100 per page)
   ↓
2. Extract Markets from Events
   ↓
3. Stop when we reach 500 markets
   ↓
4. Transform and display
```

### Example Flow
```
Page 1: 100 events → ~300 markets
Page 2: 100 events → ~300 markets
Total: ~600 markets available, but we stop at 500
```

## Why Events Matter

### Event Context
Each market gets event context:
- **Event Slug**: Used for URL (`/event/{event-slug}`)
- **Event Title**: Parent grouping name
- **Event Category**: From event tags
- **Event Image**: Shared image for event

### URL Linking
- **Market URL**: Uses `eventSlug` not `market.slug`
- **Why**: All markets in same event link to same page
- **Example**: 
  - Event: `will-paradex-launch-a-token-by`
  - Markets: All link to `/event/will-paradex-launch-a-token-by`
  - Shows all date options (Dec 31, Feb 28, Mar 31, etc.) on one page

## Statistics

Based on API analysis:
- **Average markets per event**: 3-5 markets
- **Some events**: 1 market (simple questions)
- **Some events**: 18+ markets (complex questions with many outcomes)
- **Total events available**: ~5000 events
- **Total markets available**: ~15,000-25,000 markets

## Summary

| Concept | Description | Example |
|---------|-------------|---------|
| **Event** | Container/grouping | "Which CEOs will be gone in 2025?" |
| **Market** | Individual prediction | "Tim Cook out as Apple CEO in 2025?" |
| **Relationship** | 1 Event → Many Markets | Event has 6 markets |
| **Current Limit** | 500 markets | ~100-170 events |
| **Why Limited** | Performance & speed | Faster loading |

## Questions?

- **Q: Why don't we fetch all markets?**
  - A: Performance - fetching 15,000+ markets would take minutes and could timeout

- **Q: Can we increase the limit?**
  - A: Yes! Change the limit in `app/page.tsx` and adjust `maxPages` in `lib/polymarket-api.ts`

- **Q: Why use events instead of markets directly?**
  - A: The API only provides events endpoint. We extract markets from events.

- **Q: What if I need a specific market?**
  - A: Use the search function - it searches across all fetched markets

