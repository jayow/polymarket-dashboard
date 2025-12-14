# Multi-Category Support

## Overview
The Polymarket dashboard now supports **multiple categories/tags** per market. Each event can have multiple tags, and markets inherit all tags from their parent event.

## Implementation Details

### Data Structure
- **Primary Category**: The first tag is stored as `market.category` (for backward compatibility)
- **All Tags**: All tags are stored in `market.tags` array
- **Event Tags**: Events can have multiple tags (e.g., "Business", "Economy", "2025 Predictions", "AI")

### Filtering Behavior
When filtering by category:
- Markets match if their **primary category** matches the selected filter
- Markets also match if **any tag** in their `tags` array matches the selected filter
- This means a market tagged with ["Business", "Economy"] will show up when filtering by either "Business" OR "Economy"

### UI Display
- **Table View**: Shows primary category in blue badge, additional tags in gray badges
- **Card View**: Shows primary category in blue badge, additional tags in gray badges
- **Category Filter**: Includes all unique tags from all markets (not just primary categories)

## Parent-Child Category Relationships

Currently, the Polymarket API doesn't provide explicit parent-child relationships in tag metadata. However, the system is designed to support this:

### Current Approach
- All tags are treated as flat categories
- No hierarchy is enforced
- Each tag is independent

### Future Enhancement Options

1. **Infer Hierarchy from Tag Names**
   - Tags like "Economic Policy" could be a child of "Economy"
   - Tags like "Big Tech" could be a child of "Business"
   - Would require pattern matching or a mapping file

2. **Manual Category Mapping**
   - Create a configuration file mapping parent-child relationships
   - Example: `{ "Economy": ["Economic Policy", "Fed Rates"], "Business": ["Big Tech", "AI"] }`

3. **API Enhancement**
   - If Polymarket adds parent-child metadata to tags, we can use it directly

## Example

An event with tags: `["Business", "Economy", "2025 Predictions", "AI"]`

Results in a market with:
- `category: "Business"` (primary)
- `tags: ["Business", "Economy", "2025 Predictions", "AI"]`

This market will appear when filtering by:
- "Business" ✅
- "Economy" ✅
- "2025 Predictions" ✅
- "AI" ✅

## Benefits

1. **Better Filtering**: Users can find markets by any relevant tag, not just the primary category
2. **Richer Metadata**: All tags are preserved and displayed
3. **Future-Proof**: Ready for hierarchical category support when available
4. **Backward Compatible**: Primary category still works for existing code

