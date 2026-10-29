// Postseason brackets — v17. Structures from the verified research pack
// (BRACKETS.md, 2026-10-24). Rules, fixed:
// - Bracket slots show TBD until a real event fills them: final standings
//   fixing a seed, a series-clinching win, a single-elimination win, or the
//   NCAA selection announcement. No fake matchups, no projected pairings
//   inside a bracket slot (a projection, if ever shown, lives outside the
//   bracket and is labeled "projected").
// - Advancement ONLY on a FINAL result. In best-of-three, a team advances
//   only after its series-clinching (second) win; a game-1 win shows as a
//   series lead (1-0), never advancement. In single elimination, advancement
//   follows the final score. A loser never carries forward.
// - Selection/seeding uses NPI. Pairwise is GONE (2025-26+) and must never
//   be rendered as a current system anywhere in this app.
// - Fourth 2027 regional venue RESOLVED by gap-hunt (NCAA.com + NCAA.org,
//   Sep 22, 2026): PeoplesBank Arena, Hartford, Conn. (host Sacred Heart).
//   Bridgeport is OUT (renovations). Selection-show date Sun, Mar 21, 2027
//   CONFIRMED by the same official NCAA sources (was provisional).
// - Big Ten QF pairing CORRECTED by gap-hunt (G1): 2v7, 3v6, 4v5 — the
//   canonical pack's 2v5/3v6/4v7 reading was wrong. Pairing + semifinal
//   re-seed rule to be verified against the official 2027 bracket when
//   published. Hockey East 2027 dates PARTIAL (G3): opening Mar 10 + final
//   Mar 20 now two-document; QF Mar 12-13 + semis Mar 19 still single-source.
//   2026-27 NPI dials STILL OPEN (G4): no dial numbers ship as 2026-27 rules.
//   ESPN seasontype=3 payload STILL OPEN (G9): fetch blocked in research env.
// - The ESPN seasontype=3 postseason payload is UNVERIFIED: the bracket
//   engine accepts feed results only when they match a known bracket game
//   (same participants, same date window); anything else stays TBD.
//   Conference rounds a feed does not carry stay TBD until a verified
//   source confirms the result.
// Game model: each game has an id, round, date label, format
// ("single" | "bestof3"), and participants as either {seed: N} (seed set
// only when final standings publish it) or {winner: gameId} (prior-round
// winner). Re-seeded rounds carry reseed: true and NEVER pre-pair from
// original seeds: their participants resolve only from results + seed order.

var BRACKETS = [
{ id: "b1g", title: "Big Ten Tournament", trophy: "Big Ten title",
  note: "7 teams, all qualify, all single elimination, all campus sites. Champion earns the Big Ten automatic NCAA bid.",
  rounds: [
    { name: "Quarterfinals", date: "Wed, Mar 10, 2027", format: "single", reseed: false, note: "Pairings 2v7, 3v6, 4v5 (gap-hunt G1 correction; verify vs the official 2027 bracket when published).", games: [
      { id: "b1g-q1", a: {seed: 2}, b: {seed: 7} },
      { id: "b1g-q2", a: {seed: 3}, b: {seed: 6} },
      { id: "b1g-q3", a: {seed: 4}, b: {seed: 5} } ] },
    { name: "Semifinals", date: "Sat, Mar 13, 2027", format: "single", reseed: true, note: "Re-seeded after the quarterfinals: No. 1 hosts the lowest remaining seed; the other two quarterfinal winners play each other. Hosted by the No. 1 seed and the highest advancing quarterfinal seed.", games: [
      { id: "b1g-s1", a: {seed: 1}, b: {reseed: "worst", from: "b1g-q1"} },
      { id: "b1g-s2", a: {reseed: "best", from: "b1g-q1"}, b: {reseed: "second", from: "b1g-q1"} } ] },
    { name: "Championship", date: "Fri, Mar 19, 2027", format: "single", reseed: false, note: "Hosted by the highest remaining seed.", games: [
      { id: "b1g-f", a: {winner: "b1g-s1"}, b: {winner: "b1g-s2"} } ] } ] },
{ id: "nchc", title: "NCHC Frozen Faceoff", trophy: "NCHC title",
  note: "10 teams in 2027 (St. Thomas joins), all qualify, all campus sites. Champion earns the NCHC automatic NCAA bid.",
  rounds: [
    { name: "First Round (best-of-three)", date: "Mar 5–7, 2027", format: "bestof3", reseed: false, note: "Top five seeds host bottom five.", games: [
      { id: "nchc-r1", a: {seed: 1}, b: {seed: 10} },
      { id: "nchc-r2", a: {seed: 2}, b: {seed: 9} },
      { id: "nchc-r3", a: {seed: 3}, b: {seed: 8} },
      { id: "nchc-r4", a: {seed: 4}, b: {seed: 7} },
      { id: "nchc-r5", a: {seed: 5}, b: {seed: 6} } ] },
    { name: "Quarterfinal", date: "Fri, Mar 12, 2027", format: "single", reseed: true, note: "Re-seeded after the first round. At the highest remaining seed's site: the two lowest remaining seeds play each other.", games: [
      { id: "nchc-q", a: {reseed: "worst", from: "nchc-r1"}, b: {reseed: "secondWorst", from: "nchc-r1"} } ] },
    { name: "Semifinals", date: "Sat, Mar 13, 2027", format: "single", reseed: true, note: "Re-seeded: the highest remaining seed hosts the quarterfinal winner; the other two remaining seeds play each other.", games: [
      { id: "nchc-s1", a: {reseed: "best", from: "nchc-r1", excludeParticipantsOf: "nchc-q"}, b: {winner: "nchc-q"} },
      { id: "nchc-s2", a: {reseed: "second", from: "nchc-r1", excludeParticipantsOf: "nchc-q"}, b: {reseed: "third", from: "nchc-r1", excludeParticipantsOf: "nchc-q"} } ] },
    { name: "Championship", date: "Fri, Mar 19, 2027", format: "single", reseed: false, note: "Hosted by the highest remaining seed.", games: [
      { id: "nchc-f", a: {winner: "nchc-s1"}, b: {winner: "nchc-s2"} } ] } ] },
{ id: "he", title: "Hockey East Tournament", trophy: "Lamoriello Trophy",
  note: "11 teams, all-in, all single elimination. Semifinals + championship at TD Garden, Boston. Champion earns the Hockey East automatic NCAA bid. 2027 dates PARTIAL (gap-hunt G3): opening Mar 10 + final Mar 20 now two-document (CHI tournaments page + CHI media kit); quarterfinals Mar 12-13 + semifinals Mar 19 still single-source — flagged, not hidden.",
  rounds: [
    { name: "Opening Round", date: "Wed, Mar 10, 2027", format: "single", reseed: false, note: "Higher seed hosts.", games: [
      { id: "he-o1", a: {seed: 6}, b: {seed: 11} },
      { id: "he-o2", a: {seed: 7}, b: {seed: 10} },
      { id: "he-o3", a: {seed: 8}, b: {seed: 9} } ] },
    { name: "Quarterfinals", date: "Mar 12–13, 2027", format: "single", reseed: true, note: "After re-seeding: No. 1 hosts the lowest opening-round winner, No. 2 the middle winner, No. 3 the highest winner; No. 4 hosts No. 5.", games: [
      { id: "he-q1", a: {seed: 1}, b: {reseed: "worst", from: "he-o1"} },
      { id: "he-q2", a: {seed: 2}, b: {reseed: "second", from: "he-o1"} },
      { id: "he-q3", a: {seed: 3}, b: {reseed: "best", from: "he-o1"} },
      { id: "he-q4", a: {seed: 4}, b: {seed: 5} } ] },
    { name: "Semifinals", date: "Fri, Mar 19, 2027", format: "single", reseed: false, note: "TD Garden, Boston.", games: [
      { id: "he-s1", a: {winner: "he-q1"}, b: {winner: "he-q4"} },
      { id: "he-s2", a: {winner: "he-q2"}, b: {winner: "he-q3"} } ] },
    { name: "Championship", date: "Sat, Mar 20, 2027", format: "single", reseed: false, note: "TD Garden, Boston.", games: [
      { id: "he-f", a: {winner: "he-s1"}, b: {winner: "he-s2"} } ] } ] },
{ id: "ecac", title: "ECAC Hockey Tournament", trophy: "Whitelaw Trophy",
  note: "12 teams, all qualify. Championship weekend at Herb Brooks Arena, Lake Placid, N.Y. No third-place game. Champion earns the ECAC automatic NCAA bid.",
  rounds: [
    { name: "Opening Round", date: "Mar 5–6, 2027", format: "single", reseed: false, note: "Seeds 5–8 host seeds 9–12.", games: [
      { id: "ecac-o1", a: {seed: 5}, b: {seed: 12} },
      { id: "ecac-o2", a: {seed: 6}, b: {seed: 11} },
      { id: "ecac-o3", a: {seed: 7}, b: {seed: 10} },
      { id: "ecac-o4", a: {seed: 8}, b: {seed: 9} } ] },
    { name: "Quarterfinals (best-of-three)", date: "Mar 12–14, 2027", format: "bestof3", reseed: true, note: "Advancing teams re-seeded and travel to seeds 1–4: No. 1 hosts the lowest opening-round winner, No. 2 the next, No. 3 the next, No. 4 the highest winner.", games: [
      { id: "ecac-q1", a: {seed: 1}, b: {reseed: "worst", from: "ecac-o1"} },
      { id: "ecac-q2", a: {seed: 2}, b: {reseed: "third", from: "ecac-o1"} },
      { id: "ecac-q3", a: {seed: 3}, b: {reseed: "second", from: "ecac-o1"} },
      { id: "ecac-q4", a: {seed: 4}, b: {reseed: "best", from: "ecac-o1"} } ] },
    { name: "Semifinals", date: "Fri, Mar 19, 2027", format: "single", reseed: false, note: "Herb Brooks Arena, Lake Placid, N.Y.", games: [
      { id: "ecac-s1", a: {winner: "ecac-q1"}, b: {winner: "ecac-q4"} },
      { id: "ecac-s2", a: {winner: "ecac-q2"}, b: {winner: "ecac-q3"} } ] },
    { name: "Championship", date: "Sat, Mar 20, 2027", format: "single", reseed: false, note: "Herb Brooks Arena, Lake Placid, N.Y.", games: [
      { id: "ecac-f", a: {winner: "ecac-s1"}, b: {winner: "ecac-s2"} } ] } ] },
{ id: "ccha", title: "CCHA Mason Cup Playoffs", trophy: "Mason Cup",
  note: "8 teams, all qualify, campus sites. Champion earns the CCHA automatic NCAA bid.",
  rounds: [
    { name: "Quarterfinals (best-of-three)", date: "Mar 5–7, 2027", format: "bestof3", reseed: false, note: "Top four teams host.", games: [
      { id: "ccha-q1", a: {seed: 1}, b: {seed: 8} },
      { id: "ccha-q2", a: {seed: 2}, b: {seed: 7} },
      { id: "ccha-q3", a: {seed: 3}, b: {seed: 6} },
      { id: "ccha-q4", a: {seed: 4}, b: {seed: 5} } ] },
    { name: "Semifinals", date: "Sat, Mar 13, 2027", format: "single", reseed: true, note: "At the campus sites of the two highest remaining seeds; winners re-seeded by regular-season standings: highest hosts lowest, second-highest hosts third-highest.", games: [
      { id: "ccha-s1", a: {reseed: "best", from: "ccha-q1"}, b: {reseed: "worst", from: "ccha-q1"} },
      { id: "ccha-s2", a: {reseed: "second", from: "ccha-q1"}, b: {reseed: "third", from: "ccha-q1"} } ] },
    { name: "Championship", date: "Fri, Mar 19, 2027", format: "single", reseed: false, note: "Hosted by the highest remaining seed.", games: [
      { id: "ccha-f", a: {winner: "ccha-s1"}, b: {winner: "ccha-s2"} } ] } ] },
{ id: "aha", title: "Atlantic Hockey America Tournament", trophy: "Jack Riley Trophy",
  note: "9 teams in 2027 (Mercyhurst dropped its program after 2025–26), all qualify. Champion earns the AHA automatic NCAA bid.",
  rounds: [
    { name: "First Round", date: "Tue, Mar 2, 2027", format: "single", reseed: false, note: "No. 8 hosts No. 9.", games: [
      { id: "aha-r1", a: {seed: 8}, b: {seed: 9} } ] },
    { name: "Quarterfinals (best-of-three)", date: "Mar 5–7, 2027", format: "bestof3", reseed: false, games: [
      { id: "aha-q1", a: {seed: 1}, b: {winner: "aha-r1"} },
      { id: "aha-q2", a: {seed: 2}, b: {seed: 7} },
      { id: "aha-q3", a: {seed: 3}, b: {seed: 6} },
      { id: "aha-q4", a: {seed: 4}, b: {seed: 5} } ] },
    { name: "Semifinals (best-of-three)", date: "Mar 12–14, 2027", format: "bestof3", reseed: true, note: "Highest remaining seed hosts lowest remaining; second-highest hosts third-highest.", games: [
      { id: "aha-s1", a: {reseed: "best", from: "aha-q1"}, b: {reseed: "worst", from: "aha-q1"} },
      { id: "aha-s2", a: {reseed: "second", from: "aha-q1"}, b: {reseed: "third", from: "aha-q1"} } ] },
    { name: "Championship", date: "Sat, Mar 20, 2027", format: "single", reseed: false, note: "At the home of the highest-seeded semifinal winner.", games: [
      { id: "aha-f", a: {winner: "aha-s1"}, b: {winner: "aha-s2"} } ] } ] },
{ id: "ncaa", title: "NCAA Tournament", trophy: "National Championship",
  note: "16-team single-elimination field: 6 conference champions (automatic bids) + 10 at-large selections, seeded by NPI. Nothing fills before the selection announcement (Sun, Mar 21, 2027, confirmed by NCAA.com/NCAA.org Sep 22, 2026); until then every slot shows TBD.",
  rounds: [
    { name: "Regionals — Semifinals", date: "Mar 25–28, 2027", format: "single", reseed: false, note: "Loveland, Colo. (Blue Arena, host Denver) · Springfield, Mass. (MassMutual Center, host UMass) · Fargo, N.D. (Scheels Arena, host North Dakota) · Hartford, Conn. (PeoplesBank Arena, host Sacred Heart — relocated from Bridgeport, NCAA.com/NCAA.org Sep 22, 2026).", games: [
      { id: "ncaa-r1a", a: {seed: "R1-1"}, b: {seed: "R1-4"} },
      { id: "ncaa-r1b", a: {seed: "R1-2"}, b: {seed: "R1-3"} },
      { id: "ncaa-r2a", a: {seed: "R2-1"}, b: {seed: "R2-4"} },
      { id: "ncaa-r2b", a: {seed: "R2-2"}, b: {seed: "R2-3"} },
      { id: "ncaa-r3a", a: {seed: "R3-1"}, b: {seed: "R3-4"} },
      { id: "ncaa-r3b", a: {seed: "R3-2"}, b: {seed: "R3-3"} },
      { id: "ncaa-r4a", a: {seed: "R4-1"}, b: {seed: "R4-4"} },
      { id: "ncaa-r4b", a: {seed: "R4-2"}, b: {seed: "R4-3"} } ] },
    { name: "Regionals — Finals", date: "Mar 25–28, 2027", format: "single", reseed: false, games: [
      { id: "ncaa-r1f", a: {winner: "ncaa-r1a"}, b: {winner: "ncaa-r1b"} },
      { id: "ncaa-r2f", a: {winner: "ncaa-r2a"}, b: {winner: "ncaa-r2b"} },
      { id: "ncaa-r3f", a: {winner: "ncaa-r3a"}, b: {winner: "ncaa-r3b"} },
      { id: "ncaa-r4f", a: {winner: "ncaa-r4a"}, b: {winner: "ncaa-r4b"} } ] },
    { name: "Frozen Four — Semifinals", date: "Thu, Apr 8, 2027", format: "single", reseed: false, note: "Capital One Arena, Washington, DC. Pairings pre-determined: No. 1 overall region vs No. 4 overall region; No. 2 vs No. 3.", games: [
      { id: "ncaa-s1", a: {winner: "ncaa-r1f"}, b: {winner: "ncaa-r4f"} },
      { id: "ncaa-s2", a: {winner: "ncaa-r2f"}, b: {winner: "ncaa-r3f"} } ] },
    { name: "National Championship", date: "Sat, Apr 10, 2027", format: "single", reseed: false, note: "Capital One Arena, Washington, DC.", games: [
      { id: "ncaa-f", a: {winner: "ncaa-s1"}, b: {winner: "ncaa-s2"} } ] } ] },
{ id: "uchc", title: "United Collegiate Hockey Cup", trophy: "None — showcase cup, NOT a qualifier",
  note: "NON-QUALIFYING SHOWCASE — labeled separately, never a qualifier. The five independents (Alaska Anchorage, Alaska Fairbanks, Lindenwood, LIU, Stonehill) play Mar 4–6, 2027 at Centene Community Ice Center, Maryland Heights, Mo. The winner does NOT receive an automatic NCAA berth; independents reach the NCAA field only as at-large selections.",
  rounds: [
    { name: "Showcase Games", date: "Mar 4–6, 2027", format: "single", reseed: false, note: "Play-in game; all teams guaranteed at least two games. Not a qualifier.", games: [
      { id: "uchc-g1", a: {seed: "IND-1"}, b: {seed: "IND-2"} },
      { id: "uchc-g2", a: {seed: "IND-3"}, b: {seed: "IND-4"} } ] } ] }
];

// Bracket state engine. Inputs:
//   seeds: {bracketId: {seedLabel: teamKey}} — set ONLY when final standings
//     or the selection announcement publishes them. Empty until then.
//   results: {gameId: {a: goals, b: goals, status: "live"|"final",
//     series: [aWins, bWins]}} — only for best-of-three games; series wins
//     count games won, not goals. A result with unknown participants is
//     ignored (never creates a matchup).
// Output per game: {a: teamKey|null, b: teamKey|null, aLabel, bLabel,
//   score: string|null, series: string|null, winner: teamKey|null,
//   advanced: bool, live: bool}. Advancement requires status "final" AND
//   (single: higher goals; bestof3: 2 series wins). A live game never
//   advances. A game-1 best-of-three win shows series "1–0", never
//   advancement. A tied single-elimination final score resolves to no
//   winner (bad data stays unresolved, never guessed).
// Slots: {seed: N} (seed set only when final standings publish it),
//   {winner: gameId} (prior-round winner), or
//   {reseed: pick, from: gameId, excludeParticipantsOf?: gameId} where pick
//   is best/second/third/worst/secondWorst over the source round's winners
//   sorted by original seed ascending. A reseed pool resolves ONLY when
//   every source-round game has a final winner with a numeric seed (and,
//   with excludeParticipantsOf, when the excluded game's participants are
//   both resolved); otherwise the slot stays TBD. Winners carry their
//   original seed forward so later re-seeds order correctly.
function bracketStates(bracket, seeds, results){
  var seedMap = (seeds && seeds[bracket.id]) || {};
  var states = {};
  var winnerSeed = {}; // gameId -> original numeric seed of its winner
  function roundContaining(gameId){
    for (var i = 0; i < bracket.rounds.length; i++){
      var games = bracket.rounds[i].games;
      for (var j = 0; j < games.length; j++) if (games[j].id === gameId) return bracket.rounds[i];
    }
    return null;
  }
  function resolveSlot(slot){
    if (!slot) return { team: null, seed: null };
    if (slot.winner){
      var prior = states[slot.winner];
      if (prior && prior.winner) return { team: prior.winner, seed: (winnerSeed[slot.winner] != null ? winnerSeed[slot.winner] : null) };
      return { team: null, seed: null };
    }
    if (slot.reseed){
      var srcRound = roundContaining(slot.from);
      if (!srcRound) return { team: null, seed: null };
      var pool = [];
      for (var i = 0; i < srcRound.games.length; i++){
        var g = srcRound.games[i];
        var st = states[g.id];
        if (!st || !st.winner) return { team: null, seed: null };
        if (typeof winnerSeed[g.id] !== "number") return { team: null, seed: null };
        pool.push({ team: st.winner, seed: winnerSeed[g.id] });
      }
      if (slot.excludeParticipantsOf){
        var ex = states[slot.excludeParticipantsOf];
        if (!ex || !ex.a || !ex.b) return { team: null, seed: null };
        var banned = {}; banned[ex.a] = true; banned[ex.b] = true;
        pool = pool.filter(function(p){ return !banned[p.team]; });
      }
      pool.sort(function(x, y){ return x.seed - y.seed; });
      var pick = null;
      if (slot.reseed === "best") pick = pool[0];
      else if (slot.reseed === "second") pick = pool[1];
      else if (slot.reseed === "third") pick = pool[2];
      else if (slot.reseed === "worst") pick = pool[pool.length - 1];
      else if (slot.reseed === "secondWorst") pick = pool[pool.length - 2];
      if (!pick) return { team: null, seed: null };
      return { team: pick.team, seed: pick.seed };
    }
    if (slot.seed !== undefined && slot.seed !== null){
      return { team: seedMap[slot.seed] || null, seed: (typeof slot.seed === "number") ? slot.seed : null };
    }
    return { team: null, seed: null };
  }
  bracket.rounds.forEach(function(round){
    round.games.forEach(function(game){
      // Format lives on the round, not the game: copy it down so the
      // engine (and the feed mapper) treat best-of-three series correctly.
      game.format = round.format;
      var ra = resolveSlot(game.a), rb = resolveSlot(game.b);
      var a = ra.team, b = rb.team;
      var res = (results && results[game.id]) || null;
      var out = { a: a, b: b, aLabel: a || "TBD", bLabel: b || "TBD",
        score: null, series: null, winner: null, advanced: false, live: false };
      if (!res || a === null || b === null){ states[game.id] = out; return; }
      if (res.status === "live"){
        out.live = true;
        out.score = res.a + "–" + res.b + " (live)";
        if (game.format === "bestof3" && res.series) out.series = res.series[0] + "–" + res.series[1] + " games";
        states[game.id] = out; return;
      }
      if (res.status !== "final"){ states[game.id] = out; return; }
      out.score = res.a + "–" + res.b + " Final";
      if (game.format === "bestof3" && res.series){
        out.series = res.series[0] + "–" + res.series[1] + " games";
        if (res.series[0] >= 2){ out.winner = a; out.advanced = true; winnerSeed[game.id] = ra.seed; }
        else if (res.series[1] >= 2){ out.winner = b; out.advanced = true; winnerSeed[game.id] = rb.seed; }
        states[game.id] = out; return;
      }
      if (res.a > res.b){ out.winner = a; out.advanced = true; winnerSeed[game.id] = ra.seed; }
      else if (res.b > res.a){ out.winner = b; out.advanced = true; winnerSeed[game.id] = rb.seed; }
      states[game.id] = out;
    });
  });
  return states;
}

// Defensive feed mapper: accepts an ESPN-style scoreboard payload and maps
// results ONLY onto bracket games whose participants are already resolved
// (same two teams, same date window). It never creates a matchup, never
// fills a TBD slot from a feed alone, and ignores unknown shapes.
function applyBracketFeed(bracket, seeds, results, payload){
  var out = results || {};
  try{
    var events = (payload && payload.events) || [];
    var states = bracketStates(bracket, seeds, out);
    events.forEach(function(ev){
      var comps = ((ev.competitions || [])[0] || {}).competitors || [];
      if (comps.length < 2) return;
      var home = comps[0], away = comps[1];
      var hKey = null, aKey = null;
      // espnKeyForTeam lives inside the app IIFE: reach it via __vmaxTest
      // when it is not a global (brackets.js itself is global scope).
      var keyFn = (typeof espnKeyForTeam === "function") ? espnKeyForTeam
        : ((typeof window !== "undefined" && window.__vmaxTest && typeof window.__vmaxTest.espnKeyForTeam === "function") ? window.__vmaxTest.espnKeyForTeam : null);
      if (keyFn){ hKey = keyFn(home); aKey = keyFn(away); }
      if (!hKey || !aKey) return;
      var status = (ev.status && ev.status.type && ev.status.type.state) || "";
      var hs = parseInt((home.score && home.score.value) || home.score, 10);
      var as = parseInt((away.score && away.score.value) || away.score, 10);
      if (isNaN(hs) || isNaN(as)) return;
      Object.keys(states).forEach(function(gid){
        var st = states[gid];
        if (!st.a || !st.b) return;
        // Best-of-three series slots are NOT filled from single-game feed
        // scores: a series advances only on its clinching win, which a
        // per-game scoreboard row does not establish. Series slots stay TBD
        // until a series result source confirms them (reported gap).
        var gdef = null;
        bracket.rounds.forEach(function(r){ r.games.forEach(function(g){ if (g.id === gid) gdef = g; }); });
        if (gdef && gdef.format === "bestof3") return;
        if ((st.a === hKey && st.b === aKey) || (st.a === aKey && st.b === hKey)){
          var flip = (st.a === aKey);
          out[gid] = { a: flip ? as : hs, b: flip ? hs : as,
            status: (status === "final" || status === "post") ? "final" : "live" };
        }
      });
    });
  }catch(e){}
  return out;
}
