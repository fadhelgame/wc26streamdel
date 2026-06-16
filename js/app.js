// ─── GLOBALS ─────────────────────────────────────────────────────────────────
let currentMatch = null;
let currentStreamIndex = -1;
let hlsInstance = null;
let activeTab = 'today';

const menuScreen   = document.getElementById('menu-screen');
const streamScreen = document.getElementById('stream-screen');
const video     = document.getElementById('video-player');
const iframe    = document.getElementById('iframe-player');
const placeholder = document.getElementById('player-placeholder');
const matchInfoEl = document.getElementById('match-info');
const streamBar = document.getElementById('stream-bar');
const streamSelect = document.getElementById('stream-select');

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  updateClock();
  setInterval(updateClock, 1000);

  // Auto-fetch & status refresh digabung jadi 1 interval hemat
  startPolling();

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
    });
  });

  renderList();
  syncScoresFromESPN(); // fetch live ESPN scores on load
}

// ─── POLLING ENGINE ───────────────────────────────────────────────────────────
// Hemat Netlify Function invocation:
//  - Gabung fetchLiveStreams + refreshStatuses jadi 1 interval
//  - Cuma fetch ke API kalo ada match yg akan/ sedang live (dalam 3 jam)
//  - Kalo match udah punya stream, cooldown 2 menit sebelum fetch ulang
let pollInterval = null;

function startPolling() {
  fetchLiveStreams(); // langsung jalan pas buka web
  pollInterval = setInterval(poll, 60000); // tiap 60 detik, bukan 30!
}

function poll() {
  // ── Refresh status match & UI selalu jalan (local-only, no API) ──────
  refreshStatuses();

  // ── ESPN score sync — cheap, CORS-open, update scores live ───────────
  syncScoresFromESPN();

  // ── Tapi fetch ke API cuma kalo ada match yg relevan ────────────────
  if (!hasUpcomingMatches()) {
    return; // skip API call, hemat Netlify Function invocation
  }

  // ── Fetch stream terbaru (cooldown 2m ada di dalam) ──────────────────
  fetchLiveStreams();
}

function hasUpcomingMatches() {
  const now = Date.now();
  const windowStart = now - 2 * 60 * 60 * 1000; // 2 jam lalu (match selesai)
  const windowEnd   = now + 4 * 60 * 60 * 1000; // 4 jam ke depan

  return MATCHES.some(m => {
    if (m.status === 'FT') return false;
    const kickoff = new Date(m.utc).getTime();
    return kickoff >= windowStart && kickoff <= windowEnd;
  });
}

// ─── CLOCK ───────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const str = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
            + '  •  '
            + now.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('clock').textContent = str;
}

// ─── STATUS DETECTION ────────────────────────────────────────────────────────
function getComputedStatus(match) {
  if (match.status === 'FT') return 'FT';
  const now = Date.now();
  const kickoff = new Date(match.utc).getTime();
  const elapsed = now - kickoff;
  if (elapsed < 0)              return 'NS';
  if (elapsed < 2 * 60 * 60 * 1000) return 'LIVE';
  return 'FT';
}

function refreshStatuses() {
  if (currentMatch) {
    const fresh = MATCHES.find(m => m.id === currentMatch.id);
    if (fresh) updateInfoBar(fresh);
  }
  renderList();
}

// ─── TODAY DETECTION ─────────────────────────────────────────────────────────
function isToday(utcStr) {
  const d = new Date(utcStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth()    === now.getMonth()
      && d.getDate()     === now.getDate();
}

function isTomorrow(utcStr) {
  const d = new Date(utcStr);
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return d.getFullYear() === tom.getFullYear()
      && d.getMonth()    === tom.getMonth()
      && d.getDate()     === tom.getDate();
}

// ─── FILTER BY TAB ───────────────────────────────────────────────────────────
function filteredMatches() {
  if (activeTab === 'today') {
    let todayMatches = MATCHES.filter(m => isToday(m.utc));
    if (todayMatches.length === 0) {
      // Include upcoming hours if today list is empty
      todayMatches = MATCHES.filter(m => {
        const s = getComputedStatus(m);
        return s === 'NS' || s === 'LIVE';
      }).slice(0, 8);
    }
    // Urut: LIVE dulu → FT terbaru ke lama → NS terdekat ke jauh
    return todayMatches.sort((a, b) => {
      const priority = m => {
        const s = getComputedStatus(m);
        if (s === 'LIVE') return 0;
        if (s === 'FT')   return 1;
        return 2; // NS upcoming
      };
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      // FT: terbaru (UTC terbesar) di atas
      if (pa === 1) return new Date(b.utc) - new Date(a.utc);
      // NS: paling dekat (UTC terkecil) di atas
      return new Date(a.utc) - new Date(b.utc);
    });
  }
  if (activeTab === 'schedule') {
    const now = Date.now();
    return MATCHES.filter(m => {
      const s = getComputedStatus(m);
      return s === 'NS';
    });
  }
  if (activeTab === 'results') {
    return MATCHES.filter(m => {
      const s = getComputedStatus(m);
      return s === 'FT';
    }).reverse();
  }
  return MATCHES;
}

// ─── RENDER LIST ─────────────────────────────────────────────────────────────
function renderList() {
  const list = document.getElementById('match-list');
  const matches = filteredMatches();

  if (matches.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:.8rem;">Tidak ada pertandingan</div>';
    return;
  }

  let html = '';

  // ── LIVE section: always pinned at top ──────────────────────────────────
  const liveMatches = matches.filter(m => getComputedStatus(m) === 'LIVE');
  const otherMatches = matches.filter(m => getComputedStatus(m) !== 'LIVE');

  if (liveMatches.length > 0) {
    html += `<div class="live-section-label"><span class="live-pulse"></span>Sedang Live</div>`;
    liveMatches.forEach(m => { html += buildCard(m); });
  }

  // ── Remaining matches grouped by day ────────────────────────────────────
  let lastDay = null;
  otherMatches.forEach(match => {
    const d = new Date(match.utc);
    const dayKey = d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });

    if (dayKey !== lastDay) {
      const today = isToday(match.utc);
      const tom   = isTomorrow(match.utc);
      const label = today ? '⚡ Hari Ini' : tom ? '▷ Besok' : dayKey;
      html += `<div class="day-label">${label}</div>`;
      lastDay = dayKey;
    }
    html += buildCard(match);
  });

  list.innerHTML = html;

  // attach click
  list.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      selectMatch(id);
    });
  });

  // highlight selected
  if (currentMatch) {
    const sel = list.querySelector(`[data-id="${currentMatch.id}"]`);
    if (sel) sel.classList.add('selected');
  }
}

function buildCard(match) {
  const status = getComputedStatus(match);
  const isLive = status === 'LIVE';
  const isFT   = status === 'FT';

  const d = new Date(match.utc);
  const timeStr = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  let timeLabel, timeCls;
  if (isLive)      { timeLabel = '● LIVE';  timeCls = 'live-time'; }
  else if (isFT)   { timeLabel = 'FT';      timeCls = ''; }
  else             { timeLabel = timeStr;   timeCls = ''; }

  let scoreHtml;
  if (isFT && match.homeScore !== null) {
    scoreHtml = `<div class="card-score">${match.homeScore} – ${match.awayScore}</div>`;
  } else if (isLive) {
    const h = match.homeScore !== null ? match.homeScore : 0;
    const a = match.awayScore !== null ? match.awayScore : 0;
    scoreHtml = `<div class="card-score" style="color:var(--live)">${h} – ${a}</div>`;
  } else {
    scoreHtml = `<div class="card-score vs">VS</div>`;
  }

  const statusCls = isLive ? 'live-card' : isFT ? 'ft-card' : 'ns-card';
  const cardCls = `match-card ${statusCls}`;

  return `
    <div class="${cardCls}" data-id="${match.id}">
      <div class="card-top">
        <span class="card-group">Grup ${match.group} · MD${match.md}</span>
        <span class="card-time ${timeCls}">${timeLabel}</span>
      </div>
      <div class="teams-row">
        <div class="card-team">
          <span class="card-flag">${FLAGS[match.home] || '🏳️'}</span>
          <span class="card-name">${match.home}</span>
        </div>
        ${scoreHtml}
        <div class="card-team away-t">
          <span class="card-name">${match.away}</span>
          <span class="card-flag">${FLAGS[match.away] || '🏳️'}</span>
        </div>
      </div>
    </div>`;
}

// ─── SCREEN SWITCHING ──────────────────────────────────────────────────────────
function showStream() {
  menuScreen.style.display = 'none';
  streamScreen.style.display = 'flex';
  window.scrollTo(0, 0);
}

function showMenu() {
  // Stop stream
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.style.display = 'none';
  video.src = '';
  iframe.style.display = 'none';
  iframe.src = '';

  streamScreen.style.display = 'none';
  menuScreen.style.display = 'block';
  currentMatch = null;
  renderList();
}
window.showMenu = showMenu;
window.showStream = showStream;

// ─── SELECT MATCH ────────────────────────────────────────────────────────────
function selectMatch(id) {
  const match = MATCHES.find(m => m.id === id);
  if (!match) return;

  showStream(); // pindah ke LAYAR 2

  currentMatch = match;
  currentStreamIndex = -1;

  // Hentikan stream sebelumnya
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.style.display = 'none';
  video.src = '';
  iframe.style.display = 'none';
  iframe.src = '';
  showPlaceholder();

  // Update sidebar highlight
  document.querySelectorAll('.match-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) card.classList.add('selected');

  // Show info bar
  updateInfoBar(match);
  matchInfoEl.style.display = 'flex';
  streamBar.style.display = 'flex';

  // Auto-fill code input — generate dari nama tim
  document.getElementById('code-input').value = generateMatchCode(match.home, match.away);

  // Build stream source buttons (isi dropdown, ga auto-play)
  buildStreamButtons(match);
}

// Resolve streams: prefer manual streams[], fallback to genStreams(matchCode / auto)
function resolveStreams(match) {
  if (match.streams && match.streams.length > 0) return match.streams;
  const code = match.matchCode || generateMatchCode(match.home, match.away);
  if (code) return genStreams(code);
  return [];
}

// Build dropdown stream selector
function buildStreamButtons(match) {
  const streams = resolveStreams(match);
  streamSelect.innerHTML = '<option value="">— Pilih Stream —</option>';

  let hasOptions = false;

  // ── Primary streams (dari auto-fetch API) ────────────────────────────
  if (streams.length > 0) {
    const g = document.createElement('optgroup');
    g.label = 'STREAM UTAMA';
    streams.forEach((s, i) => {
      const o = document.createElement('option');
      o.value = 'p:' + i;
      o.textContent = s.label;
      g.appendChild(o);
    });
    streamSelect.appendChild(g);
    hasOptions = true;
  }

  // ── Alternative TV channels (IPTV) ───────────────────────────────────
  if (ALT_CHANNELS.length > 0) {
    const g = document.createElement('optgroup');
    g.label = 'TV ALTERNATIF';
    ALT_CHANNELS.forEach((ch, i) => {
      const o = document.createElement('option');
      o.value = 'a:' + i;
      o.textContent = ch.label + (ch.note ? ' — ' + ch.note : '');
      g.appendChild(o);
    });
    streamSelect.appendChild(g);
    hasOptions = true;
  }

}

function onStreamSelect(sel) {
  const val = sel.value;
  if (!val) return;

  const [type, idxStr] = val.split(':');
  const idx = parseInt(idxStr);

  let url = '';
  if (type === 'p') {
    const streams = resolveStreams(currentMatch);
    url = streams[idx]?.url;
  } else if (type === 'a') {
    const channel = ALT_CHANNELS[idx];
    if (!channel) return;
    // CazeTv — special handling via Invidious geo-bypass
    if (channel.isCazeTv) {
      playCazeTv(channel.videoId);
      return;
    }
    url = channel.url;
  }

  if (url) playStream(url);
}

function escUrl(url) {
  return url.replace(/'/g, "\\'");
}

function updateInfoBar(match) {
  const status = getComputedStatus(match);
  document.getElementById('home-flag').textContent = FLAGS[match.home] || '🏳️';
  document.getElementById('away-flag').textContent = FLAGS[match.away] || '🏳️';
  document.getElementById('home-name').textContent = match.home;
  document.getElementById('away-name').textContent = match.away;

  const scoreEl  = document.getElementById('score-num');
  const statusEl = document.getElementById('score-status');

  const d = new Date(match.utc);
  const dateStr = d.toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

  if (status === 'FT' && match.homeScore !== null) {
    scoreEl.textContent = `${match.homeScore} – ${match.awayScore}`;
    statusEl.textContent = 'Full Time';
    statusEl.className = 'score-status';
  } else if (status === 'LIVE') {
    const h = match.homeScore !== null ? match.homeScore : 0;
    const a = match.awayScore !== null ? match.awayScore : 0;
    scoreEl.textContent = `${h} – ${a}`;
    statusEl.textContent = '● LIVE';
    statusEl.className = 'score-status live-status';
  } else {
    scoreEl.textContent = 'VS';
    statusEl.textContent = 'Kick-off';
    statusEl.className = 'score-status';
  }

  const meta = [`Grup ${match.group}`, match.venue, dateStr].filter(Boolean);
  document.getElementById('match-meta').innerHTML =
    meta.map(t => `<span>${t}</span>`).join('<span class="meta-sep">•</span>');

  // Blue gradient on info bar when match is live
  if (status === 'LIVE') {
    matchInfoEl.classList.add('info-live');
  } else {
    matchInfoEl.classList.remove('info-live');
  }
}

// ─── CAZETV — YouTube Brazil via Invidious (geo-bypass) ──────────────────────
// Pake Invidious instance biar YouTube nganggap viewer dari IP server Invidious,
// bukan IP user. Region=BR bikin YouTube ngasih konten versi Brazil.
// Fallback otomatis: kalo instance A gagal, coba instance B, C, dst.
function getInvidiousEmbedUrl(videoId, instanceIndex) {
  const idx = instanceIndex !== undefined
    ? instanceIndex
    : Math.floor(Math.random() * INVIDIOUS_INSTANCES.length);
  const host = INVIDIOUS_INSTANCES[idx].host;
  return `https://${host}/embed/${videoId}?region=BR&autoplay=1&local=true&hl=pt`;
}

function playCazeTv(videoId, attempt) {
  if (!videoId) return;
  attempt = attempt || 0;

  // Kalo semua instance udah dicoba, kasih tau user
  if (attempt >= INVIDIOUS_INSTANCES.length) {
    showPlaceholder();
    placeholder.innerHTML = `
      <div style="font-size:2.5rem;margin-bottom:8px;">😕</div>
      <h2>CazeTv gagal dimuat</h2>
      <p style="font-size:.8rem;color:#666;max-width:300px;">
        Semua Invidious instance dicoba tapi ga ada yg berhasil.
        Mungkin live udah selesai, atau YouTube blokir instance.
        Coba refresh halaman atau pilih stream lain.
      </p>
    `;
    return;
  }

  const instance = INVIDIOUS_INSTANCES[attempt];
  const url = `https://${instance.host}/embed/${videoId}?region=BR&autoplay=1&local=true&hl=pt`;

  // Tampilkan placeholder saat loading
  showPlaceholder();
  placeholder.innerHTML = `
    <div style="font-size:3rem;margin-bottom:8px;">🇧🇷</div>
    <h2>CazeTv — Bypass Geo</h2>
    <p style="font-size:.8rem;color:#666;">
      Invidious: ${instance.label}
      ${attempt > 0 ? `· Percobaan ${attempt + 1}/${INVIDIOUS_INSTANCES.length}` : ''}
    </p>
  `;

  // Load ke iframe
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.style.display = 'none';
  video.src = '';
  placeholder.style.display = 'none';
  iframe.style.display = 'block';

  // Bersihin timer sebelumnya kalo ada
  if (window._cazeTvTimer) { clearTimeout(window._cazeTvTimer); }

  // Flag buat ngecek apakah iframe berhasil load (event 'load' fired)
  let loaded = false;

  iframe.onload = () => {
    loaded = true;
    // Clear fallback timer — sesuatu udah ter-load
    if (window._cazeTvTimer) {
      clearTimeout(window._cazeTvTimer);
      window._cazeTvTimer = null;
    }
  };

  // Set iframe src
  iframe.src = url;

  // Fallback: kalo 10 detik ga ada 'load' event, coba instance berikutnya
  window._cazeTvTimer = setTimeout(() => {
    if (!loaded) {
      console.warn(`CazeTv: ${instance.label} no load event, trying next...`);
      iframe.onload = null; // cleanup
      playCazeTv(videoId, attempt + 1);
    }
  }, 10000);
}

// Override showMenu & showPlaceholder to cancel CazeTv timer
const _origShowMenu = window.showMenu;
window.showMenu = function() {
  if (window._cazeTvTimer) { clearTimeout(window._cazeTvTimer); window._cazeTvTimer = null; }
  _origShowMenu();
};

// ─── PLAY STREAM ─────────────────────────────────────────────────────────────
function playStream(url) {
  if (!url || url.trim() === '') return;
  url = url.trim();

  // Cleanup: cancel any pending CazeTv fallback timer
  if (window._cazeTvTimer) {
    clearTimeout(window._cazeTvTimer);
    window._cazeTvTimer = null;
  }
  iframe.onload = null; // Reset iframe load handler

  // Detect stream type
  if (url.match(/\.m3u8(\?.*)?$/i)) {
    playHLS(url);
  } else {
    playIframe(url);
  }
}

function playHLS(url) {
  // Hide iframe, show video
  iframe.style.display = 'none';
  iframe.src = '';
  placeholder.style.display = 'none';
  video.style.display = 'block';

  // Destroy previous HLS instance
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
    });
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
    hlsInstance.on(Hls.Events.ERROR, (ev, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hlsInstance.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance.recoverMediaError();
            break;
          default:
            console.error('HLS fatal error:', data);
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS (Safari)
    video.src = url;
    video.play().catch(() => {});
  } else {
    // Fallback: try as iframe
    playIframe(url);
  }
}

function playIframe(url) {
  // Hide video, show iframe
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.style.display = 'none';
  video.src = '';
  placeholder.style.display = 'none';
  iframe.style.display = 'block';
  iframe.src = url;
}

function showPlaceholder() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.style.display = 'none';
  video.src = '';
  iframe.style.display = 'none';
  iframe.src = '';
  placeholder.style.display = 'flex';
  placeholder.innerHTML = `
    <div class="ph-ball">⚽</div>
    <h2>${currentMatch ? currentMatch.home + ' vs ' + currentMatch.away : 'World Cup 2026'}</h2>
    <p>Paste URL stream di bawah dan klik <strong>▶ Play</strong></p>
  `;
}

// ─── MATCH CODE OVERRIDE ─────────────────────────────────────────────────────
// User ketik code (misal: G_VS_C) saat match live → auto-generate 9 stream URL
function applyMatchCode() {
  const code = document.getElementById('code-input').value.trim().toUpperCase();
  if (!code) return;

  if (currentMatch) {
    currentMatch.matchCode = code;
    currentMatch.streams = []; // reset manual streams so genStreams takes over
    buildStreamButtons(currentMatch);
  }
}

document.getElementById('code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') applyMatchCode();
});

// ─── CUSTOM URL ──────────────────────────────────────────────────────────────
function loadCustomUrl() {
  const url = document.getElementById('url-input').value.trim();
  if (!url) return;

  // Add to current match's streams list dynamically
  if (currentMatch) {
    const existing = currentMatch.streams || [];
    const newIdx = resolveStreams(currentMatch).length;
    existing.push({ label: 'Custom ' + (existing.length + 1), url });
    currentMatch.streams = existing;
    buildStreamButtons(currentMatch);
    // Select custom stream in dropdown
    const opts = streamSelect.options;
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].textContent.startsWith('Custom')) {
        streamSelect.value = opts[i].value;
        break;
      }
    }
    onStreamSelect(streamSelect);
  } else {
    // No match selected: just play the URL
    playStream(url);
    streamBar.style.display = 'flex';
    matchInfoEl.style.display = 'none';
  }
}

// Allow pressing Enter in URL input
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') loadCustomUrl();
});

// ─── ESPN LIVE SCORE SYNC ─────────────────────────────────────────────────────
// Fetch scores from ESPN public API (CORS-open, no key needed).
// Runs on init + every poll to keep results and live scores current.
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN team name → our MATCHES team name
const ESPN_NAME_MAP = {
  'United States':                'USA',
  'Bosnia and Herzegovina':       'Bosnia & Herz.',
  'Bosnia-Herzegovina':           'Bosnia & Herz.',
  'Bosnia Herzegovina':           'Bosnia & Herz.',
  "Côte d'Ivoire":                'Ivory Coast',
  "Cote d'Ivoire":                'Ivory Coast',
  'Congo DR':                     'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Cabo Verde':                   'Cape Verde',
  'Korea Republic':               'South Korea',
  'Czech Republic':               'Czechia',
};
function espnName(n) { return ESPN_NAME_MAP[n] || n; }

function toDateStr(d) {
  return d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0');
}

async function fetchESPNDate(dateStr) {
  try {
    const res = await fetch(`${ESPN_URL}?dates=${dateStr}`);
    if (!res.ok) return;
    const data = await res.json();
    let changed = false;
    (data.events || []).forEach(event => {
      const comp = event.competitions?.[0];
      if (!comp) return;
      let homeC, awayC;
      (comp.competitors || []).forEach(c => {
        if (c.homeAway === 'home') homeC = c;
        else awayC = c;
      });
      if (!homeC || !awayC) return;

      const homeName  = espnName(homeC.team.displayName);
      const awayName  = espnName(awayC.team.displayName);
      const homeScore = homeC.score != null ? parseInt(homeC.score) : null;
      const awayScore = awayC.score != null ? parseInt(awayC.score) : null;
      const state     = comp.status?.type?.state;       // 'pre'|'in'|'post'
      const completed = comp.status?.type?.completed;
      const clock     = comp.status?.displayClock;

      const match = MATCHES.find(m => m.home === homeName && m.away === awayName);
      if (!match) return;

      if (homeScore !== null && awayScore !== null) {
        if (match.homeScore !== homeScore || match.awayScore !== awayScore) {
          match.homeScore = homeScore;
          match.awayScore = awayScore;
          changed = true;
        }
      }
      if ((completed || state === 'post') && match.status !== 'FT') {
        match.status = 'FT';
        changed = true;
      }
      if (state === 'in') {
        match._espnClock = clock || '';
      }
    });
    return changed;
  } catch (e) {
    console.warn('ESPN sync failed:', e);
    return false;
  }
}

async function syncScoresFromESPN() {
  const datesToFetch = new Set();

  // Always fetch today
  const today = new Date();
  datesToFetch.add(toDateStr(today));

  // Yesterday (UTC late matches may bleed into next calendar day locally)
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  datesToFetch.add(toDateStr(yest));

  // Any past match that has null scores (backfill)
  MATCHES.forEach(m => {
    if (m.homeScore === null && new Date(m.utc) < today) {
      datesToFetch.add(toDateStr(new Date(m.utc)));
    }
  });

  let anyChange = false;
  for (const d of datesToFetch) {
    const changed = await fetchESPNDate(d);
    if (changed) anyChange = true;
  }

  if (anyChange) {
    renderList();
    if (currentMatch) updateInfoBar(currentMatch);
  }
}

// ─── START ────────────────────────────────────────────────────────────────────
init();
