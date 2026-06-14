// ─── STREAM GENERATOR ────────────────────────────────────────────────────────
// URL format: https://{domain}/{MATCH_CODE}_{quality}_english_{num}/index.m3u8
// Match code dari reference site: buka DevTools → lihat path m3u8
// Contoh konfirmasi: Australia vs Türkiye = 'A_VS_T'

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

// ─── MATCH CODES (dari scorelive.xyz) ────────────────────────────────────────
// Isi field matchCode setiap pertandingan sesuai yg terlihat di DevTools / reference site
// Pattern: INISIAL_HOME_VS_INISIAL_AWAY (contoh: Australia=A, Türkiye=T → 'A_VS_T')

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
    homeScore:null, awayScore:null, status:'FT',
    matchCode:'A_VS_T',   // ✅ CONFIRMED
    streams:[]
  },

  // ─── JUNE 14 (HARI INI) ──────────────────────────────
  {
    id:9, group:'E', md:1,
    home:'Germany', away:'Curaçao',
    utc:'2026-06-14T17:00:00Z',
    venue:'NRG Stadium, Houston',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'G_VS_C',   // ⚠️ perkiraan — cek reference site
    streams:[]
  },
  {
    id:10, group:'F', md:1,
    home:'Netherlands', away:'Japan',
    utc:'2026-06-14T20:00:00Z',
    venue:'AT&T Stadium, Arlington',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'N_VS_J',   // ⚠️ perkiraan
    streams:[]
  },
  {
    id:11, group:'E', md:1,
    home:'Ivory Coast', away:'Ecuador',
    utc:'2026-06-14T23:00:00Z',
    venue:'Lincoln Financial Field, Philadelphia',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'I_VS_E',   // ⚠️ perkiraan
    streams:[]
  },
  {
    id:12, group:'F', md:1,
    home:'Sweden', away:'Tunisia',
    utc:'2026-06-15T02:00:00Z',
    venue:'Estadio Jalisco, Guadalajara',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'S_VS_T',   // ⚠️ perkiraan
    streams:[]
  },

  // ─── JUNE 15 ─────────────────────────────────────────
  {
    id:13, group:'H', md:1,
    home:'Spain', away:'Cape Verde',
    utc:'2026-06-15T17:00:00Z',
    venue:'Mercedes-Benz Stadium, Atlanta',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'SP_VS_CV', // ⚠️ perkiraan
    streams:[]
  },
  {
    id:14, group:'G', md:1,
    home:'Belgium', away:'Egypt',
    utc:'2026-06-15T20:00:00Z',
    venue:'Lumen Field, Seattle',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'B_VS_EG',  // ⚠️ perkiraan
    streams:[]
  },
  {
    id:15, group:'H', md:1,
    home:'Saudi Arabia', away:'Uruguay',
    utc:'2026-06-15T22:00:00Z',
    venue:'Hard Rock Stadium, Miami Gardens',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'SA_VS_U',  // ⚠️ perkiraan (SA=Saudi Arabia, U=Uruguay)
    streams:[]
  },
  {
    id:16, group:'G', md:1,
    home:'Iran', away:'New Zealand',
    utc:'2026-06-16T02:00:00Z',
    venue:'SoFi Stadium, Inglewood',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'IR_VS_NZ', // ⚠️ perkiraan
    streams:[]
  },

  // ─── JUNE 16 ─────────────────────────────────────────
  {
    id:17, group:'I', md:1,
    home:'France', away:'Senegal',
    utc:'2026-06-16T19:00:00Z',
    venue:'MetLife Stadium, East Rutherford',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'F_VS_SE',  // ⚠️ perkiraan
    streams:[]
  },
  {
    id:18, group:'I', md:1,
    home:'Iraq', away:'Norway',
    utc:'2026-06-16T22:00:00Z',
    venue:'Gillette Stadium, Foxborough',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'IQ_VS_NO', // ⚠️ perkiraan
    streams:[]
  },
  {
    id:19, group:'J', md:1,
    home:'Argentina', away:'Algeria',
    utc:'2026-06-17T01:00:00Z',
    venue:'Arrowhead Stadium, Kansas City',
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'AR_VS_AL', // ⚠️ perkiraan
    streams:[]
  },
  {
    id:20, group:'J', md:1,
    home:'Austria', away:'Jordan',
    utc:'2026-06-17T04:00:00Z',
    venue:"Levi's Stadium, Santa Clara",
    homeScore:null, awayScore:null, status:'NS',
    matchCode:'AU_VS_JO', // ⚠️ perkiraan
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
