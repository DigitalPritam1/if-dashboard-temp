/* ============================================================
   1. CONFIG
   Add a month: copy a row, set the tab name and its gid
   (the gid is in the sheet tab URL: /edit?gid=XXXXXXX)
   ============================================================ */
const DEFAULT_SHEET_ID = "1iRFsCl1oMcprbX9Kw7A3gachh0xUMh7hxlNIyhLLX7U";

/* ============================================================
   1b. Admin config — sheet source + editorial rules.
   Lives in this browser's localStorage. The sheet stays the single source of
   truth for what was actually posted; this config only says what the plan
   is, since the sheet itself has no fixed weekly/monthly quota anywhere.
   ============================================================ */
const CONFIG_KEY = 'if-dashboard-config-v1';

/* Seeded once from the real weekly/monthly editorial plan. `weekly` is the
   canonical figure (what actually repeats every week); `monthly` is what the
   team quotes as the monthly total, and the two do not always divide evenly
   because real months and real weeks do not line up. `spread` says whether a
   quota is delivered on working days only or every day (stories run daily). */
const DEFAULT_RULES = [
  // ---------------- Hindi · Bhavika ----------------
  { id:'hi-reels',   manager:'Hindi', type:'Fresh reels',        platforms:'Instagram, Facebook, YouTube',                 weekly:4,  monthly:15,  spread:'weekday', status:'active', note:'' },
  { id:'hi-photo',   manager:'Hindi', type:'Photo dump',         platforms:'Instagram, Facebook, YouTube, WhatsApp, LinkedIn', weekly:1, monthly:4, spread:'weekday', status:'active', note:'' },
  { id:'hi-carousel',manager:'Hindi', type:'Carousel',           platforms:'Instagram, Facebook, YouTube, WhatsApp, LinkedIn', weekly:1, monthly:4, spread:'weekday', status:'active', note:'' },
  { id:'hi-articles',manager:'Hindi', type:'Articles',           platforms:'X (Twitter)',                                  weekly:3,  monthly:12,  spread:'weekday', status:'active', note:'' },
  { id:'hi-xone',    manager:'Hindi', type:'X one-liners',       platforms:'X (Twitter)',                                  weekly:null, monthly:10, spread:'weekday', status:'active', note:'No fixed weekly schedule' },
  { id:'hi-xvideo',  manager:'Hindi', type:'X best-performing videos', platforms:'X (Twitter)',                            weekly:2,  monthly:8,   spread:'weekday', status:'active', note:'Repurposed clips' },
  { id:'hi-longform',manager:'Hindi', type:'Long-form video',    platforms:'YouTube, Facebook',                            weekly:1,  monthly:4,   spread:'weekday', status:'hold',   note:'Fridays 7pm · on hold until next content bank' },
  { id:'hi-stories', manager:'Hindi', type:'Stories',            platforms:'Instagram, Facebook',                         weekly:21, monthly:84,  spread:'daily',   status:'active', note:'3 per day, by the social media manager' },

  // ---------------- Marathi · Aditi ----------------
  { id:'mr-reels',   manager:'Marathi', type:'Fresh reels',      platforms:'Instagram, Facebook, YouTube (santoshjadhav.if)', weekly:4, monthly:15, spread:'weekday', status:'active', note:'' },
  { id:'mr-podcast', manager:'Marathi', type:'Podcast reels',    platforms:'Instagram (maativerse.if), Facebook, YouTube (santoshjadhav.if)', weekly:7, monthly:35, spread:'weekday', status:'active', note:'11 total reels/week with fresh reels' },
  { id:'mr-photo',   manager:'Marathi', type:'Photo dump',       platforms:'Instagram, Facebook, YouTube, WhatsApp (santoshjadhav.if)', weekly:1, monthly:4, spread:'weekday', status:'active', note:'' },
  { id:'mr-carousel',manager:'Marathi', type:'Carousel',         platforms:'Instagram, Facebook, YouTube, WhatsApp',       weekly:1,  monthly:4,   spread:'weekday', status:'active', note:'' },
  { id:'mr-articles',manager:'Marathi', type:'Articles',         platforms:'Maativerse, Instagram, YouTube Community, Facebook', weekly:3, monthly:12, spread:'weekday', status:'active', note:'' },
  { id:'mr-longform',manager:'Marathi', type:'Podcast (long-form)', platforms:'YouTube, Facebook',                         weekly:1,  monthly:4,   spread:'weekday', status:'hold',   note:'Thursdays 11am · on hold until Maativerse 2.0 launch' },
  { id:'mr-stories', manager:'Marathi', type:'Stories',          platforms:'Instagram (santoshjadhav.if + maativerse.if), Facebook', weekly:35, monthly:140, spread:'daily', status:'active', note:'5 per day: 3 by the social media manager, 2 by the content creator' },
];

/* Which dashboard sections show by default. Nothing here removes data or
   logic — every section still renders exactly as before, this just decides
   whether it's on screen. Toggle any of it from Settings → Layout. The two
   "dense" sections (platform spread, execution trend) start off so the
   default view is the gamified glance, not a wall of everything at once. */
const SECTION_META = [
  { key:'weekly',      label:'Weekly review',       default:true  },
  { key:'kpis',        label:'This month at a glance', default:true },
  { key:'harvest',     label:'Monthly harvest (glasses)', default:true },
  { key:'managers',    label:'Social media managers', default:true },
  { key:'channels',    label:'Channel scorecards',  default:true  },
  { key:'platforms',   label:'Distribution spread', default:false },
  { key:'leaderboard', label:'Leaderboard',         default:false },
  { key:'trend',       label:'Execution trend',     default:false },
];
function defaultVisibility(){
  return Object.fromEntries(SECTION_META.map(s => [s.key, s.default]));
}

function loadConfig(){
  try{
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw){
      const c = JSON.parse(raw);
      if (!Array.isArray(c.rules) || !c.rules.length) c.rules = structuredClone(DEFAULT_RULES);
      if (!c.sheetId) c.sheetId = DEFAULT_SHEET_ID;
      // merge so a config saved before a new section existed still gets a default for it
      c.visibility = { ...defaultVisibility(), ...(c.visibility||{}) };
      return c;
    }
  }catch(e){ console.warn('config load failed, using defaults', e); }
  return { sheetId: DEFAULT_SHEET_ID, rules: structuredClone(DEFAULT_RULES), visibility: defaultVisibility() };
}
function saveConfig(c){
  try{ localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); return true; }
  catch(e){ console.error('config save failed', e); return false; }
}
let CFG = loadConfig();
function currentSheetId(){ return CFG.sheetId || DEFAULT_SHEET_ID; }
function isVisible(key){ return CFG.visibility ? CFG.visibility[key] !== false : true; }

/* Month tabs are discovered automatically from the spreadsheet, so a new tab
   added each month shows up here on its own. The list below is only a fallback
   used if discovery is ever blocked. Tab naming is tolerant: "October",
   "october" and "October " all work. */
const FALLBACK_MONTHS = [
  { name:"June",      num:6, gid:"0" },
  { name:"July",      num:7, gid:"2126581579" },
  { name:"August",    num:8, gid:"612790078" },
  { name:"September", num:9, gid:"1580171045" },
];
let MONTHS = FALLBACK_MONTHS.slice();

const MONTH_NAMES = ["january","february","march","april","may","june",
                     "july","august","september","october","november","december"];

/* Reads the sheet's own tab list (name + gid) so new months appear by themselves. */
async function discoverMonths(){
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${currentSheetId()}/htmlview?_=${Date.now()}`, { cache:'no-store' });
  if (!res.ok) throw new Error('tab discovery failed');
  const html = await res.text();
  const re = /name:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,400}?gid:\s*"(\d+)"/g;
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth()+1;
  const found = new Map();
  let m;
  while ((m = re.exec(html)) !== null){
    const raw = m[1].trim().toLowerCase();
    const idx = MONTH_NAMES.findIndex(n => raw === n || raw.startsWith(n));
    if (idx === -1) continue;                       // ignore non month tabs
    const num = idx + 1;
    if (found.has(num)) continue;                   // first match wins
    found.set(num, {
      name: MONTH_NAMES[idx][0].toUpperCase() + MONTH_NAMES[idx].slice(1),
      num, gid: m[2],
      year: num <= curM ? curY : curY - 1           // months ahead belong to last year
    });
  }
  if (!found.size) throw new Error('no month tabs found');
  return [...found.values()].sort((a,b) => a.year - b.year || a.num - b.num);
}

/* Official Indian Farmer wordmark, embedded so this file works standalone.
   Swap for a URL or local path (e.g. "logo.png") any time. */
const BRAND_LOGO = "data:image/png;base64,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";

/* Social media managers. Drop a photo path/URL into `photo` when ready. */
const MANAGERS = [
  { id:"bhavika", name:"Bhavika", role:"Hindi Channel Lead", photo:"",
    channels:["Hindi"], theme:"blue", ruleScope:"Hindi" },
  { id:"aditi", name:"Aditi", role:"Marathi Channels Lead", photo:"",
    channels:["Marathi (Santoshjadhav.if)","Marathi Maativerse"], theme:"green", ruleScope:"Marathi" },
];

const CHANNEL_META = {
  "Hindi":                       { short:"IF Hindi",   theme:"blue",   label:"Indian Farmer Hindi" },
  "Marathi (Santoshjadhav.if)":  { short:"IF Marathi", theme:"green",  label:"Indian Farmer Marathi" },
  "Marathi Maativerse":          { short:"Maativerse", theme:"violet", label:"Maativerse Marathi" },
};

const THEME_COLOR = { blue:"var(--blue)", green:"var(--green)", violet:"var(--violet)", coral:"var(--coral)", amber:"var(--amber)" };
const THEME_SOFT  = { blue:"var(--blue-soft)", green:"var(--green-soft)", violet:"var(--violet-soft)", coral:"var(--coral-soft)", amber:"var(--amber-soft)" };
const THEME_GRAD  = { blue:"url(#gr-blue)", green:"url(#gr-green)", violet:"url(#gr-violet)", coral:"url(#gr-coral)", amber:"url(#gr-amber)" };

const LEVELS = [
  { n:1, name:"Seedling",      min:0 },
  { n:2, name:"Sprout",        min:400 },
  { n:3, name:"Sapling",       min:900 },
  { n:4, name:"Cultivator",    min:1600 },
  { n:5, name:"Harvester",     min:2600 },
  { n:6, name:"Master Farmer", min:4000 },
];

/* ============================================================
   2. Icon set (no emoji anywhere)
   ============================================================ */
const P = {
  wheat:'M12 22V8M12 8c0-2.2-1.6-3.8-3.8-3.8C8.2 6.4 9.8 8 12 8ZM12 8c0-2.2 1.6-3.8 3.8-3.8C15.8 6.4 14.2 8 12 8ZM12 13.5c0-2.2-1.6-3.8-3.8-3.8C8.2 11.9 9.8 13.5 12 13.5ZM12 13.5c0-2.2 1.6-3.8 3.8-3.8C15.8 11.9 14.2 13.5 12 13.5ZM12 19c0-2.2-1.6-3.8-3.8-3.8C8.2 17.4 9.8 19 12 19ZM12 19c0-2.2 1.6-3.8 3.8-3.8C15.8 17.4 14.2 19 12 19Z',
  check:'M20 6 9 17l-5-5',
  target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  alert:'M12 9v4.5M12 17h.01M10.3 3.9 2 18.2A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z',
  flame:'M12 2c2.2 3.6 6 5.2 6 9.4A6 6 0 0 1 6 11.4c0-2 1-3.6 2-4.6.4 1.6 1.4 2.2 2 2.2 0-2.2-1.2-4.4 2-7Z',
  trophy:'M8 21h8M12 17.5V21M6 4h12v4.5a6 6 0 0 1-12 0V4ZM6 6.5H4.2A2.2 2.2 0 0 0 4.2 11H6M18 6.5h1.8a2.2 2.2 0 0 1 0 4.5H18',
  medal:'M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM8.4 13.6 7 21.5l5-2.8 5 2.8-1.4-7.9',
  bolt:'M13 2 4 13.5h7L10.5 22 20 10.5h-7L13 2Z',
  spark:'M12 3l1.9 5.4L19 10.3l-5.1 1.9L12 17.6l-1.9-5.4L5 10.3l5.1-1.9L12 3ZM19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8L19 16Z',
  calendar:'M8 2.5v4M16 2.5v4M3.5 10h17M5.5 4.5h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  users:'M16.5 20.5v-1.8a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4v1.8M10 11a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM21.5 20.5v-1.8a4 4 0 0 0-3-3.9M16.5 3.7a4 4 0 0 1 0 7.3',
  layers:'M12 2.5 2.5 7.5 12 12.5l9.5-5L12 2.5ZM2.5 16.5 12 21.5l9.5-5M2.5 12 12 17l9.5-5',
  sun:'M12 4.2V2M12 22v-2.2M4.2 12H2M22 12h-2.2M6 6l-1.6-1.6M19.6 19.6 18 18M18 6l1.6-1.6M4.4 19.6 6 18M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon:'M21 12.9A9.2 9.2 0 1 1 11.1 3a7.2 7.2 0 0 0 9.9 9.9Z',
  refresh:'M20.5 12a8.5 8.5 0 1 1-2.6-6.1M20.5 3.5v5.2h-5.2',
  lock:'M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5M5.8 10.5h12.4a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H5.8a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z',
  up:'M12 19V5M6 11l6-6 6 6',
  down:'M12 5v14M6 13l6 6 6-6',
  globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  instagram:'M16.5 3h-9A4.5 4.5 0 0 0 3 7.5v9A4.5 4.5 0 0 0 7.5 21h9a4.5 4.5 0 0 0 4.5-4.5v-9A4.5 4.5 0 0 0 16.5 3ZM12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM17.2 6.9h.01',
  facebook:'M14.5 3H13a4.5 4.5 0 0 0-4.5 4.5V10H6v3.5h2.5V21H12v-7.5h2.6l.6-3.5H12V7.7c0-.7.4-1.2 1.1-1.2h1.4V3Z',
  youtube:'M21.6 8.4a2.7 2.7 0 0 0-1.9-1.9C18 6 12 6 12 6s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 8.4 28 28 0 0 0 2 12a28 28 0 0 0 .4 3.6 2.7 2.7 0 0 0 1.9 1.9C6 18 12 18 12 18s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-3.6ZM10.2 14.7V9.3L14.8 12l-4.6 2.7Z',
  linkedin:'M16 8.4a5.6 5.6 0 0 1 5.6 5.6V21h-3.7v-7a1.9 1.9 0 0 0-3.8 0v7h-3.7V8.8h3.7v1.5A5.5 5.5 0 0 1 16 8.4ZM6.2 8.8H2.5V21h3.7V8.8ZM4.35 6.3a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z',
  x:'M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.2L4.7 21H1.5l7.5-8.6L1.2 3h6.6l4.5 5.7L17.5 3Z',
  whatsapp:'M3 21l1.6-4.6A8.6 8.6 0 1 1 8.1 19.6L3 21Z',
  stories:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  video:'M22.5 7.8v8.4L16.8 13V11l5.7-3.2ZM3.5 5.5h11.3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
  trash:'M4 7h16M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1ZM6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6',
  close:'M18 6 6 18M6 6l12 12',
};
function ic(name, cls){ return `<svg class="i ${cls||''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name]||P.spark}"/></svg>`; }

const PLATFORM_ICON = {
  "Instagram":"instagram", "Instagram Community":"instagram", "Facebook":"facebook",
  "YouTube":"youtube", "YouTube Shorts":"youtube", "YouTube Community":"youtube",
  "LinkedIn":"linkedin", "X (Twitter)":"x", "WhatsApp Broadcast":"whatsapp",
  "Stories":"stories", "Long-Form Video":"video",
};

/* ============================================================
   3. Sheet parsing (verified against the live tracker)
   ============================================================ */
function csvUrl(gid){ return `https://docs.google.com/spreadsheets/d/${currentSheetId()}/export?format=csv&gid=${gid}&_=${Date.now()}`; }

function parseCSV(text){
  const rows=[]; let row=[], field="", q=false;
  for (let i=0;i<text.length;i++){
    const c=text[i];
    if (q){
      if (c === '"'){ if (text[i+1] === '"'){ field+='"'; i++; } else q=false; }
      else field+=c;
    } else if (c === '"') q=true;
    else if (c === ','){ row.push(field); field=""; }
    else if (c === '\n'){ row.push(field); rows.push(row); row=[]; field=""; }
    else if (c !== '\r') field+=c;
  }
  if (field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}
const weightOf = h => { const m = h.match(/\((\d+)\)/); return m ? parseInt(m[1],10) : 1; };
const isTrue = v => (v||"").trim().toUpperCase() === "TRUE";
const isBool = v => ["TRUE","FALSE"].includes((v||"").trim().toUpperCase());

function normPlatform(h){
  const s = h.toLowerCase();
  if (s.includes('stor')) return 'Stories';
  if (s.includes('shorts')) return 'YouTube Shorts';
  if (s.includes('youtube community')) return 'YouTube Community';
  if (s.includes('yt post') || (s.includes('youtube') && !s.includes('community'))) return 'YouTube';
  if (s.includes('linkedin')) return 'LinkedIn';
  if (s.includes('x post') || s.includes('x artical') || s.includes('x article')) return 'X (Twitter)';
  if (s.includes('broadcast') || s.trim().startsWith('wa')) return 'WhatsApp Broadcast';
  if (s.includes('lfv')) return 'Long-Form Video';
  if (s.includes('ig community')) return 'Instagram Community';
  if (s.includes('ig')) return 'Instagram';
  if (s.includes('fb')) return 'Facebook';
  return h.trim() || 'Other';
}
function normalizeBrandName(raw){
  const s = raw.toLowerCase();
  if (s.includes('maativerse')) return 'Marathi Maativerse';
  if (s.includes('marathi')) return 'Marathi (Santoshjadhav.if)';
  if (s.includes('hindi')) return 'Hindi';
  return raw;
}
function yearFor(monthNum){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth()+1;
  return monthNum <= m ? y : y-1;
}
function dateFor(dateStr, monthMeta){
  const d = dateStr.match(/^(\d+)/);
  return d ? new Date(yearFor(monthMeta.num), monthMeta.num-1, parseInt(d[1],10)) : null;
}
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function inScope(d, monthMeta){
  if (!d) return false;
  const now = new Date(); now.setHours(23,59,59,999);
  const isCurrent = monthMeta.num === now.getMonth()+1 && d.getFullYear() === now.getFullYear();
  return isCurrent ? d <= now : true;
}

function parseMonthCSV(text, monthMeta){
  const grid = parseCSV(text);
  if (grid.length < 2) return [];

  /* The header row is not always row 1. Some tabs carry a merged brand label
     row above it, some start straight at the headers. Find it by looking for
     the "Date" cell in the first few rows. */
  let hIdx = -1;
  for (let r=0; r<Math.min(5, grid.length); r++){
    if ((grid[r]||[]).some(c => (c||"").trim().toLowerCase() === 'date')){ hIdx = r; break; }
  }
  if (hIdx === -1) return [];
  const headerRow = grid[hIdx];
  const labelRow  = hIdx > 0 ? grid[hIdx-1] : [];
  const dataStart = hIdx + 1;

  /* Layout B: one block with a Brand column (the June tab) */
  const brandCol = headerRow.findIndex(h => h.trim().toLowerCase() === 'brand');
  if (brandCol !== -1){
    const remarksIdx = headerRow.length - 1, cols = [];
    for (let c = brandCol+1; c < remarksIdx; c++){
      const h = (headerRow[c]||"").trim();
      if (h && h.toLowerCase() !== 'remarks') cols.push({ idx:c, header:h, weight:weightOf(h) });
    }
    const byBrand = {}; let lastDate = null;
    for (let r=dataStart; r<grid.length; r++){
      const row = grid[r]; if (!row) continue;
      const rawDate = (row[0]||"").trim(), brandRaw = (row[brandCol]||"").trim();
      if (rawDate) lastDate = rawDate;
      if (!brandRaw) continue;
      /* A real entry always carries checkbox values. This skips the leftover
         summary block at the bottom, whose labels sit in the Brand column. */
      const hasData = cols.some(c => isBool(row[c.idx]));
      if (!hasData) continue;
      const name = normalizeBrandName(brandRaw);
      byBrand[name] ||= { brandName:name, columns:cols, rows:[], summary:null };
      byBrand[name].rows.push({
        date: dateFor(lastDate||"", monthMeta), dateLabel:lastDate,
        cells: cols.map(c => isTrue(row[c.idx])),
        hasData,
        remarks: (row[remarksIdx]||"").trim()
      });
    }
    return Object.values(byBrand);
  }

  /* Layout A: side by side blocks, each starting at a Date column */
  const starts = [];
  headerRow.forEach((h,i) => { if ((h||"").trim().toLowerCase() === 'date') starts.push(i); });
  const blocks = [];
  starts.forEach((start, bi) => {
    const end = starts[bi+1] ?? headerRow.length;
    let brandRaw = "";
    for (let c=start; c<end; c++){ if ((labelRow[c]||"").trim()){ brandRaw = labelRow[c].trim(); break; } }
    const brandName = normalizeBrandName(brandRaw || `Block ${bi+1}`);
    const headers = headerRow.slice(start,end).map(h => (h||"").trim());
    let remarksLocal = headers.length-1;
    if (headers[remarksLocal] && headers[remarksLocal].toLowerCase() !== 'remarks') remarksLocal = -1;
    const cols = [];
    const lastP = remarksLocal === -1 ? headers.length : remarksLocal;
    for (let li=2; li<lastP; li++){
      const h = headers[li];
      if (h && h.toLowerCase() !== 'remarks') cols.push({ idx:start+li, header:h, weight:weightOf(h) });
    }
    const rows = [];
    for (let r=dataStart; r<grid.length; r++){
      const row = grid[r]; if (!row) break;
      const dCell = (row[start]||"").trim();
      if (/^\d+\s+\S+/.test(dCell)){
        rows.push({
          date: dateFor(dCell, monthMeta), dateLabel:dCell,
          cells: cols.map(c => isTrue(row[c.idx])),
          hasData: cols.some(c => isBool(row[c.idx])),
          remarks: remarksLocal !== -1 ? (row[start+remarksLocal]||"").trim() : ""
        });
      }
    }
    blocks.push({ brandName, columns:cols, rows, summary:null });
  });

  /* Summary rows repeat each metric label once per block, left to right.
     Column alignment drifts in the hand edited sheet, so match by order. */
  const KEYS = { 'total content planned':'planned', 'total content posted':'posted',
                 'total content missed':'missed', 'execution rate':'rate' };
  grid.forEach(row => {
    if (!row) return;
    let occ = 0;
    for (let c=0; c<row.length; c++){
      const key = KEYS[(row[c]||"").trim().toLowerCase()];
      if (!key) continue;
      const val = parseFloat((row[c+1]||"").trim());
      const b = blocks[occ];
      if (b && !isNaN(val)){ b.summary ||= {}; b.summary[key] = val; }
      occ++;
    }
  });
  return blocks;
}

/* ============================================================
   4. Stats
   ============================================================ */
/* Some channels log a weekly long form video on a second row for the same date.
   Those are the same day, so fold them together before counting, otherwise the
   month gains phantom days and the target is overstated. */
function mergeSameDayRows(rows){
  const byDate = new Map(); const out = [];
  rows.forEach(row => {
    const key = row.dateLabel || '';
    if (!key || !byDate.has(key)){
      const copy = { ...row, cells:[...row.cells] };
      if (key) byDate.set(key, copy);
      out.push(copy);
      return;
    }
    const t = byDate.get(key);
    row.cells.forEach((v,i) => { if (v) t.cells[i] = true; });
    t.hasData = t.hasData || row.hasData;
    if (row.remarks) t.remarks = t.remarks ? `${t.remarks} · ${row.remarks}` : row.remarks;
  });
  return out;
}

/* A slot is only "missed" once its window has genuinely closed.
   Every slot in the month falls into exactly one bucket:

     done      ticked, whenever it happened
     missed    a working day strictly BEFORE today that was never ticked
     dueToday  today's remaining slots, still open, never counted as missed
     upcoming  working days later this month, not due yet
     weekend   Saturday and Sunday, driven by the content calendar, so an
               empty weekend slot is optional and never counts as missed

   Execution rate is measured only against closed working days, so it does not
   sag just because the current day or the rest of the month has not happened. */
function computeStats(block, monthMeta){
  const platformCounts = {}, days = [], notes = [];
  block.columns.forEach(c => { platformCounts[normPlatform(c.header)] ??= 0; });
  const dayWeight = block.columns.reduce((a,c) => a + c.weight, 0);

  const today = new Date(); today.setHours(0,0,0,0);
  const t = today.getTime();

  let publishedAll = 0, flags = 0;
  let closedCommitted = 0, closedDone = 0;     // working days before today
  let todayCommitted  = 0, todayDone  = 0;     // today, still open
  let upcomingCommitted = 0;                   // working days still to come
  let weekendDone = 0, weekendSlots = 0;
  let monthCommitted = 0;                      // every working slot in the month

  mergeSameDayRows(block.rows).forEach(row => {
    if (!row.hasData) return;
    const d = row.date ? new Date(row.date) : null;
    if (d) d.setHours(0,0,0,0);
    const dow = d ? d.getDay() : null;
    const isWeekend = dow === 0 || dow === 6;
    const when = !d ? 'past' : (d.getTime() < t ? 'past' : d.getTime() === t ? 'today' : 'future');

    let dp = 0; const done = [], missedList = [];
    block.columns.forEach((c,i) => {
      const label = normPlatform(c.header);
      if (row.cells[i]){ dp += c.weight; platformCounts[label] += c.weight; done.push(label); }
      else missedList.push(label);
    });

    publishedAll += dp;
    if (isWeekend){
      weekendSlots += dayWeight; weekendDone += dp;
    } else {
      monthCommitted += dayWeight;
      if (when === 'past'){ closedCommitted += dayWeight; closedDone += dp; }
      else if (when === 'today'){ todayCommitted += dayWeight; todayDone += dp; }
      else { upcomingCommitted += dayWeight; }
    }

    if (row.remarks){ flags++; notes.push({ label:row.dateLabel, text:row.remarks }); }
    days.push({ date:row.date, iso: d ? isoOf(d) : null, label:row.dateLabel,
                posted:dp, possible:dayWeight, ratio: dayWeight ? dp/dayWeight : 0,
                weekend:isWeekend, when,
                dayName: d ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow] : '',
                done, missed:missedList, remarks: row.remarks || '' });
  });

  const missed   = Math.max(closedCommitted - closedDone, 0);
  const dueToday = Math.max(todayCommitted  - todayDone,  0);
  const upcoming = upcomingCommitted;

  /* Streaks only look at closed working days, so an open day never breaks one. */
  const closedWork = days.filter(d => !d.weekend && d.when === 'past');
  let longest=0, run=0, streak=0;
  closedWork.forEach(d => { if (d.ratio === 1){ run++; longest = Math.max(longest, run); } else run = 0; });
  for (let i=closedWork.length-1; i>=0; i--){ if (closedWork[i].ratio === 1) streak++; else break; }

  const rate = closedCommitted ? Math.round(closedDone/closedCommitted*1000)/10 : null;
  const covered = Object.values(platformCounts).filter(v => v > 0).length;
  const sm = block.summary || {};
  const manual = !isNaN(sm.planned) && !isNaN(sm.posted);

  return {
    brandName: block.brandName,
    posted: publishedAll,            // everything actually shipped
    planned: monthCommitted,         // full month working commitment
    committed: closedCommitted,      // the part that has closed
    missed, dueToday, upcoming,
    rate,                            // measured on closed working days only
    monthProgress: monthCommitted ? Math.round(publishedAll/monthCommitted*1000)/10 : 0,
    weekendDone, weekendSlots,
    workdayRate: rate,
    weekendRate: weekendSlots ? Math.round(weekendDone/weekendSlots*1000)/10 : null,
    manual, sheetPosted: sm.posted, sheetPlanned: sm.planned,
    platformCounts, platformsCovered:covered, platformsTotal:Object.keys(platformCounts).length,
    flags, streak, longest, days, notes
  };
}

function aggregate(list){
  const out = { posted:0, planned:0, committed:0, missed:0, dueToday:0, upcoming:0,
                weekendDone:0, weekendSlots:0, closedDone:0,
                streak:0, longest:0, flags:0,
                platformCounts:{}, platformsCovered:0, platformsTotal:0 };
  list.forEach(s => {
    out.posted += s.posted; out.planned += s.planned; out.committed += s.committed;
    out.missed += s.missed; out.dueToday += s.dueToday; out.upcoming += s.upcoming;
    out.weekendDone += s.weekendDone; out.weekendSlots += s.weekendSlots;
    out.closedDone += Math.max(s.committed - s.missed, 0);
    out.flags += s.flags;
    out.streak = Math.max(out.streak, s.streak);
    out.longest = Math.max(out.longest, s.longest);
    out.platformsCovered += s.platformsCovered; out.platformsTotal += s.platformsTotal;
    Object.entries(s.platformCounts).forEach(([k,v]) => { out.platformCounts[k] = (out.platformCounts[k]||0)+v; });
  });
  out.rate = out.committed ? Math.round(out.closedDone/out.committed*1000)/10 : null;
  out.monthProgress = out.planned ? Math.round(out.posted/out.planned*1000)/10 : 0;
  return out;
}

/* ============================================================
   4b. Editorial rule targets
   The checklist tells us what actually got posted. It never told us what the
   plan was, months just had however many columns happened to exist. The
   rules above are the real fixed weekly/monthly plan per manager, entered
   once in the admin panel, so "planned" can mean something real instead of
   "however many boxes are on the sheet".
   ============================================================ */
function activeRules(manager){ return CFG.rules.filter(r => r.manager === manager && r.status === 'active'); }
function heldRules(manager){ return CFG.rules.filter(r => r.manager === manager && r.status === 'hold'); }

function weeklyRuleTarget(manager){
  return activeRules(manager).reduce((a,r) => a + (r.weekly || 0), 0);
}

/* How much of the month's plan has actually come due, split by whether a
   quota runs Monday-Friday only or every day of the week (stories). */
function monthDayCounts(monthMeta){
  const year = yearFor(monthMeta.num);
  const totalDays = new Date(year, monthMeta.num, 0).getDate();
  const now = new Date(); now.setHours(0,0,0,0);
  const isCurrent = monthMeta.num === now.getMonth()+1 && year === now.getFullYear();
  const isPast = !isCurrent && new Date(year, monthMeta.num-1, 1) < now;
  let totalWeekdays=0, closedWeekdays=0, closedCalendarDays=0;
  for (let d=1; d<=totalDays; d++){
    const dt = new Date(year, monthMeta.num-1, d);
    const isWeekday = dt.getDay() !== 0 && dt.getDay() !== 6;
    if (isWeekday) totalWeekdays++;
    const closed = isPast ? true : (isCurrent ? dt < now : false);
    if (closed){ closedCalendarDays++; if (isWeekday) closedWeekdays++; }
  }
  return { totalDays, totalWeekdays, closedWeekdays, closedCalendarDays, isCurrent, isPast };
}

/* Monthly target prorated down to "what should be done by today", per rule,
   then summed. Weekday quotas prorate against weekdays elapsed; daily quotas
   (stories) prorate against calendar days elapsed. */
function monthlyRuleTarget(manager, monthMeta){
  const dc = monthDayCounts(monthMeta);
  let monthly=0, committed=0;
  activeRules(manager).forEach(r => {
    monthly += r.monthly;
    const frac = r.spread === 'daily'
      ? (dc.totalDays ? dc.closedCalendarDays/dc.totalDays : 0)
      : (dc.totalWeekdays ? dc.closedWeekdays/dc.totalWeekdays : 0);
    committed += r.monthly * frac;
  });
  return { monthly: Math.round(monthly), committed: Math.round(committed) };
}

/* Week math. The Tuesday review covers the last completed Monday to Sunday. */
function mondayOf(d){ const x=new Date(d); x.setDate(x.getDate() - ((x.getDay()+6)%7)); x.setHours(0,0,0,0); return x; }
function lastCompleteWeek(today){
  const start = mondayOf(today); start.setDate(start.getDate()-7);
  const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
  return { start, end };
}
function nextMeeting(now){
  const d = new Date(now); d.setHours(10,0,0,0);
  let add = (2 - d.getDay() + 7) % 7;
  if (add === 0 && now.getTime() > d.getTime()) add = 7;
  d.setDate(d.getDate()+add);
  return d;
}
function rangeStats(startDate, endDate, brands){
  const today = new Date(); today.setHours(0,0,0,0); const t = today.getTime();
  const out = { posted:0, committed:0, done:0, missed:0, open:0, weekendDone:0, perBrand:{} };
  brands.forEach(name => {
    let posted=0, committed=0, done=0, open=0, wknd=0;
    const idx = STATE.dayIndex[name] || {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)){
      const e = idx[isoOf(d)];
      if (!e) continue;
      posted += e.posted;
      if (e.weekend){ wknd += e.posted; continue; }        // weekend never counts as missed
      const dt = new Date(d); dt.setHours(0,0,0,0);
      if (dt.getTime() < t){ committed += e.possible; done += e.posted; }
      else { open += Math.max(e.possible - e.posted, 0); } // today or later, still open
    }
    out.perBrand[name] = { posted, committed, done, open,
                           missed: Math.max(committed-done, 0),
                           rate: committed ? Math.round(done/committed*1000)/10 : null };
    out.posted += posted; out.committed += committed; out.done += done;
    out.open += open; out.weekendDone += wknd;
  });
  out.missed = Math.max(out.committed - out.done, 0);
  out.rate = out.committed ? Math.round(out.done/out.committed*1000)/10 : null;
  return out;
}

/* ============================================================
   5. Achievements
   ============================================================ */
const nPieces = (c,g) => `${fmt(c)} of ${fmt(g)} pieces`;
const nDays   = (c,g) => `${fmt(c)} of ${fmt(g)} days`;
const nRate   = (c,g) => `${c}% of ${g}%`;

const ACHIEVEMENTS = [
  { id:'open',   name:'Opening Act',    icon:'spark',  desc:'Publish the first piece of the month', test:s => s.posted >= 1,
    prog:s => [Math.min(s.posted,1), 1], fmtProg:nPieces },
  { id:'fifty',  name:'Half Century',   icon:'bolt',   desc:'50 pieces published this month',       test:s => s.posted >= 50,
    prog:s => [Math.min(s.posted,50), 50], fmtProg:nPieces },
  { id:'cent',   name:'Century Club',   icon:'trophy', desc:'100 pieces published this month',      test:s => s.posted >= 100,
    prog:s => [Math.min(s.posted,100), 100], fmtProg:nPieces },
  { id:'s5',     name:'On Fire',        icon:'flame',  desc:'Five working days in a row at full completion', test:s => s.longest >= 5,
    prog:s => [Math.min(s.longest,5), 5], fmtProg:nDays },
  { id:'s10',    name:'Unstoppable',    icon:'flame',  desc:'Ten working days in a row at full completion',  test:s => s.longest >= 10,
    prog:s => [Math.min(s.longest,10), 10], fmtProg:nDays },
  { id:'sharp',  name:'Sharp Shooter',  icon:'target', desc:'Reach a 90% execution rate',           test:s => s.rate >= 90,
    prog:s => [Math.min(s.rate,90), 90], fmtProg:nRate },
  { id:'bulls',  name:'Bullseye',       icon:'medal',  desc:'Clear the full monthly target',        test:s => s.rate >= 100,
    prog:s => [Math.min(s.rate,100), 100], fmtProg:nRate },
  { id:'omni',   name:'Omnipresent',    icon:'globe',  desc:'Publish on every tracked platform',    test:s => s.platformsTotal > 0 && s.platformsCovered >= s.platformsTotal,
    prog:s => [s.platformsCovered, s.platformsTotal], fmtProg:(c,g) => `${c} of ${g} platforms` },
];
/* ---------- Tooltip content builders ---------- */
function dayTip(d, s){
  const meta = CHANNEL_META[s.brandName] || { short:s.brandName };
  const pct = Math.round(d.ratio*100);
  const openLabel = d.weekend ? 'optional' : d.when === 'today' ? 'still open today' : 'not due yet';
  const verdict = pct === 100 ? 'Everything shipped'
    : (d.when !== 'past' || d.weekend) ? (pct === 0 ? `Nothing shipped, ${openLabel}` : `${d.missed.length} slot${d.missed.length>1?'s':''} ${openLabel}`)
    : (pct === 0 ? 'Nothing shipped, all missed' : `${d.missed.length} slot${d.missed.length>1?'s':''} missed`);
  return `<div class="tip-t">${escText(d.label)}${d.weekend ? ' · weekend' : ''}</div>
    <div class="tip-s">${escText(d.dayName)} · ${escText(meta.short)} · ${verdict}</div>
    <div class="tip-row"><span>Completed</span><span>${fmt(d.posted)} of ${fmt(d.possible)} · ${pct}%</span></div>
    <div class="tip-bar"><i style="width:${pct}%"></i></div>
    ${d.done.length ? `<div class="tip-hr"></div><div class="tip-s">Published</div>
      <div class="tip-list">${d.done.map(p => `<span class="tip-chip">${escText(p)}</span>`).join('')}</div>` : ''}
    ${d.missed.length ? `<div class="tip-s" style="margin-top:7px;">${(d.when !== 'past' || d.weekend) ? (d.weekend ? 'Open, optional' : d.when === 'today' ? 'Still open today' : 'Not due yet') : 'Missed'}</div>
      <div class="tip-list">${d.missed.map(p => `<span class="tip-chip${(d.when === 'past' && !d.weekend) ? ' bad' : ''}">${escText(p)}</span>`).join('')}</div>` : ''}
    ${d.remarks ? `<div class="tip-hr"></div><div class="tip-s">Note: ${escText(d.remarks)}</div>` : ''}`;
}

function platformTip(name, count, total, stats){
  const share = total ? Math.round(count/total*1000)/10 : 0;
  const per = stats.map(s => {
    const meta = CHANNEL_META[s.brandName] || { short:s.brandName };
    return { short: meta.short, v: s.platformCounts[name] || 0 };
  }).filter(x => x.v > 0).sort((a,b) => b.v - a.v);
  return `<div class="tip-t">${escText(name)}</div>
    <div class="tip-s">${share}% of everything published this month</div>
    <div class="tip-hr"></div>
    ${per.map(x => `<div class="tip-row"><span>${escText(x.short)}</span><span>${fmt(x.v)}</span></div>`).join('')}
    <div class="tip-row" style="opacity:.75;"><span>Total</span><span>${fmt(count)}</span></div>`;
}

function levelFor(xp){
  let cur = LEVELS[0], next = null;
  LEVELS.forEach((l,i) => { if (xp >= l.min){ cur = l; next = LEVELS[i+1] || null; } });
  const span = next ? next.min - cur.min : 1;
  const into = next ? xp - cur.min : 1;
  return { ...cur, next, pct: next ? Math.min(into/span*100, 100) : 100, toNext: next ? next.min - xp : 0 };
}
const xpOf = s => Math.round(s.posted*10 + s.longest*25);

/* ============================================================
   6. Render helpers
   ============================================================ */
const STATE = { monthIndex: MONTHS.length-1, months:{}, dayIndex:{}, celebrated:{}, userPicked:false };
const fmt = n => Math.round(n).toLocaleString('en-IN');
const escText = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const esc     = t => String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;');

function ring(pct, size, stroke, grad, label, sub){
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  const off = c - Math.min(Math.max(pct,0),100)/100*c;
  return `<div style="position:relative; width:${size}px; height:${size}px; flex:none;">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--paper-2)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${grad}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"
        style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.9,.25,1)" data-off="${off}"/>
    </svg>
    <div style="position:absolute; inset:0; display:grid; place-items:center; text-align:center;">
      <div>
        <div class="num" style="font-size:${size>90?24:18}px; font-weight:800; letter-spacing:-0.04em; line-height:1;">${label}</div>
        ${sub ? `<div class="eyebrow" style="font-size:8.5px; margin-top:2px;">${sub}</div>` : ''}
      </div>
    </div>
  </div>`;
}
/* ---------- Tooltip engine ----------
   One floating element, driven by data-tip on any target. Works on hover and
   on tap, and flips above or below so it never runs off screen. */
const TIP = document.createElement('div');
TIP.className = 'tip'; TIP.setAttribute('role','tooltip');
document.body.appendChild(TIP);
let tipTarget = null;

function placeTip(el){
  const r = el.getBoundingClientRect();
  TIP.style.left = '0px'; TIP.style.top = '0px';
  const t = TIP.getBoundingClientRect();
  let x = r.left + r.width/2 - t.width/2;
  x = Math.max(10, Math.min(x, window.innerWidth - t.width - 10));
  let y = r.top - t.height - 10;
  if (y < 10) y = r.bottom + 10;                       // flip below when tight
  TIP.style.left = Math.round(x)+'px';
  TIP.style.top  = Math.round(y)+'px';
}
function showTip(el){
  const html = el.getAttribute('data-tip');
  if (!html) return;
  tipTarget = el; TIP.innerHTML = html;
  TIP.classList.add('show'); placeTip(el);
}
function hideTip(){ tipTarget = null; TIP.classList.remove('show'); }

document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-tip]');
  if (el && el !== tipTarget) showTip(el);
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]') && !e.relatedTarget?.closest?.('[data-tip]')) hideTip();
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-tip]');
  if (el) { el === tipTarget ? hideTip() : showTip(el); }   // tap support
  else hideTip();
});
window.addEventListener('scroll', () => { if (tipTarget) placeTip(tipTarget); }, true);
window.addEventListener('resize', hideTip);

/* ---------- Liquid vessel ----------
   A glass that fills as content ships. Empties with a drain animation the
   moment a channel clears its target. */
let vesselSeq = 0;
function vessel(pct, theme, opts){
  const o = opts || {};
  const id = 'v' + (++vesselSeq);
  const color = THEME_COLOR[theme] || 'var(--green)';
  const TOP = 20, BOT = 142;                              // interior span
  const y = TOP + (BOT - TOP) * (1 - Math.min(Math.max(pct,0),100)/100);
  const full = pct >= 100;
  const lvl = v => TOP + (BOT - TOP) * (1 - Math.min(Math.max(v,0),100)/100);
  const paceY = (o.pace != null && o.pace < 99.5) ? lvl(o.pace) : null;
  return `<div class="vessel ${full?'is-full':''}" data-vessel style="--vc:${color}">
    <svg viewBox="0 0 120 168" width="${o.w||104}" height="${Math.round((o.w||104)*1.4)}" aria-hidden="true">
      <defs>
        <clipPath id="clip-${id}">
          <path d="M26 18 H94 L86 138 Q84 148 74 148 H46 Q36 148 34 138 Z"/>
        </clipPath>
        <linearGradient id="grad-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity=".95"/>
          <stop offset="100%" stop-color="${color}" stop-opacity=".65"/>
        </linearGradient>
      </defs>

      <path d="M26 18 H94 L86 138 Q84 148 74 148 H46 Q36 148 34 138 Z" fill="var(--card-2)"/>

      <g clip-path="url(#clip-${id})">
        <g class="liquid" style="--fy:${y}px">
          <path class="wave w1" fill="url(#grad-${id})"
            d="M-60 6 q 30 -9 60 0 t 60 0 t 60 0 t 60 0 V 200 H -60 Z"/>
          <path class="wave w2" fill="url(#grad-${id})" opacity=".55"
            d="M-60 8 q 30 9 60 0 t 60 0 t 60 0 t 60 0 V 200 H -60 Z"/>
        </g>
        ${pct > 6 ? `<g class="bubbles">
          ${[[46,.0,3],[62,.9,2.2],[78,1.8,2.6],[54,2.6,1.8]].map(([bx,d,r]) =>
            `<circle cx="${bx}" cy="150" r="${r}" fill="#fff" opacity=".5" style="animation-delay:${d}s"/>`).join('')}
        </g>` : ''}
      </g>

      <path d="M26 18 H94 L86 138 Q84 148 74 148 H46 Q36 148 34 138 Z"
            fill="none" stroke="var(--line-2)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M24 15 H96" stroke="var(--line-2)" stroke-width="4" stroke-linecap="round"/>
      <path d="M38 34 L34 120" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>
      ${paceY != null ? `<g class="pace">
        <line x1="22" y1="${paceY}" x2="98" y2="${paceY}" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="4 3"/>
        <text x="102" y="${paceY+3.5}" font-size="9" fill="var(--ink-3)" font-family="Poppins,sans-serif">pace</text>
      </g>` : ''}
    </svg>
    <div class="vessel-val"><span class="num">${Math.round(pct)}</span>%</div>
  </div>`;
}

function animateRings(scope){
  (scope||document).querySelectorAll('circle[data-off]').forEach(el => {
    requestAnimationFrame(() => { el.style.strokeDashoffset = el.dataset.off; });
  });
}
function countUp(el, to, dur=1000){
  const t0 = performance.now();
  (function step(t){
    const p = Math.min((t-t0)/dur, 1);
    el.textContent = fmt(to * (1 - Math.pow(1-p, 3)));
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}
function heatColor(d){
  const ratio = d.ratio;
  if (ratio >= 1)   return 'var(--green)';
  if (ratio >= .75) return 'color-mix(in srgb, var(--green) 62%, var(--card))';
  if (ratio >= .4)  return 'var(--amber)';
  if (ratio > 0)    return 'color-mix(in srgb, var(--coral) 55%, var(--card))';
  /* nothing ticked: only a closed working day is a real miss */
  if (d.when === 'future' || d.when === 'today' || d.weekend) return 'var(--paper-2)';
  return 'var(--coral-soft)';
}
function avatarEl(mgr, stats, size=58){
  const color = THEME_COLOR[mgr.theme], grad = THEME_GRAD[mgr.theme];
  const lvl = levelFor(xpOf(stats));
  const initials = mgr.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const r = (size-4)/2, c = 2*Math.PI*r;
  const off = c - Math.min(stats.rate ?? 0,100)/100*c;
  return `<div class="avatar" style="width:${size}px; height:${size}px;">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg); position:absolute; inset:0;">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--paper-2)" stroke-width="3" fill="none"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${grad}" stroke-width="3" fill="none"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"
        style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.9,.25,1)"/>
    </svg>
    <div class="ph" style="background:linear-gradient(150deg, ${color}, color-mix(in srgb,${color} 55%, #000));">
      ${mgr.photo ? `<img src="${mgr.photo}" alt="${mgr.name}">` : initials}
    </div>
    <span class="lvlchip">LV ${lvl.n}</span>
  </div>`;
}

/* ============================================================
   7. Sections
   ============================================================ */

function setTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  try{ localStorage.setItem('if-theme', t); }catch(e){}
  document.getElementById('theme-btn').innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
}
(function initTheme(){
  let t = 'light';
  try{ t = localStorage.getItem('if-theme') || 'light'; }catch(e){}
  setTheme(t);
})();
document.getElementById('theme-btn').onclick = () =>
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

// Not every page has a sync button (the Guide is static reference content),
// so this stays optional rather than assuming every page's header is identical.
const _syncIc = document.querySelector('#refresh-btn .sync-ic');
if (_syncIc) _syncIc.innerHTML = ic('refresh');
document.getElementById('logo-slot').innerHTML = BRAND_LOGO
  ? `<img src="${BRAND_LOGO}" alt="Indian Farmer">`
  : ic('wheat');


function renderChrome(){
  const now = new Date();
  const todayPill = document.getElementById('today-pill');
  if (todayPill) todayPill.innerHTML =
    `${ic('calendar')} ${now.toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short', year:'numeric' })}`;
  const monthLabel = document.getElementById('month-label');
  if (monthLabel) monthLabel.textContent = MONTHS[STATE.monthIndex].name + ' ' + yearFor(MONTHS[STATE.monthIndex].num);
  const isCurrent = MONTHS[STATE.monthIndex].num === now.getMonth()+1;
  const scopeNote = document.getElementById('scope-note');
  if (scopeNote) scopeNote.textContent = isCurrent
    ? 'Month in progress · counted up to today'
    : 'Completed month · full period counted';
}


/* Shared across every page: whichever page includes this file sets
   window.onMonthChange to its own render function before calling initPage(). */
function renderMonthTabs(){
  const el = document.getElementById('month-tabs');
  if (!el) return;
  el.innerHTML = MONTHS.map((m,i) =>
    `<button class="seg" role="tab" data-i="${i}" aria-selected="${i===STATE.monthIndex}">${m.name}</button>`).join('');
  el.querySelectorAll('.seg').forEach(b => b.onclick = () => {
    STATE.userPicked = true; STATE.monthIndex = +b.dataset.i;
    window.onMonthChange?.();
  });
}

function toast(text, ok){
  const el = document.createElement('div');
  el.className = 'toast' + (ok===false ? ' bad' : '');
  el.innerHTML = `${ic(ok===false ? 'alert' : 'check')}<span>${escText(text)}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
}

let lastSyncAt = null;
function syncAgoText(){
  if (!lastSyncAt) return 'Syncing';
  const s = Math.round((Date.now() - lastSyncAt) / 1000);
  if (s < 8) return 'Synced just now';
  if (s < 60) return `Synced ${s}s ago`;
  const m = Math.round(s/60);
  return `Synced ${m}m ago`;
}

setInterval(() => {
  const live = document.getElementById('live-pill');
  if (lastSyncAt && !live.classList.contains('sync-error'))
    document.getElementById('live-txt').textContent = syncAgoText();
}, 5000);

async function loadAll(manual){
  const live = document.getElementById('live-pill'), txt = document.getElementById('live-txt');
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.classList.remove('synced','sync-error');
  btn.classList.add('syncing');
  const t0 = performance.now();
  try{
    try{
      MONTHS = await discoverMonths();
      if (!STATE.userPicked || STATE.monthIndex >= MONTHS.length) STATE.monthIndex = MONTHS.length - 1;
    }catch(e){
      console.warn('Tab discovery unavailable, using fallback list.', e);
      MONTHS = FALLBACK_MONTHS.slice();
    }

    const results = await Promise.all(MONTHS.map(async m => {
      const res = await fetch(csvUrl(m.gid), { cache:'no-store' });
      const stats = parseMonthCSV(await res.text(), m)
        .map(b => computeStats(b, m))
        .filter(s => s.days.length > 0 || s.manual);
      return { name:m.name, stats };
    }));

    STATE.dayIndex = {};
    results.forEach(r => {
      STATE.months[r.name] = r.stats;
      r.stats.forEach(s => {
        STATE.dayIndex[s.brandName] ||= {};
        s.days.forEach(d => { if (d.iso) STATE.dayIndex[s.brandName][d.iso] = { posted:d.posted, possible:d.possible, weekend:d.weekend }; });
      });
    });

    // Settings has no boot skeleton or #main of its own, it's always "ready".
    if (document.getElementById('boot')) document.getElementById('boot').hidden = true;
    if (document.getElementById('main')) document.getElementById('main').hidden = false;
    live.className = 'pill live'; live.classList.remove('sync-error');
    lastSyncAt = Date.now();
    txt.textContent = syncAgoText();
    window.onDataLoaded?.();

    btn.classList.remove('syncing'); btn.classList.add('synced');
    setTimeout(() => btn.classList.remove('synced'), 1400);
    // a spin that finished in a flash still reads as "did something"
    const elapsed = performance.now() - t0;
    if (manual) toast(elapsed < 400
      ? 'Sheet already up to date'
      : `Sheet synced · ${fmt(STATE.months[MONTHS[STATE.monthIndex].name]?.reduce((a,s)=>a+s.posted,0)||0)} pieces this month`);
  } catch(err){
    console.error(err);
    live.className = 'pill sync-error';
    txt.textContent = 'Sync failed';
    btn.classList.remove('syncing'); btn.classList.add('sync-error');
    setTimeout(() => btn.classList.remove('sync-error'), 2200);
    if (manual) toast('Could not reach the sheet. Check sharing settings and try again.', false);
    if (document.getElementById('main') && document.getElementById('main').hidden){
      document.getElementById('boot').innerHTML =
        `<div class="card card-pad" style="grid-column:1/-1; text-align:center;">
          <div style="color:var(--coral); margin-bottom:8px; display:flex; justify-content:center;">${ic('alert')}</div>
          <div style="font-weight:650; margin-bottom:4px;">Could not reach the sheet</div>
          <div style="font-size:13px; color:var(--ink-3);">Confirm it is shared as "Anyone with the link, Viewer", then sync again.</div>
        </div>`;
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('syncing');
  }
}

/* Every page wires the same header (sync button, theme toggle, month tabs)
   the same way. A page sets window.onDataLoaded / window.onMonthChange to
   its own render function first, then calls this once at the bottom. */
function initPage(){
  document.getElementById('refresh-btn').onclick = () => loadAll(true);
  loadAll();
  setInterval(() => loadAll(false), 5*60*1000);
}

window.__DESIGN_CREDITS__ = {
  designer: "Pritam Sonone",
  website: "https://www.digitalpritam.in",
  email: "contact@digitalpritam.in",
  project: "SMM Distribution Dashboard - Indian Farmer",
  createdDate: "2026-09-10"
};
console.log('%cDesigned by Pritam Sonone %c· digitalpritam.in', 'color:#1437BE;font-weight:700;', 'color:#7480A5;');

/* ============================================================
   Dynamic Weekly / Monthly hero — shared by every page that has a
   #hero-mode toggle and a #weekly container in its markup (index.html,
   concept.html). Re-anchors to whichever month tab is selected instead of
   always showing "today's" week, and adds a Monthly mode alongside it.
   ============================================================ */
let HERO_MODE = 'weekly';

/* For the current month: anchor on today, exactly like before. For a past
   month: anchor on that month's last day, so "last complete week" means
   the last full Mon–Sun week that actually falls inside that month. */
function weekAnchorForMonth(monthMeta){
  const now = new Date();
  const isCurrent = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  if (isCurrent) return now;
  const y = yearFor(monthMeta.num);
  return new Date(y, monthMeta.num, 0, 23, 59, 59);
}

function renderWeeklyDynamic(){
  const monthMeta = MONTHS[STATE.monthIndex];
  const anchor = weekAnchorForMonth(monthMeta);
  const { start, end } = lastCompleteWeek(anchor);
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate()-7);
  const prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate()-7);
  const brands = Object.keys(CHANNEL_META);
  const wk = rangeStats(start, end, brands);
  const pv = rangeStats(prevStart, prevEnd, brands);
  const delta = pv.posted ? Math.round((wk.posted - pv.posted)/pv.posted*1000)/10 : null;

  const now = new Date();
  /* "current" here means the selected MONTH is the real current month.
     The last complete week is, by definition, never the week containing
     today, so checking against today directly would always read as past. */
  const isCurrentMonth = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  const meet = nextMeeting(now);
  const diff = meet - now;
  const dd = Math.floor(diff/864e5), hh = Math.floor(diff%864e5/36e5), mm = Math.floor(diff%36e5/6e4);
  const isMeetingDay = isCurrentMonth && now.getDay() === 2;
  const dfmt = d => d.toLocaleDateString('en-IN',{ day:'numeric', month:'short' });

  const up = delta !== null && delta >= 0;
  const chip = delta === null ? '' :
    `<span class="trendchip" style="background:${up?'var(--green-soft)':'var(--coral-soft)'}; color:${up?'var(--green)':'var(--coral)'};">
      ${ic(up?'up':'down')} ${Math.abs(delta)}% vs previous week</span>`;

  document.getElementById('weekly').innerHTML = `
    <div class="card weekhero fade-up">
      <div>
        <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px; flex-wrap:wrap;">
          <span class="tag" style="color:var(--blue); border-color:color-mix(in srgb,var(--blue) 40%,transparent); background:var(--blue-soft);">
            ${ic('calendar')} Weekly review · ${escText(monthMeta.name)}</span>
          ${isMeetingDay ? `<span class="tag" style="color:var(--green); background:var(--green-soft); border-color:color-mix(in srgb,var(--green) 40%,transparent);">${ic('users')} Meeting day</span>` : ''}
          ${!isCurrentMonth ? `<span class="tag" style="color:var(--ink-3);">${ic('clock')} Past month</span>` : ''}
        </div>
        <div class="eyebrow" style="margin-bottom:8px;">Monday ${dfmt(start)} to Sunday ${dfmt(end)} · the last complete week in ${escText(monthMeta.name)}</div>
        <div class="week-headline">
          <div class="bignum num" id="week-big">0</div>
          <div class="week-headline-txt">
            <div style="font-size:14px; font-weight:650; margin-bottom:6px;">content pieces published</div>
            <div class="eyebrow" style="margin-bottom:7px;">${wk.missed ? fmt(wk.missed)+' missed on working days' : 'no working day misses'}${wk.weekendDone ? ' · '+fmt(wk.weekendDone)+' weekend extras' : ''}</div>
            ${chip}
          </div>
        </div>
        <div style="display:flex; gap:20px; margin-top:20px; flex-wrap:wrap;">
          ${brands.map(b => {
            const m = CHANNEL_META[b], s = wk.perBrand[b];
            return `<div style="min-width:118px;">
              <div class="eyebrow" style="color:${THEME_COLOR[m.theme]}; margin-bottom:5px;">${m.short}</div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span class="num" style="font-size:22px; font-weight:800; letter-spacing:-0.04em;">${fmt(s.posted)}</span>
                <span style="font-size:11.5px; color:var(--ink-3);">${s.missed ? fmt(s.missed)+" missed" : "on plan"}</span>
              </div>
              <div class="bar-track" style="margin-top:6px; height:5px;">
                <div class="bar-fill" style="width:${s.committed ? (s.done/s.committed*100) : 0}%; background:${THEME_COLOR[m.theme]};"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
          ${MANAGERS.map(m => {
            const target = weeklyRuleTarget(m.ruleScope);
            if (!target) return '';
            return `<span class="tag" style="color:var(--ink-2); background:var(--card-2);" data-tip="${esc('<div class=\'tip-t\'>Editorial plan, for reference</div><div class=\'tip-s\'>The agreed weekly volume of content pieces from the admin panel. Not compared against the count on the left, that counts platforms touched per day, a different unit.</div>')}" tabindex="0">
              ${ic('target')} ${m.name}'s plan: ${fmt(target)}/week</span>`;
          }).join('')}
        </div>
      </div>
      <div>
        ${ring(wk.rate ?? 0, 128, 11, 'url(#gr-brand)', (wk.rate === null ? '--' : wk.rate + '%'), 'week rate')}
        ${isCurrentMonth ? `<div class="meeting" style="margin-top:18px;">
          <div style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:650;">
            ${ic('clock')} Next review meeting
          </div>
          <div style="font-size:12px; color:var(--ink-3); margin-top:3px;">
            ${meet.toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long' })} at 10:00 AM
          </div>
          <div class="cdgrid">
            <div class="cd"><b class="num">${dd}</b><span>days</span></div>
            <div class="cd"><b class="num">${hh}</b><span>hrs</span></div>
            <div class="cd"><b class="num">${mm}</b><span>min</span></div>
          </div>
        </div>` : `<div class="meeting" style="margin-top:18px; text-align:center;">
          <div class="eyebrow">Viewing a past month</div>
          <div style="font-size:12.5px; color:var(--ink-2); margin-top:4px;">The next meeting countdown only shows for the current month.</div>
        </div>`}
      </div>
    </div>`;
  countUp(document.getElementById('week-big'), wk.posted, 1200);
  animateRings(document.getElementById('weekly'));
}

/* Same visual language as the weekly card, aggregated for the whole
   selected month instead of one week. Pulls straight from STATE, already
   computed by computeStats() when the sheet was fetched. */
function renderMonthlyHero(){
  const monthMeta = MONTHS[STATE.monthIndex];
  const stats = STATE.months[monthMeta.name] || [];
  const agg = aggregate(stats);
  const brands = Object.keys(CHANNEL_META);
  const byBrand = Object.fromEntries(stats.map(s => [s.brandName, s]));

  // previous month, for the delta chip
  const idx = MONTHS.findIndex(m => m.name === monthMeta.name);
  const prevStats = idx > 0 ? (STATE.months[MONTHS[idx-1].name] || []) : [];
  const prevAgg = prevStats.length ? aggregate(prevStats) : null;
  const delta = prevAgg && prevAgg.posted ? Math.round((agg.posted - prevAgg.posted)/prevAgg.posted*1000)/10 : null;
  const up = delta !== null && delta >= 0;
  const chip = delta === null ? '' :
    `<span class="trendchip" style="background:${up?'var(--green-soft)':'var(--coral-soft)'}; color:${up?'var(--green)':'var(--coral)'};">
      ${ic(up?'up':'down')} ${Math.abs(delta)}% vs ${escText(MONTHS[idx-1].name)}</span>`;

  const now = new Date();
  const isCurrent = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  const daysLeft = (() => {
    if (!isCurrent) return null;
    const lastDay = new Date(yearFor(monthMeta.num), monthMeta.num, 0).getDate();
    return lastDay - now.getDate();
  })();

  document.getElementById('weekly').innerHTML = `
    <div class="card weekhero fade-up">
      <div>
        <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px; flex-wrap:wrap;">
          <span class="tag" style="color:var(--violet); border-color:color-mix(in srgb,var(--violet) 40%,transparent); background:var(--violet-soft);">
            ${ic('layers')} Monthly review · ${escText(monthMeta.name)} ${yearFor(monthMeta.num)}</span>
          ${isCurrent ? `<span class="tag" style="color:var(--green); background:var(--green-soft); border-color:color-mix(in srgb,var(--green) 40%,transparent);">${ic('clock')} In progress</span>` : `<span class="tag" style="color:var(--ink-3);">${ic('check')} Completed month</span>`}
        </div>
        <div class="eyebrow" style="margin-bottom:8px;">Full calendar month, working days and weekends both counted in the total</div>
        <div class="week-headline">
          <div class="bignum num" id="week-big">0</div>
          <div class="week-headline-txt">
            <div style="font-size:14px; font-weight:650; margin-bottom:6px;">content pieces published</div>
            <div class="eyebrow" style="margin-bottom:7px;">${agg.missed ? fmt(agg.missed)+' missed on closed working days' : 'no working day misses'}${agg.weekendDone ? ' · '+fmt(agg.weekendDone)+' weekend extras' : ''}</div>
            ${chip}
          </div>
        </div>
        <div style="display:flex; gap:20px; margin-top:20px; flex-wrap:wrap;">
          ${brands.map(b => {
            const m = CHANNEL_META[b], s = byBrand[b];
            if (!s) return '';
            return `<div style="min-width:118px;">
              <div class="eyebrow" style="color:${THEME_COLOR[m.theme]}; margin-bottom:5px;">${m.short}</div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span class="num" style="font-size:22px; font-weight:800; letter-spacing:-0.04em;">${fmt(s.posted)}</span>
                <span style="font-size:11.5px; color:var(--ink-3);">${s.missed ? fmt(s.missed)+" missed" : "on plan"}</span>
              </div>
              <div class="bar-track" style="margin-top:6px; height:5px;">
                <div class="bar-fill" style="width:${s.committed ? (Math.max(s.committed-s.missed,0)/s.committed*100) : 0}%; background:${THEME_COLOR[m.theme]};"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
          ${MANAGERS.map(m => {
            const target = monthlyRuleTarget(m.ruleScope, monthMeta).monthly;
            if (!target) return '';
            return `<span class="tag" style="color:var(--ink-2); background:var(--card-2);" data-tip="${esc('<div class=\'tip-t\'>Editorial plan, for reference</div><div class=\'tip-s\'>The agreed monthly volume of content pieces from the admin panel. Not compared against the count on the left, that counts platforms touched per day, a different unit.</div>')}" tabindex="0">
              ${ic('target')} ${m.name}'s plan: ${fmt(target)}/month</span>`;
          }).join('')}
        </div>
      </div>
      <div>
        ${ring(agg.rate ?? 0, 128, 11, 'url(#gr-brand)', (agg.rate === null ? '--' : agg.rate + '%'), 'month rate')}
        <div class="meeting" style="margin-top:18px; text-align:center;">
          <div style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:650; justify-content:center;">
            ${ic(isCurrent ? 'clock' : 'check')} ${isCurrent ? 'Days remaining' : 'Month closed'}
          </div>
          ${isCurrent
            ? `<div class="cdgrid" style="justify-content:center;"><div class="cd"><b class="num">${daysLeft}</b><span>days left</span></div></div>`
            : `<div style="font-size:12.5px; color:var(--ink-2); margin-top:4px;">${fmt(agg.posted)} of ${fmt(agg.planned)} planned pieces shipped.</div>`}
        </div>
      </div>
    </div>`;
  countUp(document.getElementById('week-big'), agg.posted, 1200);
  animateRings(document.getElementById('weekly'));
}

function renderOverviewHero(){
  if (HERO_MODE === 'monthly') renderMonthlyHero();
  else renderWeeklyDynamic();
}

document.querySelectorAll('#hero-mode .seg').forEach(btn => {
  btn.onclick = () => {
    HERO_MODE = btn.dataset.mode;
    document.querySelectorAll('#hero-mode .seg').forEach(b => b.setAttribute('aria-selected', b===btn ? 'true':'false'));
    renderOverviewHero();
  };
});

/* ============================================================
   Editorial Plan — shared by plan.html and the Command Deck's Plan panel.
   Read-only view of the rules set in Settings → Editorial rules. Never
   measured against the checklist here (different units), this is purely
   "what did we agree to make". The Weekly/Monthly toggle just changes which
   figure is emphasised — both numbers stay visible either way, since a
   manager's weekly cadence and monthly total are both real, useful facts.
   ============================================================ */
let PLAN_MODE = 'weekly';

function renderPlanPage(){
  renderChrome();
  const monthMeta = MONTHS[STATE.monthIndex];
  const wkOn = PLAN_MODE === 'weekly';

  document.getElementById('plan-managers').innerHTML = MANAGERS.map((m,i) => {
    const rows = CFG.rules.filter(r => r.manager === m.ruleScope);
    const color = THEME_COLOR[m.theme];
    const wk = weeklyRuleTarget(m.ruleScope);
    const mo = monthlyRuleTarget(m.ruleScope, monthMeta).monthly;
    const held = rows.filter(r => r.status === 'hold');
    const big = (v,label,on) => `<div><span class="num" style="font-size:${on?26:17}px; font-weight:${on?800:650}; color:${on?'var(--ink)':'var(--ink-3)'}; transition:.2s ease;">${fmt(v)}</span><span class="eyebrow"> ${label}</span></div>`;
    return `<div class="card card-pad hoverable fade-up" style="animation-delay:${i*70}ms">
      <div class="chan-strip" style="background:linear-gradient(90deg,${color},transparent);"></div>
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
        <h3 style="font-size:17px;">${m.name}<span style="color:var(--ink-3); font-weight:500;"> &middot; ${m.role}</span></h3>
      </div>
      <div style="display:flex; align-items:baseline; gap:18px; margin-bottom:14px;">
        ${big(wk,'/week',wkOn)}
        ${big(mo,'/month',!wkOn)}
      </div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        ${rows.map(r => `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; border-radius:9px; background:var(--card-2); ${r.status==='hold'?'opacity:.6;':''}">
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:600; ${r.status==='hold'?'text-decoration:line-through;':''}">${escText(r.type)}</div>
            <div style="font-size:11px; color:var(--ink-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escText(r.platforms)}${r.note?' &middot; '+escText(r.note):''}</div>
          </div>
          <div style="text-align:right; flex:none;">
            <div class="eyebrow" style="${wkOn?'color:var(--ink); font-weight:700;':''}">${r.weekly!=null ? fmt(r.weekly)+'/wk' : '&mdash;'}</div>
            <div class="eyebrow" style="${!wkOn?'color:var(--ink); font-weight:700;':''}">${fmt(r.monthly)}/mo</div>
          </div>
        </div>`).join('')}
      </div>
      ${held.length ? `<div class="eyebrow" style="margin-top:12px; display:flex; align-items:center; gap:5px;">${ic('clock')} ${held.length} item${held.length>1?'s':''} on hold, not counted in the totals above</div>` : ''}
    </div>`;
  }).join('');

  // One flat table across both managers — handy to print or screen-share as-is.
  const all = CFG.rules;
  const wkCell = wkOn ? 'style="background:var(--blue-soft);"' : '';
  const moCell = !wkOn ? 'style="background:var(--blue-soft);"' : '';
  document.getElementById('plan-table').innerHTML = `
    <div class="tablewrap">
      <table class="plan-table">
        <thead><tr><th>Manager</th><th>Content type</th><th>Platforms</th><th ${wkCell}>Weekly</th><th ${moCell}>Monthly</th><th>Status</th></tr></thead>
        <tbody>
          ${all.map(r => `<tr class="${r.status==='hold'?'is-hold':''}">
            <td><span class="tag" style="color:${THEME_COLOR[MANAGERS.find(m=>m.ruleScope===r.manager)?.theme||'blue']};">${escText(r.manager)}</span></td>
            <td style="font-weight:600;">${escText(r.type)}</td>
            <td style="color:var(--ink-3); font-size:12.5px;">${escText(r.platforms)}</td>
            <td class="num" ${wkCell} style="text-align:center;">${r.weekly ?? '&mdash;'}</td>
            <td class="num" ${moCell} style="text-align:center;">${fmt(r.monthly)}</td>
            <td>${r.status==='hold' ? `<span class="tag" style="color:var(--ink-3);">${ic('clock')} On hold</span>` : `<span class="tag" style="color:var(--green);">${ic('check')} Active</span>`}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

document.querySelectorAll('#plan-mode .seg').forEach(btn => {
  btn.onclick = () => {
    PLAN_MODE = btn.dataset.mode;
    document.querySelectorAll('#plan-mode .seg').forEach(b => b.setAttribute('aria-selected', b===btn ? 'true':'false'));
    renderPlanPage();
  };
});
