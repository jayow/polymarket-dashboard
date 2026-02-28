async function main() {
  const rewardsRes = await fetch("https://polyfilter.hanyon.app/api/rewards");
  const rewards = await rewardsRes.json();
  const markets = rewards.rewardMarkets || [];

  const now = new Date();
  const qualifying = markets.filter(m =>
    m.active === true && m.closed === false &&
    m.totalDailyRate >= 10 &&
    new Date(m.endDate) > now
  );

  function getEventKey(slug) {
    const distMatch = slug.match(/((?:ny|ca|tx|fl|oh|pa|ga|nc|mi|az|wi|nv|va|nj|il|ma|md|mn|co|wa|or|ct|sc|al|la|ky|ok|ia|ms|ar|ks|ut|ne|nm|wv|id|hi|nh|me|mt|ri|de|sd|nd|ak|vt|wy|dc)-\d+)/);
    if (distMatch) return "district-" + distMatch[1];
    const nobelMatch = slug.match(/nobel-(?:memorial-)?prize-in-(\w+)/);
    if (nobelMatch) return "nobel-" + nobelMatch[1];
    if (slug.includes("nobel-peace-prize")) return "nobel-peace";
    const govMatch = slug.match(/governor-of-(\w+)/);
    if (govMatch) return "governor-" + govMatch[1];
    const mayorMatch = slug.match(/mayor-of-(\w+)/);
    if (mayorMatch) return "mayor-" + mayorMatch[1];
    const senateMatch = slug.match(/senat(?:or|e)-(?:from|of|for|in)-(\w+)/);
    if (senateMatch) return "senate-" + senateMatch[1];
    const playForMatch = slug.match(/will-(.+?)-play-for/);
    if (playForMatch) return "player-" + playForMatch[1];
    const fedMatch = slug.match(/after-the-(\w+)-(\d{4})-meeting/);
    if (fedMatch) return "fed-" + fedMatch[1] + "-" + fedMatch[2];
    if (slug.includes("sdh100rt") || slug.includes("silicon-data") || slug.includes("h100-index")) return "sdh100rt";
    const byDateMatch = slug.match(/by-(june|july|april|march|may|august|september|october|november|december)-(\d+)/);
    if (byDateMatch) return "by-" + byDateMatch[1] + "-" + byDateMatch[2];
    if (slug.includes("ballon-dor")) return "ballon-dor";
    if (slug.includes("stanley-cup")) return "stanley-cup";
    if (slug.includes("nba-champion")) return "nba-champion";
    if (slug.includes("world-cup")) return "world-cup";
    if (slug.includes("survivor-season")) return "survivor";
    return null;
  }

  const eventGroups = {};
  for (const m of qualifying) {
    const key = getEventKey(m.slug);
    if (key === null) continue;
    if (eventGroups[key] === undefined) eventGroups[key] = [];
    eventGroups[key].push(m);
  }

  const multiEvents = Object.entries(eventGroups).filter(([_, ms]) => ms.length >= 2);

  // Collect ALL directional candidates
  const allCandidates = [];
  for (const [group, ms] of multiEvents) {
    for (const m of ms) {
      const bias = Math.abs(m.yesPrice - m.noPrice);
      if (bias < 0.5) continue;
      allCandidates.push({
        ...m, group, groupSize: ms.length,
        bias: Math.round(bias * 100),
        dir: m.noPrice > m.yesPrice ? "NO" : "YES"
      });
    }
  }

  allCandidates.sort((a, b) => {
    if (a.volume < 2000 && b.volume >= 2000) return -1;
    if (b.volume < 2000 && a.volume >= 2000) return 1;
    if (a.volume < 2000 && b.volume < 2000) return b.bias - a.bias;
    return b.totalDailyRate - a.totalDailyRate;
  });

  const top = allCandidates.slice(0, 30);

  console.log("Analyzing " + top.length + " candidates...\n");

  const actionable = [];
  const risky = [];
  const skipped = [];

  for (const c of top) {
    try {
      const [yesRes, noRes] = await Promise.all([
        fetch("https://clob.polymarket.com/book?token_id=" + c.yesTokenId),
        fetch("https://clob.polymarket.com/book?token_id=" + c.noTokenId),
      ]);
      const yesBook = await yesRes.json();
      const noBook = await noRes.json();

      const yesBids = (yesBook.bids || []).sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      const yesAsks = (yesBook.asks || []).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      const noBids = (noBook.bids || []).sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      const noAsks = (noBook.asks || []).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      if (yesBids.length === 0 || yesAsks.length === 0 || noBids.length === 0 || noAsks.length === 0) {
        skipped.push({ q: c.question, group: c.group, reason: "incomplete book" });
        continue;
      }

      // Detect tick size
      const allPrices = [
        ...(yesBook.bids || []).map(b => parseFloat(b.price)),
        ...(yesBook.asks || []).map(a => parseFloat(a.price)),
        ...(noBook.bids || []).map(b => parseFloat(b.price)),
        ...(noBook.asks || []).map(a => parseFloat(a.price)),
      ];
      const hasFractional = allPrices.some(p => {
        const cents = p * 100;
        return Math.abs(cents - Math.round(cents)) > 0.001;
      });
      const tick = hasFractional ? 0.001 : 0.01;
      const tickCents = hasFractional ? 0.1 : 1;
      const dp = hasFractional ? 1 : 0;

      // Favored and opposite sides
      const favBids = c.dir === "NO" ? noBids : yesBids;
      const favAsks = c.dir === "NO" ? noAsks : yesAsks;
      const oppBids = c.dir === "NO" ? yesBids : noBids;
      const oppAsks = c.dir === "NO" ? yesAsks : noAsks;

      const favBestBid = parseFloat(favBids[0].price);
      const favBestAsk = parseFloat(favAsks[0].price);
      const oppBestBid = parseFloat(oppBids[0].price);
      const oppBestAsk = parseFloat(oppAsks[0].price);

      const favSpreadTicks = Math.round((favBestAsk - favBestBid) / tick);
      const favSpreadCents = Math.round(favSpreadTicks * tickCents * 10) / 10;

      // === FAVORED SIDE: bid 1 tick above best bid ===
      const favBidPrice = Math.round((favBestBid + tick) * 10000) / 10000;
      const favBidCents = Math.round(favBidPrice * 100 * 10) / 10;
      const favDistFromAsk = Math.round((favBestAsk - favBidPrice) * 100 * 10) / 10;

      if (favDistFromAsk < 0) {
        skipped.push({ q: c.question, group: c.group, reason: "fav bid exceeds ask" });
        continue;
      }
      if (favDistFromAsk > c.maxSpread) {
        const minBid = Math.round((favBestAsk - c.maxSpread / 100) * 100 * 10) / 10;
        skipped.push({ q: c.question, group: c.group, reason: "fav maxSpread FAIL (need " + minBid + "¢, best bid " + (favBestBid*100).toFixed(dp) + "¢)" });
        continue;
      }

      // === OPPOSITE SIDE: bid 1 tick above best bid (from orderbook) ===
      let oppBidPrice = Math.round((oppBestBid + tick) * 10000) / 10000;
      let oppBidCents = Math.round(oppBidPrice * 100 * 10) / 10;

      // Complement constraint: favBid + oppBid must be < 100¢
      const complementCents = Math.round((100 - favBidCents) * 10) / 10;
      if (oppBidCents >= complementCents) {
        // Our opp bid would hit or exceed complement — drop to complement - 1 tick
        oppBidPrice = Math.round((1 - favBidPrice - tick) * 10000) / 10000;
        oppBidCents = Math.round(oppBidPrice * 100 * 10) / 10;
      }

      // Check opp side maxSpread
      const oppDistFromAsk = Math.round((oppBestAsk - oppBidPrice) * 100 * 10) / 10;
      let oppAdjusted = false;
      if (oppDistFromAsk > c.maxSpread) {
        // Need to bid higher to qualify on opp side
        const minOppBid = Math.round((oppBestAsk - c.maxSpread / 100) * 100 * 10) / 10;
        if (minOppBid + favBidCents >= 100) {
          skipped.push({ q: c.question, group: c.group, reason: "impossible (" + minOppBid + "+" + favBidCents + ">=100)" });
          continue;
        }
        oppBidCents = minOppBid;
        oppBidPrice = minOppBid / 100;
        oppAdjusted = true;
      }

      const totalCents = Math.round((favBidCents + oppBidCents) * 10) / 10;
      const capital = Math.round(c.minSize * totalCents / 100 * 100) / 100;
      const oppLabel = c.dir === "NO" ? "YES" : "NO";
      const isTopOfBook = favSpreadTicks <= 1;

      const entry = {
        group: c.group,
        question: c.question,
        rate: c.totalDailyRate,
        volume: Math.round(c.volume),
        tickCents,
        dir: c.dir,
        bias: c.bias,
        favBid: favBidCents,
        favBestBid: (favBestBid * 100).toFixed(dp),
        favBestAsk: (favBestAsk * 100).toFixed(dp),
        favSpread: favSpreadCents,
        favDist: favDistFromAsk,
        oppLabel,
        oppBid: oppBidCents,
        oppBestBid: (oppBestBid * 100).toFixed(dp),
        oppBestAsk: (oppBestAsk * 100).toFixed(dp),
        oppDist: Math.round((oppBestAsk - oppBidPrice) * 100 * 10) / 10,
        minSize: c.minSize,
        maxSpread: c.maxSpread,
        capital,
        totalCents,
        topOfBook: isTopOfBook,
        oppAdjusted,
        dp,
      };

      if (isTopOfBook) {
        risky.push(entry);
      } else {
        actionable.push(entry);
      }
    } catch (e) {
      skipped.push({ q: c.question, group: c.group, reason: "fetch error: " + e.message });
    }
  }

  // Print actionable
  console.log("===============================================");
  console.log("  ACTIONABLE — Spread room, not top of book");
  console.log("===============================================");

  let rank = 0;
  for (const e of actionable) {
    rank++;
    console.log("\n--------------------------------------------");
    console.log("#" + rank + " [" + e.group + "] " + e.question);
    console.log("  Rate: $" + e.rate + "/day | Vol: $" + e.volume + " | Tick: " + e.tickCents + "¢ | MinSize: " + e.minSize);
    console.log("  Bias: " + e.dir + " at " + e.bias + "¢ | Fav spread: " + e.favSpread + "¢");
    console.log("");
    console.log("  " + e.dir + " book: ask=" + e.favBestAsk + "¢  bid=" + e.favBestBid + "¢");
    console.log("  " + e.dir + ": BID " + e.favBid + "¢  (+" + e.tickCents + " above " + e.favBestBid + "¢ | " + e.favDist + "¢ from ask | max " + e.maxSpread + "¢ ✓)");
    console.log("");
    console.log("  " + e.oppLabel + " book: ask=" + e.oppBestAsk + "¢  bid=" + e.oppBestBid + "¢");
    console.log("  " + e.oppLabel + ": BID " + e.oppBid + "¢  (+" + e.tickCents + " above " + e.oppBestBid + "¢ | " + e.oppDist + "¢ from ask | max " + e.maxSpread + "¢" + (e.oppDist <= e.maxSpread ? " ✓" : " ✗") + ")" + (e.oppAdjusted ? " [bumped for maxSpread]" : ""));
    console.log("");
    console.log("  Total: " + e.favBid + " + " + e.oppBid + " = " + e.totalCents + "¢ | Capital: $" + e.capital.toFixed(2));
  }

  // Print risky
  console.log("\n\n===============================================");
  console.log("  RISKY — 1-tick spread, top of book");
  console.log("===============================================");

  for (const e of risky) {
    rank++;
    console.log("\n#" + rank + " [" + e.group + "] " + e.question);
    console.log("  Rate: $" + e.rate + "/day | Vol: $" + e.volume + " | Spread: " + e.favSpread + "¢ (matches ask)");
    console.log("  " + e.dir + ": BID " + e.favBid + "¢ | " + e.oppLabel + ": BID " + e.oppBid + "¢ | Capital: $" + e.capital.toFixed(2));
  }

  // Print skipped
  console.log("\n\n===============================================");
  console.log("  SKIPPED");
  console.log("===============================================");
  for (const s of skipped) {
    console.log("  [" + s.group + "] " + s.q.substring(0, 55) + " — " + s.reason);
  }
}
main().catch(e => console.error(e));
