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

  console.log("Qualifying markets (rate>=$10, active, not expired):", qualifying.length);

  function getEventKey(slug) {
    // Political primaries / nominees
    const distMatch = slug.match(/((?:ny|ca|tx|fl|oh|pa|ga|nc|mi|az|wi|nv|va|nj|il|ma|md|mn|co|wa|or|ct|sc|al|la|ky|ok|ia|ms|ar|ks|ut|ne|nm|wv|id|hi|nh|me|mt|ri|de|sd|nd|ak|vt|wy|dc)-\d+)/);
    if (distMatch) return "district-" + distMatch[1];

    // Nobel prizes
    const nobelMatch = slug.match(/nobel-(?:memorial-)?prize-in-(\w+)/);
    if (nobelMatch) return "nobel-" + nobelMatch[1];
    if (slug.includes("nobel-peace-prize")) return "nobel-peace";

    // Governor
    const govMatch = slug.match(/governor-of-(\w+)/);
    if (govMatch) return "governor-" + govMatch[1];

    // Mayor
    const mayorMatch = slug.match(/mayor-of-(\w+)/);
    if (mayorMatch) return "mayor-" + mayorMatch[1];

    // Senate
    const senateMatch = slug.match(/senat(?:or|e)-(?:from|of|for|in)-(\w+)/);
    if (senateMatch) return "senate-" + senateMatch[1];

    // Sports - player destinations
    const playForMatch = slug.match(/will-(.+?)-play-for/);
    if (playForMatch) return "player-" + playForMatch[1];

    // Fed meetings
    const fedMatch = slug.match(/after-the-(\w+)-(\d{4})-meeting/);
    if (fedMatch) return "fed-" + fedMatch[1] + "-" + fedMatch[2];

    // Silicon Data / H100
    if (slug.includes("sdh100rt") || slug.includes("silicon-data") || slug.includes("h100-index")) return "sdh100rt";

    // By-date deadline events
    const byDateMatch = slug.match(/by-(june|july|april|march|may|august|september|october|november|december)-(\d+)/);
    if (byDateMatch) return "by-" + byDateMatch[1] + "-" + byDateMatch[2];

    // Championship / award patterns
    if (slug.includes("ballon-dor")) return "ballon-dor";
    if (slug.includes("stanley-cup")) return "stanley-cup";
    if (slug.includes("super-bowl")) return "super-bowl";
    if (slug.includes("world-series")) return "world-series";
    if (slug.includes("champions-league")) return "champions-league";
    if (slug.includes("nba-champion")) return "nba-champion";
    if (slug.includes("nba-mvp")) return "nba-mvp";
    if (slug.includes("nfl-mvp")) return "nfl-mvp";
    if (slug.includes("mlb-mvp")) return "mlb-mvp";
    if (slug.includes("cy-young")) return "cy-young";
    if (slug.includes("heisman")) return "heisman";

    // Pope
    if (slug.includes("next-pope") || slug.includes("pope-")) return "pope";

    // Presidential
    if (slug.includes("president-of-")) {
      const presMatch = slug.match(/president-of-(\w+)/);
      if (presMatch) return "president-" + presMatch[1];
    }

    // Premier League etc
    if (slug.includes("premier-league-winner")) return "premier-league";
    if (slug.includes("la-liga-winner")) return "la-liga";
    if (slug.includes("serie-a-winner")) return "serie-a";
    if (slug.includes("bundesliga-winner")) return "bundesliga";

    return null;
  }

  const eventGroups = {};
  const ungrouped = [];
  for (const m of qualifying) {
    const key = getEventKey(m.slug);
    if (key === null) {
      ungrouped.push(m);
      continue;
    }
    if (eventGroups[key] === undefined) eventGroups[key] = [];
    eventGroups[key].push(m);
  }

  // Multi-option events only
  const multiEvents = Object.entries(eventGroups)
    .filter(([_, ms]) => ms.length >= 2)
    .sort((a, b) => {
      const aMaxRate = Math.max(...a[1].map(m => m.totalDailyRate));
      const bMaxRate = Math.max(...b[1].map(m => m.totalDailyRate));
      return bMaxRate - aMaxRate;
    });

  const singleEvents = Object.entries(eventGroups).filter(([_, ms]) => ms.length === 1);

  console.log("Multi-option event groups:", multiEvents.length);
  console.log("Single-market events:", singleEvents.length);
  console.log("Ungrouped (binary/unmatched):", ungrouped.length);
  console.log("");

  for (const [key, ms] of multiEvents) {
    const maxRate = Math.max(...ms.map(m => m.totalDailyRate));
    const avgVol = ms.reduce((s, m) => s + m.volume, 0) / ms.length;
    const minVol = Math.min(...ms.map(m => m.volume));
    const zeroVol = ms.filter(m => m.volume === 0).length;
    console.log("[" + key + "] " + ms.length + " mkts | max rate $" + maxRate + " | avg vol $" + Math.round(avgVol) + " | min vol $" + Math.round(minVol) + (zeroVol > 0 ? " | " + zeroVol + " ZERO-VOL" : ""));
    console.log("  e.g. " + ms[0].question.substring(0, 80));
    console.log("");
  }

  // Also show top ungrouped by rate (these could be multi-option events we missed)
  console.log("=== TOP UNGROUPED (may be multi-option events we missed) ===");
  const topUngrouped = ungrouped
    .sort((a, b) => b.totalDailyRate - a.totalDailyRate)
    .slice(0, 15);
  for (const m of topUngrouped) {
    console.log("  $" + m.totalDailyRate + "/day | vol $" + Math.round(m.volume) + " | " + m.question.substring(0, 70));
    console.log("    slug: " + m.slug.substring(0, 70));
    console.log("");
  }
}
main().catch(e => console.error(e));
