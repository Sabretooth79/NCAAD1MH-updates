// NCAAMD1H — app logic. No dependencies. v6.
(function(){
"use strict";
var $ = function(s, r){ return (r||document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function load(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ try{ localStorage.removeItem(k); }catch(e2){} return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

// ---------- helpers ----------
function fmtDate(iso){
  var p = iso.split("-");
  var d = new Date(+p[0], +p[1]-1, +p[2]);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[d.getDay()] + ", " + months[d.getMonth()] + " " + (+p[2]);
}
function rankStr(r){ return r ? "#" + r + " " : ""; }
// v30 time labels: TBD is POSTSEASON-ONLY. A regular-season game with no
// published time renders with NO time text at all — never "TBD", never "Time
// TBD". A blank time means unpublished, never guessed.
// v27 Central zone: CDT in daylight months, CST in winter — never a
// bare "CT" and never a wrong-season label (Nov 1, 2026 and Mar 4-5,
// 2027 games are CST). DST runs second Sunday of March through first
// Sunday of November; the DST-end date itself is already CST.
function centralZone(dateStr){
  try{
    var s = String(dateStr || "").slice(0, 10);
    var y = +s.slice(0, 4);
    if (!y || s.length !== 10) return "CT";
    var marDow = new Date(Date.UTC(y, 2, 1)).getUTCDay();
    var dstStart = String(y) + "-03-" + String(1 + ((7 - marDow) % 7) + 7).padStart(2, "0");
    var novDow = new Date(Date.UTC(y, 10, 1)).getUTCDay();
    var dstEnd = String(y) + "-11-" + String(1 + ((7 - novDow) % 7)).padStart(2, "0");
    return (s >= dstStart && s < dstEnd) ? "CDT" : "CST";
  }catch(e){ return "CT"; }
}
function timeShortLabel(t, dateStr){ return displayZoneTime(t, dateStr); }
function timeCTLabel(t, dateStr){ return displayZoneTime(t, dateStr); }
function timeSeg(t, dateStr){ var l = timeCTLabel(t, dateStr); return l ? " &middot; " + esc(l) : ""; }
// ---------- v32 timezone picker (Settings; display only) ----------
// Saved CT wall times convert to the chosen zone at render. Countdowns,
// T-60 alerts, and live detection always use true instants, never these
// strings. "auto" = the device timezone.
var TZ_CHOICES = [
  {id: "auto", label: "Automatic (device timezone)", zone: null},
  {id: "America/New_York", label: "Eastern", zone: "America/New_York"},
  {id: "America/Chicago", label: "Central", zone: "America/Chicago"},
  {id: "America/Denver", label: "Mountain", zone: "America/Denver"},
  {id: "America/Los_Angeles", label: "Pacific", zone: "America/Los_Angeles"},
  {id: "America/Anchorage", label: "Alaska", zone: "America/Anchorage"},
  {id: "Pacific/Honolulu", label: "Hawaii", zone: "Pacific/Honolulu"},
  {id: "UTC", label: "UTC", zone: "UTC"}
];
function tzPref(){
  var v = load("tzPref", "auto");
  if (typeof v !== "string") return "auto";
  for (var i = 0; i < TZ_CHOICES.length; i++) if (TZ_CHOICES[i].id === v) return v;
  return "auto";
}
function tzZone(){
  var p = tzPref();
  for (var i = 0; i < TZ_CHOICES.length; i++) if (TZ_CHOICES[i].id === p) return TZ_CHOICES[i].zone;
  return null;
}
function setTzPref(v){ save("tzPref", v); }
function ctWallToEpoch(timeCT, dateStr){
  var m = String(timeCT || "").match(/^\s*(\d{1,2}):(\d{2})\s*([AP]M)\s*$/i);
  if (!m) return null;
  var z = centralZone(dateStr);
  if (z !== "CDT" && z !== "CST") return null;
  var h = +m[1] % 12 + (m[3].toUpperCase() === "PM" ? 12 : 0);
  var s = String(dateStr).slice(0, 10).split("-");
  if (s.length !== 3) return null;
  return Date.UTC(+s[0], +s[1] - 1, +s[2], h, +m[2]) + (z === "CST" ? 6 : 5) * 3600000;
}
function epochToZoneLabel(ep, dateStr){
  // "7:00 PM EDT", or "12:30 AM EST (Nov 1)" when conversion moves the
  // wall date past midnight. Null when the zone abbreviation is
  // unavailable, so callers fall back to the CT label, never a bare time.
  try{
    var zone = tzZone();
    var opts = {hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short"};
    if (zone) opts.timeZone = zone;
    var parts = new Intl.DateTimeFormat("en-US", opts).formatToParts(new Date(ep));
    var hh = "", mm = "", dp = "", zn = "";
    for (var i = 0; i < parts.length; i++){
      if (parts[i].type === "hour") hh = parts[i].value;
      else if (parts[i].type === "minute") mm = parts[i].value;
      else if (parts[i].type === "dayPeriod") dp = parts[i].value;
      else if (parts[i].type === "timeZoneName") zn = parts[i].value;
    }
    if (!hh || !mm || !dp || !zn) return null;
    var txt = hh + ":" + mm + " " + dp + " " + zn;
    if (dateStr){
      var dopts = {year: "numeric", month: "2-digit", day: "2-digit"};
      if (zone) dopts.timeZone = zone;
      var dp2 = new Intl.DateTimeFormat("en-US", dopts).formatToParts(new Date(ep));
      var y = "", mo = "", dy = "";
      for (var j = 0; j < dp2.length; j++){
        if (dp2[j].type === "year") y = dp2[j].value;
        else if (dp2[j].type === "month") mo = dp2[j].value;
        else if (dp2[j].type === "day") dy = dp2[j].value;
      }
      var conv = y + "-" + mo + "-" + dy;
      if (conv !== String(dateStr).slice(0, 10)){
        var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        txt += " (" + MON[+mo - 1] + " " + (+dy) + ")";
      }
    }
    return txt;
  }catch(e){ return null; }
}
function displayZoneTime(timeCT, dateStr){
  if (!timeCT || timeCT === "TBD") return "";
  var ep = ctWallToEpoch(timeCT, dateStr);
  if (ep === null) return timeCT + " " + centralZone(dateStr);
  return epochToZoneLabel(ep, dateStr) || (timeCT + " " + centralZone(dateStr));
}

function logoBtn(short, label, inner, extra){
  return '<span class="logo-btn' + (extra || "") + '" data-team="' + esc(short) + '" role="button" tabindex="0" title="Tap for ' + esc(label) + ' team info">' + inner + "</span>";
}
function teamBadgeStyle(key){
  var e = dirEntry(key);
  if (!e || !e.c1 || !e.c2) return "";
  return "background:" + esc(e.c1) + ";color:" + esc(e.c2) + ";border-color:" + esc(e.c2) + ";";
}
function oppBadge(g){
  var lp = navyLogoFile(g.short);
  if (lp) return logoBtn(g.short, g.opp, '<img class="teamlogo" src="' + esc(lp) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="badge" style="display:none;' + teamBadgeStyle(g.short) + '">' + esc(g.short) + "</span>", logoTileClass(lp));
  return logoBtn(g.short, g.opp, '<span class="badge" style="' + teamBadgeStyle(g.short) + '">' + esc(g.short) + "</span>");
}
// ---------- championship banners (v7) ----------
// Verified Michigan men's ice hockey NCAA title years (mgoblue.com
// national-championships list + Bentley Historical Library, U-M). The title
// year is the spring year of the season, so every banner renders in
// season-span format, e.g. 1948 -> "1947-1948". The count header is derived
// from this list itself, so count and banners can never disagree.
var TITLE_YEARS = [1948, 1951, 1952, 1953, 1955, 1956, 1964, 1996, 1998];
function seasonSpan(y){ return (y - 1) + "-" + y; }
function allTitleYears(){
  var extra = load("extraTitles", []);
  var all = TITLE_YEARS.slice();
  extra.forEach(function(y){ if (all.indexOf(y) === -1) all.push(y); });
  all.sort(function(a, b){ return a - b; });
  return all;
}
function renderBanners(){
  var el = $("#banners"); if (!el) return;
  var years = allTitleYears();
  var html = '<div class="ban-count">' + years.length + "&times; National Champions</div><div class=\"ban-row\">";
  years.forEach(function(y){
    html += '<span class="ban" title="NCAA National Champions ' + seasonSpan(y) + '">NCAA<br><b>' + seasonSpan(y) + "</b></span>";
  });
  html += "</div>";
  el.innerHTML = html;
}
function addTitleYear(y){
  y = +y;
  if (!y || TITLE_YEARS.indexOf(y) !== -1) return false;
  var extra = load("extraTitles", []);
  if (extra.indexOf(y) !== -1) return false;
  extra.push(y); save("extraTitles", extra);
  renderBanners();
  return true;
}
// v21: exact Michigan identity - NEVER match by displayName substring.
// "Western Michigan", "Michigan State", and "Michigan Tech" all contain
// "Michigan", so the old displayName-substring test latched live scores, goal horns,
// notifications, board taps, and title checks onto the wrong team.
// Michigan is matched ONLY by ESPN abbreviation "MICH" or ESPN id 130.
function isMichiganTeam(t){
  if (!t) return false;
  if (t.abbreviation === "MICH") return true;
  if (String(t.id) === "130") return true;
  return false;
}
// Frozen Four final win detection. Rule: April date + finished game +
// Michigan victorious + title-game evidence (ESPN event text mentions
// "championship", or the caller flags titleGame). Simulation-tested only:
// no real title win can be observed until Michigan actually wins one
// (next chance: the April Frozen Four).
function checkTitleWin(ev, dateISO){
  if (!ev || !dateISO) return false;
  var p = dateISO.split("-");
  if (+p[1] !== 4) return false;
  var comp = ev.competitions && ev.competitions[0];
  if (!comp) return false;
  var state = ev.status && ev.status.type ? ev.status.type.state : "";
  if (state !== "post") return false;
  var michC = null, oppC = null;
  comp.competitors.forEach(function(c){
    if (isMichiganTeam(c.team)) michC = c;
    else oppC = c;
  });
  if (!michC || !oppC) return false;
  var ms = parseInt(michC.score, 10), os = parseInt(oppC.score, 10);
  if (isNaN(ms) || isNaN(os) || ms <= os) return false;
  var notes = "";
  try{ notes = (comp.notes || []).map(function(n){ return n.headline || ""; }).join(" "); }catch(e){}
  var text = ((ev.name || "") + " " + notes).toLowerCase();
  if (text.indexOf("championship") === -1 && ev.titleGame !== true) return false;
  return addTitleYear(+p[0]);
}
// April title check: runs with the live refresh in April. Fetches today's
// ESPN scoreboard and applies checkTitleWin to any Michigan event.
function checkAprilTitle(){
  try{
    var now = new Date();
    if (now.getMonth() !== 3) return;
    var iso = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    fetch("https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard?dates=" + iso.replace(/-/g, ""))
      .then(function(r){ return r.json(); }).then(function(j){
        (j.events || []).forEach(function(ev){
          var names = (ev.competitions && ev.competitions[0] && ev.competitions[0].competitors) || [];
          var isMich = names.some(function(c){ return c.team && isMichiganTeam(c.team); });
          if (isMich) checkTitleWin(ev, iso);
        });
      }).catch(function(){});
  }catch(e){}
}
// Backstop: check the official mgoblue title list on live refresh. Only
// years parsed cleanly from that official list are added; a bare count
// mismatch with no parseable years adds NOTHING, never an invented year.
function checkTitleBackstop(){
  try{
    if (typeof fetch !== "function") return;
    fetch("https://mgoblue.com/sports/2017/6/16/history-national-champions").then(function(r){ return r.text(); }).then(function(txt){
      var m = txt.match(/Ice Hockey\s*\(\d+\)\s*\|\s*([0-9, ]+)/);
      if (!m) return;
      m[1].split(",").forEach(function(s){
        var y = parseInt(s.trim(), 10);
        if (y && y > 1900 && y < 2100 && TITLE_YEARS.indexOf(y) === -1) addTitleYear(y);
      });
    }).catch(function(){});
  }catch(e){}
}
// Test hooks (jsdom simulation only; never used in the production flow).
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.addTitleYear = addTitleYear;
window.__vmaxTest.renderBanners = renderBanners;
window.__vmaxTest.checkTitleWin = checkTitleWin;
window.__vmaxTest.isMichiganTeam = isMichiganTeam;
window.__vmaxTest.seasonSpan = seasonSpan;
window.__vmaxTest.updateSectionHTML = updateSectionHTML;
window.__vmaxTest.updateStatusObj = updateStatusObj;
window.__vmaxTest.allTitleYears = allTitleYears;

function runScore(list){
  var m = 0, o = 0, out = [];
  list.forEach(function(s){
    if (s.team === "MICH") m++; else o++;
    out.push({s:s, m:m, o:o});
  });
  return out;
}

// ---------- spotlight ----------
function renderSpotlight(){
  var finals = GAMES.filter(function(g){ return g.status === "final"; });
  var wins = 0, losses = 0, ties = 0;
  finals.forEach(function(g){ if (g.mich > g.oppScore) wins++; else if (g.mich < g.oppScore) losses++; else ties++; });
  var next = null;
  var now = new Date();
  GAMES.forEach(function(g){
    if (g.status === "upcoming" && !next){
      var dt = parseGameTime(g);
      if (!dt || dt.getTime() > now.getTime() - 4*3600*1000) next = g;
    }
  });
  var html = '<div class="spot-in">';
  html += '<div class="spot-rec spot-click" id="spot-rec" role="button" tabindex="0">Record <b>' + wins + "-" + losses + "-" + ties + "</b> &middot; 34 games &middot; 2026&ndash;27</div>";
  if (next){
    html += '<div class="spot-next spot-click" id="spot-next" role="button" tabindex="0"><span class="spot-lbl">NEXT GAME</span><br><b>' + rankStr(next.michRank) + "Michigan " + (next.home ? "vs " : "at ") + esc(next.opp) + "</b><br>" +
      fmtDate(next.date) + timeSeg(next.timeCT, next.date) + " &middot; " + esc(next.venue) + "<br>" +
      '<span class="spot-tv">' + esc(next.tv) + "</span>" +
      ' <span id="countdown"></span></div>';
  }
  html += "</div>";
  $("#spotlight").innerHTML = html;
  var sr = $("#spot-rec");
  if (sr) sr.addEventListener("click", function(){ teamZoomTo("MICH"); });
  if (next){
    var sn = $("#spot-next");
    if (sn) sn.addEventListener("click", function(){
      var d = $("#details-" + next.n);
      if (d){ d.hidden = false; try{ d.scrollIntoView(); }catch(e){} syncBackState(); }
    });
  }
  updateCountdown(next);
  setInterval(function(){ updateCountdown(next); }, 30000);
}
function parseGameTime(g){
  if (!g.timeCT || g.timeCT === "TBD") return null;
  var m = g.timeCT.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!m) return null;
  var h = +m[1], mi = +m[2];
  if (m[3] === "PM" && h !== 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  var p = g.date.split("-");
  // Stored times are Central; Date here uses device local time (user is Central).
  return new Date(+p[0], +p[1]-1, +p[2], h, mi, 0);
}
function updateCountdown(g){
  var el = $("#countdown");
  if (!el || !g) return;
  var dt = parseGameTime(g);
  if (!dt){ el.textContent = ""; return; }
  var diff = dt.getTime() - Date.now();
  if (diff <= 0){ el.textContent = ""; return; }
  if (diff > 24*3600*1000){ el.textContent = ""; return; }
  var h = Math.floor(diff/3600000), mi = Math.floor(diff%3600000/60000);
  el.textContent = " \u00b7 Starts in " + h + "h " + mi + "m";
}

// ---------- details ----------
function boxScoreHTML(g){
  if (g.status !== "final" || !g.periods) return '<div class="boxscore"><div class="box-title">BOX SCORE</div><div class="box-note">Final box score posts here after the game.</div></div>';
  var nper = Math.max((g.periods.mich || []).length, (g.periods.opp || []).length);
  function row(label, a){
    var tot = 0, cells = "";
    for (var i = 0; i < nper; i++){ var v = a[i] || 0; tot += v; cells += "<td>" + v + "</td>"; }
    return "<tr><td>" + label + "</td>" + cells + "<td><b>" + tot + "</b></td></tr>";
  }
  var html = '<div class="boxscore"><div class="box-title">BOX SCORE &middot; FINAL</div><table>';
  var hdr = "<tr><th></th>";
  for (var h = 0; h < nper; h++) hdr += "<th>" + (h < 3 ? (h + 1) : (h === 3 ? "OT" : "OT" + (h - 2))) + "</th>";
  html += hdr + "<th>T</th></tr>";
  html += row("Michigan", g.periods.mich);
  html += row(esc(g.opp), g.periods.opp);
  html += "</table>";
  html += '<div class="box-lines">Shots: Michigan ' + g.shots.mich[3] + " &middot; " + esc(g.opp) + " " + g.shots.opp[3] +
    " &nbsp;|&nbsp; Power play: Michigan " + g.pp.mich + " &middot; " + esc(g.opp) + " " + g.pp.opp +
    " &nbsp;|&nbsp; Penalties: Michigan " + g.pim.mich + " &middot; " + esc(g.opp) + " " + g.pim.opp + "</div>";
  html += "</div>";
  return html;
}
function scoringHTML(g){
  if (g.status !== "final" || !g.scoring) return '<div class="sec"><div class="sec-title">SCORING SUMMARY</div><div class="box-note">Scoring summary posts here after the game.</div></div>';
  var rs = runScore(g.scoring);
  var html = '<div class="sec"><div class="sec-title">SCORING SUMMARY</div>';
  var per = 0;
  rs.forEach(function(r){
    var s = r.s;
    if (s.per !== per){ per = s.per; html += '<div class="per-head">Period ' + per + "</div>"; }
    var teamLabel = s.team === "MICH" ? "Michigan" : g.opp;
    var pteam = s.team === "MICH" ? "MICH" : g.short;
    var note = s.note ? ' <span class="note">(' + esc(s.note) + ")</span>" : "";
    var ast = s.assists && s.assists.length ? " (" + s.assists.map(function(a){ return playerBtn(a, pteam); }).join(", ") + ")" : "";
    html += '<div class="score-line"><span class="score-time">' + esc(s.time) + "</span> " + playerBtn(s.scorer, pteam) + ast + note +
      ' <span class="run-score">' + teamLabel + " " + r.m + "&ndash;" + r.o + "</span></div>";
  });
  html += '<div class="box-link"><a href="' + esc(g.box) + '">Official box score</a></div></div>';
  return html;
}
function goaliesHTML(g){
  if (g.status !== "final" || !g.goalies) return "";
  function gl(list, team){
    return list.map(function(x){ return "<div>" + playerBtn(x.name, team) + " &mdash; " + x.sv + " saves, " + x.ga + " GA, " + esc(x.min) + "</div>"; }).join("");
  }
  return '<div class="sec"><div class="sec-title">GOALTENDING</div><div class="sub-h">Michigan</div>' + gl(g.goalies.mich, "MICH") +
    '<div class="sub-h">' + esc(g.opp) + "</div>" + gl(g.goalies.opp, g.short) + "</div>";
}
function pensHTML(g){
  if (g.status !== "final" || !g.penalties) return "";
  var html = '<div class="sec"><div class="sec-title">PENALTIES</div>';
  var per = 0;
  g.penalties.forEach(function(p){
    if (p.per !== per){ per = p.per; html += '<div class="per-head">Period ' + per + "</div>"; }
    var teamLabel = p.team === "MICH" ? "Michigan" : g.opp;
    html += '<div class="pen-line">' + esc(p.time) + " &mdash; " + esc(teamLabel) + " " + playerBtn(p.player, p.team === "MICH" ? "MICH" : g.short) + ", " + p.min + " min, " + esc(p.off) + "</div>";
  });
  return html + "</div>";
}
function customLinksHTML(g){
  var links = load("links_" + g.n, []);
  var html = '<div class="sec"><div class="sec-title">LINKS</div><div class="chips" id="chips-' + g.n + '">';
  links.forEach(function(l, i){
    html += '<span class="chip"><a href="' + esc(l.url) + '">' + esc(l.label) + '</a> <button class="chip-x" data-g="' + g.n + '" data-i="' + i + '" aria-label="Remove link">&times;</button></span>';
  });
  html += "</div>";
  html += '<div class="addlink"><input type="text" id="ll-' + g.n + '" placeholder="Link label"><input type="url" id="lu-' + g.n + '" placeholder="https://&hellip;">' +
    '<button data-add="' + g.n + '">Add another link</button></div></div>';
  return html;
}
function streamHTML(g){
  var saved = load("stream_" + g.n, "");
  var html = '<div class="sec"><div class="sec-title">VIDEO STREAM</div>';
  if (saved) html += '<div class="stream-saved"><a href="' + esc(saved) + '">Watch &middot; Video stream</a> <button data-stream-play="' + g.n + '">Watch in app</button> <button data-stream-del="' + g.n + '">Remove</button></div>';
  html += '<div class="addlink"><input type="url" id="su-' + g.n + '" placeholder="Paste a stream URL" value="' + esc(saved) + '">' +
    '<button data-stream-save="' + g.n + '">Save stream</button></div></div>';
  return html;
}
// Highlights: exact verified video URL only. Never the channel page,
// never a search page, never a wrong video.
var rssHighlights = {};
function highlightsHTML(g){
  var hl = g.highlights || rssHighlights[g.n];
  if (hl) return '<button class="btn" data-hl="' + esc(hl) + '" data-hl-game="' + g.n + '">Highlights</button>';
  return '<span class="btn btn-note">Highlights: not posted yet</span>';
}
// ---------- global default links (v17): fill once in Settings, show on every game slot ----------
function loadDefaultLinks(){ try{ var v = load("default_links", {}); return (v && typeof v === "object") ? v : {}; }catch(e){ return {}; } }
function defaultLinksHTML(){
  var dl = loadDefaultLinks();
  var lines = "";
  if (dl.stream) lines += '<div class="tv-line">Your default stream: <a href="' + esc(dl.stream) + '">' + esc(dl.stream) + "</a></div>";
  if (dl.radio) lines += '<div class="tv-line">Your default radio: <a href="' + esc(dl.radio) + '">' + esc(dl.radio) + "</a></div>";
  if (dl.highlights) lines += '<div class="tv-line">Your default highlights source: <a href="' + esc(dl.highlights) + '">' + esc(dl.highlights) + "</a></div>";
  if (!lines) return "";
  return '<div class="sec"><div class="sec-title">YOUR DEFAULT LINKS</div>' + lines +
    '<div class="tv-note">Set in Settings — these apply to every game slot. Per-game links above are separate and additional.</div></div>';
}
function refreshAllDetails(){
  try{
    GAMES.forEach(function(g){
      var dd = $("#details-" + g.n);
      if (dd) refreshDetails(g.n);
    });
  }catch(e){}
}
// ---------- watch sources (v17): every slot lists all verified sources ----------
var LIVE_ESPN_GAME_IDS = {};
function watchOutletName(url, tv){
  if (!url) return tv || "";
  if (/btnplus/.test(url)) return "B1G+";
  if (/peacocktv/.test(url)) return "Peacock";
  if (/nchchockey/.test(url)) return "NCHC.tv";
  if (/foxsports/.test(url)) return "Fox Sports app";
  return tv || url;
}
function watchSourcesHTML(g){
  var html = '<div class="sec"><div class="sec-title">WATCH SOURCES</div>';
  html += '<div class="tv-line">FREE — WCBN Sports radio: <button class="btn" data-listen="' + g.n + '">Listen in app</button></div>';
  if (g.tv) html += '<div class="tv-line">TV: ' + esc(g.tv) + '</div>';
  if (g.watch){
    var outlet = watchOutletName(g.watch, g.tv);
    html += '<div class="tv-line">SUBSCRIPTION — ' + esc(outlet) + ': <a href="' + esc(g.watch) + '">Watch on ' + esc(outlet) + '</a> (outlet page — event deep link not verified, so the outlet itself is linked)</div>';
  }
  if (g.watch2){
    var outlet2 = watchOutletName(g.watch2, g.tv);
    html += '<div class="tv-line">SUBSCRIPTION — ' + esc(outlet2) + ': <a href="' + esc(g.watch2) + '">Watch on ' + esc(outlet2) + '</a> (outlet page — event deep link not verified, so the outlet itself is linked)</div>';
  }
  var egid = LIVE_ESPN_GAME_IDS[g.n] || null;
  var hl = g.highlights || (typeof rssHighlights !== "undefined" && rssHighlights[g.n]);
  if (hl) html += '<div class="tv-line">' + highlightsHTML(g) + ' <span class="tv-note">FREE</span></div>';
  else html += '<div class="tv-line">' + highlightsHTML(g) + '</div>';
  html += '<div class="tv-note">Subscription sign-in persists: sign in once in your browser or the outlet\'s app and later games reuse that session — the app never forces a re-login (the outlet\'s own session expiry still applies).</div>';
  return html + '</div>';
}
// v32.6: 5 user channel slots per game. The verified carrier stays shown
// above for reference; these are the user's own alternative channels.
// Each slot: label (optional), URL, kind (Stream/Radio/Other), and Free
// vs Subscription. Saved slots display with their FREE/SUBSCRIPTION tag.
var GAME_SLOT_KINDS = ["stream", "radio", "other"];
function emptyGameSlot(){ return {label: "", url: "", kind: "stream", paid: false}; }
function loadGameSlots(storeKey){
  try{
    var v = load("slots_" + storeKey, null);
    if (v && v.length){
      var out = [];
      for (var i = 0; i < 5; i++){ var s = v[i] || {}; out.push({label: String(s.label || ""), url: String(s.url || ""), kind: (GAME_SLOT_KINDS.indexOf(s.kind) !== -1) ? s.kind : "stream", paid: !!s.paid}); }
      return out;
    }
  }catch(e){}
  var legacyStream = "", legacyLinks = [];
  try{
    if (storeKey.indexOf("game_") === 0){ var n = storeKey.slice(5); legacyStream = load("stream_" + n, ""); legacyLinks = load("links_" + n, []); }
    else if (storeKey.indexOf("board_") === 0){ var bid = storeKey.slice(6); legacyStream = load("board_stream_" + bid, ""); legacyLinks = load("board_links_" + bid, []); }
  }catch(e){}
  if (legacyStream || (legacyLinks && legacyLinks.length)){
    var slots = [];
    if (legacyStream) slots.push({label: "", url: String(legacyStream), kind: "stream", paid: false});
    (legacyLinks || []).forEach(function(l){ if (slots.length < 5) slots.push({label: String(l.label || ""), url: String(l.url || ""), kind: "other", paid: false}); });
    while (slots.length < 5) slots.push(emptyGameSlot());
    try{ save("slots_" + storeKey, slots); }catch(e){}
    return slots;
  }
  var fresh = []; for (var k = 0; k < 5; k++) fresh.push(emptyGameSlot());
  return fresh;
}
function slotDomain(url){
  try{ var h = new URL(url).hostname || ""; return h.replace(/^www\./, ""); }catch(e){ return String(url).slice(0, 40); }
}
function slotKindLabel(kind){ return kind === "radio" ? "Radio" : (kind === "other" ? "Other" : "Stream"); }
function gameSlotsInner(storeKey){
  var slots = loadGameSlots(storeKey);
  var html = '<div class="tv-note">The verified channel is shown above for reference. Add up to 5 of your own alternative channels here — they display as FREE unless you mark them SUBSCRIPTION.</div>';
  html += '<div id="slots-saved-' + esc(storeKey) + '">';
  slots.forEach(function(s, i){
    if (!s.url) return;
    var name = s.label ? esc(s.label) : (slotKindLabel(s.kind) + " · " + esc(slotDomain(s.url)));
    html += '<div class="tv-line"><button data-slot-play="' + esc(storeKey) + '|' + i + '" type="button">Play</button> ' + name +
      ' <span class="tv-news-meta">' + (s.paid ? "SUBSCRIPTION" : "FREE") + '</span>' +
      ' <button data-slot-del="' + esc(storeKey) + '|' + i + '" type="button" aria-label="Remove channel">&times;</button></div>';
  });
  html += '</div>';
  slots.forEach(function(s, i){
    html += '<div class="addlink slot-row"><input type="text" data-slot-label placeholder="Label (optional)" value="' + esc(s.label) + '">' +
      '<input type="url" data-slot-url placeholder="Paste a URL" value="' + esc(s.url) + '">' +
      '<select data-slot-kind><option value="stream"' + (s.kind === "stream" ? " selected" : "") + '>Stream</option><option value="radio"' + (s.kind === "radio" ? " selected" : "") + '>Radio</option><option value="other"' + (s.kind === "other" ? " selected" : "") + '>Other</option></select>' +
      '<select data-slot-access><option value="free"' + (!s.paid ? " selected" : "") + '>Free</option><option value="sub"' + (s.paid ? " selected" : "") + '>Subscription</option></select></div>';
  });
  html += '<div><button data-slot-save="' + esc(storeKey) + '" type="button">Save channels</button></div>';
  return html;
}
function gameSlotsHTML(storeKey){
  return '<div class="sec" id="slots-sec-' + esc(storeKey) + '"><div class="sec-title">YOUR CHANNELS</div>' + gameSlotsInner(storeKey) + '</div>';
}
function refreshGameSlots(storeKey){
  var sec = document.getElementById("slots-sec-" + storeKey); if (!sec) return;
  sec.innerHTML = '<div class="sec-title">YOUR CHANNELS</div>' + gameSlotsInner(storeKey);
}
document.addEventListener("click", function(e){
  var sv = e.target.getAttribute && e.target.getAttribute("data-slot-save");
  if (sv){
    var sec = document.getElementById("slots-sec-" + sv); if (!sec) return;
    var rows = sec.querySelectorAll(".slot-row"), slots = [];
    rows.forEach(function(r){
      var lb = r.querySelector("[data-slot-label]"), ub = r.querySelector("[data-slot-url]"),
          kb = r.querySelector("[data-slot-kind]"), ab = r.querySelector("[data-slot-access]");
      slots.push({label: lb ? lb.value.trim() : "", url: ub ? ub.value.trim() : "", kind: kb ? kb.value : "stream", paid: ab ? (ab.value === "sub") : false});
    });
    while (slots.length < 5) slots.push(emptyGameSlot());
    save("slots_" + sv, slots.slice(0, 5));
    refreshGameSlots(sv);
    return;
  }
  var dl = e.target.getAttribute && e.target.getAttribute("data-slot-del");
  if (dl){
    var bar = dl.lastIndexOf("|"); var sk = dl.slice(0, bar), idx = +dl.slice(bar + 1);
    var cur = loadGameSlots(sk); if (cur[idx]) cur[idx] = emptyGameSlot();
    save("slots_" + sk, cur);
    refreshGameSlots(sk);
    return;
  }
  var pl = e.target.getAttribute && e.target.getAttribute("data-slot-play");
  if (pl){
    var bar2 = pl.lastIndexOf("|"); var slots2 = loadGameSlots(pl.slice(0, bar2)); var s = slots2[+pl.slice(bar2 + 1)];
    if (s && s.url) openVideoWindow(s.url, slotKindLabel(s.kind) + (s.label ? " · " + s.label : ""));
    return;
  }
});
// v32.6: one delegated highlights-play listener for every [data-gd-hl]
 // button (board detail + Michigan home details). Delegation survives
 // re-renders; each button carries its own URL/title attributes.
document.addEventListener("click", function(e){
  var b = (e.target && e.target.closest) ? e.target.closest("[data-gd-hl]") : null;
  if (!b) return;
  var url = b.getAttribute("data-hl-url"), title = b.getAttribute("data-hl-title");
  if (url) playGameHighlight(url, title || "Highlights");
});
// v32.12: game-link clicks are handled by ONE top-level delegated listener.
// It used to be registered inside renderGames(), so every re-render (boot,
// live-score change, feed fill) added another copy: one tap on a custom
// link's x then deleted several links, and highlight/radio taps fired
// repeatedly.
function handleGameLinkClick(e){
  var lb = e.target.getAttribute && e.target.getAttribute("data-listen");
  if (lb){ startRadio(+lb); return; }
  var hl = e.target.getAttribute && e.target.getAttribute("data-hl");
  if (hl){ var gn = +e.target.getAttribute("data-hl-game"); var gg = null; try{ gg = GAMES.filter(function(x){ return x.n === gn; })[0]; }catch(e){} var ht = gg ? ("Highlights \u00b7 " + (gg.home ? "Michigan vs " : "Michigan at ") + gg.opp + " (" + fmtDate(gg.date) + ")") : ("Highlights \u00b7 Game " + gn); playGameHighlight(hl, ht); return; }
  var sp = e.target.getAttribute && e.target.getAttribute("data-stream-play");
  if (sp){ var su = load("stream_" + sp, ""); if (su) openVideoWindow(su, "Game " + sp + " \u00b7 Video stream"); return; }
  var add = e.target.getAttribute && e.target.getAttribute("data-add");
  if (add){
    var n = +add;
    var label = $("#ll-" + n).value.trim(), url = $("#lu-" + n).value.trim();
    if (!label || !url) return;
    var links = load("links_" + n, []);
    links.push({label:label, url:url});
    save("links_" + n, links);
    refreshDetails(n);
    return;
  }
  var x = e.target.getAttribute && e.target.getAttribute("data-i");
  if (e.target.className === "chip-x" && x !== null){
    var gn = +e.target.getAttribute("data-g"), gi = +x;
    var links2 = load("links_" + gn, []);
    links2.splice(gi, 1);
    save("links_" + gn, links2);
    refreshDetails(gn);
    return;
  }
  var ss = e.target.getAttribute && e.target.getAttribute("data-stream-save");
  if (ss){
    var sn = +ss;
    var su = $("#su-" + sn).value.trim();
    if (su) save("stream_" + sn, su);
    refreshDetails(sn);
    return;
  }
  var sd = e.target.getAttribute && e.target.getAttribute("data-stream-del");
  if (sd){
    save("stream_" + (+sd), "");
    refreshDetails(+sd);
  }
}
document.addEventListener("click", handleGameLinkClick);
function detailsHTML(g){
  var html = '<div class="details-in">';
  if (g.status === "final"){
    html += '<div class="sec"><div class="sec-title">FINAL</div>' +
      "<div><b>Score</b> &mdash; Michigan " + esc(String(g.mich)) + "&ndash;" + esc(g.opp) + " " + esc(String(g.oppScore)) + "</div>" +
      "<div><b>When</b> &mdash; " + fmtDate(g.date) + timeSeg(g.timeCT, g.date) + "</div>" +
      "<div><b>Where</b> &mdash; " + venueBtn(g.venue) + "</div></div>";
  }
  var dh2h = h2hLine("MICH", g.short);
  if (dh2h) html += '<div class="sec"><div class="sec-title">SERIES HISTORY</div><div>' + esc(dh2h) + "</div></div>";
  if (g.status === "final"){
    html += boxScoreHTML(g) + '<div id="mich-boxscore-lines-' + g.n + '">Loading box score\u2026</div>';
  } else if (g.date && g.date <= todayISOlocal()){
    html += '<div id="mich-boxscore-lines-' + g.n + '">Loading box score…</div>';
  } else {
    html += boxScoreHTML(g);
  }
  if (g.status === "final"){
    html += scoringHTML(g) + goaliesHTML(g) + pensHTML(g);
  } else {
    html += '<div class="sec"><div class="sec-title">GAME PREVIEW</div>' +
      "<div><b>When</b> &mdash; " + fmtDate(g.date) + timeSeg(g.timeCT, g.date) + "</div>" +
      "<div><b>Where</b> &mdash; " + venueBtn(g.venue) + "</div>" +
      "<div><b>Watch</b> &mdash; " + esc(g.tv) + '</div>' +
      "<div><b>Listen</b> &mdash; WCBN Sports</div>";
    if (g.n === 8) html += "<div><b>Record</b> &mdash; Michigan enters this game 7&ndash;0</div><div><b>Last time out</b> &mdash; Michigan 3&ndash;2 Western Michigan (W)</div>";
    html += "</div>";
  }
  var pd = (typeof TEAM_DATA !== "undefined" && TEAM_DATA[g.short]) || null;
  var oppLine = "";
  if (pd){
    var lr = (typeof LIVE_RANKS !== "undefined" && LIVE_RANKS) ? LIVE_RANKS[g.short] : null;
    var rankTxt = (typeof lr === "number") ? ("#" + lr + " (live)") : (pd.rank ? ("#" + pd.rank + " (as of " + esc(pd.rank_asof || "undated") + ")") : "unranked");
    var recTxt = pd.record ? (esc(pd.record) + " (as of " + esc(pd.record_asof || "undated") + ")") : "record not verified";
    oppLine = '<div class="sec"><div class="sec-title">OPPONENT &mdash; ' + esc(g.opp) + '</div>' +
      "<div><b>Record</b> &mdash; " + recTxt + "</div>" +
      "<div><b>Ranking</b> &mdash; " + rankTxt + "</div>" +
      (pd.arena ? "<div><b>Home arena</b> &mdash; " + esc(pd.arena) + "</div>" : "") +
      (pd.coach ? "<div><b>Head coach</b> &mdash; " + esc(pd.coach) + "</div>" : "") +
      "</div>";
  }
  html += oppLine;
  html += watchSourcesHTML(g);
  html += gameSlotsHTML("game_" + g.n) + defaultLinksHTML();
  var michHl = (g.date && g.short) ? gameHighlightURL("MICH", g.short, g.date) : null;
  if (michHl) html += '<div class="sec"><div class="sec-title">HIGHLIGHTS</div><div class="tv-line"><button data-gd-hl data-hl-url="' + esc(michHl.url) + '" data-hl-title="' + esc(michHl.title) + '" type="button">Watch highlights</button> ' + esc(michHl.title) + ' — plays in the app, fullscreen.</div></div>';
  html += "</div>";
  return html;
}

// ---------- player pages (v7) ----------
function normName(s){ return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim(); }
function michBio(name){
  if (typeof PLAYERS_MICH !== "undefined" && PLAYERS_MICH[name]) return PLAYERS_MICH[name];
  if (typeof PLAYERS_MICH === "undefined") return null;
  var n = normName(name), found = null;
  Object.keys(PLAYERS_MICH).forEach(function(k){ if (normName(k) === n) found = PLAYERS_MICH[k]; });
  return found;
}
// ---------- player photos (v25) ----------
// Photo priority, never a guessed URL:
//  1. Michigan: saved mgoblue headshot via michBio (unchanged).
//  2. College Hockey News roster page, fetched live at runtime from the
//     pack's recorded roster_url (collegehockeynews.com only) and parsed
//     name -> image from that page itself. The page's numeric player ids
//     are NOT predictable, so no photo URL is ever constructed from a name.
//  3. Official roster page (p2): the pack's non-CHN roster_url, fetched
//     live and parsed name -> image from that page itself, name-matched
//     against the known roster only — never a constructed URL.
//  4. ESPN roster feed: a.headshot.href, only when the feed provides one.
//  5. Initials badge (unchanged fallback).
var chnPhotoCache = {};   // key -> { normName -> {photo, name, jersey, cls, pos, ht, wt, hometown, draft} }
var chnPhotoState = {};   // key -> "loading" | "done" | "none"
var chnPhotoWaiters = {}; // key -> [onDone callbacks waiting on a live fetch]
var CHN_HS_SEG = "images/hs/team/";
function chnRosterURL(key){
  try{
    var pd = (typeof packData === "function") ? packData(key) : null;
    var u = pd && pd.headshots && pd.headshots.roster_url;
    if (typeof u === "string" && u.indexOf("http://www.collegehockeynews.com/reports/roster/") === 0) u = "https://" + u.slice(7);
    if (typeof u === "string" && u.indexOf("https://www.collegehockeynews.com/reports/roster/") === 0) return u;
  }catch(e){}
  return null;
}
// v32.24: CHN image-filename second factor. True when the filename stem
// names the same player as the row display name (tolerates initial-only
// first names, O'Brien/O_brien-style stems, suffixes, middle names).
function chnFilenameAgrees(url, displayName){
  try{
    var stem = String(url || "").split("/").pop().split("?")[0].split("#")[0];
    stem = stem.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
    stem = stem.replace(/^\d+_/, "");
    var parts = stem.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length < 2) return false;
    var fFirst = parts.slice(0, -1).join(" ").replace(/[^a-z]/g, "").toLowerCase();
    var fLast = parts[parts.length - 1].replace(/[^a-z]/g, "").toLowerCase();
    var dn = String(displayName || "").replace(/\b(jr|sr|ii|iii|iv)\b\.?$/i, "").trim();
    var toks = dn.split(/\s+/).filter(Boolean);
    if (toks.length < 2) return false;
    var dFirst = toks[0].replace(/[^a-z]/gi, "").toLowerCase();
    var dLast = toks[toks.length - 1].replace(/[^a-z]/gi, "").toLowerCase();
    var firstOk = (fFirst === dFirst) || (fFirst.length === 1 && dFirst.charAt(0) === fFirst) || (dFirst.length === 1 && fFirst.charAt(0) === dFirst);
    var lastOk = (fLast === dLast) || (fLast.length >= 4 && dLast.length >= 4 && (dLast.indexOf(fLast) === 0 || fLast.indexOf(dLast) === 0));
    return firstOk && lastOk;
  }catch(e){ return false; }
}
// v32.31: CHN filename token-set second factor. The first factor above
// joins all-but-last stem parts into one first name, so it rejects
// hyphenated last names (aaram_olsen), multi-part names (de st hubert),
// parenthetical nicknames (haoxi (simon)_wang), and percent-encoded
// diacritics (n%C3%B6rringer) even though the filename names the player.
// This path binds ONLY on exact ordered token-set equality after
// decoding, paren-stripping, and diacritic folding on BOTH sides — a
// filename naming a different player cannot produce the same ordered
// token list. Single-token stems (placeholder, logo) never bind.
function chnFileTokens(s){
  try{
    var t = String(s || "").replace(/\([^)]*\)/g, " ");
    t = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return t.replace(/[^a-z]+/g, " ").split(" ").filter(function(w){ return !!w; });
  }catch(e){ return []; }
}
function chnFilenameTokenSetAgrees(url, displayName){
  try{
    var stem = String(url || "").split("/").pop().split("?")[0].split("#")[0];
    stem = stem.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
    stem = stem.replace(/^\d+_/, "");
    try{ stem = decodeURIComponent(stem); }catch(e){}
    var ft = chnFileTokens(stem);
    var dt = chnFileTokens(displayName);
    while (dt.length && /^(jr|sr|ii|iii|iv)$/.test(dt[dt.length - 1])) dt.pop();
    if (ft.length < 2 || dt.length < 2 || ft.length !== dt.length) return false;
    for (var i = 0; i < ft.length; i++) if (ft[i] !== dt[i]) return false;
    return true;
  }catch(e){ return false; }
}
var chnPhotoConflicts = {};
function parseChnRosterHTML(htmlText, pageUrl, teamKey){
  var out = {};
  try{
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var rows = doc.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++){
      var img = rows[i].querySelector("img");
      if (!img) continue;
      var src = img.getAttribute("src") || "";
      if (src.indexOf(CHN_HS_SEG) === -1) continue;
      var full = src;
      try{ full = new URL(src, pageUrl).href; }catch(e){}
      if (full.indexOf("https://www.collegehockeynews.com/" + CHN_HS_SEG) !== 0) continue;
      var cells = rows[i].querySelectorAll("td");
      if (cells.length < 3) continue;
      var txt = function(c){ return (cells[c] ? cells[c].textContent : "").replace(/\s+/g, " ").trim(); };
      var rawName = txt(2);
      if (rawName.indexOf(",") === -1) continue;
      var parts = rawName.split(",");
      var first = parts[1].trim().replace(/\s+[CA]$/, ""), last = parts[0].trim();
      if (!first || !last) continue;
      var display = first + " " + last;
      var photoOk = full;
      if (photoOk && !chnFilenameAgrees(photoOk, display) && !chnFilenameTokenSetAgrees(photoOk, display)){
        try{
          var ck = teamKey || "unknown";
          if (!chnPhotoConflicts[ck]) chnPhotoConflicts[ck] = [];
          chnPhotoConflicts[ck].push({name: display, url: photoOk, reason: "filename disagrees with row name"});
        }catch(e){}
        photoOk = null;
      }
      out[normName(display)] = {photo: photoOk, name: display,
        jersey: txt(1) || null, cls: txt(3) || null, pos: txt(4) || null,
        ht: txt(5) || null, wt: txt(6) || null, hometown: txt(8) || null,
        draft: (cells.length > 10 ? txt(10) : null) || null};
    }
  }catch(e){ return {}; }
  return out;
}
function chnPhotoFor(name, team){
  var m = chnPhotoCache[team];
  if (!m) return null;
  // v32.31: hyphen-folded lookup fallback (photo retrieval only). CHN
  // rows and team-data.js can hyphenate a multi-part surname differently
  // ("Anthony Allain Samake" vs "Anthony Allain-Samake"); normName
  // strips hyphens without spacing, so the exact key misses. The exact
  // key is always tried first; the folded key only rescues that variant.
  return m[normName(name)] || m[normName(String(name).replace(/-/g, " "))] || null;
}
// v32.24: ESPN photos attach by athlete id through the accelerator cache;
// the legacy exact-name path requires jersey agreement when a jersey is given.
var espnAccelCache = {};
function espnPhotoFor(name, team, jersey){
  // v32.24: jersey agreement disambiguates same-name duplicates ONLY. When
  // exactly one cache entry matches the name, there is no ambiguity to
  // resolve, so a saved-vs-feed number difference (the accelerator's normal
  // case: the span carries the saved number, the feed carries the live one)
  // must not block the photo. Multiple differing entries stay unmatched.
  var rows = espnAccelCache[team] || [];
  for (var i = 0; i < rows.length; i++){
    if (rows[i].name === name){
      if (jersey !== undefined && jersey !== null && jersey !== "" && rows[i].jersey !== undefined && rows[i].jersey !== null && String(rows[i].jersey) !== String(jersey)) continue;
      if (rows[i].headshot) return rows[i].headshot;
    }
  }
  var only = null; var count = 0;
  for (var k = 0; k < rows.length; k++){
    if (rows[k].name === name && rows[k].headshot){ only = rows[k].headshot; count++; }
  }
  if (count === 1) return only;
  var rows2 = genericRosterCache[team] || [];
  for (var j = 0; j < rows2.length; j++){
    if (rows2[j].name === name){
      if (jersey !== undefined && jersey !== null && jersey !== "" && rows2[j].jersey !== undefined && rows2[j].jersey !== null && String(rows2[j].jersey) !== String(jersey)) continue;
      if (rows2[j].headshot) return rows2[j].headshot;
    }
  }
  var only2 = null; var count2 = 0;
  for (var m = 0; m < rows2.length; m++){
    if (rows2[m].name === name && rows2[m].headshot){ only2 = rows2[m].headshot; count2++; }
  }
  if (count2 === 1) return only2;
  return null;
}
// v32.24: ranked photo swap. Replaces a .pinitial placeholder always, and
// replaces an existing <img> only when the incoming rank is higher — this
// ends first-fill-wins on both the roster table and the player page.
// Ranks: saved Michigan 4, CHN 3, official 2, ESPN 1, initials 0.
function swapPhotoEl(el, url, rank){
  try{
    if (!el || !url) return;
    var cur = el.getAttribute("data-photo-rank");
    var curRank = cur === null ? 0 : parseInt(cur, 10);
    if (isNaN(curRank)) curRank = 0;
    if (el.tagName === "IMG"){
      if (rank > curRank){ el.src = url; el.setAttribute("data-photo-rank", String(rank)); }
      return;
    }
    if (el.className && el.className.indexOf("pinitial") !== -1){
      var img = document.createElement("img");
      img.className = el.className.replace("pinitial", "").replace(/\s+/g, " ").trim();
      img.setAttribute("src", url);
      img.setAttribute("alt", "");
      img.setAttribute("data-photo-rank", String(rank));
      ["data-player", "data-player-team", "data-player-num", "role", "tabindex", "title"].forEach(function(a){
        var v = el.getAttribute(a); if (v !== null) img.setAttribute(a, v);
      });
      if (el.parentNode) el.parentNode.replaceChild(img, el);
    }
  }catch(e){}
}
// v32.24: every live-data fetch aborts at 15s (the tick scoreboard keeps
// its 10s abort). Falls back to a plain fetch where AbortController is absent.
function fetchWithTimeout(url, ms){
  // v32.24: the timeout MUST fire even if the fetch implementation ignores
  // the abort signal (a signal-only timeout hangs forever on such fetches).
  // One timer both aborts and rejects the race; it is cleared on settle.
  var timeout = ms || 15000;
  try{
    if (typeof AbortController === "function"){
      var ctl = new AbortController();
      var rej = null;
      var timer = new Promise(function(_, reject){ rej = reject; });
      var t = setTimeout(function(){ try{ ctl.abort(); }catch(e){} if (rej) rej(new Error("fetch timeout")); }, timeout);
      var p = fetch(url, {signal: ctl.signal});
      p.then(function(){ clearTimeout(t); }, function(){ clearTimeout(t); });
      return Promise.race([p, timer]);
    }
  }catch(e){}
  return fetch(url);
}
function loadChnPhotos(key, onDone){
  if (!key) return;
  if (chnPhotoState[key] === "done") return;
  if (onDone){ (chnPhotoWaiters[key] = chnPhotoWaiters[key] || []).push(onDone); }
  if (chnPhotoState[key] === "loading") return;
  var url = chnRosterURL(key);
  if (!url || typeof fetch !== "function"){ chnPhotoState[key] = "none"; chnPhotoWaiters[key] = []; return; }
  chnPhotoState[key] = "loading";
  fetchWithTimeout(url, 15000).then(function(r){ return r.text(); }).then(function(t){
    chnPhotoCache[key] = parseChnRosterHTML(t, url, key);
    chnPhotoState[key] = "done";
    applyChnPhotos(key);
    var ws = chnPhotoWaiters[key] || []; chnPhotoWaiters[key] = [];
    ws.forEach(function(fn){ try{ fn(); }catch(e){} });
  }).catch(function(){ chnPhotoState[key] = "none"; chnPhotoWaiters[key] = []; });
}
// ---------- official roster-page photos (p2) ----------
// Second photo path for teams whose pack roster_url is the school's own
// roster page (SIDEARM and similar), NOT a College Hockey News page.
// Same honesty rules as the CHN path: a photo is stored ONLY when the
// image belongs to a name already on this team's known roster (saved pack
// roster or ESPN feed cache) — never a constructed URL, never a guess.
// PDF roster URLs are skipped (not HTML, nothing to parse). Fetch failure
// or an unparseable page simply leaves the ESPN/initials fallbacks in
// place; nothing is ever shown as data that failed to load.
var officialPhotoCache = {};   // key -> { normName -> {photo, name} }
var officialPhotoState = {};   // key -> "loading" | "done" | "none"
var officialPhotoWaiters = {}; // key -> [onDone callbacks waiting on a live fetch]
var OFFICIAL_SKIP_TOKENS = ["placeholder", "no-photo", "nophoto", "silhouette", "default-player", "headshot-default", "logo", "spacer"];
function officialRosterURL(key){
  try{
    var pd = (typeof packData === "function") ? packData(key) : null;
    var u = pd && pd.headshots && pd.headshots.roster_url;
    if (typeof u !== "string") return null;
    if (u.indexOf("https://www.collegehockeynews.com/reports/roster/") === 0) return null;
    if (u.indexOf("http://www.collegehockeynews.com/reports/roster/") === 0) return null;
    if (!/^https?:\/\//.test(u)) return null;
    if (/\.pdf(\?|#|$)/i.test(u)) return null;
    return u;
  }catch(e){ return null; }
}
function officialKnownNames(key){
  var names = [];
  // v32.24: known names come from the merged model (saved roster +
  // confirmed live additions) — never from the ESPN-only feed cache, so
  // an ESPN-only name can never gain an official photo by association.
  try{
    var model = buildMergedModel(key);
    model.players.forEach(function(p){ if (p.name) names.push(p.name); });
    if (names.length) return names;
  }catch(e){}
  try{ var pd = packData(key); if (pd && pd.roster) pd.roster.forEach(function(pp){ if (pp.name) names.push(pp.name); }); }catch(e){}
  try{ (genericRosterCache[key] || []).forEach(function(pp){ if (pp.name) names.push(pp.name); }); }catch(e){}
  return names;
}
function officialNameTokens(str){
  return (str || "").toLowerCase().replace(/[^a-z0-9' \-]/g, " ").split(/\s+/).filter(function(w){ return !!w; });
}
function officialContainsName(candidateTokens, knownTokens){
  if (!knownTokens.length || candidateTokens.length < knownTokens.length) return false;
  for (var i = 0; i + knownTokens.length <= candidateTokens.length; i++){
    var ok = true;
    for (var j = 0; j < knownTokens.length; j++){ if (candidateTokens[i + j] !== knownTokens[j]){ ok = false; break; } }
    if (ok) return true;
  }
  return false;
}
// v32.31: NextGen-card fallback helpers. Tokenization reuses normName
// per split part (so diacritic folding matches the rest of the parser
// without new escape sequences): split on non-alphanumerics, drop
// parentheticals and pure-number tokens, fold each part via normName.
function officialFileTokens(s){
  try{
    var t = String(s || "").replace(/\([^)]*\)/g, " ");
    var parts = t.split(/[^A-Za-z0-9]+/).filter(function(w){ return !!w; });
    var out = [];
    for (var i = 0; i < parts.length; i++){
      if (/^\d+$/.test(parts[i])) continue;
      var n = normName(parts[i]);
      if (n){ var sp = n.split(" "); for (var j = 0; j < sp.length; j++) if (sp[j]) out.push(sp[j]); }
    }
    return out;
  }catch(e){ return []; }
}
function officialTokenMultisetEqual(a, b){
  if (a.length !== b.length || a.length < 2) return false;
  return a.slice().sort().join(" ") === b.slice().sort().join(" ");
}
function officialFilenameTokens(url){
  try{
    var u = String(url || "");
    var m = u.match(/[?&]url=([^&]*)/);
    var base = u;
    if (m){ try{ base = decodeURIComponent(m[1]); }catch(e){ base = m[1]; } }
    base = base.split("?")[0].split("#")[0].split("/").pop();
    base = base.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
    return officialFileTokens(base);
  }catch(e){ return []; }
}
function officialRosterSlug(img){
  try{
    var link = null, anc = img.parentNode, depth = 0;
    while (anc && depth < 8 && !link){
      if (anc.tagName === "A" && anc.getAttribute){
        var h = anc.getAttribute("href") || "";
        if (h.indexOf("/roster/") !== -1) link = h;
      }
      if (!link && anc.querySelectorAll){
        var imgs = anc.querySelectorAll("img");
        var links = anc.querySelectorAll('a[href*="/roster/"]');
        if (imgs.length === 1 && links.length === 1) link = links[0].getAttribute("href") || "";
      }
      anc = anc.parentNode; depth++;
    }
    if (!link) return "";
    var segs = link.split("?")[0].split("#")[0].split("/").filter(function(s){ return !!s; });
    var start = -1;
    for (var i = segs.length - 1; i >= 0; i--){
      if (segs[i] === "roster" || segs[i] === "player"){ start = i + 1; break; }
    }
    var take = (start >= 0 ? segs.slice(start) : segs.slice(-1)).filter(function(s){ return !/^\d+$/.test(s); });
    return take.join("-");
  }catch(e){ return ""; }
}
function parseOfficialRosterHTML(htmlText, pageUrl, knownNames){
  var out = {};
  try{
    var known = (knownNames || []).map(function(n){ return {norm: normName(n), tokens: officialNameTokens(n), display: n}; }).filter(function(k){ return k.tokens.length >= 2; });
    if (!known.length) return out;
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var imgs = doc.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++){
      var img = imgs[i];
      var src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (!src || src.indexOf("data:") === 0) continue;
      var low = src.toLowerCase();
      if (/\.svg(\?|#|$)/.test(low)) continue;
      var skipped = false;
      OFFICIAL_SKIP_TOKENS.forEach(function(t){ if (low.indexOf(t) !== -1) skipped = true; });
      if (skipped) continue;
      var full = "";
      try{ full = new URL(src, pageUrl).href; }catch(e){ continue; }
      if (!/^https?:\/\//.test(full)) continue;
      var hit = null;
      var blocked = false;
      var cands = [];
      var alt = img.getAttribute("alt") || "";
      if (alt) cands.push(alt);
      // v32.24: ONLY the nearest text-bearing ancestor counts. Climbing to
      // broader ancestors let news-rail/action images inherit a roster
      // player's name. An ancestor naming 2+ known players blocks the image.
      var anc = img.parentNode, depth = 0;
      while (anc && depth < 4 && anc.textContent){
        if (anc.querySelectorAll && anc.querySelectorAll("img").length > 1) break;
        var t = (anc.textContent || "").replace(/\s+/g, " ").trim();
        if (t){
          if (t.length <= 300) cands.push(t);
          break;
        }
        anc = anc.parentNode; depth++;
      }
      for (var c = 0; c < cands.length && !hit && !blocked; c++){
        var cn = normName(cands[c]);
        for (var k = 0; k < known.length; k++){
          if (cn === known[k].norm){ hit = known[k]; break; }
        }
        if (hit) break;
        var ct = officialNameTokens(cands[c]);
        var matches = [];
        for (var k2 = 0; k2 < known.length; k2++){
          if (officialContainsName(ct, known[k2].tokens)) matches.push(known[k2]);
        }
        if (matches.length === 1) hit = matches[0];
        else if (matches.length > 1) blocked = true;
      }
      // v32.31: NextGen-card fallbacks (only when the ancestor path found
      // nothing and nothing was ambiguous). Each signal binds ONLY on an
      // exact, unique name agreement — never on a partial match.
      if (!hit && !blocked){
        // (F) image-filename signal: sidearmdev crop URLs embed the
        // original filename in the url= param (Last__First.jpg); classic
        // pages use the basename itself. Token multiset must equal
        // exactly one known name's token multiset.
        var fn = officialFilenameTokens(full);
        if (fn.length >= 2){
          var fm = [];
          for (var fi = 0; fi < known.length; fi++){
            if (officialTokenMultisetEqual(fn, officialFileTokens(known[fi].display))) fm.push(known[fi]);
          }
          if (fm.length === 1) hit = fm[0];
          else if (fm.length > 1) blocked = true;
        }
      }
      if (!hit && !blocked){
        // (S) roster-link slug signal: nearest enclosing roster <a>, else
        // the single-link + single-img container. Slug segment after the
        // last "roster"/"player" path segment, numeric ids dropped.
        var slug = officialRosterSlug(img);
        if (slug){
          var st = officialFileTokens(slug);
          if (st.length >= 2){
            var sm = [];
            for (var si = 0; si < known.length; si++){
              if (officialTokenMultisetEqual(st, officialFileTokens(known[si].display))) sm.push(known[si]);
            }
            if (sm.length === 1) hit = sm[0];
            else if (sm.length > 1) blocked = true;
          }
        }
      }
      if (!hit && !blocked){
        // (C) person-card text signal: nearest ancestor marked as a
        // person card, single image in its subtree, exactly one known
        // name as a contiguous token subsequence of its text.
        var card = null, anc2 = img.parentNode, depth2 = 0;
        while (anc2 && depth2 < 8){
          var cc = "";
          try{ cc = (anc2.className && anc2.className.baseVal !== undefined) ? anc2.className.baseVal : (anc2.className || ""); }catch(e){}
          var tid = "";
          try{ tid = (anc2.getAttribute && anc2.getAttribute("data-test-id")) || ""; }catch(e){}
          if ((String(cc).indexOf("person-card") !== -1 || String(tid).indexOf("person-card") !== -1) && anc2.querySelectorAll && anc2.querySelectorAll("img").length === 1){ card = anc2; break; }
          anc2 = anc2.parentNode; depth2++;
        }
        if (card){
          var ctxt = officialNameTokens((card.textContent || "").replace(/\s+/g, " ").trim());
          var cm = [];
          for (var ci = 0; ci < known.length; ci++){
            if (officialContainsName(ctxt, known[ci].tokens)) cm.push(known[ci]);
          }
          if (cm.length === 1) hit = cm[0];
          else if (cm.length > 1) blocked = true;
        }
      }
      if (blocked) hit = null;
      if (hit && !out[hit.norm]) out[hit.norm] = {photo: full, name: hit.display};
    }
  }catch(e){ return {}; }
  return out;
}
function officialPhotoFor(name, team){
  var m = officialPhotoCache[team];
  return (m && m[normName(name)] && m[normName(name)].photo) || null;
}
function applyOfficialPhotos(key){
  var map = officialPhotoCache[key]; if (!map) return;
  $$(".player-photo", document).forEach(function(el){
    if (el.getAttribute("data-player-team") !== key) return;
    var hit = map[normName(el.getAttribute("data-player") || "")];
    if (!hit || !hit.photo) return;
    swapPhotoEl(el, hit.photo, 2);
  });
  try{ attachPlayerHandlers(document); }catch(e){}
}
function loadOfficialPhotos(key, onDone){
  if (!key) return;
  if (officialPhotoState[key] === "done") return;
  if (onDone){ (officialPhotoWaiters[key] = officialPhotoWaiters[key] || []).push(onDone); }
  if (officialPhotoState[key] === "loading") return;
  var url = officialRosterURL(key);
  if (!url || typeof fetch !== "function"){ officialPhotoState[key] = "none"; officialPhotoWaiters[key] = []; return; }
  officialPhotoState[key] = "loading";
  fetchWithTimeout(url, 15000).then(function(r){ return r.text(); }).then(function(t){
    officialPhotoCache[key] = parseOfficialRosterHTML(t, url, officialKnownNames(key));
    officialPhotoState[key] = "done";
    applyOfficialPhotos(key);
    var ws = officialPhotoWaiters[key] || []; officialPhotoWaiters[key] = [];
    ws.forEach(function(fn){ try{ fn(); }catch(e){} });
  }).catch(function(){ officialPhotoState[key] = "none"; officialPhotoWaiters[key] = []; });
}
function applyChnPhotos(key){
  var map = chnPhotoCache[key]; if (!map) return;
  $$(".player-photo", document).forEach(function(el){
    if (el.getAttribute("data-player-team") !== key) return;
    var hit = map[normName(el.getAttribute("data-player") || "")];
    if (!hit || !hit.photo) return;
    swapPhotoEl(el, hit.photo, 3);
  });
  try{ attachPlayerHandlers(document); }catch(e){}
}
function playerPhotoHTML(name, team, cls, jersey){
  var bio = (team === "MICH") ? michBio(name) : null;
  var c = (cls || "pthumb") + " player-photo";
  var attrs = ' data-player="' + esc(name) + '" data-player-team="' + esc(team) + '"' + ((jersey !== undefined && jersey !== null && jersey !== "") ? ' data-player-num="' + esc(jersey) + '"' : "") + ' role="button" tabindex="0" title="Tap for ' + esc(name) + ' page"';
  if (bio && bio.photo) return '<img class="' + c + '" src="' + esc(bio.photo) + '" alt="" data-photo-rank="4"' + attrs + '>';
  var chn = (team !== "MICH") ? chnPhotoFor(name, team) : null;
  if (chn && chn.photo) return '<img class="' + c + '" src="' + esc(chn.photo) + '" alt="" data-photo-rank="3"' + attrs + '>';
  var off = (team !== "MICH") ? officialPhotoFor(name, team) : null;
  if (off) return '<img class="' + c + '" src="' + esc(off) + '" alt="" data-photo-rank="2"' + attrs + '>';
  var esp = (team !== "MICH") ? espnPhotoFor(name, team, jersey) : null;
  if (esp) return '<img class="' + c + '" src="' + esc(esp) + '" alt="" data-photo-rank="1"' + attrs + '>';
  var ini = name.split(" ").map(function(w){ return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
  return '<span class="' + c + ' pinitial" data-photo-rank="0"' + attrs + '>' + esc(ini) + "</span>";
}
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.parseChnRosterHTML = parseChnRosterHTML;
window.__vmaxTest.parseOfficialRosterHTML = parseOfficialRosterHTML;
window.__vmaxTest.normName = normName;
window.__vmaxTest.chnPhotoConflicts = chnPhotoConflicts;
window.__vmaxTest.playerPhotoHTML = playerPhotoHTML;
window.__vmaxTest.genericPlayerPageHTML = genericPlayerPageHTML;
window.__vmaxTest.chnRosterURL = chnRosterURL;
window.__vmaxTest.playerSeasonStats = playerSeasonStats;
window.__vmaxTest.loadChnPhotos = loadChnPhotos;
window.__vmaxTest.chnPhotoCache = chnPhotoCache;
window.__vmaxTest.parseOfficialRosterHTML = parseOfficialRosterHTML;
window.__vmaxTest.loadOfficialPhotos = loadOfficialPhotos;
window.__vmaxTest.officialPhotoCache = officialPhotoCache;
window.__vmaxTest.officialRosterURL = officialRosterURL;
function playerBtn(name, team){
  return '<span class="player-link" data-player="' + esc(name) + '" data-player-team="' + esc(team) + '" role="button" tabindex="0" title="Tap for ' + esc(name) + ' page">' + esc(name) + "</span>";
}
function playerSeasonStats(name, team){
  var st = {g:0, a:0, pts:0, games:[], sv:0, ga:0, min:0, goalieGames:[]};
  GAMES.forEach(function(g){
    if (g.status !== "final") return;
    if (team !== "MICH" && g.short !== team) return;
    var gg = 0, aa = 0;
    if (g.scoring) g.scoring.forEach(function(s){
      if (s.team !== team) return;
      if (s.scorer === name) gg++;
      (s.assists || []).forEach(function(x){ if (x === name) aa++; });
    });
    if (gg || aa){
      st.g += gg; st.a += aa;
      st.games.push({n:g.n, date:g.date, opp:g.opp, g:gg, a:aa});
    }
    var gl = (team === "MICH") ? (g.goalies && g.goalies.mich) : (g.goalies && g.goalies.opp);
    (gl || []).forEach(function(x){
      if (x.name === name){ st.sv += x.sv; st.ga += x.ga; st.goalieGames.push({n:g.n, date:g.date, opp:g.opp, sv:x.sv, ga:x.ga, min:x.min}); }
    });
  });
  st.pts = st.g + st.a;
  return st;
}
function playerPageHTML(team, name){
  var rem0 = null; try{ rem0 = removedLookup(team, name); }catch(e){}
  if (rem0) return removedPlayerPageHTML(team, name, rem0);
  var t = TEAMS[team];
  var bio = (team === "MICH") ? michBio(name) : null;
  var st = playerSeasonStats(name, team);
  var html = '<div class="pp">';
  html += '<div class="pp-head">' + playerPhotoHTML(name, team, "pphoto") + '<div><div class="pp-name">' + esc(name) + "</div>";
  var mp0 = null; try{ mp0 = modelFindPlayer(team, name); }catch(e){}
  try{ if (mp0){ var _dn0 = espnDisplayNum(team, name, mp0); if (_dn0 != null) mp0.num = _dn0; } }catch(e){}
  if (mp0 && mp0.transferNote) html += '<div class="tv-note">' + esc(mp0.transferNote) + "</div>";
  html += '<div class="pp-meta">' + esc(t ? t.name : team) + (t && t.conf ? " " + confBtnHTML(t.conf) : "") + (bio ? " &middot; #" + bio.num + " &middot; " + esc(bio.pos) + " &middot; " + esc(bio.cls) : (mp0 ? ((mp0.num != null ? " &middot; #" + mp0.num : "") + (mp0.pos ? " &middot; " + esc(mp0.pos) : "")) : "")) + "</div></div></div>";
  html += '<div class="tv-sec"><div class="tv-title">INFO</div><div class="tv-note" id="pp-stamp">Player data as of page load — reopen the page to refresh.</div>';
  if (bio){
    html += '<div class="tv-line">Number: #' + bio.num + "</div>";
    html += '<div class="tv-line">Position: ' + esc(bio.pos) + "</div>";
    html += '<div class="tv-line">Class: ' + esc(bio.cls) + "</div>";
    html += '<div class="tv-line">Height: ' + esc(bio.height) + " &middot; Weight: " + esc(bio.weight) + " &middot; Shoots: " + esc(bio.shoots) + "</div>";
    html += '<div class="tv-line">Hometown: ' + esc(bio.hometown) + "</div>";
    html += '<div class="tv-line">Previous team: ' + esc(bio.school) + "</div>";
    html += '<div class="tv-note">Bio source: mgoblue.com official 2026-27 roster (live page + Sep 22, 2026 snapshot). Photo: official Michigan Photography roster headshot.</div>';
  } else {
    var mp1 = null; try{ mp1 = modelFindPlayer(team, name); }catch(e){}
    try{ if (mp1){ var _dn1 = espnDisplayNum(team, name, mp1); if (_dn1 != null) mp1.num = _dn1; } }catch(e){}
    if (mp1){
      if (mp1.num != null) html += '<div class="tv-line">Number: #' + mp1.num + "</div>";
      if (mp1.pos) html += '<div class="tv-line">Position: ' + esc(mp1.pos) + "</div>";
      if (mp1.cls) html += '<div class="tv-line">Class: ' + esc(mp1.cls) + "</div>";
      if (mp1.ht || mp1.wt) html += '<div class="tv-line">Height: ' + esc(mp1.ht || "not published") + " &middot; Weight: " + esc(mp1.wt || "not published") + "</div>";
      if (mp1.hometown) html += '<div class="tv-line">Hometown: ' + esc(mp1.hometown) + "</div>";
      html += '<div class="tv-note">Bio source: merged roster model. ' + esc(modelHeaderLabel(team)) + "</div>";
    } else {
      html += '<div class="tv-note">No verified bio for this player in this app. Opponent bios publish on their official roster pages; this page shows only verified game data below, never guessed bio details.</div>';
    }
  }
  html += "</div>";
  html += '<div class="tv-sec"><div class="tv-title">STATS</div>';
  var showMichPStats = (team === "MICH") || hasMichFinal(team);
  if (!showMichPStats){
    html += '<div class="tv-note">Full-season stats for this player are not included in this app. See the official stats page for this team.</div>';
  } else {
  if (team === "MICH") html += '<div class="tv-note">2026-27 season to date (' + michFinalCount() + ' games), computed from the official box scores.</div>';
  else html += '<div class="tv-note">Vs Michigan only, computed from the official box scores. This is NOT full-season stats.</div>';
  html += '<div class="tv-line">Goals: ' + st.g + " &middot; Assists: " + st.a + " &middot; Points: <b>" + st.pts + "</b></div>";
  if (st.games.length){
    html += '<table class="tv-roster"><tr><th>Game</th><th>G</th><th>A</th><th>Pts</th></tr>';
    st.games.forEach(function(x){ html += "<tr><td>Game " + x.n + " &mdash; " + fmtDate(x.date) + " vs " + esc(x.opp) + "</td><td>" + x.g + "</td><td>" + x.a + "</td><td><b>" + (x.g + x.a) + "</b></td></tr>"; });
    html += "</table>";
  } else if (!st.goalieGames.length) {
    html += '<div class="tv-note">No goals or assists in these games yet.</div>';
  }
  if (st.goalieGames.length){
    html += '<div class="tv-sub">Goaltending</div>';
    st.goalieGames.forEach(function(x){ html += '<div class="tv-line">Game ' + x.n + " &mdash; " + fmtDate(x.date) + " vs " + esc(x.opp) + ": " + x.sv + " saves, " + x.ga + " GA, " + esc(x.min) + "</div>"; });
    html += '<div class="tv-line">Totals: ' + st.sv + " saves, " + st.ga + " GA</div>";
  }
  }
  html += "</div>";
  html += '<div class="tv-sec"><div class="tv-title">NEWS</div>';
  html += '<div class="tv-note">From saved team news (Oct 24, 2026).</div>';
  var last = name.split(" ").pop().toLowerCase();
  var news = [];
  if (t && t.news) t.news.forEach(function(n){ if (n.t.toLowerCase().indexOf(last) !== -1) news.push(n); });
  if (news.length) news.forEach(function(n){ html += '<div class="tv-news"><a href="' + esc(n.u) + '">' + esc(n.t) + '</a><div class="tv-news-meta">' + esc(n.s) + " &middot; " + esc(n.d) + "</div></div>"; });
  else html += '<div class="tv-note">No news item names this player. See the team news section for the latest team stories.</div>';
  html += "</div></div>";
  return html;
}
var playerReturn = "MICH";
function showPlayerPage(team, name, push){
  var pv = $("#playerview"), mv = $("#michview"), tv = $("#teamview");
  if (!pv || !mv || !tv) return;
  playerReturn = (!tv.hidden && tv.querySelector(".tv")) ? tv.querySelector(".tv").id.replace("tv-", "") : "MICH";
  if (push !== false && !(currentView.kind === "player" && currentView.team === team && currentView.name === name)) pushNav();
  currentView = {kind: "player", team: team, name: name};
  pv.innerHTML = TEAMS[team] ? playerPageHTML(team, name) : genericPlayerPageHTML(team, name);
  pv.hidden = false; mv.hidden = true; tv.hidden = true;
  ["confview", "settingsview", "favhomeview", "bracketview", "searchview", "neutralview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.remove("teamview");
  applyTeamTheme(team); syncHeader(); syncBackState();
  attachPlayerHandlers(pv);
  attachConfHandlers(pv);
  if (team !== "MICH") loadChnPhotos(team, function(){ if (currentView.kind === "player" && currentView.team === team && currentView.name === name){ var ret = playerReturn; showPlayerPage(team, name, false); playerReturn = ret; } });
  if (team !== "MICH") try{ loadOfficialPhotos(team); }catch(e){}
  try{ window.scrollTo(0, 0); }catch(e){}
}
function backFromPlayer(){
  var pv = $("#playerview"), mv = $("#michview"), tv = $("#teamview");
  if (!pv || !mv || !tv) return;
  if (navStack.length){ navBack(); return; }
  pv.hidden = true; pv.innerHTML = "";
  if (playerReturn && playerReturn !== "MICH" && (TEAMS[playerReturn] || dirEntry(playerReturn))){ showTeamView(playerReturn, false); return; }
  renderNeutralView();
}
function attachPlayerHandlers(root){
  $$(".player-link, .player-photo", root || document).forEach(function(b){
    if (b.getAttribute("data-player-bound")) return;
    b.setAttribute("data-player-bound", "1");
    var go = function(){ showPlayerPage(b.getAttribute("data-player-team"), b.getAttribute("data-player")); };
    b.addEventListener("click", function(e){ e.stopPropagation(); go(); });
    b.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); go(); }
    });
  });
}

// ---------- venue info (v7) ----------
// Published arena facts only (team arena fields + game venues). Anything
// else gets an honest "not published" note, never an invented address.
function venueInfo(venue){
  var v = venue || "";
  var home = null;
  Object.keys(TEAMS).forEach(function(k){
    if (TEAMS[k].arena && v.indexOf(TEAMS[k].arena.split(",")[0]) !== -1) home = TEAMS[k].name;
  });
  return {venue: v, home: home};
}
function venueBtn(venue){
  return '<span class="venue-link" data-venue="' + esc(venue) + '" role="button" tabindex="0">' + esc(venue) + "</span>";
}
function showVenueCard(venue){
  var card = $("#venuecard"), body = $("#venue-body");
  if (!card || !body) return;
  var info = venueInfo(venue);
  var html = '<div class="tv-title">VENUE</div><div class="tv-line"><b>' + esc(info.venue) + "</b></div>";
  if (info.home) html += '<div class="tv-line">Home of: ' + esc(info.home) + "</div>";
  else html += '<div class="tv-note">Further venue details (address, capacity) are not published in the sources used for this app.</div>';
  body.innerHTML = html;
  card.hidden = false;
  syncBackState();
}
function attachVenueHandlers(root){
  $$(".venue-link", root || document).forEach(function(b){
    if (b.getAttribute("data-venue-bound")) return;
    b.setAttribute("data-venue-bound", "1");
    var go = function(){ showVenueCard(b.getAttribute("data-venue")); };
    b.addEventListener("click", function(e){ e.stopPropagation(); go(); });
    b.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); go(); }
    });
  });
}

// ---------- v8: team theming, header scoping, back-stack navigation ----------
// Root cause of the v7 team-colors bug: the only themed selectors were
// .tv-name/.tv-title/.tv-back, so the whole rest of a team view (page
// background, section cards, links, buttons, badges, banners) stayed
// Michigan navy + maize. v8 themes the entire view through body-level
// --tc1/--tc2/--tc1d variables, and the same variables theme team player
// pages. Michigan's view keeps maize & blue because its own theme values
// ARE the Michigan colors.
function darken(hex, f){
  var h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#000000";
  var r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  var g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  var b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  var p = function(v){ var s = v.toString(16); return s.length === 1 ? "0" + s : s; };
  return "#" + p(r) + p(g) + p(b);
}
function themeFor(key){
  var de = null;
  try{ de = dirEntry(key); }catch(e){}
  if (de && de.c1 && de.c2) return {c1: de.c1, c2: de.c2, c3: de.c3 || "#FFFFFF"};
  if (key === "MICH") return {c1: "#00274C", c2: "#FFCB05", c3: "#FFFFFF"};
  return null;
}
function applyTeamTheme(key){
  var th = themeFor(key);
  var b = document.body;
  if (!th){ clearTeamTheme(); return; }
  b.classList.add("teamtheme");
  try{
    b.style.setProperty("--tc1", th.c1);
    b.style.setProperty("--tc2", th.c2);
    b.style.setProperty("--tc3", th.c3);
    b.style.setProperty("--tc1d", darken(th.c1, 0.72));
  }catch(e){}
}
function clearTeamTheme(){
  var b = document.body;
  b.classList.remove("teamtheme");
  try{
    b.style.removeProperty("--tc1");
    b.style.removeProperty("--tc2");
    b.style.removeProperty("--tc3");
    b.style.removeProperty("--tc1d");
  }catch(e){}
}
// Header scoping (v8): Michigan branding renders ONLY on the Michigan
// home view. Team views, player pages and conference views show their own
// headers instead. The global ticker is NOT branding and stays global.
// v32.21: the static header/title/footer shells in index.html are EMPTY
// and hidden at first paint — no Michigan branding exists in the static
// boot chrome at all (a fresh download's first paint is neutral). The
// Michigan header + title are injected here, by JS, only when the
// Michigan home view is actually displayed, and cleared on every other
// view. The footer shell (neutral note text, no logo image) is likewise
// shown only on the Michigan home view, as before. Any leftover
// .mich-brand element (home-extras banners) keeps the old gating.
function onMichiganHome(){
  // v32.17: the legacy Michigan home view only. The neutral opening page
  // is kind "neutral", so Michigan branding never shows on it, even when
  // Michigan is a favorite.
  return !!(currentView && currentView.kind === "home");
}
function syncHeader(){
  // v32.33: neutral-glass body class — the opening-page glass + navy
  // styling is scoped under this class. Every view render calls
  // syncHeader after setting currentView, so the class is present only
  // while the neutral view is current and clears on any navigation
  // away (team, settings, search, bracket, conf, player, home).
  try{ document.body.classList.toggle("neutral-glass", !!(currentView && currentView.kind === "neutral")); }catch(e){}
  var home = onMichiganHome();
  // Michigan branding (script-logo header, Michigan title, banners, footer)
  // shows only on the Michigan page when Michigan is a favorite — never as
  // the default. Default chrome is grey/white/black (v32.1).
  var michFav = false;
  try{ michFav = getFavorites().indexOf("MICH") !== -1; }catch(e){}
  var showMich = home && michFav;
  var sh = $("#static-header");
  if (sh){
    if (showMich){
      sh.innerHTML = '<span class="logo-btn-head" data-team="MICH" role="button" tabindex="0" title="Tap for Michigan team info"><img src="script-logo.png" alt="Michigan"></span>';
      sh.hidden = false;
      try{ attachLogoHandlers(document); }catch(e){}
    } else { sh.innerHTML = ""; sh.hidden = true; }
  }
  var st = $("#static-title");
  if (st){
    if (showMich){
      st.innerHTML = '<h1>NO. 1 MICHIGAN WOLVERINES &middot; MEN&rsquo;S HOCKEY</h1><div class="sub">2026&ndash;27 Schedule &middot; All times Central &middot; Tap any team logo for that team&rsquo;s full view</div>';
      st.hidden = false;
    } else { st.innerHTML = ""; st.hidden = true; }
  }
  var sf = $("#static-footer");
  if (sf) sf.hidden = !showMich;
  $$(".mich-brand").forEach(function(el){ el.hidden = !showMich; });
  // v32.32: Teams-directory tile removed (user: it did not open the teams).
  // The directory section itself stays on the neutral page, directly under
  // MY FAVORITES; no hidden-gate is needed for a button that no longer exists.
  // v32.17: the Michigan EXTRAS bar (Michigan fight-song toggle + banners) is
  // Michigan content, so it shows only on the Michigan home / Michigan team
  // page — never on the neutral page, Settings, or another team's page.
  var hx = $("#home-extras"); if (hx) hx.style.display = (currentView && (currentView.kind === "home" || (currentView.kind === "team" && currentTeamKey === "MICH"))) ? "" : "none";
  // p3: Settings is its own page — the header button row hides while Settings is open.
  // NOTE: inline display, NOT the hidden attribute — the app's own CSS sets
  // .controls{display:flex/grid}, which beats the UA hidden rule, so hidden=true
  // alone left the row visible (caught by the v32.15 tap test).
  var ct = $(".controls"); if (ct) ct.style.display = (currentView && currentView.kind === "settings") ? "none" : "";
  // v32.18 (p6): the fixed Search button is visible on every view EXCEPT
  // Settings (its own page, header row hidden) and Search itself (a Search
  // button on the Search page would be redundant). syncHeader runs on
  // every view change, so this stays in sync with the view.
  // v32.17 (FINAL Search rule): Search lives in the .controls row with
  // the gear/globe icons. The row itself hides on Settings, so the
  // only extra gate needed here is the Search view itself.
  var sb = $("#ticker-search-btn"); if (sb) sb.style.display = (currentView && currentView.kind === "search") ? "none" : "";
}
// Back-stack navigation (v8): the phone back button must walk back
// through the views the user actually opened, and only exit the app from
// the Michigan home view with an empty stack. Root cause of the v7 bug:
// MainActivity.onBackPressed called super.onBackPressed() (finish) for
// every non-fullscreen press, and the single-page app has no WebView
// history to fall back on. The stack below is the history; the native
// side consults it through VMaxApp.setCanGoBack.
var navStack = [];
var currentView = {kind: "home"};
// v18: nav entries carry the scroll offset they were left at, so Back
// restores the page AND its scroll position instead of jumping to top.
// v32.20: Back returns to EXACTLY where the user was, including which
// sections were expanded. A nav entry snapshots the expanded-section set
// (by section title) of the view being left; navBack restores it after
// re-rendering, instead of the renderer's collapsed-by-default state.
// Collapsed-by-default still governs FRESH opens / first renders only.
function visibleViewRoot(){
  var ids = ["teamview", "neutralview", "settingsview", "playerview", "confview", "favhomeview", "bracketview", "searchview", "michview"];
  for (var i = 0; i < ids.length; i++){ var el = document.getElementById(ids[i]); if (el && !el.hidden) return el; }
  return null;
}
function expandedTitles(root){
  var out = [];
  if (!root) return out;
  root.querySelectorAll(".tv-sec:not(.extras-sec)").forEach(function(sec){
    if (sec.classList.contains("collapsed")) return;
    var t = sec.querySelector(".tv-title");
    if (t) out.push(t.textContent.trim());
  });
  return out;
}
function applyExpandedTitles(root, titles){
  if (!root || !titles) return;
  root.querySelectorAll(".tv-sec:not(.extras-sec)").forEach(function(sec){
    var t = sec.querySelector(".tv-title");
    if (!t) return;
    sec.classList.toggle("collapsed", titles.indexOf(t.textContent.trim()) === -1);
  });
}
function rootForViewKind(kind){
  var map = {team: "teamview", neutral: "neutralview", settings: "settingsview", player: "playerview", conf: "confview", favhome: "favhomeview", bracket: "bracketview", search: "searchview", home: "michview"};
  var id = map[kind] || "teamview";
  return document.getElementById(id);
}
function pushNav(){
  var v = {};
  try{ for (var k in currentView) v[k] = currentView[k]; }catch(e){}
  try{ v.y = window.scrollY || 0; }catch(e){ v.y = 0; }
  try{ v.expanded = expandedTitles(visibleViewRoot()); }catch(e){ v.expanded = []; }
  // v32.30: snapshot open game-row details too (same idea as sections).
  // Without this, Back re-rendered the view with every detail collapsed
  // even when one was open on leaving — the known section-only gap.
  try{ v.openDetails = openDetailIds(); }catch(e){ v.openDetails = []; }
  navStack.push(v);
}
// v32.30: ids of currently visible game-row detail panels (both systems:
// Michigan board #details-<n> and team schedule #team-details-<...>).
function openDetailIds(){
  var out = [];
  $$(".details", document).forEach(function(d){ if (!d.hidden && d.id) out.push(d.id); });
  return out;
}
// v32.30: re-open the snapshotted detail panels after a Back re-render.
// Team panels carry their content inline, so unhiding suffices. Board
// panels are refilled by refreshDetails when the fresh render left them
// empty; a panel that already has content is only unhidden, never
// re-fetched.
function applyOpenDetails(ids){
  if (!ids || !ids.length) return;
  ids.forEach(function(id){
    try{
      var d = document.getElementById(id);
      if (!d) return;
      d.hidden = false;
      if (id.indexOf("details-") === 0 && !d.innerHTML.trim()){
        var n = parseInt(id.slice("details-".length), 10);
        if (!isNaN(n)) refreshDetails(n);
      }
    }catch(e){}
  });
}
// v18: a ticker tap into a Michigan slot keeps the back path (unlike
// backToMichigan, which clears the stack). Home + open details-N.
function openMichiganGameFromTicker(n){
  try{ pushNav(); }catch(e){}
  try{ openBoardDetail = null; }catch(e){}
  renderHomeView();
  try{ refreshDetails(n); }catch(e){}
  var d = $("#details-" + n);
  if (d){ d.hidden = false; try{ d.scrollIntoView(); }catch(e){} syncBackState(); }
}
// v18: match a live-board Michigan game to its bundled Michigan slot by
// opponent key + Central date (never the UTC date slice, which shifts
// evening Central games a day forward). Null when no slot matches.
function michGameNumForBoard(g){
  try{
    var oppKey = g.homeKey === "MICH" ? g.awayKey : (g.awayKey === "MICH" ? g.homeKey : null);
    if (!oppKey) return null;
    var d = g.ev && g.ev.date ? centralTodayISO(Date.parse(g.ev.date)) : "";
    for (var i = 0; i < GAMES.length; i++){
      if (GAMES[i].short === oppKey && (!d || GAMES[i].date === d)) return GAMES[i].n;
    }
  }catch(e){}
  return null;
}
function syncBackState(){
  var can = false;
  if (pickerOpen()) can = true;
  try{
    var vw = $("#videowin"), gd = $("#gamedetail"), vc = $("#venuecard"), sm = $("#sharemenu");
    if ((vw && !vw.hidden) || (gd && !gd.hidden) || (vc && !vc.hidden) || (sm && !sm.hidden)) can = true;
    else if ($$(".details", document).some(function(d){ return !d.hidden; })) can = true;
    else if (navStack.length) can = true;
  }catch(e){}
  try{ var b = bridge(); if (b && typeof b.setCanGoBack === "function") b.setCanGoBack(can); }catch(e){}
  try{ window.__vmaxTest.backState = can; }catch(e){}
}
function renderHomeView(){
  currentView = {kind: "home"};
  var tv = $("#teamview"), mv = $("#michview"), pv = $("#playerview"), cv = $("#confview"), sv = $("#settingsview");
  if (tv){ tv.hidden = true; tv.innerHTML = ""; }
  if (pv){ pv.hidden = true; pv.innerHTML = ""; }
  if (cv){ cv.hidden = true; cv.innerHTML = ""; }
  if (sv){ sv.hidden = true; sv.innerHTML = ""; }
  var fh0 = $("#favhomeview"); if (fh0){ fh0.hidden = true; fh0.innerHTML = ""; }
  var bv0 = $("#bracketview"); if (bv0){ bv0.hidden = true; bv0.innerHTML = ""; }
  var sev0 = $("#searchview"); if (sev0){ sev0.hidden = true; sev0.innerHTML = ""; }
  var nv0 = $("#neutralview"); if (nv0){ nv0.hidden = true; nv0.innerHTML = ""; }
  if (mv) mv.hidden = false;
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ renderFavHome(); }catch(e){}
  try{ window.scrollTo(0, 0); }catch(e){}
}

// ---------- neutral default home page (v32.17) ----------
// Boot opens this page, not the top favorite's team page. It is league
// content only: the global live-score strip stays at the top, the page
// itself carries favorites, a live scoreboard, the 63-team directory and
// neutral postseason wording. NOTHING purely Michigan lives here: no
// Michigan banner, title, schedule, spotlight or mascot. Michigan
// branding lives only on Michigan's team page. The old #michview is kept
// as the legacy Michigan home for user-initiated Michigan paths only
// (ticker Michigan-game taps, backToMichigan) — never as the boot page.
function neutralViewHTML(){
  var html = '<div class="tv-head"><div class="tv-name">NCAA Division 1 Men\'s Hockey</div>' +
    '<div class="tv-meta">2026&ndash;27 season &middot; All times Central &middot; Tap any team logo for that team&rsquo;s full page</div></div>';
  var favs = getFavorites();
  html += '<div class="tv-sec"><div class="tv-title">MY FAVORITES</div>';
  if (!favs.length){
    html += '<div class="tv-note">No favorites picked yet. Tap the star on any team page, directory row, or the Settings list to add one.</div>';
  } else {
    favs.forEach(function(k){
      var de = dirEntry(k);
      html += '<div class="dir-row" data-neutral-team="' + esc(k) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(k), k) + (de ? teamLogoImg(de, "dir-logo") : "") +
        '<span class="dir-name">' + esc(favDisplayName(k)) + '</span>' +
        '<span class="dir-meta">' + esc(favNextLine(k)) + '</span></div>';
    });
  }
  html += '</div>';
  // v32.32: section order — directory directly under MY FAVORITES.
  html += '<div class="tv-sec" id="neutral-directory"><div class="tv-title">NCAA TEAMS DIRECTORY</div><div class="tv-note">63 NCAA Division I men&rsquo;s programs, 2026&ndash;27 season. Tap any team for its full page; your phone Back button returns you.</div>';
  var confs = ["Big Ten", "NCHC", "CCHA", "Hockey East", "ECAC", "AHA", "Independent"];
  confs.forEach(function(c){
    var teams = DIRECTORY.filter(function(d){ return d.conf === c; }).sort(function(a, b){ return a.name < b.name ? -1 : 1; });
    if (!teams.length) return;
    html += '<div class="tv-sub">' + esc(c) + " (" + teams.length + ")</div>";
    teams.forEach(function(d){
      html += '<div class="dir-row" data-neutral-team="' + esc(d.key) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(d.key), d.key) + teamLogoImg(d, "dir-logo") +
        '<span class="dir-name">' + esc(d.name) + " " + esc(d.nick) + "</span>" + confBtnHTML(d.conf) +
        '<span class="dir-meta">' + esc(d.city) + (d.titles.length ? " &middot; " + d.titles.length + "&times; champs" : "") + "</span></div>";
    });
  });
  html += '</div>';
  html += '<div class="tv-sec" id="neutral-live-sec"><div class="tv-title">LIVE SCOREBOARD — NCAA HOCKEY</div><div id="neutral-live-board"><div class="tv-note">Loading the NCAA scoreboard…</div></div><div class="tv-note">Live scores are also in the strip at the top of every page.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">POSTSEASON</div><div class="tv-line">Big Ten Championship &middot; NCAA Regionals &middot; Frozen Four &middot; National Championship</div><div class="tv-note">No postseason games scheduled yet. Each round appears here with rankings, broadcasts, and game details when teams reach it.</div><button class="tv-back" id="neutral-brackets-btn" type="button">Postseason Brackets</button></div>';
  return html;
}
function renderNeutralView(push){
  var nv = $("#neutralview"); if (!nv) return;
  if (push !== false && currentView.kind !== "neutral") pushNav();
  currentView = {kind: "neutral"};
  try{ document.body.classList.add("neutral-glass"); }catch(e){}
  nv.innerHTML = neutralViewHTML();
  collapseTeamSecs(nv);
  nv.hidden = false;
  ["teamview", "playerview", "confview", "settingsview", "favhomeview", "bracketview", "searchview", "michview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ window.scrollTo(0, 0); }catch(e){}
  $$("[data-neutral-team]", nv).forEach(function(b){ b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-neutral-team")); }); });
  attachConfHandlers(nv);
  var bb = $("#neutral-brackets-btn"); if (bb) bb.addEventListener("click", function(){ showBracketView(null); });
}
function navBack(){
  if (pickerOpen()){ syncBackState(); return; }
  var vw = $("#videowin");
  if (vw && !vw.hidden){ closeVideoWindow(); syncBackState(); return; }
  var gd = $("#gamedetail");
  if (gd && !gd.hidden){ gd.hidden = true; openBoardDetail = null; syncBackState(); return; }
  var vc = $("#venuecard");
  if (vc && !vc.hidden){ vc.hidden = true; syncBackState(); return; }
  var sm = $("#sharemenu");
  if (sm && !sm.hidden){ closeShareMenu(); return; }
  // Details close on Back only when there is nowhere to pop to (plain
  // home). A ticker tap pushes first and then opens details, so Back
  // there must pop back to the team page, not just close the details.
  var openDetails = $$(".details", document).filter(function(d){ return !d.hidden; });
  if (!navStack.length && openDetails.length){ openDetails.forEach(function(d){ d.hidden = true; }); syncBackState(); return; }
  if (!navStack.length) return;
  var prev = navStack.pop();
  if (prev.kind === "home") renderHomeView();
  else if (prev.kind === "neutral") renderNeutralView(false);
  else if (prev.kind === "team") showTeamView(prev.key, false);
  else if (prev.kind === "player") showPlayerPage(prev.team, prev.name, false);
  else if (prev.kind === "conf") showConfView(prev.conf, false);
  else if (prev.kind === "settings") showSettingsView(false);
  else if (prev.kind === "favhome") showFavHomeView(false);
  else if (prev.kind === "bracket") showBracketView(prev.key, false);
  else if (prev.kind === "search") showSearchView(false);
  // v32.20: restore the popped view's expanded sections (snapshot taken
  // by pushNav when the view was left), overriding the renderer's
  // collapsed-by-default pass. No snapshot (old entries) = leave default.
  try{ if (prev.expanded) applyExpandedTitles(rootForViewKind(prev.kind), prev.expanded); }catch(e){}
  // v32.30: restore the popped view's open game-row details the same way.
  try{ if (prev.openDetails) applyOpenDetails(prev.openDetails); }catch(e){}
  try{ if (prev.y) window.scrollTo(0, prev.y); }catch(e){}
  syncBackState();
}
window.__vmaxNavBack = navBack;

// ---------- team views (logo tap) ----------
function teamGames(short){
  if (short === "MICH") return GAMES.slice();
  return GAMES.filter(function(g){ return g.short === short; });
}
// Points computed from the official box scores. For Michigan this
// IS the full season table (all 7 games are in this app). For opponents it
// is vs-Michigan only and is always labeled that way.
function hasMichFinal(short){
  try{ return GAMES.some(function(g){ return g.status === "final" && g.short === short; }); }catch(e){ return false; }
}
function playsMichThisSeason(short){
  try{ return GAMES.some(function(g){ return g.short === short; }); }catch(e){ return false; }
}
function pointsComputed(short){
  var key = short;
  var map = {};
  GAMES.forEach(function(g){
    if (g.status !== "final" || !g.scoring) return;
    if (short !== "MICH" && g.short !== short) return;
    g.scoring.forEach(function(s){
      if (s.team !== key) return;
      if (!map[s.scorer]) map[s.scorer] = {name:s.scorer, g:0, a:0};
      map[s.scorer].g++;
      (s.assists || []).forEach(function(a){
        if (!map[a]) map[a] = {name:a, g:0, a:0};
        map[a].a++;
      });
    });
  });
  var arr = [];
  Object.keys(map).forEach(function(k){ arr.push(map[k]); });
  arr.sort(function(a, b){ return (b.g + b.a) - (a.g + a.a) || b.g - a.g; });
  return arr;
}
function goaliesComputed(short){
  var map = {};
  GAMES.forEach(function(g){
    if (g.status !== "final" || !g.goalies) return;
    var gl = (short === "MICH") ? g.goalies.mich : (g.short === short ? g.goalies.opp : null);
    if (!gl) return;
    gl.forEach(function(x){
      if (!map[x.name]) map[x.name] = {name: x.name, gp: 0, sv: 0, ga: 0, sec: 0};
      var m = map[x.name]; m.gp++;
      m.sv += (+x.sv || 0); m.ga += (+x.ga || 0);
      var parts = String(x.min || "0:00").split(":"); m.sec += ((+parts[0] || 0) * 60 + (+parts[1] || 0));
    });
  });
  var arr = []; Object.keys(map).forEach(function(k){ arr.push(map[k]); });
  arr.sort(function(a, b){ return (b.sv + b.ga) - (a.sv + a.ga); });
  return arr;
}
function fmtMin(sec){ var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" + s : s); }
var CHN_GOALIE_FETCH = "Oct 28, 2026";
var CHN_IVY_NO_GAMES = {BRWN:1,COR:1,DART:1,HAR:1,PRIN:1,YALE:1};
var CHN_GOALIES = {
  AF:"Dominik Wasik|6|2|4|0|21|338|3.73|0|193|.902;Jack Solomon|1|0|0|0|2|20|6.00|0|5|.714",
  ARMY:"JJ Cataldo|4|3|1|0|9|243|2.22|0|106|.922",
  ASU:"Samuel Urban|5|3|2|0|15|298|3.02|1|158|.913;Sam Hillebrandt|1|1|0|0|4|61|3.95|0|13|.765",
  AUG:"Angelo Zol|1|0|0|0|0|0|0.00|0|0|;Mathis Langevin|6|5|0|1|12|370|1.94|0|165|.932",
  BC:"Louka Cloutier|4|1|2|1|9|240|2.25|1|102|.919;Leo Henriquez|1|0|1|0|5|57|5.25|0|20|.800",
  BEM:"Max Hildebrand|4|1|3|0|11|240|2.75|0|106|.906;Raythan Robbins|1|0|1|0|4|59|4.10|0|40|.909",
  BENT:"Lukas Swedin|3|2|1|0|5|180|1.67|2|99|.952;Nicholas Bevilacqua|2|1|1|0|6|120|3.00|0|50|.893;Easton Rye|1|0|1|0|5|60|5.00|0|25|.833",
  BGSU:"Jacob Steinman|6|3|3|0|17|347|2.94|0|171|.910;Tyler Palmer|3|1|1|0|7|134|3.13|0|53|.883",
  BU:"Mikhail Yegorov|6|4|2|0|12|363|1.98|1|145|.924",
  CAN:"Jack Lisson|8|3|4|1|18|441|2.45|1|211|.921;Kolby Hay|2|0|0|0|7|42|9.93|0|19|.731",
  CC:"Jackson Unger|6|5|1|0|7|361|1.16|2|176|.962",
  CLAR:"Shane Soderwall|4|2|2|0|7|213|1.97|1|82|.921;Ben Gaudreau|2|1|1|0|5|124|2.42|0|51|.911;Dawson Labre|1|0|0|0|1|24|2.49|0|17|.944",
  COLG:"Reid Dyck|6|0|6|0|17|355|2.87|0|175|.911",
  CONN:"Kam Hendrickson|3|3|0|0|7|186|2.26|0|115|.943;Veeti Louhivaara|3|0|3|0|12|178|4.04|0|82|.872",
  DEN:"Johnny Hicks|1|1|0|0|2|60|2.00|0|14|.875;Tyler Krivtsov|5|2|2|1|12|299|2.41|0|101|.894",
  FSU:"Alan Lendak|4|1|2|1|13|243|3.22|0|121|.903;Martin Lundberg|2|0|2|0|10|117|5.14|0|52|.839",
  HC:"Connor MacKenzie|1|0|0|0|1|25|2.35|0|10|.909;Danick Leroux|7|3|4|0|17|392|2.60|0|168|.908;Connor Towle|1|0|1|0|5|60|4.99|0|30|.857",
  LIN:"Liam Beerman|4|1|3|0|17|242|4.22|0|124|.879;Klayton Knapp|4|2|2|0|21|239|5.27|0|117|.848",
  LIU:"Dane Callaway|1|0|0|0|0|2|0.00|0|0|;Lukas Renaud|4|2|2|0|8|160|3.00|0|85|.914;Daniel Duris|5|0|3|0|18|250|4.33|0|131|.879",
  LSS:"Anders Miller|3|1|2|0|11|178|3.71|0|80|.879;Andrew Oke|3|1|2|0|12|178|4.05|0|96|.889",
  MASS:"Ethan Eskit|5|2|2|1|8|301|1.59|0|137|.945;Tobias Trejbal|2|1|1|0|6|96|3.76|0|43|.878;Jackson Irving|1|0|0|0|3|24|7.46|0|16|.842",
  ME:"Petter Wickström Stumer|2|1|1|0|3|122|1.48|1|47|.940;Albin Boija|4|3|1|0|6|237|1.52|1|75|.926",
  MIA:"Matteo Drobac|5|4|1|0|7|299|1.40|0|96|.932;Yegor Yegorov|1|1|0|0|2|60|2.01|0|20|.909",
  MICH:"Jack Ivankovic|7|7|0|0|14|420|2.00|0|195|.933",
  MINN:"Luca Di Pasquo|5|1|3|1|14|273|3.07|0|120|.896;Melvin Strahl|2|1|0|0|6|89|4.03|0|56|.903",
  MNST:"Lassi Lehti|3|2|1|0|5|165|1.82|1|108|.956;Raiden LeGall|4|0|3|0|11|181|3.65|0|78|.876;Matthew Syverson|1|0|0|0|4|14|16.74|0|5|.556",
  MRMK:"Ryan Keyes|1|1|0|0|2|60|2.01|0|20|.909;Linards Feldbergs|5|3|1|1|15|310|2.90|0|138|.902",
  MRVL:"Bruno Bruveris|1|1|0|0|2|60|2.00|0|27|.931",
  MSU:"Quentin Sigurdson|1|1|0|0|1|60|1.00|0|29|.967;Joshua Ravensbergen|4|3|1|0|5|237|1.26|0|112|.957",
  MTU:"Owen Bartoszkiewicz|8|6|2|0|14|478|1.76|1|228|.942",
  ND:"Nicholas Kempf|4|2|2|0|11|240|2.75|1|130|.922;Patrick Quinlan|2|0|2|0|7|122|3.45|0|44|.863",
  NE:"Sam Caulfield|2|1|0|0|2|75|1.60|0|40|.952;Lawton Zacher|2|1|1|0|4|105|2.28|0|35|.897",
  NIA:"Charles-Edward Gravel|5|2|3|0|9|292|1.85|0|152|.944;Tomas Anderson|3|2|1|0|8|185|2.59|0|78|.907",
  NMI:"Oliver Auyeung-Ashton|6|2|4|0|16|361|2.66|1|172|.915",
  OMA:"William Lacelle|3|1|2|0|8|186|2.58|0|103|.928;Dawson Cowan|1|1|0|0|4|60|4.01|0|30|.882",
  OSU:"Jakub Milota|4|1|2|0|6|197|1.83|0|56|.903;Kristoffer Eberly|4|1|2|0|10|157|3.82|0|46|.821",
  PROV:"Jack Parsons|4|4|0|0|4|243|0.99|2|113|.966;Gibson Homer|1|1|0|0|2|60|2.01|0|18|.900",
  PSU:"Joshua Fleming|3|1|2|0|9|178|3.04|0|85|.904;Ryder Fetterolf|3|1|2|0|10|177|3.39|0|87|.897",
  QUIN:"Christian Kirsch|4|3|1|0|10|245|2.45|0|103|.912;Rorke Applebee|2|1|1|0|7|117|3.58|0|49|.875",
  RIT:"Jakub Krbecek|4|1|2|1|12|245|2.94|0|135|.918;Zachary Bowen|1|0|1|0|3|58|3.10|0|23|.885;Collin Mackenzie|2|1|1|0|9|120|4.51|0|64|.877",
  RMU:"Croix Kochendorfer|1|0|0|0|0|12|0.00|0|5|1.000;Lucas Massie|3|1|1|0|9|155|3.49|0|83|.902;Charlie Schenkel|5|0|5|0|18|249|4.33|0|146|.890",
  RPI:"Nate Krawchuk|4|3|1|0|5|238|1.26|1|127|.962;Ethan McCallum|2|1|1|0|7|119|3.53|0|49|.875",
  SCSU:"Yan Shostak|3|1|2|0|9|185|2.91|0|100|.917;Patriks Berzins|2|1|1|0|6|119|3.02|0|58|.906",
  SHU:"Jack Spicer|1|0|0|0|1|33|1.85|0|13|.929;Ajeet Gundarah|6|3|3|0|18|324|3.33|0|121|.871",
  SLU:"Cameron Smith|2|0|2|0|9|120|4.52|0|56|.862;Colin Winn|2|0|2|0|11|115|5.72|0|62|.849",
  STMN:"William Ingemann|1|0|1|0|1|60|1.01|0|23|.958;Ajay White|2|1|1|0|5|118|2.54|0|42|.894;Carsen Musser|1|0|1|0|3|59|3.03|0|23|.885",
  STO:"Mason Vaccari|3|2|1|0|7|181|2.32|0|83|.922;Linards Lipskis|2|1|1|0|6|123|2.94|0|44|.880",
  UAA:"Joey Rocha|6|1|5|0|23|358|3.85|0|160|.874;William Gramme|2|0|2|0|16|120|8.00|0|70|.814",
  UAF:"Tyler Shea|5|1|4|0|12|296|2.44|0|159|.930;Calvin Vachon|1|0|1|0|7|58|7.28|0|38|.844",
  UMD:"Carl Axelsson|6|4|0|2|5|369|0.81|2|122|.961;Ethan Dahlmeir|2|1|1|0|8|120|4.01|0|45|.849",
  UML:"Cole Moore|2|0|1|0|4|102|2.34|0|35|.897;Austin Elliott|5|1|4|0|18|253|4.26|0|125|.874",
  UND:"Caleb Heil|2|2|0|0|0|120|0.00|2|29|1.000;Jan Špunar|4|2|2|0|14|236|3.57|0|84|.857",
  UNH:"Michael Simpson|6|3|2|1|14|343|2.45|2|101|.878;Teagan Kendrick|1|0|0|0|3|20|9.00|0|9|.750",
  UNNY:"Brayden Gillespie|5|3|2|0|12|304|2.37|0|144|.923",
  UVM:"Jacob Oster|4|2|2|0|6|243|1.48|0|111|.949;Aiden Wright|1|0|1|0|2|59|2.04|0|19|.905",
  WIS:"Daniel Hauser|2|2|0|0|1|120|0.50|1|35|.972;Alexis Cournoyer|2|2|0|0|2|120|1.00|1|29|.935",
  WMU:"Quentin Miller|5|4|1|0|5|300|1.00|2|108|.956"
};
function chnGoaliesFor(short){ var raw = CHN_GOALIES[short]; if (!raw) return []; return raw.split(";").map(function(r){ var f = r.split("|"); return {name:f[0],gp:+f[1],w:+f[2],l:+f[3],t:+f[4],ga:+f[5],min:+f[6],gaa:f[7],so:+f[8],sv:+f[9],svpct:f[10]||""}; }); }
function normGoalieName(n){ try{ return String(n||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); }catch(e){ return String(n||"").toLowerCase(); } }
function rosterGoalieNames(short){ try{ var m = buildMergedModel(short); if (!m || !m.players) return []; var out = []; m.players.forEach(function(p){ if (p.group === "G") out.push(p.name); }); return out; }catch(e){ return []; } }
function rosterGoaliesNotInCHN(short, chnG){ var seen = {}; chnG.forEach(function(x){ seen[normGoalieName(x.name)] = 1; }); var out = []; rosterGoalieNames(short).forEach(function(n){ if (!seen[normGoalieName(n)]) out.push(n); }); return out; }
// Verified participants per game: scorers, assistants, penalized players,
// goalies from the official box score. Full dressed lineups are NOT
// published in the box score, so this list is labeled exactly as it is.
function activePlayers(short, g){
  var key = short, seen = {}, out = [];
  function add(n){
    if (!n || n === "BENCH" || n === "EMPTY NET" || seen[n]) return;
    seen[n] = true; out.push(n);
  }
  if (g.scoring) g.scoring.forEach(function(s){
    if (s.team !== key) return;
    add(s.scorer);
    (s.assists || []).forEach(add);
  });
  if (g.penalties) g.penalties.forEach(function(p){ if (p.team === key) add(p.player); });
  if (g.goalies){
    var gl = (short === "MICH") ? g.goalies.mich : g.goalies.opp;
    (gl || []).forEach(function(x){ add(x.name); });
  }
  return out;
}
function rosterTable(title, list, team){
  var html = '<div class="tv-sub">' + title + "</div><table class=\"tv-roster\">";
  html += "<tr><th></th><th>#</th><th>Player</th><th>Class</th></tr>";
  var posLabel = title === "Forwards" ? "F" : title === "Defensemen" ? "D" : title === "Goalies" ? "G" : "";
  list.forEach(function(p){
    var meta = [posLabel, p[3], p[4], p[5]].filter(function(x){ return !!x; }).join(" \u00b7 ");
    html += "<tr><td>" + playerPhotoHTML(p[1], team, undefined, p[0]) + "</td><td>" + (p[0] != null ? p[0] : "&ndash;") + "</td><td>" + playerBtn(p[1], team) + (meta ? '<div class="tv-roster-meta">' + esc(meta) + '</div>' : "") + (p[6] ? '<div class="tv-roster-meta">' + esc(p[6]) + '</div>' : "") + "</td><td>" + (p[2] ? esc(p[2]) : "&ndash;") + "</td></tr>";
  });
  return html + "</table>";
}
function splitStats(lines){
  var off = [], def = [], other = [];
  lines.forEach(function(l){
    if (/Goals per game|Shots per game|Shot %|Power play|Points per game/.test(l)) off.push(l);
    else if (/Goals against|Goals-against|Save %|Penalty kill/.test(l)) def.push(l);
    else other.push(l);
  });
  return {off:off, def:def, other:other};
}
// ---------- v32.4: one rich view for all 63 teams ----------
// teams.js covers 12 teams with tuple rosters; the v17 pack (TEAM_DATA)
// covers all 63 with flat rosters. Pack entries convert to the team-view
// shape so every team renders the same sections; the generic view stays
// only as a fallback for keys with neither source.
function packToTeamEntry(short){
  var pd = null; try{ pd = packData(short); }catch(e){}
  if (!pd) return null;
  var groups = {F: [], D: [], G: []};
  (pd.roster || []).forEach(function(p){
    var g = (p.pos === "D") ? "D" : (p.pos === "G" || p.pos === "GK") ? "G" : "F";
    groups[g].push([p.num != null ? p.num : null, p.name, p.cls || null, p.ht || null, p.wt || null, p.hometown || null]);
  });
  return {name: pd.name, nick: pd.nick, conf: pd.conf, arena: pd.arena, coach: pd.coach,
    record: pd.record, record_asof: pd.record_asof || null, rank: pd.rank, roster: groups, leaders: pd.leaders || null,
    flags: pd.flags || null, withheld_n: pd.withheld_n || null, roster_n: pd.roster_n || null,
    leaders_source: pd.leaders_source || null, leaders_asof: pd.leaders_asof || null,
    stats: null, availability: "College hockey publishes no formal availability report comparable to football's injury report. No out/questionable list is published for this team in the sources consulted.",
    news: null, results: null, fixtures: null, _packConverted: true};
}
function teamEntry(short){
  if (typeof TEAMS !== "undefined" && TEAMS[short]) return TEAMS[short];
  return packToTeamEntry(short);
}
// v32.4: rich game rows for a team's saved schedule — same row structure
// as the Michigan home view (Game N, date, vs/at, status, team lines with
// logos + scores, series line, expandable details), driven by SCHEDULES.
// ---------- v32.6: unified schedule row helpers (rank left, scores/time right) ----------
function wlSpan(letter, side){
  var c = letter === "W" ? "wl-w" : letter === "L" ? "wl-l" : letter === "T" ? "wl-t" : "wl";
  return '<span class="' + c + '" data-wl="' + side + '">' + (letter || "") + '</span>';
}
function oppLetter(l){ return l === "W" ? "L" : l === "L" ? "W" : l === "T" ? "T" : null; }
function resultLetter(result){ var m = result ? String(result).match(/^\s*([WLT])/i) : null; return m ? m[1].toUpperCase() : null; }
function periodLabel(p){ if (p === 1) return "1st"; if (p === 2) return "2nd"; if (p === 3) return "3rd"; if (p === 4) return "OT"; if (p >= 5) return "SO"; return ""; }
// v32.6: team results stats computed from saved results (fills the 51
// pack teams, whose published stats lines are empty). Live results show
// in the schedule above; these are the saved-results snapshot.
function resultsTeamStats(short){
  var liveApplied = false;
  var rows = [];
  if (short === "MICH"){ GAMES.forEach(function(g){ if (g.status === "final") rows.push({d: g.date, ha: g.home ? "H" : "A", my: g.mich, opp: g.oppScore}); }); }
  else { var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[short]) || []; sched.forEach(function(r){ var m = r.result ? String(r.result).match(/^([WLT])\s+(\d+)-(\d+)$/) : null; if (m) rows.push({d: r.d, ha: r.ha, my: +m[2], opp: +m[3]}); }); var lv = liveResultsStore[short] || {}; rows.forEach(function(rr){ if (lv[rr.d]){ rr.my = lv[rr.d].my; rr.opp = lv[rr.d].opp; liveApplied = true; } }); }
  if (!rows.length) return null;
  var w = 0, l = 0, t = 0, gf = 0, ga = 0, hw = 0, hl = 0, ht = 0, aw = 0, al = 0, at = 0, last = "";
  rows.forEach(function(r){
    gf += r.my; ga += r.opp;
    if (r.d > last) last = r.d;
    var res = r.my > r.opp ? "W" : r.my < r.opp ? "L" : "T";
    if (res === "W") w++; else if (res === "L") l++; else t++;
    if (r.ha === "H"){ if (res === "W") hw++; else if (res === "L") hl++; else ht++; }
    else { if (res === "W") aw++; else if (res === "L") al++; else at++; }
  });
  return {gp: rows.length, w: w, l: l, t: t, gf: gf, ga: ga, hw: hw, hl: hl, ht: ht, aw: aw, al: al, at: at, last: last, liveApplied: liveApplied};
}
// ---------- v32.20: inline schedule-row media icons ----------
// Every team schedule row directly carries its media options inline — no
// detail/Extras digging. Icons render ONLY where a real link exists:
// stream = a real Watch/stream URL (verified game data, the same-game
// Michigan mirror, or the user's own default stream link); radio = a real
// radio URL (Michigan: WCBN Sports YouTube, the standing radio source,
// or the user's default radio link); highlight = a real per-game YouTube
// highlight URL (never a channel/search page, never the user's generic
// highlights default). Broadcast channel NAMES from the live feed (no URL)
// render as plain text, never as a dead icon. Highlights appear as soon as
// the link exists in data: syncSchedRowMedia re-renders each row's strip
// on the live tick (mergeFeedIntoRows) and fresh opens re-render rows.
function michRadioURL(){
  try{ return (typeof LISTEN_URL !== "undefined" && LISTEN_URL) ? LISTEN_URL : null; }catch(e){ return null; }
}
function michMirrorGame(teamKey, date){
  try{
    for (var i = 0; i < GAMES.length; i++){
      if (GAMES[i].short === teamKey && GAMES[i].date === date) return GAMES[i];
    }
  }catch(e){}
  return null;
}
function schedMediaFor(teamKey, opts){
  opts = opts || {};
  var stream = null, radio = null, hl = null;
  if (opts.watch) stream = {url: opts.watch, label: watchOutletName(opts.watch, opts.tv || "") || opts.tv || "Watch"};
  if (opts.radio) radio = {url: opts.radio};
  if (opts.hl) hl = {url: opts.hl};
  // Same-game Michigan mirror: a row vs Michigan carries that game's
  // verified Watch/highlight data, and WCBN is that game's radio source.
  if (opts.oppKey === "MICH" && teamKey !== "MICH"){
    var mg = michMirrorGame(teamKey, opts.date);
    if (mg){
      if (!stream && mg.watch) stream = {url: mg.watch, label: watchOutletName(mg.watch, mg.tv || "") || mg.tv || "Watch"};
      if (!hl){
        var mhl = mg.highlights || null;
        try{ if (!mhl && typeof rssHighlights !== "undefined") mhl = rssHighlights[mg.n] || null; }catch(e){}
        if (mhl) hl = {url: mhl};
      }
      if (!radio) radio = {url: michRadioURL()};
    }
  }
  // User defaults fill stream/radio gaps only — never highlights (a
  // generic highlights source is not that game's highlights).
  try{
    var dl = loadDefaultLinks();
    if (!stream && dl.stream) stream = {url: dl.stream, label: "Your stream"};
    if (!radio && dl.radio) radio = {url: dl.radio};
  }catch(e){}
  var carrierNote = "";
  try{
    if (stream && opts.broadcasts && opts.broadcasts.length){
      var bName = opts.broadcasts[0];
      var outlet = watchOutletName(stream.url, opts.tv || "") || "";
      if (/^https?:\/\//.test(outlet)) outlet = "";
      if (bName){
        if (outlet){
          var nn = function(s){ return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); };
          if (nn(outlet) !== nn(bName)) carrierNote = "Live feed names " + bName + " as carrier; saved link points to " + outlet + ".";
        } else {
          carrierNote = "Live feed names " + bName + " as carrier; saved link carrier unverified.";
        }
      }
    }
  }catch(e){}
  return {stream: stream, radio: radio, hl: hl, streamDead: !!opts.streamDead, radioDead: !!opts.radioDead, carrierNote: carrierNote,
    bc: (opts.broadcasts && opts.broadcasts.length) ? opts.broadcasts.join(", ") : ""};
}
function schedMediaHTML(teamKey, opts){
  var m = schedMediaFor(teamKey, opts);
  var parts = [];
  if (m.streamDead) parts.push('<span class="row-media-chan">Stream not confirmed</span>');
  else if (m.stream) parts.push('<a class="row-media-icon" data-sched-stream="1" href="' + esc(m.stream.url) + '" title="Watch: ' + esc(m.stream.label) + '" aria-label="Watch: ' + esc(m.stream.label) + '">\uD83D\uDCFA<span class="row-media-label">' + esc(m.stream.label) + '</span></a>');
  else if (m.bc) parts.push('<span class="row-media-chan" title="Channel (live feed)">' + esc(m.bc) + '</span>');
  if (m.radioDead) parts.push('<span class="row-media-chan">Radio not confirmed</span>');
  else if (m.radio) parts.push('<a class="row-media-icon" data-sched-radio="1" href="' + esc(m.radio.url) + '" title="Radio" aria-label="Radio">\uD83D\uDCFB</a>');
  if (m.carrierNote) parts.push('<span class="row-media-chan">' + esc(m.carrierNote) + '</span>');
  if (m.hl) parts.push('<button class="row-media-icon" data-sched-hl="' + esc(m.hl.url) + '" type="button" title="Highlights" aria-label="Highlights">\u25B6\uFE0F</button>');
  if (!parts.length) return "";
  return '<div class="row-media">' + parts.join("") + '</div>';
}
// v32.20: one delegated highlights-play listener for every [data-sched-hl]
// icon (same straight-to-YouTube path as playGameHighlight: bridge
// openYouTube / openExternalBrowser, never an in-app video window).
// Delegation survives re-renders and strip syncs, so no rebinding.
document.addEventListener("click", function(e){
  var b = (e.target && e.target.closest) ? e.target.closest("[data-sched-hl]") : null;
  if (!b) return;
  var url = b.getAttribute("data-sched-hl");
  if (url) playGameHighlight(url, "Highlights");
});
function syncSchedRowMedia(key){
  var rowsEl = $("#tv-sched-rows"); if (!rowsEl || currentTeamKey !== key) return 0;
  var changed = 0;
  var rows = rowsEl.querySelectorAll("[data-sched-key]");
  for (var i = 0; i < rows.length; i++){
    var row = rows[i];
    var parts = (row.getAttribute("data-sched-key") || "").split("|");
    var team = parts[0], date = parts[1], opp = parts[2] || "";
    var strip = null;
    if (row.getAttribute("data-live-only") === "1"){
      var li = liveGameInfo[team + "|" + date + "|" + opp] || null;
      strip = schedMediaHTML(team, {broadcasts: li ? li.broadcasts : []});
    } else if (team === "MICH"){
      var gg = null;
      try{ for (var j = 0; j < GAMES.length; j++) if (GAMES[j].date === date && GAMES[j].short === opp){ gg = GAMES[j]; break; } }catch(e){}
      if (gg){
        var ghl = gg.highlights || null;
        try{ if (!ghl && typeof rssHighlights !== "undefined") ghl = rssHighlights[gg.n] || null; }catch(e){}
        strip = schedMediaHTML("MICH", {watch: gg.watch, tv: gg.tv, radio: michRadioURL(), hl: ghl, date: date, oppKey: opp, streamDead: gg.streamDead || null, radioDead: gg.radioDead || null});
      }
    } else {
      var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[team]) || [];
      var rr = null;
      for (var k = 0; k < sched.length; k++) if (sched[k].d === date && (sched[k].oppKey || "") === opp){ rr = sched[k]; break; }
      if (rr) strip = schedMediaHTML(team, {watch: rr.watch || rr.stream || null, tv: rr.tv || "", radio: rr.radio || null, hl: rr.hl || rr.highlights || null, date: date, oppKey: opp, streamDead: rr.streamDead || null, radioDead: rr.radioDead || null});
    }
    if (strip === null) continue;
    var old = null, head = null;
    for (var c = 0; c < row.children.length; c++){
      if (row.children[c].classList && row.children[c].classList.contains("row-media")) old = row.children[c];
      if (row.children[c].classList && row.children[c].classList.contains("row-head")) head = row.children[c];
    }
    if (!strip){
      if (old){ old.parentNode.removeChild(old); changed++; }
      continue;
    }
    if (old){
      if (old.outerHTML !== strip){ old.outerHTML = strip; changed++; }
    } else if (head){
      var tmp = document.createElement("div"); tmp.innerHTML = strip;
      row.insertBefore(tmp.firstChild, head.nextSibling); changed++;
    }
  }
  return changed;
}
function teamSchedRowsHTML(short){
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[short]) || [];
  if (!sched.length) return '<div class="tv-note">No saved schedule for this team in this app.</div>';
  var de = null; try{ de = dirEntry(short); }catch(e){}
  var html = "";
  sched.forEach(function(r, idx){
    var g = structuredToGeneric(short, r);
    var oppKey = r.oppKey || null;
    var isTbd = !oppKey && /^tbd$/i.test(String(r.opp || "").trim());
    var isEx = !!g.exhibition;
    var n = idx + 1;
    var statusTxt = "";
    if (r.result){
      statusTxt = g.done ? '<span class="meta-status row-status">Final</span>' : '<span class="meta-status row-status">' + esc(r.result) + '</span>';
    } else if (!r.result && r.d < centralTodayISO(Date.now())) {
      statusTxt = '<span class="meta-status row-status">No result published</span>';
    } else {
      var lbl = r.timeCT ? displayTimeCT(r.timeCT, r.d) : "";
      statusTxt = lbl ? '<span class="meta-status row-status upcoming">' + esc(lbl) + '</span>' : '<span class="meta-status row-status"></span>';
    }
    if (r.schedUnconfirmed) statusTxt = '<span class="meta-status row-status">No longer listed on the official schedule — unconfirmed</span>';
    var myLetter = resultLetter(r.result);
    var myScore = '<span class="row-score" data-score="my">' + (g.done ? g.myScore : "") + '</span>' + wlSpan(g.done ? myLetter : null, "my");
    var oppScore = '<span class="row-score" data-score="opp">' + (g.done ? g.oppScore : "") + '</span>' + wlSpan(g.done ? oppLetter(myLetter) : null, "opp");
    var myLine = '<span class="row-team">' + rankBadge(currentIntroRank(short), short) + (de ? teamLogoImg(de, "tv-logo") : "") + '<span>' + esc(de ? de.name : short) + '</span>' + myScore + '</span>';
    var oppLine = "";
    if (oppKey){
      var ode = null; try{ ode = dirEntry(oppKey); }catch(e){}
      oppLine = '<span class="row-team">' + rankBadge(currentIntroRank(oppKey), oppKey) + (ode ? teamLogoImg(ode, "tv-logo") : "") + '<span class="team-name-btn" data-team="' + esc(oppKey) + '" role="button" tabindex="0">' + esc(g.oppName) + '</span>' + oppScore + '</span>';
    } else {
      oppLine = '<span class="row-team"><span>' + esc(isTbd ? "Opponent to be determined" : g.oppName) + '</span>' + oppScore + '</span>';
    }
    var teamLines = (r.ha === "H") ? myLine + oppLine : oppLine + myLine;
    var h2hTxt = "";
    if (isEx) h2hTxt = '<span class="row-h2h">Exhibition — no series record</span>';
    else if (!isTbd && oppKey){ var hl = h2hLine(short, oppKey); if (hl) h2hTxt = '<span class="row-h2h">' + esc(hl) + '</span>'; }
    else if (!isTbd && !oppKey) h2hTxt = '<span class="row-h2h">No D1 series record</span>';
    var det = '<div class="details" id="team-details-' + esc(short) + '-' + n + '" hidden>';
    det += '<div class="tv-line">' + fmtDate(r.d) + ' &mdash; ' + (r.ha === "H" ? "vs " : "at ") + esc(isTbd ? "Opponent to be determined" : g.oppName) + '</div>';
    if (r.timeCT) det += '<div class="tv-line">Time: ' + esc(displayTimeCT(r.timeCT, r.d)) + '</div>';
    else det += '<div class="tv-line">Time not published yet.</div>';
    if (r.result) det += '<div class="tv-line">Result: ' + esc(r.result) + '</div>';
    if (r.note && /unresolved|variant|discrepancy/i.test(r.note)) det += '<div class="tv-line">Note: sources disagree on this game\'s details — the official schedule is authoritative.</div>';
    if (isTbd){ var tm = String(r.note || "").match(/Beanpot|Holiday Face-Off|Empire State|Friendship Four|Great Lakes Invitational|CT Ice/i); det += '<div class="tv-line">Opponent to be determined' + (tm ? ' (' + esc(tm[0]) + ')' : '') + ' — mid-season tournament slot.</div>'; }
    if (short === "MICH" || hasMichFinal(short)) det += '<div class="tv-note">Box-score detail (scorers, goalies, penalties) is saved in the app only for Michigan games; this team\'s game detail publishes on the official recap.</div>';
    else det += '<div class="tv-note">Box-score detail (scorers, goalies, penalties) is not included for this game in this app; game details publish on the official recap.</div>';
    if (r.hl) det += '<div class="tv-line"><button data-team-hl="' + esc(short) + '|' + idx + '" type="button">Watch highlights</button> ' + esc(teamGameHlTitle(short, r)) + ' — plays in the app, fullscreen.</div>';
    det += '<div class="tv-line"><button data-team-detail="' + esc(short) + '|' + idx + '" type="button">Open full game details</button></div>';
    det += '</div>';
    var strip = schedMediaHTML(short, {watch: r.watch || r.stream || null, tv: r.tv || "", radio: r.radio || null, hl: r.hl || r.highlights || null, date: r.d, oppKey: r.oppKey});
    html += '<div class="row" data-sched-key="' + esc(short) + '|' + esc(r.d) + '|' + esc(oppKey || '') + '"><button class="row-head" data-team-game="' + esc(short) + '-' + n + '">' +
      '<span class="row-meta"><span class="gnum">Game ' + n + '</span>' +
      '<span class="gdate">' + fmtDate(r.d) + '</span>' +
      '<span class="vs">' + (r.ha === "H" ? "vs" : "at") + '</span>' +
      '<span class="meta-opp">' + esc(isTbd ? "Opponent to be determined" : g.oppName) + '</span>' +
      statusTxt + '</span>' +
      teamLines + h2hTxt + '</button>' + strip + det + '</div>';
  });
  return html;
}
// v32.6: Michigan team-page rows — same unified row structure as other
// teams (rank left, scores/time right), from GAMES. Details expand inline
// (venue/time/TV/result) with a jump to the full home-view slot.
function michTeamRowsHTML(){
  var html = "";
  GAMES.forEach(function(g){
    var ode = null; try{ ode = dirEntry(g.short); }catch(e){}
    var isFinal = g.status === "final";
    var statusTxt = "";
    if (isFinal) statusTxt = '<span class="meta-status row-status">Final</span>';
    else if (g.live) statusTxt = '<span class="meta-status row-status live-score">LIVE</span>';
    else { var lbl = timeShortLabel(g.timeCT, g.date); statusTxt = lbl ? '<span class="meta-status row-status upcoming">' + esc(lbl) + '</span>' : '<span class="meta-status row-status"></span>'; }
    var mLetter = isFinal ? (g.mich > g.oppScore ? "W" : g.mich < g.oppScore ? "L" : "T") : null;
    var michScore = (isFinal || g.live) ? '<span class="row-score" data-score="my">' + g.mich + '</span>' + wlSpan(mLetter, "my") : '<span class="row-score" data-score="my"></span>' + wlSpan(null, "my");
    var oppScore = (isFinal || g.live) ? '<span class="row-score" data-score="opp">' + g.oppScore + '</span>' + wlSpan(oppLetter(mLetter), "opp") : '<span class="row-score" data-score="opp"></span>' + wlSpan(null, "opp");
    var michLine = '<span class="row-team">' + rankBadge(g.michRank, "MICH") + '<img class="teamlogo mich" src="' + esc(navyLogoFile("MICH")) + '" alt="">' + '<span class="team-name-btn" data-team="MICH" role="button" tabindex="0">Michigan</span>' + michScore + '</span>';
    var oppLine = '<span class="row-team">' + rankBadge(g.oppRank, g.short) + (ode ? teamLogoImg(ode, "tv-logo") : "") + '<span class="team-name-btn" data-team="' + esc(g.short) + '" role="button" tabindex="0">' + esc(g.opp) + '</span>' + oppScore + '</span>';
    var teamLines = g.home ? michLine + oppLine : oppLine + michLine;
    var h2hTxt = h2hLine("MICH", g.short) ? '<span class="row-h2h">' + esc(h2hLine("MICH", g.short)) + '</span>' : "";
    var det = '<div class="details" id="team-details-MICH-' + g.n + '" hidden>';
    det += '<div class="tv-line">' + fmtDate(g.date) + ' &mdash; ' + (g.home ? "vs " : "at ") + esc(g.opp) + '</div>';
    if (g.venue) det += '<div class="tv-line" data-saved-venue="1">Venue: ' + esc(g.venue) + '</div>';
    if (g.timeCT) det += '<div class="tv-line">Time: ' + esc(displayTimeCT(g.timeCT, g.date)) + '</div>';
    if (g.tv) det += '<div class="tv-line">TV: ' + esc(g.tv) + '</div>';
    if (isFinal) det += '<div class="tv-line">Result: Michigan ' + g.mich + '&ndash;' + g.oppScore + '</div>';
    det += '<div class="tv-line"><button data-jump="' + g.n + '" type="button">Open full game details</button></div>';
    det += '</div>';
    var mstrip = schedMediaHTML("MICH", {watch: g.watch, tv: g.tv, radio: michRadioURL(), hl: g.highlights || (typeof rssHighlights !== "undefined" ? rssHighlights[g.n] : null), date: g.date, oppKey: g.short});
    html += '<div class="row" data-sched-key="MICH|' + esc(g.date) + '|' + esc(g.short) + '"><button class="row-head" data-team-game="MICH-' + g.n + '">' +
      '<span class="row-meta"><span class="gnum">Game ' + g.n + '</span>' +
      '<span class="gdate">' + fmtDate(g.date) + '</span>' +
      '<span class="vs">' + (g.home ? "vs" : "at") + '</span>' +
      '<span class="meta-opp">' + esc(g.opp) + '</span>' +
      statusTxt + '</span>' +
      teamLines + h2hTxt + '</button>' + mstrip + det + '</div>';
  });
  return html;
}
// v32.4 (datafill 2026-10-26): pack rosters carry jersey numbers where filled (num field); the ESPN roster feed overwrites by name when it has a number (live-first).
// After the pack roster renders, patch # cells by player name when the
// feed returns them. Pack membership stays authoritative; numbers only.
// v32.24 (§1.2 law 4, §3.4): the player page shows the SAME number as the
// table. The ESPN accelerator overlays saved-layer numbers only — never an
// official/CHN model value, which wins outright for display. Returns the
// display number (or mp.num / null when no overlay applies).
function espnDisplayNum(short, name, mp){
  try{
    if (mp && (mp.source === "official" || mp.source === "chn")) return mp.num;
    var j = null;
    (espnAccelCache[short] || []).forEach(function(a){ if (a.name && normName(a.name) === normName(name) && a.jersey) j = a.jersey; });
    if (j != null) return j;
  }catch(e){}
  return mp ? mp.num : null;
}
function applyRosterNumbers(short, athletes){
  var sec = $("#tv-roster-sec"); if (!sec) return 0;
  var map = {};
  (athletes || []).forEach(function(a){ if (a.name && a.jersey) map[a.name] = a.jersey; });
  // v32.24 (§3.4): an ESPN number never overwrites an official/CHN model
  // value — official wins outright for display, including yielding BACKWARD
  // when a later accelerator run disagrees with a prior check.
  var officialNames = {};
  try{ buildMergedModel(short).players.forEach(function(p){ if (p.source === "official" || p.source === "chn") officialNames[normName(p.name)] = true; }); }catch(e){}
  var patched = 0;
  $$(".player-link", sec).forEach(function(btn){
    var name = btn.getAttribute("data-player");
    if (!name || !map[name] || officialNames[normName(name)]) return;
    var row = btn.closest ? btn.closest("tr") : null;
    if (!row || !row.cells || row.cells.length < 2) return;
    // Live-first (datafill 2026-10-26): pack rosters now carry saved numbers, so a feed number always
    // wins over the saved one for that player; re-patching each poll keeps the live value current.
    row.cells[1].textContent = map[name]; row.cells[1].setAttribute("data-feed-num", "1"); patched++;
  });
  return patched;
}
function applyEspnPhotos(key){
  $$(".player-photo", document).forEach(function(el){
    if (el.getAttribute("data-player-team") !== key) return;
    var name = el.getAttribute("data-player") || "";
    var hit = espnPhotoFor(name, key, el.getAttribute("data-player-num"));
    if (!hit) return;
    swapPhotoEl(el, hit, 1);
  });
  try{ attachPlayerHandlers(document); }catch(e){}
}
// v32.24: appendFeedRosterRows REMOVED — ESPN-only names are candidates
// in the check store, never rendered roster members (merged-model law).
function refreshUnifiedRosterNumbers(short){
  var entry = null; try{ entry = teamEntry(short); }catch(e){}
  if (!entry) return;
  if (currentTeamKey !== short) return;
  var url = null; try{ url = espnTeamURL(short, "roster"); }catch(e){}
  if (!url || typeof fetch !== "function") return;
  if (espnAccelLast[short] && Date.now() - espnAccelLast[short] < 15 * 60 * 1000) return;
  espnAccelLast[short] = Date.now();
  fetchWithTimeout(url, 15000).then(function(r){ return r.json(); }).then(function(j){
    if (currentTeamKey !== short) return;
    var athletes = [];
    (j.athletes || []).forEach(function(a){
      athletes.push({name: a.displayName || ((a.firstName || "") + " " + (a.lastName || "")).trim(), jersey: a.jersey || null, headshot: (a.headshot && a.headshot.href) || null, espnId: (a.id != null ? String(a.id) : null), pos: (a.position && a.position.abbreviation) || null});
    });
    // v32.24: ESPN is numbers + photo/id cache ONLY — never membership.
    // ESPN-only names are recorded as candidates in the check store and
    // are never rendered as roster members anywhere.
    try{
      var cache = espnAccelCache[short] || [];
      athletes.forEach(function(a){
        var hit = null; cache.forEach(function(p){ if (p.name === a.name) hit = p; });
        if (hit){ if (a.jersey) hit.jersey = a.jersey; if (a.headshot) hit.headshot = a.headshot; if (a.espnId) hit.espnId = a.espnId; if (a.pos) hit.pos = a.pos; }
        else cache.push({name: a.name, jersey: a.jersey || null, headshot: a.headshot, espnId: a.espnId, pos: a.pos || null});
      });
      espnAccelCache[short] = cache;
      var modelNames = {};
      try{ buildMergedModel(short).players.forEach(function(p){ modelNames[normName(p.name)] = true; }); }catch(e){}
      var espOnly = [];
      athletes.forEach(function(a){ if (a.name && !modelNames[normName(a.name)]) espOnly.push(a.name); });
      if (espOnly.length){
        var store = rosterCheckStore();
        var cur = store[short] || {};
        cur.espnOnly = espOnly; cur.espnOnlyAt = centralTodayISO(Date.now());
        store[short] = cur;
        saveRosterCheckStore();
      }
    }catch(e){}
    try{ applyRosterNumbers(short, athletes); }catch(e){}
    try{ applyEspnPhotos(short); }catch(e){}
  }).catch(function(){});
}

// ================= v32.24 merged roster model (live-data fix) =============
// Hierarchy: official school roster > CHN current-season > saved snapshot
// (dated) > ESPN numbers/append-candidates ONLY (never membership).
// Saved bundled data is NEVER overwritten at runtime; live checks overlay
// it in memory and in a dated check store. A single incomplete feed never
// deletes a player: a departure counts only when the official roster no
// longer lists them, corroborated per the state machine below.
var ROSTER_SEED = {"MICH":{"date":"2026-10-28","result":"ok"},"AF":{"date":null,"result":"diffs"},"UAF":{"date":null,"result":"diffs"},"UAA":{"date":null,"result":"diffs"},"ASU":{"date":null,"result":"diffs"},"ARMY":{"date":"2026-10-28","result":"ok"},"AUG":{"date":null,"result":"diffs"},"BEM":{"date":null,"result":"diffs"},"BENT":{"date":"2026-10-28","result":"ok"},"BC":{"date":"2026-10-28","result":"ok"},"BU":{"date":null,"result":"diffs"},"BGSU":{"date":null,"result":"diffs"},"BRWN":{"date":"2026-10-28","result":"ok"},"CAN":{"date":"2026-10-28","result":"ok"},"CLAR":{"date":null,"result":"diffs"},"COLG":{"date":"2026-10-28","result":"ok"},"CC":{"date":"2026-10-28","result":"ok"},"CONN":{"date":null,"result":"diffs"},"COR":{"date":null,"result":"diffs"},"DART":{"date":"2026-10-28","result":"ok"},"DEN":{"date":"2026-10-28","result":"ok"},"FSU":{"date":"2026-10-28","result":"ok"},"HAR":{"date":null,"result":"official-parse-failed"},"HC":{"date":null,"result":"diffs"},"LSS":{"date":null,"result":"diffs"},"LIN":{"date":"2026-10-28","result":"ok"},"LIU":{"date":"2026-10-28","result":"ok"},"ME":{"date":"2026-10-28","result":"ok"},"MRVL":{"date":"2026-10-28","result":"ok"},"MASS":{"date":"2026-10-28","result":"ok"},"UML":{"date":null,"result":"diffs"},"MRMK":{"date":null,"result":"diffs"},"MIA":{"date":null,"result":"diffs"},"MSU":{"date":"2026-10-28","result":"ok"},"MTU":{"date":"2026-10-28","result":"ok"},"MINN":{"date":"2026-10-28","result":"ok"},"UMD":{"date":null,"result":"diffs"},"MNST":{"date":null,"result":"diffs"},"UNH":{"date":"2026-10-28","result":"ok"},"NIA":{"date":null,"result":"diffs"},"UND":{"date":null,"result":"diffs"},"NE":{"date":"2026-10-28","result":"ok"},"NMI":{"date":"2026-10-28","result":"ok"},"ND":{"date":null,"result":"diffs"},"OSU":{"date":"2026-10-28","result":"ok"},"OMA":{"date":null,"result":"diffs"},"PSU":{"date":"2026-10-28","result":"ok"},"PRIN":{"date":"2026-10-28","result":"ok"},"PROV":{"date":null,"result":"diffs"},"QUIN":{"date":null,"result":"diffs"},"RPI":{"date":null,"result":"diffs"},"RMU":{"date":null,"result":"diffs"},"RIT":{"date":null,"result":"diffs"},"SHU":{"date":"2026-10-28","result":"ok"},"SCSU":{"date":"2026-10-28","result":"ok"},"SLU":{"date":null,"result":"diffs"},"STMN":{"date":"2026-10-28","result":"ok"},"STO":{"date":null,"result":"diffs"},"UNNY":{"date":null,"result":"diffs"},"UVM":{"date":null,"result":"diffs"},"WMU":{"date":"2026-10-28","result":"ok"},"WIS":{"date":"2026-10-28","result":"ok"},"YALE":{"date":null,"result":"diffs"}};
var rosterCheckStoreMem = null;
var rosterDeparturesMem = null;
var rosterCheckInFlight = {};
var liveResultsStore = {};
var espnAccelLast = {};
function rosterCheckStore(){
  if (!rosterCheckStoreMem){
    try{ rosterCheckStoreMem = load("vmax-roster-check-v1", {}) || {}; }catch(e){ rosterCheckStoreMem = {}; }
  }
  return rosterCheckStoreMem;
}
function saveRosterCheckStore(){ try{ save("vmax-roster-check-v1", rosterCheckStoreMem); }catch(e){} }
function rosterDepartures(){
  if (!rosterDeparturesMem){
    try{ rosterDeparturesMem = load("vmax-roster-departures-v1", {}) || {}; }catch(e){ rosterDeparturesMem = {}; }
  }
  return rosterDeparturesMem;
}
function saveRosterDepartures(){ try{ save("vmax-roster-departures-v1", rosterDeparturesMem); }catch(e){} }
function posLong(p){
  var s = String(p || "").trim();
  if (s === "F" || /^forward/i.test(s)) return "Forward";
  if (s === "D" || /^defen[cs]e/i.test(s)) return "Defense";
  if (s === "G" || s === "GK" || /^goal/i.test(s)) return "Goalie";
  return s;
}
function normPosShort(p){
  var s = String(p || "").trim().toLowerCase();
  if (s === "f" || s.indexOf("forward") === 0) return "F";
  if (s === "c" || s === "lw" || s === "rw" || s.indexOf("center") === 0 || s.indexOf("centre") === 0 || s.indexOf("left wing") === 0 || s.indexOf("right wing") === 0 || s.indexOf("winger") === 0) return "F";
  if (s === "d" || s.indexOf("defen") === 0) return "D";
  if (s === "g" || s === "gk" || s.indexOf("goal") === 0) return "G";
  return s;
}
function hometownCity(h){
  try{
    var s = normName(String(h || "").split(",")[0]);
    return s;
  }catch(e){ return ""; }
}
function classNorm(c){
  var s = String(c || "").trim().replace(/\./g, "").toLowerCase();
  if (s === "freshman" || s === "fr" || s === "fy" || s === "first-year" || s === "first year") return "Fr";
  if (s === "sophomore" || s === "so") return "So";
  if (s === "junior" || s === "jr") return "Jr";
  if (s === "senior" || s === "sr") return "Sr";
  if (s === "graduate" || s === "grad" || s === "gr") return "Gr";
  if (s === "fifth year" || s === "5th year" || s === "fifth-year") return "5th";
  if (s === "redshirt freshman") return "R-Fr";
  if (s === "redshirt sophomore") return "R-So";
  if (s === "redshirt junior") return "R-Jr";
  if (s === "redshirt senior") return "R-Sr";
  return String(c || "").trim().replace(/\./g, "");
}
function heightNorm(h){
  return String(h || "").trim().toLowerCase().replace(/\s+/g, "").replace(/'/g, "-").replace(/"/g, "");
}
function weightNorm(w){ return String(w || "").replace(/[^0-9]/g, ""); }
function modelSavedPlayers(short){
  var out = [];
  var entry = null; try{ entry = teamEntry(short); }catch(e){}
  if (!entry) return out;
  if (!entry._packConverted && entry.roster){
    [["F", "Forward"], ["D", "Defense"], ["G", "Goalie"]].forEach(function(g){
      (entry.roster[g[0]] || []).forEach(function(t){
        out.push({num: t[0], name: t[1], pos: g[1], cls: t[2] || null, ht: null, wt: null, hometown: null, group: g[0]});
      });
    });
  } else {
    var pd = null; try{ pd = packData(short); }catch(e){}
    (pd && pd.roster ? pd.roster : []).forEach(function(p){
      var g = (p.pos === "D") ? "D" : (p.pos === "G" || p.pos === "GK") ? "G" : "F";
      out.push({num: p.num != null ? p.num : null, name: p.name, pos: posLong(p.pos), cls: p.cls || null, ht: p.ht || null, wt: p.wt || null, hometown: p.hometown || null, group: g});
    });
  }
  if (short === "MICH" && typeof michBio === "function"){
    out.forEach(function(p){
      var bio = null; try{ bio = michBio(p.name); }catch(e){}
      if (bio){
        if (bio.num != null) p.num = bio.num;
        if (bio.pos) p.pos = bio.pos;
        if (bio.cls) p.cls = bio.cls;
        if (bio.height) p.ht = bio.height;
        if (bio.weight) p.wt = bio.weight;
        if (bio.hometown) p.hometown = bio.hometown;
        if (bio.photo){ p.photo = bio.photo; p.photoRank = 4; p.photoSource = "saved"; }
      }
    });
  }
  return out;
}
function modelPhotoFor(p, short){
  if (p.photo && p.photoRank === 4) return p;
  if (short !== "MICH"){
    var c = null; try{ c = chnPhotoFor(p.name, short); }catch(e){}
    if (c && c.photo){
      var conf = chnPhotoConflicts[short] || [];
      var bad = false; conf.forEach(function(x){ if (normName(x.name) === normName(p.name)) bad = true; });
      if (!bad){ p.photo = c.photo; p.photoRank = 3; p.photoSource = "chn"; return p; }
      p.photoConflict = true;
    }
    var o = null; try{ o = officialPhotoFor(p.name, short); }catch(e){}
    if (o){ p.photo = o; p.photoRank = 2; p.photoSource = "official"; return p; }
    var e = null; try{ e = espnPhotoFor(p.name, short, p.num); }catch(e){}
    if (e){ p.photo = e; p.photoRank = 1; p.photoSource = "espn"; return p; }
  }
  p.photo = null; p.photoRank = 0; p.photoSource = null;
  return p;
}
function buildMergedModel(short){
  var saved = modelSavedPlayers(short);
  var check = null; try{ check = rosterCheckStore()[short] || null; }catch(e){}
  var players = saved.map(function(p){
    var c = {num: p.num, name: p.name, pos: p.pos, cls: p.cls, ht: p.ht, wt: p.wt, hometown: p.hometown, group: p.group, status: "saved", source: "saved", photo: p.photo || null, photoRank: p.photoRank || 0, photoSource: p.photoSource || null};
    return c;
  });
  var removed = [];
  var dupNames = [];
  if (check){
    var liveMap = {};
    (check.players || []).forEach(function(r){ liveMap[normName(r.name)] = r; });
    var remMap = check.removed || {};
    var uncMap = check.unconfirmed || {};
    players = players.filter(function(p){
      var n = normName(p.name);
      if (remMap[n]){ removed.push(remMap[n]); return false; }
      var lv = liveMap[n];
      if (lv){
        if (lv.num != null && lv.num !== "") p.num = lv.num;
        if (lv.pos) p.pos = posLong(lv.pos);
        if (lv.cls) p.cls = lv.cls;
        if (lv.ht) p.ht = lv.ht;
        if (lv.wt) p.wt = lv.wt;
        if (lv.hometown && hometownCity(lv.hometown) !== hometownCity(p.hometown)) p.hometown = lv.hometown;
        p.status = "live"; p.source = check.source || "live";
      } else if (uncMap[n]){
        p.status = "unconfirmed";
        p.statusLine = "No longer listed — unconfirmed (first noted " + fmtDate(uncMap[n].firstNoted) + ")";
      }
      return true;
    });
    (check.added || []).forEach(function(a){
      players.push({num: a.num != null ? a.num : null, name: a.name, pos: posLong(a.pos), cls: a.cls || null, ht: a.ht || null, wt: a.wt || null, hometown: a.hometown || null, group: (normPosShort(a.pos) === "D") ? "D" : (normPosShort(a.pos) === "G") ? "G" : "F", status: "live", source: check.source || "live", added: true, transferNote: a.transferNote || null, photo: null, photoRank: 0, photoSource: null});
    });
  }
  var counts = {};
  players.forEach(function(p){ var n = normName(p.name); counts[n] = (counts[n] || 0) + 1; });
  players.forEach(function(p){
    if (counts[normName(p.name)] > 1){
      p.photo = null; p.photoRank = 0; p.photoSource = null; p.dupConflict = true;
      if (dupNames.indexOf(p.name) === -1) dupNames.push(p.name);
    } else {
      modelPhotoFor(p, short);
    }
  });
  return {short: short, players: players, removed: removed, dupNames: dupNames,
    checkDate: check ? check.successAt : null, checkSource: check ? check.source : null,
    espnOnly: check ? (check.espnOnly || []) : []};
}
function modelFindPlayer(short, name){
  try{
    var m = buildMergedModel(short);
    for (var i = 0; i < m.players.length; i++) if (normName(m.players[i].name) === normName(name)) return m.players[i];
  }catch(e){}
  return null;
}
function removedLookup(short, name){
  try{
    var check = rosterCheckStore()[short];
    if (check && check.removed) return check.removed[normName(name)] || null;
  }catch(e){}
  return null;
}
// Pure membership diff. saved/live rows: {name,num,pos,cls,ht,wt,hometown}.
// prev: prior check {unconfirmed, removed} or null. opts: {todayISO, corroborate:{norm: string}}.
// First-time drops with corroboration go straight to removed; without it
// they become unconfirmed. A drop corroborated later (or 7+ days old)
// promotes from unconfirmed to removed. Reappearance clears removal.
function diffMembership(saved, live, prev, opts){
  opts = opts || {};
  var today = opts.todayISO || centralTodayISO(Date.now());
  var corrob = opts.corroborate || {};
  var liveMap = {};
  (live || []).forEach(function(r){ liveMap[normName(r.name)] = r; });
  var savedMap = {};
  (saved || []).forEach(function(s){ savedMap[normName(s.name)] = s; });
  var current = [], added = [], removed = [], unconfirmed = [], fieldChanges = [];
  function fieldCmp(s, l){
    var checks = [
      ["num", s.num != null ? String(s.num) : null, l.num != null && l.num !== "" ? String(l.num) : null, null],
      ["pos", normPosShort(s.pos), normPosShort(l.pos), null],
      ["cls", classNorm(s.cls), classNorm(l.cls), null],
      ["ht", heightNorm(s.ht), heightNorm(l.ht), null],
      ["wt", weightNorm(s.wt), weightNorm(l.wt), null],
      ["hometown", hometownCity(s.hometown), hometownCity(l.hometown), null]
    ];
    checks.forEach(function(c){
      if (c[1] && c[2] && c[1] !== c[2]) fieldChanges.push({name: s.name, field: c[0], old: c[1], new: c[2]});
    });
  }
  (saved || []).forEach(function(s){
    var n = normName(s.name);
    var lv = liveMap[n];
    if (lv){
      var merged = {num: s.num, name: s.name, pos: s.pos, cls: s.cls, ht: s.ht, wt: s.wt, hometown: s.hometown};
      if (lv.num != null && lv.num !== "") merged.num = lv.num;
      if (lv.pos) merged.pos = lv.pos;
      if (lv.cls) merged.cls = lv.cls;
      if (lv.ht) merged.ht = lv.ht;
      if (lv.wt) merged.wt = lv.wt;
      if (lv.hometown && hometownCity(lv.hometown) !== hometownCity(s.hometown)) merged.hometown = lv.hometown;
      fieldCmp(s, lv);
      current.push(merged);
      return;
    }
    var prevUnc = prev && prev.unconfirmed ? prev.unconfirmed[n] : null;
    var cb = corrob[n] || null;
    if (prevUnc){
      var days = 0;
      try{ days = Math.floor((Date.parse(today) - Date.parse(prevUnc.firstNoted)) / 86400000); }catch(e){}
      if (days >= 7 || cb){
        removed.push({name: s.name, num: s.num, pos: s.pos, cls: s.cls, ht: s.ht, wt: s.wt, hometown: s.hometown, date: today, corroboration: cb || ("unlisted 7+ days (first noted " + prevUnc.firstNoted + ")")});
      } else {
        unconfirmed.push({name: s.name, firstNoted: prevUnc.firstNoted});
      }
    } else if (cb){
      removed.push({name: s.name, num: s.num, pos: s.pos, cls: s.cls, ht: s.ht, wt: s.wt, hometown: s.hometown, date: today, corroboration: cb});
    } else {
      unconfirmed.push({name: s.name, firstNoted: today});
    }
  });
  (live || []).forEach(function(l){
    if (!savedMap[normName(l.name)]) added.push({num: l.num != null ? l.num : null, name: l.name, pos: l.pos || null, cls: l.cls || null, ht: l.ht || null, wt: l.wt || null, hometown: l.hometown || null});
  });
  return {current: current, added: added, removed: removed, unconfirmed: unconfirmed, fieldChanges: fieldChanges};
}
function modelHeaderLabel(short){
  try{
    var check = rosterCheckStore()[short];
    if (check && check.successAt){
      if (check.attemptFailedAt && check.attemptFailedMs && (!check.successMs || check.attemptFailedMs > check.successMs)) return "Live roster check unavailable — showing last verified roster (" + fmtDate(check.successAt) + ")";
      if (check.successMs && Date.now() - check.successMs < 24 * 60 * 60 * 1000) return "Roster checked " + fmtDate(check.successAt);
      return "Roster last checked " + fmtDate(check.successAt) + " — re-checking on open";
    }
    if (check && check.attemptFailedAt){
      var sd0 = ROSTER_SEED[short];
      if (sd0 && sd0.result === "unparseable" && sd0.date) return "Last verified " + fmtDate(sd0.date) + " — official page not machine-readable";
      return "Live roster check unavailable — showing saved roster (date not recorded)";
    }
  }catch(e){}
  var seed = ROSTER_SEED[short];
  if (seed && seed.date){
    if (seed.result === "unparseable") return "Last verified " + fmtDate(seed.date) + " — official page not machine-readable";
    return "Roster last checked " + fmtDate(seed.date) + " — re-checking on open";
  }
  return "Live roster check unavailable — showing saved roster (date not recorded)";
}
function rosterSectionHTML(short){
  var t = null; try{ t = teamEntry(short); }catch(e){}
  var model = null; try{ model = buildMergedModel(short); }catch(e){}
  var html = '<div class="tv-title">' + (t && t._packConverted ? "ROSTER (VERIFIED)" : "ROSTER") + "</div>";
  html += '<div class="tv-note" id="tv-roster-headline">' + esc(modelHeaderLabel(short)) + "</div>";
  var groups = {F: [], D: [], G: []};
  (model ? model.players : []).forEach(function(p){
    groups[p.group || "F"].push([p.num, p.name, p.cls, p.ht, p.wt, p.hometown, p.statusLine || null]);
  });
  html += rosterTable("Forwards", groups.F, short) + rosterTable("Defensemen", groups.D, short) + rosterTable("Goalies", groups.G, short);
  if (t && t._packConverted && t.flags && t.flags.weights_withheld) html += '<div class="tv-note">Weights withheld for this team — sources disagree across the roster, so no weight is shown rather than a guessed one.</div>';
  else if (t && t._packConverted && t.withheld_n && t.withheld_n.wt) html += '<div class="tv-note">Weights withheld for ' + t.withheld_n.wt + ' of ' + t.roster_n + ' players — sources disagree, so those players show no weight rather than a guessed one.</div>';
  html += '<div class="tv-note">Class shown where published; &ldquo;&ndash;&rdquo; means not published in the sources checked. Roster sources: official team sites and College Hockey News.</div>';
  return html;
}
function rerenderRosterSection(short){
  try{
    var sec = $("#tv-roster-sec");
    if (!sec || currentTeamKey !== short) return;
    sec.innerHTML = rosterSectionHTML(short);
    try{ attachPlayerHandlers(sec); }catch(e){}
  }catch(e){}
}
// SIDEARM roster parser: classic card containers + newer Vue s-person-card
// aria-label cards. Returns [{name,num,pos,cls,ht,wt,hometown}]. A page
// yielding <5 rows is a parse failure at the call site, never a small roster.
function parseSidearmRosterHTML(htmlText, pageUrl){
  var out = [];
  var seen = {};
  try{
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var clean = function(s){ return String(s || "").replace(/\s+/g, " ").trim(); };
    var cleanRosterName = function(nm){
      var s = clean(nm);
      s = s.replace(/^[\d\/\.\-\s]+/, "");
      s = s.replace(/^[CA]\s+/, "");
      return s.replace(/\s+/g, " ").trim();
    };
    var push = function(r){
      if (!r.name) return;
      var k = normName(r.name) + "|" + String(r.num || "");
      if (seen[k]) return;
      seen[k] = true;
      out.push(r);
    };
    var cards = doc.querySelectorAll(".sidearm-roster-player-container");
    for (var i = 0; i < cards.length; i++){
      var c = cards[i];
      var pick = function(sel){ var el = c.querySelector(sel); return el ? clean(el.textContent) : ""; };
      var nm = cleanRosterName(pick(".sidearm-roster-player-name"));
      if (!nm){
        var a = c.querySelector("a");
        if (a) nm = cleanRosterName(a.textContent);
      }
      var jer = pick(".sidearm-roster-player-jersey-number") || pick(".sidearm-roster-player-jersey");
      jer = jer.replace(/[^0-9]/g, "");
      var lsTxt = pick(".sidearm-roster-player-position-long-short");
      var posTxt = lsTxt || pick(".sidearm-roster-player-position") || "";
      var pm = posTxt.match(/^\s*(GK|Goaltender|Goalie|Defenseman|Defense|Forward|Center|Centre|Left Wing|Right Wing|Winger|F|D|G)\b/i);
      var htVal = pick(".sidearm-roster-player-height") || null;
      var wtVal = pick(".sidearm-roster-player-weight") || null;
      if ((!htVal || !wtVal) && lsTxt){
        var hm = lsTxt.match(/(\d\s*['\u2032]\s*\d+)\s*["\u2033]?\s*(\d+)\s*lbs/i);
        if (hm){ if (!htVal) htVal = hm[1].replace(/\s+/g, ""); if (!wtVal) wtVal = hm[2]; }
      }
      push({name: nm, num: jer || null,
        pos: pm ? pm[1] : (posTxt || null),
        cls: pick(".sidearm-roster-player-academic-year") || null,
        ht: htVal,
        wt: wtVal,
        hometown: pick(".sidearm-roster-player-hometown") || null});
    }
    if (!out.length){
      var vcards = doc.querySelectorAll(".s-person-card__content, [aria-label]");
      for (var j = 0; j < vcards.length; j++){
        var vc = vcards[j];
        var label = vc.getAttribute ? (vc.getAttribute("aria-label") || "") : "";
        var m = label.match(/^(.*?)\s+jersey number\s+(\d+)\s+full bio/i);
        if (!m) continue;
        var txt = clean(vc.textContent);
        var field = function(re){ var mm = txt.match(re); return mm ? clean(mm[1]) : null; };
        push({name: cleanRosterName(m[1]), num: m[2],
          pos: field(/Position\s*\|\s*([^|]+)/i),
          cls: field(/Academic Year\s*\|\s*([^|]+)/i),
          ht: field(/Height\s*\|\s*([^|]+)/i),
          wt: field(/Weight\s*\|\s*([^|]+)/i),
          hometown: field(/Hometown\s*\|\s*([^|]+)/i)});
      }
    }
    if (!out.length){
      var tables = doc.querySelectorAll("table");
      for (var ti = 0; ti < tables.length; ti++){
        var ths = tables[ti].querySelectorAll("thead th");
        if (!ths.length) continue;
        var htxt = [];
        for (var hi = 0; hi < ths.length; hi++) htxt.push(clean(ths[hi].textContent).toLowerCase());
        var ni = -1, ji = -1, pi = -1, hi2 = -1, wi = -1, ci = -1, hoi = -1;
        for (var hj = 0; hj < htxt.length; hj++){
          var hh = htxt[hj];
          if (ni === -1 && /^name$/.test(hh)) ni = hj;
          else if (ji === -1 && /^(#|jersey)/.test(hh)) ji = hj;
          else if (pi === -1 && /position/.test(hh)) pi = hj;
          else if (hi2 === -1 && /height/.test(hh)) hi2 = hj;
          else if (wi === -1 && /weight/.test(hh)) wi = hj;
          else if (ci === -1 && /class|academic year/.test(hh)) ci = hj;
          else if (hoi === -1 && /hometown/.test(hh)) hoi = hj;
        }
        if (ni === -1 || pi === -1 || (hi2 === -1 && wi === -1)) continue;
        var trs = tables[ti].querySelectorAll("tbody tr");
        for (var ri = 0; ri < trs.length; ri++){
          var tds = trs[ri].querySelectorAll("th, td");
          if (!tds.length || ni >= tds.length) continue;
          var tnm = cleanRosterName(tds[ni].textContent);
          if (!tnm || tnm.split(/\s+/).filter(Boolean).length < 2) continue;
          if (/^(toggle|connect|name)$/i.test(tnm)) continue;
          var tjer = (ji !== -1 && ji < tds.length) ? clean(tds[ji].textContent).replace(/[^0-9]/g, "") : "";
          var twt = (wi !== -1 && wi < tds.length) ? clean(tds[wi].textContent).replace(/[^0-9]/g, "") : "";
          push({name: tnm, num: tjer || null,
            pos: (pi !== -1 && pi < tds.length) ? clean(tds[pi].textContent) : null,
            cls: (ci !== -1 && ci < tds.length) ? clean(tds[ci].textContent) : null,
            ht: (hi2 !== -1 && hi2 < tds.length) ? clean(tds[hi2].textContent) : null,
            wt: twt || null,
            hometown: (hoi !== -1 && hoi < tds.length) ? clean(tds[hoi].textContent) : null});
        }
      }
    }
  }catch(e){ return out; }
  return out;
}
function rosterOverlapOK(short, rows){
  try{
    var saved = modelSavedPlayers(short);
    if (!saved.length) return true;
    var liveNames = {};
    rows.forEach(function(r){ liveNames[normName(r.name)] = true; });
    var hit = 0;
    saved.forEach(function(s){ if (liveNames[normName(s.name)]) hit++; });
    return (hit / saved.length) >= 0.5;
  }catch(e){ return true; }
}
function runEspnAccelTick(){
  try{ if (currentTeamKey) refreshUnifiedRosterNumbers(currentTeamKey); }catch(e){}
}
function runMembershipCheck(short, onDone){
  try{
    if (!short || rosterCheckInFlight[short]) return;
    var prev = null; try{ prev = rosterCheckStore()[short] || null; }catch(e){}
    if (prev && prev.successMs && Date.now() - prev.successMs < 24 * 60 * 60 * 1000){ if (onDone) onDone(); return; }
    if (typeof fetch !== "function") return;
    rosterCheckInFlight[short] = true;
    var today = centralTodayISO(Date.now());
    var entry = null; try{ entry = dirEntry(short); }catch(e){}
    var teamName = entry ? entry.name : short;
    var finish = function(rows, source, pageUrl, pageText){
      try{
        var saved = modelSavedPlayers(short);
        var liveRows = rows.map(function(r){
          return {name: r.name, num: (r.num != null && r.num !== "") ? r.num : null, pos: r.pos || null, cls: r.cls || null, ht: r.ht || null, wt: r.wt || null, hometown: r.hometown || null};
        });
        var liveNames = {};
        liveRows.forEach(function(r){ liveNames[normName(r.name)] = true; });
        var corrob = {};
        var deps = rosterDepartures();
        saved.forEach(function(s){
          var n = normName(s.name);
          if (liveNames[n]) return;
          var d = deps[n];
          if (d && d.transferTo) corrob[n] = "transfer corroborated (now at " + d.transferToName + ")";
        });
        var diff = diffMembership(saved, liveRows, prev, {todayISO: today, corroborate: corrob});
        var afterCorrob = function(){
          var diff2 = diff;
          var missing = [];
          saved.forEach(function(s){ if (!liveNames[normName(s.name)]) missing.push(s); });
          var espNames = null;
          try{ (espnAccelCache[short] || []).forEach(function(a){ (espNames = espNames || {})[normName(a.name)] = true; }); }catch(e){}
          var changed = false;
          missing.forEach(function(s){
            var n = normName(s.name);
            if (!corrob[n] && espNames && !espNames[n]){ corrob[n] = "ESPN-drop"; changed = true; }
          });
          if (changed) diff2 = diffMembership(saved, liveRows, prev, {todayISO: today, corroborate: corrob});
          var newRemoved = {};
          (prev && prev.removed ? Object.keys(prev.removed) : []).forEach(function(n){
            if (!liveNames[n]) newRemoved[n] = prev.removed[n];
          });
          var newUnc = {};
          diff2.unconfirmed.forEach(function(u){ newUnc[normName(u.name)] = {name: u.name, firstNoted: u.firstNoted}; });
          var addedRows = diff2.added.map(function(a){
            var row = {num: a.num, name: a.name, pos: a.pos, cls: a.cls, ht: a.ht, wt: a.wt, hometown: a.hometown};
            var dep = deps[normName(a.name)];
            if (dep && dep.team !== short){
              var posOk = dep.pos && a.pos && normPosShort(dep.pos) === normPosShort(a.pos);
              var clsOk = dep.cls && a.cls && classNorm(dep.cls) === classNorm(a.cls);
              var phoOk = dep.photoStem && a.photoStem && dep.photoStem === a.photoStem;
              if (posOk || clsOk || phoOk){
                row.transferNote = "Previously " + dep.teamName + ".";
                dep.transferTo = short; dep.transferToName = teamName; dep.corroborated = true;
              } else {
                row.transferReview = true;
              }
            }
            return row;
          });
          var transferReview = [];
          addedRows.forEach(function(a){ if (a.transferReview) transferReview.push(a.name); });
          diff2.removed.forEach(function(r){
            newRemoved[normName(r.name)] = {name: r.name, num: r.num, pos: r.pos, cls: r.cls, ht: r.ht, wt: r.wt, hometown: r.hometown, date: r.date, corroboration: r.corroboration};
          });
          diff2.unconfirmed.forEach(function(u){
            if (!deps[normName(u.name)]){
              var sv = null;
              saved.forEach(function(s){ if (normName(s.name) === normName(u.name)) sv = s; });
              deps[normName(u.name)] = {team: short, teamName: teamName, pos: sv ? sv.pos : null, cls: sv ? sv.cls : null, photoStem: null, dropDate: u.firstNoted, status: "unconfirmed"};
            }
          });
          diff2.removed.forEach(function(r){
            var n = normName(r.name);
            var ex = deps[n] || {team: short, teamName: teamName};
            ex.team = short; ex.teamName = teamName; ex.pos = r.pos; ex.cls = r.cls;
            ex.dropDate = r.date; ex.status = "removed";
            if (r.transferTo){ ex.transferTo = r.transferTo; }
            deps[n] = ex;
          });
          saveRosterDepartures();
          var store = rosterCheckStore();
          var oldEspnOnly = (prev && prev.espnOnly) || [];
          store[short] = {source: source, successAt: today, successMs: Date.now(), players: liveRows, added: addedRows, unconfirmed: newUnc, removed: newRemoved, transferReview: transferReview, espnOnly: oldEspnOnly, attemptFailedAt: null, attemptFailedMs: null};
          saveRosterCheckStore();
          try{
            if (source === "chn"){
              var map = {};
              rows.forEach(function(r){ if (r.photo) map[normName(r.name)] = r; });
              var cur = chnPhotoCache[short] || {};
              Object.keys(map).forEach(function(k){ cur[k] = map[k]; });
              chnPhotoCache[short] = cur;
            }
            if (source === "official" && pageText && pageUrl){
              try{
                var omap = parseOfficialRosterHTML(pageText, pageUrl, officialKnownNames(short));
                var ocur = officialPhotoCache[short] || {};
                Object.keys(omap).forEach(function(k){ ocur[k] = omap[k]; });
                officialPhotoCache[short] = ocur;
              }catch(e){}
            }
          }catch(e){}
          rosterCheckInFlight[short] = false;
          rerenderRosterSection(short);
          if (onDone) onDone();
        };
        var needChn = (source === "official") && diff.removed.length + diff.unconfirmed.length > 0;
        if (needChn){
          var curl = null; try{ curl = chnRosterURL(short); }catch(e){}
          if (curl){
            fetchWithTimeout(curl, 15000).then(function(r){ return r.text(); }).then(function(t){
              var cmap = parseChnRosterHTML(t, curl, short);
              var cvals = Object.keys(cmap).map(function(k){ return cmap[k]; });
              if (cvals.length >= 5){
                var cNames = {};
                cvals.forEach(function(r){ cNames[normName(r.name)] = true; });
                var ch = false;
                saved.forEach(function(s){
                  var n = normName(s.name);
                  if (!liveNames[n] && !cNames[n] && !corrob[n]){ corrob[n] = "CHN-drop"; ch = true; }
                });
                if (ch) diff = diffMembership(saved, liveRows, prev, {todayISO: today, corroborate: corrob});
              }
              afterCorrob();
            }).catch(function(){ afterCorrob(); });
            return;
          }
        }
        afterCorrob();
      }catch(e){
        rosterCheckInFlight[short] = false;
        if (onDone) onDone();
      }
    };
    var fail = function(){
      try{
        var store = rosterCheckStore();
        var cur = store[short] || {};
        cur.attemptFailedAt = today; cur.attemptFailedMs = Date.now();
        store[short] = cur;
        saveRosterCheckStore();
      }catch(e){}
      rosterCheckInFlight[short] = false;
      rerenderRosterSection(short);
      // v32.24: a failed check brings no fresher official/CHN value, so the
      // ESPN accelerator cache (if any) still stands — re-apply it so the
      // table does not lose live numbers to the re-render. The guarded
      // applier skips official/CHN-sourced players, so a prior official
      // value is never overwritten here.
      try{ applyRosterNumbers(short, espnAccelCache[short] || []); }catch(e){}
      try{ applyEspnPhotos(short); }catch(e){}
      if (onDone) onDone();
    };
    var ourl = null; try{ ourl = officialRosterURL(short); }catch(e){}
    if (ourl){
      fetchWithTimeout(ourl, 15000).then(function(r){ return r.text(); }).then(function(t){
        var rows = parseSidearmRosterHTML(t, ourl);
        if (rows.length >= 5 && rosterOverlapOK(short, rows)){ finish(rows, "official", ourl, t); return; }
        var curl = null; try{ curl = chnRosterURL(short); }catch(e){}
        if (!curl){ fail(); return; }
        fetchWithTimeout(curl, 15000).then(function(r2){ return r2.text(); }).then(function(t2){
          var cmap = parseChnRosterHTML(t2, curl, short);
          var cvals = Object.keys(cmap).map(function(k){ return cmap[k]; });
          if (cvals.length >= 5 && rosterOverlapOK(short, cvals)){ finish(cvals, "chn", curl, t2); return; }
          fail();
        }).catch(function(){ fail(); });
      }).catch(function(){
        var curl = null; try{ curl = chnRosterURL(short); }catch(e){}
        if (!curl){ fail(); return; }
        fetchWithTimeout(curl, 15000).then(function(r2){ return r2.text(); }).then(function(t2){
          var cmap = parseChnRosterHTML(t2, curl, short);
          var cvals = Object.keys(cmap).map(function(k){ return cmap[k]; });
          if (cvals.length >= 5 && rosterOverlapOK(short, cvals)){ finish(cvals, "chn", curl, t2); return; }
          fail();
        }).catch(function(){ fail(); });
      });
      return;
    }
    var curl0 = null; try{ curl0 = chnRosterURL(short); }catch(e){}
    if (curl0){
      fetchWithTimeout(curl0, 15000).then(function(r){ return r.text(); }).then(function(t){
        var cmap = parseChnRosterHTML(t, curl0, short);
        var cvals = Object.keys(cmap).map(function(k){ return cmap[k]; });
        if (cvals.length >= 5 && rosterOverlapOK(short, cvals)){ finish(cvals, "chn", curl0, t); return; }
        fail();
      }).catch(function(){ fail(); });
      return;
    }
    fail();
  }catch(e){
    rosterCheckInFlight[short] = false;
    if (onDone) onDone();
  }
}
function removedPlayerPageHTML(team, name, rem){
  var t = null; try{ t = TEAMS[team] || null; }catch(e){}
  var de = null; try{ de = dirEntry(team); }catch(e){}
  var ini = String(name || "").split(" ").map(function(w){ return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
  var html = '<div class="pp">';
  html += '<div class="pp-head"><span class="pphoto player-photo pinitial" data-photo-rank="0">' + esc(ini) + '</span><div><div class="pp-name">' + esc(name) + "</div>";
  html += '<div class="pp-meta">' + esc(de ? de.name : (t ? t.name : team)) + "</div></div></div>";
  html += '<div class="tv-sec"><div class="tv-title">INFO</div><div class="tv-note" id="pp-stamp">Player data as of page load — reopen the page to refresh.</div>';
  html += '<div class="tv-note">No longer on this roster (as of ' + esc(fmtDate(rem.date)) + ")." + (rem.transferToName ? " — now at " + esc(rem.transferToName) + "." : "") + "</div>";
  if (rem.num != null) html += '<div class="tv-line">Number (last listed): #' + rem.num + "</div>";
  if (rem.pos) html += '<div class="tv-line">Position (last listed): ' + esc(rem.pos) + "</div>";
  if (rem.cls) html += '<div class="tv-line">Class (last listed): ' + esc(rem.cls) + "</div>";
  if (rem.ht) html += '<div class="tv-line">Height (last listed): ' + esc(rem.ht) + "</div>";
  if (rem.wt) html += '<div class="tv-line">Weight (last listed): ' + esc(rem.wt) + "</div>";
  if (rem.hometown) html += '<div class="tv-line">Hometown (last listed): ' + esc(rem.hometown) + "</div>";
  html += '<div class="tv-note">Photo not carried on removal. Game history for this player is intact — past games still list this player.</div>';
  html += "</div>";
  try{
    var st = playerSeasonStats(name, team);
    if ((team === "MICH" || hasMichFinal(team)) && st && (st.g || st.a || (st.goalieGames && st.goalieGames.length))){
      html += '<div class="tv-sec"><div class="tv-title">STATS</div>';
      html += '<div class="tv-line">Vs Michigan in 2026-27: ' + st.g + " goal" + (st.g === 1 ? "" : "s") + ", " + st.a + " assist" + (st.a === 1 ? "" : "s") + ", " + st.pts + " point" + (st.pts === 1 ? "" : "s") + "</div>";
      html += '<div class="tv-note">Vs Michigan only, from this app\'s verified game data — not a full-season line.</div></div>';
    }
  }catch(e){}
  html += "</div>";
  return html;
}
function michFinalCount(){
  try{ return GAMES.filter(function(g){ return g.status === "final"; }).length; }catch(e){ return 0; }
}
window.__vmaxTest.parseSidearmRosterHTML = parseSidearmRosterHTML;
window.__vmaxTest.chnGoaliesFor = chnGoaliesFor;
window.__vmaxTest.rosterGoaliesNotInCHN = rosterGoaliesNotInCHN;
window.__vmaxTest.buildMergedModel = buildMergedModel;
window.__vmaxTest.diffMembership = diffMembership;
window.__vmaxTest.modelHeaderLabel = modelHeaderLabel;
window.__vmaxTest.chnFilenameAgrees = chnFilenameAgrees;
window.__vmaxTest.modelFindPlayer = modelFindPlayer;
window.__vmaxTest.removedLookup = removedLookup;
window.__vmaxTest.rosterSectionHTML = rosterSectionHTML;
window.__vmaxTest.parseEspnSched = parseEspnSched;
window.__vmaxTest.schedMediaFor = schedMediaFor;
window.__vmaxTest.schedMediaHTML = schedMediaHTML;
window.__vmaxTest.rosterOverlapOK = rosterOverlapOK;
window.__vmaxTest.runMembershipCheck = runMembershipCheck;
window.__vmaxTest.applyChnPhotos = applyChnPhotos;
window.__vmaxTest.applyOfficialPhotos = applyOfficialPhotos;
window.__vmaxTest.swapPhotoEl = swapPhotoEl;
window.__vmaxTest.rosterCheckStore = rosterCheckStore;
window.__vmaxTest.saveRosterCheckStore = saveRosterCheckStore;
window.__vmaxTest.espnAccelCache = espnAccelCache;
window.__vmaxTest.espnPhotoFor = espnPhotoFor;
window.__vmaxTest.ROSTER_SEED = ROSTER_SEED;
window.__vmaxTest.showGenericTeamView = showGenericTeamView;
window.__vmaxTest.refreshGenericRoster = refreshGenericRoster;

function teamViewHTML(short){
  var t = teamEntry(short);
  if (!t) return '<div class="tv"><p>Team info not available.</p></div>';
  var de = dirEntry(short);
  var html = '<div class="tv themed" id="tv-' + esc(short) + '"' + (de ? ' style="--tc1:' + esc(de.c1) + ';--tc2:' + esc(de.c2) + ';--tc3:' + esc(de.c3 || "#FFFFFF") + '"' : '') + '>';
  var wmSrc = logoChoiceFile(short) || ((short === "MICH") ? "script-logo.png" : navyLogoFile(short));
  if (wmSrc) html += '<div class="team-watermark"><img src="' + esc(wmSrc) + '" alt=""></div>';
  html += '<div class="tv-head"><div class="tv-name">' + esc(t.name) + "</div>";
  html += '<div class="tv-meta">' + confBtnHTML(t.conf) + (t.record ? " &middot; <span data-live-record=\"" + esc(short) + "\">" + esc(t.record) + " (saved " + esc(t.record_asof || "Oct 24, 2026") + ")</span>" : "") + "</div>";
  if (t.arena) html += '<div class="tv-meta">' + esc(t.arena) + "</div>";
  if (t.coach) html += '<div class="tv-meta">Head coach: ' + esc(t.coach) + "</div>";
  html += "</div>";
  html += favStarHTML(short);
  html += '<button class="tv-back share-app-btn" type="button">Share this app</button>';
  html += '<div class="tv-head-logo">' + '<span data-live-rank="' + esc(short) + '">' + rankBadge(currentIntroRank(short), short) + "</span>" + '<span class="own-logo-slot" data-logo-cls="tv-logo-lg" data-logo-mich="1">' + (de ? ownLogoImg(de, "tv-logo-lg", true) : "") + "</span>" + "</div>";
  html += '<div class="tab-bar" role="tablist"><button class="tab-btn" data-tab="info" type="button" aria-selected="false">Info</button><button class="tab-btn active" data-tab="schedule" type="button" aria-selected="true">Schedule</button><button class="tab-btn" data-tab="players" type="button" aria-selected="false">Players</button><button class="tab-btn" data-tab="news" type="button" aria-selected="false">News</button><button class="tab-btn" data-tab="extras" type="button" aria-selected="false">Extras</button></div>';
  html += '<div class="tv-sec" data-tab="info"><div class="tv-title">TEAM LOGOS</div><div class="tv-logos">' + localLogoVariantsHTML(short) + '</div><div class="tv-note">Verified team marks included in the app.</div></div>';
  html += alltimeSectionHTML(short);
  html += '<div class="tv-sec extras-sec" data-tab="extras">';
  html += '<div class="tv-sec"><div class="tv-title">CHAMPIONSHIP BANNERS</div>' + bannersHTMLFor(short) + "</div>";
  html += '<div class="tv-sec" data-intro-sec="1"><div class="tv-title">TEAM INTRO</div>' + teamIntroHTML(short) + "</div>";
  html += '</div>';
  // Schedule — v32.6: ONE unified schedule. Saved rows carry everything;
  // the live feed patches these rows in place (renderTeamLive), never a
  // second list.
  html += '<div class="tv-sec" data-tab="schedule"><div class="tv-title">SCHEDULE</div>';
  html += '<div class="tv-note">Tap a game for details.</div>';
  html += '<div class="tv-note" id="tv-sched-stamp">Loading live schedule…</div>';
  html += '<div id="tv-sched-rows">' + (short === "MICH" ? michTeamRowsHTML() : teamSchedRowsHTML(short)) + '</div>';
  html += "</div>";
  // Roster
  html += '<div class="tv-sec" data-tab="players" id="tv-roster-sec">' + rosterSectionHTML(short) + "</div>";

  // Player points
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">PLAYER POINTS</div>';
  var pts = pointsComputed(short);
  var showMichPts = (short === "MICH") || hasMichFinal(short);
  if (short === "MICH"){
    html += '<div class="tv-note">2026&ndash;27 season to date (' + michFinalCount() + ' games), computed from the official box scores.</div>';
  } else if (showMichPts){
    html += '<div class="tv-note">Vs Michigan only, computed from the official box scores. This is NOT full-season points.</div>';
  } else {
    html += '<div class="tv-note">Full-season player points are not included for this team in this app. See the official stats page for this team.</div>';
  }
  if (showMichPts && pts.length){
    html += '<table class="tv-roster"><tr><th>Player</th><th>G</th><th>A</th><th>Pts</th></tr>';
    pts.forEach(function(p){ html += "<tr><td>" + playerPhotoHTML(p.name, short) + " " + playerBtn(p.name, short) + "</td><td>" + p.g + "</td><td>" + p.a + "</td><td><b>" + (p.g + p.a) + "</b></td></tr>"; });
    html += "</table>";
  } else if (showMichPts){
    html += '<div class="tv-note">No points vs Michigan yet (no completed game vs Michigan).</div>';
  }
  if (t.leaders && t.leaders.length){
    var lsShort = (t.leaders_source && t.leaders_source.length <= 40) ? t.leaders_source : null;
    html += '<div class="tv-sub">Published season leaders' + (lsShort ? ' (' + esc(lsShort) + ')' : (de && de.conf === "Big Ten" ? ' (Big Ten)' : '')) + '</div>';
    t.leaders.forEach(function(l){ var ptsTxt = (l.pts !== undefined && l.pts !== null) ? (l.pts + " points") : (function(){ var pp = []; if (l.g !== undefined && l.g !== null) pp.push(l.g + " goals"); if (l.a !== undefined && l.a !== null) pp.push(l.a + " assists"); return pp.join(", "); })(); html += '<div class="tv-line">' + playerBtn(l.name, short) + (ptsTxt ? " &mdash; " + ptsTxt : "") + ((l.note !== undefined && l.note !== null) ? " (" + esc(l.note) + ")" : "") + "</div>"; });
  }
  if (t.leadersNote) html += '<div class="tv-note">' + esc(t.leadersNote) + "</div>";
  if (t.leaders && t.leaders.length) html += '<div class="tv-note">Leaders snapshot (' + esc(t._packConverted ? (t.leaders_asof || "date not recorded") : "Oct 24, 2026") + ') — not live-refreshed</div>';
  html += "</div>";
  // Goalies: v32.6 boxscore subset (played-only) + v32.26 full-season CHN table first.
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">GOALIES</div>';
  var gls = goaliesComputed(short);
  var showMichGls = (short === "MICH") || hasMichFinal(short);
  if (short === "MICH"){
    html += '<div class="tv-note">2026&ndash;27 season to date, computed from the official box scores.</div>';
    if (gls.length){
      html += '<table class="tv-roster"><tr><th>Goalie</th><th>GP</th><th>Saves</th><th>GA</th><th>Sv%</th><th>Min</th></tr>';
      gls.forEach(function(x){ var tot = x.sv + x.ga; html += "<tr><td>" + playerPhotoHTML(x.name, short) + " " + playerBtn(x.name, short) + "</td><td>" + x.gp + "</td><td>" + x.sv + "</td><td>" + x.ga + "</td><td>" + (tot ? (Math.round(x.sv / tot * 1000) / 10 + "%") : "&ndash;") + "</td><td>" + fmtMin(x.sec) + "</td></tr>"; });
      html += "</table>";
    }
  } else {
    var chnG = chnGoaliesFor(short);
    if (chnG.length){
      html += '<div class="tv-note">Full-season 2026&ndash;27, College Hockey News, fetched ' + CHN_GOALIE_FETCH + '.</div>';
      html += '<table class="tv-roster"><tr><th>Goalie</th><th>GP</th><th>Saves</th><th>GA</th><th>Sv%</th><th>GAA</th><th>Min</th></tr>';
      chnG.forEach(function(x){ html += "<tr><td>" + playerPhotoHTML(x.name, short) + " " + playerBtn(x.name, short) + "</td><td>" + x.gp + "</td><td>" + x.sv + "</td><td>" + x.ga + "</td><td>" + (x.svpct ? x.svpct : "&ndash;") + "</td><td>" + x.gaa + "</td><td>" + x.min + "</td></tr>"; });
      html += "</table>";
      var chnMissing = rosterGoaliesNotInCHN(short, chnG);
      if (chnMissing.length) html += '<div class="tv-note">Also on the roster, no appearance yet in 2026&ndash;27: ' + chnMissing.map(function(n){ return esc(n); }).join(", ") + '.</div>';
    } else if (CHN_IVY_NO_GAMES[short]){
      html += '<div class="tv-note">No games yet in 2026&ndash;27 — no full-season goalie stats published for this team.</div>';
    } else {
      html += '<div class="tv-note">No verified full-season goalie stats in this app for this team.</div>';
    }
    if (showMichGls){
      html += '<div class="tv-note">Vs Michigan only, computed from the official box scores. This is NOT full-season goalie stats.</div>';
      if (gls.length){
        html += '<table class="tv-roster"><tr><th>Goalie</th><th>GP</th><th>Saves</th><th>GA</th><th>Sv%</th><th>Min</th></tr>';
        gls.forEach(function(x){ var tot = x.sv + x.ga; html += "<tr><td>" + playerPhotoHTML(x.name, short) + " " + playerBtn(x.name, short) + "</td><td>" + x.gp + "</td><td>" + x.sv + "</td><td>" + x.ga + "</td><td>" + (tot ? (Math.round(x.sv / tot * 1000) / 10 + "%") : "&ndash;") + "</td><td>" + fmtMin(x.sec) + "</td></tr>"; });
        html += "</table>";
      }
    }
  }
  html += "</div>";
  // Team stats + offense/defense
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">TEAM STATS</div>';
  var rtsPre = resultsTeamStats(short); var statsAgree = false;
  if (t.stats && t.stats.length){ var sm0 = t.stats.join(" ").match(/(\d+)-(\d+)-(\d+)/); if (sm0 && rtsPre) statsAgree = (+sm0[1] === rtsPre.w && +sm0[2] === rtsPre.l && +sm0[3] === rtsPre.t); }
  if (t.stats && t.stats.length && statsAgree){
    var sp = splitStats(t.stats);
    if (sp.other.length) sp.other.forEach(function(l){ html += '<div class="tv-line">' + esc(l) + "</div>"; });
    if (sp.off.length){ html += '<div class="tv-sub">Offense</div>'; sp.off.forEach(function(l){ html += '<div class="tv-line">' + esc(l) + "</div>"; }); }
    if (sp.def.length){ html += '<div class="tv-sub">Defense</div>'; sp.def.forEach(function(l){ html += '<div class="tv-line">' + esc(l) + "</div>"; }); }
  } else {
    var rts = resultsTeamStats(short);
    if (rts){
      html += '<div class="tv-line">Games: ' + rts.gp + '</div>';
      html += '<div class="tv-line">Record: ' + rts.w + '&ndash;' + rts.l + '&ndash;' + rts.t + '</div>';
      html += '<div class="tv-line">Goals for: ' + rts.gf + ' (' + (Math.round(rts.gf / rts.gp * 100) / 100) + ' per game)</div>';
      html += '<div class="tv-line">Goals against: ' + rts.ga + ' (' + (Math.round(rts.ga / rts.gp * 100) / 100) + ' per game)</div>';
      html += '<div class="tv-line">Goal difference: ' + (rts.gf - rts.ga > 0 ? '+' : '') + (rts.gf - rts.ga) + '</div>';
      html += '<div class="tv-line">Home: ' + rts.hw + '&ndash;' + rts.hl + '&ndash;' + rts.ht + ' &middot; Away: ' + rts.aw + '&ndash;' + rts.al + '&ndash;' + rts.at + '</div>';
      html += '<div class="tv-note">' + (rts.liveApplied ? 'From live schedule results as of ' + fmtDate(centralTodayISO(Date.now())) : 'From saved game results in this app' + (rts.last ? ', through ' + fmtDate(rts.last) : '') + '. Live results update the schedule above.') + '</div>';
    if (t.stats && t.stats.length) html += '<div class="tv-note">Saved-results snapshot (Oct 27, 2026) — not live-refreshed</div>';
    } else {
      html += '<div class="tv-note">No completed games in the saved schedule yet \u2014 team stats publish after games go final.</div>';
    }
  }
  if (t.statsNote) html += '<div class="tv-note">' + esc(t.statsNote) + "</div>";
  html += "</div>";
  // Availability
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">INJURY / AVAILABILITY</div><div class="tv-note">' + esc(t.availability) + "</div></div>";
  // Active players
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">ACTIVE PLAYERS</div>';
  var finals = teamGames(short).filter(function(g){ return g.status === "final"; });
  if (finals.length){
    html += '<div class="tv-note">Verified participants from the official box score (scorers, assistants, penalized players, goalies). The full dressed lineup is not published in the box score.</div>';
    finals.forEach(function(g){
      var ap = activePlayers(short, g);
      html += '<div class="tv-sub">Game ' + g.n + " &mdash; " + fmtDate(g.date) + (short === "MICH" ? " vs " + esc(g.opp) : " vs Michigan") + "</div>";
      html += '<div class="tv-line">' + ap.map(function(n){ return playerBtn(n, short); }).join(", ") + "</div>";
    });
  } else if (short === "MICH" || hasMichFinal(short)){
    html += '<div class="tv-note">No completed game vs Michigan yet. Dressed lineups publish only with game-day line charts and are not available in advance.</div>';
  } else {
    html += '<div class="tv-note">No completed games in the verified game data yet. Dressed lineups publish only with game-day line charts and are not available in advance.</div>';
  }
  html += "</div>";
  // Team news
  html += '<div class="tv-sec" data-tab="news" id="tv-news"><div class="tv-title">TEAM NEWS</div>';
  if (t.news && t.news.length){
    t.news.forEach(function(n){
      html += '<div class="tv-news"><a href="' + esc(n.u) + '">' + esc(n.t) + '</a><div class="tv-news-meta">' + esc(n.s) + " &middot; " + esc(n.d) + "</div></div>";
    });
  } else {
    var pdn = null; try{ pdn = packData(short); }catch(e){}
    if (pdn && pdn.news && pdn.news.length){
      pdn.news.forEach(function(n){ html += '<div class="tv-news"><a href="' + esc(n.url) + '">' + esc(n.label || n.url) + '</a></div>'; });
      html += '<div class="tv-note">Links only — article text is not scraped or copied here. Links snapshot (date not recorded) — open a source for the latest.</div>';
    } else {
      html += '<div class="tv-note">No verified news items for this team in this app. See the team\'s official site for the latest news.</div>';
    }
  }
  html += '<div id="tv-news-live"></div>';
  html += "</div>";
  // Team data
  html += '<div class="tv-sec" data-tab="info"><div class="tv-title">TEAM DATA</div>';
  html += '<div class="tv-line">Team: ' + esc(t.name) + "</div>";
  html += '<div class="tv-line">Conference: ' + confBtnHTML(t.conf) + "</div>";
  html += '<div class="tv-line">Record: <span data-live-record="' + esc(short) + '">' + (t.record ? esc(t.record) + (t.record_asof ? " (as of " + esc(t.record_asof) + ")" : " (saved Oct 24, 2026)") : "Not published in the sources consulted") + "</span></div>";
  html += '<div class="tv-line">Ranking: <span data-live-rank="' + esc(short) + '">' + (t.rank ? "#" + t.rank : "Not ranked in the sources consulted") + "</span></div>";
  html += '<div data-wiki-link="' + esc(short) + '"></div>';
  if (t.arena) html += '<div class="tv-line">Home arena: ' + esc(t.arena) + "</div>";
  if (t.coach) html += '<div class="tv-line">Head coach: ' + esc(t.coach) + "</div>";
  html += '<div class="tv-note">Rankings are at-game-time or preseason as labeled in the stats section. Where a data item is not published, this view says so rather than guessing.</div>';
  html += packExtraHTML(short, !!(t.leaders && t.leaders.length));
  html += "</div></div>";
  return html;
}
function selectTeamTab(root, tab){
  if (!root) return;
  root.querySelectorAll(".tab-btn").forEach(function(b){ var on = b.getAttribute("data-tab") === tab; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
  root.querySelectorAll(".tv-sec[data-tab]").forEach(function(s){ s.hidden = (s.getAttribute("data-tab") !== tab); });
}
// styling build fix (v32.11): team sections start collapsed and expand on tap
// through the EXISTING v25 document-level title handler (which toggles
// .collapsed) — NOT a second per-title handler. The v32.10 per-title
// sec-open handler fought the v25 handler (both fired per tap, one class
// always kept the children hidden), so no section could ever open.
// The extras wrapper is not itself collapsible; its inner sections are.
// Title-less sections are never collapsed (no title to tap back open).
// v32.17: EVERY titled section starts collapsed, including SCHEDULE. This
// overrides the v32.12 SCHEDULE-starts-expanded exception per Victor
// 2026-10-27: when the app opens, everything expandable starts collapsed.
function collapseTeamSecs(root){
  if (!root) return;
  root.querySelectorAll(".tv-sec:not(.extras-sec)").forEach(function(sec){
    var kids = sec.children;
    for (var i = 0; i < kids.length; i++) if (kids[i].classList && kids[i].classList.contains("tv-title")){ sec.classList.add("collapsed"); break; }
  });
}
function alltimeSectionHTML(short){
  var rows = (typeof ALLTIME_OPP !== "undefined" && ALLTIME_OPP[short]) || [];
  var html = '<div class="tv-sec" data-tab="info"><div class="tv-title">ALL-TIME RECORD VS OPPONENTS</div>';
  html += '<div class="tv-note">Every opponent this team has played, all-time. College Hockey News, fetched Oct 28, 2026. Results are complete back to 1986-87, and a work in progress prior to that.</div>';
  html += '<div class="tv-note">Overall all-time record is not shown: no verified overall figure was found, and summing these rows would mix in non-Division I games. Only verified pairings are listed; teams this team has never played do not appear.</div>';
  if (rows.length){
    html += '<table class="tv-roster"><tr><th>Opponent</th><th>W</th><th>L</th><th>T</th><th>Games</th></tr>';
    rows.forEach(function(r){
      var nm = dirEntry(r[0]) ? dirEntry(r[0]).name : r[0];
      html += "<tr><td>" + esc(nm) + (r[4] === "S" ? " *" : "") + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td><td>" + (r[1] + r[2] + r[3]) + "</td></tr>";
    });
    html += "</table>";
    var hasO = rows.some(function(r){ return r[4] === "O"; });
    if (hasO) html += '<div class="tv-note">The Wisconsin&ndash;Michigan row shows the official record through Feb 21, 2026 (Wisconsin 73-95-15). College Hockey News lists 73-93-15; the official source governs.</div>';
    var hasS = rows.some(function(r){ return r[4] === "S"; });
    if (hasS) html += '<div class="tv-note">* Row shown from the other team&rsquo;s page: this team&rsquo;s own CHN page carries no row for that opponent.</div>';
  } else {
    html += '<div class="tv-note">No verified all-time opponent record in this app for this team.</div>';
  }
  html += "</div>";
  return html;
}
function showTeamView(short, push){
  var tv = $("#teamview"), mv = $("#michview");
  if (!tv || !mv) return;
  try{ hidePicker(); }catch(e){}
  try{ applyHlFills(); }catch(e){}
  if (!teamEntry(short)){ showGenericTeamView(short, push); return; }
  if (push !== false && !(currentView.kind === "team" && currentView.key === short)) pushNav();
  currentView = {kind: "team", key: short};
  currentTeamKey = short;
  tv.innerHTML = teamViewHTML(short);
  selectTeamTab(tv, "schedule");
  collapseTeamSecs(tv);
  tv.hidden = false;
  mv.hidden = true;
  // v8: opening a view hides EVERY other view, so a back navigation can
  // never leave a stale player page, conference view, or settings view
  // visible underneath the new view.
  ["playerview", "confview", "settingsview", "favhomeview", "bracketview", "searchview", "neutralview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.add("teamview");
  try{ window.scrollTo(0, 0); }catch(e){}
  attachPlayerHandlers(tv);
  try{ refreshTeamLiveData(short); }catch(e){}
  attachConfHandlers(tv);
  $$("[data-team-intro]", tv).forEach(function(b){ b.addEventListener("click", function(){ toggleIntro(b.getAttribute("data-team-intro")); }); });
  $$("[data-fav-toggle]", tv).forEach(function(b){ b.addEventListener("click", function(){ var k = b.getAttribute("data-fav-toggle"); toggleFavorite(k); syncFavStar(b, k); }); });
  applyTeamTheme(short); syncHeader(); syncBackState();
  renderTeamLive(short);
  try{ bindSchedButtons(tv, short); }catch(e){}
  try{ refreshUnifiedRosterNumbers(short); }catch(e){}
  try{ runMembershipCheck(short); }catch(e){}
  try{ loadChnPhotos(short); }catch(e){}
  try{ loadOfficialPhotos(short); }catch(e){}
  try{ fetchTeamHighlightsRSS(); }catch(e){}
  $$("[data-team-game]", tv).forEach(function(b){ b.addEventListener("click", function(){ var d = $("#team-details-" + b.getAttribute("data-team-game")); if (d) d.hidden = !d.hidden; }); });
  $$("[data-team-detail]", tv).forEach(function(b){ b.addEventListener("click", function(){ var p = b.getAttribute("data-team-detail").split("|"); openTeamGameDetail(p[0], +p[1]); }); });
  $$("[data-team-hl]", tv).forEach(function(b){ b.addEventListener("click", function(){ var p = b.getAttribute("data-team-hl").split("|"); var rows = (typeof SCHEDULES !== "undefined" && SCHEDULES[p[0]]) || []; var row = rows[+p[1]]; if (row && row.hl) playGameHighlight(row.hl, teamGameHlTitle(p[0], row)); }); });
  $$("[data-jump]", tv).forEach(function(b){
    b.addEventListener("click", function(){
      var n = +b.getAttribute("data-jump");
      backToMichigan();
      var d = $("#details-" + n);
      if (d){
        d.hidden = false;
        try{ d.scrollIntoView(); }catch(e){}
        syncBackState();
      }
    });
  });
}
// ---------- v26 team zoom: logo flies at the screen, then the team page ----------
// GPU-only animation (transform + opacity, no layout work) so it stays
// smooth on a phone: 450ms total, then the team page opens. The Settings
// toggle (animOn, default on) turns it off. Only real team clicks route
// through here; Back, player-page return, and startup navigation do not.
var zoomBusy = false;
var zoomGen = 0;
var zoomTimer = null;
var zoomKey = null;
function cancelZoom(){
  zoomGen++; zoomBusy = false; zoomKey = null;
  if (zoomTimer){ try{ clearTimeout(zoomTimer); }catch(e){} zoomTimer = null; }
  var z = $("#team-zoom"); if (z){ z.hidden = true; z.classList.remove("zooming"); }
}
function teamZoomTo(key){
  if (!animOn){ cancelZoom(); showTeamView(key); return; }
  if (zoomBusy && key === zoomKey){ return; }
  cancelZoom();
  var z = $("#team-zoom"); if (!z){ showTeamView(key); return; }
  var inner = $("#team-zoom-inner");
  var d = null; try{ d = dirEntry(key); }catch(e){}
  if (inner) inner.innerHTML = d ? teamLogoImg(d, "zoom-logo") : '<span class="zoom-logo tv-badge">' + esc(key) + '</span>';
  try{ playIntro(key); }catch(e){}
  zoomBusy = true; zoomKey = key;
  var gen = zoomGen;
  z.hidden = false;
  z.classList.remove("zooming"); void z.offsetWidth; z.classList.add("zooming");
  var done = false;
  var finish = function(){
    if (done || gen !== zoomGen) return; done = true;
    zoomTimer = null; z.hidden = true; z.classList.remove("zooming"); zoomBusy = false; zoomKey = null;
    showTeamView(key);
  };
  if (inner) inner.addEventListener("animationend", finish, {once:true});
  zoomTimer = setTimeout(finish, 1350);
}
// ---------- v32.35 team swipe navigation ----------
// On a team page, a clear horizontal swipe moves between teams in the
// app's alphabetical team order — DIRECTORY sorted by name, the same
// order the directory, the favorite picker, and the conference lists
// render (Michigan in the middle) — wrapping at both ends (modulo 63):
// swipe LEFT -> NEXT team, swipe RIGHT -> PREVIOUS team (Victor's
// final mapping, 2026-10-28 23:59 CDT). Navigation goes through
// teamZoomTo — the same team-open path as tapping a team — so the
// logo-zoom animation toggle applies and showTeamView pushes the Back
// stack exactly like a tap; the swiped-to page opens at its top.
// Gesture safety: the swipe must travel at least SWIPE_MIN_DX px and
// dominate vertical movement by SWIPE_DOMINANCE, so vertical scrolling
// is never hijacked; a swipe that starts on a horizontally scrollable
// element (or a form control) is ignored.
var SWIPE_MIN_DX = 64;
var SWIPE_DOMINANCE = 1.6;
function teamSwipeOrder(){
  return DIRECTORY.slice().sort(function(a, b){ return a.name < b.name ? -1 : 1; }).map(function(d){ return d.key; });
}
function teamSwipeTarget(key, dir){
  var keys = teamSwipeOrder();
  var i = keys.indexOf(key);
  if (i === -1 || !keys.length) return null;
  var n = keys.length;
  return keys[(i + (dir === "next" ? 1 : n - 1)) % n];
}
function teamSwipeNav(dir){
  if (!currentView || currentView.kind !== "team") return null;
  var target = teamSwipeTarget(currentView.key, dir);
  if (!target || target === currentView.key) return null;
  teamZoomTo(target);
  return target;
}
function swipeStartBlocked(t){
  if (!t) return true;
  if (t.closest && t.closest("input, select, textarea")) return true;
  var el = t;
  while (el && el !== document.body){
    var cs = null;
    try{ cs = window.getComputedStyle(el); }catch(e){}
    if (cs && (cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth) return true;
    el = el.parentElement;
  }
  return false;
}
var teamSwipeStart = null;
function installTeamSwipe(){
  document.addEventListener("touchstart", function(e){
    teamSwipeStart = null;
    if (!currentView || currentView.kind !== "team") return;
    if (!e.touches || e.touches.length !== 1) return;
    if (swipeStartBlocked(e.target)) return;
    var t = e.touches[0];
    teamSwipeStart = {x: t.clientX, y: t.clientY};
  }, {passive: true});
  document.addEventListener("touchend", function(e){
    if (!teamSwipeStart) return;
    var s = teamSwipeStart; teamSwipeStart = null;
    if (!currentView || currentView.kind !== "team") return;
    if (!e.changedTouches || !e.changedTouches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN_DX) return;
    if (Math.abs(dx) < SWIPE_DOMINANCE * Math.abs(dy)) return;
    teamSwipeNav(dx < 0 ? "next" : "prev");
  }, {passive: true});
}
installTeamSwipe();
window.__vmaxTest.teamSwipeTarget = teamSwipeTarget;
window.__vmaxTest.teamSwipeOrder = teamSwipeOrder;
window.__vmaxTest.teamSwipeNav = teamSwipeNav;
// ---------- web-only team nav buttons (Victor 2026-10-29) ----------
// On the web version (no native bridge injected), team pages carry
// fixed left/right buttons that do what the swipe does — tap targets
// for touchscreens, clickable with a mouse: LEFT button -> PREVIOUS
// team, RIGHT button -> NEXT team (standard carousel direction).
// Navigation reuses teamSwipeNav, so ordering, wrapping, and the Back
// stack behave exactly like the swipe. In the installed app the
// buttons never render; the swipe is the app's gesture.
function installWebTeamNavButtons(){
  if (window.VMaxApp) return;
  if (document.getElementById("webTeamNavStyle")) return;
  var style = document.createElement("style");
  style.id = "webTeamNavStyle";
  style.textContent =
    ".webTeamNav{position:fixed;top:50%;transform:translateY(-50%);z-index:900;" +
    "width:40px;height:64px;opacity:.55;border-radius:12px;border:1px solid rgba(255,255,255,0.35);" +
    "background:rgba(0,0,0,0.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);" +
    "color:#fff;font-size:22px;line-height:1;cursor:pointer;display:none;" +
    "touch-action:manipulation;-webkit-tap-highlight-color:transparent;padding:0}" +
    ".webTeamNav:hover{opacity:1}.webTeamNav:active{background:rgba(0,0,0,0.55);opacity:1}" +
    "#webTeamNavPrev{left:6px}#webTeamNavNext{right:6px}";
  document.head.appendChild(style);
  function mk(id, glyph, label, dir){
    var b = document.createElement("button");
    b.id = id; b.type = "button"; b.className = "webTeamNav";
    b.textContent = glyph; b.title = label; b.setAttribute("aria-label", label);
    b.addEventListener("touchstart", function(e){ e.stopPropagation(); }, {passive: true});
    b.addEventListener("click", function(){ teamSwipeNav(dir); });
    document.body.appendChild(b);
    return b;
  }
  var prev = mk("webTeamNavPrev", "\u25C0", "Previous team", "prev");
  var next = mk("webTeamNavNext", "\u25B6", "Next team", "next");
  var mqFine = window.matchMedia ? window.matchMedia("(pointer: fine)") : null;
  function sync(){
    var pcLike = !!(mqFine && mqFine.matches);
    var on = pcLike && !!(typeof currentView !== "undefined" && currentView && currentView.kind === "team");
    prev.style.display = on ? "block" : "none";
    next.style.display = on ? "block" : "none";
  }
  setInterval(sync, 400);
  sync();
}
if (document.body) installWebTeamNavButtons();
else document.addEventListener("DOMContentLoaded", installWebTeamNavButtons);
function backToMichigan(){
  currentTeamKey = null;
  navStack = [];
  renderHomeView();
}
function attachLogoHandlers(root){
  $$(".logo-btn, .logo-btn-head, .team-name-btn", root || document).forEach(function(b){
    if (b.getAttribute("data-logo-bound")) return;
    b.setAttribute("data-logo-bound", "1");
    var go = function(){ teamZoomTo(b.getAttribute("data-team")); };
    b.addEventListener("click", function(e){ e.stopPropagation(); go(); });
    b.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); go(); }
    });
  });
}
// v8: conference names are tappable everywhere they appear (team views,
// directory rows, rankings, search, player pages). The ticker is the one
// exception: it stays logos-only per the user's explicit logos-only rule.
function confBtnHTML(conf){
  return '<button class="conf-btn" data-conf="' + esc(conf) + '" type="button">' + esc(conf) + "</button>";
}
function attachConfHandlers(root){
  $$(".conf-btn", root || document).forEach(function(b){
    if (b.getAttribute("data-conf-bound")) return;
    b.setAttribute("data-conf-bound", "1");
    b.addEventListener("click", function(e){ e.stopPropagation(); showConfView(b.getAttribute("data-conf")); });
  });
}

// ---------- rows (v15: each team line carries its OWN score, right-aligned) ----------
function renderGames(){
  var wrap = $("#games");
  var html = "";
  GAMES.forEach(function(g, idx){
    var statusTxt = "";
    var cls = "row";
    var scored = false;
    if (g.status === "final"){ statusTxt = '<span class="meta-status row-status">Final</span>'; cls += " is-final"; scored = true; }
    else if (g.live){ statusTxt = '<span class="meta-status row-status live-score">LIVE</span>'; cls += " is-live"; scored = true; }
    else { var lbl = timeShortLabel(g.timeCT, g.date); statusTxt = lbl ? '<span class="meta-status row-status upcoming">' + esc(lbl) + "</span>" : ""; }
    var hmLetter = (g.status === "final") ? (g.mich > g.oppScore ? "W" : g.mich < g.oppScore ? "L" : "T") : null;
    var michScore = scored ? '<span class="row-score">' + g.mich + "</span>" + wlSpan(hmLetter, "my") : "";
    var oppScore = scored ? '<span class="row-score">' + g.oppScore + "</span>" + wlSpan(oppLetter(hmLetter), "opp") : "";
    var michLine = '<span class="row-team">' + rankBadge(g.michRank, "MICH") + logoBtn("MICH", "Michigan", '<img class="teamlogo mich" src="' + esc(navyLogoFile("MICH")) + '" alt="">') + '<span class="team-name-btn" data-team="MICH" role="button" tabindex="0">Michigan</span>' + michScore + "</span>";
    var oppLine = '<span class="row-team">' + rankBadge(g.oppRank, g.short) + oppBadge(g) + '<span class="team-name-btn" data-team="' + esc(g.short) + '" role="button" tabindex="0">' + esc(g.opp) + "</span>" + oppScore + "</span>";
    var teamLines = g.home ? michLine + oppLine : oppLine + michLine;
    html += '<div class="' + cls + '" id="game-' + g.n + '"><button class="row-head" data-toggle="' + g.n + '">' +
      '<span class="row-meta"><span class="gnum">Game ' + g.n + "</span>" +
      '<span class="gdate">' + fmtDate(g.date) + "</span>" +
      '<span class="vs">' + (g.home ? "vs" : "at") + "</span>" +
      '<span class="meta-opp">' + esc(g.opp) + '</span>' +
      statusTxt + "</span>" +
      teamLines + (h2hLine("MICH", g.short) ? '<span class="row-h2h">' + esc(h2hLine("MICH", g.short)) + '</span>' : "") + "</button>" +
      '<div class="details" id="details-' + g.n + '" hidden>' + detailsHTML(g) + "</div></div>";
    if (idx === 16) html += '<div class="divider"><img src="block-m.jpg" alt=""></div>';
  });
  wrap.innerHTML = html;
  $$(".row-head").forEach(function(b){
    b.addEventListener("click", function(){
      var d = $("#details-" + b.getAttribute("data-toggle"));
      d.hidden = !d.hidden;
      syncBackState();
    });
  });
  attachLogoHandlers(wrap);
  attachPlayerHandlers(wrap);
  attachVenueHandlers(wrap);
}
function refreshDetails(n){
  var g = null;
  GAMES.forEach(function(x){ if (x.n === n) g = x; });
  if (g){
    var d = $("#details-" + n);
    d.innerHTML = detailsHTML(g);
    try{ maybeFetchMichBoxscore(g); }catch(e){}
    attachPlayerHandlers(d);
    attachVenueHandlers(d);
  }
}


// ---------- native bridge (VMaxApp JavascriptInterface; absent on the web) ----------
function bridge(){
  try{ if (typeof VMaxApp !== "undefined" && VMaxApp) return VMaxApp; }catch(e){}
  return null;
}
function bridgeCall(name, args){
  var b = bridge();
  try{ if (b && typeof b[name] === "function") return b[name].apply(b, args || []); }catch(e){}
  return undefined;
}

// ---------- share (v9): send the app's own APK via the system share sheet ----------
// Native side copies the app's own APK file to cache and shares it with a
// content URI + read grant — no network, plus the baked-in download link
// in the shared text when one exists, and no
// name beyond the app's own name ("NCAAMD1H") in the share.
function shareApp(){
  var b = bridge();
  if (b && typeof b.shareApp === "function"){ try{ b.shareApp(DOWNLOAD_URL || ""); return true; }catch(e){} }
  var n = $("#share-note");
  if (n) n.textContent = "Sharing needs the installed app — open the installed app to share it.";
  return false;
}
// v23 share menu: the old single button called shareApp() directly, which
// fails SILENTLY without a bridge (no #share-note on home/team pages)
// and offers only the APK file (apps that refuse APKs leave no fallback).
// Three independent ways now, and every outcome reports in #share-status.
var SHARE_TEXT = "NCAAD1MH — NCAA Men's D1 Hockey. All 63 teams, live scores, schedules, and team pages.";
// v26 download link: baked at build time from the host Victor picks
// (Drive/Dropbox = durable; Muse storage = 48h). Empty = no link in
// this build; the link buttons then say so instead of sharing dead text.
var DOWNLOAD_URL = "https://sabretooth79.github.io/NCAAD1MH-updates/";
var DOWNLOAD_URL_NOTE = "";
function shareTextWithLink(){
  return DOWNLOAD_URL ? (SHARE_TEXT + " Download the app: " + DOWNLOAD_URL) : SHARE_TEXT;
}
function shareStatus(msg){
  var s = $("#share-status");
  if (s) s.textContent = msg;
}
function openShareMenu(){
  var m = $("#sharemenu"); if (!m) return;
  var s = $("#share-status"); if (s) s.textContent = "";
  var t = $("#share-copy-text"); if (t) t.hidden = true;
  var ln = $("#share-link-note"); if (ln) ln.textContent = DOWNLOAD_URL ? (DOWNLOAD_URL_NOTE || ("Download link: " + DOWNLOAD_URL)) : "No download link in this build yet — Share app file always works.";
  m.hidden = false; syncBackState();
}
function closeShareMenu(){
  var m = $("#sharemenu"); if (m) m.hidden = true; syncBackState();
}
function shareAppFile(){
  if (shareApp()){ shareStatus("Opening the share sheet — pick an app to send the app file."); return true; }
  shareStatus("App-file sharing needs the installed app. Try Share download link or Copy download link below.");
  return false;
}
function shareDownloadLink(){
  var txt = shareTextWithLink();
  if (!DOWNLOAD_URL){ shareStatus("No download link in this build yet — use Share app file, it always works."); return false; }
  var b = bridge();
  if (b && typeof b.shareLink === "function"){ try{ b.shareLink(txt); shareStatus("Opening the share sheet — pick an app to send the download link. For Facebook, pick Facebook here."); return true; }catch(e){} }
  if (typeof navigator !== "undefined" && navigator.share){
    navigator.share({title: "NCAAD1MH", text: txt}).then(function(){ shareStatus("Shared."); }).catch(function(){ copyShareText(); });
    return true;
  }
  return copyShareText();
}
function copyShareText(){
  try{
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(shareTextWithLink()).then(function(){ shareStatus("Copied — paste it anywhere."); }).catch(function(){ showShareCopyField(); });
      return true;
    }
  }catch(e){}
  var done = false;
  try{
    var ta = document.createElement("textarea");
    ta.value = shareTextWithLink(); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    done = document.execCommand("copy");
    document.body.removeChild(ta);
  }catch(e){ done = false; }
  if (done){ shareStatus("Copied — paste it anywhere."); return true; }
  showShareCopyField();
  return false;
}
function facebookShareURL(){
  if (!DOWNLOAD_URL) return "";
  return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(DOWNLOAD_URL);
}
function openInFacebook(){
  var url = facebookShareURL();
  if (!url){ shareStatus("No download link in this build yet — use Share app file, it always works. Once a download link is added, this button posts it to Facebook."); return false; }
  try{ window.location.href = url; }catch(e){}
  shareStatus("Opening Facebook — the download link is ready to post.");
  return true;
}
function openInBrowser(){
  if (!DOWNLOAD_URL){ shareStatus("No download link in this build yet — use Share app file, it always works. Once a download link is added, this button opens it in your browser."); return false; }
  try{ window.location.href = DOWNLOAD_URL; }catch(e){}
  shareStatus("Opening your browser — the download will start there.");
  return true;
}
// v32.18: Browser opens the browser app itself — its own home/start page
// (Chrome to Chrome's home, Yandex to Yandex's home, etc.), NEVER a blank
// page. The v30 blank-tab VIEW intent opened a blank tab; that path is
// gone. Native side launches the chosen browser package (Settings default
// override, else device default); no URL is loaded by this tap at all.
function openBrowserHome(){
  var b = bridge();
  if (b && typeof b.openBrowserHome === "function"){ try{ b.openBrowserHome(); return true; }catch(e){} }
  return false;
}
function showShareCopyField(){
  var t = $("#share-copy-text");
  if (t){ t.value = shareTextWithLink(); t.hidden = false; try{ t.select(); }catch(e){} }
  shareStatus("Copy didn't work automatically — the text below is selectable. Long-press it, copy, and paste anywhere.");
}

// ---------- notifications: pregame reminders, goal/final alerts ----------
var notifOn = load("notifOn", true);
var animOn = load("animOn", true);
var favOpenOn = load("favOpenOn", false);
function setFavOpenOn(v){
  favOpenOn = !!v; save("favOpenOn", favOpenOn);
  renderFavOpenToggle();
}
function renderFavOpenToggle(){
  var st = $("#st-favopen-toggle");
  if (st) st.textContent = "Open on favorite team: " + (favOpenOn ? "On" : "Off");
}
var notifiedFinal = load("notifiedFinal", {});
function renderNotifToggle(){
  var st = $("#st-notif-toggle");
  if (st) st.textContent = "Notifications: " + (notifOn ? "On" : "Off");
}
function renderAnimToggle(){
  var st = $("#st-anim-toggle");
  if (st) st.textContent = "Animations: " + (animOn ? "On" : "Off");
}
function setAnimOn(v){
  animOn = !!v; save("animOn", animOn);
  renderAnimToggle();
}
function setNotifOn(v){
  notifOn = !!v; save("notifOn", notifOn);
  renderNotifToggle();
  if (notifOn){
    var b = bridge();
    if (b && typeof b.isNotificationGranted === "function"){
      var granted = false;
      try{ granted = b.isNotificationGranted(); }catch(e){}
      if (!granted){ try{ b.requestNotificationPermission(); }catch(e){} }
      else schedulePregameReminders();
    } else schedulePregameReminders();
  }
}
function renderBatteryBtn(){
  var ex = bridgeCall("isBatteryExempt", []);
  var txt = (ex === true) ? "Battery: unrestricted" : "Battery: allow background";
  var b = $("#battery-btn");
  if (b) b.textContent = txt;
  var s = $("#st-battery-btn");
  if (s) s.textContent = txt;
}
// Native permission result callback (MainActivity evaluateJavascript).
window.onNativeNotifResult = function(granted){
  if (!granted){ notifOn = false; save("notifOn", false); }
  renderNotifToggle();
  if (granted) schedulePregameReminders();
};
function notifyNow(title, msg){
  if (!notifOn) return;
  var b = bridge(); if (!b) return;
  try{ if (typeof b.isNotificationGranted === "function" && !b.isNotificationGranted()) return; }catch(e){ return; }
  try{ if (typeof b.postNotificationNow === "function") b.postNotificationNow(title, msg); }catch(e){}
}
// Central-time conversion for pregame reminders. US Central DST runs from the
// second Sunday of March to the first Sunday of November.
function centralOffsetHours(dateISO){
  var p = dateISO.split("-"); var y = +p[0], m = +p[1], d = +p[2];
  function nthSun(month, n){
    var dt = new Date(Date.UTC(y, month - 1, 1));
    return 1 + ((7 - dt.getUTCDay()) % 7) + (n - 1) * 7;
  }
  var afterStart = (m > 3) || (m === 3 && d >= nthSun(3, 2));
  var beforeEnd = (m < 11) || (m === 11 && d < nthSun(11, 1));
  return (afterStart && beforeEnd) ? -5 : -6;
}
function gameEpochMs(g){
  if (!g.timeCT || g.timeCT === "TBD") return null;
  var m = g.timeCT.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  var hh = +m[1], mm = +m[2];
  if (/PM/i.test(m[3]) && hh !== 12) hh += 12;
  if (/AM/i.test(m[3]) && hh === 12) hh = 0;
  var p = g.date.split("-");
  return Date.UTC(+p[0], +p[1] - 1, +p[2], hh - centralOffsetHours(g.date), mm);
}
function schedulePregameReminders(){
  if (!notifOn) return;
  var b = bridge(); if (!b) return;
  try{ if (typeof b.isNotificationGranted === "function" && !b.isNotificationGranted()) return; }catch(e){ return; }
  var now = Date.now();
  GAMES.forEach(function(g){
    if (g.status !== "upcoming") return;
    var ep = gameEpochMs(g);
    if (!ep || ep <= now) return;
    var when = ep - 3600000; // 1 hour before puck drop
    if (when <= now) return;
    try{ b.scheduleReminder(g.n, when, "NCAAD1MH \u2014 puck drop in 1 hour", "Michigan vs " + g.opp + " \u2014 " + displayZoneTime(g.timeCT, g.date) + " at " + g.venue); }catch(e){}
  });
}

// ---------- in-app radio: WCBN 88.3 FM live stream (official wcbn.org link) ----------
// WCBN publishes this direct mp3 stream on wcbn.org/listen (hi bitrate). It is
// the station's live FM feed; WCBN's own page notes live game broadcasts are
// also streamed on the WCBN Sports YouTube channel, which the player bar links
// to, since a given game's broadcast may air there instead of on the FM feed.
var RADIO_URL = "http://floyd.wcbn.org:8000/wcbn-hi.mp3";
var radioAudio = null;
var radioPlaying = false;
var radioGame = null;
function isRadioPlaying(){ return radioPlaying; }
function nextGame(){
  var live = null; GAMES.forEach(function(g){ if (g.live) live = g; });
  if (live) return live;
  var now = Date.now(), best = null, bestEp = Infinity;
  GAMES.forEach(function(g){
    if (g.status !== "upcoming") return;
    var ep = gameEpochMs(g);
    if (ep && ep > now && ep < bestEp){ bestEp = ep; best = g; }
  });
  return best;
}
function radioLabel(){
  var g = radioGame || nextGame();
  if (g) return "WCBN 88.3 FM live \u2014 Michigan vs " + g.opp;
  return "WCBN 88.3 FM live";
}
function renderRadioBar(){
  var lb = $("#radio-label");
  if (lb) lb.textContent = radioLabel();
  var pb = $("#radio-play");
  if (pb) pb.textContent = radioPlaying ? "\u275a\u275a Pause" : "\u25b6 Play";
}
function ensureRadioAudio(){
  if (!radioAudio){
    radioAudio = new Audio(RADIO_URL);
    radioAudio.preload = "none";
    if (radioAudio.addEventListener){
      radioAudio.addEventListener("playing", function(){ radioPlaying = true; renderRadioBar(); updateLiveService(); });
      radioAudio.addEventListener("pause", function(){ radioPlaying = false; renderRadioBar(); updateLiveService(); });
    }
  }
  return radioAudio;
}
function startRadio(gameNum){
  try{
    var g = null;
    if (gameNum) GAMES.forEach(function(x){ if (x.n === gameNum) g = x; });
    radioGame = g || nextGame();
    var a = ensureRadioAudio();
    try{ a.src = RADIO_URL; }catch(e){}
    radioPlaying = true;
    var p = a.play();
    if (p && p.catch) p.catch(function(){ radioPlaying = false; renderRadioBar(); updateLiveService(); });
    document.body.classList.add("radio-on");
    var bar = $("#radiobar");
    if (bar) bar.hidden = false;
    renderRadioBar();
    updateLiveService();
  }catch(e){}
}
function pauseRadio(){
  try{ if (radioAudio) radioAudio.pause(); }catch(e){}
  radioPlaying = false; renderRadioBar(); updateLiveService();
}
function stopRadio(){
  pauseRadio();
  try{
    if (radioAudio){
      if (typeof radioAudio.removeAttribute === "function") radioAudio.removeAttribute("src");
      if (radioAudio.load) radioAudio.load();
    }
  }catch(e){}
  radioGame = null;
  document.body.classList.remove("radio-on");
  var bar = $("#radiobar");
  if (bar) bar.hidden = true;
}

// ---------- in-app video window: streams only since v32.13 (highlights go straight to YouTube), embeddable only ----------
// Login-walled / DRM outlets (B1G+, Peacock, NCHC.tv paywalled players) cannot
// be embedded in any app; those keep their external link and get an honest
// note here instead of a broken player.
var videoPlaying = false;
function ytEmbedUrl(url){
  var m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) || url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) || url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return m ? "https://www.youtube.com/embed/" + m[1] : null;
}
function openVideoWindow(url, title){
  var win = $("#videowin"); if (!win) return;
  var body = $("#vw-body"), note = $("#vw-note"), t = $("#vw-title"), ext = $("#vw-ext"), yt = $("#vw-ytlink"), yta = $("#vw-ytlink-a");
  if (ext) ext.href = url;
  // v21: a persistent "Open on YouTube" row under the player, visible
  // whenever a YouTube embed loads - if the embed errors inside the
  // iframe (embedding disabled), the way out stays one tap away.
  if (yt){
    if (ytEmbedUrl(url)){ if (yta) yta.href = url; yt.hidden = false; }
    else yt.hidden = true;
  }
  if (t) t.textContent = title || "Video";
  body.innerHTML = "";
  var emb = ytEmbedUrl(url);
  if (emb){
    if (note) note.hidden = true;
    body.innerHTML = '<iframe src="' + esc(emb) + '?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
  } else if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)){
    if (note) note.hidden = true;
    body.innerHTML = '<video src="' + esc(url) + '" controls autoplay playsinline></video>';
  } else {
    if (note){
      note.hidden = false;
      note.innerHTML = 'This outlet cannot be embedded in any app (login-walled or DRM-protected streams cannot play inline). <a href="' + esc(url) + '">Open externally</a>';
    }
    win.hidden = false; win.className = "vw-large"; videoPlaying = false; updateLiveService(); syncBackState(); try{ syncTickerVisibility(); }catch(e){} return;
  }
  win.hidden = false; win.className = "vw-large"; videoPlaying = true; updateLiveService(); syncBackState(); try{ syncTickerVisibility(); }catch(e){}
}
function setVideoMode(mode){
  var win = $("#videowin"); if (!win) return;
  if (mode === "min"){ win.className = "vw-min"; return; }
  if (mode === "full"){
    var req = win.requestFullscreen || win.webkitRequestFullscreen;
    if (req){
      try{
        var r = req.call(win);
        if (r && r.catch) r.catch(function(){ win.className = "vw-fs"; });
        else win.className = "vw-fs";
      }catch(e){ win.className = "vw-fs"; }
    } else win.className = "vw-fs";
    return;
  }
  win.className = "vw-large";
  try{ syncTickerVisibility(); }catch(e){}
}
function closeVideoWindow(){
  var win = $("#videowin"); if (!win) return;
  var body = $("#vw-body");
  if (body) body.innerHTML = "";
  var yt = $("#vw-ytlink"); if (yt) yt.hidden = true;
  win.hidden = true; videoPlaying = false; updateLiveService(); syncBackState(); try{ syncTickerVisibility(); }catch(e){}
}
function updateLiveService(){
  var b = bridge(); if (!b) return;
  try{
    if (radioPlaying || videoPlaying){ if (typeof b.startLiveService === "function") b.startLiveService(); }
    else if (typeof b.stopLiveService === "function") b.stopLiveService();
  }catch(e){}
}

// ---------- v9 goal sound + fight song (avatar removed v32.2; picker uses primaries v32.3) ----------
// v9 GOAL SOUND: a short local clip (assets/goal.mp3), about 5 seconds:
// ~1 second of crowd cheering, then the recorded arena horn immediately,
// loud. Built with ffmpeg from the CC0 Freesound SEF7 arena-horn recording
// that shipped as horn.mp3 in v1-v8 (cheer 3.9-4.9s + horn blast 4.9-8.9s,
// short fades at both ends so it starts and ends clean, horn amplified to
// a -0.3 dB peak). The old full-length horn.mp3 is NOT shipped in v9 and
// nothing references it — goal.mp3 is the only goal sound.
var hornOn = load("hornOn", true);
var goalAudio = null;
var primed = false;
function primeAudio(){
  if (primed) return;
  primed = true;
  try{
    goalAudio = new Audio("goal.mp3");
    goalAudio.volume = 1.0;
    goalAudio.load();
  }catch(e){}
}
document.addEventListener("touchstart", primeAudio, {passive:true});
document.addEventListener("click", primeAudio);
function playGoalSound(){
  primeAudio();
  try{
    if (!goalAudio) goalAudio = new Audio("goal.mp3");
    goalAudio.currentTime = 0;
    var p = goalAudio.play(); if (p && p.catch) p.catch(function(){});
  }catch(e){}
}
function playHorn(){
  if (!hornOn) return;
  if (isRadioPlaying()) return;
  try{
    if (!goalAudio) goalAudio = new Audio("goal.mp3");
    goalAudio.currentTime = 0;
    var p = goalAudio.play();
    if (p && p.catch) p.catch(function(){});
  }catch(e){}
}

// v32 GOAL CALL: on a favorite-team goal in live time, the horn sounds
// and an announcer yells "GOAL <X>" — no widget, no tap. X is picked
// uniformly at random per goal among the variants actually available:
// the school-name clip, the mascot clip (both pre-rendered in the v12
// announcer voice; availability from goal-files.js, generated at build
// time from disk so a missing clip is never offered), and the scorer's
// last name when the live summary feed supplies one (spoken by the
// phone's own voice — no recording can cover every player). The whole
// call obeys the horn toggle and stays silent while the in-app radio
// plays, same as the horn itself. Opponent goals never reach this code:
// both trigger sites fire only on a favorite's own score increase.
var goalCallScorer = {}; // evId -> lastName, "" when lookup finished empty, null while pending
function fetchGoalScorer(evId, teamKey){
  if (!evId || goalCallScorer[evId] !== undefined) return;
  goalCallScorer[evId] = null;
  if (typeof fetch !== "function"){ goalCallScorer[evId] = ""; return; }
  var ctl = null;
  try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(e){} }, 8000); }catch(e){}
  var opts = {}; if (ctl) opts.signal = ctl.signal;
  var url = "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/summary?event=" + evId;
  fetch(url, opts).then(function(r){ return r.json(); }).then(function(j){
    goalCallScorer[evId] = parseGoalScorer(j, teamKey) || "";
  }).catch(function(){ goalCallScorer[evId] = ""; });
}
// Defensive scorer parse: the summary shape is unverified from this
// sandbox (ESPN site-API fetches are policy-blocked here), so every
// access is guarded and anything unrecognized yields null — the call
// then falls back to a school/mascot clip. Never throws, never guesses
// a name from an unrelated play.
function parseGoalScorer(j, teamKey){
  try{
    var pools = [];
    if (j){
      if (j.details) pools.push(j.details);
      if (j.scoringPlays) pools.push(j.scoringPlays);
      if (j.header && j.header.competitions && j.header.competitions[0] && j.header.competitions[0].details) pools.push(j.header.competitions[0].details);
      if (j.gameInfo && j.gameInfo.scoringPlays) pools.push(j.gameInfo.scoringPlays);
    }
    var goals = [];
    pools.forEach(function(pool){
      (pool || []).forEach(function(p){
        var txt = ((p.type && p.type.text) || p.text || "").toLowerCase();
        var isGoal = p.scoringPlay === true || txt.indexOf("goal") !== -1;
        if (!isGoal) return;
        var teamId = (p.team && p.team.id) || null;
        var athletes = p.athletesInvolved || p.athletes || [];
        var name = "";
        if (athletes.length && athletes[0]) name = athletes[0].displayName || athletes[0].name || "";
        if (!name && p.athlete) name = p.athlete.displayName || "";
        if (name) goals.push({teamId: teamId, name: name});
      });
    });
    if (!goals.length) return null;
    var pick = null;
    if (teamKey){
      for (var i = goals.length - 1; i >= 0; i--){
        if (goals[i].teamId && dirKeyForEspnId(goals[i].teamId) === teamKey){ pick = goals[i]; break; }
      }
    }
    if (!pick) pick = goals[goals.length - 1];
    var parts = pick.name.trim().split(/\s+/);
    var last = parts[parts.length - 1] || "";
    if ((last === "Jr." || last === "Jr" || last === "II" || last === "III" || last === "IV") && parts.length > 1) last = parts[parts.length - 2];
    return last || null;
  }catch(e){ return null; }
}
function pickGoalVariant(teamKey, scorer){
  var variants = [];
  try{ if (typeof GOAL_CLIP_TEAM !== "undefined" && GOAL_CLIP_TEAM.indexOf(teamKey) !== -1) variants.push({kind: "clip", src: "goal-team-" + teamKey + ".mp3"}); }catch(e){}
  try{ if (typeof GOAL_CLIP_MASCOT !== "undefined" && GOAL_CLIP_MASCOT.indexOf(teamKey) !== -1) variants.push({kind: "clip", src: "goal-mascot-" + teamKey + ".mp3"}); }catch(e){}
  if (scorer) variants.push({kind: "speech", text: scorer + "!"});
  if (!variants.length) return null;
  return variants[Math.floor(Math.random() * variants.length)];
}
function playAudioSeq(srcs, done){
  if (!srcs.length){ if (done) done(); return; }
  var a;
  try{ a = new Audio(srcs[0]); }catch(e){ playAudioSeq(srcs.slice(1), done); return; }
  a.addEventListener("ended", function(){ playAudioSeq(srcs.slice(1), done); });
  var p = null;
  try{ p = a.play(); }catch(e){}
  if (p && p.catch) p.catch(function(){ playAudioSeq(srcs.slice(1), done); });
}
function playGoalCall(teamKey, evId){
  if (!hornOn) return;
  try{ if (isRadioPlaying()) return; }catch(e){}
  if (evId) fetchGoalScorer(evId, teamKey);
  playAudioSeq(["goal.mp3", "goal-GOAL.mp3"], function(){
    var sc = (evId && goalCallScorer[evId]) ? goalCallScorer[evId] : "";
    var v = pickGoalVariant(teamKey, sc);
    if (!v) return;
    if (v.kind === "clip"){ playAudioSeq([v.src], null); return; }
    try{ if (typeof window !== "undefined" && window.speechSynthesis){ window.speechSynthesis.speak(new SpeechSynthesisUtterance(v.text)); } }catch(e){}
  });
}
// ---------- v12 TEAM INTRO ----------
// A "Team Intro" button on EVERY team page, separate from music,
// tap-play/tap-stop like music, played in place (no extra screen, no
// external player). The intro audio is TTS-synthesized announcer-style
// audio — NEVER presented as a real arena recording; the section note
// says so on every team page. Playback: if the team is currently ranked
// in the app's ranking data (USCHO top 20), the shared rank clip
// ("Here's your number N!") plays, then that team's name clip — so the
// intro announces the ranking and updates when rankings change, with no
// rebuild. If unranked, the full intro ("Here come the [team]!") plays
// with no rank. NEVER announce a rank a team does not hold: a rank is
// used only when it is an integer 1..20 from a real source below.
var introAudio = null;
var introPlaying = false;
var introKey = null;
var LIVE_RANKS = null;
var LIVE_RANKS_KEY = "vmax-live-ranks-v1";
function loadLiveRanks(){
  if (LIVE_RANKS) return LIVE_RANKS;
  try{ var raw = load(LIVE_RANKS_KEY, {}); LIVE_RANKS = (raw && typeof raw === "object") ? raw : {}; }
  catch(e){ LIVE_RANKS = {}; }
  return LIVE_RANKS;
}
function currentIntroRank(key){
  try{
    var live = loadLiveRanks();
    var r = null;
    if (live && typeof live[key] === "number" && !liveRanksExpired()) r = live[key];
    if (r === null && typeof USCHO_POLL !== "undefined") USCHO_POLL.forEach(function(x){ if (x.key === key) r = x.rank; });
    if (r === null && typeof TEAMS !== "undefined" && TEAMS[key] && typeof TEAMS[key].rank === "number") r = TEAMS[key].rank;
    if (typeof r === "number" && r >= 1 && r <= 20 && Math.floor(r) === r) return r;
  }catch(e){}
  return null;
}
function rankClipFile(n){ return "rank-" + (n < 10 ? "0" + n : "" + n) + ".mp3"; }
function teamIntroHTML(key){
  var r = currentIntroRank(key);
  var note = r
    ? "Ranked #" + r + " in the app's ranking data — Team Intro announces the ranking, then the team name."
    : "Not ranked — Team Intro plays the team intro without a rank.";
  return '<div class="tv-line">Team intro: synthesized announcer-style intro — not a real arena recording. <button class="tv-back" data-team-intro="' + esc(key) + '" type="button">Team Intro</button></div><div class="tv-note" data-intro-note="' + esc(key) + '">' + note + "</div>";
}
function stopIntro(){
  try{ if (introAudio) introAudio.pause(); }catch(e){}
  introAudio = null; introPlaying = false; introKey = null;
  var n = document.querySelector("[data-intro-note]");
  if (n && !/Ranked #|Not ranked/.test(n.textContent)) n.textContent = "";
  syncIntroLabels();
}
function syncIntroLabels(){
  $$("[data-team-intro]").forEach(function(b){
    b.textContent = (introPlaying && b.getAttribute("data-team-intro") === introKey) ? "Stop" : "Team Intro";
  });
}
function playIntroClip(file, onEnded, key){
  var a = new Audio(file);
  a.volume = 1.0;
  if (onEnded && a.addEventListener) a.addEventListener("ended", onEnded);
  introAudio = a;
  var fail = function(){ introPlaying = false; introKey = null; syncIntroLabels(); if (key){ var ne = document.querySelector('[data-intro-note="' + key + '"]'); if (ne) ne.textContent = ""; } };
  var p = null;
  try{ p = a.play(); }catch(e){ fail(); }
  if (p && p.catch) p.catch(fail);
  return a;
}
function playIntro(key){
  try{ stopRadio(); }catch(e){}
  stopIntro();
  var r = currentIntroRank(key);
  introPlaying = true; introKey = key;
  syncIntroLabels();
  var noteEl = document.querySelector('[data-intro-note="' + key + '"]');
  if (noteEl) noteEl.textContent = "Now playing: Team Intro — synthesized announcer-style intro (not a real arena recording)" + (r ? " — ranked #" + r + "." : ".") + " Tap Team Intro again to stop.";
  var self = this;
  if (r){
    playIntroClip(rankClipFile(r), function(){
      if (!introPlaying || introKey !== key) return;
      playIntroClip("name-" + key + ".mp3", function(){ introPlaying = false; introKey = null; syncIntroLabels(); }, key);
    }, key);
  } else {
    playIntroClip("announce-" + key + ".mp3", function(){ introPlaying = false; introKey = null; syncIntroLabels(); }, key);
  }
}
function toggleIntro(key){
  if (introPlaying && introKey === key){ stopIntro(); return; }
  playIntro(key);
}
// Defensive parse of the ESPN rankings feed into LIVE_RANKS (key -> 1..20).
// The feed shape is not guaranteed, so this walks the JSON for any object
// carrying a numeric rank plus a numeric team id, mapped through the
// ESPN-id directory map. If nothing parses, LIVE_RANKS stays as-is and
// the bundled tables remain the ranking source — never an invented rank.
function parseLiveRanks(j){
  var out = {};
  var seen = [];
  function walk(x){
    if (!x || typeof x !== "object" || seen.indexOf(x) >= 0) return;
    seen.push(x);
    if (Array.isArray(x)){ x.forEach(walk); return; }
    var rk = (typeof x.current === "number") ? x.current : (typeof x.rank === "number") ? x.rank : (typeof x.position === "number") ? x.position : null;
    var tid = null;
    if (x.team && typeof x.team.id !== "undefined") tid = x.team.id;
    else if (typeof x.teamId !== "undefined") tid = x.teamId;
    if (rk !== null && tid !== null){
      try{ var k = dirKeyForEspnId(tid); if (k && rk >= 1 && rk <= 20 && Math.floor(rk) === rk) out[k] = rk; }catch(e){}
    }
    Object.keys(x).forEach(function(k){ walk(x[k]); });
  }
  walk(j);
  return out;
}
var LIVE_RANKS_ASOF_KEY = "vmax-live-ranks-asof-v1";
function saveLiveRanks(map){
  try{ save(LIVE_RANKS_KEY, map); LIVE_RANKS = map; try{ save(LIVE_RANKS_ASOF_KEY, Date.now()); }catch(e){} }catch(e){}
}
function loadLiveRanksAsOf(){
  try{ var v = load(LIVE_RANKS_ASOF_KEY, 0); return (typeof v === "number") ? v : 0; }catch(e){ return 0; }
}
// v32.24: a live rank older than 7 days is expired — the resolver falls
// through to the dated USCHO poll instead of presenting stale ranks as live.
function liveRanksExpired(){
  var asof = loadLiveRanksAsOf();
  if (!asof) return true;
  return (Date.now() - asof) > 7 * 24 * 60 * 60 * 1000;
}
// ---------- v15 FAVORITE TEAMS ----------
// Multi-select favorites, persisted in localStorage (DOM storage is on in
// MainActivity, so this survives restarts). A favorite gets the full team
// page (logos, intro, live data, roster, results, fixtures, news)
// — the team view IS the favorite page. Michigan-only content does NOT
// transfer: the 9 Michigan championship banners, Michigan's full 34-game
// schedule, and Michigan's full-season points stay Michigan's. A favorite
// shows its verified results/fixtures plus its games vs Michigan; a full
// season schedule is NOT bundled for non-Michigan teams and is never
// invented. The ticker already covers every D1 game, favorites included.
var FAV_KEY = "vmax-favorites-v1";
function getFavorites(){
  var raw = load(FAV_KEY, []);
  if (!Array.isArray(raw)) return [];
  var seen = {};
  return raw.filter(function(k){ if (typeof k !== "string" || seen[k]) return false; seen[k] = true; return !!dirEntry(k); });
}
function isFavorite(key){ return getFavorites().indexOf(key) !== -1; }
function favStarHTML(key){
  var fav = isFavorite(key);
  return '<button class="team-fav-star' + (fav ? ' is-fav' : '') + '" data-fav-toggle="' + esc(key) + '" type="button" aria-label="Toggle favorite" aria-pressed="' + (fav ? 'true' : 'false') + '">' + (fav ? '★' : '☆') + '</button>';
}
function syncFavStar(b, key){
  var fav = isFavorite(key);
  b.textContent = fav ? '★' : '☆';
  b.classList.toggle('is-fav', fav);
  b.setAttribute('aria-pressed', fav ? 'true' : 'false');
}
// v32.25: Michigan counts as a favorite like any other team when picked.
// The top favorite is the FIRST stored favorite, Michigan included; the
// old MICH filter made a Michigan top favorite invisible to the
// favorite-opening toggle and silently dropped Michigan on reorder.
function getTopFavorite(){
  var f = getFavorites();
  return f.length ? f[0] : null;
}
function makeTopFavorite(key){
  var favs = getFavorites();
  var i = favs.indexOf(key);
  if (i <= 0) return false;
  favs.splice(i, 1); favs.unshift(key);
  save(FAV_KEY, favs);
  try{ renderFavHome(); }catch(e){}
  return true;
}
function toggleFavorite(key){
  if (!dirEntry(key)) return false;
  var favs = getFavorites();
  var i = favs.indexOf(key);
  if (i === -1) favs.push(key); else favs.splice(i, 1);
  save(FAV_KEY, favs);
  try{ syncIconAfterFavoritesChange(); }catch(e){}
  try{ renderFavHome(); }catch(e){}
  return i === -1;
}
function favDisplayName(key){
  var de = dirEntry(key);
  if (de) return de.name;
  if (TEAMS[key]) return TEAMS[key].name;
  return key;
}
// Next-game / live line for a favorite on the home favorites section.
// Sources, in order: live board state (today's live/final game), the next
// Michigan game vs that team, the team's first verified fixture. Never
// invented: if none of those exist, say so.
var favBoard = {};
function favNextLine(key){
  var b = favBoard[key];
  if (b){
    if (b.state === "in") return "LIVE " + b.score + " vs " + b.opp + (b.clock ? " · " + b.clock : "");
    if (b.state === "post") return "Final " + b.score + " vs " + b.opp;
  }
  if (key === "MICH"){
    var nm = null;
    GAMES.forEach(function(g){ if (g.status === "upcoming" && !nm) nm = g; });
    if (nm){ var nlm = timeCTLabel(nm.timeCT, nm.date); return "Next vs " + nm.opp + ": " + fmtDate(nm.date) + (nlm ? " · " + nlm : ""); }
  }
  var next = null;
  GAMES.forEach(function(g){ if (g.short === key && g.status === "upcoming" && !next) next = g; });
  if (next){ var nl = timeCTLabel(next.timeCT, next.date); return "Next vs Michigan: " + fmtDate(next.date) + (nl ? " · " + nl : ""); }
  if (TEAMS[key] && TEAMS[key].fixtures && TEAMS[key].fixtures.length) return "Next (verified): " + TEAMS[key].fixtures[0];
  return "No upcoming game listed.";
}
function renderFavHome(){
  var el = $("#fav-home");
  if (!el) return;
  var favs = getFavorites();
  if (!favs.length){
    el.innerHTML = '<div class="tv-note">Tap ☆ on any team page, directory row, or the Settings list to add favorites here — favorites get live scores, the goal horn when they score, and their full team page.</div>';
    return;
  }
  var html = '<div class="tv-sec"><div class="tv-title">MY FAVORITES</div>';
  favs.forEach(function(k){
    var de = dirEntry(k);
    html += '<div class="dir-row" data-fav-team="' + esc(k) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(k), k) + (de ? teamLogoImg(de, "dir-logo") : "") +
      '<span class="dir-name">' + esc(favDisplayName(k)) + "</span>" +
      '<span class="dir-meta">' + esc(favNextLine(k)) + "</span>" + favRowH2H(k) + "</div>";
  });
  html += '<button class="tv-back" id="fav-home-open" type="button">Open favorites home</button>';
  html += "</div>";
  el.innerHTML = html;
  $$("[data-fav-team]", el).forEach(function(b){
    b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-fav-team")); });
  });
  var fho = $("#fav-home-open");
  if (fho) fho.addEventListener("click", function(){ showFavHomeView(); });
}

// v26 TOP FAVORITE: the first favorite in your list is the top favorite —
// (unless you picked a different icon explicitly) the launcher icon is
// that team's logo. v32.17: the top favorite NO LONGER decides the boot
// page — boot is the neutral page unless the favorite-opening toggle is on.
// Changes apply on close + reopen, because home and icon resolve at launch.
// Favorites can be added, removed, or reordered (Make top) anytime; the
// favorites home view stays reachable from the Michigan home favorites section.
// v32.25: Michigan counts as a routable favorite like any other team when picked.
function showFavHomeView(push){
  var fv = $("#favhomeview"), mv = $("#michview"), tv = $("#teamview");
  if (!fv || !mv || !tv) return;
  if (push !== false && currentView.kind !== "favhome") pushNav();
  currentView = {kind: "favhome"};
  currentTeamKey = null;
  var favs = getFavorites();
  var html = '<div class="tv themed"><div class="tv-head"><div class="tv-name">MY FAVORITES</div>' +
    '<div class="tv-meta">Your favorite teams — tap one to open its full page.</div></div>';
  if (!favs.length){
    html += '<div class="tv-sec"><div class="tv-note">No favorites picked yet. Tap \u2606 on any team page, directory row, or the Settings list to add one.</div></div>';
  } else {
    html += '<div class="tv-sec">';
    favs.forEach(function(k){
      var de = dirEntry(k);
      html += '<div class="dir-row" data-fav-team="' + esc(k) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(k), k) + (de ? teamLogoImg(de, "dir-logo") : "") +
        '<span class="dir-name">' + esc(favDisplayName(k)) + '</span>' +
        '<span class="dir-meta">' + esc(favNextLine(k)) + '</span>' + favRowH2H(k) + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  fv.innerHTML = html;
  fv.hidden = false; mv.hidden = true; tv.hidden = true;
  ["playerview", "confview", "settingsview", "bracketview", "searchview", "neutralview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ window.scrollTo(0, 0); }catch(e){}
  $$("[data-fav-team]", fv).forEach(function(b){ b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-fav-team")); }); });
}
// v32.17: boot is the neutral intro page by default. The automatic jump to
// the top favorite's team page is gone — that jump is what Victor flagged.
// Favorite-team opening survives only as the explicit Settings toggle
// (favOpenOn, default off).
function startHome(){
  // v32.30 boot resilience: the neutral page must render even if the
  // normal home path throws. First retry is the neutral render itself
  // (it hides every other view, so a half-rendered team view is cleaned
  // up); last resort is a static honest fallback so boot never lands on
  // a blank page below the ticker.
  try{
    var top = getTopFavorite();
    if (favOpenOn && top) showTeamView(top, false);
    else renderNeutralView(false);
  }catch(e){
    try{ renderNeutralView(false); }catch(e2){
      try{
        var nv = document.getElementById("neutralview");
        if (nv){
          nv.innerHTML = '<div class="tv-head"><div class="tv-name">NCAA Division 1 Men\'s Hockey</div></div>' +
            '<div class="tv-sec"><div class="tv-note">The home page could not be rendered. Tap any team from Settings, or relaunch the app; saved data is unaffected.</div></div>';
          nv.hidden = false;
        }
      }catch(e3){}
    }
  }
}
// v32.29 NO FORCED PICKER (Victor, 2026-10-28 — supersedes the v26
// FIRST-RUN PICKER rule, 2026-10-25): a fresh install opens on the
// neutral page, never on a pick-your-favorite screen. Favorites are
// picked anytime — a team's star, or Settings — and changed anytime.
// Clearing all favorites just leaves the neutral page; nothing forces
// the picker back on next launch. The picker itself still exists and
// is reachable from Settings; it never pops at launch or mid-session,
// and Back while it is open does nothing.
function pickerOpen(){
  var el = $("#fav-picker"); return !!(el && !el.hidden);
}
function renderPicker(){
  var el = $("#fav-picker"); if (!el) return;
  var html = '<div class="pick-title">Pick your favorite team</div>' +
    '<div class="pick-note">Tap a logo to add that team as a favorite. You can change favorites anytime in Settings or from a team\'s star.</div>' +
    '<div class="pick-grid">';
  DIRECTORY.slice().sort(function(a, b){ return a.name < b.name ? -1 : 1; }).forEach(function(d){
    html += '<button class="pick-tile" type="button" data-pick-team="' + esc(d.key) + '">' + teamLogoImg(d, "pick-logo", true) +
      '<span class="pick-name">' + esc(d.name) + '</span></button>';
  });
  html += '</div>';
  el.innerHTML = html;
  $$("[data-pick-team]", el).forEach(function(b){
    b.addEventListener("click", function(){ pickFavorite(b.getAttribute("data-pick-team")); });
  });
}
function showPicker(){
  renderPicker();
  var el = $("#fav-picker"); if (el) el.hidden = false;
  syncBackState();
}
function hidePicker(){
  var el = $("#fav-picker"); if (el) el.hidden = true;
  syncBackState();
}
function pickFavorite(key){
  // v32.21: picking stores the favorite and lands on the neutral page —
  // it never jumps to Michigan or to any team page at boot. Team-specific
  // branding appears only on that team's own page when the user opens it.
  if (!dirEntry(key)) return false;
  save(FAV_KEY, [key]);
  try{ syncIconAfterFavoritesChange(); }catch(e){}
  try{ renderFavHome(); }catch(e){}
  hidePicker();
  return true;
}

// v26 DEEP LINKS: ncaamd1h://team/KEY and ncaamd1h://home, plus the
// ?team=KEY page-URL form the native side builds from an incoming
// intent. Routed at boot before startHome/picker, so a link wins for
// that launch without storing a favorite (navigation, not a pick).
// Unknown keys and malformed links fall through to normal boot.
function deepLinkTeam(uri){
  var s = String(uri || "");
  var q = s.match(/[?&]team=([A-Za-z]+)/);
  if (q) return q[1].toUpperCase();
  var p = s.match(/team\/([A-Za-z]+)/);
  if (p) return p[1].toUpperCase();
  return null;
}
function handleDeepLink(uri){
  var key = deepLinkTeam(uri);
  if (key && dirEntry(key)){ hidePicker(); showTeamView(key, false); return key; }
  if (/home/.test(String(uri || ""))){ hidePicker(); renderNeutralView(); return "home"; }
  return null;
}
// v32.23 LAUNCHER ICON (Victor 2026-10-27, final rule): two modes, and a
// manual choice is never silently overridden.
//   FOLLOW (default): the icon is the MOST RECENTLY selected favorite's
//     logo; the NCAAH puck when no favorites are stored. Favorite
//     selection/deselection re-syncs the icon at selection time (the
//     bridge call happens then; the launcher itself refreshes the
//     visible icon on next launch — see the native comment, unchanged).
//   FIXED (Settings override, changeable anytime): the user picks the
//     puck ("DEFAULT") or any of the 63 team logos, regardless of
//     favorites, and it STICKS across favorite changes until the user
//     picks again or switches back to Follow.
// Migration: a stored pre-v32.23 explicit icon-team choice becomes a
// fixed choice with the same team (never reset); anything else starts
// in Follow mode. The native side never restarts the activity on an
// icon switch (that restart crashed v32 on reopen).
var ICON_TEAM_KEY = "vmax-icon-team-v1";
var ICON_EXPLICIT_KEY = "vmax-icon-explicit-v1";
var ICON_MODE_KEY = "vmax-icon-mode-v1";
function getIconMode(){
  var m = load(ICON_MODE_KEY, null);
  if (m === "fixed" || m === "follow") return m;
  var oldExplicit = false;
  try{ oldExplicit = !!load(ICON_EXPLICIT_KEY, false) || load(ICON_TEAM_KEY, "DEFAULT") !== "DEFAULT"; }catch(e){}
  var mode = oldExplicit ? "fixed" : "follow";
  try{ save(ICON_MODE_KEY, mode); }catch(e){}
  return mode;
}
function getFixedIconTeam(){
  var k = load(ICON_TEAM_KEY, "DEFAULT");
  if (k === "DEFAULT") return "DEFAULT";
  return dirEntry(k) ? k : "DEFAULT";
}
function getRecentFavorite(){
  var f = getFavorites();
  return f.length ? f[f.length - 1] : null;
}
function getEffectiveIconTeam(){
  if (getIconMode() === "fixed") return getFixedIconTeam();
  return getRecentFavorite() || "DEFAULT";
}
// Back-compat wrappers for the pre-v32.23 names.
function getIconTeam(){ return getFixedIconTeam(); }
function isIconExplicit(){ return getIconMode() === "fixed"; }
function applyIconAlias(key){
  try{
    var b = bridge();
    if (b && typeof b.setFavoriteIcon === "function") b.setFavoriteIcon(key);
  }catch(e){}
  return key;
}
function applyBootIcon(){
  return applyIconAlias(getEffectiveIconTeam());
}
function clearIconExplicit(){
  return setIconMode("follow");
}
function setIconMode(mode){
  if (mode !== "follow") return false;
  if (getIconMode() === "follow") return getEffectiveIconTeam();
  try{ save(ICON_MODE_KEY, "follow"); }catch(e){}
  return applyIconAlias(getRecentFavorite() || "DEFAULT");
}
function setFixedIcon(key){
  if (key !== "DEFAULT" && !dirEntry(key)) return false;
  if (getIconMode() === "fixed" && getFixedIconTeam() === key) return key;
  try{ save(ICON_TEAM_KEY, key); }catch(e){}
  try{ save(ICON_MODE_KEY, "fixed"); }catch(e){}
  try{ save(ICON_EXPLICIT_KEY, true); }catch(e){}
  return applyIconAlias(key);
}
function setIconTeam(key){
  if (key === "DEFAULT") return setFixedIcon("DEFAULT") === "DEFAULT";
  return setFixedIcon(key) === key;
}
function syncIconAfterFavoritesChange(){
  if (getIconMode() === "fixed") return getFixedIconTeam();
  return applyIconAlias(getRecentFavorite() || "DEFAULT");
}
// Favorite goal horn: runs on every live-board refresh. Fires ONLY when a
// FAVORITE team's own score increases in a live game. Opponent goals never
// fire it, non-favorites never fire it, and Michigan is skipped here
// because Michigan goals already horn through the Michigan live path
// (firing twice would double-play). Same goal.mp3 as Michigan goals.
var favLiveSeen = load("favLiveSeen", {});
function updateFavoriteLive(events){
  var favs = getFavorites();
  (events || []).forEach(function(ev){
    var g = boardGameInfo(ev);
    if (!g) return;
    [["home", g.homeKey, g.hs, g.awayName], ["away", g.awayKey, g.as, g.homeName]].forEach(function(side){
      var key = side[1];
      if (!key || key === "MICH" || favs.indexOf(key) === -1) return;
      if (g.state === "in" || g.state === "post"){
        favBoard[key] = {state: g.state, score: (side[0] === "home" ? g.hs : g.as) + "–" + (side[0] === "home" ? g.as : g.hs), opp: side[3], clock: g.clock};
      }
      if (g.state !== "in") return;
      var sc = parseInt(side[2], 10);
      if (isNaN(sc)) return;
      var evKey = (ev.id || (ev.date || "")) + ":" + key;
      var prev = favLiveSeen[evKey];
      if (prev !== undefined && sc > prev){
        playGoalCall(key, ev.id);
        try{ notifyNow("GOAL — " + favDisplayName(key) + " " + sc + "-" + (side[0] === "home" ? g.as : g.hs), favDisplayName(key) + " scores."); }catch(e){}
      }
      favLiveSeen[evKey] = sc;
      save("favLiveSeen", favLiveSeen);
    });
  });
  try{ renderFavHome(); }catch(e){}
}
// ---------- v15 ALWAYS-ON TICKER ----------
// The ticker strip is fixed to the top of the screen (CSS) so it stays
// visible and scrolling on every page. It hides ONLY while a video window
// is open (livestream or highlight playing, any videowin mode) and comes
// back the moment the video closes. Ticker CONTENT rules are unchanged.
function syncTickerVisibility(){
  var t = $("#ticker");
  if (!t) return;
  var win = $("#videowin");
  t.hidden = !!(win && !win.hidden);
}
function renderHornToggle(){
  var s = $("#st-horn-toggle");
  if (s) s.textContent = "Goal horn: " + (hornOn ? "On" : "Off");
}
function setHornOn(v){
  hornOn = !!v; save("hornOn", hornOn);
  renderHornToggle();
}

// ---------- future highlights: NCAA Hockey Highlights channel RSS ----------
// v21 whole-word team matching. The old substring rule let "western
// michigan" satisfy the "michigan" check, so ANY Western Michigan video
// in the window (e.g. "Wisconsin vs Western Michigan") attached to the
// Michigan-Western Michigan game. Both teams must now appear as whole
// words: Michigan must survive as its own token after the opponent's
// full name is removed, and the opponent phrase must not be a longer
// team name in disguise (Minnesota vs Minnesota State/Duluth).
function rssTitleTokens(title){
  return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(function(w){ return !!w; });
}
function rssRemovePhraseTokens(tokens, phraseTokens){
  if (!phraseTokens.length) return tokens.slice();
  var out = [], i = 0;
  while (i < tokens.length){
    var match = true;
    for (var k = 0; k < phraseTokens.length; k++){ if (tokens[i + k] !== phraseTokens[k]){ match = false; break; } }
    if (match){ i += phraseTokens.length; } else { out.push(tokens[i]); i++; }
  }
  return out;
}
function rssPhraseInTokens(tokens, phraseTokens){
  for (var i = 0; i + phraseTokens.length <= tokens.length; i++){
    var ok = true;
    for (var k = 0; k < phraseTokens.length; k++){ if (tokens[i + k] !== phraseTokens[k]){ ok = false; break; } }
    if (!ok) continue;
    var nxt = tokens[i + phraseTokens.length];
    if ((nxt === "state" || nxt === "duluth") && phraseTokens[phraseTokens.length - 1] !== nxt) continue;
    return true;
  }
  return false;
}
function rssTitleMatchesMichiganGame(title, opp){
  var tokens = rssTitleTokens(title);
  var oppTokens = rssTitleTokens(opp);
  if (!rssPhraseInTokens(tokens, oppTokens)) return false;
  var rest = rssRemovePhraseTokens(tokens, oppTokens);
  rest = rssRemovePhraseTokens(rest, ["michigan", "state"]);
  rest = rssRemovePhraseTokens(rest, ["michigan", "tech"]);
  return rest.indexOf("michigan") !== -1;
}
function rssTitleDateMatch(title, cands){
  var t = String(title || "").toLowerCase();
  var months = {jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5, jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9, september:9, oct:10, october:10, nov:11, november:11, dec:12, december:12};
  var md = null;
  var m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/);
  if (m) md = {mo: months[m[1]], day: +m[2]};
  else { var n = t.match(/\b(\d{1,2})\/(\d{1,2})\b/); if (n) md = {mo: +n[1], day: +n[2]}; }
  if (!md) return null;
  var hits = cands.filter(function(c){ var p = c.g.date.split("-"); return +p[1] === md.mo && +p[2] === md.day; });
  return hits.length ? hits : null;
}
// ---------- v32.4: generic highlights matcher (all 63 teams) ----------
// Same never-guess rules as the Michigan matcher: a title must name BOTH
// teams as whole words, a dated title must pin exactly one final in the
// 0-3 day window, exhibition never matches, ambiguous = no button.
// Fills store {url, opp} so render time can verify the exact opponent;
// a fill only attaches to a row whose opponent matches the recorded one.
var HL_FILLS_KEY = "ncaamd1h-hl-fills";
var hlFills = load(HL_FILLS_KEY, {});
if (!hlFills || typeof hlFills !== "object") hlFills = {};
var hlFeedAt = 0, HL_FEED_TTL = 30 * 60 * 1000;
function decodeEntities(s){
  return String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function hlTokens(title){
  return decodeEntities(title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(function(w){ return !!w; });
}
function hlPhraseInTokens(tokens, phrase){
  for (var i = 0; i + phrase.length <= tokens.length; i++){
    var ok = true;
    for (var k = 0; k < phrase.length; k++){ if (tokens[i + k] !== phrase[k]){ ok = false; break; } }
    if (!ok) continue;
    var nxt = tokens[i + phrase.length];
    if ((nxt === "state" || nxt === "duluth" || nxt === "tech") && phrase[phrase.length - 1] !== nxt) continue;
    return true;
  }
  return false;
}
function hlTitleMatchesGame(title, teamName, oppName){
  var tokens = hlTokens(title);
  var opp = hlTokens(oppName), team = hlTokens(teamName);
  if (!hlPhraseInTokens(tokens, opp)) return false;
  // Try removing each single occurrence of the opponent phrase: the team
  // name must survive independent of one opponent mention, in either order.
  for (var i = 0; i + opp.length <= tokens.length; i++){
    var ok = true;
    for (var k = 0; k < opp.length; k++){ if (tokens[i + k] !== opp[k]){ ok = false; break; } }
    if (!ok) continue;
    var nxt = tokens[i + opp.length];
    if ((nxt === "state" || nxt === "duluth" || nxt === "tech") && opp[opp.length - 1] !== nxt) continue;
    var rest = tokens.slice(0, i).concat(tokens.slice(i + opp.length));
    if (hlPhraseInTokens(rest, team)) return true;
  }
  return false;
}
function hlTitleDate(title){
  var t = String(title || "").toLowerCase();
  var months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  var m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/);
  if (m) return { mo: months[m[1]], day: +m[2] };
  var n = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (n) return { mo: +n[1], day: +n[2] };
  return null;
}
function hlDaysBetween(a, b){
  function t(iso){ var p = iso.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  return Math.round((t(b) - t(a)) / 86400000);
}
function isExhibition(r){ return /exhibition/i.test(r.note || ""); }
function isTbdSlot(r){ return !r.oppKey && !isExhibition(r) && /^TBD$/i.test(String(r.opp || "")); }
function oppDisplayName(r){
  if (r.oppKey && dirEntry(r.oppKey)) return dirEntry(r.oppKey).name;
  if (isTbdSlot(r)){
    var m = /^(Beanpot|Holiday Face-Off|Empire State|Friendship Four|Great Lakes Invitational|CT Ice)/i.exec(r.note || "");
    return "Opponent to be determined" + (m ? " (" + m[1] + ")" : "");
  }
  return r.opp || "";
}
function matchHighlightsFeed(items, schedules){
  var assigned = {}, out = [];
  function hasHl(key, row){
    if (row.hl) return true;
    if (assigned[key + "|" + row.d]) return true;
    if (hlFills[key] && hlFills[key][row.d]) return true;
    return false;
  }
  (items || []).forEach(function(it){
    var title = String(it.title || "");
    if (/\bexhibition\b/i.test(title)) return;
    var low = title.toLowerCase();
    var hasDate = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/.test(low) || /\b\d{1,2}\/\d{1,2}\b/.test(low);
    var md = hlTitleDate(title);
    Object.keys(schedules || {}).forEach(function(key){
      var de = dirEntry(key);
      if (!de) return;
      var rows = schedules[key] || [];
      var cands = [];
      rows.forEach(function(r){
        if (!r.result || isExhibition(r) || hasHl(key, r)) return;
        if (!hlTitleMatchesGame(title, de.name, oppDisplayName(r))) return;
        var diff = hlDaysBetween(r.d, it.pubDate);
        if (diff >= 0 && diff <= 3) cands.push(r);
      });
      if (!cands.length) return;
      if (hasDate){
        if (!md) return;
        var hits = cands.filter(function(r){ var p = r.d.split("-"); return +p[1] === md.mo && +p[2] === md.day; });
        if (hits.length === 1 && !hasHl(key, hits[0])){
          assigned[key + "|" + hits[0].d] = it.link;
          out.push({ key: key, date: hits[0].d, url: it.link, opp: oppDisplayName(hits[0]) });
        }
        return;
      }
      var opps = {};
      cands.forEach(function(r){ opps[oppDisplayName(r)] = true; });
      if (Object.keys(opps).length > 1) return;
      var allFinals = [];
      rows.forEach(function(r){
        if (!r.result || isExhibition(r)) return;
        if (!hlTitleMatchesGame(title, de.name, oppDisplayName(r))) return;
        var diff = hlDaysBetween(r.d, it.pubDate);
        if (diff >= 0 && diff <= 3) allFinals.push(r);
      });
      allFinals.sort(function(a, b){ return a.d < b.d ? -1 : 1; });
      var g1 = /\bgame 1\b/.test(low), g2 = /\bgame 2\b/.test(low);
      if (g1 !== g2 && allFinals.length === 2){
        var target = allFinals[g1 ? 0 : 1];
        if (!hasHl(key, target)){
          assigned[key + "|" + target.d] = it.link;
          out.push({ key: key, date: target.d, url: it.link, opp: oppDisplayName(target) });
        }
        return;
      }
      if (!g1 && !g2 && allFinals.length === 1){
        var only = allFinals[0];
        if (!hasHl(key, only)){
          assigned[key + "|" + only.d] = it.link;
          out.push({ key: key, date: only.d, url: it.link, opp: oppDisplayName(only) });
        }
      }
    });
  });
  return out;
}
function parseHlRss(txt){
  var items = [];
  var entries = String(txt || "").split("<entry>");
  entries.shift();
  entries.forEach(function(en){
    var tm = en.match(/<title>([^<]*)<\/title>/);
    var pm = en.match(/<published>([^<]*)<\/published>/);
    var lm = en.match(/<link[^>]*href="([^"]*)"/);
    if (!tm || !pm || !lm) return;
    items.push({ title: decodeEntities(tm[1]), link: lm[1], pubDate: pm[1].slice(0, 10) });
  });
  return items;
}
function applyHlFills(){
  var changed = false;
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES) || {};
  Object.keys(hlFills).forEach(function(key){
    var rows = sched[key] || [];
    rows.forEach(function(r){
      if (r.hl) return;
      var fill = hlFills[key] && hlFills[key][r.d];
      if (!fill) return;
      var url = (typeof fill === "string") ? fill : fill.url;
      var opp = (fill && typeof fill === "object") ? fill.opp : null;
      if (url && (!opp || oppDisplayName(r) === opp)){ r.hl = url; changed = true; }
    });
  });
  return changed;
}
function fetchTeamHighlightsRSS(){
  try{
    if (typeof fetch !== "function") return Promise.resolve([]);
    if (Date.now() - hlFeedAt < HL_FEED_TTL) return Promise.resolve([]);
    hlFeedAt = Date.now();
    var feedUrl = (typeof HL_RSS_URL !== "undefined") ? HL_RSS_URL : "https://www.youtube.com/feeds/videos.xml?channel_id=UCPj2UHeB7pt90_RBTqYNJJA";
    return fetch(feedUrl).then(function(r){ return r.text(); }).then(function(txt){
      var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES) || {};
      var found = matchHighlightsFeed(parseHlRss(txt), sched);
      if (found.length){
        found.forEach(function(a){
          if (!hlFills[a.key]) hlFills[a.key] = {};
          hlFills[a.key][a.date] = { url: a.url, opp: a.opp };
        });
        save(HL_FILLS_KEY, hlFills);
        applyHlFills();
        if (currentView && currentView.kind === "team") showTeamView(currentView.key);
      }
      return found;
    }).catch(function(){ return []; });
  }catch(e){ return Promise.resolve([]); }
}
function teamGameHlTitle(short, row){
  var me = null, opp = "";
  try{ me = dirEntry(short); }catch(e){}
  try{ if (row.oppKey && dirEntry(row.oppKey)) opp = dirEntry(row.oppKey).name; }catch(e){}
  if (!opp) opp = row.opp || "";
  return "Highlights · " + (me ? me.name : short) + (row.ha === "H" ? " vs " : " at ") + opp + " (" + fmtDate(row.d) + ")";
}
function gameHighlightURL(homeKey, awayKey, dateISO){
  try{ applyHlFills(); }catch(e){}
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES) || {};
  var pairs = [];
  if (homeKey) pairs.push([homeKey, awayKey]);
  if (awayKey) pairs.push([awayKey, homeKey]);
  for (var i = 0; i < pairs.length; i++){
    var rows = sched[pairs[i][0]] || [];
    for (var j = 0; j < rows.length; j++){
      var r = rows[j];
      if (r.d === dateISO && r.oppKey === pairs[i][1] && r.hl) return { url: r.hl, title: teamGameHlTitle(pairs[i][0], r) };
    }
  }
  return null;
}
// v32.13: highlights open straight in YouTube — no in-app video window.
// YouTube app first via the bridge, else the external-browser bridge
// (Android chooser), else a new tab (in the app's WebView the chooser
// handles it via shouldOverrideUrlLoading). Back from YouTube returns
// to the app.
function playGameHighlight(url, title){
  var b = bridge();
  if (b && typeof b.openYouTube === "function"){ try{ b.openYouTube(url); return; }catch(e){} }
  if (b && typeof b.openExternalBrowser === "function"){ try{ b.openExternalBrowser(url); return; }catch(e){} }
  try{ window.open(url, "_blank"); }catch(e){}
}
function openTeamGameDetail(short, idx){
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[short]) || [];
  var r = sched[idx]; if (!r) return;
  var g = structuredToGeneric(short, r);
  var de = null; try{ de = dirEntry(short); }catch(e){}
  var ode = null; try{ if (r.oppKey) ode = dirEntry(r.oppKey); }catch(e){}
  var homeKey = (r.ha === "H") ? short : (r.oppKey || null);
  var awayKey = (r.ha === "H") ? (r.oppKey || null) : short;
  var homeName = (r.ha === "H") ? (de ? de.name : short) : (ode ? ode.name : g.oppName);
  var awayName = (r.ha === "H") ? (ode ? ode.name : g.oppName) : (de ? de.name : short);
  var liveInfo = liveGameInfo[short + "|" + r.d + "|" + (r.oppKey || "")] || null;
  if (homeKey === "MICH" || awayKey === "MICH"){
    var michOpp = (homeKey === "MICH") ? awayKey : homeKey;
    if (michOpp){
      for (var i = 0; i < GAMES.length; i++){
        if (GAMES[i].short === michOpp && GAMES[i].date === r.d){ openMichiganGameFromTicker(GAMES[i].n); return; }
      }
    }
  }
  showGameDetail({home: homeName, away: awayName,
    homeScore: (r.ha === "H") ? g.myScore : g.oppScore, awayScore: (r.ha === "H") ? g.oppScore : g.myScore,
    state: r.result ? "post" : "pre", clock: "", venue: liveInfo ? liveInfo.venue : "",
    homeKey: homeKey, awayKey: awayKey, boxUrl: r.box || null,
    ev: null, evId: null, dateISO: r.d, timeCT: r.timeCT || "", broadcasts: liveInfo ? liveInfo.broadcasts : []});
}
function espnAthleteLine(a, teamName){
  var name = (a && (a.displayName || a.name)) || "";
  if (!name) return null;
  var g = null, as = null, sv = null;
  (a.statistics || a.stats || []).forEach(function(s){
    var nm = String(s.name || s.displayName || s.abbreviation || "").toLowerCase();
    var v = (s.displayValue !== undefined) ? s.displayValue : s.value;
    if (v === undefined || v === null) return;
    if (nm.indexOf("goal") !== -1 && nm.indexOf("against") === -1 && g === null) g = v;
    else if (nm.indexOf("assist") !== -1 && as === null) as = v;
    else if (nm.indexOf("save") !== -1 && sv === null) sv = v;
  });
  var parts = [];
  if (g !== null) parts.push(g + ((String(g) === "1") ? " goal" : " goals"));
  if (as !== null) parts.push(as + ((String(as) === "1") ? " assist" : " assists"));
  if (sv !== null) parts.push(sv + ((String(sv) === "1") ? " save" : " saves"));
  return parts.length ? { team: teamName, text: name + " \u2014 " + parts.join(", ") } : null;
}
function parseEspnSummaryBoxscore(j){
  var lines = [];
  try{
    var players = (j && j.boxscore && j.boxscore.players) || (j && j.boxscore && j.boxscore.athletes) || [];
    players.forEach(function(p){
      var teamName = (p.team && (p.team.displayName || p.team.name)) || "";
      var grouped = false;
      (p.statistics || p.stats || []).forEach(function(s){
        (s.athletes || []).forEach(function(a){ grouped = true; var l = espnAthleteLine(a, teamName); if (l) lines.push(l); });
      });
      if (grouped) return;
      var flat = {displayName: (p.athlete && (p.athlete.displayName || p.athlete.name)) || p.displayName || p.name || "", statistics: p.statistics || p.stats || []};
      var l2 = espnAthleteLine(flat, teamName); if (l2) lines.push(l2);
    });
  }catch(e){}
  return lines;
}
// v32.23: ESPN publishes no player lines for men's college hockey, but the
// summary header DOES carry score-by-period. Render that instead of an
// empty tab. Dynamic length so OT periods show.
function parseEspnPeriodTable(j){
  try{
    var comps = (j && j.header && j.header.competitions) || [];
    if (!comps.length) return null;
    var rows = [];
    (comps[0].competitors || []).forEach(function(c){
      var per = (c.linescores || []).map(function(x){ var v = parseInt(x.displayValue, 10); return isNaN(v) ? 0 : v; });
      if (!per.length) return;
      var tot = 0; per.forEach(function(v){ tot += v; });
      rows.push({team: (c.team && (c.team.displayName || c.team.shortDisplayName)) || "", per: per, total: tot});
    });
    return rows.length ? rows : null;
  }catch(e){ return null; }
}
function espnPeriodTableHTML(rows){
  if (!rows) return "";
  var n = 0; rows.forEach(function(r){ if (r.per.length > n) n = r.per.length; });
  var html = '<div class="boxscore"><div class="box-title">BOX SCORE &middot; FINAL</div><table><tr><th></th>';
  for (var i = 0; i < n; i++) html += "<th>" + (i < 3 ? (i + 1) : (i === 3 ? "OT" : "OT" + (i - 2))) + "</th>";
  html += "<th>T</th></tr>";
  rows.forEach(function(r){
    html += "<tr><td>" + esc(r.team) + "</td>";
    for (var k = 0; k < n; k++) html += "<td>" + (k < r.per.length ? r.per[k] : "") + "</td>";
    html += "<td><b>" + r.total + "</b></td></tr>";
  });
  return html + "</table></div>";
}
// v32.6: box scores display directly — no tap-to-load button. A game
// detail panel has DETAILS and BOX SCORE tabs; the box score content
// fetches itself when the panel opens. Team-page games carry no event id,
// so the id is resolved from the ESPN team schedule feed (date + opponent
// match, never a guess) before the summary fetch.
var evIdCache = {};
var gdBoxEvId = null, gdBoxLive = false, gdBoxFailed = false, gdBoxUrl = null;
function todayISOlocal(){
  var d = new Date();
  var m = String(d.getMonth() + 1), day = String(d.getDate());
  if (m.length < 2) m = "0" + m;
  if (day.length < 2) day = "0" + day;
  return d.getFullYear() + "-" + m + "-" + day;
}
function feedTeamMatches(feedTeam, dirKey){
  if (!feedTeam || !dirKey) return false;
  var de = null; try{ de = dirEntry(dirKey); }catch(e){}
  if (!de) return false;
  var targets = [de.name, de.nick, dirKey].map(function(s){ try{ return normName(String(s || "")); }catch(e){ return ""; } }).filter(function(s){ return s.length >= 2; });
  var cands = [feedTeam.displayName, feedTeam.shortDisplayName, feedTeam.abbreviation].map(function(s){ try{ return normName(String(s || "")); }catch(e){ return ""; } }).filter(function(s){ return s.length >= 2; });
  for (var i = 0; i < cands.length; i++) for (var j = 0; j < targets.length; j++){
    if (cands[i] === targets[j]) return true;
    if (cands[i].length >= 4 && targets[j].length >= 4 && (cands[i].indexOf(targets[j]) === 0 || targets[j].indexOf(cands[i]) === 0)) return true;
  }
  return false;
}
function scheduleEventTeams(ev){
  var comps = (ev && ev.competitions) || [];
  if (!comps.length && ev && ev.competitors) comps = [{competitors: ev.competitors}];
  var out = [];
  comps.forEach(function(c){ (c.competitors || []).forEach(function(cp){ if (cp && cp.team) out.push(cp.team); }); });
  return out;
}
function scheduleEventState(ev){
  try{ return (ev.status && ev.status.type && ev.status.type.state) || (ev.status && ev.status.state) || ""; }catch(e){ return ""; }
}
function resolveEspnEventId(homeKey, awayKey, dateISO, cb){
  var cacheKey = (homeKey || "") + "|" + (awayKey || "") + "|" + (dateISO || "");
  if (Object.prototype.hasOwnProperty.call(evIdCache, cacheKey)){ cb(evIdCache[cacheKey]); return; }
  var done = function(found){ if (found) evIdCache[cacheKey] = found; cb(found || null); };
  if (!dateISO || !homeKey || !awayKey){ done(null); return; }
  var feedKeys = [];
  try{
    var he = dirEntry(homeKey), ae = dirEntry(awayKey);
    if (he && he.espn) feedKeys.push(homeKey);
    if (ae && ae.espn) feedKeys.push(awayKey);
  }catch(e){}
  if (!feedKeys.length || typeof fetch !== "function"){ done(null); return; }
  var finished = false;
  var finish = function(v){ if (!finished){ finished = true; done(v); } };
  var tryIdx = 0;
  var tryNext = function(){
    if (tryIdx >= feedKeys.length){ finish(null); return; }
    var fetchKey = feedKeys[tryIdx++], otherKey = (fetchKey === homeKey) ? awayKey : homeKey;
    var url = null; try{ url = espnTeamURL(fetchKey, "schedule"); }catch(e){}
    if (!url){ tryNext(); return; }
    var ctl = null;
    try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(err){} }, 15000); }catch(err){}
    var opts = {}; if (ctl) opts.signal = ctl.signal;
    fetch(url, opts).then(function(r){ return r.json(); }).then(function(j){
      var events = (j && j.events) || [];
      for (var i = 0; i < events.length; i++){
        var ev = events[i];
        var evDate = ""; try{ evDate = feedCentralDate(ev.date); }catch(e){}
        if (evDate !== dateISO) continue;
        var teams = scheduleEventTeams(ev);
        var otherOK = false, fetchOK = false;
        teams.forEach(function(t){ if (feedTeamMatches(t, otherKey)) otherOK = true; if (feedTeamMatches(t, fetchKey)) fetchOK = true; });
        if (otherOK && fetchOK && ev.id){ finish({evId: ev.id, state: scheduleEventState(ev)}); return; }
      }
      tryNext();
    }).catch(function(){ tryNext(); });
  };
  tryNext();
}
function kickoffBoxscore(o){
  var box = o.elId ? document.getElementById(o.elId) : null; if (!box) return;
  var noteAfter = '<div class="tv-line">Box score posts here after the game goes final.</div>';
  var noteNone = '<div class="tv-line">No ESPN box score found for this game yet.</div>';
  var linkHTML = o.boxUrl ? '<div class="tv-line"><a href="' + esc(o.boxUrl) + '">Official box score</a></div>' : "";
  if (o.evId){
    if (o.state === "pre"){ box.innerHTML = noteAfter; return; }
    gdBoxEvId = o.evId; gdBoxLive = (o.state === "in"); gdBoxFailed = false; gdBoxUrl = o.boxUrl || null;
    box.innerHTML = '<div class="tv-line">Loading box score…</div>';
    fetchEspnSummaryBoxscore(o.evId, o.elId, {boxUrl: o.boxUrl, periods: o.periods !== false});
    return;
  }
  if (o.dateISO && o.dateISO > todayISOlocal()){ box.innerHTML = noteAfter; return; }
  if (!o.homeKey && !o.awayKey){ box.innerHTML = noteNone + linkHTML; gdBoxFailed = true; return; }
  box.innerHTML = '<div class="tv-line">Loading box score…</div>';
  resolveEspnEventId(o.homeKey, o.awayKey, o.dateISO, function(found){
    var b2 = o.elId ? document.getElementById(o.elId) : null; if (!b2) return;
    if (!found || !found.evId){ b2.innerHTML = noteNone + linkHTML; gdBoxFailed = true; return; }
    if (found.state === "pre"){ b2.innerHTML = noteAfter; return; }
    gdBoxEvId = found.evId; gdBoxLive = (found.state === "in"); gdBoxFailed = false; gdBoxUrl = o.boxUrl || null;
    fetchEspnSummaryBoxscore(found.evId, o.elId, {boxUrl: o.boxUrl, periods: o.periods !== false});
  });
}
function maybeFetchMichBoxscore(g){
  var elId = "mich-boxscore-lines-" + g.n;
  var box = document.getElementById(elId); if (!box) return;
  if (g.status === "final" || (g.date && g.date <= todayISOlocal())){
    kickoffBoxscore({evId: null, state: null, homeKey: "MICH", awayKey: g.short, dateISO: g.date, elId: elId});
  }
}
function fetchEspnSummaryBoxscore(evId, elId, opts){
  var box = $(elId ? ("#" + elId) : "#gd-boxscore-lines"); if (!box) return;
  opts = opts || {};
  if (typeof fetch !== "function"){ box.innerHTML = '<div class="tv-line">Box score cannot be fetched right now (offline).</div>'; gdBoxFailed = true; return; }
  var url = "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/summary?event=" + encodeURIComponent(String(evId));
  var ctl = null;
  try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(err){} }, 15000); }catch(err){}
  var fopts = {}; if (ctl) fopts.signal = ctl.signal;
  fetch(url, fopts).then(function(r){ return r.json(); }).then(function(j){
    var html = "";
    var table = (opts.periods !== false) ? parseEspnPeriodTable(j) : null;
    if (table) html += espnPeriodTableHTML(table);
    var lines = parseEspnSummaryBoxscore(j);
    if (lines.length){
      lines.forEach(function(l){ html += '<div class="tv-line">' + esc(l.text) + (l.team ? ' <span class="tv-news-meta">' + esc(l.team) + '</span>' : '') + "</div>"; });
      gdBoxFailed = false;
    } else {
      html += '<div class="tv-line">ESPN publishes no player lines for men\u2019s college hockey games.</div>';
      gdBoxFailed = true;
    }
    if (opts.boxUrl) html += '<div class="tv-line"><a href="' + esc(opts.boxUrl) + '">Official box score</a></div>';
    if (!table && !lines.length && !opts.boxUrl) html = '<div class="tv-line">The ESPN summary feed did not include a box score for this game.</div>';
    box.innerHTML = html;
  }).catch(function(){
    box.innerHTML = '<div class="tv-line">Box score could not be fetched right now.</div>';
    gdBoxFailed = true;
  });
}

function fetchHighlightsRSS(){
  try{
    if (typeof fetch !== "function") return;
    fetch(HL_RSS_URL).then(function(r){ return r.text(); }).then(function(txt){
      var changed = false;
      var entries = txt.split("<entry>");
      entries.shift();
      entries.forEach(function(en){
        var tm = en.match(/<title>([^<]*)<\/title>/);
        var pm = en.match(/<published>([^<]*)<\/published>/);
        var lm = en.match(/<link[^>]*href="([^"]*)"/);
        if (!tm || !pm || !lm) return;
        var title = tm[1].toLowerCase();
        var pubDate = pm[1].slice(0, 10);
        // v21 whole-word rule: both teams must appear as whole words
        // (see rssTitleMatchesMichiganGame). Window stays 0-3 days.
        var cands = [];
        GAMES.forEach(function(g){
          if (g.status !== "final" || g.highlights || rssHighlights[g.n]) return;
          if (!rssTitleMatchesMichiganGame(title, g.opp)) return;
          var diff = daysBetween(g.date, pubDate);
          if (diff >= 0 && diff <= 3) cands.push({g:g, diff:diff});
        });
        if (cands.length){
          // v32: NEVER guess. A title naming an exhibition never
          // matches. A dated title must pin exactly one game, and a
          // title carrying a date that matches no candidate is
          // skipped, never fallen through to the dateless rule. A
          // dateless title assigns only when exactly one final for
          // that opponent exists in the window COUNTING games that
          // already have highlights. "game 1"/"game 2" assigns only
          // when the weekend pair is known and the target slot is
          // still open. Anything else: no button ("not posted yet").
          if (/\bexhibition\b/.test(title)) return;
          var g1 = /\bgame 1\b/.test(title), g2 = /\bgame 2\b/.test(title);
          var hasDate = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/.test(title) || /\b\d{1,2}\/\d{1,2}\b/.test(title);
          var dated = rssTitleDateMatch(title, cands);
          if (hasDate){
            if (dated && dated.length === 1){ rssHighlights[dated[0].g.n] = lm[1]; changed = true; }
            return;
          }
          var opps = {};
          cands.forEach(function(c){ opps[c.g.opp] = true; });
          if (Object.keys(opps).length > 1) return; // compilation or multi-team title: ambiguous
          var allFinals = [];
          GAMES.forEach(function(g){
            if (g.status !== "final") return;
            if (!rssTitleMatchesMichiganGame(title, g.opp)) return;
            var diff = daysBetween(g.date, pubDate);
            if (diff >= 0 && diff <= 3) allFinals.push(g);
          });
          allFinals.sort(function(a, b){ return a.date < b.date ? -1 : 1; });
          if (g1 !== g2 && allFinals.length === 2){
            var target = allFinals[g1 ? 0 : 1];
            if (!target.highlights && !rssHighlights[target.n]){ rssHighlights[target.n] = lm[1]; changed = true; }
            return;
          }
          if (!g1 && !g2 && allFinals.length === 1){
            var only = allFinals[0];
            if (!only.highlights && !rssHighlights[only.n]){ rssHighlights[only.n] = lm[1]; changed = true; }
          }
        }
      });
      if (changed){
        GAMES.forEach(function(g){
          var d = $("#details-" + g.n);
          if (d) refreshDetails(g.n);
        });
      }
    }).catch(function(){ /* feed unreachable: keep bundled state */ });
  }catch(e){ /* never break the app on a feed failure */ }
}
function daysBetween(a, b){
  function t(iso){ var p = iso.split("-"); return Date.UTC(+p[0], +p[1]-1, +p[2]); }
  return Math.round((t(b) - t(a)) / 86400000);
}

// ---------- live ----------
var liveSeen = load("liveSeen", {}); // date -> michigan goals last seen
// v13: signature of the last live game row actually rendered, so a live
// tick whose displayed values are unchanged skips the full 34-row
// re-render (identical output, less work, open details survive the tick).
var lastLiveRenderSig = null;
// v8 live-update rule: every data surface refreshes on the live cadence
// during games and periodically otherwise, from live sources only — never
// simulated. Every live surface shows its last-updated stamp; data that
// cannot be live-refreshed shows the latest verified data WITH its stamp
// and an honest note, never presented as current live data.
var lastLiveTickAt = 0;
var livePref = load("livePref", "live"); // "live" (uniform 30s in-app poll) | "manual"
if (livePref === "saver"){ livePref = "live"; try{ save("livePref", livePref); }catch(e){} } // v18: saver retired — old installs migrate to the uniform 30s poll
var liveTimer = null;
var accelTimer = null;
function applyLivePref(){
  try{ if (liveTimer) clearInterval(liveTimer); }catch(e){}
  try{ if (accelTimer) clearInterval(accelTimer); }catch(e){}
  liveTimer = null;
  accelTimer = null;
  if (livePref !== "manual"){
    liveTimer = setInterval(liveTick, 30000); // v18: uniform 30s in-app poll — no saver path, no 60s timer
    accelTimer = setInterval(runEspnAccelTick, 15 * 60 * 1000);
  }
}
function setLivePref(v){
  livePref = v; save("livePref", livePref);
  applyLivePref();
  if (v !== "manual") liveTick();
}
var liveTickCount = 0;
// v32.30 live-feed resilience: consecutive board failures schedule one
// backoff retry (5s, then 15s, then 30s) instead of waiting silently for
// the next 30s tick, and the failure is labeled on screen — never a
// stale stamp with no note. Saved data stays labeled last-known only;
// nothing is invented. A fresh feed resets the streak and cancels any
// pending retry. Retries are extra attempts alongside the regular tick,
// never a replacement for it.
var liveFailStreak = 0;
var liveRetryTimer = null;
var liveRetryDelays = [5000, 15000, 30000];
function liveBoardFailed(){
  liveFailStreak++;
  try{
    var ts = $("#ticker-stamp");
    if (ts) ts.textContent = "Live feed unavailable — retrying automatically; saved scores shown as last-known.";
    var nb = document.getElementById("neutral-live-board");
    if (nb && /Loading the NCAA scoreboard/.test(nb.innerHTML)) nb.innerHTML = '<div class="tv-note">League scores unavailable — the ESPN scoreboard feed could not be reached. Saved scores are shown as last-known; this retries automatically.</div>';
  }catch(e){}
  try{
    if (liveRetryTimer) return;
    var d = liveRetryDelays[Math.min(liveFailStreak - 1, liveRetryDelays.length - 1)];
    liveRetryTimer = setTimeout(function(){ liveRetryTimer = null; try{ refreshLiveBoard(true); }catch(e){} }, d);
  }catch(e){}
}
function liveBoardOk(){
  liveFailStreak = 0;
  try{ if (liveRetryTimer){ clearTimeout(liveRetryTimer); liveRetryTimer = null; } }catch(e){}
}
// v32.30: the 30s interval must never silently die. If ticks ran before
// and then stopped for 90s, restart the cadence and tick now. The
// lastLiveTickAt > 0 guard means a never-booted page never fires this;
// only a previously-live loop that went quiet is restarted. Called
// every second from tickCountdowns; cheap and idempotent.
function liveWatchdog(){
  try{
    if (livePref === "manual") return;
    if (lastLiveTickAt > 0 && Date.now() - lastLiveTickAt > 90000){ applyLivePref(); liveTick(); }
  }catch(e){}
}
function liveTick(){
  lastLiveTickAt = Date.now();
  liveTickCount++;
  if (liveTickCount % 60 === 0){ try{ refreshMichiganScheduleFeed(); }catch(e){} }
  var today = new Date();
  var iso = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
  try{ if (currentTeamKey){ renderTeamLive(currentTeamKey); refreshTeamLiveRecord(currentTeamKey, true); refreshOpenTeamRanks(); refreshTeamNews(currentTeamKey); } refreshLiveBoard(true); }catch(e){}
  try{
    refreshConfStamp();
    try{ refreshRankings(); }catch(e){} // v18: uniform 30s poll — rankings re-checked every cycle, no 15-min gate
  }catch(e){}
  var g = null;
  GAMES.forEach(function(x){ if (x.date === iso && x.status === "upcoming") g = x; });
  if (!g){
    var ns = $("#mich-live-stamp");
    if (ns) ns.textContent = "No live Michigan game today — schedule verified.";
    return;
  }
  var yyyymmdd = iso.replace(/-/g, "");
  var url = "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard?dates=" + yyyymmdd;
  var ctl = null;
  try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(e){} }, 10000); }catch(e){}
  var opts = {};
  if (ctl) opts.signal = ctl.signal;
  if (typeof fetch !== "function"){
    var nf = $("#mich-live-stamp");
    if (nf) nf.textContent = "Live data needs network access, which is unavailable in this view. The app\'s saved data is shown.";
    return;
  }
  fetch(url, opts).then(function(r){ return r.json(); }).then(function(j){
    var ok = $("#mich-live-stamp");
    if (ok) ok.textContent = "Live data updated " + new Date().toLocaleTimeString() + " — scores from the ESPN live feed; schedule verified.";
    var ev = null;
    (j.events || []).forEach(function(e){
      if (!isD1MensEvent(e)) return;
      var names = (e.competitions && e.competitions[0] && e.competitions[0].competitors) || [];
      var isMich = names.some(function(c){ return c.team && isMichiganTeam(c.team); });
      if (isMich) ev = e;
    });
    if (!ev) return;
    if (LIVE_ESPN_GAME_IDS[g.n] !== ev.id){ LIVE_ESPN_GAME_IDS[g.n] = ev.id; try{ refreshDetails(g.n); }catch(e){} }
    var comp = ev.competitions[0];
    var state = ev.status && ev.status.type ? ev.status.type.state : "";
    var michC = null, oppC = null;
    comp.competitors.forEach(function(c){
      if (isMichiganTeam(c.team)) michC = c;
      else oppC = c;
    });
    if (!michC) return;
    var ms = parseInt(michC.score, 10), os = oppC ? parseInt(oppC.score, 10) : NaN;
    if (isNaN(ms) || isNaN(os)) return;
    if (state === "post"){
      if (!notifiedFinal[iso]){
        notifiedFinal[iso] = true; save("notifiedFinal", notifiedFinal);
        notifyNow("FINAL \u2014 Michigan " + ms + "-" + os, "Michigan vs " + g.opp + " is final.");
      }
      return;
    }
    if (state !== "in") return;
    var prev = liveSeen[iso];
    var isNew = (prev !== undefined && ms > prev);
    liveSeen[iso] = ms;
    save("liveSeen", liveSeen);
    g.live = true; g.mich = ms; g.oppScore = os;
    g.periodLabel = (ev.status && ev.status.displayClock ? ev.status.displayClock + " " : "") + (ev.status && ev.status.period ? "P" + ev.status.period : "");
    if (oppC && oppC.team && oppC.team.logo) g.oppLogo = oppC.team.logo;
    var liveSig = g.mich + "|" + g.oppScore + "|" + g.live + "|" + (g.periodLabel || "") + "|" + (g.oppLogo || "");
    if (liveSig !== lastLiveRenderSig){ lastLiveRenderSig = liveSig; renderGames(); }
    if (isNew){ playGoalCall("MICH", ev.id); notifyNow("GOAL \u2014 Michigan " + ms + "-" + os, "Michigan scores vs " + g.opp + "."); }
  }).catch(function(){
    var fl = $("#mich-live-stamp");
    if (fl) fl.textContent = "Live feed unavailable — showing verified schedule data.";
  });
}

// ---------- conference views (v8) ----------
// 2026-27 alignment from published sources (conference sites + USCHO):
// Big Ten (7), NCHC (10), Hockey East (11), ECAC (12), CCHA (8), Atlantic
// Hockey America (9), Independents (6) = 63. St. Thomas joined the NCHC
// on July 1, 2026 (10th member, per NCHC + CCHA announcements); CCHA is
// an eight-team league with Augustana full-time from 2025-26. Mercyhurst dropped its
// program after 2025-26 and is absent; Maryville joined and is listed as
// Independent. Membership is read from DIRECTORY (the verified table),
// never hard-coded here, so the view cannot drift from the directory.
var CONF_SITES = {
  "Big Ten": "https://bigten.org/sports/mens-ice-hockey",
  "NCHC": "https://nchchockey.com",
  "Hockey East": "https://hockeyeastonline.com",
  "ECAC": "https://ecachockey.com",
  "CCHA": "https://ccha.com",
  "AHA": "https://atlantichockeyamerica.com",
  "Independent": null
};
function confMembers(conf){
  return DIRECTORY.filter(function(d){ return d.conf === conf; }).sort(function(a, b){ return a.name < b.name ? -1 : 1; });
}
function confRecord(key){
  try{
    var poll = null;
    (USCHO_POLL || []).forEach(function(r){ if (r.key === key) poll = r; });
    if (poll && poll.rec) return fmtPollRec(poll.rec);
    var t = TEAMS[key];
    if (t && t.record) return t.record;
  }catch(e){}
  return null;
}
function confStandingsHTML(conf){
  var members = confMembers(conf);
  var rows = members.map(function(d){
    var rec = confRecord(d.key);
    var src = null;
    if (typeof USCHO_POLL !== "undefined") USCHO_POLL.forEach(function(x){ if (x.key === d.key) src = "poll"; });
    if (!src && typeof TEAMS !== "undefined" && TEAMS[d.key]) src = "saved";
    var wp = null;
    if (rec){
      var m = String(rec).match(/(\d+)[-–](\d+)(?:[-–](\d+))?/);
      if (m){ var w = +m[1], l = +m[2], t = m[3] ? +m[3] : 0; wp = (w + t * 0.5) / Math.max(1, w + l + t); }
    }
    return {d: d, rec: rec, wp: wp, src: src};
  });
  rows.sort(function(a, b){ return (b.wp === null ? -1 : b.wp) - (a.wp === null ? -1 : a.wp); });
  var html = '<div class="tv-sec"><div class="tv-title">STANDINGS</div>';
  var any = rows.some(function(r){ return r.rec; });
  if (!any){
    html += '<div class="tv-note">No member records are published in this app\'s sources for this conference. See the conference\'s official site for the full standings table.</div>';
  } else {
    html += '<table class="tv-roster"><tr><th>Team</th><th>Record</th></tr>';
    rows.forEach(function(r){
      html += '<tr><td><span class="team-name-btn" data-team="' + esc(r.d.key) + '" role="button" tabindex="0">' + esc(r.d.name) + " " + esc(r.d.nick) + "</span></td><td>" + (r.rec ? esc(r.rec) : "—") + "</td></tr>";
    });
    html += "</table>";
    if (rows.some(function(r){ return r.src === "poll"; })) html += '<div class="tv-note">Conference record — poll ' + esc(POLL_META.date) + "</div>";
    if (rows.some(function(r){ return r.src === "saved"; })) html += '<div class="tv-note">Conference record — saved Oct 24, 2026</div>';
    html += '<div class="tv-note">Records from published sources (USCHO poll + team records), sorted by win percentage where computable. The full official conference table publishes on the conference\'s official site.</div>';
  }
  html += "</div>";
  return html;
}
function confNewsHTML(conf){
  var items = [];
  confMembers(conf).forEach(function(d){
    var t = TEAMS[d.key];
    (t && t.news ? t.news : []).forEach(function(n){ items.push({team: d.name, title: n.t, url: n.u, d: n.d}); });
  });
  var html = '<div class="tv-sec"><div class="tv-title">NEWS</div>';
  if (!items.length){
    html += '<div class="tv-note">No published news items are included for this conference\'s teams. See the conference\'s official site for the latest news.</div>';
  } else {
    items.forEach(function(n){
      html += '<div class="tv-line"><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.title) + "</a> <span class=\"tv-note\">(" + esc(n.team) + (n.d ? ", " + esc(n.d) : "") + ")</span></div>";
    });
    html += '<div class="tv-note">Real published items, linked to their sources. Items carry their publish dates. News not live-refreshed — saved Oct 24, 2026.</div>';
  }
  html += "</div>";
  return html;
}
function confLeadersHTML(conf){
  var html = '<div class="tv-sec"><div class="tv-title">STATS &amp; LEADERS</div>';
  var any = false;
  confMembers(conf).forEach(function(d){
    var t = TEAMS[d.key];
    if (t && t.leaders && t.leaders.length){
      any = true;
      html += '<div class="tv-sub">' + esc(d.name) + " " + esc(d.nick) + "</div>";
      t.leaders.forEach(function(l){ html += '<div class="tv-line">' + esc(l) + "</div>"; });
    }
  });
  if (!any) html += '<div class="tv-note">Conference-wide leaders are not published in this app\'s sources. See the conference\'s official site for the full stats board.</div>';
  html += "</div>";
  return html;
}
function confViewHTML(conf){
  var members = confMembers(conf);
  var site = CONF_SITES[conf];
  var html = '<div class="conf-view">';
  html += '<div class="tv-head"><div class="tv-name">' + esc(conf) + "</div>";
  html += '<div class="tv-meta">' + members.length + " member teams · 2026-27 NCAA Division I men\'s hockey</div></div>";
  if (site) html += '<div class="tv-sec"><div class="tv-line">Official site: <a href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(site) + "</a></div></div>";
  else html += '<div class="tv-sec"><div class="tv-line">Independents have no conference office or standings. Each team\'s official site is linked from its team view.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">MEMBER TEAMS</div>';
  members.forEach(function(d){
    var rec = confRecord(d.key);
    html += '<div class="dir-row" data-dir-team="' + esc(d.key) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(d.key), d.key) + teamLogoImg(d, "dir-logo") +
      '<span class="dir-name">' + esc(d.name) + " " + esc(d.nick) + "</span>" +
      '<span class="dir-meta">' + esc(d.city) + (rec ? " · " + esc(rec) : "") + (d.titles.length ? " · " + d.titles.length + "&times; champs" : "") + "</span></div>";
  });
  html += "</div>";
  html += confStandingsHTML(conf);
  html += confLeadersHTML(conf);
  html += confNewsHTML(conf);
  html += '<div class="tv-sec"><div class="tv-title">DATA</div>';
  html += '<div class="tv-line">Conference alignment verified for 2026-27: 63 Division I men\'s programs. Mercyhurst dropped its program after 2025-26; Maryville joined (Independent).</div>';
  html += '<div class="tv-note" id="conf-stamp">Conference data as saved; live refresh updates this stamp on the live cadence.</div></div>';
  html += "</div>";
  return html;
}
function showConfView(conf, push){
  var cv = $("#confview"), mv = $("#michview"), tv = $("#teamview"), pv = $("#playerview");
  if (!cv || !mv || !tv || !pv) return;
  if (push !== false && !(currentView.kind === "conf" && currentView.conf === conf)) pushNav();
  currentView = {kind: "conf", conf: conf};
  currentTeamKey = null;
  cv.innerHTML = confViewHTML(conf);
  cv.hidden = false; mv.hidden = true; tv.hidden = true; pv.hidden = true;
  var sv2 = $("#settingsview"); if (sv2) sv2.hidden = true;
  var fh1 = $("#favhomeview"); if (fh1) fh1.hidden = true;
  var bv1 = $("#bracketview"); if (bv1) bv1.hidden = true;
  var sev1 = $("#searchview"); if (sev1) sev1.hidden = true;
  var nev1 = $("#neutralview"); if (nev1) nev1.hidden = true;
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ window.scrollTo(0, 0); }catch(e){}
  $$("[data-dir-team]", cv).forEach(function(b){ b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-dir-team")); }); });
  $$("[data-team]", cv).forEach(function(b){
    if (b.getAttribute("data-team-bound")) return;
    b.setAttribute("data-team-bound", "1");
    b.addEventListener("click", function(ev){ ev.stopPropagation(); teamZoomTo(b.getAttribute("data-team")); });
  });
  refreshConfStamp();
}
function refreshConfStamp(){
  var s = $("#conf-stamp");
  if (s && $("#confview") && !$("#confview").hidden){
    s.textContent = "Live data refreshed " + new Date().toLocaleTimeString() + " — member records refresh from published sources; news carries publish dates.";
  }
}

// ---------- settings tab (v8) ----------
// Donations destinations (v8): three ways to support. Cash App + Bitcoin
// via Cash App both point at the user's own $Cashtag page, supplied by
// him verbatim — Bitcoin is accepted THROUGH Cash App to that $Cashtag,
// and no separate on-chain address is invented. PayPal is configurable:
// set PAYPAL_LINK only to a link the user supplies; empty means the row
// honestly says coming soon, never a guessed PayPal.me address or a
// stranger's page. Change ONLY these constants, never guess a link.
var DONATION_LINK = "https://cash.app/$SABRETOOTH1679";
// PayPal destination: decoded locally from the QR code the user
// provided. Display rule: NEVER show the QR account-holder name in the
// app — the row is labeled generically. Only if some UI element ever
// REQUIRES a name would "Victor Creed" be used there; none does.
var PAYPAL_LINK = "https://www.paypal.com/qrcodes/p2pqrc/EFBJU7K3L8KHU"; // kept per Victor 2026-10-26 explicit choice: send link; senders see his display name, no account access via the link
function donationsRowHTML(){
  var html = '<div class="tv-line">Cash App: <a href="' + esc(DONATION_LINK) + '" target="_blank" rel="noopener">Buy me a coffee — Cash App</a></div>';
  html += '<div class="tv-line">Bitcoin (via Cash App): <a href="' + esc(DONATION_LINK) + '" target="_blank" rel="noopener">Send Bitcoin via Cash App to $SABRETOOTH1679</a></div>';
  html += '<div class="tv-note">Bitcoin is accepted through Cash App — senders can send Bitcoin via Cash App to that $Cashtag. No separate on-chain Bitcoin address is listed.</div>';
  if (PAYPAL_LINK) html += '<div class="tv-line">PayPal: <a href="' + esc(PAYPAL_LINK) + '" target="_blank" rel="noopener">Donate via PayPal</a></div><div class="tv-note">Opens externally on the app owner\'s PayPal page.</div>';
  else html += '<div class="tv-line">PayPal</div><div class="tv-note">PayPal link coming soon — no PayPal page is set up yet, so no link is shown rather than a guessed one.</div>';
  return html;
}
function livePrefLabel(){ return livePref === "manual" ? "Manual only" : "Live (every 30s)"; }
// v16: the APP ICON note always names the current icon team and states the
// launcher-refresh step plainly, so a user who picks a team and sees no change
// knows exactly what to do (force-stop + reopen) instead of assuming it failed.
function iconNoteHTML(){
  var mode = getIconMode();
  var eff = getEffectiveIconTeam();
  var enm = "NCAAH puck";
  if (eff !== "DEFAULT"){ var ed = dirEntry(eff); if (ed) enm = ed.name + " " + ed.nick; }
  var refresh = " If the home-screen icon hasn't changed after picking, force-stop the app and reopen it — some launchers only refresh the icon then.";
  if (mode === "fixed"){
    if (eff === "DEFAULT") return "Current icon: NCAAH puck (Fixed default — stays the puck even when favorites change). Pick Follow favorite to let the icon follow your favorites again, or pick any team below for a fixed team icon." + refresh;
    return "Current icon: " + esc(enm) + " (Fixed — stays even when favorites change). Pick Follow favorite to let the icon follow your favorites again, or pick another icon below." + refresh;
  }
  if (getRecentFavorite()) return "Current icon: " + esc(enm) + " (Follow favorite — changes when you pick a different favorite). Pick Default puck or any team below for a fixed icon that favorites can't change." + refresh;
  return "Current icon: NCAAH puck (Follow favorite — no favorites picked yet, so the puck shows until you pick one). Pick Default puck or any team below for a fixed icon." + refresh;
}
// v32.13: default-browser picker options. Ask every time is the default;
// the list comes from the installed app via the bridge. Without a bridge
// (browser test copy) only Ask every time shows.
function browserOptionsHTML(){
  var cur = "";
  try{ var g = bridgeCall("getDefaultBrowser", []); if (typeof g === "string") cur = g; }catch(e){}
  var opts = '<option value=""' + (cur === "" ? ' selected' : '') + '>Ask every time</option>';
  try{
    var raw = bridgeCall("listBrowsers", []);
    var list = (typeof raw === "string" && raw) ? JSON.parse(raw) : [];
    list.forEach(function(b){
      if (!b || !b.pkg) return;
      opts += '<option value="' + esc(b.pkg) + '"' + (cur === b.pkg ? ' selected' : '') + '>' + esc(b.label || b.pkg) + '</option>';
    });
  }catch(e){}
  return opts;
}
// v32.14: signed patch updates. Status comes from the native bridge;
// without a bridge (browser test copy) the section reports built-in only.
function updateStatusObj(){
  try{
    var raw = bridgeCall("getUpdateStatus", []);
    if (typeof raw === "string" && raw) return JSON.parse(raw);
  }catch(e){}
  return {configured:false, channel:"stable", applied:"", pending:"", apk_version:"", apk_versionCode:0, apk_size:0, status:"not_configured", error:""};
}
// v32.35: session-optimistic channel — set the moment the user taps a
// channel button, so the section re-renders with the picked channel at
// once. The native side stores the same value in setUpdateChannel, so
// the next bridge status read agrees; this only removes the lag.
var updateChannelPicked = "";
function effectiveUpdateChannel(st){
  if (updateChannelPicked) return updateChannelPicked;
  if (!st) st = updateStatusObj();
  return (st && st.channel === "test") ? "test" : "stable";
}
window.__vmaxTest.effectiveUpdateChannel = effectiveUpdateChannel;
function fmtUpdateSize(n){
  n = Number(n) || 0;
  if (n <= 0) return "";
  if (n < 1048576) return Math.round(n / 1024) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}
function updateSectionHTML(){
  var st = updateStatusObj();
  var html = '<div class="tv-title">UPDATES</div>';
  html += '<div class="tv-line" id="st-update-running">Running: NCAAD1MH v32.35 (1.66) — built-in files</div>';
  var ch = effectiveUpdateChannel(st);
  html += '<div class="tv-line">Update channel: <button class="tv-back" data-update-channel="stable" type="button" aria-pressed="' + (ch === "stable" ? "true" : "false") + '">Stable</button> <button class="tv-back" data-update-channel="test" type="button" aria-pressed="' + (ch === "test" ? "true" : "false") + '">Test</button> (current: ' + esc(ch) + (ch === "test" ? " — test builds only, switch back to Stable when done" : "") + ')</div>';
  if (!st.configured) html += '<div class="tv-line" id="st-update-status">Updates are not set up yet — this build runs its built-in files.</div>';
  else if (st.status === "checking") html += '<div class="tv-line" id="st-update-status">Checking for updates…</div>';
  else if (st.status === "update_available") html += '<div class="tv-line" id="st-update-status">Update ' + esc(st.apk_version) + ' is available (' + fmtUpdateSize(st.apk_size) + '). Nothing is downloaded until you tap Download.</div><button class="tv-back" id="st-update-download" type="button">Download update</button> <button class="tv-back" id="st-update-remove" type="button">Dismiss update</button>';
  else if (st.status === "downloading") html += '<div class="tv-line" id="st-update-status">Downloading update ' + esc(st.apk_version) + '…</div>';
  else if (st.status === "apk_ready") html += '<div class="tv-line" id="st-update-status">Update ' + esc(st.apk_version) + ' downloaded and verified — ready to install. The system installer runs it; install only accepts an update signed with the same key as this app.</div><button class="tv-back" id="st-update-install" type="button">Install update</button> <button class="tv-back" id="st-update-remove" type="button">Remove downloaded update</button>';
  else if (st.status === "installing") html += '<div class="tv-line" id="st-update-status">Installer opened — finish the install there. The app restarts on the new version.</div>';
  else if (st.status === "need_install_permission") html += '<div class="tv-line" id="st-update-status">Install permission needed: allow this app to install apps, then tap Install update again.</div><button class="tv-back" id="st-update-permission" type="button">Open install settings</button> <button class="tv-back" id="st-update-install" type="button">Install update</button>';
  else if (st.status === "error") html += '<div class="tv-line" id="st-update-status">Last update step failed' + (st.error ? ' (' + esc(st.error) + ')' : '') + '. Built-in files are running.</div><button class="tv-back" id="st-update-check" type="button">Check for updates</button>';
  else html += '<div class="tv-line" id="st-update-status">Built-in files are running — no update waiting.</div><button class="tv-back" id="st-update-check" type="button">Check for updates</button>';
  html += '<div class="tv-note">Updates are full app installs: the app downloads the new version, checks its signature and file hash first, and hands it to the system installer. Nothing unverified ever installs. Test channel pulls test builds only — switch back to Stable when you are done testing.</div>';
  return html;
}
function refreshUpdateSection(){
  var w = document.getElementById("st-update-sec");
  if (!w) return;
  w.innerHTML = updateSectionHTML();
  bindUpdateButtons();
}
function startUpdatePoll(){
  try{
    if (window.__vmaxUpdatePoll) clearInterval(window.__vmaxUpdatePoll);
    var n = 0;
    window.__vmaxUpdatePoll = setInterval(function(){
      n++;
      var st = updateStatusObj();
      refreshUpdateSection();
      if (!st || (st.status !== "checking" && st.status !== "downloading") || n >= 90) { clearInterval(window.__vmaxUpdatePoll); window.__vmaxUpdatePoll = null; }
    }, 2000);
  }catch(e){}
}
function bindUpdateButtons(){
  var chk = document.getElementById("st-update-check");
  if (chk) chk.addEventListener("click", function(){
    bridgeCall("checkForUpdate", []);
    startUpdatePoll();
    refreshUpdateSection();
  });
  var dl = document.getElementById("st-update-download");
  if (dl) dl.addEventListener("click", function(){
    bridgeCall("downloadUpdate", []);
    startUpdatePoll();
    refreshUpdateSection();
  });
  var inst = document.getElementById("st-update-install");
  if (inst) inst.addEventListener("click", function(){
    bridgeCall("installUpdate", []);
    refreshUpdateSection();
  });
  var perm = document.getElementById("st-update-permission");
  if (perm) perm.addEventListener("click", function(){ bridgeCall("openInstallPermissionSettings", []); });
  var rm = document.getElementById("st-update-remove");
  if (rm) rm.addEventListener("click", function(){ bridgeCall("removePatch", []); refreshUpdateSection(); });
  var chBtns = document.querySelectorAll("[data-update-channel]");
  for (var i = 0; i < chBtns.length; i++) (function(b){
    b.addEventListener("click", function(){
      var picked = b.getAttribute("data-update-channel");
      updateChannelPicked = picked;
      bridgeCall("setUpdateChannel", [picked]);
      bridgeCall("checkForUpdate", []);
      startUpdatePoll();
      refreshUpdateSection();
    });
  })(chBtns[i]);
}
function settingsViewHTML(){
  var html = '<div class="settings-view">';
  html += '<div class="tv-head"><div class="tv-name">SETTINGS</div><div class="tv-meta">NCAAD1MH</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">NOTIFICATIONS</div>';
  html += '<button class="tv-back" id="st-notif-toggle" type="button">Notifications: ' + (notifOn ? "On" : "Off") + '</button>';
  html += '<div class="tv-note">Pregame reminders, goal and final alerts. Turning it off stops all app notifications.</div>';
  html += '<button class="tv-back" id="st-notif-settings" type="button">Open system notification settings</button></div>';
  html += '<div class="tv-sec"><div class="tv-title">ANIMATIONS</div>';
  html += '<button class="tv-back" id="st-anim-toggle" type="button">Animations: ' + (animOn ? "On" : "Off") + '</button>';
  html += '<div class="tv-note">When on, tapping a team makes its logo fly at the screen before its page opens. Turn it off for instant page changes.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">FAVORITE TEAMS</div>';
  html += '<div class="tv-note">Pick your favorite team or teams. Favorites appear on the neutral home page with their next game and live state, get the goal horn when they score, and keep their full team page. Your favorites are in order: in Follow favorite mode the MOST RECENTLY picked favorite sets the app icon (a fixed icon below never moves), and, only when Open on favorite team below is On, the page the app opens on — changes apply on close + reopen. Reorder anytime with Make top below. Michigan is listed like every other team and appears in your favorites only when you pick it. If you clear all favorites, the app opens on the neutral page; pick favorites again anytime from any team star or here.</div>';
  var _favs = getFavorites();
  if (_favs.length){
    html += '<div class="tv-note">Your favorites in order:</div>';
    _favs.forEach(function(k, i){
      html += '<div class="tv-line">' + (i === 0 ? '<b>TOP — </b>' : '<button class="tv-back" data-make-top="' + esc(k) + '" type="button">Make top</button> ') + esc(favDisplayName(k)) + '</div>';
    });
  }
  DIRECTORY.forEach(function(d){
    html += '<button class="tv-back" data-fav-pick="' + esc(d.key) + '" type="button" aria-pressed="' + (isFavorite(d.key) ? "true" : "false") + '">' + (isFavorite(d.key) ? "★ " : "☆ ") + esc(d.name) + "</button> ";
  });
  html += '<button class="tv-back" id="st-favopen-toggle" type="button">Open on favorite team: ' + (favOpenOn ? "On" : "Off") + '</button>';
  html += '<div class="tv-note">Off (default): the app opens on the neutral intro page. On: the app opens on your top favorite team page instead. Applies on close + reopen.</div>';
  html += '<button class="tv-back" id="st-fav-clear" type="button">Clear all favorites</button>';
  html += '<button class="tv-back" id="st-icon-jump" type="button">Choose the app icon team &rarr;</button></div>';
  html += '<div class="tv-sec"><div class="tv-title">APP ICON</div>';
  html += '<div class="tv-note" id="st-icon-note">' + iconNoteHTML() + '</div>';
  html += '<select id="st-icon-team" aria-label="App icon">';
  var curMode = getIconMode(), curFixed = getFixedIconTeam();
  html += '<option value="follow"' + (curMode === "follow" ? ' selected' : '') + '>Follow favorite</option>';
  html += '<option value="fixed-puck"' + (curMode === "fixed" && curFixed === "DEFAULT" ? ' selected' : '') + '>Default puck (fixed)</option>';
  DIRECTORY.forEach(function(d){
    html += '<option value="' + esc(d.key) + '"' + (curMode === "fixed" && curFixed === d.key ? ' selected' : '') + '>' + esc(d.name) + ' ' + esc(d.nick) + ' (fixed)</option>';
  });
  html += '</select></div>';
  html += '<div class="tv-sec"><div class="tv-title">GOAL HORN</div>';
  html += '<button class="tv-back" id="st-horn-toggle" type="button">Goal horn: ' + (hornOn ? "On" : "Off") + '</button>';
  html += '<div class="tv-note">Plays automatically — horn plus an announcer goal call — when Michigan or a favorite team scores in live time while the app is open. Turn it off to mute goal sounds.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">TIMEZONE</div>';
  html += '<div class="tv-line">Game times display in: <select id="st-tz" aria-label="Game time timezone">';
  TZ_CHOICES.forEach(function(c){ html += '<option value="' + esc(c.id) + '"' + (tzPref() === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>'; });
  html += '</select></div>';
  html += '<div class="tv-note">Automatic uses your device timezone. This only changes displayed times — countdowns and live detection always use the real game time.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">DEFAULT BROWSER</div>';
  html += '<div class="tv-line">Open links with: <select id="st-browser" aria-label="Default browser">' + browserOptionsHTML() + '</select></div>';
  html += '<div class="tv-note">Ask every time shows the app picker on each link. Pick a browser to always open links in it instead — change it here anytime. Highlights always open in YouTube, not through this setting.</div></div>';
  html += '<div class="tv-sec" id="st-update-sec">' + updateSectionHTML() + '</div>';
  html += '<div class="tv-sec"><div class="tv-title">LIVE UPDATES</div>';
  html += '<div class="tv-line">Current: ' + esc(livePrefLabel()) + '</div>';
  html += '<button class="tv-back st-live-opt" data-live-pref="live" type="button">Live — every 30s</button> ';
  html += '<button class="tv-back st-live-opt" data-live-pref="manual" type="button">Manual only</button>';
  html += '<div class="tv-note" id="st-live-note">' + (lastLiveTickAt ? "Last live refresh: " + new Date(lastLiveTickAt).toLocaleTimeString() + "." : "No live refresh yet this session.") + '</div>';
  if (livePref === "manual") html += '<button class="tv-back" id="st-refresh-now" type="button">Refresh live data now</button>';
  html += '</div>';
  html += '<div class="tv-sec"><div class="tv-title">BATTERY</div>';
  html += '<button class="tv-back" id="st-battery-btn" type="button">Battery: allow background</button>';
  html += '<div class="tv-note">Lets live updates and the radio keep running in the background. Opens the system exemption prompt.</div></div>';
  html += '<div class="tv-sec"><div class="tv-title">DONATIONS / SUPPORT</div>' + donationsRowHTML() + '</div>';
  html += '<div class="tv-sec"><div class="tv-title">SHARE</div>';
  html += '<button class="tv-back" id="st-share-btn" type="button">Share this app</button>';
  html += '<div class="tv-note" id="share-note">' + (DOWNLOAD_URL ? "Send the app itself to someone — opens your phone's share sheet (messages, email, etc.). The download link is included in the share text, and the Share menu also sends the link on its own for Facebook." : "Send the app itself to someone — opens your phone's share sheet (messages, email, etc.). Works without network; no download link is used.") + '</div></div>';
  var dl0 = loadDefaultLinks();
  html += '<div class="tv-sec"><div class="tv-title">DEFAULT LINKS FOR ALL GAMES</div>';
  html += '<div class="tv-note">Fill once — these show on every game slot, labeled as your default. Per-game links stay separate and additional. Leave a field empty to clear it.</div>';
  html += '<div class="tv-line">Video stream (default): <input class="tv-urlinput" id="def-stream" type="url" placeholder="https://&hellip;" value="' + esc(dl0.stream || "") + '"></div>';
  html += '<div class="tv-line">Radio (default): <input class="tv-urlinput" id="def-radio" type="url" placeholder="https://&hellip;" value="' + esc(dl0.radio || "") + '"></div>';
  html += '<div class="tv-line">Highlights source (default): <input class="tv-urlinput" id="def-highlights" type="url" placeholder="https://&hellip;" value="' + esc(dl0.highlights || "") + '"></div>';
  html += '<div class="tv-note">Highlights source, not one video: a single highlights video cannot apply to every game, so this field is a source or channel link (for example a team\'s highlights playlist or channel page).</div>';
  html += '<button class="tv-back" id="def-save" type="button">Save default links</button> ';
  html += '<button class="tv-back" id="def-clear" type="button">Clear all defaults</button>';
  html += '<div class="tv-note" id="def-note"></div></div>';
  html += '<div class="tv-sec"><div class="tv-title">ABOUT</div>';
  html += '<div class="tv-line">NCAAD1MH — version 1.66 (versionCode 67)</div>';
  html += '<div class="tv-line">Built by V-MAX for Victor. Not for resale or redistribution for profit.</div>';
  html += '<div class="tv-line">Privacy: no tracking, no location, no personal data collected. Only the app\'s own live data, info, and scores — plus settings saved on this device.</div>';
  html += '<div class="tv-line">Package: com.vmax.michiganhockey</div>';
  html += '<div class="tv-line" id="guardian-status">' + esc(guardianStatusText()) + '</div>';
  html += '<div class="tv-note">Data sources: live scores from the ESPN men\'s college hockey scoreboard; Michigan box scores from the Big Ten official site; rankings from the USCHO poll via the ESPN feed; player photos from mgoblue.com; team news linked to its published source; draft records cross-checked against the NHL API at runtime; team reference links via Wikipedia. Saved data is labeled with its date wherever live data is unavailable.</div></div>';
  html += "</div>";
  return html;
}
function showSettingsView(push){
  var sv = $("#settingsview"), mv = $("#michview"), tv = $("#teamview"), pv = $("#playerview"), cv = $("#confview");
  if (!sv || !mv || !tv || !pv || !cv) return;
  if (push !== false && currentView.kind !== "settings") pushNav();
  currentView = {kind: "settings"};
  // p3: Settings sections start collapsed, like team sections. An in-place
  // re-render (push === false, e.g. after a toggle) keeps whatever the user
  // already expanded; a fresh entry collapses everything.
  var keepOpen = [];
  if (push === false){ try{ sv.querySelectorAll(".tv-sec:not(.collapsed) .tv-title").forEach(function(t){ keepOpen.push(t.textContent.trim()); }); }catch(e){} }
  sv.innerHTML = settingsViewHTML();
  try{ sv.querySelectorAll(".tv-sec").forEach(function(sec){ var t = sec.querySelector(".tv-title"); if (t && keepOpen.indexOf(t.textContent.trim()) === -1) sec.classList.add("collapsed"); }); }catch(e){}
  sv.hidden = false; mv.hidden = true; tv.hidden = true; pv.hidden = true; cv.hidden = true;
  var fh2 = $("#favhomeview"); if (fh2) fh2.hidden = true;
  var bv2 = $("#bracketview"); if (bv2) bv2.hidden = true;
  var sev2 = $("#searchview"); if (sev2) sev2.hidden = true;
  var nev2 = $("#neutralview"); if (nev2) nev2.hidden = true;
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ window.scrollTo(0, 0); }catch(e){}
  var snt = $("#st-notif-toggle");
  if (snt) snt.addEventListener("click", function(){ setNotifOn(!notifOn); showSettingsView(false); });
  var sat = $("#st-anim-toggle");
  if (sat) sat.addEventListener("click", function(){ setAnimOn(!animOn); showSettingsView(false); });
  var sns = $("#st-notif-settings");
  if (sns) sns.addEventListener("click", function(){ bridgeCall("openNotificationSettings", []); });
  var sht = $("#st-horn-toggle");
  if (sht) sht.addEventListener("click", function(){ setHornOn(!hornOn); });
  var stz = sv.querySelector("#st-tz");
  if (stz) stz.addEventListener("change", function(){ setTzPref(stz.value); showSettingsView(false); });
  var sbr = sv.querySelector("#st-browser");
  if (sbr) sbr.addEventListener("change", function(){ bridgeCall("setDefaultBrowser", [sbr.value]); showSettingsView(false); });
  bindUpdateButtons();
  var sbb = $("#st-battery-btn");
  if (sbb) sbb.addEventListener("click", function(){ bridgeCall("requestBatteryExemption", []); renderBatteryBtn(); });
  $$(".st-live-opt", sv).forEach(function(b){ b.addEventListener("click", function(){ setLivePref(b.getAttribute("data-live-pref")); showSettingsView(false); }); });
  $$("[data-fav-pick]", sv).forEach(function(b){ b.addEventListener("click", function(){ var k = b.getAttribute("data-fav-pick"); toggleFavorite(k); b.textContent = (isFavorite(k) ? "★ " : "☆ ") + favDisplayName(k); b.setAttribute("aria-pressed", isFavorite(k) ? "true" : "false"); }); });
  $$("[data-make-top]", sv).forEach(function(b){ b.addEventListener("click", function(){ var k = b.getAttribute("data-make-top"); if (makeTopFavorite(k)) showSettingsView(false); }); });
  var sfc = $("#st-fav-clear");
  if (sfc) sfc.addEventListener("click", function(){ save(FAV_KEY, []); try{ syncIconAfterFavoritesChange(); }catch(e){} try{ renderFavHome(); }catch(e){} showSettingsView(false); });
  var sfo = $("#st-favopen-toggle"); if (sfo) sfo.addEventListener("click", function(){ setFavOpenOn(!favOpenOn); showSettingsView(false); });
  var sit = sv.querySelector("#st-icon-team");
  if (sit) sit.addEventListener("change", function(){
    var v = sit.value;
    if (v === "follow") setIconMode("follow");
    else if (v === "fixed-puck") setFixedIcon("DEFAULT");
    else setFixedIcon(v);
    var nn = $("#st-icon-note"); if (nn) nn.innerHTML = iconNoteHTML();
  });
  var sij = $("#st-icon-jump");
  if (sij) sij.addEventListener("click", function(){ var t = $("#st-icon-team"); if (t){ try{ t.scrollIntoView(); }catch(e){} try{ t.focus(); }catch(e){} } });
  var srn = $("#st-refresh-now");
  if (srn) srn.addEventListener("click", function(){ liveTick(); showSettingsView(false); });
  var ssb = $("#st-share-btn");
  if (ssb) ssb.addEventListener("click", function(){ openShareMenu(); });
  var dsb = $("#def-save");
  if (dsb) dsb.addEventListener("click", function(){
    var sv2 = $("#def-stream") ? $("#def-stream").value.trim() : "";
    var rv2 = $("#def-radio") ? $("#def-radio").value.trim() : "";
    var hv2 = $("#def-highlights") ? $("#def-highlights").value.trim() : "";
    var bad = [sv2, rv2, hv2].some(function(u){ return u && u.indexOf("http://") !== 0 && u.indexOf("https://") !== 0; });
    var nn2 = $("#def-note");
    if (bad){ if (nn2) nn2.textContent = "Each default link must start with http:// or https:// — nothing saved."; return; }
    var obj = {};
    if (sv2) obj.stream = sv2;
    if (rv2) obj.radio = rv2;
    if (hv2) obj.highlights = hv2;
    var changed = JSON.stringify(obj) !== JSON.stringify(loadDefaultLinks());
    save("default_links", obj);
    if (changed){ refreshAllDetails(); showSettingsView(false); }
    var nn3 = $("#def-note");
    if (nn3) nn3.textContent = "Saved — your defaults now show on every game slot.";
  });
  var dcb = $("#def-clear");
  if (dcb) dcb.addEventListener("click", function(){
    var changed = JSON.stringify(loadDefaultLinks()) !== "{}";
    save("default_links", {});
    if (changed){ refreshAllDetails(); showSettingsView(false); }
    var nn4 = $("#def-note");
    if (nn4) nn4.textContent = "Cleared — defaults removed from all game slots.";
  });
  renderNotifToggle(); renderHornToggle(); renderBatteryBtn(); renderAnimToggle(); renderFavOpenToggle();
}

// ---------- in-app Search page (v32.16) ----------
// One search over everything saved in the app: teams (DIRECTORY, 63),
// players (every saved roster), games (saved schedules + Michigan games),
// conferences and postseason brackets. Results are live-filtered as the
// user types and each result jumps straight to its existing view via the
// existing openers — no new navigation paths, no invented entries. The
// search icon lives in the fixed top score strip (#ticker), which sits
// outside every view container, so it is present on every page including
// Settings. Phone Back walks home through navBack, which gains a search
// case; there is no in-app Back button, per the standing rule.
var searchQuery = "";
function searchNorm(s){ return String(s || "").toLowerCase(); }
function searchAll(q){
  var needle = searchNorm(q).trim();
  var out = {teams: [], players: [], games: [], confs: [], playersTotal: 0, gamesTotal: 0};
  if (!needle || needle.length < 2) return out;
  var i, j, k;
  // TEAMS: DIRECTORY, alphabetical by name.
  var teams = [];
  if (typeof DIRECTORY !== "undefined") DIRECTORY.forEach(function(d){
    var hay = searchNorm(d.name + " " + d.nick + " " + d.city + " " + d.conf + " " + d.key);
    if (hay.indexOf(needle) !== -1) teams.push(d);
  });
  teams.sort(function(a, b){ return a.name < b.name ? -1 : 1; });
  out.teams = teams;
  // PLAYERS: the merged roster model — current players only. Removed
  // players are history-only and never surface in current-roster search.
  var players = [];
  if (typeof DIRECTORY !== "undefined") DIRECTORY.forEach(function(d){
    var model = null; try{ model = buildMergedModel(d.key); }catch(e){}
    if (!model) return;
    model.players.forEach(function(p){
      if (!p || !p.name) return;
      var hay = searchNorm(p.name + " " + d.name + " " + d.nick);
      if (hay.indexOf(needle) !== -1) players.push({team: d.key, teamName: d.name, name: p.name, pos: p.pos || "", num: p.num, cls: p.cls || null});
    });
  });
  players.sort(function(a, b){
    if (a.teamName !== b.teamName) return a.teamName < b.teamName ? -1 : 1;
    return a.name < b.name ? -1 : 1;
  });
  out.playersTotal = players.length;
  out.players = players.slice(0, 30);
  // GAMES: saved schedules first (openTeamGameDetail handles the jump,
  // routing Michigan games to the Michigan game detail and the rest to
  // showGameDetail), then Michigan games not already covered by an
  // opponent schedule row (dedup on date + opponent key).
  var games = [];
  var michCovered = {};
  if (typeof SCHEDULES !== "undefined") Object.keys(SCHEDULES).forEach(function(key){
    var de = null; try{ de = dirEntry(key); }catch(e){}
    var teamName = de ? de.name : key;
    (SCHEDULES[key] || []).forEach(function(r, idx){
      if (r.oppKey === "MICH" || key === "MICH") michCovered[r.d + "|" + (r.oppKey === "MICH" ? key : r.oppKey)] = true;
      if (key === "MICH") return;
      var oppName = r.opp || (r.oppKey || "");
      var hay = searchNorm(teamName + " " + oppName + " " + r.d + " " + (r.result || "") + " " + (r.timeCT || ""));
      if (hay.indexOf(needle) !== -1) games.push({kind: "sched", team: key, teamName: teamName, idx: idx, date: r.d, ha: r.ha, opp: oppName, timeCT: r.timeCT || "", result: r.result || ""});
    });
  });
  if (typeof GAMES !== "undefined") GAMES.forEach(function(g){
    if (michCovered[g.date + "|" + g.short]) return;
    var hay = searchNorm("Michigan " + g.opp + " " + g.date + " " + (g.status || "") + " " + (g.timeCT || ""));
    if (hay.indexOf(needle) !== -1) games.push({kind: "mich", n: g.n, teamName: "Michigan", date: g.date, home: !!g.home, opp: g.opp, timeCT: g.timeCT || "", status: g.status || "", mich: g.mich, oppScore: g.oppScore});
  });
  games.sort(function(a, b){
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.teamName < b.teamName ? -1 : 1;
  });
  out.gamesTotal = games.length;
  out.games = games.slice(0, 30);
  // CONFERENCES & BRACKETS.
  if (typeof CONF_SITES !== "undefined") Object.keys(CONF_SITES).forEach(function(conf){
    if (searchNorm(conf).indexOf(needle) !== -1) out.confs.push({kind: "conf", conf: conf});
  });
  if (typeof BRACKETS !== "undefined") BRACKETS.forEach(function(br){
    if (searchNorm(br.title + " " + br.trophy).indexOf(needle) !== -1) out.confs.push({kind: "bracket", id: br.id, title: br.title});
  });
  if (needle.indexOf("bracket") !== -1 || needle.indexOf("postseason") !== -1 || needle.indexOf("frozen") !== -1) out.confs.push({kind: "bracketlist", title: "Postseason Brackets"});
  return out;
}
function searchResultsHTML(q){
  var needle = searchNorm(q).trim();
  if (!needle || needle.length < 2) return '<div class="tv-sec"><div class="tv-note">Type at least 2 characters to search teams, players, games, conferences and brackets. Results update as you type; tap any result to go straight to it.</div></div>';
  var r = searchAll(q);
  var html = "";
  if (!r.teams.length && !r.players.length && !r.games.length && !r.confs.length){
    return '<div class="tv-sec"><div class="tv-note">No results for "' + esc(q) + '" in teams, players, games, conferences or brackets. Try a team name, a player name, an opponent, or a conference.</div></div>';
  }
  if (r.teams.length){
    html += '<div class="tv-sec"><div class="tv-title">TEAMS</div>';
    r.teams.forEach(function(d){
      html += '<div class="dir-row" data-search-jump="1" data-search-kind="team" data-search-a="' + esc(d.key) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(d.key), d.key) + teamLogoImg(d, "dir-logo") +
        '<span class="dir-name">' + esc(d.name) + " " + esc(d.nick) + '</span>' +
        '<span class="dir-meta">' + esc(d.conf) + " &middot; " + esc(d.city) + "</span></div>";
    });
    html += "</div>";
  }
  if (r.players.length){
    html += '<div class="tv-sec"><div class="tv-title">PLAYERS</div>';
    r.players.forEach(function(p){
      html += '<div class="dir-row" data-search-jump="1" data-search-kind="player" data-search-a="' + esc(p.team) + '" data-search-b="' + esc(p.name) + '" role="button" tabindex="0">' +
        '<span class="dir-name">' + esc(p.name) + '</span>' +
        '<span class="dir-meta">' + esc(p.teamName) + " &middot; " + esc(p.pos) + (p.num != null ? " #" + esc(p.num) : "") + (p.cls ? " &middot; " + esc(p.cls) : "") + "</span></div>";
    });
    if (r.playersTotal > r.players.length) html += '<div class="tv-note">Showing the first 30 of ' + r.playersTotal + " matching players.</div>";
    html += '<div class="tv-note">Search covers current rosters for teams checked this session; other teams show saved rosters.</div>';
    html += "</div>";
  }
  if (r.games.length){
    html += '<div class="tv-sec"><div class="tv-title">GAMES</div>';
    r.games.forEach(function(g){
      var label;
      if (g.kind === "mich") label = "Michigan " + (g.home ? "vs " : "at ") + g.opp + " &middot; " + esc(fmtDate(g.date)) + (g.timeCT ? " &middot; " + esc(g.timeCT) : "") + (g.status === "final" ? " &middot; Final " + g.mich + "-" + g.oppScore : "");
      else label = esc(g.teamName) + (g.ha === "H" ? " vs " : " at ") + esc(g.opp) + " &middot; " + esc(fmtDate(g.date)) + (g.timeCT ? " &middot; " + esc(g.timeCT) : "") + (g.result ? " &middot; " + esc(g.result) : "");
      if (g.kind === "mich") html += '<div class="dir-row" data-search-jump="1" data-search-kind="michgame" data-search-a="' + esc(g.n) + '" role="button" tabindex="0"><span class="dir-name">' + label + "</span></div>";
      else html += '<div class="dir-row" data-search-jump="1" data-search-kind="game" data-search-a="' + esc(g.team) + '" data-search-b="' + esc(g.idx) + '" role="button" tabindex="0"><span class="dir-name">' + label + "</span></div>";
    });
    if (r.gamesTotal > r.games.length) html += '<div class="tv-note">Showing the first 30 of ' + r.gamesTotal + " matching games.</div>";
    html += "</div>";
  }
  if (r.confs.length){
    html += '<div class="tv-sec"><div class="tv-title">CONFERENCES &amp; BRACKETS</div>';
    r.confs.forEach(function(c){
      if (c.kind === "conf") html += '<div class="dir-row" data-search-jump="1" data-search-kind="conf" data-search-a="' + esc(c.conf) + '" role="button" tabindex="0"><span class="dir-name">' + esc(c.conf) + "</span></div>";
      else if (c.kind === "bracket") html += '<div class="dir-row" data-search-jump="1" data-search-kind="bracket" data-search-a="' + esc(c.id) + '" role="button" tabindex="0"><span class="dir-name">' + esc(c.title) + "</span></div>";
      else html += '<div class="dir-row" data-search-jump="1" data-search-kind="bracketlist" role="button" tabindex="0"><span class="dir-name">Postseason Brackets</span></div>';
    });
    html += "</div>";
  }
  return html;
}
function bindSearchResults(root){
  $$("[data-search-jump]", root || document).forEach(function(b){
    b.addEventListener("click", function(){ searchJump(b.getAttribute("data-search-kind"), b.getAttribute("data-search-a"), b.getAttribute("data-search-b")); });
    b.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); searchJump(b.getAttribute("data-search-kind"), b.getAttribute("data-search-a"), b.getAttribute("data-search-b")); }
    });
  });
}
function renderSearchResults(){
  var inp = $("#search-input");
  searchQuery = inp ? inp.value : searchQuery;
  var box = $("#search-results");
  if (box){ box.innerHTML = searchResultsHTML(searchQuery); bindSearchResults(box); }
}
function searchJump(kind, a, b){
  if (kind === "team") showTeamView(a);
  else if (kind === "player") showPlayerPage(a, b);
  else if (kind === "game") openTeamGameDetail(a, +b);
  else if (kind === "michgame") openMichiganGameFromTicker(+a);
  else if (kind === "conf") showConfView(a);
  else if (kind === "bracket") showBracketView(a);
  else if (kind === "bracketlist") showBracketView(null);
}
function searchPageHTML(){
  var html = '<div class="tv"><div class="tv-head"><div class="tv-name">SEARCH</div>' +
    '<div class="tv-meta">Search everything in the app — teams, players, games, conferences and brackets — and tap a result to go straight to it.</div></div>' +
    '<div class="tv-sec"><input id="search-input" class="search-input" type="search" placeholder="Search teams, players, games, conferences…" value="' + esc(searchQuery) + '"></div>' +
    '<div id="search-results"></div></div>';
  return html;
}
function showSearchView(push){
  var sv = $("#searchview"), mv = $("#michview"), tv = $("#teamview"), pv = $("#playerview"), cv = $("#confview");
  if (!sv || !mv || !tv || !pv || !cv) return;
  if (push !== false && currentView.kind !== "search") pushNav();
  currentView = {kind: "search"};
  if (push !== false) searchQuery = "";
  sv.innerHTML = searchPageHTML();
  sv.hidden = false; mv.hidden = true; tv.hidden = true; pv.hidden = true; cv.hidden = true;
  ["settingsview", "favhomeview", "bracketview", "neutralview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.remove("teamview");
  clearTeamTheme(); syncHeader(); syncBackState();
  try{ window.scrollTo(0, 0); }catch(e){}
  var inp = $("#search-input");
  if (inp){
    inp.addEventListener("input", function(){ renderSearchResults(); });
    renderSearchResults();
    if (push !== false){ try{ inp.focus(); }catch(e){} }
  }
}

// ---------- NCAA directory + generic team views (v7) ----------
// DIRECTORY (directory.js): all 63 NCAA Division I men's programs for
// 2026-27, with conferences, title years, ESPN ids and brand colors.
// TEAMS keys (the 12 teams on Michigan's schedule) are reused so the
// existing full team views and the directory resolve to the same team.
function dirEntry(key){
  if (typeof DIRECTORY === "undefined") return null;
  for (var i = 0; i < DIRECTORY.length; i++) if (DIRECTORY[i].key === key) return DIRECTORY[i];
  return null;
}
var ESPN_ID_MAP = null;
function espnIdMap(){
  if (ESPN_ID_MAP) return ESPN_ID_MAP;
  ESPN_ID_MAP = {};
  if (typeof DIRECTORY !== "undefined") DIRECTORY.forEach(function(d){ if (d.espn) ESPN_ID_MAP[String(d.espn)] = d.key; });
  return ESPN_ID_MAP;
}
function dirKeyForEspnId(id){ return espnIdMap()[String(id)] || null; }
function espnLogoUrl(id){ return "https://a.espncdn.com/i/teamlogos/ncaa/500/" + id + ".png"; }
// ---------- v14 local logo library (staged verified marks) ----------
// TEAM_LOGOS comes from logos.js (generated from the staged library manifest).
// ASU mascot (Sparky, approval required) and UNNY mascot (Charger, must not
// be used as a standalone logo) are NOT wired; byte-identical darks pruned.
function localLogoVariants(key){
  try{ if (typeof TEAM_LOGOS !== "undefined" && TEAM_LOGOS[key]) return TEAM_LOGOS[key]; }catch(e){}
  return [];
}
function localPrimaryFile(key){
  var vs = localLogoVariants(key);
  for (var i = 0; i < vs.length; i++){ if (vs[i].v === "primary") return vs[i].f; }
  return vs.length ? vs[0].f : null;
}
// v16 logo-contrast audit (measured vs tile rgb(31,59,68); WCAG contrast >= 3.0).
// NAVY_SWAP: primary effectively invisible (vis < 0.35) but the team's dark
// variant clearly reads (>= 0.60) -> navy surfaces render the dark variant.
// NAVY_DARK_FILES: every file with vis < 0.35 -> white tile behind it.
var NAVY_SWAP = {"AF": "logo-AF-dark.png", "COLG": "logo-COLG-dark.png", "MSU": "logo-MSU-dark.png", "ND": "logo-ND-dark.png", "OSU": "logo-OSU-dark.png"};
var NAVY_DARK_FILES = {"logo-AF-primary.png": 1, "logo-AUG-wordmark.png": 1, "logo-BC-primary.png": 1, "logo-BRWN-primary.png": 1, "logo-BU-primary.png": 1, "logo-CLAR-wordmark.png": 1, "logo-COLG-primary.png": 1, "logo-COLG-script.png": 1, "logo-COLG-wordmark.png": 1, "logo-CONN-wordmark.png": 1, "logo-COR-mascot.png": 1, "logo-COR-primary.png": 1, "logo-COR-wordmark.png": 1, "logo-DART-primary.png": 1, "logo-DEN-dark.png": 1, "logo-DEN-primary.png": 1, "logo-FSU-wordmark.png": 1, "logo-HAR-primary.png": 1, "logo-MIA-dark.png": 1, "logo-MIA-primary.png": 1, "logo-MIA-wordmark.png": 1, "logo-MINN-dark.png": 1, "logo-MINN-primary.png": 1, "logo-MNST-primary.png": 1, "logo-MSU-primary.png": 1, "logo-MSU-secondary.png": 1, "logo-MSU-wordmark.png": 1, "logo-ND-mascot.png": 1, "logo-ND-primary.png": 1, "logo-NE-wordmark.png": 1, "logo-NIA-dark.png": 1, "logo-NIA-primary.png": 1, "logo-NIA-wordmark.png": 1, "logo-OSU-primary.png": 1, "logo-PROV-primary.png": 1, "logo-PSU-dark.png": 1, "logo-PSU-primary.png": 1, "logo-RPI-dark.png": 1, "logo-RPI-primary.png": 1, "logo-SCSU-primary.png": 1, "logo-SLU-primary.png": 1, "logo-UML-dark.png": 1, "logo-UML-primary.png": 1, "logo-UML-wordmark.png": 1, "logo-UNNY-dark.png": 1, "logo-UNNY-primary.png": 1, "logo-UVM-primary.png": 1, "logo-WIS-primary.png": 1, "logo-WIS-wordmark.png": 1, "logo-WMU-secondary.png": 1, "logo-WMU-wordmark.png": 1, "logo-YALE-primary.png": 1};
// v16 navy-surface logo rule (measured, logo-audit.json): on navy, render the
// team's dark variant when it clearly reads, else the primary on a white tile
// when the primary is effectively invisible, else the primary as-is.
function navyLogoFile(key){
  if (NAVY_SWAP[key]) return NAVY_SWAP[key];
  return localPrimaryFile(key);
}
var LIGHT_TILE_FILES = {"logo-ARMY-throwback.png":1, "logo-RIT-throwback.png":1};
function logoTileClass(file){ return (file && (NAVY_DARK_FILES[file] || LIGHT_TILE_FILES[file])) ? " on-white" : ""; }
// v18 white-ticker logo rule: the bar is white, so every team renders its
// bundled primary mark in its own colors (verified library). Dark variants
// are all-white marks that would vanish on white, so they are never used
// here; Michigan follows the same rule (primary Block M, no script mark,
// no special treatment on the bar).
function whiteTickerFile(key){
  return localPrimaryFile(key);
}
// v18/v30 board date/time: full ISO datetimes convert to Central; a
// date-only string renders as-is (running it through CT conversion would
// shift the day). No time published -> empty time, never TBD.
function boardGameDateTime(ev){
  var d = "", t = "";
  try{
    var raw = ev && ev.date ? ev.date : "";
    if (!raw) return {date: d, time: t};
    if (raw.length > 10){
      var ep = Date.parse(raw);
      if (!isNaN(ep)){
        var dopts = {weekday: "short", month: "short", day: "numeric"};
        var _tz = tzZone(); if (_tz) dopts.timeZone = _tz;
        try{ d = new Date(ep).toLocaleDateString("en-US", dopts); }catch(e){ d = fmtDate(raw.slice(0, 10)); }
        t = epochToZoneLabel(ep, centralTodayISO(ep)) || (ctTimeStr(ep) + " " + centralZone(centralTodayISO(ep)));
      }
    } else {
      d = fmtDate(raw.slice(0, 10));
    }
  }catch(e){}
  return {date: d, time: t};
}
// v22: rank badges render in the BADGE OWNER'S team colors, never Michigan
// colors on another team (Victor device report: BC's #18 badge showed
// Michigan navy/maize on BC's page). dirEntry supplies c1/c2; the
// luminance guard keeps light backgrounds readable; an unknown team
// falls back to neutral, never Michigan colors.
function rankBadgeLum(hex){
  try{
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map(function(c){ return c + c; }).join("");
    var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    var f = function(c){ return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }catch(e){ return 0; }
}
function rankBadgeStyle(key){
  var de = null; try{ de = dirEntry(key); }catch(e){}
  if (!de || !de.c1 || !de.c2) return 'background:#1a1a1a;border-color:#888888;color:#ffffff';
  var l1 = rankBadgeLum(de.c1), l2 = rankBadgeLum(de.c2);
  var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  var fg = ratio >= 3 ? de.c2 : (l1 > 0.5 ? "#1a1a1a" : "#ffffff");
  var bd = ratio >= 3 ? de.c2 : fg;
  return 'background:' + de.c1 + ';border-color:' + bd + ';color:' + fg;
}
function rankBadge(r, key){
  return (typeof r === "number" && r >= 1 && r <= 20 && Math.floor(r) === r) ? '<span class="rank-badge" style="' + rankBadgeStyle(key) + '">#' + r + "</span>" : "";
}
// v32.35 interactive TEAM LOGOS: tapping a variant selects it as that
// team's logo for their own page (header slot + watermark). The choice
// persists per team in localStorage ("logoChoiceByTeam": key -> file).
// Tapping the selected variant again clears the choice (back to the
// default). A stored file is honored ONLY when it is one of that team's
// own verified variants (or Michigan's own extra marks) — the isolation
// rule is enforced at read time too, so a corrupt or foreign entry can
// never put another team's mark on a page.
var MICH_EXTRA_LOGOS = {"script-logo.png": 1, "mascot.jpg": 1, "hockey-logo.jpg": 1};
function isOwnLogoFile(key, file){
  if (!key || !file) return false;
  if (key === "MICH" && MICH_EXTRA_LOGOS[file]) return true;
  var vs = localLogoVariants(key);
  for (var i = 0; i < vs.length; i++){ if (vs[i].f === file) return true; }
  return false;
}
function logoChoiceFile(key){
  var all = load("logoChoiceByTeam", {});
  var f = all ? all[key] : null;
  return isOwnLogoFile(key, f) ? f : null;
}
function setLogoChoice(key, file){
  var all = load("logoChoiceByTeam", {});
  if (!all || typeof all !== "object") all = {};
  if (file && isOwnLogoFile(key, file)) all[key] = file;
  else delete all[key];
  save("logoChoiceByTeam", all);
}
// The team's own-page logo: the selected variant when one is chosen,
// otherwise exactly the pre-v32.35 default (navy/primary via
// teamLogoImg; Michigan's team page header defaults to its script mark
// when michScriptDefault is set, as it did before).
function ownLogoImg(entry, cls, michScriptDefault){
  if (!entry) return teamLogoImg(entry, cls);
  var f = logoChoiceFile(entry.key);
  if (f) return '<img class="' + (cls || "tv-logo") + logoTileClass(f) + '" src="' + esc(f) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span class="' + (cls || "tv-logo") + ' tv-badge" style="display:none;' + teamBadgeStyle(entry.key) + '">' + esc(entry.key) + "</span>";
  if (michScriptDefault && entry.key === "MICH") return '<img class="tv-logo-lg" src="script-logo.png" alt="">';
  return teamLogoImg(entry, cls);
}
function localLogoVariantsHTML(key){
  var vs = localLogoVariants(key);
  var chosen = logoChoiceFile(key);
  var out = "";
  function item(f, label){
    var on = chosen === f;
    return '<button class="tv-logo-item' + logoTileClass(f) + (on ? ' logo-selected' : '') + '" type="button" data-logo-pick="' + esc(f) + '" data-logo-team="' + esc(key) + '" aria-pressed="' + (on ? "true" : "false") + '"><img class="tv-logo-sm" src="' + esc(f) + '" alt=""><span class="tv-logo-label">' + esc(label) + "</span></button>";
  }
  vs.forEach(function(x){ out += item(x.f, x.v); });
  if (key === "MICH"){
    out += item("script-logo.png", "script");
    out += item("mascot.jpg", "mascot");
    out += item("hockey-logo.jpg", "hockey logo");
  }
  return out;
}
// Tap handling for the TEAM LOGOS section (delegated: works for every
// renderer that includes the section, across re-renders). Applies the
// choice in place — section selected states, the page header slot, and
// the watermark — without bouncing the user off the Info tab.
function pickLogoVariant(key, file){
  if (!key || !file) return;
  var cur = logoChoiceFile(key);
  setLogoChoice(key, cur === file ? null : file);
  var chosen = logoChoiceFile(key);
  $$("[data-logo-pick]").forEach(function(b){
    if (b.getAttribute("data-logo-team") !== key) return;
    var on = b.getAttribute("data-logo-pick") === chosen;
    b.classList.toggle("logo-selected", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if (currentView && currentView.kind === "team" && currentView.key === key){
    var de = dirEntry(key);
    $$(".own-logo-slot").forEach(function(s){ s.innerHTML = ownLogoImg(de, s.getAttribute("data-logo-cls") || "tv-logo-lg", s.getAttribute("data-logo-mich") === "1"); });
    var wm = $(".team-watermark img");
    if (wm){ var src = chosen || (key === "MICH" ? "script-logo.png" : navyLogoFile(key)); if (src) wm.src = src; }
  }
}
document.addEventListener("click", function(e){
  var b = (e.target && e.target.closest) ? e.target.closest("[data-logo-pick]") : null;
  if (b) pickLogoVariant(b.getAttribute("data-logo-team"), b.getAttribute("data-logo-pick"));
});
window.__vmaxTest.setLogoChoice = setLogoChoice;
window.__vmaxTest.logoChoiceFile = logoChoiceFile;
window.__vmaxTest.ownLogoImg = ownLogoImg;
window.__vmaxTest.pickLogoVariant = pickLogoVariant;
window.__vmaxTest.localLogoVariants = localLogoVariants;
window.__vmaxTest.localLogoVariantsHTML = localLogoVariantsHTML;
window.__vmaxTest.setAnimOn = function(v){ animOn = !!v; };
function teamLogoImg(entry, cls, usePrimary){
  var lp = entry ? (usePrimary ? localPrimaryFile(entry.key) : navyLogoFile(entry.key)) : null;
  if (lp) return '<img class="' + (cls || "tv-logo") + logoTileClass(lp) + '" src="' + esc(lp) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span class="' + (cls || "tv-logo") + ' tv-badge" style="display:none;' + teamBadgeStyle(entry.key) + '">' + esc(entry.key) + "</span>";
  return '<span class="' + (cls || "tv-logo") + ' tv-badge" style="' + teamBadgeStyle(entry ? entry.key : null) + '">' + esc(entry ? entry.key : "?") + "</span>";
}
// Title years for any team: bundled DIRECTORY titles + locally stored
// extras (same persistence rule as Michigan's banners). Count is always
// derived from this list, so count and banners can never disagree.
function teamTitles(key){
  var e = dirEntry(key);
  var base = [];
  if (key === "MICH") base = TITLE_YEARS.slice();
  else if (e) base = (e.titles || []).slice();
  var extra = [];
  if (key === "MICH") extra = load("extraTitles", []);
  else { var all = load("extraTitlesByTeam", {}); extra = all[key] || []; }
  extra.forEach(function(y){ if (base.indexOf(y) === -1) base.push(y); });
  base.sort(function(a, b){ return a - b; });
  return base;
}
function bannersHTMLFor(key){
  var years = teamTitles(key);
  var html = '<div class="ban-count-sm">' + years.length + "&times; National Champions</div><div class=\"ban-row\">";
  if (!years.length) html += '<span class="tv-note">No NCAA men\'s hockey national title yet. A future title adds a banner here automatically.</span>';
  years.forEach(function(y){
    html += '<span class="ban ban-sm" title="NCAA National Champions ' + seasonSpan(y) + '">NCAA<br><b>' + seasonSpan(y) + "</b></span>";
  });
  return html + "</div>";
}
function addTitleForTeam(key, y){
  y = +y;
  if (!y) return false;
  if (key === "MICH") return addTitleYear(y);
  var e = dirEntry(key); if (!e) return false;
  if ((e.titles || []).indexOf(y) !== -1) return false;
  var all = load("extraTitlesByTeam", {});
  var list = all[key] || [];
  if (list.indexOf(y) !== -1) return false;
  list.push(y); all[key] = list; save("extraTitlesByTeam", all);
  return true;
}
// Generalized Frozen Four final win rule (same rule as Michigan's
// checkTitleWin): April + finished + team victorious + title-game
// evidence. Simulation-tested only for non-Michigan teams as well.
function checkTitleWinFor(key, ev, dateISO){
  if (!ev || !dateISO) return false;
  var p = dateISO.split("-");
  if (+p[1] !== 4) return false;
  var comp = ev.competitions && ev.competitions[0];
  if (!comp) return false;
  var state = ev.status && ev.status.type ? ev.status.type.state : "";
  if (state !== "post") return false;
  var e = dirEntry(key); if (!e) return false;
  var mine = null, opp = null;
  comp.competitors.forEach(function(c){
    var tid = c.team && c.team.id;
    if (String(tid) === String(e.espn) || dirKeyForEspnId(tid) === key) mine = c; else opp = c;
  });
  if (!mine || !opp) return false;
  var ms = parseInt(mine.score, 10), os = parseInt(opp.score, 10);
  if (isNaN(ms) || isNaN(os)) { // score may be an object {displayValue}
    ms = mine.score && mine.score.displayValue ? parseInt(mine.score.displayValue, 10) : NaN;
    os = opp.score && opp.score.displayValue ? parseInt(opp.score.displayValue, 10) : NaN;
  }
  if (isNaN(ms) || isNaN(os) || ms <= os) return false;
  var notes = "";
  try{ notes = (comp.notes || []).map(function(n){ return n.headline || ""; }).join(" "); }catch(err){}
  var text = ((ev.name || "") + " " + notes).toLowerCase();
  if (text.indexOf("championship") === -1 && ev.titleGame !== true) return false;
  return addTitleForTeam(key, +p[0]);
}
// ---------- generic team live data (ESPN team schedule + roster) ----------
var currentTeamKey = null;
var genericRosterCache = {};
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.genericRosterCache = genericRosterCache;
var genericSchedCache = {};
function espnTeamURL(key, kind){
  var e = dirEntry(key); if (!e || !e.espn) return null;
  return "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/teams/" + e.espn + "/" + kind + "?season=2027";
}
// Feed timestamps are UTC; schedule rows are Central dates. A 7:00+ PM CT
// game is past midnight UTC, so the raw UTC calendar date is one day late
// and never matches its row (Oct 2 7:07 PM CT game filed as Oct 3). Always
// convert full timestamps to Central dates; date-only values carry no time
// and are used as-is. (v32.14 patch 1: UTC-date match bug, all teams.)
function feedCentralDate(raw){
  var r = String(raw || "");
  if (!r) return "";
  if (r.length <= 10) return r.slice(0, 10);
  var ep = Date.parse(r);
  if (isNaN(ep)) return r.slice(0, 10);
  return centralTodayISO(ep);
}
function parseEspnSched(j, espnId){
  var out = [];
  (j.events || []).forEach(function(ev){
    var comp = (ev.competitions || [])[0]; if (!comp) return;
    var cs = comp.competitors || [];
    var me = null, opp = null;
    // Perspective is ALWAYS the requested team (matched by ESPN id), so
    // away games render from that team's side, never the opponent's.
    if (espnId) cs.forEach(function(c){ if (String(c.team.id) === String(espnId)) me = c; else if (!opp) opp = c; });
    if (!me) cs.forEach(function(c){ if (c.homeAway === "home") me = c; else if (!opp) opp = c; });
    if (!me && cs.length) me = cs[0];
    if (!opp && cs.length > 1) opp = cs[1];
    var ms = me && me.score && me.score.displayValue !== undefined ? me.score.displayValue : null;
    var os = opp && opp.score && opp.score.displayValue !== undefined ? opp.score.displayValue : null;
    var ven = comp.venue ? (comp.venue.fullName || "") : "";
    if (comp.venue && comp.venue.address) ven += (ven ? ", " : "") + (comp.venue.address.city || "") + (comp.venue.address.state ? ", " + comp.venue.address.state : "");
    var bcs = [];
    (comp.broadcasts || []).forEach(function(b){
      var ns = b.names || (b.mediaShortName ? [b.mediaShortName] : (b.network ? [b.network] : []));
      ns.forEach(function(n){ if (n && bcs.indexOf(n) === -1) bcs.push(n); });
    });
    // v19/v30: a date-only feed value carries no time — it renders with no
    // time text at all, never a midnight-UTC conversion (which would print a wrong
    // 6:00 PM CT the previous day). Epoch is nulled so no countdown span
    // can attach to a dateless start.
    var st = (comp.status && comp.status.type) || null;
    var state = st ? (st.state || "") : "";
    var period = (comp.status && comp.status.period) || null;
    var clock = (comp.status && (comp.status.displayClock || "")) || "";
    var rawDate = ev.date || "";
    var dateOnly = rawDate.length > 0 && rawDate.length <= 10;
    var sDet = ""; try{ sDet = (comp.status && comp.status.type && (comp.status.type.shortDetail || comp.status.type.detail)) || (comp.status && comp.status.detail) || ""; }catch(e){}
    var cancelled = /cancel|postpon/i.test(sDet);
    out.push({date: feedCentralDate(rawDate), epoch: (!rawDate || dateOnly) ? null : Date.parse(rawDate), timeCT: dateOnly ? "" : (rawDate ? ctTimeStr(Date.parse(rawDate)) : ""), name: ev.name || "", home: !!(me && me.homeAway === "home"),
      oppName: opp ? (opp.team.displayName || "") : "", oppId: opp ? opp.team.id : null,
      myScore: ms, oppScore: os, done: ms !== null && os !== null,
      winner: me ? !!me.winner : false, venue: ven, broadcasts: bcs, ev: ev, state: state, period: period, clock: clock, live: state === "in", cancelled: cancelled});
  });
  out.sort(function(a, b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  return out;
}
// ---------- v32 series history (H2H, all-time, through Oct 24, 2026) ----------
// Numbers are always the SERIES LEADER's W-L-T, so the line reads the same
// from either team's page. Missing pairing -> honest gap label, never a
// zero-filled record. Unresolvable opponent -> "" (no line, never wrong).
function h2hPairKey(a, b){ return a < b ? a + "|" + b : b + "|" + a; }
function dirKeyForName(name){
  if (!name || typeof DIRECTORY === "undefined") return null;
  var n = String(name).toLowerCase().trim();
  for (var i = 0; i < DIRECTORY.length; i++){
    if (DIRECTORY[i].name && DIRECTORY[i].name.toLowerCase() === n) return DIRECTORY[i].key;
  }
  return null;
}
function h2hLine(a, b){
  if (!a || !b || a === b) return "";
  if (!dirEntry(a) || !dirEntry(b)) return "";
  if (typeof H2H === "undefined") return "";
  var pair = h2hPairKey(a, b);
  var r = H2H[pair];
  if (!r) return "*source unavailable";
  if (r.leader === "NONE") return "First meeting";
  var ka = pair.split("|")[0];
  var lw = (r.leader === ka) ? r.w : r.l;
  var ll = (r.leader === ka) ? r.l : r.w;
  var de = dirEntry(r.leader);
  var leaderName = de ? de.name : r.leader;
  if (r.leader === "TIED") return "Series through Oct 24, 2026: tied " + r.w + "-" + r.l + "-" + r.t;
  return "Series through Oct 24, 2026: " + leaderName + " leads " + lw + "-" + ll + "-" + r.t;
}
function h2hLineHTML(a, b, cls){
  var ln = h2hLine(a, b);
  return ln ? '<div class="' + cls + '">' + esc(ln) + '</div>' : "";
}
// Favorite's current line opponent, mirroring favNextLine's source order.
// A live/final board line with an unresolvable opponent yields null: no
// line, never the wrong pairing.
function favLineOppKey(key){
  var b = favBoard[key];
  if (b){
    if (b.opp){
      if (dirEntry(b.opp)) return b.opp;
      var k = dirKeyForName(b.opp);
      if (k) return k;
    }
    return null;
  }
  var next = null;
  GAMES.forEach(function(g){ if (g.short === key && g.status === "upcoming" && !next) next = g; });
  if (next) return "MICH";
  return null;
}
function favRowH2H(k){
  var ok = favLineOppKey(k);
  return ok ? h2hLineHTML(k, ok, "dir-h2h") : "";
}
// v32c seam: CT display for saved structured rows. v32d upgrades this to
// the Settings timezone picker; countdown/live logic never reads it.
function displayTimeCT(timeCT, date){
  if (!timeCT) return "";
  return displayZoneTime(timeCT, date);
}
// Structured SCHEDULES row -> generic-schedule shape, so a tap opens the
// same full game detail as a live row. Result strings are all "W/L/T n-m"
// (verified against the staged file); anything unparseable stays unscored.
function structuredToGeneric(key, r){
  var oppKey = r.oppKey || null;
  var oppName = oppKey ? (dirEntry(oppKey) ? dirEntry(oppKey).name : r.opp) : r.opp;
  var m = r.result ? String(r.result).match(/^([WLT])\s+(\d+)-(\d+)$/) : null;
  return {date: r.d, oppName: oppName, home: r.ha === "H",
    myScore: m ? +m[2] : null, oppScore: m ? +m[3] : null,
    done: !!m, venue: "", oppId: oppKey ? (dirEntry(oppKey) ? dirEntry(oppKey).espn : null) : null,
    winner: m ? (m[1] === "W") : false, timeCT: r.timeCT || "", epoch: null,
    exhibition: /exhibition/i.test(r.note || "")};
}
function structuredRowHTML(key, r){
  var g = structuredToGeneric(key, r);
  var oppKey = r.oppKey || null;
  var isEx = !!g.exhibition;
  var isTbd = !oppKey && /^tbd$/i.test(String(r.opp || "").trim());
  var oppDisplay = isTbd ? "Opponent to be determined" : g.oppName;
  var oppBtn = oppKey
    ? '<span class="team-name-btn" data-team="' + esc(oppKey) + '" role="button" tabindex="0">' + esc(g.oppName) + "</span>"
    : esc(oppDisplay);
  var vsTxt = r.ha === "H" ? "vs " : (r.ha === "A" ? "at " : "vs ");
  // Regular-season rows never render a bare time placeholder: a blank
  // timeCT means unpublished/disputed/TBA, so no time element at all.
  var timeTxt = r.timeCT ? " &middot; " + esc(displayTimeCT(r.timeCT, r.d)) : "";
  var resTxt = r.result ? " &middot; " + esc(r.result) : ((!r.result && r.d < centralTodayISO(Date.now())) ? " &middot; No result published" : "");
  var noteTxt = "";
  if (isEx) noteTxt = " &middot; Exhibition";
  else if (isTbd){
    var tm = String(r.note || "").match(/Beanpot|Holiday Face-Off|Empire State|Friendship Four|Great Lakes Invitational|CT Ice/i);
    noteTxt = tm ? " (" + esc(tm[0]) + ")" : "";
  }
  var h2h = "";
  if (isEx) h2h = '<div class="tv-h2h">Exhibition — no series record</div>';
  else if (!isTbd && oppKey) h2h = h2hLineHTML(key, oppKey, "tv-h2h");
  else if (!isTbd && !oppKey) h2h = '<div class="tv-h2h">No D1 series record</div>';
  var btn = '<button class="tv-game" data-gen-game="' + esc(g.date) + "|" + esc(g.oppName) + '">' + fmtDate(r.d) + " &mdash; " + vsTxt + oppBtn + timeTxt + resTxt + noteTxt + "</button>";
  return btn + h2h + schedMediaHTML(key, {watch: r.watch || r.stream || null, tv: r.tv || "", radio: r.radio || null, hl: r.hl || r.highlights || null, date: r.d, oppKey: r.oppKey, streamDead: r.streamDead || null, radioDead: r.radioDead || null});
}
function schedRowHTML(key, g){
  if (g.cancelled) return '<button class="tv-game" data-gen-game="' + esc(g.date) + "|" + esc(g.oppName) + '">' + fmtDate(g.date) + " &mdash; " + (g.home ? "vs " : "at ") + esc(g.oppName) + " &middot; Postponed/cancelled — official schedule authoritative</button>" + h2hLineHTML(key, g.oppId ? dirKeyForEspnId(g.oppId) : dirKeyForName(g.oppName), "tv-h2h");
  var e = dirEntry(key);
  var oppKey = g.oppId ? dirKeyForEspnId(g.oppId) : null;
  var oppBtn = oppKey
    ? '<span class="team-name-btn" data-team="' + esc(oppKey) + '" role="button" tabindex="0">' + esc(g.oppName) + "</span>"
    : esc(g.oppName);
  var score = g.done ? (g.myScore + "&ndash;" + g.oppScore + (g.live ? "" : (g.winner ? " W" : ((String(g.myScore) === String(g.oppScore)) ? " T" : " L")))) : "upcoming";
  var stateLbl = g.live ? ("LIVE" + (g.clock ? " " + esc(g.clock) : "")) : g.done ? "Final" : ("upcoming " + esc(g.date));
  var cdSpan = "";
  if (!g.done && g.epoch && g.date === centralTodayISO(Date.now())) cdSpan = ' <span class="cd" data-cd-epoch="' + g.epoch + '"></span>';
  // v19: upcoming rows are tappable buttons into the same full game slot
  // as finals (openGenericGameDetail handles state "pre"). An empty feed
  // no time renders as no time text — never "Time TBD", never "<date> CT".
  var btn = g.done
    ? '<button class="tv-game" data-gen-game="' + esc(g.date) + "|" + esc(g.oppName) + '">' + fmtDate(g.date) + " &mdash; " + (g.home ? "vs " : "at ") + oppBtn + " &middot; " + score + " (" + stateLbl + ")" + (g.venue ? " &middot; " + esc(g.venue) : "") + "</button>"
    : '<button class="tv-game" data-gen-game="' + esc(g.date) + "|" + esc(g.oppName) + '">' + fmtDate(g.date) + " &mdash; " + (g.home ? "vs " : "at ") + oppBtn + (function(){ var zt = displayZoneTime(g.timeCT, g.date); return zt ? " &middot; " + esc(zt) : ""; })() + cdSpan + (g.venue ? " &middot; " + esc(g.venue) : "") + "</button>";
  var oppKey2 = oppKey || dirKeyForName(g.oppName);
  return btn + h2hLineHTML(key, oppKey2, "tv-h2h") + ((g.broadcasts && g.broadcasts.length) ? '<div class="tv-line">Channels (live feed): ' + esc(g.broadcasts.join(", ")) + "</div>" : "") + schedMediaHTML(key, {broadcasts: g.broadcasts});
}
// v32.6: live schedule merges into the open team view's unified rows;
// the saved fallback below renders only when the feed fails or is empty.
// v9 reliability: verified Michigan games vs this team, converted from
// bundled GAMES, so a team schedule is never empty when the live feed is
// down. Rows reuse schedRowHTML, so finals get .tv-game buttons exactly
// like live-feed rows, and the same bindings below apply.
function bundledTeamGames(key){
  return GAMES.filter(function(g){ return g.short === key; }).map(function(g){
    var done = g.status === "final";
    return {date: g.date, oppName: "Michigan", home: !g.home, myScore: g.oppScore, oppScore: g.mich,
      done: done, venue: g.venue, oppId: 130, winner: done ? (g.oppScore > g.mich) : false,
      timeCT: g.timeCT, epoch: null};
  });
}
function bundledTeamSchedHTML(key){
  // v32: the saved fallback is the full structured schedule for all 63
  // teams (SCHEDULES), not just verified games vs Michigan. The live
  // ESPN feed stays first; this renders only when it fails or is empty.
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[key]) || null;
  if (sched && sched.length){
    genericSchedCache[key] = sched.map(function(r){ return structuredToGeneric(key, r); });
    var html = '<div class="tv-note">Live schedule unavailable — showing the saved full schedule.</div>';
    var done = sched.filter(function(r){ return !!r.result; });
    var up = sched.filter(function(r){ return !r.result; });
    if (done.length){ html += '<div class="tv-sub">Results (saved schedule)</div>'; done.slice().reverse().forEach(function(r){ html += structuredRowHTML(key, r); }); }
    if (up.length){ html += '<div class="tv-sub">Upcoming (saved schedule)</div>'; up.forEach(function(r){ html += structuredRowHTML(key, r); }); }
    return html;
  }
  var games = bundledTeamGames(key);
  genericSchedCache[key] = games;
  var html;
  if (!games.length && key !== "MICH" && !hasMichFinal(key)){
    html = '<div class="tv-note">Live schedule unavailable — no saved schedule for this team in this app.</div>';
    return html;
  }
  html = '<div class="tv-note">Live schedule unavailable — showing verified games vs Michigan.</div>';
  if (!games.length){ html += '<div class="tv-note">No verified Michigan games vs this team are in this app.</div>'; return html; }
  var done = games.filter(function(g){ return g.done; });
  var up = games.filter(function(g){ return !g.done; });
  if (done.length){ html += '<div class="tv-sub">Results vs Michigan (verified)</div>'; done.slice().reverse().forEach(function(g){ html += schedRowHTML(key, g); }); }
  if (up.length){ html += '<div class="tv-sub">Upcoming vs Michigan (verified)</div>'; up.forEach(function(g){ html += schedRowHTML(key, g); }); }
  return html;
}
function bindSchedButtons(target, key){
  $$("[data-team]", target).forEach(function(b){
    if (b.getAttribute("data-team-bound")) return;
    b.setAttribute("data-team-bound", "1");
    b.addEventListener("click", function(ev){ ev.stopPropagation(); teamZoomTo(b.getAttribute("data-team")); });
  });
  $$("[data-gen-game]", target).forEach(function(b){
    if (b.getAttribute("data-gen-bound")) return;
    b.setAttribute("data-gen-bound", "1");
    b.addEventListener("click", function(){
      var parts = b.getAttribute("data-gen-game").split("|");
      var gg = (genericSchedCache[key] || []).filter(function(x){ return x.date === parts[0] && x.oppName === parts[1]; })[0];
      if (gg) openGenericGameDetail(key, gg);
    });
  });
}
// ---------- v32.6: live feed merges INTO the unified schedule rows ----------
var liveGameInfo = {};
function schedKeyFor(key, g){
  var oppKey = g.oppId ? dirKeyForEspnId(g.oppId) : null;
  if (!oppKey) oppKey = dirKeyForName(g.oppName);
  return key + "|" + g.date + "|" + (oppKey || "");
}
function liveStatusText(g){
  if (g.live) return "LIVE" + (g.period ? " \u00b7 " + periodLabel(g.period) : "") + (g.clock ? " " + g.clock : "");
  if (g.done) return "Final";
  if (g.timeCT) return displayTimeCT(g.timeCT, g.date);
  return "";
}
function setWlSpan(row, side, letter){
  var sp = row.querySelector('[data-wl="' + side + '"]');
  if (!sp) return;
  sp.textContent = letter || "";
  sp.className = letter === "W" ? "wl-w" : letter === "L" ? "wl-l" : letter === "T" ? "wl-t" : "wl";
  sp.setAttribute("data-wl", side);
}
function feedRowHTML(key, g){
  var de = null; try{ de = dirEntry(key); }catch(e){}
  var oppKey = g.oppId ? dirKeyForEspnId(g.oppId) : dirKeyForName(g.oppName);
  var ode = null; try{ if (oppKey) ode = dirEntry(oppKey); }catch(e){}
  var statusTxt = '<span class="meta-status row-status">' + esc(liveStatusText(g)) + '</span>';
  var myScore = '<span class="row-score" data-score="my">' + ((g.myScore !== null && g.myScore !== undefined) ? g.myScore : "") + '</span>';
  var oppScore = '<span class="row-score" data-score="opp">' + ((g.oppScore !== null && g.oppScore !== undefined) ? g.oppScore : "") + '</span>';
  if (g.done && !g.live){
    var letter = g.winner ? "W" : null;
    if (letter === null && g.myScore !== null && g.oppScore !== null) letter = (+g.myScore > +g.oppScore) ? "W" : (+g.myScore < +g.oppScore) ? "L" : "T";
    myScore += wlSpan(letter, "my"); oppScore += wlSpan(letter ? oppLetter(letter) : null, "opp");
  } else { myScore += wlSpan(null, "my"); oppScore += wlSpan(null, "opp"); }
  var myLine = '<span class="row-team">' + rankBadge(currentIntroRank(key), key) + (de ? teamLogoImg(de, "tv-logo") : "") + '<span>' + esc(de ? de.name : key) + '</span>' + myScore + '</span>';
  var oppLine = '<span class="row-team">' + (oppKey ? rankBadge(currentIntroRank(oppKey), oppKey) : "") + (ode ? teamLogoImg(ode, "tv-logo") : "") + '<span class="team-name-btn" data-team="' + esc(oppKey || "") + '" role="button" tabindex="0">' + esc(g.oppName) + '</span>' + oppScore + '</span>';
  var teamLines = g.home ? myLine + oppLine : oppLine + myLine;
  var det = '<div class="details" hidden>';
  det += '<div class="tv-line">' + fmtDate(g.date) + ' &mdash; ' + (g.home ? "vs " : "at ") + esc(g.oppName) + '</div>';
  if (g.timeCT) det += '<div class="tv-line">Time: ' + esc(displayTimeCT(g.timeCT, g.date)) + '</div>';
  if (g.venue) det += '<div class="tv-line" data-live-venue="1">Venue: ' + esc(g.venue) + '</div>';
  if (g.broadcasts && g.broadcasts.length) det += '<div class="tv-line">Channels (live feed): ' + esc(g.broadcasts.join(", ")) + '</div>';
  det += '<div class="tv-line"><button data-feed-detail="1" type="button">Open full game details</button></div>';
  det += '</div>';
  return '<div class="row" data-sched-key="' + esc(schedKeyFor(key, g)) + '" data-live-only="1"><button class="row-head">' +
    '<span class="row-meta"><span class="gdate">' + fmtDate(g.date) + '</span>' +
    '<span class="vs">' + (g.home ? "vs" : "at") + '</span>' +
    '<span class="meta-opp">' + esc(g.oppName) + '</span>' +
    statusTxt + '</span>' +
    teamLines + '</button>' + schedMediaHTML(key, {broadcasts: g.broadcasts}) + det + '</div>';
}
function bindFeedRow(el, key, g){
  var head = el.querySelector(".row-head");
  if (head) head.addEventListener("click", function(ev){
    if (ev.target && ev.target.closest && ev.target.closest("[data-team]")) return;
    var d = el.querySelector(".details"); if (d) d.hidden = !d.hidden;
  });
  el.querySelectorAll("[data-team]").forEach(function(b){
    b.addEventListener("click", function(ev){ ev.stopPropagation(); teamZoomTo(b.getAttribute("data-team")); });
  });
  var fb = el.querySelector("[data-feed-detail]");
  if (fb) fb.addEventListener("click", function(){ openGenericGameDetail(key, g); });
}
function mergeFeedIntoRows(key, games){
  var rowsEl = $("#tv-sched-rows"); if (!rowsEl) return;
  games.forEach(function(g){
    var oppKey = g.oppId ? dirKeyForEspnId(g.oppId) : dirKeyForName(g.oppName);
    try{ if (g.done && g.myScore !== null && g.myScore !== undefined && g.oppScore !== null && g.oppScore !== undefined){ liveResultsStore[key] = liveResultsStore[key] || {}; liveResultsStore[key][g.date] = {my: +g.myScore, opp: +g.oppScore}; } }catch(e){}
    var mapKey = key + "|" + g.date + "|" + (oppKey || "");
    if (g.venue || (g.broadcasts && g.broadcasts.length)) liveGameInfo[mapKey] = {venue: g.venue || "", broadcasts: g.broadcasts || []};
    var rows = rowsEl.querySelectorAll("[data-sched-key]");
    var row = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].getAttribute("data-sched-key") === mapKey){ row = rows[i]; break; }
    if (!row){
      var tmp = document.createElement("div"); tmp.innerHTML = feedRowHTML(key, g);
      var el = tmp.firstChild;
      var inserted = false;
      var all = rowsEl.querySelectorAll("[data-sched-key]");
      for (var j = 0; j < all.length; j++){
        var dd = (all[j].getAttribute("data-sched-key") || "").split("|")[1] || "";
        if (dd > g.date){ rowsEl.insertBefore(el, all[j]); inserted = true; break; }
      }
      if (!inserted) rowsEl.appendChild(el);
      bindFeedRow(el, key, g);
      return;
    }
    // p2: a scoreless, non-live feed game never touches a saved row — finals never touched.
    if (g.live || (g.myScore !== null && g.myScore !== undefined && g.oppScore !== null && g.oppScore !== undefined)){
      var st = row.querySelector(".row-status"); if (st) st.textContent = liveStatusText(g);
      var ms = row.querySelector('[data-score="my"]'); if (ms) ms.textContent = (g.myScore !== null && g.myScore !== undefined) ? g.myScore : "";
      var os = row.querySelector('[data-score="opp"]'); if (os) os.textContent = (g.oppScore !== null && g.oppScore !== undefined) ? g.oppScore : "";
      if (g.done && !g.live){
        var letter = g.winner ? "W" : null;
        if (letter === null && g.myScore !== null && g.oppScore !== null) letter = (+g.myScore > +g.oppScore) ? "W" : (+g.myScore < +g.oppScore) ? "L" : "T";
        setWlSpan(row, "my", letter);
        setWlSpan(row, "opp", letter ? oppLetter(letter) : null);
      } else { setWlSpan(row, "my", null); setWlSpan(row, "opp", null); }
    }
    var det = row.querySelector(".details");
    if (det){
      // Saved venue wins: a detail that already carries a verified saved
      // venue line never gains a second (feed) venue line. The feed venue
      // is only inserted when the detail has no venue at all.
      var sv = det.querySelector("[data-saved-venue]");
      var vl = det.querySelector("[data-live-venue]");
      if (sv){ if (vl) vl.parentNode.removeChild(vl); }
      else if (g.venue){
        if (!vl){ vl = document.createElement("div"); vl.className = "tv-line"; vl.setAttribute("data-live-venue", "1"); det.insertBefore(vl, det.children[1] || null); }
        vl.textContent = "Venue: " + g.venue;
      } else if (vl){ vl.parentNode.removeChild(vl); }
    }
  });
  // v32.20: a highlight (or stream/radio) link that lands in data shows
  // on the row on this same tick — strips re-render from current data.
  try{ syncSchedRowMedia(key); }catch(e){}
}
// p2: generic feed view falls back to saved finals when a feed game carries no scores.
function applySavedResultsToFeed(key, games){
  var sched = (typeof SCHEDULES !== "undefined" && SCHEDULES[key]) || [];
  games.forEach(function(g){
    if (g.done || g.live) return;
    var ok = g.oppId ? dirKeyForEspnId(g.oppId) : dirKeyForName(g.oppName);
    for (var i = 0; i < sched.length; i++){
      var r = sched[i];
      if (r.d === g.date && (r.oppKey === ok || r.opp === g.oppName) && r.result){
        var m = /^([WLT])\s+(\d+)-(\d+)/.exec(r.result);
        if (m){ g.myScore = m[2]; g.oppScore = m[3]; g.done = true; g.winner = (m[1] === "W"); }
        break;
      }
    }
  });
}
function renderTeamLive(key){
  // v32.6: rich team views have ONE unified schedule (#tv-sched-rows).
  // The feed patches those rows in place — never a second list — so an
  // open details panel survives a tick. The generic view keeps its own
  // #g-sched list (fallback only).
  var rowsEl = $("#tv-sched-rows"), stampEl = $("#tv-sched-stamp");
  var schedEl = $("#g-sched"), gStampEl = $("#g-stamp");
  if (rowsEl && currentTeamKey === key){
    var url = null; try{ url = espnTeamURL(key, "schedule"); }catch(e){}
    if (typeof fetch !== "function" || !url){
      if (stampEl) stampEl.textContent = url ? "Live schedule unavailable \u2014 verified games shown." : "No live feed for this team \u2014 verified games shown.";
      return Promise.resolve(false);
    }
    var ctl = null;
    try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(err){} }, 15000); }catch(err){}
    var opts = {}; if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function(r){ return r.json(); }).then(function(j){
      var entry0 = dirEntry(key);
      var games = parseEspnSched(j, entry0 ? entry0.espn : null);
      genericSchedCache[key] = games;
      mergeFeedIntoRows(key, games);
      if (stampEl) stampEl.textContent = "Live data updated " + new Date().toLocaleTimeString() + " (ESPN team feed).";
      return true;
    }).catch(function(){
      if (stampEl) stampEl.textContent = "Live schedule unavailable \u2014 verified games shown.";
      return false;
    });
  }
  if (!schedEl || currentTeamKey !== key) return Promise.resolve(false);
  var gUrl = null; try{ gUrl = espnTeamURL(key, "schedule"); }catch(e){}
  if (typeof fetch !== "function"){
    schedEl.innerHTML = bundledTeamSchedHTML(key);
    bindSchedButtons(schedEl, key);
    if (gStampEl) gStampEl.textContent = "Live schedule unavailable \u2014 verified games shown.";
    return Promise.resolve(false);
  }
  if (!gUrl){
    schedEl.innerHTML = bundledTeamSchedHTML(key);
    bindSchedButtons(schedEl, key);
    if (gStampEl) gStampEl.textContent = "No live feed for this team \u2014 verified games shown.";
    return Promise.resolve(false);
  }
  var gctl = null;
  try{ gctl = new AbortController(); setTimeout(function(){ try{ gctl.abort(); }catch(err){} }, 15000); }catch(err){}
  var gopts = {}; if (gctl) gopts.signal = gctl.signal;
  return fetch(gUrl, gopts).then(function(r){ return r.json(); }).then(function(j){
    var entry0 = dirEntry(key);
    var games = parseEspnSched(j, entry0 ? entry0.espn : null);
    genericSchedCache[key] = games;
    applySavedResultsToFeed(key, games);
    var done = games.filter(function(g){ return g.done; });
    var up = games.filter(function(g){ return !g.done; });
    var html = "";
    if (done.length){ html += '<div class="tv-sub">Results (live feed)</div>'; done.slice().reverse().forEach(function(g){ html += schedRowHTML(key, g); }); }
    if (up.length){ html += '<div class="tv-sub">Upcoming (live feed)</div>'; up.forEach(function(g){ html += schedRowHTML(key, g); }); }
    if (!games.length) html += '<div class="tv-note">No games returned by the live feed.</div>';
    if (!games.length) html += bundledTeamSchedHTML(key);
    schedEl.innerHTML = html;
    var stamp = "Live data updated " + new Date().toLocaleTimeString() + " (ESPN team feed).";
    if (gStampEl) gStampEl.textContent = stamp;
    $$("[data-team]", schedEl).forEach(function(b){
      if (b.getAttribute("data-team-bound")) return;
      b.setAttribute("data-team-bound", "1");
      b.addEventListener("click", function(ev){ ev.stopPropagation(); teamZoomTo(b.getAttribute("data-team")); });
    });
    $$("[data-gen-game]", schedEl).forEach(function(b){
      if (b.getAttribute("data-gen-bound")) return;
      b.setAttribute("data-gen-bound", "1");
      b.addEventListener("click", function(){
        var parts = b.getAttribute("data-gen-game").split("|");
        var gg = (genericSchedCache[key] || []).filter(function(x){ return x.date === parts[0] && x.oppName === parts[1]; })[0];
        if (gg) openGenericGameDetail(key, gg);
      });
    });
    return true;
  }).catch(function(){
    schedEl.innerHTML = bundledTeamSchedHTML(key);
    bindSchedButtons(schedEl, key);
    if (gStampEl) gStampEl.textContent = "Live schedule unavailable \u2014 verified games shown.";
    return false;
  });
}
// v18: a generic-schedule final opens the same full board detail as a
// ticker tap. A row against Michigan opens the real Michigan slot when it
// matches a bundled game; otherwise the board detail carries the row.
function openGenericGameDetail(key, gg){
  var oppKey = gg.oppId ? dirKeyForEspnId(gg.oppId) : null;
  var michOpp = null;
  if (key === "MICH") michOpp = oppKey;
  else if (oppKey === "MICH") michOpp = key;
  if (michOpp){
    for (var i = 0; i < GAMES.length; i++){
      if (GAMES[i].short === michOpp && GAMES[i].date === gg.date){ openMichiganGameFromTicker(GAMES[i].n); return; }
    }
  }
  var de = dirEntry(key);
  var homeKey = gg.home ? key : oppKey, awayKey = gg.home ? oppKey : key;
  var homeName = gg.home ? (de ? de.name : key) : gg.oppName;
  var awayName = gg.home ? gg.oppName : (de ? de.name : key);
  showGameDetail({home: homeName, away: awayName,
    homeScore: gg.home ? gg.myScore : gg.oppScore, awayScore: gg.home ? gg.oppScore : gg.myScore,
    state: gg.done ? "post" : "pre", clock: "", venue: gg.venue,
    homeKey: homeKey, awayKey: awayKey,
    ev: gg.ev || null, evId: (gg.ev && gg.ev.id) || null, dateISO: gg.date, timeCT: gg.timeCT || "", broadcasts: gg.broadcasts || []});
}
function genericTeamHTML(entry){
  var key = entry.key;
  var html = '<div class="tv themed" id="tv-' + esc(key) + '" style="--tc1:' + esc(entry.c1) + ';--tc2:' + esc(entry.c2) + ';--tc3:' + esc(entry.c3 || "#FFFFFF") + '">';
  var wmSrc = logoChoiceFile(key) || navyLogoFile(key);
  if (wmSrc) html += '<div class="team-watermark"><img src="' + esc(wmSrc) + '" alt=""></div>';
  html += '<div class="tv-head">' + rankBadge(currentIntroRank(key), key) + '<span class="own-logo-slot" data-logo-cls="tv-logo-lg">' + ownLogoImg(entry, "tv-logo-lg", false) + "</span>" + '<div class="tv-name">' + esc(entry.name) + " " + esc(entry.nick) + "</div>";
  html += '<div class="tv-meta">' + confBtnHTML(entry.conf) + " &middot; " + esc(entry.city) + "</div></div>";
  html += favStarHTML(key);
  html += '<button class="tv-back share-app-btn" type="button">Share this app</button>';
  html += '<div class="tab-bar" role="tablist"><button class="tab-btn" data-tab="info" type="button" aria-selected="false">Info</button><button class="tab-btn active" data-tab="schedule" type="button" aria-selected="true">Schedule</button><button class="tab-btn" data-tab="players" type="button" aria-selected="false">Players</button><button class="tab-btn" data-tab="news" type="button" aria-selected="false">News</button><button class="tab-btn" data-tab="extras" type="button" aria-selected="false">Extras</button></div>';
  html += '<div class="tv-sec extras-sec" data-tab="extras">';
  html += '<div class="tv-sec"><div class="tv-title">CHAMPIONSHIP BANNERS</div>' + bannersHTMLFor(key) + "</div>";
  html += '<div class="tv-sec" data-intro-sec="1"><div class="tv-title">TEAM INTRO</div>' + teamIntroHTML(key) + "</div>";
  html += '</div>';
  html += '<div class="tv-sec" data-tab="schedule"><div class="tv-title">SCHEDULE — LIVE</div><div class="tv-note" id="g-stamp">Loading live schedule…</div><div id="g-sched"><div class="tv-note">Loading live schedule from the ESPN team feed…</div></div><button class="tv-back" id="g-refresh" type="button">Refresh live data</button></div>';
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">ROSTER</div><div id="g-roster"><div class="tv-note">Loading roster from the ESPN team feed…</div></div></div>';
  if (key === "MICH" || hasMichFinal(key)){
    html += '<div class="tv-sec" data-tab="players"><div class="tv-title">PLAYER POINTS</div><div class="tv-note">Full-season points publish on the team\'s official stats page and are not included for this team. Vs-Michigan points for teams Michigan has played appear in those games\' details.</div></div>';
  } else {
    html += '<div class="tv-sec" data-tab="players"><div class="tv-title">PLAYER POINTS</div><div class="tv-note">Full-season points publish on the official stats page for this team and are not included for this team.</div></div>';
  }
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">TEAM STATS</div><div class="tv-sub">Offense</div><div class="tv-note">Offense totals are not published in the ESPN team feed consulted.</div><div class="tv-sub">Defense</div><div class="tv-note">Defense totals are not published in the ESPN team feed consulted.</div></div>';
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">INJURY / AVAILABILITY</div><div class="tv-note">College hockey publishes no formal availability report comparable to football\'s injury report. No out/questionable list is published for this team in the sources consulted.</div></div>';
  html += '<div class="tv-sec" data-tab="players"><div class="tv-title">ACTIVE PLAYERS</div><div class="tv-note">The roster below is the team\'s active roster as published by ESPN. Dressed lineups publish only with game-day line charts and are not available in advance.</div></div>';
  html += '<div class="tv-sec" data-tab="news"><div class="tv-title">VIDEO + HIGHLIGHTS</div><div class="tv-note">Highlights for this team\'s games open straight in YouTube. No highlight video is included for this team in this app — YouTube opens from any game row that carries one.</div></div>';
  html += '<div class="tv-sec" data-tab="news"><div class="tv-title">RADIO</div><div class="tv-note">Where this team publishes a live audio stream, it opens in the app\'s persistent radio player. No radio stream is included for this team in this app — check the team\'s official site for its broadcast.</div></div>';
  html += '<div class="tv-sec" data-tab="news" id="tv-news"><div class="tv-title">TEAM NEWS</div><div class="tv-note">No verified news items for this team in this app. See the team\'s official site for the latest news.</div><div id="tv-news-live"></div></div>';
  html += '<div class="tv-sec" data-tab="info"><div class="tv-title">TEAM DATA</div>';
  html += '<div class="tv-line">Team: ' + esc(entry.name) + " " + esc(entry.nick) + "</div>";
  html += '<div class="tv-line">Conference: ' + confBtnHTML(entry.conf) + "</div>";
  html += '<div class="tv-line">Location: ' + esc(entry.city) + "</div>";
  html += '<div class="tv-line">National titles: ' + teamTitles(key).length + (teamTitles(key).length ? " (" + teamTitles(key).map(seasonSpan).join(", ") + ")" : " — none") + "</div>";
  html += '<div class="tv-line">Record: not published in the ESPN team feed summary used here; see the live schedule above for verified results.</div>';
  html += '<div class="tv-note">Where a data item is not published, this view says so rather than guessing. Your phone Back button walks back through the pages you visited.</div>';
  html += packFullHTML(key);
  html += "</div></div>";
  return html;
}
function showGenericTeamView(key, push){
  var entry = dirEntry(key); if (!entry) return;
  var tv = $("#teamview"), mv = $("#michview");
  if (!tv || !mv) return;
  try{ hidePicker(); }catch(e){}
  if (push !== false && !(currentView.kind === "team" && currentView.key === key)) pushNav();
  currentView = {kind: "team", key: key};
  currentTeamKey = key;
  tv.innerHTML = genericTeamHTML(entry);
  attachPlayerHandlers(tv);
  selectTeamTab(tv, "schedule");
  collapseTeamSecs(tv);
  tv.hidden = false; mv.hidden = true;
  ["playerview", "confview", "settingsview", "favhomeview", "bracketview", "searchview", "neutralview"].forEach(function(id){ var el = $("#" + id); if (el) el.hidden = true; });
  document.body.classList.add("teamview");
  try{ window.scrollTo(0, 0); }catch(e){}
  attachConfHandlers(tv);
  try{ refreshTeamLiveData(key); }catch(e){}
  $$("[data-team-intro]", tv).forEach(function(b){ b.addEventListener("click", function(){ toggleIntro(b.getAttribute("data-team-intro")); }); });
  $$("[data-fav-toggle]", tv).forEach(function(b){ b.addEventListener("click", function(){ var k = b.getAttribute("data-fav-toggle"); toggleFavorite(k); syncFavStar(b, k); }); });
  applyTeamTheme(key); syncHeader(); syncBackState();
  var rf = $("#g-refresh"); if (rf) rf.addEventListener("click", function(){ renderTeamLive(key); });
  renderTeamLive(key);
  refreshGenericRoster(key);
}
// v18: the generic-page roster fetch, extracted so the live tick can
// re-run it on the score cadence (same feed, same rendering). Full
// (TEAMS) pages keep their detailed bundled roster table instead — the
// ESPN roster feed is less detailed, so replacing that table would lose
// data; that is a named live-update limitation, not a silent fallback.
function refreshGenericRoster(key){
  if (!key || currentTeamKey !== key) return;
  var tv = $("#teamview");
  if (!tv || tv.hidden) return;
  var rosEl = $("#g-roster");
  if (!rosEl) return;
  var url = espnTeamURL(key, "roster");
  if (!url){ rosEl.innerHTML = '<div class="tv-note">No ESPN roster feed is published for this team (joining program). Roster data is not available in this build.</div>'; return; }
  if (typeof fetch !== "function") return;
  fetchWithTimeout(url, 15000).then(function(r){ return r.json(); }).then(function(j){
    var groups = {F: [], D: [], G: []};
    (j.athletes || []).forEach(function(a){
      var pos = (a.position && a.position.abbreviation) || "";
      var grp = (pos === "D") ? "D" : (pos === "G") ? "G" : "F";
      groups[grp].push({name: a.displayName || (a.firstName + " " + a.lastName), pos: pos, jersey: a.jersey || null,
        height: a.displayHeight || "", weight: a.displayWeight || "",
        headshot: (a.headshot && a.headshot.href) || null,
        espnId: (a.id != null ? String(a.id) : null)});
    });
    genericRosterCache[key] = groups.F.concat(groups.D, groups.G);
    var html = "";
    [["Forwards", "F"], ["Defensemen", "D"], ["Goalies", "G"]].forEach(function(pair){
      if (!groups[pair[1]].length) return;
      html += '<div class="tv-sub">' + pair[0] + "</div>";
      groups[pair[1]].forEach(function(p){
        html += '<div class="tv-line">' + playerPhotoHTML(p.name, key, "pthumb") + " " + playerBtn(p.name, key) + (p.jersey ? " &middot; #" + p.jersey : "") + (p.pos ? " &middot; " + esc(p.pos) : "") + "</div>";
      });
    });
    if (!html) html = '<div class="tv-note">No roster athletes returned by the ESPN feed for this team.</div>';
    else html += '<div class="tv-note">Roster source: ESPN team roster feed (as published; ESPN roster data can lag official roster changes — the official team site is authoritative). Photos: this team shows a photo when the ESPN feed provides one, or when the team has a verified College Hockey News roster page (fetched live from that page); otherwise players show an initials placeholder, never a guessed photo.</div>';
    if (rosEl) rosEl.innerHTML = html;
    attachPlayerHandlers(tv);
    loadChnPhotos(key);
    try{ loadOfficialPhotos(key); }catch(e){}
  }).catch(function(){
    if (rosEl) rosEl.innerHTML = '<div class="tv-note">Roster could not be fetched right now (offline or feed blocked). Tap Refresh live data to retry the schedule; the roster retries on the next open.</div>';
  });
}
function genericPlayerPageHTML(key, name){
  var remG = null; try{ remG = removedLookup(key, name); }catch(e){}
  if (remG) return removedPlayerPageHTML(key, name, remG);
  var entry = dirEntry(key);
  var cached = null;
  (genericRosterCache[key] || []).forEach(function(p){ if (p.name === name) cached = p; });
  var chn = chnPhotoFor(name, key);
  var mp = null; try{ mp = modelFindPlayer(key, name); }catch(e){}
  try{ if (mp){ var _dn = espnDisplayNum(key, name, mp); if (_dn != null) mp.num = _dn; } }catch(e){}
  var html = '<div class="pp">';
  html += '<div class="pp-head">' + playerPhotoHTML(name, key, "pphoto", (mp && mp.num) || (cached && cached.jersey) || (chn && chn.jersey) || null) + '<div><div class="pp-name">' + esc(name) + "</div>";
  if (mp && mp.transferNote) html += '<div class="tv-note">' + esc(mp.transferNote) + "</div>";
  html += '<div class="pp-meta">' + rankBadge(currentIntroRank(key), key) + esc(entry ? entry.name : key) + (entry && entry.conf ? " " + confBtnHTML(entry.conf) : "") + (((mp && mp.num) || (cached && cached.jersey) || (chn && chn.jersey)) ? " &middot; #" + ((mp && mp.num) || (cached && cached.jersey) || chn.jersey) : "") + (((mp && mp.pos) || (cached && cached.pos) || (chn && chn.pos)) ? " &middot; " + esc((mp && mp.pos) || (cached && cached.pos) || chn.pos) : "") + "</div></div></div>";
  html += '<div class="tv-sec"><div class="tv-title">INFO</div><div class="tv-note" id="pp-stamp">Player data as of page load — reopen the page to refresh.</div>';
  if (mp){
    if (mp.num != null) html += '<div class="tv-line">Number: #' + mp.num + "</div>";
    if (mp.pos) html += '<div class="tv-line">Position: ' + esc(mp.pos) + "</div>";
    if (mp.cls) html += '<div class="tv-line">Class: ' + esc(mp.cls) + "</div>";
    if (mp.ht) html += '<div class="tv-line">Height: ' + esc(mp.ht) + "</div>";
    if (mp.wt) html += '<div class="tv-line">Weight: ' + esc(mp.wt) + "</div>";
    if (mp.hometown) html += '<div class="tv-line">Hometown: ' + esc(mp.hometown) + "</div>";
    html += '<div class="tv-note">Bio source: merged roster model. ' + esc(modelHeaderLabel(key)) + "</div>";
  } else if (cached){
    html += '<div class="tv-line">Position: ' + esc(cached.pos || "not published") + "</div>";
    if (cached.jersey) html += '<div class="tv-line">Number: #' + cached.jersey + "</div>";
    if (cached.height) html += '<div class="tv-line">Height: ' + esc(cached.height) + "</div>";
    if (cached.weight) html += '<div class="tv-line">Weight: ' + esc(cached.weight) + "</div>";
    html += '<div class="tv-note">Bio source: ESPN team roster feed (as published). Full bios publish on the team\'s official roster page.</div>';
  } else if (chn){
    html += '<div class="tv-line">Position: ' + esc(chn.pos || "not published") + "</div>";
    if (chn.jersey) html += '<div class="tv-line">Number: #' + chn.jersey + "</div>";
    if (chn.ht) html += '<div class="tv-line">Height: ' + esc(chn.ht) + "</div>";
    if (chn.wt) html += '<div class="tv-line">Weight: ' + esc(chn.wt) + "</div>";
    html += '<div class="tv-note">Bio source: College Hockey News roster page (fetched live).</div>';
  } else {
    var prow0 = null; try{ var pd0 = packData(key); if (pd0 && pd0.roster) pd0.roster.forEach(function(pp){ if (pp.name === name) prow0 = pp; }); }catch(e){}
    if (prow0){
      html += '<div class="tv-line">Position: ' + esc(prow0.pos || "not published") + '</div>';
      if (prow0.cls) html += '<div class="tv-line">Class: ' + esc(prow0.cls) + '</div>';
      if (prow0.ht) html += '<div class="tv-line">Height: ' + esc(prow0.ht) + '</div>';
      if (prow0.wt) html += '<div class="tv-line">Weight: ' + esc(prow0.wt) + '</div>';
      if (prow0.hometown) html += '<div class="tv-line">Hometown: ' + esc(prow0.hometown) + '</div>';
      html += '<div class="tv-note">Bio source: verified team pack (official roster data as published).</div>';
    } else {
      html += '<div class="tv-note">No verified bio for this player in this app. Bios publish on the team\'s official roster page; this page shows only verified data below, never guessed details.</div>';
    }
  }
  try{ var pdp = packData(key); if (pdp){
    if (pdp.leaders) pdp.leaders.forEach(function(l){ if (l.name === name) html += '<div class="tv-line">Season scoring leader: ' + l.g + 'G ' + l.a + 'A, ' + l.pts + ' Pts' + (pdp.leaders_asof ? ' (' + esc(pdp.leaders_asof) + ')' : '') + '</div>'; });
    if (pdp.drafted) pdp.drafted.forEach(function(d){ if (d.player === name) html += '<div class="tv-line">NHL Draft: ' + esc(d.nhl || "team unverified") + (d.year ? ', ' + d.year : '') + (d.round ? ', Round ' + d.round : '') + (d.overall ? ', #' + d.overall + ' overall' : '') + '</div>'; });
  } }catch(e){}
  if (chn){
    if (chn.cls) html += '<div class="tv-line">Class: ' + esc(chn.cls) + "</div>";
    if (chn.hometown) html += '<div class="tv-line">Hometown: ' + esc(chn.hometown) + "</div>";
    if (chn.draft) html += '<div class="tv-line">NHL Draft: ' + esc(chn.draft) + "</div>";
    if (cached) html += '<div class="tv-note">Extra bio detail source: College Hockey News roster page (fetched live).</div>';
  }
  var pd = null; try{ pd = packData(key); }catch(e){}
  html += "</div>";
  var st = null; try{ st = playerSeasonStats(name, key); }catch(e){ st = null; }
  var playedVs = false; try{ playedVs = GAMES.some(function(g){ return g.status === "final" && g.short === key; }); }catch(e){}
  html += '<div class="tv-sec"><div class="tv-title">STATS</div>';
  if (!playedVs){
    html += '<div class="tv-note">Full-season stats for this player are not included in this app. See the official stats page for this team.</div>';
  } else if (st && (st.g || st.a || st.goalieGames.length)){
    html += '<div class="tv-line">Vs Michigan in 2026-27: ' + st.g + " goal" + (st.g === 1 ? "" : "s") + ", " + st.a + " assist" + (st.a === 1 ? "" : "s") + ", " + st.pts + " point" + (st.pts === 1 ? "" : "s") + "</div>";
    st.games.forEach(function(gm){ html += '<div class="tv-line">Game ' + gm.n + " (" + esc(fmtDate(gm.date)) + " vs Michigan): " + gm.g + "G " + gm.a + "A</div>"; });
    st.goalieGames.forEach(function(gm){ html += '<div class="tv-line">In goal, Game ' + gm.n + " (" + esc(fmtDate(gm.date)) + " vs Michigan): " + gm.sv + " saves, " + gm.ga + " allowed, " + esc(gm.min) + "</div>"; });
    html += '<div class="tv-note">Vs Michigan only, from this app\'s verified game data — not a full-season line. Full-season stats publish on the team\'s official stats page.</div>';
  } else if (playedVs){
    html += '<div class="tv-note">No goals or assists vs Michigan in verified 2026-27 game data so far. Full-season stats publish on the team\'s official stats page.</div>';
  } else {
    html += '<div class="tv-note">No verified game data for this player in 2026-27 yet. Full-season stats publish on the team\'s official stats page.</div>';
  }
  html += "</div>";
  html += '<div class="tv-sec"><div class="tv-title">NEWS</div><div class="tv-note">From saved team news (Oct 24, 2026).</div><div class="tv-note">No news item names this player. See the team news section for the latest team stories.</div></div>';
  html += "</div>";
  return html;
}
// ---------- directory + search + extras (v7) ----------
var dirConf = "All";
var dirQuery = "";
function allRosterPlayers(){
  var out = [];
  if (typeof TEAMS !== "undefined") Object.keys(TEAMS).forEach(function(k){
    ["F", "D", "G"].forEach(function(g){
      (TEAMS[k].roster[g] || []).forEach(function(r){ out.push({name: r[1], team: k}); });
    });
  });
  Object.keys(genericRosterCache).forEach(function(k){
    genericRosterCache[k].forEach(function(p){ out.push({name: p.name, team: k}); });
  });
  return out;
}
function renderDirectory(){
  var listEl = $("#dir-list"), resEl = $("#dir-results");
  if (!listEl) return;
  var q = (dirQuery || "").toLowerCase();
  var confs = ["Big Ten", "NCHC", "CCHA", "Hockey East", "ECAC", "AHA", "Independent"];
  var html = "";
  confs.forEach(function(c){
    if (dirConf !== "All" && dirConf !== c) return;
    var teams = DIRECTORY.filter(function(d){ return d.conf === c && (!q || (d.name + " " + d.nick + " " + d.city).toLowerCase().indexOf(q) !== -1); });
    if (!teams.length) return;
    html += '<div class="tv-sub">' + esc(c) + " (" + teams.length + ")</div>";
    teams.forEach(function(d){
      html += '<div class="dir-row" data-dir-team="' + esc(d.key) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(d.key), d.key) + teamLogoImg(d, "dir-logo") +
        '<span class="dir-name">' + esc(d.name) + " " + esc(d.nick) + "</span>" +
        confBtnHTML(d.conf) +
        '<span class="dir-meta">' + esc(d.city) + (d.titles.length ? " &middot; " + d.titles.length + "&times; champs" : "") + '</span>' +
        ('<button class="fav-star" data-fav-star="' + esc(d.key) + '" type="button" aria-label="Toggle favorite">' + (isFavorite(d.key) ? "★" : "☆") + "</button>") + "</div>";
    });
  });
  if (!html) html = '<div class="tv-note">No teams match that search.</div>';
  listEl.innerHTML = html;
  $$("[data-dir-team]", listEl).forEach(function(b){
    b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-dir-team")); });
  });
  $$("[data-fav-star]", listEl).forEach(function(b){
    b.addEventListener("click", function(e){ e.stopPropagation(); var k = b.getAttribute("data-fav-star"); toggleFavorite(k); b.textContent = isFavorite(k) ? "★" : "☆"; });
  });
  attachConfHandlers(listEl);
  if (resEl){
    if (!q){ resEl.innerHTML = ""; return; }
    var players = allRosterPlayers().filter(function(p){ return p.name.toLowerCase().indexOf(q) !== -1; }).slice(0, 30);
    var teamsHit = DIRECTORY.filter(function(d){ return (d.name + " " + d.nick).toLowerCase().indexOf(q) !== -1; }).slice(0, 10);
    var rh = '<div class="tv-sub">Search results</div>';
    teamsHit.forEach(function(d){ rh += '<div class="dir-row" data-dir-team="' + esc(d.key) + '" role="button" tabindex="0">' + rankBadge(currentIntroRank(d.key), d.key) + '<span class="dir-name">' + esc(d.name) + " " + esc(d.nick) + "</span><span class=\"dir-meta\">Team &middot; </span>" + confBtnHTML(d.conf) + "</div>"; });
    players.forEach(function(p){
      var t = dirEntry(p.team);
      rh += '<div class="dir-row" data-search-player="' + esc(p.name) + '" data-search-team="' + esc(p.team) + '" role="button" tabindex="0"><span class="dir-name">' + esc(p.name) + "</span><span class=\"dir-meta\">Player &middot; " + esc(t ? t.name : p.team) + "</span></div>";
    });
    if (!teamsHit.length && !players.length) rh += '<div class="tv-note">Nothing found for that search.</div>';
    resEl.innerHTML = rh;
    $$("[data-dir-team]", resEl).forEach(function(b){ b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-dir-team")); }); });
    $$("[data-search-player]", resEl).forEach(function(b){ b.addEventListener("click", function(){ showPlayerPage(b.getAttribute("data-search-team"), b.getAttribute("data-search-player")); }); });
    attachConfHandlers(resEl);
  }
}

// ---------- v30 poll records: full W-L-T, opener notes, live refresh ----------
// The Week 4 poll transcribed records as W-L with ties dropped when zero
// ("0-0", "5-1" beside "3-0-1"), so an unplayed team read as missing data.
// Every record now renders in full W-L-T form, and a 0-0-0 team shows its
// verified season opener beside the record (CHN schedules + official
// announcements, Oct 2026): Dartmouth opens Oct 31 vs Alaska, Cornell
// opens Oct 30 vs Sacred Heart. Both openers are regular-season games.
var POLL_META = {week: "Week 4", date: "Oct 19, 2026"};
var POLL_OPENER = {DART: "opens Oct 31 vs Alaska", COR: "opens Oct 30 vs Sacred Heart"};
function fmtPollRec(rec){
  if (!rec) return "—";
  var m = String(rec).match(/(\d+)[-–](\d+)(?:[-–](\d+))?/);
  if (!m) return String(rec);
  return m[1] + "-" + m[2] + "-" + (m[3] !== undefined ? m[3] : "0");
}
function pollOpenerFor(key){ return POLL_OPENER[key] || ""; }
function pollRecCell(r){
  var full = fmtPollRec(r.rec);
  var op = (full === "0-0-0") ? pollOpenerFor(r.key) : "";
  return full + (op ? " · " + op : "");
}
function parsePollRows(j){
  try{
    var lists = (j && j.rankings) || [];
    var newest = null;
    lists.forEach(function(r){ var v = (r.occurrence && r.occurrence.value) || 0; if (!newest || +v > +((newest.occurrence && newest.occurrence.value) || 0)) newest = r; });
    if (!newest || !newest.ranks || !newest.ranks.length) return null;
    var rows = [];
    newest.ranks.forEach(function(rk){
      var id = rk.team && rk.team.id;
      var key = id ? dirKeyForEspnId(id) : null;
      if (!key && rk.team && rk.team.displayName){
        (DIRECTORY || []).forEach(function(d){ if (d.name && d.name.toLowerCase() === String(rk.team.displayName).toLowerCase()) key = d.key; });
      }
      var recRaw = null;
      if (rk.record && typeof rk.record.summary === "string") recRaw = rk.record.summary;
      else if (typeof rk.recordSummary === "string") recRaw = rk.recordSummary;
      else if (typeof rk.summary === "string") recRaw = rk.summary;
      else if (typeof rk.record === "string") recRaw = rk.record;
      var rank = rk.current !== undefined ? +rk.current : (rk.rank !== undefined ? +rk.rank : null);
      if (key && rank && recRaw) rows.push({rank: rank, key: key, rec: recRaw, prev: rk.previous !== undefined ? +rk.previous : 0});
    });
    rows.sort(function(a, b){ return a.rank - b.rank; });
    if (rows.length < 15) return null;
    return {rows: rows, week: (newest.occurrence && newest.occurrence.displayValue) || "", date: newest.date ? newest.date.slice(0, 10) : ""};
  }catch(e){ return null; }
}

function renderExtras(){
  var el = $("#extras"); if (!el) return;
  var finals = GAMES.filter(function(g){ return g.status === "final"; });
  var upcoming = GAMES.filter(function(g){ return g.status !== "final"; });
  var last = finals[finals.length - 1];
  var html = "";
  // Next up + last result strip
  html += '<div class="tv-sec"><div class="tv-title">NEXT UP / LAST RESULT</div>';
  if (last) html += '<div class="tv-line">Last result: Michigan ' + last.mich + "&ndash;" + last.oppScore + " vs " + esc(last.opp) + " (" + fmtDate(last.date) + ", Final)</div>";
  upcoming.slice(0, 2).forEach(function(g){
    var ep = gameStartEpoch(g);
    var cd = (g.date === centralTodayISO(Date.now()) && ep) ? ' <span class="cd" data-cd-epoch="' + ep + '"></span>' : "";
    html += '<div class="tv-line">Next: ' + (g.home ? "vs " : "at ") + esc(g.opp) + " — " + fmtDate(g.date) + (timeCTLabel(g.timeCT, g.date) ? ", " + esc(timeCTLabel(g.timeCT, g.date)) : "") + ", " + esc(g.venue) + cd + "</div>";
  });
  html += "</div>";
  // Head-to-head (2026-27, bundled games only)
  html += '<div class="tv-sec"><div class="tv-title">HEAD-TO-HEAD (2026&ndash;27)</div>';
  var seen = {};
  GAMES.forEach(function(g){ if (!seen[g.short]) seen[g.short] = {opp: g.opp, w: 0, l: 0, gf: 0, ga: 0, played: 0}; });
  finals.forEach(function(g){
    var s = seen[g.short]; s.played++;
    if (g.mich > g.oppScore) s.w++; else if (g.mich < g.oppScore) s.l++;
    s.gf += g.mich; s.ga += g.oppScore;
  });
  Object.keys(seen).forEach(function(k){
    var s = seen[k];
    var row = s.played ? (s.w + "&ndash;" + s.l + ", goals " + s.gf + "&ndash;" + s.ga) : "not played yet";
    var dk = dirEntry(k);
    html += '<div class="tv-line"><span class="team-name-btn" data-team="' + esc(k) + '" role="button" tabindex="0">vs ' + esc(s.opp) + "</span>" + (dk ? " " + confBtnHTML(dk.conf) : "") + ": " + row + "</div>";
  });
  html += '<div class="tv-note">From 2026-27 games in this app only; all-time series history is not included.</div></div>';
  // Season leaders (computed from bundled official box scores)
  var pts = pointsComputed("MICH").slice(0, 5);
  var goalies = {};
  finals.forEach(function(g){ (g.goalies && g.goalies.mich ? g.goalies.mich : []).forEach(function(x){ if (!goalies[x.name]) goalies[x.name] = {sv: 0, ga: 0}; goalies[x.name].sv += x.sv; goalies[x.name].ga += x.ga; }); });
  var gk = Object.keys(goalies).sort(function(a, b){ return goalies[b].sv - goalies[a].sv; })[0];
  html += '<div class="tv-sec"><div class="tv-title">MICHIGAN SEASON LEADERS</div>';
  if (pts.length){
    html += '<div class="tv-sub">Points (7 games, official box scores)</div>';
    pts.forEach(function(p){ html += '<div class="tv-line">' + playerBtn(p.name, "MICH") + ": " + p.g + " G, " + p.a + " A, <b>" + (p.g + p.a) + " Pts</b></div>"; });
  }
  if (gk) html += '<div class="tv-line">Goaltending: ' + playerBtn(gk, "MICH") + " — " + goalies[gk].sv + " saves, " + goalies[gk].ga + " GA in these games</div>";
  html += '<div class="tv-note">Big Ten season leaders beyond the team data in this app are not included; see bigten.org for the full Big Ten leaders board.</div></div>';
  // Rankings: USCHO poll (bundled Week 4, Oct 19, 2026; refresh replaces it)
  html += '<div class="tv-sec" id="rankings-sec"><div class="tv-title">RANKINGS — USCHO MEN\'S POLL, ' + POLL_META.week.toUpperCase() + " (" + POLL_META.date.toUpperCase() + ")</div>";
  html += '<div class="tv-note">Source: ESPN rankings feed (USCHO Men\'s Poll, ' + POLL_META.week + ", dated " + POLL_META.date + "). Records are shown in full W-L-T form; a 0-0-0 team has not played a regular-season game yet — its opener is shown beside the record." + (POLL_META.week === "Week 4" ? " Michigan\'s 7th win (Oct 23) postdates this poll." : "") + "</div>";
  html += '<table class="tv-roster"><tr><th>#</th><th>Team</th><th>Record</th></tr>';
  USCHO_POLL.forEach(function(r){
    var d = dirEntry(r.key);
    var cls = r.key === "MICH" ? ' class="mich-row"' : "";
    html += '<tr' + cls + '><td>' + r.rank + '</td><td><span class="team-name-btn" data-team="' + esc(r.key) + '" role="button" tabindex="0">' + esc(d ? d.name : r.key) + "</span>" + (d ? " " + confBtnHTML(d.conf) : "") + "</td><td>" + esc(pollRecCell(r)) + "</td></tr>";
  });
  html += '</table>';
  html += '<div class="tv-note">Selection and seeding use the NCAA Percentage Index (NPI) starting in 2025-26. No NPI table is published in the ESPN rankings feed consulted, so none is shown here rather than an invented table. Tap Refresh below to check the feed for a newer poll week.</div>';
  html += '<button class="tv-back" id="rank-refresh" type="button">Refresh rankings</button><div class="tv-note" id="rank-stamp">' + (liveRanksExpired() ? 'Poll rank (' + POLL_META.date + ') — live rank expired.' : 'Poll: ' + POLL_META.week + ", " + POLL_META.date + ".") + "</div></div>";
  // Live scoreboard + today's games (filled by refreshLiveBoard)
  html += '<div class="tv-sec" id="live-sec"><div class="tv-title">LIVE SCOREBOARD — NCAA HOCKEY</div><div id="live-board"><div class="tv-note">Loading the NCAA scoreboard…</div></div></div>';
  // Venues
  var venues = {};
  GAMES.forEach(function(g){ if (!venues[g.venue]) venues[g.venue] = {n: 0, home: venueInfo(g.venue).home}; venues[g.venue].n++; });
  html += '<div class="tv-sec"><div class="tv-title">VENUES (2026&ndash;27 SCHEDULE)</div>';
  Object.keys(venues).forEach(function(v){
    html += '<div class="tv-line"><span class="venue-link" data-venue="' + esc(v) + '" role="button" tabindex="0">' + esc(v) + "</span>" + (venues[v].home ? " — home of " + esc(venues[v].home) : "") + " (" + venues[v].n + (venues[v].n === 1 ? " game" : " games") + ")</div>";
  });
  html += '<div class="tv-note">Arena capacities are not published in this app\'s sources and are not asserted here.</div></div>';
  el.innerHTML = html;
  attachLogoHandlers(el);
  attachPlayerHandlers(el);
  attachVenueHandlers(el);
  attachConfHandlers(el);
  $$("[data-team]", el).forEach(function(b){
    if (b.getAttribute("data-team-bound")) return;
    b.setAttribute("data-team-bound", "1");
    b.addEventListener("click", function(ev){ ev.stopPropagation(); teamZoomTo(b.getAttribute("data-team")); });
  });
  var rr = $("#rank-refresh");
  if (rr) rr.addEventListener("click", function(){ refreshRankings(true); });
}
// ---------- rankings refresh (ESPN feed; newer week replaces bundled) ----------
var rankingsLastCheck = 0;
function refreshRankings(force){
  var stamp = $("#rank-stamp") || {textContent: ""};
  if (!force){
    if (rankingsLastCheck && Date.now() - rankingsLastCheck < 15 * 60 * 1000) return;
    rankingsLastCheck = Date.now();
  }
  if (typeof fetch !== "function"){ stamp.textContent = "Rankings feed needs network access. Poll: " + POLL_META.week + ", " + POLL_META.date + "."; return; }
  stamp.textContent = "Checking the ESPN rankings feed…";
  fetch("https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/rankings").then(function(r){ return r.json(); }).then(function(j){
    try{ var parsed = parseLiveRanks(j); var pc = Object.keys(parsed).length; if (pc > 0){ saveLiveRanks(parsed); try{ refreshOpenTeamRanks(); }catch(e){} } }catch(e){}
    var poll = parsePollRows(j);
    if (!poll){ stamp.textContent = "Feed poll shape not recognized — the " + POLL_META.week + " table stands. Poll: " + POLL_META.week + ", " + POLL_META.date + "."; return; }
    var changed = (poll.week && poll.week !== POLL_META.week) || (poll.date && poll.date !== POLL_META.date);
    if (!changed){ stamp.textContent = "No newer poll in the feed. Poll: " + POLL_META.week + ", " + POLL_META.date + "."; return; }
    USCHO_POLL.length = 0; poll.rows.forEach(function(r){ USCHO_POLL.push(r); });
    if (poll.week) POLL_META.week = poll.week;
    if (poll.date) POLL_META.date = poll.date;
    try{ renderExtras(); }catch(e){}
    var st2 = $("#rank-stamp"); if (st2) st2.textContent = "Poll: " + POLL_META.week + ", " + POLL_META.date + " (live from ESPN feed). Table refreshed.";
  }).catch(function(){ var st3 = $("#rank-stamp"); if (st3) st3.textContent = "Rankings feed could not be reached. Poll: " + POLL_META.week + ", " + POLL_META.date + "."; });
}
window.__vmaxTest.fmtPollRec = fmtPollRec;
window.__vmaxTest.pollOpenerFor = pollOpenerFor;
window.__vmaxTest.parsePollRows = parsePollRows;
window.__vmaxTest.renderExtras = renderExtras;
// ---------- live scoreboard + ticker (ESPN scoreboard, past-week window) ----------
// v20 scroller rule (Victor 2026-10-24): the scroller shows ALL D1 recent
// scores — live games live-updating plus every team's most recent
// completed game, across days, not today only. The fetch window is today
// + the 7 prior days (8 single-day scoreboard fetches, using the same
// single-date URL syntax the today-only fetch always used — no range
// syntax is assumed). Today's fetch runs on the 30s poll; past days are
// cached up to 1 hour (a settled final never changes; the only movement
// is an in-progress game going final, caught at the next hourly refetch).
// Past days contribute POST events only — a stale "in" row from a prior
// day must never render as live.
var scoreboardCache = {date: "", events: [], fetchedAt: 0};
var pastDayCache = {};
var tickerItems = [];
var SCOREBOARD_WINDOW_PAST_DAYS = 7;
var SCOREBOARD_PAST_TTL = 3600000;
// v21: ESPN site-API sport segment, verified against two independent
// public references (Public-ESPN-API docs: hockey/mens-college-hockey;
// dev.to ESPN API article: hockey/nhl/scoreboard, all URLs HTTP 200).
// The app previously used ice_hockey here while its own team/news/
// rankings endpoints used hockey - that mismatch silently emptied the
// ticker on device. Primary is hockey; ice_hockey is kept ONLY as a
// fallback attempt, never as the first guess.
var SCOREBOARD_PRIMARY_SEGMENT = "hockey";
var SCOREBOARD_ALT_SEGMENT = "ice_hockey";
function scoreboardTodayURL(seg){
  var now = new Date(); var iso = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  return {iso: iso, url: scoreboardDayURL(iso, seg)};
}
function scoreboardDayURL(iso, seg){
  var segment = seg || SCOREBOARD_PRIMARY_SEGMENT;
  return "https://site.api.espn.com/apis/site/v2/sports/" + segment + "/mens-college-hockey/scoreboard?dates=" + iso.replace(/-/g, "");
}
function fetchScoreboardJson(iso, seg){
  return fetch(scoreboardDayURL(iso, seg)).then(function(r){ return r.json(); }).then(function(j){
    if (!j || !Array.isArray(j.events)) throw new Error("scoreboard payload has no events array");
    return j.events;
  });
}
function fetchScoreboardDayEvents(iso){
  return fetchScoreboardJson(iso, SCOREBOARD_PRIMARY_SEGMENT).catch(function(){
    return fetchScoreboardJson(iso, SCOREBOARD_ALT_SEGMENT);
  });
}

function isoDayOffset(back){
  var d = new Date(); d.setDate(d.getDate() - back);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// v8 scope: ticker + scoreboard are NCAA Division I MEN'S hockey only.
// The ESPN endpoint is already the men's-college-hockey scoreboard; this
// defensive filter drops anything whose own metadata marks it as women's
// or another league, and drops any event with no competitor resolving to
// the 63-program D1 directory (women's, D2/D3, or other-sport rows).
function isD1MensEvent(ev){
  try{
    var lg = ev && ev.league ? String(ev.league) : "";
    var sp = ev && ev.sport ? String(ev.sport) : "";
    if (/women/i.test(lg) || /women/i.test(sp)) return false;
  }catch(e){}
  var comp = ev && (ev.competitions || [])[0];
  var cs = comp ? (comp.competitors || []) : [];
  if (!cs.length) return false;
  var anyD1 = cs.some(function(c){ return c.team && dirKeyForEspnId(c.team.id); });
  return anyD1;
}
function fetchScoreboardDay(iso){
  if (typeof fetch !== "function") return Promise.resolve({events: [], fresh: false, ok: false});
  var now = Date.now();
  var c = pastDayCache[iso];
  if (c && (now - c.fetchedAt) < SCOREBOARD_PAST_TTL) return Promise.resolve({events: c.events, fresh: true, ok: true});
  return fetchScoreboardDayEvents(iso).then(function(allEvents){
    var evs = allEvents.filter(isD1MensEvent).filter(function(ev){ var g = boardGameInfo(ev); return g && g.state === "post"; });
    pastDayCache[iso] = {events: evs, fetchedAt: now};
    return {events: evs, fresh: true, ok: true};
  }).catch(function(){ return {events: (c && c.events) || [], fresh: false, ok: !!(c && c.events.length)}; });
}
function fetchScoreboardWindow(force){
  if (typeof fetch !== "function") return Promise.resolve({events: scoreboardCache.events, fresh: false, feedOk: false});
  var info = scoreboardTodayURL();
  var now = Date.now();
  var todayP;
  if (!force && scoreboardCache.date === info.iso && scoreboardCache.events.length && (now - scoreboardCache.fetchedAt) < 30000) todayP = Promise.resolve({events: scoreboardCache.events, fresh: true, ok: true});
  else todayP = fetchScoreboardDayEvents(info.iso).then(function(allEvents){
    var evs = allEvents.filter(isD1MensEvent);
    scoreboardCache = {date: info.iso, events: evs, fetchedAt: now};
    return {events: scoreboardCache.events, fresh: true, ok: true};
  }).catch(function(){ return {events: scoreboardCache.events, fresh: false, ok: !!(scoreboardCache.events && scoreboardCache.events.length)}; });
  var pastIsos = [];
  for (var b = 1; b <= SCOREBOARD_WINDOW_PAST_DAYS; b++) pastIsos.push(isoDayOffset(b));
  var pastPs = pastIsos.map(function(iso){ return fetchScoreboardDay(iso); });
  return Promise.all([todayP].concat(pastPs)).then(function(parts){
    var merged = [];
    for (var i = parts.length - 1; i >= 1; i--) merged = merged.concat(parts[i].events);
    merged = merged.concat(parts[0].events);
    var feedOk = parts.some(function(p){ return !!p.ok; });
    return {events: merged, fresh: parts[0].fresh, feedOk: feedOk};
  });
}
function boardGameInfo(ev){
  var comp = (ev.competitions || [])[0]; if (!comp) return null;
  var cs = comp.competitors || [];
  var home = null, away = null;
  cs.forEach(function(c){ if (c.homeAway === "home") home = c; else away = c; });
  if (!home && cs.length) home = cs[0];
  if (!away && cs.length > 1) away = cs[1];
  if (!home || !away) return null;
  var state = ev.status && ev.status.type ? ev.status.type.state : "";
  var hs = home.score !== undefined && home.score !== null ? String(home.score) : null;
  var as = away.score !== undefined && away.score !== null ? String(away.score) : null;
  var clock = (ev.status && ev.status.displayClock ? ev.status.displayClock + " " : "") + (ev.status && ev.status.period ? "P" + ev.status.period : "");
  var ven = comp.venue ? comp.venue.fullName || "" : "";
  var isMich = cs.some(function(c){ return c.team && isMichiganTeam(c.team); });
  return {ev: ev, home: home, away: away, state: state, hs: hs, as: as, clock: clock, venue: ven, isMich: isMich,
    homeKey: dirKeyForEspnId(home.team.id), awayKey: dirKeyForEspnId(away.team.id),
    homeName: home.team.displayName || "", awayName: away.team.displayName || "",
    homeAbbr: home.team.abbreviation || "", awayAbbr: away.team.abbreviation || ""};
}
// v18: full-slot board detail. A ticker / live-board / schedule tap opens
// the whole game slot, not a thin card: live score (refreshable), date /
// time / venue, watch options (honest empty state — never an invented
// outlet), a per-game video-stream slot and per-game links slot (board
// keys, never the Michigan numeric keys, so the global Michigan handlers
// can never intercept them), default links, radio, highlights, box score,
// and both teams' records / ranks from TEAM_DATA labeled with as-of dates.
var openBoardDetail = null;
function boardDetailId(g){
  if (g.evId) return "ev" + String(g.evId);
  return "k-" + (g.awayKey || "x") + "-" + (g.homeKey || "x") + "-" + (g.dateISO || "");
}
function boardDetailScoreParts(state, clock, awayName, as, homeName, hs){
  var score = "", status = "";
  if (as !== null && as !== undefined && hs !== null && hs !== undefined){
    score = esc(awayName) + " " + esc(String(as)) + " — " + esc(homeName) + " " + esc(String(hs));
  } else {
    score = "Upcoming — no score yet";
  }
  status = state === "in" ? ("LIVE " + esc(clock || "")) : (state === "post" ? "Final" : "Upcoming");
  return {score: score, status: status};
}
function boardTeamRecordRank(key){
  var pd = null;
  try{ pd = packData(key); }catch(e){}
  var de = dirEntry(key);
  var nm = de ? de.name : (key || "?");
  var rec = "record not verified";
  if (pd && pd.record) rec = esc(pd.record) + " (as of " + esc(pd.record_asof || "undated") + ")";
  var live = null;
  try{ live = loadLiveRanks(); }catch(e){}
  var rk = "unranked";
  if (live && typeof live[key] === "number") rk = "#" + live[key] + " (live)";
  else if (pd && pd.rank) rk = "#" + pd.rank + " (as of " + esc(pd.rank_asof || "undated") + ")";
  var extra = "";
  if (pd && pd.arena) extra += '<div class="tv-line">Home arena: ' + esc(pd.arena) + "</div>";
  if (pd && pd.coach) extra += '<div class="tv-line">Head coach: ' + esc(pd.coach) + "</div>";
  return '<div class="tv-line"><b>' + esc(nm) + "</b></div>" +
    '<div class="tv-line">Record: ' + rec + "</div>" +
    '<div class="tv-line">Ranking: ' + rk + "</div>" + extra;
}
function boardStreamSavedHTML(boardId){
  var saved = load("board_stream_" + boardId, "");
  if (!saved) return "";
  return '<div class="stream-saved" id="board-stream-saved-' + esc(boardId) + '"><a href="' + esc(saved) + '">Watch &middot; Video stream</a> <button data-board-stream-play="' + esc(boardId) + '" type="button">Watch in app</button> <button data-board-stream-del="' + esc(boardId) + '" type="button">Remove</button></div>';
}
function boardLinksChipsHTML(boardId){
  var links = load("board_links_" + boardId, []);
  var html = "";
  links.forEach(function(l, i){
    html += '<span class="chip"><a href="' + esc(l.url) + '">' + esc(l.label) + '</a> <button class="chip-x" data-board-link-del="' + esc(boardId) + '" data-board-link-i="' + i + '" type="button" aria-label="Remove link">&times;</button></span>';
  });
  return html;
}
// v19: research-pack broadcast notes surfaced in board detail, labeled with
// provenance. A pack note is NEVER a confirmed carrier for this specific
// game — conference/series-level notes stay labeled as such, and entries
// that disclaim verification ("not verified") stay in the honest empty
// state instead of being shown.
function packBroadcastNoteHTML(key, radioOnly){
  try{
    var pd = packData(key); if (!pd || !pd.game_data) return "";
    var src = pd.game_data.broadcast_source || "";
    if (!src || /not verified/i.test(src)) return "";
    if (radioOnly && !/radio|audio|\bFM\b|\bAM\b|station/i.test(src)) return "";
    var txt = String(src);
    if (txt.length > 240) txt = txt.slice(0, 240) + "…";
    return '<div class="tv-line">Research-pack broadcast note for ' + esc(pd.name || key) + ' (NOT verified as this game\'s carrier — check the outlet for this game): ' + esc(txt) + '</div>';
  }catch(e){ return ""; }
}
function showGameDetail(g){
  var card = $("#gamedetail"), body = $("#gamedetail-body");
  if (!card || !body) return;
  // Callers pass either {homeName, awayName, hs, as} or {home, away,
  // homeScore, awayScore}; normalize so names/scores never render undefined.
  g = {homeName: g.homeName || g.home, awayName: g.awayName || g.away,
    hs: (g.hs !== undefined && g.hs !== null) ? g.hs : g.homeScore,
    as: (g.as !== undefined && g.as !== null) ? g.as : g.awayScore,
    state: g.state, clock: g.clock, venue: g.venue,
    homeKey: g.homeKey, awayKey: g.awayKey, michGame: g.michGame, broadcasts: g.broadcasts || [], boxUrl: g.boxUrl || null,
    ev: g.ev || null, evId: g.evId || (g.ev && g.ev.id) || null,
    dateISO: g.dateISO || (g.ev && g.ev.date ? g.ev.date.slice(0, 10) : ""),
    timeCT: g.timeCT || ""};
  var boardId = boardDetailId(g);
  var parts = boardDetailScoreParts(g.state, g.clock, g.awayName, g.as, g.homeName, g.hs);
  var dtTxt = "";
  if (g.ev){ var dt = boardGameDateTime(g.ev); dtTxt = (dt.date ? dt.date : "Date not published in the feed") + (dt.time ? " · " + dt.time : ""); }
  else if (g.dateISO){ var gzt = displayZoneTime(g.timeCT, g.dateISO); dtTxt = fmtDate(g.dateISO) + (gzt ? " · " + esc(gzt) : ""); }
  else dtTxt = "Date/time not published in the feed";
  var html = '<div class="tv-title">GAME DETAILS</div>';
  var homeBtn = (g.homeKey ? rankBadge(currentIntroRank(g.homeKey), g.homeKey) : "") + (g.homeKey ? '<span class="team-name-btn" data-team="' + esc(g.homeKey) + '" role="button" tabindex="0">' + esc(g.homeName) + "</span>" : esc(g.homeName));
  var awayBtn = (g.awayKey ? rankBadge(currentIntroRank(g.awayKey), g.awayKey) : "") + (g.awayKey ? '<span class="team-name-btn" data-team="' + esc(g.awayKey) + '" role="button" tabindex="0">' + esc(g.awayName) + "</span>" : esc(g.awayName));
  html += '<div class="tv-line"><b>' + awayBtn + " at " + homeBtn + "</b></div>";
  html += '<div class="tab-bar" role="tablist"><button class="tab-btn active" data-gd-tab="details" type="button" aria-selected="true">DETAILS</button><button class="tab-btn" data-gd-tab="boxscore" type="button" aria-selected="false">BOX SCORE</button></div>';
  html += '<div id="gd-tab-details">';
  html += '<div class="sec"><div class="sec-title">LIVE SCORE</div>' +
    '<div class="tv-line" id="gd-score">' + parts.score + "</div>" +
    '<div class="tv-line" id="gd-status">' + parts.status + "</div></div>";
  html += '<div class="sec"><div class="sec-title">DATE / TIME / VENUE</div>' +
    '<div class="tv-line">' + dtTxt + "</div>" +
    '<div class="tv-line">' + (g.venue ? esc(g.venue) : "Venue not published in the feed") + "</div></div>";
  var gdH2h = (g.homeKey && g.awayKey) ? h2hLine(g.homeKey, g.awayKey) : "";
  if (gdH2h) html += '<div class="sec"><div class="sec-title">SERIES HISTORY</div><div class="tv-line">' + esc(gdH2h) + '</div></div>';
  html += '<div class="sec"><div class="sec-title">WATCH</div>' +
    ((g.broadcasts && g.broadcasts.length) ? '<div class="tv-line">Channels (live feed): ' + esc(g.broadcasts.join(", ")) + "</div>"
    : '<div class="tv-line">No verified carrier for this game in this build. Carriers are listed per game only where verified — none is guessed here.</div>') +
    packBroadcastNoteHTML(g.homeKey, false) + packBroadcastNoteHTML(g.awayKey, false) + '</div>';
  html += gameSlotsHTML("board_" + boardId);
  html += defaultLinksHTML();
  html += '<div class="sec"><div class="sec-title">RADIO</div>' +
    '<div class="tv-line">No verified radio stream for this game in this build. Check the home team\'s official site for its broadcast.</div>' +
    packBroadcastNoteHTML(g.homeKey, true) + packBroadcastNoteHTML(g.awayKey, true) + '</div>';
  var gdHl = (g.dateISO && (g.homeKey || g.awayKey)) ? gameHighlightURL(g.homeKey, g.awayKey, g.dateISO) : null;
  html += '<div class="sec"><div class="sec-title">HIGHLIGHTS</div>' +
    (gdHl ? '<div class="tv-line"><button data-gd-hl data-hl-url="' + esc(gdHl.url) + '" data-hl-title="' + esc(gdHl.title) + '" type="button">Watch highlights</button> ' + esc(gdHl.title) + ' — plays in the app, fullscreen.</div>'
    : '<div class="tv-line">No verified highlights for this game yet. Highlights appear here only when a video is verified as this exact game — nothing random, nothing guessed.</div>') + '</div>';


  if (g.awayKey || g.homeKey){
    html += '<div class="sec"><div class="sec-title">TEAM RECORDS &amp; RANKS</div>';
    if (g.awayKey) html += boardTeamRecordRank(g.awayKey);
    if (g.homeKey) html += boardTeamRecordRank(g.homeKey);
    html += "</div>";
  }
  if (g.michGame) html += '<div class="tv-note">Michigan game — tap below to open its full details on the home schedule.</div>';
  html += '</div><div id="gd-tab-boxscore" hidden><div class="sec"><div class="sec-title">BOX SCORE</div><div id="gd-boxscore-lines">Loading box score…</div></div></div>';
  body.innerHTML = html;
  card.hidden = false;
  openBoardDetail = g.michGame ? null : {evId: g.evId, awayKey: g.awayKey, homeKey: g.homeKey, dateISO: g.dateISO, boardId: boardId, state: g.state, boxUrl: g.boxUrl};
  syncBackState();
  $$("[data-team]", body).forEach(function(b){
    b.addEventListener("click", function(){ card.hidden = true; openBoardDetail = null; teamZoomTo(b.getAttribute("data-team")); });
  });
  $$("[data-gd-tab]", body).forEach(function(b){
    if (b.getAttribute("data-gd-bound")) return;
    b.setAttribute("data-gd-bound", "1");
    b.addEventListener("click", function(){
      var tab = b.getAttribute("data-gd-tab");
      $$("[data-gd-tab]", body).forEach(function(x){ x.classList.toggle("active", x === b); x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      var det = $("#gd-tab-details"), bx = $("#gd-tab-boxscore");
      if (det) det.hidden = (tab !== "details");
      if (bx) bx.hidden = (tab !== "boxscore");
      if (tab === "boxscore" && gdBoxEvId && (gdBoxLive || gdBoxFailed)) fetchEspnSummaryBoxscore(gdBoxEvId, "gd-boxscore-lines", {boxUrl: gdBoxUrl, periods: true});
    });
  });
  gdBoxEvId = null; gdBoxLive = false; gdBoxFailed = false; gdBoxUrl = g.boxUrl;
  kickoffBoxscore({evId: g.evId, state: g.state, homeKey: g.homeKey, awayKey: g.awayKey, dateISO: g.dateISO, elId: "gd-boxscore-lines", boxUrl: g.boxUrl, periods: true});
  if (g.michGame){
    var go = document.createElement("button");
    go.className = "tv-back"; go.type = "button"; go.textContent = "Open Michigan game details";
    go.addEventListener("click", function(){
      card.hidden = true; openBoardDetail = null; openMichiganGameFromTicker(g.michGame);
    });
    body.appendChild(go);
  }
}
function bindBoardStreamButtons(){
  var body = $("#gamedetail-body"); if (!body) return;
  $$("[data-board-stream-play]", body).forEach(function(b){
    if (b.getAttribute("data-board-bound")) return;
    b.setAttribute("data-board-bound", "1");
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-board-stream-play");
      var su = load("board_stream_" + id, "");
      if (su) openVideoWindow(su, "Board game · Video stream");
    });
  });
  $$("[data-board-stream-del]", body).forEach(function(b){
    if (b.getAttribute("data-board-bound")) return;
    b.setAttribute("data-board-bound", "1");
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-board-stream-del");
      save("board_stream_" + id, "");
      var inp = $("#bsu-" + id); if (inp) inp.value = "";
      var wrap = $("#board-stream-wrap-" + id);
      if (wrap) wrap.innerHTML = "";
    });
  });
}
function bindBoardLinkButtons(){
  var body = $("#gamedetail-body"); if (!body) return;
  $$("[data-board-link-del]", body).forEach(function(b){
    if (b.getAttribute("data-board-bound")) return;
    b.setAttribute("data-board-bound", "1");
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-board-link-del");
      var gi = +b.getAttribute("data-board-link-i");
      var links = load("board_links_" + id, []);
      links.splice(gi, 1);
      save("board_links_" + id, links);
      var chips = $("#board-links-chips-" + id);
      if (chips) chips.innerHTML = boardLinksChipsHTML(id);
    });
  });
}
// v18 live refresh for an open board detail: only #gd-score / #gd-status
// ever change, so user inputs in the card are never wiped. Matched by ESPN
// event id, else by team keys + Central date.
function refreshOpenBoardDetail(events){
  try{
    if (!openBoardDetail) return;
    var card = $("#gamedetail"); if (!card || card.hidden) return;
    var found = null;
    (events || []).forEach(function(ev){
      if (found) return;
      if (openBoardDetail.evId && ev.id && String(ev.id) === String(openBoardDetail.evId)){ found = ev; return; }
      var g = boardGameInfo(ev); if (!g) return;
      var d = "";
      try{ d = centralTodayISO(Date.parse(ev.date)); }catch(e){}
      if (g.awayKey === openBoardDetail.awayKey && g.homeKey === openBoardDetail.homeKey && d === openBoardDetail.dateISO) found = ev;
    });
    if (!found) return;
    var g = boardGameInfo(found); if (!g) return;
    var parts = boardDetailScoreParts(g.state, g.clock, g.awayName, g.as, g.homeName, g.hs);
    var sc = $("#gd-score"), st = $("#gd-status");
    if (sc) sc.innerHTML = parts.score;
    if (st) st.textContent = parts.status;
    if (g.state === "post" && openBoardDetail.state !== "post"){
      openBoardDetail.state = "post";
      kickoffBoxscore({evId: openBoardDetail.evId || (found && found.id) || null, state: "post", homeKey: openBoardDetail.homeKey, awayKey: openBoardDetail.awayKey, dateISO: openBoardDetail.dateISO, elId: "gd-boxscore-lines", boxUrl: openBoardDetail.boxUrl, periods: true});
    }
  }catch(e){}
}
function tickerItemHTML(it){
  // v21: plain-text ticker items (failure / empty-window / loading
  // notices) render as static text - no logos, no button role, no tap.
  if (it.text) return '<span class="ticker-item ticker-static ticker-text">' + esc(it.text) + "</span>";
  var cls = "ticker-item";
  // Logos ONLY for team identity: the team's own bundled primary mark in
  // its own colors, or the neutral initials badge where no mark is
  // obtainable. No team name text is rendered in the ticker, ever.
  var logo = function(key, abbr){
    if (!key) return "";
    var wf = whiteTickerFile(key);
    if (wf) return '<img class="ticker-logo" src="' + esc(wf) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span class="ticker-badge" style="display:none">' + esc(abbr || key || "?") + "</span>";
    return '<span class="ticker-badge">' + esc(abbr || key || "?") + "</span>";
  };
  // v9 interactivity: the "No games today" fallback has no destination, so
  // it renders as plain display text — no button role, no tabindex, no
  // pointer cue — never a dead tap pretending to be tappable.
  if (!it.michGame && !it.board) cls = "ticker-item ticker-static";
  // v22 ESPN-style scroller: each team's score sits immediately right of
  // that team's logo (logo + score pairs). Upcoming games (no scores
  // yet) keep logo-vs-logo. The combined "3-2" between logos is gone.
  var scorePart;
  if (it.awayScore !== null && it.awayScore !== undefined && it.homeScore !== null && it.homeScore !== undefined){
    scorePart = logo(it.awayKey, it.awayAbbr) +
      '<span class="ticker-score">' + esc(String(it.awayScore)) + '</span>' +
      '<span class="ticker-sep">–</span>' +
      logo(it.homeKey, it.homeAbbr) +
      '<span class="ticker-score">' + esc(String(it.homeScore)) + '</span>';
  } else {
    scorePart = logo(it.awayKey, it.awayAbbr) +
      '<span class="ticker-score">' + esc(it.score) + "</span>" +
      logo(it.homeKey, it.homeAbbr);
  }
  return '<span class="' + cls + '" data-ticker-idx="' + it.idx + '"' + ((it.michGame || it.board) ? ' role="button" tabindex="0"' : '') + '>' +
    scorePart +
    '<span class="ticker-state">' + esc(it.stateTxt) + "</span>" +
    (it.cdEpoch ? '<span class="cd" data-cd-epoch="' + it.cdEpoch + '"></span>' : "") + "</span>";
}
// v20 retention rule (Victor 2026-10-24): a completed game stays in the
// scroller up to ONE WEEK from its date, and is replaced sooner when its
// team plays again. Applied per team: each team's slot holds its single
// most recent final inside the window (live games show alongside and do
// not supersede finals — a live game is not a result yet). A game is
// therefore shown while it is the most recent final of AT LEAST ONE of
// its two teams — a same-matchup rematch supersedes immediately (both
// teams' newest changes at once); a game whose opponent moved on stays
// as that opponent's newest until the opponent plays again or it ages
// past 7 days. Past 7 days with no newer game, the team's item drops out
// rather than showing a stale score; nothing is ever invented to fill
// it. Dateless finals cannot be aged, so they are omitted, never dated
// by guesswork. Order is the merged feed order (chronological ascending);
// Michigan is never moved first.
var TICKER_FINAL_MAX_AGE = 7 * 24 * 3600 * 1000;
function selectTickerFinals(events, nowMs){
  var now = nowMs || Date.now();
  var posts = [];
  (events || []).forEach(function(ev){ var g = boardGameInfo(ev); if (g && g.state === "post") posts.push(ev); });
  var newestByTeam = {};
  posts.forEach(function(ev){
    var ep = null;
    try{ ep = Date.parse(ev.date); }catch(e){}
    if (!ep || isNaN(ep) || ep > now || (now - ep) > TICKER_FINAL_MAX_AGE) return;
    var g = boardGameInfo(ev);
    [String(g.home.team.id), String(g.away.team.id)].forEach(function(tid){
      var cur = newestByTeam[tid];
      if (!cur || ep >= cur.ep) newestByTeam[tid] = {ev: ev, ep: ep};
    });
  });
  return posts.filter(function(ev){
    var g = boardGameInfo(ev);
    var h = newestByTeam[String(g.home.team.id)], a = newestByTeam[String(g.away.team.id)];
    return (h && h.ev === ev) || (a && a.ev === ev);
  });
}
// ---------- v32.17 (p5) JS-driven ticker, v32.18 (p6) geometry restore ----------
// Replaces the CSS ticker-scroll animation (present in the bundle yet
// completely still on Victor's phone, 2026-10-27). Advances the track's
// transform on requestAnimationFrame using measured content width, so it
// does not depend on WebView CSS-animation compositing on a flex-sized
// track. Seamless loop: two identical groups, wrap at one group width.
// Pace matches the old animation: one full loop (one group width) in
// max(45, items*7) seconds.
var tickerOffsetPx = 0;
var tickerLastTs = 0;
var tickerRafId = 0;
var tickerSig = "";
var tickerDurationSec = 60;
// v32.30: driver generation. A force-restart bumps the generation and
// each loop frame carries the generation it started with, so a stale
// loop exits instead of rescheduling — without this, a restarted driver
// would run twice and scroll at double speed.
var tickerGen = 0;
var tickerFallbackTimer = null;
// v32.30: wall-clock time of the last ticker step (the rAF clock and
// Date.now() are different clocks; the watchdog must use this one).
var tickerLastWall = 0;
// v32.30: minimum visible speed, applied ONLY to short slates (one
// group width at or under 400px). Duration scales with slate size, so a
// one-item slate crawled at half/45 px per second and looked still —
// the short-content apparent standstill. 20 px/s stays readable and is
// visibly moving on any slate. Long slates keep the duration pace.
var TICKER_MIN_SPEED_PX_S = 20;
var TICKER_SHORT_HALF_PX = 400;
function tickerHalfWidth(){
  var t = $("#ticker-track"); if (!t) return 0;
  var sw = 0; try{ sw = t.scrollWidth || 0; }catch(e){}
  return sw / 2;
}
function tickerStep(nowMs){
  var track = $("#ticker-track"); if (!track) return;
  var half = tickerHalfWidth();
  if (half <= 0){ track.style.transform = ""; tickerOffsetPx = 0; tickerLastTs = nowMs; tickerLastWall = Date.now(); return; }
  // v32.18 (p6): NO half<=vis guard. The working v32.15 version scrolled
  // regardless of content length, and Victor's frozen strip proves the
  // slate can be a single short item — the driver must move it anyway,
  // wrapping at one group width. Only the half<=0 guard stays.
  var dt = nowMs - tickerLastTs; tickerLastTs = nowMs; tickerLastWall = Date.now();
  if (!(dt >= 0) || dt > 250) dt = 0;
  var speed = half / tickerDurationSec;
  if (half <= TICKER_SHORT_HALF_PX && speed < TICKER_MIN_SPEED_PX_S) speed = TICKER_MIN_SPEED_PX_S;
  tickerOffsetPx = (tickerOffsetPx + dt / 1000 * speed) % half;
  track.style.transform = "translateX(-" + tickerOffsetPx + "px)";
}
function tickerTick(ts){
  tickerTickWithGen(ts, tickerGen);
}
function tickerTickWithGen(ts, gen){
  try{ tickerStep(typeof ts === "number" ? ts : Date.now()); }catch(e){}
  if (gen !== tickerGen) return; // superseded loop: do not reschedule
  if (typeof requestAnimationFrame === "function") tickerRafId = requestAnimationFrame(function(ts2){ tickerTickWithGen(ts2, gen); });
}
function startTickerDriver(force){
  if (!force && tickerRafId) return;
  if (force){
    try{ if (tickerFallbackTimer){ clearInterval(tickerFallbackTimer); tickerFallbackTimer = null; } }catch(e){}
    tickerGen++;
    tickerRafId = 0;
  }
  var gen = tickerGen;
  if (typeof requestAnimationFrame === "function"){ tickerLastTs = 0; tickerLastWall = Date.now(); tickerRafId = requestAnimationFrame(function(ts){ tickerTickWithGen(ts, gen); }); }
  else { tickerLastTs = Date.now(); tickerLastWall = Date.now(); tickerFallbackTimer = setInterval(function(){ try{ tickerStep(Date.now()); }catch(e){} }, 50); tickerRafId = tickerFallbackTimer; }
}
// v32.30: driver watchdog. If the track has content but no step has run
// in 3s, the driver stalled — force-restart it. Skipped while the page
// is hidden (rAF legitimately pauses there) and when there is nothing
// to scroll. Called every second from tickCountdowns.
function tickerWatchdog(){
  try{
    var vs = ""; try{ vs = document.visibilityState; }catch(e){}
    if (vs === "hidden") return; // backgrounded: rAF legitimately pauses
    var track = $("#ticker-track"); if (!track) return;
    if (tickerHalfWidth() <= 0) return;
    if (tickerLastWall > 0 && Date.now() - tickerLastWall > 3000) startTickerDriver(true);
  }catch(e){}
}
function renderTicker(events, feedOk){
  var track = $("#ticker-track"); if (!track) return;
  var items = [];
  var now = Date.now();
  // v19 scroller rule (Victor 2026-10-24): the scroller shows ALL current
  // scores across the league — every live game and the league's recent
  // finals from the board feed (v20: past-week window, not today only),
  // Michigan matchups included via the feed, never privileged first.
  // Completed items carry DATE + score (v19 finals showed no date).
  // Upcoming entries appear ONLY inside the gameday window
  // [puck drop - 60 min, puck drop); outside it, NO upcoming entry at
  // all — upcoming games live in team schedules only.
  var feedItems = [];
  var keptFinals = selectTickerFinals(events, now);
  (events || []).forEach(function(ev){
    var g = boardGameInfo(ev); if (!g) return;
    var dt = boardGameDateTime(g.ev);
    var base = {mich: false, awayKey: g.awayKey, homeKey: g.homeKey,
      awayAbbr: g.awayAbbr, homeAbbr: g.homeAbbr,
      awayEspn: g.away.team.id, homeEspn: g.home.team.id,
      awayScore: g.as, homeScore: g.hs,
      board: g, michGame: michGameNumForBoard(g) || null};
    if (g.state === "in"){
      base.score = (g.hs !== null && g.as !== null) ? (g.as + "–" + g.hs) : "vs";
      base.stateTxt = "LIVE " + g.clock + " · " + dt.date;
      feedItems.push(base);
    } else if (g.state === "post"){
      if (keptFinals.indexOf(ev) === -1) return; // superseded or stale (>7d)
      base.score = (g.hs !== null && g.as !== null) ? (g.as + "–" + g.hs) : "vs";
      base.stateTxt = dt.date ? ("Final · " + dt.date) : "Final";
      feedItems.push(base);
    } else {
      var evEp = null;
      try{ evEp = Date.parse(g.ev.date); }catch(e){}
      if (!evEp || isNaN(evEp)) return; // dateless start: no window, no entry
      var diff = evEp - now;
      if (diff > 0 && diff <= 3600000){
        base.score = "vs";
        base.stateTxt = "Upcoming · " + dt.date + " · " + dt.time;
        base.cdEpoch = evEp;
        feedItems.push(base);
      }
    }
  });
  if (feedItems.length){
    items = feedItems;
  } else if (feedOk === false){
    // v21 HONEST FAILURE STATE: the league feed failed or returned no
    // usable events. The ticker must NEVER silently narrow to
    // Michigan-only and pretend that is the league (the v20 device
    // defect). The unavailable notice leads, and any Michigan items
    // below it are explicitly the Michigan-only fallback - live game,
    // else latest final, plus the next upcoming game ONLY inside its
    // T-60 window (a no-time game has no epoch and never qualifies).
    items.push({text: "League scores unavailable \u2014 showing Michigan only"});
    var liveMich = GAMES.filter(function(g){ return g.live; })[0];
    var finals = GAMES.filter(function(g){ return g.status === "final"; });
    var upcoming = GAMES.filter(function(g){ return g.status !== "final"; });
    if (liveMich){
      items.push({mich: true, awayKey: liveMich.home ? liveMich.short : "MICH", homeKey: liveMich.home ? "MICH" : liveMich.short,
        awayAbbr: liveMich.home ? liveMich.short : "MICH", homeAbbr: liveMich.home ? "MICH" : liveMich.short,
        awayEspn: null, homeEspn: null, score: (liveMich.home ? liveMich.oppScore : liveMich.mich) + "–" + (liveMich.home ? liveMich.mich : liveMich.oppScore),
        awayScore: liveMich.home ? liveMich.oppScore : liveMich.mich, homeScore: liveMich.home ? liveMich.mich : liveMich.oppScore,
        stateTxt: "LIVE " + (liveMich.periodLabel || "") + " · " + fmtDate(liveMich.date), michGame: liveMich.n});
    } else {
      if (finals.length){
        var lf = finals[finals.length - 1];
        items.push({mich: true, awayKey: lf.home ? lf.short : "MICH", homeKey: lf.home ? "MICH" : lf.short,
          awayAbbr: lf.home ? lf.short : "MICH", homeAbbr: lf.home ? "MICH" : lf.short,
          awayEspn: null, homeEspn: null, score: (lf.home ? lf.oppScore : lf.mich) + "–" + (lf.home ? lf.mich : lf.oppScore),
          awayScore: lf.home ? lf.oppScore : lf.mich, homeScore: lf.home ? lf.mich : lf.oppScore, stateTxt: "Final · " + fmtDate(lf.date), michGame: lf.n});
      }
      if (upcoming.length){
        var nx = upcoming[0];
        var nxEp = gameStartEpoch(nx);
        if (nxEp && nxEp - now > 0 && nxEp - now <= 3600000){
          items.push({mich: true, awayKey: nx.home ? nx.short : "MICH", homeKey: nx.home ? "MICH" : nx.short,
            awayAbbr: nx.home ? nx.short : "MICH", homeAbbr: nx.home ? "MICH" : nx.short,
            awayEspn: null, homeEspn: null, score: esc(timeShortLabel(nx.timeCT, nx.date)), stateTxt: fmtDate(nx.date), michGame: nx.n,
            cdEpoch: nxEp});
        }
      }
    }
  } else if (feedOk === true){
    // Feed answered and the past-week window genuinely holds no league
    // item: say so plainly, with no stale Michigan fallback.
    items.push({text: "No league games in the past week"});
  } else {
    // No feed verdict yet (first paint, before the first fetch
    // resolves): neutral loading text, replaced by refreshLiveBoard.
    items.push({text: "Loading league scores\u2026"});
  }
  if (!items.length) items.push({mich: false, awayKey: null, homeKey: null, awayAbbr: "", homeAbbr: "", awayEspn: null, homeEspn: null, score: "", stateTxt: "No games today", board: null});
  tickerItems = items.map(function(it, i){ it.idx = i; return it; });
  // Seamless auto-loop: two IDENTICAL groups, each ending with its own
  // separator, so a -50% shift lands exactly on the second group's start
  // with no visible jump. Pace adapts to slate size (~7s per game, floor
  // 45s) so scores stay readable, never a blur.
  var sep = '<span class="ticker-sep">•</span>';
  var group = tickerItems.map(tickerItemHTML).join(sep) + sep;
  // v32.17: re-render ONLY when content actually changed, so a live
  // refresh never resets the scroll position mid-loop.
  tickerDurationSec = Math.max(45, tickerItems.length * 7);
  var tickSig = tickerItems.length + "|" + group;
  if (tickSig !== tickerSig){
    tickerSig = tickSig;
    track.innerHTML = group + group;
    var half0 = tickerHalfWidth();
    if (half0 > 0 && tickerOffsetPx >= half0) tickerOffsetPx = tickerOffsetPx % half0;
    track.style.transform = tickerOffsetPx ? "translateX(-" + tickerOffsetPx + "px)" : "";
  }
  startTickerDriver();
  $$("[data-ticker-idx]", track).forEach(function(b){
    if (b.getAttribute("data-ticker-bound")) return;
    b.setAttribute("data-ticker-bound", "1");
    b.addEventListener("click", function(){
      var it = tickerItems[+b.getAttribute("data-ticker-idx")]; if (!it) return;
      if (it.michGame){ openMichiganGameFromTicker(it.michGame); return; }
      if (it.board){
        var g = it.board;
        showGameDetail({home: g.homeName, away: g.awayName, homeScore: g.hs, awayScore: g.as,
          state: g.state, clock: g.clock, venue: g.venue, homeKey: g.homeKey, awayKey: g.awayKey, michGame: null,
          ev: g.ev, evId: (g.ev && g.ev.id) || null, dateISO: (g.ev && g.ev.date) ? g.ev.date.slice(0, 10) : ""});
      }
    });
  });
}


// ---------- v31d unfrozen saved data: live updates saved values ----------
var liveTimeOverrides = null;
function setGameTime(g, t){
  if (!g || g.status !== "upcoming" || !t) return false;
  if (g.timeCT === t) return false;
  var old = g.timeCT || "";
  g.timeCT = t;
  if (!old){
    try{
      if (!liveTimeOverrides) liveTimeOverrides = load("liveTimeOverrides", {});
      liveTimeOverrides[String(g.n)] = t;
      save("liveTimeOverrides", liveTimeOverrides);
    }catch(e){}
  } else {
    try{
      guardianState.timeUpdates = guardianState.timeUpdates || [];
      var msg = "Game " + g.n + " time updated: " + old + " → " + t + " (live feed)";
      var found = false;
      guardianState.timeUpdates.forEach(function(m, i){ if (m.indexOf("Game " + g.n + " time updated") === 0) { guardianState.timeUpdates[i] = msg; found = true; } });
      if (!found) guardianState.timeUpdates.push(msg);
    }catch(e){}
  }
  return true;
}
function applyStoredTimeOverrides(){
  try{
    var ov = load("liveTimeOverrides", {});
    var changed = false;
    Object.keys(ov || {}).forEach(function(n){
      var g = null; (GAMES || []).forEach(function(x){ if (String(x.n) === String(n)) g = x; });
      if (!g || g.status !== "upcoming" || g.timeCT){ delete ov[String(n)]; changed = true; return; }
      g.timeCT = ov[String(n)];
    });
    if (changed){ try{ save("liveTimeOverrides", ov); }catch(e){} }
    liveTimeOverrides = ov;
  }catch(e){}
}
window.__vmaxTest.setGameTime = setGameTime;
window.__vmaxTest.applyStoredTimeOverrides = applyStoredTimeOverrides;

// ---------- v31b live merge: online info fills bundled blanks, live ----------
// Bundled values are NEVER overwritten (a verified time always wins); only
// a blank timeCT is filled, from a live source, in memory. The fill is
// re-rendered when safe so the user sees it without a rebuild or a tap.
function applyFeedTimes(games, events){
  var filled = [];
  (events || []).forEach(function(ev){
    var info = null; try{ info = boardGameInfo(ev); }catch(e){ return; }
    if (!info || !info.isMich) return;
    if (info.state === "post") return;
    var raw = ev && ev.date ? ev.date : "";
    if (raw.length <= 10) return; // date-only feed value carries no time
    var ep = Date.parse(raw); if (isNaN(ep)) return;
    var day = raw.slice(0, 10);
    var michAway = (info.awayKey === "MICH" || info.awayName === "Michigan");
    var oppName = michAway ? info.homeName : info.awayName;
    (games || []).forEach(function(g){
      if (g.status !== "upcoming" || g.timeCT) return;
      if (g.date !== day || g.opp !== oppName) return;
      if (setGameTime(g, ctTimeStr(ep))) filled.push(g.n);
    });
  });
  return filled;
}
function applyScheduleTimes(games, schedGames){
  var filled = [];
  (schedGames || []).forEach(function(sg){
    if (!sg.timeCT) return;
    (games || []).forEach(function(g){
      if (g.status !== "upcoming") return;
      if (g.date !== sg.date || g.opp !== sg.oppName) return;
      if (setGameTime(g, sg.timeCT)) filled.push(g.n);
    });
  });
  return filled;
}
function rerenderGamesIfSafe(){
  try{
    if (document.querySelector('.details:not([hidden])')) return false;
    renderGames();
    return true;
  }catch(e){ return false; }
}
var lastSchedFeedAt = 0;
function refreshMichiganScheduleFeed(){
  if (typeof fetch !== "function") return Promise.resolve(false);
  if (lastSchedFeedAt && Date.now() - lastSchedFeedAt < 1800000) return Promise.resolve(false);
  lastSchedFeedAt = Date.now();
  var url = espnTeamURL("MICH", "schedule");
  if (!url) return Promise.resolve(false);
  var ctl = null;
  try{ ctl = new AbortController(); setTimeout(function(){ try{ ctl.abort(); }catch(err){} }, 15000); }catch(err){}
  var opts = {}; if (ctl) opts.signal = ctl.signal;
  return fetch(url, opts).then(function(r){ return r.json(); }).then(function(j){
    var games = parseEspnSched(j, 130);
    var filled = applyScheduleTimes(GAMES, games);
    if (filled.length) rerenderGamesIfSafe();
    return filled.length > 0;
  }).catch(function(){ return false; });
}
window.__vmaxTest.applyFeedTimes = applyFeedTimes;
window.__vmaxTest.applyScheduleTimes = applyScheduleTimes;
window.__vmaxTest.rerenderGamesIfSafe = rerenderGamesIfSafe;
window.__vmaxTest.refreshMichiganScheduleFeed = refreshMichiganScheduleFeed;

function refreshLiveBoard(force){
  var board = $("#live-board");
  return fetchScoreboardWindow(force).then(function(res){
    // v32.30: feed verdict drives the retry state. A fresh feed clears
    // the failure streak; a failed feed schedules the backoff retry.
    try{ if (res.feedOk) liveBoardOk(); else liveBoardFailed(); }catch(e){}
    var events = res.events;
    renderTicker(events, res.feedOk);
    lastFeedOk = res.feedOk; lastFeedAt = Date.now();
    lastBoardEvents = res.events || [];
    try{ var filledBoard = applyFeedTimes(GAMES, lastBoardEvents); if (filledBoard.length) rerenderGamesIfSafe(); }catch(e){}
    try{ updateFavoriteLive(events); }catch(e){}
    var ts = $("#ticker-stamp");
    if (ts) ts.textContent = res.fresh ? "Live scores updated " + new Date().toLocaleTimeString() + " · NCAA Division I men's hockey only." : "Live feed unavailable — showing last verified scores · NCAA Division I men's hockey only.";
    if (!board) return true;
    var infos = [];
    (events || []).forEach(function(ev){ var g = boardGameInfo(ev); if (g) infos.push(g); });
    var live = infos.filter(function(g){ return g.state === "in"; });
    var keptFinals = selectTickerFinals(events);
    var finals = infos.filter(function(g){ return g.state === "post" && keptFinals.indexOf(g.ev) !== -1; });
    var upc = infos.filter(function(g){ return g.state !== "in" && g.state !== "post"; });
    var html = "";
    if (live.length){
      html += '<div class="tv-sub">Live now</div>';
      live.forEach(function(g){
        var dt = boardGameDateTime(g.ev);
        html += '<div class="tv-line live-row" data-board-idx="' + infos.indexOf(g) + '" role="button" tabindex="0">' + esc(g.awayName) + " " + (g.as !== null ? g.as : "") + " at " + esc(g.homeName) + " " + (g.hs !== null ? g.hs : "") + " — LIVE " + esc(g.clock) + " · " + esc(dt.date) + "</div>";
      });
    }
    if (upc.length){
      html += '<div class="tv-sub">Today\'s upcoming games</div>';
      upc.slice(0, 12).forEach(function(g){
        var ep = null; try{ ep = Date.parse(g.ev.date); }catch(e){}
        var cd = (ep && g.ev.date.slice(0, 10) === centralTodayISO(Date.now())) ? ' <span class="cd" data-cd-epoch="' + ep + '"></span>' : "";
        var dt = boardGameDateTime(g.ev);
        html += '<div class="tv-line" data-board-idx="' + infos.indexOf(g) + '" role="button" tabindex="0">' + esc(g.awayName) + " at " + esc(g.homeName) + " — upcoming · " + esc(dt.date) + (dt.time ? " · " + esc(dt.time) : "") + (g.venue ? " (" + esc(g.venue) + ")" : "") + cd + "</div>";
      });
    }
    if (finals.length){
      html += '<div class="tv-sub">Recent finals (past week)</div>';
      finals.forEach(function(g){
        var dt = boardGameDateTime(g.ev);
        html += '<div class="tv-line" data-board-idx="' + infos.indexOf(g) + '" role="button" tabindex="0">' + esc(g.awayName) + " " + g.as + " at " + esc(g.homeName) + " " + g.hs + " — Final" + (dt.date ? " · " + esc(dt.date) : "") + "</div>";
      });
    }
    if (!infos.length){
      html += '<div class="tv-note">' + (res.feedOk ? "No NCAA games returned by the ESPN scoreboard feed. " : "League scores unavailable \u2014 the ESPN scoreboard feed could not be reached. ") + "The Michigan schedule above is the verified fallback; scores here are never invented.</div>";
      var finals2 = GAMES.filter(function(g){ return g.status === "final"; });
      if (finals2.length){ var lf = finals2[finals2.length - 1]; html += '<div class="tv-line">Michigan last: ' + lf.mich + "&ndash;" + lf.oppScore + " vs " + esc(lf.opp) + " (Final · " + fmtDate(lf.date) + ")</div>"; }
    }
    board.innerHTML = html;
    var nb = document.getElementById("neutral-live-board");
    if (nb) nb.innerHTML = html.replace("The Michigan schedule above is the verified fallback; scores here are never invented.", "Scores here are never invented.");
    $$("[data-board-idx]", board).forEach(function(b){
      b.addEventListener("click", function(){
        var g = infos[+b.getAttribute("data-board-idx")]; if (!g) return;
        if (g.isMich){
          var mn = michGameNumForBoard(g);
          if (mn) openMichiganGameFromTicker(mn); else backToMichigan();
          return;
        }
        showGameDetail({home: g.homeName, away: g.awayName, homeScore: g.hs, awayScore: g.as, state: g.state, clock: g.clock, venue: g.venue, homeKey: g.homeKey, awayKey: g.awayKey, michGame: null,
          ev: g.ev, evId: (g.ev && g.ev.id) || null, dateISO: (g.ev && g.ev.date) ? g.ev.date.slice(0, 10) : ""});
      });
    });
    if (nb) $$("[data-board-idx]", nb).forEach(function(b){
      b.addEventListener("click", function(){
        var g = infos[+b.getAttribute("data-board-idx")]; if (!g) return;
        if (g.isMich){
          var mn = michGameNumForBoard(g);
          if (mn) openMichiganGameFromTicker(mn); else backToMichigan();
          return;
        }
        showGameDetail({home: g.homeName, away: g.awayName, homeScore: g.hs, awayScore: g.as, state: g.state, clock: g.clock, venue: g.venue, homeKey: g.homeKey, awayKey: g.awayKey, michGame: null,
          ev: g.ev, evId: (g.ev && g.ev.id) || null, dateISO: (g.ev && g.ev.date) ? g.ev.date.slice(0, 10) : ""});
      });
    });
    try{ refreshOpenBoardDetail(events); }catch(e){}
    return true;
  }).catch(function(){
    // v32.30: the board refresh must NEVER reject. A render failure used
    // to leave the neutral page stuck on "Loading the NCAA scoreboard…"
    // with no note and no retry — the boot stall. Now it labels the
    // failure and schedules the backoff retry instead.
    try{ liveBoardFailed(); }catch(e){}
    return false;
  });
}
// ---------- test hooks (v7 additions) ----------
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.dirEntry = dirEntry;
window.__vmaxTest.teamTitles = teamTitles;
window.__vmaxTest.bannersHTMLFor = bannersHTMLFor;
window.__vmaxTest.addTitleForTeam = addTitleForTeam;
window.__vmaxTest.checkTitleWinFor = checkTitleWinFor;
window.__vmaxTest.showGenericTeamView = showGenericTeamView;
window.__vmaxTest.genericTeamHTML = genericTeamHTML;
window.__vmaxTest.genericPlayerPageHTML = genericPlayerPageHTML;
window.__vmaxTest.renderDirectory = renderDirectory;
window.__vmaxTest.renderExtras = renderExtras;
window.__vmaxTest.renderTicker = renderTicker;
window.__vmaxTest.tickerStep = tickerStep;
window.__vmaxTest.tickerOffset = function(){ return tickerOffsetPx; };
window.__vmaxTest.tickerHalfWidth = tickerHalfWidth;
window.__vmaxTest.startTickerDriver = startTickerDriver;
window.__vmaxTest.tickerDuration = function(){ return tickerDurationSec; };
// v32.30 test hooks: ticker watchdog + live retry/watchdog state.
window.__vmaxTest.tickerWatchdog = tickerWatchdog;
window.__vmaxTest.tickerGen = function(){ return tickerGen; };
window.__vmaxTest.setTickerLastWall = function(v){ tickerLastWall = v; };
window.__vmaxTest.liveBoardFailed = liveBoardFailed;
window.__vmaxTest.liveBoardOk = liveBoardOk;
window.__vmaxTest.liveFailStreak = function(){ return liveFailStreak; };
window.__vmaxTest.liveRetryPending = function(){ return !!liveRetryTimer; };
window.__vmaxTest.liveWatchdog = liveWatchdog;
window.__vmaxTest.setLastLiveTickAt = function(v){ lastLiveTickAt = v; };
window.__vmaxTest.getLastLiveTickAt = function(){ return lastLiveTickAt; };
window.__vmaxTest.bootHome = startHome;
window.__vmaxTest.openDetailIds = openDetailIds;
window.__vmaxTest.applyOpenDetails = applyOpenDetails;
window.__vmaxTest.tickerSig = function(){ return tickerSig; };
window.__vmaxTest.tickerItemHTML = tickerItemHTML;
window.__vmaxTest.fetchScoreboardWindow = fetchScoreboardWindow;
window.__vmaxTest.selectTickerFinals = selectTickerFinals;
window.__vmaxTest.refreshLiveBoard = refreshLiveBoard;
window.__vmaxTest.rssTitleMatchesMichiganGame = rssTitleMatchesMichiganGame;
window.__vmaxTest.rssTitleDateMatch = rssTitleDateMatch;
window.__vmaxTest.scoreboardDayURL = scoreboardDayURL;
window.__vmaxTest.fetchScoreboardDayEvents = fetchScoreboardDayEvents;
window.__vmaxTest.renderTeamLive = renderTeamLive;
window.__vmaxTest.showGameDetail = showGameDetail;
window.__vmaxTest.parseEspnSched = parseEspnSched;
window.__vmaxTest.schedRowHTML = schedRowHTML;
window.__vmaxTest.boardGameInfo = boardGameInfo;
window.__vmaxTest.tickerItems = function(){ return tickerItems; };
window.__vmaxTest.currentTeamKey = function(){ return currentTeamKey; };

// ---------- live countdowns (v7) ----------
// Central DST rule for evening games: DST 2026 Mar 8 - Nov 1; DST 2027
// from Mar 14. Nov 1 is treated as standard (DST ends 2am that day, and
// all scheduled games that day are evening games). Game 8 (Oct 31, 5:00 PM
// CT) is CDT (UTC-5) -> 22:00 UTC; Game 9 (Nov 1, 6:30 PM CT) is CST
// (UTC-6) -> Nov 2, 00:30 UTC. Countdowns NEVER derive from a wall-clock
// string alone: every countdown carries a UTC epoch.
function ctDst(dateISO){
  var p = dateISO.split("-"); var y = +p[0], m = +p[1], d = +p[2];
  if (m < 3 || m > 11) return false;
  if (m > 3 && m < 11) return true;
  if (m === 3){ var st = (y === 2026 ? 8 : 14); return d >= st; }
  return false; // November: DST ended Nov 1
}
function gameStartEpoch(g){
  if (!g || !g.timeCT) return null;
  var m = g.timeCT.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  var hh = +m[1], mm = +m[2];
  if (m[3].toUpperCase() === "PM" && hh !== 12) hh += 12;
  if (m[3].toUpperCase() === "AM" && hh === 12) hh = 0;
  var p = g.date.split("-");
  var off = ctDst(g.date) ? -300 : -360; // minutes
  return Date.UTC(+p[0], +p[1] - 1, +p[2]) + ((hh * 60 + mm) - off) * 60000;
}
function centralTodayISO(nowMs){
  try{
    return new Date(nowMs).toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
  }catch(e){
    var d = new Date(nowMs);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
}
function ctTimeStr(epoch){
  try{
    return new Date(epoch).toLocaleTimeString("en-US", {timeZone: "America/Chicago", hour: "numeric", minute: "2-digit"});
  }catch(e){
    var d = new Date(epoch);
    return (d.getUTCHours() % 12 || 12) + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " " + (d.getUTCHours() >= 12 ? "PM" : "AM");
  }
}
function fmtCountdown(ms){
  if (ms <= 0) return "LIVE";
  var s = Math.floor(ms / 1000);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return "Starts in " + h + "h " + m + "m " + sec + "s";
  return "Starts in " + m + "m " + sec + "s";
}
var __cdFlipAt = 0;
function tickCountdowns(nowMs){
  // v32.30: the 1s countdown loop doubles as the watchdog heartbeat —
  // a dead live interval and a stalled ticker driver are both restarted
  // from here, cheaply, instead of failing silently.
  try{ liveWatchdog(); }catch(e){}
  try{ tickerWatchdog(); }catch(e){}
  $$(".cd").forEach(function(el){
    var ep = +el.getAttribute("data-cd-epoch");
    if (!ep) return;
    var rem = ep - nowMs;
    if (rem <= 0){
      if (el.textContent !== "LIVE"){
        el.textContent = "LIVE";
        if (Date.now() - __cdFlipAt > 30000){ __cdFlipAt = Date.now(); try{ refreshLiveBoard(); }catch(e){} }
      }
    } else {
      el.textContent = fmtCountdown(rem);
    }
  });
}
function startCountdownTimer(){
  try{ tickCountdowns(Date.now()); }catch(e){}
  setInterval(function(){ try{ tickCountdowns(Date.now()); }catch(e){} }, 1000);
}
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.gameStartEpoch = gameStartEpoch;
window.__vmaxTest.fmtCountdown = fmtCountdown;
window.__vmaxTest.tickCountdowns = tickCountdowns;
window.__vmaxTest.centralTodayISO = centralTodayISO;
window.__vmaxTest.ctDst = ctDst;
window.__vmaxTest.ctTimeStr = ctTimeStr;
// v8 test hooks
window.__vmaxTest.navBack = navBack;
window.__vmaxTest.syncSchedRowMedia = syncSchedRowMedia;
window.__vmaxTest.schedMediaHTML = schedMediaHTML;
window.__vmaxTest.expandedTitles = expandedTitles;
window.__vmaxTest.backToMichigan = backToMichigan;
window.__vmaxTest.showTeamView = showTeamView;
window.__vmaxTest.showPlayerPage = showPlayerPage;
window.__vmaxTest.showConfView = showConfView;
window.__vmaxTest.showSettingsView = showSettingsView;
window.__vmaxTest.showSearchView = showSearchView;
window.__vmaxTest.searchAll = searchAll;
window.__vmaxTest.getSearchQuery = function(){ return searchQuery; };
window.__vmaxTest.showFavHomeView = showFavHomeView;
window.__vmaxTest.startHome = startHome;
window.__vmaxTest.getIconTeam = getIconTeam;
window.__vmaxTest.setIconTeam = setIconTeam;
window.__vmaxTest.getIconMode = getIconMode;
window.__vmaxTest.setIconMode = setIconMode;
window.__vmaxTest.setFixedIcon = setFixedIcon;
window.__vmaxTest.getFixedIconTeam = getFixedIconTeam;
window.__vmaxTest.getRecentFavorite = getRecentFavorite;
window.__vmaxTest.getEffectiveIconTeam = getEffectiveIconTeam;
window.__vmaxTest.syncIconAfterFavoritesChange = syncIconAfterFavoritesChange;
window.__vmaxTest.ICON_MODE_KEY = ICON_MODE_KEY;
window.__vmaxTest.navyLogoFile = navyLogoFile;
window.__vmaxTest.logoTileClass = logoTileClass;
window.__vmaxTest.NAVY_SWAP = NAVY_SWAP;
window.__vmaxTest.NAVY_DARK_FILES = NAVY_DARK_FILES;
window.__vmaxTest.timeShortLabel = timeShortLabel;
window.__vmaxTest.timeCTLabel = timeCTLabel;
window.__vmaxTest.centralZone = centralZone;
window.__vmaxTest.iconNoteHTML = iconNoteHTML;
window.__vmaxTest.getFavorites = getFavorites;
window.__vmaxTest.FAV_KEY = FAV_KEY;
window.__vmaxTest.ICON_TEAM_KEY = ICON_TEAM_KEY;
window.__vmaxTest.isFavorite = isFavorite;
window.__vmaxTest.toggleFavorite = toggleFavorite;
window.__vmaxTest.favStarHTML = favStarHTML;
window.__vmaxTest.syncFavStar = syncFavStar;
window.__vmaxTest.renderFavHome = renderFavHome;
window.__vmaxTest.updateFavoriteLive = updateFavoriteLive;
window.__vmaxTest.syncTickerVisibility = syncTickerVisibility;
window.__vmaxTest.syncHeader = syncHeader;
window.__vmaxTest.showSettingsView = showSettingsView;
window.__vmaxTest.applyTeamTheme = applyTeamTheme;
window.__vmaxTest.themeFor = themeFor;
window.__vmaxTest.isD1MensEvent = isD1MensEvent;
window.__vmaxTest.teamIntroHTML = teamIntroHTML;
window.__vmaxTest.toggleIntro = toggleIntro;
window.__vmaxTest.stopIntro = stopIntro;
window.__vmaxTest.currentIntroRank = currentIntroRank;
window.__vmaxTest.parseLiveRanks = parseLiveRanks;
window.__vmaxTest.rankClipFile = rankClipFile;
window.__vmaxTest.confMembers = confMembers;
window.__vmaxTest.confViewHTML = confViewHTML;
window.__vmaxTest.setHornOn = setHornOn;
window.__vmaxTest.setNotifOn = setNotifOn;
window.__vmaxTest.setLivePref = setLivePref;
window.__vmaxTest.getLivePref = function(){ return livePref; };
window.__vmaxTest.getHornOn = function(){ return hornOn; };
window.__vmaxTest.getNotifOn = function(){ return notifOn; };
window.__vmaxTest.getFavOpenOn = function(){ return favOpenOn; };
window.__vmaxTest.setFavOpenOn = setFavOpenOn;
window.__vmaxTest.renderNeutralView = renderNeutralView;
window.__vmaxTest.neutralViewHTML = neutralViewHTML;
window.__vmaxTest.getCurrentView = function(){ return currentView; };
window.__vmaxTest.getNavStack = function(){ return navStack; };
window.__vmaxTest.getBackState = function(){ return window.__vmaxTest.backState; };
window.__vmaxTest.DONATION_LINK = function(){ return DONATION_LINK; };
window.__vmaxTest.PAYPAL_LINK = function(){ return PAYPAL_LINK; };
window.__vmaxTest.donationsRowHTML = donationsRowHTML;
window.__vmaxTest.liveTick = liveTick;
window.__vmaxTest.whiteTickerFile = whiteTickerFile;
window.__vmaxTest.boardGameDateTime = boardGameDateTime;
window.__vmaxTest.openMichiganGameFromTicker = openMichiganGameFromTicker;
window.__vmaxTest.pushNav = pushNav;
window.__vmaxTest.navStack = function(){ return navStack; };
window.__vmaxTest.currentView = function(){ return currentView; };
window.__vmaxTest.refreshOpenBoardDetail = refreshOpenBoardDetail;
window.__vmaxTest.openBoardDetail = function(){ return openBoardDetail; };
window.__vmaxTest.boardDetailScoreParts = boardDetailScoreParts;
window.__vmaxTest.michGameNumForBoard = michGameNumForBoard;
window.__vmaxTest.openGenericGameDetail = openGenericGameDetail;
window.__vmaxTest.teamBadgeStyle = teamBadgeStyle;
window.__vmaxTest.refreshTeamLiveRecord = refreshTeamLiveRecord;
window.__vmaxTest.refreshTeamNews = refreshTeamNews;
window.__vmaxTest.refreshOpenTeamRanks = refreshOpenTeamRanks;
window.__vmaxTest.refreshGenericRoster = refreshGenericRoster;
window.__vmaxTest.refreshUnifiedRosterNumbers = refreshUnifiedRosterNumbers;
window.__vmaxTest.resetLiveGates = function(){ espnAccelLast = {}; rankingsLastCheck = 0; };
window.__vmaxTest.refreshRankings = refreshRankings;
window.__vmaxTest.matchHighlightsFeed = matchHighlightsFeed;
window.__vmaxTest.parseHlRss = parseHlRss;
window.__vmaxTest.applyHlFills = applyHlFills;
window.__vmaxTest.fetchTeamHighlightsRSS = fetchTeamHighlightsRSS;
window.__vmaxTest.gameHighlightURL = gameHighlightURL;
window.__vmaxTest.playGameHighlight = playGameHighlight;
window.__vmaxTest.openTeamGameDetail = openTeamGameDetail;
window.__vmaxTest.parseEspnSummaryBoxscore = parseEspnSummaryBoxscore;
window.__vmaxTest.parseEspnPeriodTable = parseEspnPeriodTable;
window.__vmaxTest.espnPeriodTableHTML = espnPeriodTableHTML;
window.__vmaxTest.parseEspnSched = parseEspnSched;
window.__vmaxTest.schedRowHTML = schedRowHTML;
window.__vmaxTest.resetHlFeed = function(){ hlFeedAt = 0; };
window.__vmaxTest.applyEspnPhotos = applyEspnPhotos;
window.__vmaxTest.loadLiveRanks = loadLiveRanks;
window.__vmaxTest.saveLiveRanks = saveLiveRanks;
window.__vmaxTest.refreshConfStamp = refreshConfStamp;
window.__vmaxTest.shareApp = shareApp;
window.__vmaxTest.openShareMenu = openShareMenu;
window.__vmaxTest.shareAppFile = shareAppFile;
window.__vmaxTest.shareDownloadLink = shareDownloadLink;
window.__vmaxTest.teamZoomTo = teamZoomTo;
window.__vmaxTest.getTopFavorite = getTopFavorite;
window.__vmaxTest.makeTopFavorite = makeTopFavorite;
window.__vmaxTest.getEffectiveIconTeam = getEffectiveIconTeam;
window.__vmaxTest.isIconExplicit = isIconExplicit;
window.__vmaxTest.applyBootIcon = applyBootIcon;
window.__vmaxTest.pickerOpen = pickerOpen;
window.__vmaxTest.showPicker = showPicker;
window.__vmaxTest.hidePicker = hidePicker;
window.__vmaxTest.pickFavorite = pickFavorite;
window.__vmaxTest.deepLinkTeam = deepLinkTeam;
window.__vmaxTest.handleDeepLink = handleDeepLink;
window.__vmaxTest.getAnimOn = function(){ return animOn; };
window.__vmaxTest.setAnimOn = function(v){ animOn = !!v; };
window.__vmaxTest.getDownloadURL = function(){ return DOWNLOAD_URL; };
window.__vmaxTest.setDownloadURL = function(v){ DOWNLOAD_URL = v || ""; };
window.__vmaxTest.shareTextWithLink = shareTextWithLink;
window.__vmaxTest.copyShareText = copyShareText;
window.__vmaxTest.facebookShareURL = facebookShareURL;
window.__vmaxTest.openInFacebook = openInFacebook;
window.__vmaxTest.openInBrowser = openInBrowser;
window.__vmaxTest.openBrowserHome = openBrowserHome;
window.__vmaxTest.SHARE_TEXT = SHARE_TEXT;
window.__vmaxTest.playGoalSound = playGoalSound;
window.__vmaxTest.playGoalCall = playGoalCall;
window.__vmaxTest.pickGoalVariant = pickGoalVariant;
window.__vmaxTest.fetchGoalScorer = fetchGoalScorer;
window.__vmaxTest.parseGoalScorer = parseGoalScorer;
window.__vmaxTest.goalCallScorer = goalCallScorer;
window.__vmaxTest.rssHighlights = rssHighlights;
window.__vmaxTest.fetchHighlightsRSS = fetchHighlightsRSS;
window.__vmaxTest.h2hLine = h2hLine;
window.__vmaxTest.dirKeyForName = dirKeyForName;
window.__vmaxTest.structuredRowHTML = structuredRowHTML;
window.__vmaxTest.structuredToGeneric = structuredToGeneric;
window.__vmaxTest.favLineOppKey = favLineOppKey;
window.__vmaxTest.bundledTeamSchedHTML = bundledTeamSchedHTML;
window.__vmaxTest.tzPref = tzPref;
window.__vmaxTest.setTzPref = setTzPref;
window.__vmaxTest.displayZoneTime = displayZoneTime;
window.__vmaxTest.ctWallToEpoch = ctWallToEpoch;
window.__vmaxTest.epochToZoneLabel = epochToZoneLabel;
window.__vmaxTest.selectTeamTab = selectTeamTab;
window.__vmaxTest.collapseTeamSecs = collapseTeamSecs;
window.__vmaxTest.navyLogoFile = navyLogoFile;
window.__vmaxTest.renderGames = renderGames;
window.__vmaxTest.startRadio = startRadio;
window.__vmaxTest.stopRadio = stopRadio;
window.__vmaxTest.setVideoMode = setVideoMode;
window.__vmaxTest.michBio = michBio;
window.__vmaxTest.RADIO_URL = RADIO_URL;
window.__vmaxTest.dirConf = function(){ return dirConf; };
window.__vmaxTest.dirQuery = function(){ return dirQuery; };
window.__vmaxTest.clearScoreCache = function(){ scoreboardCache = {date: "", events: [], fetchedAt: 0}; pastDayCache = {}; };
window.__vmaxTest.openVideoWindow = openVideoWindow;
window.__vmaxTest.closeVideoWindow = closeVideoWindow;
window.__vmaxTest.showVenueCard = showVenueCard;

// ---------- boot ----------

// ---------- v28 guardian: silent background watchdog ----------
// Nobody interacts with it: no button, no toggle, no chat surface. It
// watches that the app stays exactly as intended and reports its state
// read-only in Settings > About. It never sends data anywhere, never
// changes a setting, and never blocks navigation: every check is wrapped,
// and a failed check is reported, not acted on (the native tamper seal
// at launch remains the only hard gate).
var lastFeedOk = null;
var lastFeedAt = 0;
var guardianState = {active: true, checks: 0, lastCheck: 0, issues: [], dataIssues: [], nativeSeal: null, feedOk: null};
function guardianStatusText(){
  var t = guardianState.lastCheck ? new Date(guardianState.lastCheck).toLocaleTimeString("en-US", {timeZone: "America/Chicago", hour: "numeric", minute: "2-digit"}) : "not yet";
  var parts = ["Guardian: active in the background — no controls. Last check " + t];
  parts.push(guardianState.issues.length ? ("Issues: " + guardianState.issues.slice(0, 2).join("; ")) : "Integrity OK");
  parts.push("Data: " + ((guardianState.dataIssues && guardianState.dataIssues.length) ? guardianState.dataIssues.slice(0, 2).join("; ") : "OK"));
  parts.push("Live feed: " + (guardianState.feedOk === null ? "not checked yet" : (guardianState.feedOk ? "reachable" : "unreachable — saved data shown")));
  if (guardianState.timeUpdates && guardianState.timeUpdates.length) parts.push("Live updates: " + guardianState.timeUpdates[guardianState.timeUpdates.length - 1]);
  parts.push("Native seal: " + (guardianState.nativeSeal === null ? "not checked in this runtime" : (guardianState.nativeSeal ? "pass" : "FAIL")));
  return parts.join(" · ");
}
function guardianCheck(){
  var issues = [];
  try{
    if (typeof GAMES === "undefined" || !GAMES || GAMES.length !== 34) issues.push("Michigan schedule incomplete");
    if (typeof DIRECTORY === "undefined" || !DIRECTORY || DIRECTORY.length !== 63) issues.push("team directory incomplete");
    var seenUnresolved = {};
    (GAMES || []).forEach(function(g){ if (!dirEntry(g.short) && !seenUnresolved[g.short]){ seenUnresolved[g.short] = true; issues.push("unresolved team: " + g.short); } });
    if (typeof teamZoomTo !== "function") issues.push("missing function: teamZoomTo");
    if (typeof showSettingsView !== "function") issues.push("missing function: showSettingsView");
    if (typeof renderGames !== "function") issues.push("missing function: renderGames");
    if (typeof liveTick !== "function") issues.push("missing function: liveTick");
    if (typeof showGameDetail !== "function") issues.push("missing function: showGameDetail");
    if (typeof renderDirectory !== "function") issues.push("missing function: renderDirectory");
    if (typeof showBracketView !== "function") issues.push("missing function: showBracketView");
    if (typeof renderSpotlight !== "function") issues.push("missing function: renderSpotlight");
    if (typeof toggleFavorite !== "function") issues.push("missing function: toggleFavorite");
    ["michview", "games", "settingsview", "teamview", "share-btn"].forEach(function(id){ if (!$("#" + id)) issues.push("missing element: " + id); });
    var b = bridge();
    if (b && typeof b.guardianIntegrity === "function"){
      try{ guardianState.nativeSeal = !!b.guardianIntegrity(); if (!guardianState.nativeSeal) issues.push("native seal failed"); }catch(e){ guardianState.nativeSeal = null; }
    } else guardianState.nativeSeal = null;
    if (b && typeof b.openExternalBrowser !== "function") issues.push("external browser bridge missing");
    if (lastFeedOk !== null){ guardianState.feedOk = lastFeedOk; if (!lastFeedOk) issues.push("live feed unreachable"); }
  }catch(e){ issues.push("guardian check error"); }
  var dataRes = null; try{ dataRes = guardianDataCheck(); }catch(e){ dataRes = {issues: ["data-watch error"]}; }
  guardianState.dataIssues = dataRes.issues;
  try{ var blanks = (GAMES || []).filter(function(g){ return g.status === "upcoming" && !g.timeCT; }); if (blanks.length) refreshMichiganScheduleFeed(); }catch(e){}
  guardianState.checks += 1; guardianState.lastCheck = Date.now(); guardianState.issues = issues;
  try{ var el = $("#guardian-status"); if (el) el.textContent = guardianStatusText(); }catch(e){}
  return guardianState;
}
var guardianTimer = null;
function guardianStart(){
  try{ guardianCheck(); }catch(e){}
  try{ if (!guardianTimer) guardianTimer = setInterval(function(){ try{ guardianCheck(); }catch(e){} }, 60000); }catch(e){}
  try{ document.addEventListener("visibilitychange", function(){ if (!document.hidden){ try{ guardianCheck(); }catch(e){} } }); }catch(e){}
}
window.__vmaxTest.guardianState = guardianState;
window.__vmaxTest.guardianCheck = guardianCheck;
window.__vmaxTest.guardianStatusText = guardianStatusText;
window.__vmaxTest.guardianStart = guardianStart;

// ---------- v29 guardian data-watch: truth, freshness, live updates ----------
// Bound: the guardian cannot know absolute truth. It cross-checks the app's
// own two sources (bundled verified data vs the live ESPN board), validates
// formats, and watches freshness — and flags every disagreement as a gap,
// never silently resolving it. If both sources are wrong the same way, no
// client-side check can see that, and this code does not pretend otherwise.
var lastBoardEvents = [];
var guardianDataState = {checks: 0, lastCheck: 0, issues: []};
var guardianLastRefreshAt = 0;
function guardianIsStale(lastMs, nowMs){ return !!lastMs && (nowMs - lastMs) > 180000; }
function guardianGameIssues(g, todayISO){
  var issues = [];
  if (!g.date || !/^\d{4}-\d{2}-\d{2}$/.test(g.date)) issues.push("Game " + g.n + ": bad date");
  if (g.status === "upcoming" && g.date && g.date < todayISO) issues.push("Game " + g.n + " still upcoming past its date (" + g.date + ")");
  if (g.status === "final" && (typeof g.mich !== "number" || typeof g.oppScore !== "number")) issues.push("Game " + g.n + " final without numeric scores");
  if (g.timeCT === "TBD") issues.push("Game " + g.n + ": TBD on a regular-season game — TBD is postseason-only");
  if (g.timeCT && g.timeCT !== "TBD" && !/^\d{1,2}:\d{2} [AP]M$/.test(g.timeCT)) issues.push("Game " + g.n + ": bad time format");
  return issues;
}
function guardianFeedMismatch(bundled, info){
  if (!info || info.state !== "post" || !info.isMich) return false;
  var michSide = info.homeKey === "MICH" ? "home" : (info.awayKey === "MICH" ? "away" : null);
  if (!michSide || info.hs === null || info.as === null) return false;
  var feedMich = michSide === "home" ? info.hs : info.as;
  var feedOpp = michSide === "home" ? info.as : info.hs;
  return String(bundled.mich) !== String(feedMich) || String(bundled.oppScore) !== String(feedOpp);
}
function guardianDataCheck(nowMs){
  var now = nowMs || Date.now();
  var issues = [];
  try{
    var todayISO = centralTodayISO(now);
    (GAMES || []).forEach(function(g){ guardianGameIssues(g, todayISO).forEach(function(s){ issues.push(s); }); });
    (lastBoardEvents || []).forEach(function(ev){
      if (!ev || !ev.date) return;
      var d = String(ev.date).slice(0, 10);
      var info = null; try{ info = boardGameInfo(ev); }catch(e){ info = null; }
      if (!info) return;
      (GAMES || []).forEach(function(g){
        if (g.status === "final" && g.date === d && guardianFeedMismatch(g, info)) issues.push("Score mismatch Game " + g.n + " vs " + g.opp + ": saved " + g.mich + "–" + g.oppScore + " vs feed");
      });
    });
    if (typeof livePref !== "undefined" && livePref !== "manual" && !document.hidden){
      var staleFeed = guardianIsStale(lastFeedAt, now);
      var staleTick = guardianIsStale(lastLiveTickAt, now);
      if (staleFeed) issues.push("live feed stale (last fetch " + Math.round((now - lastFeedAt) / 1000) + "s ago)");
      if (staleTick) issues.push("live updates stalled (last tick " + Math.round((now - lastLiveTickAt) / 1000) + "s ago)");
      if ((staleFeed || staleTick) && guardianState.checks > 0 && (now - guardianLastRefreshAt) > 60000){
        guardianLastRefreshAt = now;
        try{ liveTick(); }catch(e){}
      }
    }
  }catch(e){ issues.push("data-watch error"); }
  guardianDataState.checks += 1; guardianDataState.lastCheck = now; guardianDataState.issues = issues;
  return guardianDataState;
}
window.__vmaxTest.guardianDataState = guardianDataState;
window.__vmaxTest.guardianDataCheck = guardianDataCheck;
window.__vmaxTest.guardianGameIssues = guardianGameIssues;
window.__vmaxTest.guardianIsStale = guardianIsStale;
window.__vmaxTest.guardianFeedMismatch = guardianFeedMismatch;



document.addEventListener("DOMContentLoaded", function(){
  // v9 reliability: boot exactly once even if DOMContentLoaded fires twice
  // (a second boot would double-bind every control and double-run intervals).
  if (window.__vmaxBooted) return;
  window.__vmaxBooted = true;
  // v9 reliability: each boot step is guarded so one failing section can
  // never kill the rest of boot (or the button bindings below) — the app
  // always opens on bundled data.
  try{ renderBanners(); }catch(e){}
  try{ applyStoredTimeOverrides(); }catch(e){}
  try{ renderSpotlight(); }catch(e){}
  try{ renderGames(); }catch(e){}
  try{ renderDirectory(); }catch(e){}
  try{ renderExtras(); }catch(e){}
  try{ renderTicker(); }catch(e){}
  try{ refreshLiveBoard(); }catch(e){}
  try{ refreshMichiganScheduleFeed(); }catch(e){}
  try{ startCountdownTimer(); }catch(e){}
  try{ renderHornToggle(); }catch(e){}
  try{ renderNotifToggle(); }catch(e){}
  try{ renderBatteryBtn(); }catch(e){}
  try{ bridgeCall("checkForUpdate", []); }catch(e){}
  var rp = $("#radio-play");
  if (rp) rp.addEventListener("click", function(){ if (radioPlaying) pauseRadio(); else startRadio(); });
  var rc = $("#radio-close");
  if (rc) rc.addEventListener("click", function(){ stopRadio(); });
  var vm = $("#vw-min");
  if (vm) vm.addEventListener("click", function(){ setVideoMode("min"); });
  var ve = $("#vw-expand");
  if (ve) ve.addEventListener("click", function(){ setVideoMode("large"); });
  var vf = $("#vw-full");
  if (vf) vf.addEventListener("click", function(){ setVideoMode("full"); });
  var vc = $("#vw-close");
  if (vc) vc.addEventListener("click", function(){ closeVideoWindow(); });
  var vc2 = $("#venue-close");
  if (vc2) vc2.addEventListener("click", function(){ var c = $("#venuecard"); if (c) c.hidden = true; syncBackState(); });
  var gd = $("#gamedetail-close");
  if (gd) gd.addEventListener("click", function(){ var c = $("#gamedetail"); if (c) c.hidden = true; openBoardDetail = null; syncBackState(); });
  // v8 Settings tab (global controls row button).
  var sb = $("#settings-btn");
  if (sb) sb.addEventListener("click", function(){ showSettingsView(); });
  // v9 Share button (global controls row): same shareApp() as Settings.
  var shb = $("#share-btn");
  if (shb) shb.addEventListener("click", function(){ openShareMenu(); });
  // p3 (Victor 2026-10-26): Browser button stays - fixed, not removed.
  var brb = $("#browser-btn");
  if (brb) brb.addEventListener("click", function(){ openBrowserHome(); });
  // v22: team-page Share buttons render per view (innerHTML replaced on
  // every team view), so they are bound by delegation, not per view.
  document.addEventListener("click", function(e){
    var t = (e.target && e.target.closest) ? e.target.closest(".share-app-btn") : null;
    if (t) openShareMenu();
  });
  // v24 EXTRAS: one delegated toggle (team pages re-render innerHTML, so
  // per-view binding would die) + team-page goal-sound buttons.
  document.addEventListener("click", function(e){
    var tb = (e.target && e.target.closest) ? e.target.closest(".tab-btn") : null;
    if (tb){
      var root = tb.closest(".tv");
      if (root) selectTeamTab(root, tb.getAttribute("data-tab"));
      return;
    }
    var tg = (e.target && e.target.closest) ? e.target.closest(".extras-toggle") : null;
    if (tg){
      var body = tg.nextElementSibling;
      if (body && body.classList && body.classList.contains("extras-body")){
        var open = body.hidden;
        body.hidden = !open;
        tg.setAttribute("aria-expanded", open ? "true" : "false");
        tg.innerHTML = open ? "EXTRAS &#9662;" : "EXTRAS &#9656;";
      }
      return;
    }
  });
  // v25: every section expands/collapses on its title (titles are plain
  // text divs, never links, so this never hijacks a navigation tap).
  document.addEventListener("click", function(e){
    var t = (e.target && e.target.closest) ? e.target.closest(".tv-sec > .tv-title") : null;
    if (!t) return;
    var sec = t.parentNode;
    if (sec && sec.classList){
      // v32.20: expanding is a history step. Push the PRE-expansion state
      // first, so Back returns to the expanded view and the NEXT Back
      // pops this entry and collapses the section (the state from before
      // it was expanded). Collapsing by tap pushes nothing.
      if (sec.classList.contains("collapsed")){ try{ pushNav(); }catch(err){} }
      sec.classList.toggle("collapsed");
      try{ syncBackState(); }catch(err){}
    }
  });
  var smc = $("#sharemenu-close"); if (smc) smc.addEventListener("click", closeShareMenu);
  var sfb = $("#share-file-btn"); if (sfb) sfb.addEventListener("click", shareAppFile);
  var stb = $("#share-link-btn"); if (stb) stb.addEventListener("click", shareDownloadLink);
  var scb = $("#share-copy-btn"); if (scb) scb.addEventListener("click", copyShareText);
  var sfbb = $("#share-fb-btn"); if (sfbb) sfbb.addEventListener("click", openInFacebook);
  var sbrb = $("#share-br-btn"); if (sbrb) sbrb.addEventListener("click", openInBrowser);
  var ds = $("#dir-search");
  if (ds) ds.addEventListener("input", function(){ dirQuery = ds.value; renderDirectory(); });
  $$("[data-dir-conf]").forEach(function(b){ b.addEventListener("click", function(){ dirConf = b.getAttribute("data-dir-conf"); renderDirectory(); }); });
  // v32.32: dir-btn removed with its tile; no handler remains.
  // v32.33: brackets-btn tile removed (user: POSTSEASON section already
  // covers it); no handler remains. The section button stays the route.
  var tsb = $("#ticker-search-btn");
  if (tsb) tsb.addEventListener("click", function(){ showSearchView(); });
  attachLogoHandlers(document);
  liveTick();
  applyLivePref();
  syncHeader();
  syncBackState();
  var deepRouted = false;
  try{ deepRouted = !!handleDeepLink(window.location.search); }catch(e){}
  if (!deepRouted){ try{ startHome(); }catch(e){} }
  // v26: re-sync the launcher icon every launch — top favorite by default,
  // explicit picker pick when one exists. The native side restarts only if
  // the effective alias state actually differs, so a matching state costs
  // one cheap bridge call.
  try{ applyBootIcon(); }catch(e){}
  try{ syncTickerVisibility(); }catch(e){}
  try{ guardianStart(); }catch(e){}
  // v13: work with no first-paint output (reminder scheduling, April
  // title check, title backstop fetch) runs after first paint — same
  // calls, same final state, only the timing moves.
  setTimeout(function(){
    try{ schedulePregameReminders(); }catch(e){}
    try{ checkAprilTitle(); }catch(e){}
    try{ checkTitleBackstop(); }catch(e){}
  }, 0);
  fetchHighlightsRSS();
  // v9: fight-song audio plays ONLY from a tap on the Fight song toggle
  // (click to play, click again to stop) — never automatically on open.
  // opening overlay: fade out after ~2s
  setTimeout(function(){
    var ov = $("#intro");
    if (ov){ ov.classList.add("done"); setTimeout(function(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }, 800); }
  }, 2000);
});

// ================= v17: bundled team pack sections =================
function packData(key){ try{ return (typeof TEAM_DATA !== "undefined" && TEAM_DATA[key]) || null; }catch(e){ return null; } }
function packRosterGroupHTML(title, list, key){
  // Stacked rows, not a 6-column table: a 6-column roster table cannot fit
  // a 320-411px phone viewport (its min-content exceeds the container and
  // it would scroll or clip horizontally). Rows grow tall, never wide.
  if (!list || !list.length) return "";
  var h = '<div class="tv-sub">' + esc(title) + '</div><div class="tv-roster-list">';
  list.forEach(function(p){
    var pos = esc(p.pos || "—") + (p.pos_disputed ? " †" : "");
    var meta = [esc(p.cls || "—"), esc(p.ht || "—"), esc(p.wt || "—"), esc(p.hometown || "—")].join(" · ");
    h += '<div class="tv-roster-row"><div class="tv-roster-name">' + playerBtn(p.name, key) + ' <span class="tv-roster-pos">' + pos + '</span></div><div class="tv-roster-meta">' + meta + '</div></div>';
  });
  return h + "</div>";
}
function packRosterHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">ROSTER (VERIFIED)</div>';
  var groups = {F: [], D: [], G: []};
  (pd.roster || []).forEach(function(p){
    var g = (p.pos === "D") ? "D" : (p.pos === "G" || p.pos === "GK") ? "G" : "F";
    groups[g].push(p);
  });
  if (!pd.roster || !pd.roster.length){
    h += '<div class="tv-note">No verified roster for this team in this app. See the team\'s official roster page.</div>';
  } else {
    h += packRosterGroupHTML("Forwards", groups.F, key) + packRosterGroupHTML("Defensemen", groups.D, key) + packRosterGroupHTML("Goalies", groups.G, key);
    if (pd.roster_partial) h += '<div class="tv-note">Roster is partial — the pack lists ' + pd.roster_n + ' players and more may be unverified. See the official roster page for the complete roster.</div>';
    if (pd.flags){
      if (pd.flags.weights_withheld) h += '<div class="tv-note">Weights withheld for this team — sources disagree across the roster, so no weight is shown rather than a guessed one.</div>';
      if (pd.flags.heights_withheld) h += '<div class="tv-note">Heights withheld for this team — sources disagree across the roster.</div>';
      if (pd.flags.hometowns_withheld) h += '<div class="tv-note">Hometowns withheld for this team — sources disagree across the roster.</div>';
      if (pd.flags.positions_flagged) h += '<div class="tv-note">Positions flagged for this team — sources disagree on positions; every position shows with a † marker until the official roster confirms it.</div>';
    }
    if (pd.withheld_n){
      if (pd.withheld_n.wt) h += '<div class="tv-note">Weights withheld for ' + pd.withheld_n.wt + ' of ' + pd.roster_n + ' players — sources disagree, so those weights show as — rather than a guessed one.</div>';
      if (pd.withheld_n.ht) h += '<div class="tv-note">Heights withheld for ' + pd.withheld_n.ht + ' of ' + pd.roster_n + ' players — sources disagree.</div>';
      if (pd.withheld_n.hw) h += '<div class="tv-note">Hometowns withheld for ' + pd.withheld_n.hw + ' of ' + pd.roster_n + ' players — sources disagree.</div>';
    }
    h += '<div class="tv-note">† Position disputed between sources — shown with a marker, never silently picked. Heights, weights, or hometowns withheld where sources disagree show as —.</div>';
  }
  return h + "</div>";
}
function packLeadersHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">SEASON SCORING LEADERS</div>';
  if (pd.leaders && pd.leaders.length){
    h += '<table class="tv-roster"><tr><th>Player</th><th>G</th><th>A</th><th>Pts</th></tr>';
    pd.leaders.forEach(function(l){ var gv = (l.g !== null && l.g !== undefined) ? l.g : "—"; var av = (l.a !== null && l.a !== undefined) ? l.a : "—"; var pv = (l.pts !== null && l.pts !== undefined) ? l.pts : "—"; h += "<tr><td>" + esc(l.name) + "</td><td>" + gv + "</td><td>" + av + "</td><td><b>" + pv + "</b></td></tr>"; });
    h += "</table>";
    h += '<div class="tv-note">Leaders snapshot (' + esc(pd.leaders_asof || "date not recorded") + ') — not live-refreshed</div>';
  } else {
    h += '<div class="tv-note">Season scoring leaders not yet verified for this team. They publish on the team\'s official stats page and are not guessed here.</div>';
  }
  return h + "</div>";
}
function packDraftHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">NHL-DRAFTED PLAYERS</div>';
  if (pd.drafted && pd.drafted.length){
    pd.drafted.forEach(function(d){
      var nhlTxt = d.nhl ? esc(d.nhl) : "NHL team unverified";
      var yrTxt = (d.year !== null && d.year !== undefined) ? d.year : "year unverified";
      var rdTxt = (d.round !== null && d.round !== undefined) ? ("Round " + d.round) : "round unverified";
      h += '<div class="tv-line">' + playerBtn(d.player, key) + " &mdash; " + nhlTxt + ", " + yrTxt + ", " + rdTxt + (d.overall ? (", #" + d.overall + " overall") : " (overall pick unverified)") + "</div>";
    });
    h += '<div class="tv-note">Drafted players snapshot (date not recorded)</div>';
    if (pd.draft_note) h += '<div class="tv-note">' + esc(pd.draft_note) + "</div>";
  } else if (pd.draft_undetermined){
    h += '<div class="tv-note">Draft status undetermined for this team — not confirmed zero. Draft records were not fully verified for this roster.</div>';
  } else {
    h += '<div class="tv-note">No verified NHL-drafted players on this roster in the sources checked.</div>';
  }
  h += '<div data-nhl-check="' + esc(key) + '"></div>';
  return h + "</div>";
}
function packNewsHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">TEAM NEWS SOURCES</div>';
  if (pd.news && pd.news.length){
    pd.news.forEach(function(n){ h += '<div class="tv-news"><a href="' + esc(n.url) + '">' + esc(n.label || n.url) + "</a></div>"; });
    h += '<div class="tv-note">Links only — article text is not scraped or copied here. Links snapshot (date not recorded) — open a source for the latest.</div>';
  } else {
    h += '<div class="tv-note">No verified news source for this team. See the team\'s official site for the latest news.</div>';
  }
  return h + "</div>";
}
function packPicturesHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">PLAYER PICTURES</div>';
  var hs = pd.headshots || {};
  if (key === "MICH"){
    h += '<div class="tv-note">Michigan player headshots come from mgoblue.com (established v7) and show on player pages.</div>';
  } else if (hs.roster_url){
    h += '<div class="tv-note">Player headshots show on player pages when a verified source provides one — the ESPN feed, the team\'s College Hockey News roster reference, or the official roster page fetched at runtime — never saved copies of a school\'s copyrighted photos, and never a guessed photo URL.</div>';
  } else if (hs.pattern){
    h += '<div class="tv-note">Player headshots are published via the team\'s College Hockey News roster reference (third-party, link/fetch only — never saved copies of a school\'s copyrighted photos, and never a guessed photo URL).</div>';
  } else {
    h += '<div class="tv-note">No verified headshot source confirmed for this team. Player pictures publish on the team\'s official roster page.</div>';
  }
  return h + "</div>";
}
function packInfoHTML(key, pd){
  var h = '<div class="tv-sec"><div class="tv-title">TEAM INFO</div>';
  h += '<div class="tv-line">Conference: ' + confBtnHTML(pd.conf) + "</div>";
  h += '<div class="tv-line">Record: <span data-live-record="' + esc(key) + '">' + (pd.record ? esc(pd.record) + " (as of " + esc(pd.record_asof || "undated") + ")" : "not verified — not shown as 0-0-0") + "</span></div>";
  h += '<div class="tv-line">Ranking: <span data-live-rank="' + esc(key) + '">' + (pd.rank ? ("#" + pd.rank + " (as of " + esc(pd.rank_asof || "undated") + ")") : "not ranked in the saved data") + "</span></div>";
  if (pd.arena) h += '<div class="tv-line">Home arena: ' + esc(pd.arena) + "</div>";
  if (pd.coach) h += '<div class="tv-line">Head coach: ' + esc(pd.coach) + "</div>";
  if (pd.flags && pd.flags.live_feed_unconfirmed) h += '<div class="tv-note">No confirmed live feed for this team — the saved data below is the fallback, and live scores may not appear. This is stated, not assumed.</div>';
  h += '<div data-wiki-link="' + esc(key) + '"></div>';
  h += '<div class="tv-note">Saved data is the offline fallback only. Live data replaces it at runtime when the feed returns it; rankings are live re-checked and never ship undated.</div>';
  return h + "</div>";
}
function packExtraHTML(key, skipLeaders){
  var pd = packData(key);
  if (!pd) return "";
  return packDraftHTML(key, pd) + (skipLeaders ? "" : packLeadersHTML(key, pd)) + packPicturesHTML(key, pd);
}
function packFullHTML(key){
  var pd = packData(key);
  if (!pd) return '<div class="tv-sec"><div class="tv-title">TEAM INFO</div><div class="tv-note">No verified team data for this team in this app.</div></div>';
  return packInfoHTML(key, pd) +
    '<div class="tv-sec"><div class="tv-title">TEAM LOGOS</div><div class="tv-logos">' + localLogoVariantsHTML(key) + '</div><div class="tv-note">Verified team marks included in the app.</div></div>' +
    packRosterHTML(key, pd) + packLeadersHTML(key, pd) + packDraftHTML(key, pd) + packNewsHTML(key, pd) + packPicturesHTML(key, pd);
}

// ================= v17: postseason brackets =================
var BRACKET_SEEDS = {};
var BRACKET_RESULTS = {};
var BRACKET_FEED_NOTE = "Bracket feed: the ESPN postseason feed is unverified — slots stay TBD until a verified source confirms results. Nothing here is projected or guessed.";
function espnKeyForTeam(c){ try{ return (c && c.team && c.team.id) ? dirKeyForEspnId(c.team.id) : null; }catch(e){ return null; } }
function bracketSlotTeamHTML(teamKey){
  if (!teamKey) return '<span class="br-tbd">TBD</span>';
  var de = null; try{ de = dirEntry(teamKey); }catch(e){}
  var fav = ""; try{ fav = (getFavorites().indexOf(teamKey) >= 0) ? " fav-path" : ""; }catch(e){}
  if (de) return '<span class="br-team' + fav + '" data-team="' + esc(teamKey) + '">' + rankBadge(currentIntroRank(teamKey), teamKey) + teamLogoImg(de, "br-logo") + '<span class="br-name">' + esc(de.name) + "</span></span>";
  return '<span class="br-team' + fav + '">' + esc(teamKey) + "</span>";
}
function bracketDetailHTML(bid){
  var br = null;
  (typeof BRACKETS !== "undefined" ? BRACKETS : []).forEach(function(b){ if (b.id === bid) br = b; });
  if (!br) return '<div class="tv"><p>Bracket not found.</p></div>';
  var states = bracketStates(br, BRACKET_SEEDS, BRACKET_RESULTS);
  var html = '<div class="tv">';
  html += '<div class="tv-head"><div class="tv-name">' + esc(br.title) + "</div>";
  html += '<div class="tv-meta">' + esc(br.trophy) + "</div></div>";
  html += '<div class="tv-note">' + esc(br.note) + "</div>";
  html += '<div class="tv-note" id="br-feed-note">' + esc(BRACKET_FEED_NOTE) + "</div>";
  html += '<button class="tv-back" id="br-refresh" type="button">Refresh bracket data</button>';
  br.rounds.forEach(function(round){
    html += '<div class="tv-sec"><div class="tv-title">' + esc(round.name) + "</div><div class=\"tv-meta\">" + esc(round.date) + (round.note ? " &middot; " + esc(round.note) : "") + "</div>";
    round.games.forEach(function(g){
      var st = states[g.id];
      html += '<div class="br-game"><div class="br-row">' + bracketSlotTeamHTML(st.a) + '<span class="br-score">' + (st.score || "—") + "</span></div>";
      html += '<div class="br-row">' + bracketSlotTeamHTML(st.b) + '<span class="br-score">' + (st.series || "") + "</span></div>";
      if (st.a && st.b){ var bhl = h2hLine(st.a, st.b); if (bhl) html += '<div class="br-h2h">' + esc(bhl) + '</div>'; }
      if (st.advanced){ var wde = null; try{ wde = dirEntry(st.winner); }catch(e){} html += '<div class="br-adv">Advances: ' + esc(wde ? wde.name : st.winner) + "</div>"; }
      else if (st.live) html += '<div class="br-adv">Live</div>';
      html += "</div>";
    });
    html += "</div>";
  });
  html += '<div class="tv-note">Advancement happens only on a final result. In best-of-three series, a team advances only after its series-clinching (second) win — a game-1 win shows as a series lead, never advancement.</div></div>';
  return html;
}
function bracketListHTML(){
  var html = '<div class="tv">';
  html += '<div class="tv-head"><div class="tv-name">Postseason Brackets</div><div class="tv-meta">2027 conference championships, playoffs, Frozen Four &amp; national championship</div></div>';
  html += '<div class="tv-note">Slots show TBD until teams qualify. When a team makes its game, the TBD becomes that team\'s logo, then the score and advancement show live. Selection and seeding use NPI.</div>';
  (typeof BRACKETS !== "undefined" ? BRACKETS : []).forEach(function(b){
    html += '<button class="tv-back" data-bracket="' + esc(b.id) + '" type="button">' + esc(b.title) + " &mdash; " + esc(b.trophy) + "</button>";
  });
  return html + "</div>";
}
function showBracketView(bid, push){
  var bv = $("#bracketview"), mv = $("#michview"), tv = $("#teamview"), pv = $("#playerview"), cv = $("#confview"), sv = $("#settingsview"), fh = $("#favhomeview");
  if (!bv || !mv) return;
  if (push !== false && !(currentView.kind === "bracket" && currentView.key === bid)) pushNav();
  currentView = {kind: "bracket", key: bid || ""};
  bv.innerHTML = bid ? bracketDetailHTML(bid) : bracketListHTML();
  bv.hidden = false; mv.hidden = true;
  if (tv) tv.hidden = true; if (pv) pv.hidden = true; if (cv) cv.hidden = true; if (sv) sv.hidden = true; if (fh) fh.hidden = true;
  var sevb = $("#searchview"); if (sevb) sevb.hidden = true;
  var nevb = $("#neutralview"); if (nevb) nevb.hidden = true;
  document.body.classList.remove("teamview");
  try{ window.scrollTo(0, 0); }catch(e){}
  $$("[data-bracket]", bv).forEach(function(b){ b.addEventListener("click", function(){ showBracketView(b.getAttribute("data-bracket")); }); });
  $$("[data-team]", bv).forEach(function(b){ b.addEventListener("click", function(){ teamZoomTo(b.getAttribute("data-team")); }); });
  var rf = $("#br-refresh"); if (rf) rf.addEventListener("click", function(){ refreshBracketFeed(bid); });
  syncHeader(); syncBackState();
}
function refreshBracketFeed(bid){
  var note = $("#br-feed-note");
  var url = "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard?seasontype=3";
  fetch(url).then(function(r){ return r.json(); }).then(function(j){
    var br = null;
    (typeof BRACKETS !== "undefined" ? BRACKETS : []).forEach(function(b){ if (b.id === bid) br = b; });
    if (!br) return;
    var before = JSON.stringify(BRACKET_RESULTS);
    BRACKET_RESULTS = applyBracketFeed(br, BRACKET_SEEDS, BRACKET_RESULTS, j);
    if (note) note.textContent = (JSON.stringify(BRACKET_RESULTS) !== before)
      ? "Bracket feed: postseason results mapped from today's ESPN feed (single-elimination games only; series slots need a series result source)."
      : "Bracket feed: no postseason games in today's ESPN feed — slots stay TBD until a verified source confirms results.";
    showBracketView(bid, false);
  }).catch(function(){
    if (note) note.textContent = "Bracket feed: ESPN postseason feed could not be reached or verified — slots stay TBD until a verified source confirms results.";
  });
}



// ---------- v17 live API integrations (free, keyless only) ----------
// ESPN standings (live record re-check), NHL draft cross-check + current
// club (landing), Wikipedia reference link. Every fetch is shape-defensive
// with a silent bundled fallback: an unexpected payload shape, a missing
// field, or a network failure leaves the bundled data untouched and shows
// nothing extra. Nothing here claims a refresh rate the source does not
// state. The ESPN standings and NHL api-web response shapes are defensive
// parsers, not verified payloads — a real device observation is still owed.
var NHL_ABBREV = {ANA:"Anaheim Ducks",BOS:"Boston Bruins",BUF:"Buffalo Sabres",CAR:"Carolina Hurricanes",CBJ:"Columbus Blue Jackets",CGY:"Calgary Flames",CHI:"Chicago Blackhawks",COL:"Colorado Avalanche",DAL:"Dallas Stars",DET:"Detroit Red Wings",EDM:"Edmonton Oilers",FLA:"Florida Panthers",LAK:"Los Angeles Kings",MIN:"Minnesota Wild",MTL:"Montreal Canadiens",NJD:"New Jersey Devils",NSH:"Nashville Predators",NYI:"New York Islanders",NYR:"New York Rangers",OTT:"Ottawa Senators",PHI:"Philadelphia Flyers",PIT:"Pittsburgh Penguins",SJS:"San Jose Sharks",SEA:"Seattle Kraken",STL:"St. Louis Blues",TBL:"Tampa Bay Lightning",TOR:"Toronto Maple Leafs",UTA:"Utah Mammoth",VAN:"Vancouver Canucks",VGK:"Vegas Golden Knights",WPG:"Winnipeg Jets",WSH:"Washington Capitals"};
function nhlClubName(abbr){
  if (!abbr) return "";
  var a = String(abbr).toUpperCase();
  return NHL_ABBREV[a] || (a + " (NHL API)");
}
function normClub(str){ return String(str || "").toLowerCase().replace(/[^a-z]/g, ""); }
function splitViaClub(str){
  var m = String(str || "").match(/^(.*?)\s*\(via\s+(.+?)\)\s*$/i);
  if (m) return { main: m[1].trim(), via: m[2].trim() };
  return { main: String(str || ""), via: null };
}
function nhlLandingNote(bundledNhl, draftClubFull, currentClubFull){
  if (!currentClubFull || !draftClubFull) return "";
  if (bundledNhl && String(bundledNhl).indexOf("/") !== -1) return "";
  var bc = splitViaClub(bundledNhl);
  if (normClub(bc.main) === normClub(currentClubFull)) return "";
  if (bc.via && normClub(bc.via) === normClub(draftClubFull)) return "";
  if (normClub(bundledNhl) === normClub(draftClubFull) && normClub(currentClubFull) !== normClub(draftClubFull)){
    return "Now with " + currentClubFull + " (NHL API — current club; drafted by " + draftClubFull + ").";
  }
  return "";
}
var nhlDraftCache = {}, nhlLandingCache = {}, wikiCache = {};
var espnStandingsPromise = null;
var espnStandingsFetchedAt = 0;
function liveFetchJson(url){
  try{
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetchWithTimeout(url, 15000).then(function(r){ return r.json(); }).catch(function(){ return null; });
  }catch(e){ return Promise.resolve(null); }
}
function resetLiveCaches(){ nhlDraftCache = {}; nhlLandingCache = {}; wikiCache = {}; espnStandingsPromise = null; espnStandingsFetchedAt = 0; }
function parseNhlDraft(j){
  var out = [];
  try{
    var picks = [];
    if (j && j.drafts && j.drafts.length && j.drafts[0].rounds) j.drafts[0].rounds.forEach(function(rd){ (rd.picks || []).forEach(function(p){ picks.push({p: p, round: rd.roundNumber}); }); });
    else if (j && j.rounds) j.rounds.forEach(function(rd){ (rd.picks || []).forEach(function(p){ picks.push({p: p, round: rd.roundNumber}); }); });
    else if (j && j.picks) j.picks.forEach(function(p){ picks.push({p: p, round: null}); });
    picks.forEach(function(item){
      var p = item.p || {};
      var name = ((p.firstName || p.first) ? ((p.firstName || p.first) + " " + (p.lastName || p.last)) : (p.fullName || p.name || "")).trim();
      var teamRaw = p.teamAbbrev || (p.team && (p.team.abbrev || p.team.triCode)) || (p.team && p.team.name) || "";
      var club = (teamRaw && NHL_ABBREV[String(teamRaw).toUpperCase()]) ? NHL_ABBREV[String(teamRaw).toUpperCase()] : teamRaw;
      var round = (p.roundNumber !== undefined && p.roundNumber !== null) ? p.roundNumber : ((p.round !== undefined && p.round !== null) ? p.round : item.round);
      var overall = (p.overallPick !== undefined && p.overallPick !== null) ? p.overallPick : ((p.pickOverall !== undefined && p.pickOverall !== null) ? p.pickOverall : ((p.overall !== undefined && p.overall !== null) ? p.overall : null));
      var pid = (p.id !== undefined && p.id !== null) ? p.id : ((p.playerId !== undefined && p.playerId !== null) ? p.playerId : null);
      if (name) out.push({name: name, club: club, round: round, overall: overall, id: pid});
    });
  }catch(e){}
  return out;
}
function fetchNhlDraft(year){
  if (nhlDraftCache[year]) return nhlDraftCache[year];
  var pr = liveFetchJson("https://api-web.nhle.com/v1/draft/" + year).then(function(j){ return parseNhlDraft(j); });
  nhlDraftCache[year] = pr;
  return pr;
}
function parseNhlLanding(j){
  try{
    var ct = (j && j.currentTeam) || (j && j.currentClub) || null;
    if (ct) return (ct.abbrev || ct.triCode) ? nhlClubName(ct.abbrev || ct.triCode) : (ct.name || "");
    if (j && j.teamAbbrev) return nhlClubName(j.teamAbbrev);
  }catch(e){}
  return "";
}
function fetchNhlLanding(pid){
  if (nhlLandingCache[pid]) return nhlLandingCache[pid];
  var pr = liveFetchJson("https://api-web.nhle.com/v1/player/" + pid + "/landing").then(function(j){ return parseNhlLanding(j); });
  nhlLandingCache[pid] = pr;
  return pr;
}
function parseEspnStandings(j, espnId){
  try{
    var rows = (j && j.standings) || (j && j.children && j.children[0] && j.children[0].standings) || [];
    for (var i = 0; i < rows.length; i++){
      var row = rows[i];
      var tid = row.team && (row.team.id !== undefined ? row.team.id : row.team.abbrev);
      if (String(tid) !== String(espnId)) continue;
      var w = null, l = null, t = null;
      if (row.stats) row.stats.forEach(function(st){
        var nm = String(st.name || st.abbreviation || "").toLowerCase();
        if (/win/.test(nm)) w = st.value;
        else if (/loss/.test(nm)) l = st.value;
        else if (/tie/.test(nm)) t = st.value;
      });
      if (w === null && row.wins !== undefined) w = row.wins;
      if (l === null && row.losses !== undefined) l = row.losses;
      if (t === null && row.ties !== undefined) t = row.ties;
      if (w === null || l === null) return null;
      return (t === null || t === undefined) ? (w + "-" + l) : (w + "-" + l + "-" + t);
    }
  }catch(e){}
  return null;
}
function refreshTeamLiveRecord(key, force){
  try{
    var entry = dirEntry(key);
    if (!entry || !entry.espn) return;
    if (!espnStandingsPromise || force || Date.now() - espnStandingsFetchedAt > 15 * 60 * 1000){ espnStandingsPromise = liveFetchJson("https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/standings").catch(function(){ return liveFetchJson("https://site.api.espn.com/apis/site/v2/sports/ice_hockey/mens-college-hockey/standings"); }); espnStandingsFetchedAt = Date.now(); }
    espnStandingsPromise.then(function(j){
      var rec = parseEspnStandings(j, entry.espn);
      if (!rec) return;
      $$('[data-live-record="' + key + '"]').forEach(function(el){ el.textContent = rec + " (live, ESPN)"; });
    }).catch(function(){});
  }catch(e){}
}
// v18: rank badges on an open team page follow the live rankings feed.
// Only a feed-returned rank ever overwrites a displayed rank; bundled
// values are never written over a live value, and a missing feed rank
// leaves the display untouched (never blanked, never invented).
function refreshOpenTeamRanks(){
  try{
    var live = loadLiveRanks();
    if (!live) return;
    if (liveRanksExpired()) return;
    $$("[data-live-rank]").forEach(function(el){
      var k = el.getAttribute("data-live-rank");
      var r = live[k];
      if (typeof r !== "number" || r < 1 || r > 20 || Math.floor(r) !== r) return;
      var inner = el.querySelector(".rank-badge");
      if (inner) inner.textContent = "#" + r;
      else el.textContent = "#" + r + " (live)";
    });
  }catch(e){}
}
function refreshNhlDraftCheck(key){
  try{
    var pd = packData(key);
    if (!pd || !pd.drafted || !pd.drafted.length) return;
    var years = [];
    pd.drafted.forEach(function(d){ if (d.year && years.indexOf(d.year) === -1) years.push(d.year); });
    if (!years.length) return;
    Promise.all(years.map(function(y){ return fetchNhlDraft(y); })).then(function(results){
      var byName = {};
      results.forEach(function(list){ (list || []).forEach(function(p){ byName[normName(p.name)] = p; }); });
      var agreed = 0, lines = [], landingJobs = [];
      pd.drafted.forEach(function(d){
        var m = byName[normName(d.player)];
        if (!m) return;
        var diffs = [];
        var bc = splitViaClub(d.nhl);
        var clubAgree = normClub(bc.main) === normClub(m.club) || (bc.via && normClub(bc.via) === normClub(m.club));
        if (d.nhl && m.club && String(d.nhl).indexOf("/") === -1 && !clubAgree) diffs.push("club: in this app " + d.nhl + " vs NHL " + m.club);
        if (d.round !== null && d.round !== undefined && m.round !== null && m.round !== undefined && String(d.round) !== String(m.round)) diffs.push("round: in this app Round " + d.round + " vs NHL Round " + m.round);
        if (d.overall !== null && d.overall !== undefined && m.overall !== null && m.overall !== undefined && String(d.overall) !== String(m.overall)) diffs.push("overall: in this app #" + d.overall + " vs NHL #" + m.overall);
        if (!diffs.length) agreed++;
        else lines.push("NHL API differs for " + d.player + ": " + diffs.join("; ") + " (both shown; the app\'s value kept).");
        if (m.id !== null && m.id !== undefined) landingJobs.push({d: d, m: m});
      });
      var render = function(landingLines){
        var div = document.querySelector('[data-nhl-check="' + key + '"]');
        if (!div) return;
        var html = "";
        if (agreed > 0) html += '<div class="tv-note">NHL API confirms ' + agreed + ' draft record(s).</div>';
        lines.forEach(function(ln){ html += '<div class="tv-note">' + esc(ln) + "</div>"; });
        if (lines.length) html += '<div class="tv-note">NHL check notes a difference not yet in the saved list — see report.</div>';
        landingLines.forEach(function(ln){ html += '<div class="tv-note">' + esc(ln) + "</div>"; });
        div.innerHTML = html;
      };
      if (!landingJobs.length){ render([]); return; }
      var landingLines = [];
      var batches = [];
      for (var i = 0; i < landingJobs.length; i += 4) batches.push(landingJobs.slice(i, i + 4));
      var chain = Promise.resolve();
      batches.forEach(function(batch){
        chain = chain.then(function(){
          return Promise.all(batch.map(function(job){
            return fetchNhlLanding(job.m.id).then(function(cur){
              var note = nhlLandingNote(job.d.nhl, job.m.club, cur);
              if (note) landingLines.push(job.d.player + " — " + note);
            }).catch(function(){});
          }));
        });
      });
      chain.then(function(){ render(landingLines); }).catch(function(){ render([]); });
    }).catch(function(){});
  }catch(e){}
}
function refreshWikiLink(key){
  try{
    if (wikiCache[key]) return;
    var pd = packData(key);
    var entry = dirEntry(key);
    var name = (pd && pd.name) || (entry && entry.name);
    if (!name) return;
    wikiCache[key] = true;
    liveFetchJson("https://en.wikipedia.org/w/api.php?action=opensearch&search=" + encodeURIComponent(name) + "&limit=1&namespace=0&format=json").then(function(j){
      var div = document.querySelector('[data-wiki-link="' + key + '"]');
      if (!div) return;
      if (j && j[1] && j[1].length && j[3] && j[3].length){
        div.innerHTML = '<div class="tv-news"><a href="' + esc(j[3][0]) + '">Wikipedia — ' + esc(j[1][0]) + "</a></div>";
      }
    }).catch(function(){});
  }catch(e){}
}
// v18: live team-news refresh (uniform 30s poll). ESPN site-API news for the
// team; headlines render into #tv-news-live when the feed returns them.
// Failure or an empty feed leaves the container untouched — bundled items /
// the fallback note stay, never blanked, never faked.
function refreshTeamNews(key){
  try{
    var box = $("#tv-news-live");
    if (!box || !key) return;
    var entry = dirEntry(key);
    if (!entry || !entry.espn) return;
    if (typeof fetch !== "function") return;
    var url = "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/news?team=" + entry.espn;
    fetchWithTimeout(url, 15000).then(function(r){ return r.json(); }).then(function(j){
      var arts = (j && j.articles) || [];
      if (!arts.length) return;
      var html = "";
      arts.slice(0, 5).forEach(function(a){
        var href = "";
        try{ href = (a.links && a.links.web && a.links.web.href) || a.url || ""; }catch(e){}
        var head = a.headline || a.title || "";
        if (!head) return;
        html += '<div class="tv-news">' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(head) + '</a>' : esc(head)) + '<div class="tv-news-meta">LIVE — ESPN news feed · updated ' + new Date().toLocaleTimeString() + '</div></div>';
      });
      if (html && $("#tv-news-live")) $("#tv-news-live").innerHTML = html;
    }).catch(function(){});
  }catch(e){}
}
function refreshTeamLiveData(key){
  if (!key) return;
  refreshTeamLiveRecord(key);
  refreshTeamNews(key);
  refreshNhlDraftCheck(key);
  refreshWikiLink(key);
}

// v17 test hooks (inside the IIFE scope, like all other hooks).
window.__vmaxTest = window.__vmaxTest || {};
window.__vmaxTest.showBracketView = showBracketView;
window.__vmaxTest.espnKeyForTeam = espnKeyForTeam;
window.__vmaxTest.bracketDetailHTML = bracketDetailHTML;
window.__vmaxTest.bracketListHTML = bracketListHTML;
window.__vmaxTest.packFullHTML = packFullHTML;
window.__vmaxTest.packExtraHTML = packExtraHTML;
window.__vmaxTest.packData = packData;
window.__vmaxTest.teamEntry = teamEntry;
window.__vmaxTest.packToTeamEntry = packToTeamEntry;
window.__vmaxTest.teamSchedRowsHTML = teamSchedRowsHTML;
window.__vmaxTest.applyRosterNumbers = applyRosterNumbers;
window.__vmaxTest.teamViewHTML = teamViewHTML;
window.__vmaxTest.nhlClubName = nhlClubName;
window.__vmaxTest.nhlLandingNote = nhlLandingNote;
window.__vmaxTest.resetLiveCaches = resetLiveCaches;
window.__vmaxTest.refreshTeamLiveData = refreshTeamLiveData;
window.__vmaxTest.setLiveEspnGameId = function(n, id){ if (id === null || id === undefined) delete LIVE_ESPN_GAME_IDS[n]; else LIVE_ESPN_GAME_IDS[n] = id; };
window.__vmaxTest.setBracketSeed = function(bid, seed, key){ if (!BRACKET_SEEDS[bid]) BRACKET_SEEDS[bid] = {}; BRACKET_SEEDS[bid][seed] = key; };
window.__vmaxTest.setBracketResult = function(gid, a, b, status, series){ BRACKET_RESULTS[gid] = {a: a, b: b, status: status, series: series || null}; };
window.__vmaxTest.clearBracketData = function(){ BRACKET_SEEDS = {}; BRACKET_RESULTS = {}; };
window.__vmaxTest.liveEspnGameId = function(n){ return LIVE_ESPN_GAME_IDS[n] || null; };
window.__vmaxTest.refreshDetails = refreshDetails;
window.__vmaxTest.mergeFeedIntoRows = mergeFeedIntoRows;
window.__vmaxTest.playIntro = playIntro;
window.__vmaxTest.schedRowHTML = schedRowHTML;
window.__vmaxTest.applySavedResultsToFeed = applySavedResultsToFeed;
window.__vmaxTest.parseEspnSched = parseEspnSched;
window.__vmaxTest.feedCentralDate = feedCentralDate;
window.__vmaxTest.liveGameInfo = liveGameInfo;
window.__vmaxTest.liveTick = liveTick;
})();
