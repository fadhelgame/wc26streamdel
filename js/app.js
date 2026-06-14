// ─── GLOBALS ─────────────────────────────────────────────────────────────────
let currentMatch = null;
let currentStreamIndex = -1;
let hlsInstance = null;
let activeTab = 'today';

const video     = document.getElementById('video-player');
const iframe    = document.getElementById('iframe-player');
const placeholder = document.getElementById('player-placeholder');
const matchInfoEl = document.getElementById('match-info');
const streamBar = document.getElementById('stream-bar');
const streamSourcesEl = document.getElementById('stream-sources');

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(refreshStatuses, 30000);

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
    });
  });

  renderList();
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
    const todayMatches = MATCHES.filter(m => isToday(m.utc));
    // Include upcoming hours if today list is empty
    if (todayMatches.length === 0) {
      return MATCHES.filter(m => {
        const s = getComputedStatus(m);
        return s === 'NS' || s === 'LIVE';
      }).slice(0, 8);
    }
    return todayMatches;
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
  let lastDay = null;

  matches.forEach(match => {
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

  const resolvedStreams = resolveStreams(match);
  const streamCount = resolvedStreams.length;
  const streamHint = (isLive || status === 'NS') && streamCount > 0
    ? `<div class="stream-hint"><span class="s-dot"></span>${streamCount} stream tersedia</div>`
    : (isLive || status === 'NS')
        ? `<div class="stream-hint" style="color:var(--muted)">Paste URL stream manual</div>`
        : '';

  const cardCls = ['match-card', isLive ? 'live-card' : ''].join(' ').trim();

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
      ${streamHint}
    </div>`;
}

// ─── SELECT MATCH ────────────────────────────────────────────────────────────
function selectMatch(id) {
  const match = MATCHES.find(m => m.id === id);
  if (!match) return;

  currentMatch = match;
  currentStreamIndex = -1;

  // Update sidebar highlight
  document.querySelectorAll('.match-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) card.classList.add('selected');

  // Show info bar
  updateInfoBar(match);
  matchInfoEl.style.display = 'flex';
  streamBar.style.display = 'flex';

  // Fill code input with current matchCode
  document.getElementById('code-input').value = match.matchCode || '';

  // Build stream source buttons
  buildStreamButtons(match);

  // Auto-play first stream if available
  const streams = resolveStreams(match);
  if (streams.length > 0) {
    playStream(streams[0].url, 0);
  } else {
    showPlaceholder();
  }
}

// Resolve streams: prefer manual streams[], fallback to genStreams(matchCode)
function resolveStreams(match) {
  if (match.streams && match.streams.length > 0) return match.streams;
  if (match.matchCode) return genStreams(match.matchCode);
  return [];
}

function buildStreamButtons(match) {
  const streams = resolveStreams(match);
  if (streams.length === 0) {
    streamSourcesEl.innerHTML = '<span style="font-size:.72rem;color:var(--muted)">Paste URL stream di bawah</span>';
    return;
  }
  let html = '';
  streams.forEach((s, i) => {
    html += `<button class="src-btn" data-idx="${i}" onclick="playStream('${escUrl(s.url)}', ${i})">${s.label || 'Stream ' + (i+1)}</button>`;
  });
  streamSourcesEl.innerHTML = html;
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
    const d = new Date(match.utc);
    scoreEl.textContent = 'VS';
    statusEl.textContent = d.toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    statusEl.className = 'score-status';
  }

  document.getElementById('match-meta').innerHTML =
    `<span>Grup ${match.group}</span><span>•</span><span>${match.venue || ''}</span>`;
}

// ─── PLAY STREAM ─────────────────────────────────────────────────────────────
function playStream(url, idx) {
  currentStreamIndex = idx;

  // Update button states
  document.querySelectorAll('.src-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });

  if (!url || url.trim() === '') return;
  url = url.trim();

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
    const streams = resolveStreams(currentMatch);
    if (streams.length > 0) playStream(streams[0].url, 0);
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
    playStream(url, newIdx);
  } else {
    // No match selected: just play the URL
    playStream(url, 0);
    streamBar.style.display = 'flex';
    matchInfoEl.style.display = 'none';
  }
}

// Allow pressing Enter in URL input
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') loadCustomUrl();
});

// ─── START ────────────────────────────────────────────────────────────────────
init();
