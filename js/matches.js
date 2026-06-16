// ─── PROXY URL ────────────────────────────────────────────────────────────────
const PROXY_API = '/.netlify/functions/proxy';  // Netlify Function proxy

// ─── STREAM GENERATOR (FALLBACK — manual match code) ─────────────────────────
// Dipake kalo auto-fetch gagal atau user pake kode manual
const STREAM_SERVERS = [
  { label:'4K-ASIA ⭐',  domain:'chingu.scorelive.xyz', q:'medium', n:7 },
  { label:'HD-ASIA',     domain:'chingu.scorelive.xyz', q:'hd',     n:7 },
  { label:'LOW-ASIA',    domain:'chingu.scorelive.xyz', q:'low',    n:7 },
  { label:'4K-EU ⭐',    domain:'euuu.scorelive.xyz',   q:'medium', n:4 },
  { label:'HD-EU',       domain:'euuu.scorelive.xyz',   q:'hd',     n:4 },
  { label:'LOW-EU',      domain:'euuu.scorelive.xyz',   q:'low',    n:4 },
  { label:'4K-USA ⭐',   domain:'ashu.scorelive.xyz',   q:'medium', n:1 },
  { label:'HD-USA',      domain:'ashu.scorelive.xyz',   q:'hd',     n:1 },
  { label:'LOW-USA',     domain:'ashu.scorelive.xyz',   q:'low',    n:1 },
];

function genStreams(code) {
  if (!code) return [];
  return STREAM_SERVERS.map(s => ({
    label: s.label,
    url:   `https://${s.domain}/${code}_${s.q}_english_${s.n}/index.m3u8`
  }));
}

// ─── AUTO-FETCH DARI LIVE API (gantikan match code tebakan!) ────────────────
// Fungsi ini dipanggil otomatis tiap 60 detik (pas ada match) atau manual.
// Otomatis cooldown 2 menit kalo stream udah kedetect, hemat invocation.
let lastFetchTime = 0;
const FETCH_COOLDOWN = 120000; // 2 menit

async function fetchLiveStreams() {
  // ── Cooldown: skip kalo barusan fetch ────────────────────────────────
  const now = Date.now();
  if (now - lastFetchTime < FETCH_COOLDOWN) return;
  lastFetchTime = now;

  try {
    const res = await fetch(PROXY_API + '?type=live');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.data || !data.data.streams) return;

    let updated = false;

    data.data.streams.forEach(upstream => {
      // Cari match yg cocok di MATCHES (by title)
      const title = upstream.title_short.replace(/\u00A0/g, ' '); // &nbsp; → spasi
      const match = MATCHES.find(m => {
        const ourTitle = m.home + ' vs ' + m.away;
        // Fuzzy match: case-insensitive, ignore aksen
        return ourTitle.localeCompare(title, undefined, { sensitivity: 'base' }) === 0;
      });

      if (!match) return;

      // Build stream array dari channel upstream
      const streams = upstream.channel.map(ch => ({
        label: ch.quality + (ch.is_premium ? ' ⭐' : ''),
        url:   ch.url,
        server: ch.server,
        premium: ch.is_premium,
      }));

      // Cek kalo stream udah beda (update) atau kosong
      const currentJson = JSON.stringify(match.streams || []);
      const newJson = JSON.stringify(streams);
      if (currentJson !== newJson) {
        match.streams = streams;
        match.matchCode = null; // nonaktifkan genStreams
        updated = true;
      }
    });

    // Refresh UI kalo ada perubahan
    if (updated) {
      renderList();
      // Kalo match yg lg dipilih ke-update, refresh tombol stream & auto-play
      if (window.currentMatch) {
        const fresh = MATCHES.find(m => m.id === window.currentMatch.id);
        if (fresh && window.selectMatch) {
          window.selectMatch(fresh.id);
        }
      }
    }
  } catch (e) {
    console.warn('Auto-fetch stream API gagal:', e);
    // No problem — fallback ke genStreams/matchCode atau manual
  }
}

// ─── MATCH CODES (OPSIONAL — fallback manual) ──────────────────────────────
// Auto-fetch di atas LEBIH DIUTAMAKAN. MatchCode cuma fallback kalo API mati.
// Isi manual cuma kalo emang pengen, ga wajib.

// ─── AUTO-GENERATE MATCH CODE ────────────────────────────────────────────────
// Match code otomatis berdasarkan huruf pertama tiap kata dari nama negara.
// Contoh: 'Ivory Coast' → 'IC', 'Sweden' → 'S', 'South Korea' → 'SK'
function getCountryCode(name) {
  const words = name.split(' ');
  if (words.length === 1) return name[0];
  // Skip '&', ambil huruf pertama dari kata bermakna
  return words.filter(w => w !== '&').map(w => w[0]).join('');
}

function generateMatchCode(home, away) {
  return getCountryCode(home) + '_VS_' + getCountryCode(away);
}

// ─── ALTERNATIVE TV CHANNELS (IPTV) ──────────────────────────────────────────
// Dari iptv-org.github.io — channel TV yg kemungkinan nyiarin World Cup.
// Muncul otomatis di semua match sbg opsi cadangan kalo stream utama mati.
// NOTE: beberapa channel mungkin geo-blocked atau mati — tinggal ganti aja.
const ALT_CHANNELS = [
  { label:'Arena Premium 1', url:'https://nl1.nghk.ai/ArenaPremium1HD/index.m3u8',
    note:'Balkan — HD' },
  // ── CazeTv 🇧🇷 — YouTube Brazil (geo-restricted, pake Invidious bypass) ──
  { label:'CazeTv 🇧🇷', url:'', note:'YouTube Brazil — bypass geo aktif',
    isCazeTv:true, videoId: CAZE_TV_VIDEO_ID },
];

// ─── CAZETV — YouTube Brazil (geo-restricted, butuh bypass) ──────────────────
// CazeTv adalah channel YouTube Brazil yg live stream World Cup,
// tapi di-geo-block khusus Brazil aja.
//
// Solusi: pake Invidious (YouTube frontend alternatif) — dia fetch video
// dari server-side, jadi IP server Invidious yg dipake, bukan IP user.
// Parameter region=BR bilang ke YouTube "saya dari Brazil".
//
// Ganti video ID ini kalo link live-nya berubah:
const CAZE_TV_VIDEO_ID = 'w-ld4SjUuDI';

// Daftar Invidious instance — kalo satu mati, coba yg lain (fallback otomatis)
const INVIDIOUS_INSTANCES = [
  { host:'invidious.snopyta.org',       label:'Snopyta' },
  { host:'yewtu.be',                    label:'Yewtu' },
  { host:'invidious.lidar.eu',          label:'LIDAR' },
  { host:'inv.riverside.rocks',         label:'Riverside' },
  { host:'invidious.tiekoetter.com',     label:'Tiekoetter' },
  { host:'invidious.private.coffee',     label:'Private Coffee' },
  { host:'inv.vern.cc',                 label:'Vern' },
];

// ─── FLAGS ───────────────────────────────────────────────────────────────────
const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czechia':'🇨🇿',
  'Canada':'🇨🇦','Bosnia & Herz.':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Türkiye':'🇹🇷',
  'Germany':'🇩🇪','Curaçao':'🇨🇼','Ivory Coast':'🇨🇮','Ecuador':'🇪🇨',
  'Netherlands':'🇳🇱','Japan':'🇯🇵','Sweden':'🇸🇪','Tunisia':'🇹🇳',
  'Belgium':'🇧🇪','Egypt':'🇪🇬','Iran':'🇮🇷','New Zealand':'🇳🇿',
  'Spain':'🇪🇸','Cape Verde':'🇨🇻','Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾',
  'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
  'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
  'Portugal':'🇵🇹','DR Congo':'🇨🇩','Uzbekistan':'🇺🇿','Colombia':'🇨🇴',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
};

// ─── GROUPS ──────────────────────────────────────────────────────────────────
const GROUPS = {
  A:['Mexico','South Africa','South Korea','Czechia'],
  B:['Canada','Bosnia & Herz.','Qatar','Switzerland'],
  C:['Brazil','Morocco','Haiti','Scotland'],
  D:['USA','Paraguay','Australia','Türkiye'],
  E:['Germany','Curaçao','Ivory Coast','Ecuador'],
  F:['Netherlands','Japan','Sweden','Tunisia'],
  G:['Belgium','Egypt','Iran','New Zealand'],
  H:['Spain','Cape Verde','Saudi Arabia','Uruguay'],
  I:['France','Senegal','Iraq','Norway'],
  J:['Argentina','Algeria','Austria','Jordan'],
  K:['Portugal','DR Congo','Uzbekistan','Colombia'],
  L:['England','Croatia','Ghana','Panama'],
};

// ─── MATCHES ─────────────────────────────────────────────────────────────────
// status: 'FT' = full time, 'NS' = not started, 'LIVE' = live
// streams: array of { label, url } — url can be .m3u8 (HLS) or any page (iframe)
//
// HOW TO ADD STREAMS:
//   Buka DevTools (F12) → Network tab → cari .m3u8 atau fetch url
//   Tambahkan ke array streams match yang sesuai:
//   streams: [{ label: 'HD', url: 'https://...' }, { label: 'SD', url: 'https://...' }]

const MATCHES = [

  // ══════════════════════════════════════════════════════
  //  MATCHDAY 1
  // ══════════════════════════════════════════════════════

  // ─── JUNE 11 ─────────────────────────────────────────
  {
    id:1, group:'A', md:1,
    home:'Mexico', away:'South Africa',
    utc:'2026-06-11T19:00:00Z',
    venue:'Estadio Azteca, Mexico City',
    homeScore:2, awayScore:0, status:'FT',
    streams:[
      // { label:'HD 1', url:'https://...' },
    ]
  },
  {
    id:2, group:'A', md:1,
    home:'South Korea', away:'Czechia',
    utc:'2026-06-11T22:00:00Z',
    venue:'Estadio Akron, Zapopan',
    homeScore:2, awayScore:1, status:'FT',
    streams:[]
  },

  // ─── JUNE 12 ─────────────────────────────────────────
  {
    id:3, group:'B', md:1,
    home:'Canada', away:'Bosnia & Herz.',
    utc:'2026-06-12T23:00:00Z',
    venue:'BMO Field, Toronto',
    homeScore:1, awayScore:1, status:'FT',
    streams:[]
  },
  {
    id:4, group:'D', md:1,
    home:'USA', away:'Paraguay',
    utc:'2026-06-13T02:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:4, awayScore:1, status:'FT',
    streams:[]
  },

  // ─── JUNE 13 ─────────────────────────────────────────
  {
    id:5, group:'C', md:1,
    home:'Brazil', away:'Morocco',
    utc:'2026-06-13T19:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:1, awayScore:1, status:'FT',
    streams:[]
  },
  {
    id:6, group:'C', md:1,
    home:'Haiti', away:'Scotland',
    utc:'2026-06-13T22:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:0, awayScore:1, status:'FT',
    streams:[]
  },
  {
    id:7, group:'B', md:1,
    home:'Qatar', away:'Switzerland',
    utc:'2026-06-14T01:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:1, awayScore:1, status:'FT',
    streams:[]
  },
  {
    id:8, group:'D', md:1,
    home:'Australia', away:'Türkiye',
    utc:'2026-06-14T04:00:00Z',
    venue:'BC Place, Vancouver',
    homeScore:2, awayScore:0, status:'FT',
    // ✅ CONFIRMED (A_AUS_VS_T_TUR)
    streams:[]
  },

  // ─── JUNE 14 (HARI INI) ──────────────────────────────
  {
    id:9, group:'E', md:1,
    home:'Germany', away:'Curaçao',
    utc:'2026-06-14T17:00:00Z',
    venue:'NRG Stadium, Houston',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:10, group:'F', md:1,
    home:'Netherlands', away:'Japan',
    utc:'2026-06-14T20:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:11, group:'E', md:1,
    home:'Ivory Coast', away:'Ecuador',
    utc:'2026-06-14T23:00:00Z',
    venue:'Lincoln Financial Field, Philadelphia',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:12, group:'F', md:1,
    home:'Sweden', away:'Tunisia',
    utc:'2026-06-15T02:00:00Z',
    venue:'Estadio Jalisco, Guadalajara',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 15 ─────────────────────────────────────────
  {
    id:13, group:'H', md:1,
    home:'Spain', away:'Cape Verde',
    utc:'2026-06-15T17:00:00Z',
    venue:'Mercedes-Benz Stadium, Atlanta',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:14, group:'G', md:1,
    home:'Belgium', away:'Egypt',
    utc:'2026-06-15T20:00:00Z',
    venue:'Lumen Field, Seattle',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:15, group:'H', md:1,
    home:'Saudi Arabia', away:'Uruguay',
    utc:'2026-06-15T22:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:16, group:'G', md:1,
    home:'Iran', away:'New Zealand',
    utc:'2026-06-16T02:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 16 ─────────────────────────────────────────
  {
    id:17, group:'I', md:1,
    home:'France', away:'Senegal',
    utc:'2026-06-16T19:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:18, group:'I', md:1,
    home:'Iraq', away:'Norway',
    utc:'2026-06-16T22:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:19, group:'J', md:1,
    home:'Argentina', away:'Algeria',
    utc:'2026-06-17T01:00:00Z',
    venue:'Arrowhead Stadium, Kansas City',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:20, group:'J', md:1,
    home:'Austria', away:'Jordan',
    utc:'2026-06-17T04:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 17 ─────────────────────────────────────────
  {
    id:21, group:'K', md:1,
    home:'Portugal', away:'DR Congo',
    utc:'2026-06-17T17:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:22, group:'L', md:1,
    home:'England', away:'Croatia',
    utc:'2026-06-17T20:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:23, group:'K', md:1,
    home:'Uzbekistan', away:'Colombia',
    utc:'2026-06-17T23:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:24, group:'L', md:1,
    home:'Ghana', away:'Panama',
    utc:'2026-06-18T02:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ══════════════════════════════════════════════════════
  //  MATCHDAY 2
  // ══════════════════════════════════════════════════════

  // ─── JUNE 18 ─────────────────────────────────────────
  {
    id:25, group:'A', md:2,
    home:'Mexico', away:'South Korea',
    utc:'2026-06-18T17:00:00Z',
    venue:'Estadio Azteca, Mexico City',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:26, group:'A', md:2,
    home:'South Africa', away:'Czechia',
    utc:'2026-06-18T20:00:00Z',
    venue:'Estadio Akron, Zapopan',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 19 ─────────────────────────────────────────
  {
    id:27, group:'B', md:2,
    home:'Canada', away:'Qatar',
    utc:'2026-06-19T17:00:00Z',
    venue:'BMO Field, Toronto',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:28, group:'B', md:2,
    home:'Bosnia & Herz.', away:'Switzerland',
    utc:'2026-06-19T20:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:29, group:'C', md:2,
    home:'Brazil', away:'Haiti',
    utc:'2026-06-19T23:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:30, group:'C', md:2,
    home:'Morocco', away:'Scotland',
    utc:'2026-06-20T02:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 20 ─────────────────────────────────────────
  {
    id:31, group:'D', md:2,
    home:'USA', away:'Australia',
    utc:'2026-06-20T17:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:32, group:'D', md:2,
    home:'Paraguay', away:'Türkiye',
    utc:'2026-06-20T20:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:33, group:'E', md:2,
    home:'Germany', away:'Ivory Coast',
    utc:'2026-06-20T23:00:00Z',
    venue:'NRG Stadium, Houston',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:34, group:'E', md:2,
    home:'Curaçao', away:'Ecuador',
    utc:'2026-06-21T02:00:00Z',
    venue:'Lincoln Financial Field, Philadelphia',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 21 ─────────────────────────────────────────
  {
    id:35, group:'F', md:2,
    home:'Netherlands', away:'Sweden',
    utc:'2026-06-21T17:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:36, group:'F', md:2,
    home:'Japan', away:'Tunisia',
    utc:'2026-06-21T20:00:00Z',
    venue:'Estadio Jalisco, Guadalajara',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:37, group:'G', md:2,
    home:'Belgium', away:'Iran',
    utc:'2026-06-21T23:00:00Z',
    venue:'Lumen Field, Seattle',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:38, group:'G', md:2,
    home:'Egypt', away:'New Zealand',
    utc:'2026-06-22T02:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 22 ─────────────────────────────────────────
  {
    id:39, group:'H', md:2,
    home:'Spain', away:'Saudi Arabia',
    utc:'2026-06-22T17:00:00Z',
    venue:'Mercedes-Benz Stadium, Atlanta',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:40, group:'H', md:2,
    home:'Cape Verde', away:'Uruguay',
    utc:'2026-06-22T20:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:41, group:'I', md:2,
    home:'France', away:'Iraq',
    utc:'2026-06-22T23:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:42, group:'I', md:2,
    home:'Senegal', away:'Norway',
    utc:'2026-06-23T02:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 23 ─────────────────────────────────────────
  {
    id:43, group:'J', md:2,
    home:'Argentina', away:'Austria',
    utc:'2026-06-23T17:00:00Z',
    venue:'Arrowhead Stadium, Kansas City',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:44, group:'J', md:2,
    home:'Algeria', away:'Jordan',
    utc:'2026-06-23T20:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:45, group:'K', md:2,
    home:'Portugal', away:'Uzbekistan',
    utc:'2026-06-23T23:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:46, group:'K', md:2,
    home:'DR Congo', away:'Colombia',
    utc:'2026-06-24T02:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 24 ─────────────────────────────────────────
  {
    id:47, group:'L', md:2,
    home:'England', away:'Ghana',
    utc:'2026-06-24T17:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:48, group:'L', md:2,
    home:'Croatia', away:'Panama',
    utc:'2026-06-24T20:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ══════════════════════════════════════════════════════
  //  MATCHDAY 3 (simultan dalam grup)
  // ══════════════════════════════════════════════════════

  // ─── JUNE 25 ─────────────────────────────────────────
  {
    id:49, group:'A', md:3,
    home:'Mexico', away:'Czechia',
    utc:'2026-06-25T21:00:00Z',
    venue:'Estadio Azteca, Mexico City',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:50, group:'A', md:3,
    home:'South Korea', away:'South Africa',
    utc:'2026-06-25T21:00:00Z',
    venue:'Estadio Akron, Zapopan',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:51, group:'B', md:3,
    home:'Canada', away:'Switzerland',
    utc:'2026-06-26T01:00:00Z',
    venue:'BMO Field, Toronto',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:52, group:'B', md:3,
    home:'Bosnia & Herz.', away:'Qatar',
    utc:'2026-06-26T01:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 25-26 ──────────────────────────────────────
  {
    id:53, group:'C', md:3,
    home:'Brazil', away:'Scotland',
    utc:'2026-06-25T17:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:54, group:'C', md:3,
    home:'Morocco', away:'Haiti',
    utc:'2026-06-25T17:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:55, group:'D', md:3,
    home:'USA', away:'Türkiye',
    utc:'2026-06-26T21:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:56, group:'D', md:3,
    home:'Paraguay', away:'Australia',
    utc:'2026-06-26T21:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },

  // ─── JUNE 26-27 ──────────────────────────────────────
  {
    id:57, group:'E', md:3,
    home:'Germany', away:'Ecuador',
    utc:'2026-06-27T01:00:00Z',
    venue:'NRG Stadium, Houston',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:58, group:'E', md:3,
    home:'Curaçao', away:'Ivory Coast',
    utc:'2026-06-27T01:00:00Z',
    venue:'Lincoln Financial Field, Philadelphia',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:59, group:'F', md:3,
    home:'Netherlands', away:'Tunisia',
    utc:'2026-06-27T17:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:60, group:'F', md:3,
    home:'Japan', away:'Sweden',
    utc:'2026-06-27T17:00:00Z',
    venue:'Estadio Jalisco, Guadalajara',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:61, group:'G', md:3,
    home:'Belgium', away:'New Zealand',
    utc:'2026-06-27T21:00:00Z',
    venue:'Lumen Field, Seattle',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:62, group:'G', md:3,
    home:'Egypt', away:'Iran',
    utc:'2026-06-27T21:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:63, group:'H', md:3,
    home:'Spain', away:'Uruguay',
    utc:'2026-06-28T01:00:00Z',
    venue:'Mercedes-Benz Stadium, Atlanta',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:64, group:'H', md:3,
    home:'Cape Verde', away:'Saudi Arabia',
    utc:'2026-06-28T01:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:65, group:'I', md:3,
    home:'France', away:'Norway',
    utc:'2026-06-28T17:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:66, group:'I', md:3,
    home:'Senegal', away:'Iraq',
    utc:'2026-06-28T17:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:67, group:'J', md:3,
    home:'Argentina', away:'Jordan',
    utc:'2026-06-28T21:00:00Z',
    venue:'Arrowhead Stadium, Kansas City',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:68, group:'J', md:3,
    home:'Algeria', away:'Austria',
    utc:'2026-06-28T21:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:69, group:'K', md:3,
    home:'Portugal', away:'Colombia',
    utc:'2026-06-29T01:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:70, group:'K', md:3,
    home:'DR Congo', away:'Uzbekistan',
    utc:'2026-06-29T01:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:71, group:'L', md:3,
    home:'England', away:'Panama',
    utc:'2026-06-29T17:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
  {
    id:72, group:'L', md:3,
    home:'Croatia', away:'Ghana',
    utc:'2026-06-29T17:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',

    streams:[]
  },
];
