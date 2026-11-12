/* Pitchfork website: buyers, sellers and admin, backed by Supabase. */
(function(){
'use strict';

const CFG = window.PITCHFORK_CONFIG;
const IMG = window.PITCHFORK_IMG;
const app = document.getElementById('app');

if (!window.supabase || !window.L) {
  app.innerHTML = '<div class="main"><div class="notice err">Pitchfork could not load. Check your connection and refresh the page.</div></div>';
  return;
}
const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* ---------------- helpers ---------------- */
const I = {
  fork:'M9 3h6 M9 3c0 2 1.3 3 3 3s3-1 3-3 M12 6v8 M7 14h10 M7 14v7 M10.3 14v7 M13.7 14v7 M17 14v7',
  camera:'M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  close:'M6 6l12 12 M18 6 6 18', trash:'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  chat:'M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5',
  bank:'M3 10h18 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 21h18 M12 3l9 5H3z',
  gate:'M3 6v14 M21 6v14 M3 9h18 M3 17h18 M3 17 21 9',
  basket:'M4 9h16l-1.5 10h-13z M8 9l3-5 M16 9l-3-5',
  pinMark:'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  compass:'M12 3a9 9 0 1 0 .01 0z M15.5 8.5l-2 5-5 2 2-5z',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1-4 4-6 8-6s7 2 8 6',
  shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  back:'M15 18l-6-6 6-6', next:'M9 6l6 6-6 6', minus:'M5 12h14', plus:'M12 5v14 M5 12h14',
  check:'M5 12l5 5 9-10', bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4',
  van:'M2 6h11v10H2z M13 9h4l3 3v4h-7 M4 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M15 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  lock:'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download:'M12 4v11 M7 10l5 5 5-5 M5 20h14'
};
const ic = (k, s=22, w=2, color='currentColor') =>
  `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[k]}"/></svg>`;
const nat = (k, s) => `<img src="${IMG[k] || IMG.all}" alt="" width="${s}" height="${s}" style="flex-shrink:0">`;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp = (n) => (n === null || n === undefined || n === '' || isNaN(n)) ? '[price]' : '£' + Number(n).toFixed(2);
const CATS = [['all','All'],['cow','Beef'],['sheep','Lamb'],['pig','Pork'],['veg','Veg'],['fruit','Fruit']];
const catLabel = (k) => (CATS.find(c => c[0] === k) || ['', ''])[1];
const mainCat = (s) => (s.cats && s.cats[0]) || 'all';
const photoUrl = (path) => path ? sb.storage.from('photos').getPublicUrl(path).data.publicUrl : null;
const firstName = (s) => ((s && s.person) || '').trim().split(/\s+/)[0] || 'The seller';
const forSale = (s) => (s.items || []).filter(i => i.visible && i.price !== null && i.price !== undefined).sort(bySort);
const bySort = (a, b) => (a.sort || 0) - (b.sort || 0) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
const slotsOf = (s) => (s.collect_times || '').split('\n').map(t => t.trim()).filter(Boolean);
const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const errMsg = (e) => (e && (e.message || e.error_description)) || 'Something went wrong. Please try again.';
function miles(s){
  if (s.lat == null || s.lng == null) return null;
  const R = 3958.8, toR = (d) => d * Math.PI / 180;
  const dLat = toR(s.lat - CFG.centre.lat), dLng = toR(s.lng - CFG.centre.lng);
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(CFG.centre.lat)) * Math.cos(toR(s.lat)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const siteUrl = () => location.origin + location.pathname;
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

/* ---------------- state ---------------- */
const st = {
  session: null, profile: null, authReady: false,
  cat: 'all', toast: '', zoom: null,
  cache: {},          // key -> {data, error} or promise
  basket: loadBasket(),
  ed: null            // the seller page being edited
};
function loadBasket(){
  try { const b = JSON.parse(localStorage.getItem('pf-basket') || 'null'); if (b && typeof b === 'object') return { sellerId: null, qty: {}, mode: 'collect', slot: '', ...b }; } catch (e) {}
  return { sellerId: null, qty: {}, mode: 'collect', slot: '' };
}
function saveBasket(){ try { localStorage.setItem('pf-basket', JSON.stringify(st.basket)); } catch (e) {} }
const uid = () => st.session && st.session.user && st.session.user.id;
const isAdmin = () => st.profile && st.profile.role === 'admin';
let toastTimer = null;
function toast(msg){ st.toast = msg; const t = document.querySelector('.toast'); if (t) t.textContent = msg; else app.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(msg)}</div>`);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { st.toast = ''; const el = document.querySelector('.toast'); if (el) el.remove(); }, 3200); }

/* data cache: screens ask for data by key; refresh() reuses it, invalidate() refetches */
async function data(key, fetcher){
  if (!st.cache[key]) st.cache[key] = fetcher().then(r => r, e => ({ error: e }));
  return st.cache[key];
}
function invalidate(...prefixes){ for (const k of Object.keys(st.cache)) if (prefixes.some(p => k.startsWith(p))) delete st.cache[k]; }

const fetchPublic = () => data('public', async () => {
  const { data: rows, error } = await sb.from('sellers').select('*, items(*), coming_soon(*)').eq('status', 'approved').eq('live', true).order('created_at');
  return { data: rows || [], error };
});
const fetchSeller = (id) => data('seller:' + id, async () => {
  const { data: row, error } = await sb.from('sellers').select('*, items(*), coming_soon(*)').eq('id', id).maybeSingle();
  return { data: row, error };
});

/* ---------------- shared pieces ---------------- */
const stepper = (id, q, max, act) =>
  `<div class="stepper"><button data-act="${act}-dec" data-id="${id}" ${q<=0?'disabled':''} aria-label="One less">${ic('minus',18,2.2)}</button><span>${q}</span><button class="plus" data-act="${act}-inc" data-id="${id}" ${q>=max?'disabled':''} aria-label="One more">${ic('plus',18,2.2)}</button></div>`;
const topbar = (back, title, extra='') => `<header class="topbar">${back ? `<a href="${back}" class="round" aria-label="Back">${ic('back',22,2.2)}</a>` : ''}<h1 class="grow">${title}</h1>${extra}</header>`;
function basketCount(){ return Object.values(st.basket.qty).reduce((a, b) => a + (b || 0), 0); }
function tabbar(active){
  const n = basketCount();
  const tabs = [['#/', 'compass', 'Explore', 'home'], ['#/basket', 'basket', 'Basket', 'basket'], ['#/sell', 'gate', 'Sell', 'sell'], ['#/account', 'user', 'Account', 'account']];
  if (isAdmin()) tabs.push(['#/admin', 'shield', 'Admin', 'admin']);
  return `<nav class="tabbar" aria-label="Main">${tabs.map(t => `<a href="${t[0]}" ${active === t[3] ? 'aria-current="page"' : ''}>${ic(t[1])}${t[2]}${t[3] === 'basket' && n ? `<span class="badge">${n}</span>` : ''}</a>`).join('')}</nav>`;
}
const sellerThumb = (s, size) => s.cover_path
  ? `<span class="thumb" style="width:${size}px;height:${size}px"><img src="${esc(photoUrl(s.cover_path))}" alt="" loading="lazy"></span>`
  : `<span class="thumb" style="width:${size}px;height:${size}px">${nat(mainCat(s), Math.round(size * .78))}</span>`;
const notice = (text, kind='') => `<div class="notice ${kind}" ${kind === 'err' ? 'role="alert"' : ''}>${text}</div>`;
const loadingView = (msg='Loading…') => ({ html: `<div class="loading" role="status">${esc(msg)}</div>` });
const signInPrompt = (what, next) => `<div class="card col" style="padding:18px;gap:10px"><strong style="font-size:16px">${what}</strong>
  <div class="row wrap" style="gap:10px"><a class="btn btn-brand" href="#/login?next=${encodeURIComponent(next)}">Log in</a><a class="btn btn-line" href="#/signup?next=${encodeURIComponent(next)}">Create an account</a></div></div>`;

/* ---------------- maps ---------------- */
let maps = [];
function makeMap(el, { onClick } = {}){
  const m = L.map(el, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false }).setView([CFG.centre.lat, CFG.centre.lng], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
  const ring = L.circle([CFG.centre.lat, CFG.centre.lng], { radius: CFG.radiusMiles * 1609.34, color: '#8B6B4A', weight: 1.5, dashArray: '5 5', fillOpacity: .05, interactive: false }).addTo(m);
  m.fitBounds(ring.getBounds(), { padding: [6, 6] });
  if (onClick) m.on('click', onClick);
  maps.push(m);
  setTimeout(() => { if (maps.includes(m)) m.invalidateSize(); }, 50);
  return m;
}
const pinIcon = (cat, me) => L.divIcon({ className: 'pf', html: `<span class="pin ${me ? 'me' : ''}">${nat(cat, 30)}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] });


/* ---------- illustrated Explore map ----------
   Drawn from real positions: 1 mile = 130/radius px, Sheepscombe at (150,170). */
const MAP_W = 300, MAP_H = 340, MAP_R = 130;
function project(lat, lng){
  const ppm = MAP_R / CFG.radiusMiles;
  const dx = (lng - CFG.centre.lng) * 69.17 * Math.cos(CFG.centre.lat * Math.PI / 180);
  const dy = (lat - CFG.centre.lat) * 69.0;
  return [150 + dx * ppm, 170 - dy * ppm];
}
function curve(points){
  const p = points.map(([la, ln]) => project(la, ln));
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function blob(lat, lng, rx, ry, seed){
  const [cx, cy] = project(lat, lng); let d = '';
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, w = 1 + 0.18 * Math.sin(k * 2.3 + seed);
    const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w; d += (k ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
  return d + ' Z';
}
const ROADS = [
  [[51.735,-2.214],[51.744,-2.217],[51.760,-2.211],[51.774,-2.201],[51.785,-2.194],[51.800,-2.197],[51.815,-2.204],[51.832,-2.210]],
  [[51.744,-2.215],[51.752,-2.200],[51.763,-2.187],[51.776,-2.180],[51.788,-2.166],[51.800,-2.146],[51.815,-2.126],[51.830,-2.110]],
  [[51.785,-2.194],[51.788,-2.178],[51.790,-2.158],[51.794,-2.150]],
  [[51.790,-2.158],[51.800,-2.162],[51.811,-2.160],[51.828,-2.152]],
  [[51.7517,-2.1409],[51.748,-2.165],[51.745,-2.190],[51.744,-2.215]],
  [[51.7517,-2.1409],[51.765,-2.115],[51.7773,-2.0916],[51.784,-2.070]],
  [[51.7912,-2.1196],[51.785,-2.104],[51.7773,-2.0916]],
  [[51.7912,-2.1196],[51.797,-2.135],[51.800,-2.146]],
  [[51.7517,-2.1409],[51.738,-2.140]]
];
const STREAMS = [
  [[51.783,-2.168],[51.774,-2.176],[51.763,-2.188],[51.752,-2.204],[51.742,-2.222]],
  [[51.806,-2.186],[51.795,-2.196],[51.782,-2.203],[51.768,-2.214],[51.752,-2.232]]
];
const WOODS = [[51.808,-2.170,26,16,1],[51.796,-2.150,18,12,2],[51.768,-2.160,16,10,3],[51.770,-2.120,20,12,4],[51.758,-2.105,14,9,5],[51.800,-2.110,15,10,6],[51.776,-2.235,16,11,7]];
const PLACES = [
  ['Painswick', 51.7849, -2.1937], ['Slad', 51.7628, -2.1874], ['Bisley', 51.7517, -2.1409], ['Miserden', 51.7773, -2.0916],
  ['Cranham', 51.811, -2.160], ['Whiteway', 51.7912, -2.1196], ['Edge', 51.7864, -2.2217], ['Pitchcombe', 51.7691, -2.2217], ['Bulls Cross', 51.776, -2.180]
];
function illustratedMap(sellers){
  const inRing = (x, y) => Math.hypot(x - 150, y - 170) < MAP_R + 40;
  const labels = PLACES.map(([n, la, ln]) => { const [x, y] = project(la, ln); return inRing(x, y) && x > 8 && x < MAP_W - 8 && y > 10 && y < MAP_H - 6
    ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#6B7A62"/><text x="${(x > 220 ? x - 5 : x + 5).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${x > 220 ? 'end' : 'start'}">${n}</text>` : ''; }).join('');
  const [sx, sy] = project(51.744, -2.217);
  const svg = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="${MAP_W}" height="${MAP_H}" fill="#DCE5D0"/>
    <g fill="#C6D6B5">${WOODS.map(w => `<path d="${blob(...w)}"/>`).join('')}</g>
    <g fill="none" stroke="#9EC2CF" stroke-width="2.4" stroke-linecap="round">${STREAMS.map(r => `<path d="${curve(r)}"/>`).join('')}</g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#B5BFA8" stroke-width="7">${ROADS.map(r => `<path d="${curve(r)}"/>`).join('')}</g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#fff" stroke-width="4.5">${ROADS.map(r => `<path d="${curve(r)}"/>`).join('')}</g>
    <circle cx="150" cy="170" r="${MAP_R}" fill="#8B6B4A" fill-opacity=".06" stroke="#8B6B4A" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 5"/>
    <g font-family="'Instrument Sans','Segoe UI',sans-serif" font-size="10.5" fill="#2F4035">${labels}
      <circle cx="150" cy="170" r="6" fill="#D8B572" stroke="#1E2A33" stroke-width="1.5"/>
      <text x="158" y="166" font-weight="700" font-size="11.5" fill="#1E2A33">${esc(CFG.centre.name)}</text>
      <text x="${Math.max(6, sx - 10).toFixed(1)}" y="${Math.min(MAP_H - 8, sy + 14).toFixed(1)}" font-style="italic" fill="#54606A">to Stroud</text>
      <text x="${(150 + MAP_R * .72).toFixed(1)}" y="${(170 - MAP_R * .72).toFixed(1)}" font-weight="700" fill="#8B6B4A">${CFG.radiusMiles} mi</text>
      <path d="M22 30 27 16 32 30 27 26z" fill="#2F4035"/><text x="23" y="44" font-weight="700" font-size="10">N</text></g>
  </svg>`;
  const pins = sellers.filter(s => s.lat != null && s.lng != null).map(s => {
    let [x, y] = project(s.lat, s.lng); x = Math.max(16, Math.min(MAP_W - 16, x)); y = Math.max(16, Math.min(MAP_H - 16, y));
    return `<a class="pin" href="#/seller/${s.id}" style="left:${(x / MAP_W * 100).toFixed(2)}%;top:${(y / MAP_H * 100).toFixed(2)}%" aria-label="${esc(s.name)}" title="${esc(s.name)}">${nat(mainCat(s), 26)}</a>`; }).join('');
  return `<div class="illmap" role="region" aria-label="Map of sellers around ${esc(CFG.centre.name)}">${svg}${pins}</div>`;
}

/* ================= SCREENS ================= */

/* ---------- Home: map and list ---------- */
async function homeView(){
  const r = await fetchPublic();
  const all = r.data || [];
  const shown = st.cat === 'all' ? all : all.filter(s => (s.cats || []).includes(st.cat));
  const heading = { all: 'Selling near you', cow: 'Beef near you', sheep: 'Lamb near you', pig: 'Pork near you', veg: 'Veg near you', fruit: 'Fruit near you' }[st.cat];
  const html = `
  <header class="hero">
    <div class="row between"><a href="#/" class="brand">${ic('fork',30,2,'#F6E3B8')}Pitchfork</a></div>
    <p style="font-size:15px">Neighbours' surplus, straight from the farm gate</p>
    <div class="row" style="gap:6px;align-self:flex-start;padding:6px 12px 6px 8px;border-radius:999px;background:var(--brand-dk);font-size:13px;font-weight:600">${ic('pinMark',16,2.2,'#D8B572')}Within ${CFG.radiusMiles} miles of ${esc(CFG.centre.name)}</div>
  </header>
  <main class="main">
    <section class="map-wrap" aria-label="Map of local sellers">
      ${illustratedMap(shown)}
      <nav class="rail" aria-label="Filter by produce">${CATS.map(([id, l]) => `<button data-act="cat" data-id="${id}" aria-pressed="${st.cat === id}">${nat(id, 28)}<span>${l}</span></button>`).join('')}</nav>
    </section>
    <section class="section">
      <div class="row between" style="align-items:baseline"><h2 style="font-size:21px">${heading}</h2><span class="small muted">${shown.length} seller${shown.length === 1 ? '' : 's'}</span></div>
      ${r.error ? notice('Couldn’t load sellers. Check your connection and refresh.', 'err') : ''}
      ${!r.error && !all.length ? `<div class="card col" style="padding:18px;gap:6px"><strong style="font-size:16px">No sellers yet</strong><span class="small muted">Local sellers will appear here and on the map as they join.</span></div>` : ''}
      ${all.length && !shown.length ? `<div class="card" style="padding:16px"><span class="small muted">Nobody is selling ${esc(catLabel(st.cat).toLowerCase())} right now.</span></div>` : ''}
      ${shown.map(s => { const d = miles(s), names = forSale(s).slice(0, 3).map(i => i.name).join(', ');
        return `<a href="#/seller/${s.id}" class="card list-link">${sellerThumb(s, 48)}
          <span class="col grow" style="gap:2px"><strong style="font-size:15px">${esc(s.name)}</strong><span class="small muted">${esc(s.place || CFG.centre.name)}${d != null ? ' · ' + d.toFixed(1) + ' mi' : ''}</span>${names ? `<span class="small">${esc(names)}</span>` : ''}</span>${ic('next',18,2,'#54606A')}</a>`; }).join('')}
    </section>
    <a href="#/sell" class="row" style="gap:14px;padding:16px;border-radius:18px;background:var(--honey);color:var(--ink);text-decoration:none">${ic('gate',34,1.8)}
      <span class="col grow" style="gap:2px"><span class="display" style="font-weight:800;font-size:17px">More than your freezer can hold?</span><span style="font-size:14px">Sell your surplus to neighbours with Pitchfork.</span></span>${ic('next',18,2.2)}</a>
    <p class="small muted" style="text-align:center"><a href="#/about">About Pitchfork, terms and privacy</a></p>
  </main>${tabbar('home')}`;
  return { html };
}

/* ---------- Seller page ---------- */
async function sellerView(id){
  const r = await fetchSeller(id);
  const s = r.data;
  if (!s) return { html: `${topbar('#/', 'Seller')}<main class="main">${notice(r.error ? 'Couldn’t load this page. Please try again.' : 'This seller isn’t on Pitchfork at the moment.', r.error ? 'err' : '')}</main>${tabbar('home')}` };
  const isPublic = s.status === 'approved' && s.live;
  let notifySet = new Set();
  if (uid() && (s.coming_soon || []).length) {
    const n = await data('notify:' + uid(), async () => { const { data: rows, error } = await sb.from('notify_requests').select('coming_soon_id').eq('user_id', uid()); return { data: rows || [], error }; });
    notifySet = new Set((n.data || []).map(x => x.coming_soon_id));
  }
  const mine = st.basket.sellerId === s.id;
  const items = forSale(s), d = miles(s), cover = photoUrl(s.cover_path);
  const chips = [s.collect && 'Gate collection', s.deliver && 'Local delivery', 'Pay the seller direct'].filter(Boolean);
  const count = mine ? basketCount() : 0;
  const sub = mine ? items.reduce((a, i) => a + (st.basket.qty[i.id] || 0) * Number(i.price), 0) : 0;
  const z = st.zoom && items.find(i => i.id === st.zoom);
  const html = `
  <div class="cover">${cover ? `<img src="${esc(cover)}" alt="">` : `<svg width="100%" height="220" viewBox="0 0 390 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style="position:absolute;inset:0"><rect width="390" height="220" fill="#CFE0D6"/><circle cx="318" cy="56" r="22" fill="#D8B572"/><path d="M0 128c60-30 120-36 190-16s130 4 200-26v134H0z" fill="#A9C493"/><path d="M0 158c80-28 150-20 220 0s120 10 170-6v68H0z" fill="#7FA66B"/><path d="M0 192c90-16 190-12 290 4 40 6 70 4 100-2v26H0z" fill="#4F7B4A"/></svg>`}
    <a href="#/" class="round" style="position:absolute;left:16px;top:calc(16px + env(safe-area-inset-top,0px));background:#fff;box-shadow:0 2px 6px rgba(30,42,51,.2)" aria-label="Back to map">${ic('back',22,2.2)}</a>
    <div class="badgepic">${nat(mainCat(s), 60)}</div></div>
  <main class="main" style="padding-top:46px;gap:22px">
    ${!isPublic ? notice(s.status !== 'approved' ? 'Preview: this page isn’t public yet. It appears on Pitchfork once it’s approved and switched live.' : 'Preview: this page is hidden. Switch it live to show it on the map.', 'warn') : ''}
    <div class="col" style="gap:6px"><h1 style="font-weight:800;font-size:28px;letter-spacing:-.02em">${esc(s.name) || '[Seller name]'}</h1>
      <p class="muted" style="font-size:14px">${[esc(s.person), esc(s.place), d != null ? d.toFixed(1) + ' mi' : ''].filter(Boolean).join(' · ')}</p>
      <div class="row wrap" style="gap:6px;margin-top:4px">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div></div>
    ${s.about ? `<section class="section"><h2>About us</h2><p class="pre" style="font-size:15px;line-height:1.55">${esc(s.about)}</p></section>` : ''}
    <section class="section"><h2>In the freezer now</h2>
      ${items.length ? items.map(i => { const q = mine ? (st.basket.qty[i.id] || 0) : 0, ph = photoUrl(i.photo_path);
        return `<div class="card row" style="padding:12px">
          ${ph ? `<button class="thumb" data-act="zoom" data-id="${i.id}" aria-label="View photo of ${esc(i.name)}"><img src="${esc(ph)}" alt="" loading="lazy"></button>` : `<span class="thumb" aria-hidden="true">${nat(mainCat(s), 34)}</span>`}
          <div class="col grow" style="gap:2px"><strong>${esc(i.name)}</strong>${i.pack ? `<span class="small muted">${esc(i.pack)}</span>` : ''}
            <span style="font-size:14px"><strong>${gbp(i.price)}</strong> <span style="font-size:12px;color:#8A4B10;font-weight:600">${i.stock <= 0 ? 'Sold out' : i.stock <= 3 ? 'Only ' + i.stock + ' left' : i.stock + ' in stock'}</span></span></div>
          ${isPublic ? stepper(i.id, q, i.stock, 'q') : ''}</div>`; }).join('') : `<div class="card" style="padding:16px"><span class="small muted">Nothing in the freezer right now.</span></div>`}
    </section>
    ${(s.coming_soon || []).length ? `<section class="section"><h2>Coming soon</h2>
      ${s.coming_soon.slice().sort(bySort).map(x => { const on = notifySet.has(x.id);
        return `<div class="soon"><div class="col grow" style="gap:2px"><strong>${esc(x.name)}</strong>${x.when_text ? `<span class="small muted">${esc(x.when_text)}</span>` : ''}</div>
        ${isPublic ? `<button class="btn btn-sm ${on ? 'btn-brand' : 'btn-line'}" data-act="notify" data-id="${x.id}" aria-pressed="${on}">${ic(on ? 'check' : 'bell', 16, 2.2)}${on ? 'On the list' : 'Notify me'}</button>` : ''}</div>`; }).join('')}</section>` : ''}
    ${s.collect || s.deliver ? `<section class="section"><h2>Collection &amp; delivery</h2><div class="card col">
      ${s.collect ? `<div class="row" style="padding:14px;align-items:flex-start">${ic('gate',26,1.8,'#8B6B4A')}<div class="col" style="gap:2px"><strong>Collect from the farm gate</strong><span class="small muted pre">${esc(s.collect_times) || 'Times arranged with the seller.'}</span><span class="small muted">Exact location shared after you reserve.</span></div></div>` : ''}
      ${s.collect && s.deliver ? '<div class="divider"></div>' : ''}
      ${s.deliver ? `<div class="row" style="padding:14px;align-items:flex-start">${ic('van',26,1.8,'#8B6B4A')}<div class="col" style="gap:2px"><strong>Local delivery</strong><span class="small muted">${esc(s.delivery_text) || 'Nearby'} · ${Number(s.delivery_fee) ? gbp(s.delivery_fee) : 'Free'}</span></div></div>` : ''}
    </div></section>` : ''}
  </main>
  ${isPublic ? `<div class="bottom">${count ? `<a href="#/basket" class="btn btn-brand full" style="justify-content:space-between"><span>Basket · ${count} item${count === 1 ? '' : 's'}</span><span>${gbp(sub)}</span></a>` : `<div class="btn full" style="background:var(--rule);color:var(--muted);font-weight:600">Add something from the freezer</div>`}</div>` : ''}
  ${z ? `<div class="lightbox" role="dialog" aria-label="${esc(z.name)} photo"><button class="close" data-act="unzoom" aria-label="Close photo">${ic('close',22,2.2)}</button>
    <img src="${esc(photoUrl(z.photo_path))}" alt="${esc(z.name)}"><div class="col" style="align-items:center;gap:2px;color:#fff;text-align:center"><strong style="font-size:17px">${esc(z.name)}</strong><span style="font-size:14px;color:#E8E2D6">${[esc(z.pack), gbp(z.price)].filter(Boolean).join(' · ')}</span></div></div>` : ''}`;
  return { html };
}

/* ---------- Basket & reserve ---------- */
async function basketView(){
  const b = st.basket;
  if (!b.sellerId || !basketCount()) return { html: `${topbar('#/', 'Basket')}<main class="main"><div class="card col" style="padding:20px;gap:10px;align-items:flex-start"><strong>Your basket is empty</strong><span class="small muted">Find something in a neighbour's freezer.</span><a href="#/" class="textbtn" style="padding:0">Browse the map</a></div></main>${tabbar('basket')}` };
  const r = await fetchSeller(b.sellerId);
  const s = r.data;
  if (!s) return { html: `${topbar('#/', 'Basket')}<main class="main">${notice('This seller isn’t taking orders right now.', 'warn')}<button class="btn btn-line" data-act="basket-clear">Empty basket</button></main>${tabbar('basket')}` };
  const lines = forSale(s).filter(i => (b.qty[i.id] || 0) > 0).map(i => ({ ...i, q: Math.min(b.qty[i.id], i.stock) }));
  const mode = (b.mode === 'deliver' && s.deliver) || !s.collect ? 'deliver' : 'collect';
  const fee = mode === 'deliver' ? Number(s.delivery_fee) || 0 : 0;
  const subtotal = lines.reduce((a, l) => a + l.q * Number(l.price), 0);
  const slots = slotsOf(s);
  const p = st.profile || {};
  const fromProfile = { name: p.full_name || '', phone: p.phone || '', email: p.email || (st.session && st.session.user.email) || '', address: [p.address, p.town, p.postcode].filter(Boolean).join(', '), note: '' };
  const f = st.checkout = st.checkout || {};
  for (const k of Object.keys(fromProfile)) if (!f[k]) f[k] = fromProfile[k];
  const html = `${topbar('#/seller/' + s.id, 'Basket')}
  <main class="main">
    <section class="card col">
      <div class="row" style="padding:14px 14px 10px">${sellerThumb(s, 40)}<div class="col"><strong>${esc(s.name)}</strong><span class="small muted">${[esc(s.person), esc(s.place)].filter(Boolean).join(' · ')}</span></div></div>
      ${lines.map(l => `<div class="row" style="padding:10px 14px;border-top:1px solid var(--rule);gap:10px"><div class="col grow" style="gap:2px"><span style="font-weight:600">${esc(l.name)}</span><span class="small muted">${gbp(l.price)} each</span></div>${stepper(l.id, l.q, l.stock, 'q')}<strong class="num" style="min-width:60px;text-align:right">${gbp(l.q * l.price)}</strong></div>`).join('')}
    </section>
    <section class="section"><h2>Collection or delivery</h2>
      ${s.collect && s.deliver ? `<div class="grid2"><button class="pill" data-act="mode" data-id="collect" aria-pressed="${mode === 'collect'}">Collect</button><button class="pill" data-act="mode" data-id="deliver" aria-pressed="${mode === 'deliver'}">Deliver${fee || Number(s.delivery_fee) ? ' (+' + gbp(s.delivery_fee) + ')' : ''}</button></div>` : ''}
      ${mode === 'collect' ? `<div class="card col" style="gap:8px;padding:14px">${slots.length ? `<span style="font-size:14px;font-weight:600">Pick a collection time</span><div class="row wrap" style="gap:8px">${slots.map(t => `<button class="pill" style="border-radius:22px;font-size:14px" data-act="slot" data-id="${esc(t)}" aria-pressed="${b.slot === t}">${esc(t)}</button>`).join('')}</div>` : `<strong style="font-size:14px">Collect from the farm gate</strong><span class="small muted">${esc(firstName(s))} will arrange a time with you.</span>`}<span class="small muted">Exact location shared after you reserve.</span></div>`
        : `<div class="card row" style="padding:14px;align-items:flex-start">${ic('van',24,1.8,'#8B6B4A')}<div class="col" style="gap:2px"><strong>Local delivery</strong><span class="small muted">${esc(s.delivery_text) || 'To the address below.'}</span></div></div>`}
    </section>
    <fieldset><legend>Your details</legend>
      <label class="field">Full name<input id="co_name" data-co="name" autocomplete="name" value="${esc(f.name)}"></label>
      <div class="grid2"><label class="field">Mobile<input id="co_phone" data-co="phone" type="tel" autocomplete="tel" value="${esc(f.phone)}"></label><label class="field">Email<input id="co_email" data-co="email" type="email" autocomplete="email" value="${esc(f.email)}"></label></div>
      <label class="field">Address${mode === 'deliver' ? '' : ' (optional)'}<input id="co_address" data-co="address" autocomplete="street-address" value="${esc(f.address)}"></label>
      <label class="field">Note for ${esc(firstName(s))} (optional)<textarea id="co_note" data-co="note" rows="2">${esc(f.note)}</textarea></label>
    </fieldset>
    <section class="col" style="gap:8px">
      <div class="row between"><span>Subtotal</span><span class="num">${gbp(subtotal)}</span></div>
      <div class="row between"><span>${mode === 'deliver' ? 'Delivery' : 'Gate collection'}</span><span class="num">${fee ? gbp(fee) : 'Free'}</span></div>
      <div class="row between display" style="font-size:18px;font-weight:800;padding-top:8px;border-top:1px solid var(--line2)"><span>Total</span><span class="num">${gbp(subtotal + fee)}</span></div>
      <p class="small muted">No card needed. Pitchfork passes your reservation to ${esc(s.name)} and you pay them directly.</p>
    </section>
    ${st.reserveError ? notice(esc(st.reserveError), 'err') : ''}
    ${uid() ? '' : signInPrompt('Log in or create an account to reserve', '/basket')}
  </main>
  <div class="bottom"><button class="btn btn-honey full" data-act="reserve" ${!lines.length || !uid() || st.busy ? 'disabled' : ''}>${ic('check',18,2.4)}${st.busy ? 'Reserving…' : 'Reserve · ' + gbp(subtotal + fee)}</button></div>`;
  return { html };
}
async function reserve(){
  const b = st.basket, f = st.checkout || {};
  const r = await fetchSeller(b.sellerId); const s = r.data; if (!s) return;
  const mode = (b.mode === 'deliver' && s.deliver) || !s.collect ? 'deliver' : 'collect';
  const lines = forSale(s).filter(i => (b.qty[i.id] || 0) > 0).map(i => ({ item_id: i.id, qty: b.qty[i.id] }));
  if (!f.name || !(f.phone || f.email)) { st.reserveError = 'Add your name and a mobile number or email so the seller can reach you.'; return refresh(); }
  if (mode === 'deliver' && !f.address) { st.reserveError = 'Add your address for delivery.'; return refresh(); }
  if (mode === 'collect' && slotsOf(s).length && !b.slot) { st.reserveError = 'Pick a collection time.'; return refresh(); }
  st.busy = true; st.reserveError = ''; refresh();
  const { data: order, error } = await sb.rpc('place_order', { p_seller_id: s.id, p_lines: lines, p_fulfilment: mode, p_slot: mode === 'collect' ? (b.slot || '') : '',
    p_name: f.name, p_phone: f.phone || '', p_email: f.email || '', p_address: f.address || '', p_note: f.note || '' });
  st.busy = false;
  if (error) { st.reserveError = errMsg(error); invalidate('seller:' + s.id, 'public'); return refresh(); }
  st.basket = { sellerId: null, qty: {}, mode: 'collect', slot: '' }; saveBasket(); st.checkout = null;
  invalidate('seller:' + s.id, 'public', 'myorders', 'order:');
  st.justPlaced = order.id;
  go('#/order/' + order.id);
}

/* ---------- Order page (buyer) ---------- */
async function orderView(id){
  if (!uid()) return { html: `${topbar('#/account', 'Order')}<main class="main">${signInPrompt('Log in to see this order', '/order/' + id)}</main>${tabbar('account')}` };
  const r = await data('order:' + id, async () => {
    const { data: o, error } = await sb.from('orders').select('*, order_lines(*), sellers(name, person, place)').eq('id', id).maybeSingle();
    let pay = null;
    if (o) { const p = await sb.rpc('payment_details', { p_order_id: id }); pay = (p.data && p.data[0]) || null; }
    return { data: o && { ...o, pay }, error };
  });
  const o = r.data;
  if (!o) return { html: `${topbar('#/account', 'Order')}<main class="main">${notice('Order not found.', 'warn')}</main>${tabbar('account')}` };
  const s = o.sellers || { name: 'the seller', person: '' }, who = firstName(s), fresh = st.justPlaced === o.id;
  const html = `
  ${fresh ? `<header class="hero" style="gap:14px;padding-bottom:22px"><div style="width:72px;height:72px;border-radius:36px;background:var(--honey);color:var(--ink);display:flex;align-items:center;justify-content:center">${ic('check',40,2.4)}</div>
    <h1 style="font-size:30px;font-weight:800;line-height:1.1">Reserved with ${esc(s.name)}</h1><p style="font-size:16px;line-height:1.5">${esc(who)} has your details and will be in touch to arrange payment and ${o.fulfilment === 'deliver' ? 'delivery' : 'collection' + (o.slot ? ', ' + esc(o.slot) : '')}.</p></header>` : topbar('#/account', 'Order ' + esc(o.ref))}
  <main class="main">
    <section class="card col" style="padding:14px;gap:8px">
      <div class="row between"><strong>${esc(o.ref)}</strong><span class="status ${o.status}">${{ new: 'Reserved', collected: 'Collected', cancelled: 'Cancelled' }[o.status]}</span></div>
      <span class="small muted">${esc(s.name)} · ${fmtDate(o.created_at)} · ${o.fulfilment === 'deliver' ? 'Delivery' : 'Collection' + (o.slot ? ' ' + esc(o.slot) : '')}</span>
      <div class="divider"></div>
      ${(o.order_lines || []).map(l => `<div class="row between"><span>${l.qty} × ${esc(l.name)}</span><span class="num">${gbp(l.qty * l.price)}</span></div>`).join('')}
      ${Number(o.delivery_fee) ? `<div class="row between"><span>Delivery</span><span class="num">${gbp(o.delivery_fee)}</span></div>` : ''}
      <div class="row between" style="font-weight:700;padding-top:6px;border-top:1px solid var(--rule)"><span>To pay ${esc(who)}</span><span class="num">${gbp(o.total)}</span></div>
    </section>
    ${o.pay && o.status === 'new' ? `<section class="card col" style="padding:16px;gap:10px"><div class="row" style="gap:10px">${ic('bank',24,1.8,'#8B6B4A')}<h2 style="font-size:18px">Paying by bank transfer?</h2></div>
      <div class="num" style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:15px"><span class="muted">Account name</span><strong>${esc(o.pay.bank_name)}</strong><span class="muted">Sort code</span><strong>${esc(o.pay.sort_code)}</strong><span class="muted">Account no.</span><strong>${esc(o.pay.account_no)}</strong><span class="muted">Reference</span><strong>${esc(o.ref)}</strong><span class="muted">Amount</span><strong>${gbp(o.total)}</strong></div>
      <p class="small muted">Use these if ${esc(who)} asks you to pay by transfer.</p></section>` : ''}
    <a href="#/" class="btn btn-line full">Back to the map</a>
  </main>${tabbar('account')}`;
  return { html };
}

/* ---------- Auth ---------- */
function authShell(title, body){ return `${topbar('#/', title)}<main class="main">${body}</main>`; }
function loginView(q){
  return { html: authShell('Log in', `<form class="col" style="gap:14px" data-form="login">
    ${st.authMsg ? notice(esc(st.authMsg.text), st.authMsg.kind) : ''}
    <label class="field">Email<input id="lg_email" name="email" type="email" autocomplete="email" required></label>
    <label class="field">Password<input id="lg_pw" name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn btn-brand full" type="submit">Log in</button>
    <div class="row between wrap"><a href="#/forgot">Forgotten your password?</a><a href="#/signup${q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''}">Create an account</a></div></form>`) };
}
function signupView(q){
  return { html: authShell('Create an account', `<form class="col" style="gap:14px" data-form="signup">
    ${st.authMsg ? notice(esc(st.authMsg.text), st.authMsg.kind) : ''}
    <label class="field">Your name<input id="su_name" name="name" autocomplete="name" required></label>
    <label class="field">Email<input id="su_email" name="email" type="email" autocomplete="email" required></label>
    <label class="field">Password (at least 8 characters)<input id="su_pw" name="password" type="password" autocomplete="new-password" minlength="8" required></label>
    <label class="check"><input id="su_sell" name="sell" type="checkbox" ${q.get('sell') ? 'checked' : ''}><span>I want to sell my surplus on Pitchfork</span></label>
    <label class="check"><input id="su_terms" name="terms" type="checkbox" required><span>I agree to the <a href="#/about" target="_blank">terms and privacy notice</a></span></label>
    <button class="btn btn-brand full" type="submit">Create account</button>
    <p class="small muted">Already have an account? <a href="#/login${q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''}">Log in</a></p></form>`) };
}
function forgotView(){
  return { html: authShell('Reset password', `<form class="col" style="gap:14px" data-form="forgot">
    ${st.authMsg ? notice(esc(st.authMsg.text), st.authMsg.kind) : ''}
    <p class="muted">Enter your email and we'll send you a link to choose a new password.</p>
    <label class="field">Email<input id="fg_email" name="email" type="email" autocomplete="email" required></label>
    <button class="btn btn-brand full" type="submit">Send reset link</button></form>`) };
}
function resetView(){
  return { html: authShell('Choose a new password', uid() ? `<form class="col" style="gap:14px" data-form="reset">
    ${st.authMsg ? notice(esc(st.authMsg.text), st.authMsg.kind) : ''}
    <label class="field">New password (at least 8 characters)<input id="rs_pw" name="password" type="password" autocomplete="new-password" minlength="8" required></label>
    <button class="btn btn-brand full" type="submit">Save new password</button></form>` : notice('Open the reset link from your email to choose a new password.', 'warn')) };
}
async function submitForm(kind, fd){
  st.authMsg = null;
  const nextHash = () => '#' + (new URLSearchParams(location.hash.split('?')[1] || '').get('next') || '/account');
  if (kind === 'login') {
    const { error } = await sb.auth.signInWithPassword({ email: fd.get('email').trim(), password: fd.get('password') });
    if (error) { st.authMsg = { text: error.message === 'Invalid login credentials' ? 'That email and password don’t match an account.' : errMsg(error), kind: 'err' }; return refresh(); }
    await afterSignIn(); go(nextHash());
  } else if (kind === 'signup') {
    if (!fd.get('terms')) { st.authMsg = { text: 'Please agree to the terms to continue.', kind: 'err' }; return refresh(); }
    const wantsToSell = !!fd.get('sell');
    const { data: res, error } = await sb.auth.signUp({ email: fd.get('email').trim(), password: fd.get('password'),
      options: { data: { full_name: fd.get('name').trim(), wants_to_sell: wantsToSell }, emailRedirectTo: siteUrl() + (wantsToSell ? '#/sell' : '#/account') } });
    if (error) { st.authMsg = { text: errMsg(error), kind: 'err' }; return refresh(); }
    if (!res.session) { st.authMsg = { text: 'Nearly there: check your email and tap the link to confirm your account.', kind: '' }; return go('#/login'); }
    await afterSignIn(); go(wantsToSell ? '#/sell' : nextHash());
  } else if (kind === 'forgot') {
    const { error } = await sb.auth.resetPasswordForEmail(fd.get('email').trim(), { redirectTo: siteUrl() + '#/reset' });
    st.authMsg = error ? { text: errMsg(error), kind: 'err' } : { text: 'If that email has an account, a reset link is on its way.', kind: '' };
    refresh();
  } else if (kind === 'reset') {
    const { error } = await sb.auth.updateUser({ password: fd.get('password') });
    if (error) { st.authMsg = { text: errMsg(error), kind: 'err' }; return refresh(); }
    toast('Password changed'); go('#/account');
  } else if (kind === 'profile') {
    const upd = { full_name: fd.get('full_name').trim(), phone: fd.get('phone').trim(), address: fd.get('address').trim(), town: fd.get('town').trim(), postcode: fd.get('postcode').trim() };
    const { error } = await sb.from('profiles').update(upd).eq('id', uid());
    if (error) { toast(errMsg(error)); return; }
    st.profile = { ...st.profile, ...upd }; toast('Details saved');
  }
}
async function afterSignIn(){
  const { data: d } = await sb.auth.getSession(); st.session = d.session; await loadProfile(); invalidate('');
}

/* ---------- Account ---------- */
async function accountView(){
  if (!uid()) return { html: `${topbar('', 'Account')}<main class="main">${signInPrompt('Log in to see your reservations and details', '/account')}<p class="small muted"><a href="#/about">About Pitchfork, terms and privacy</a></p></main>${tabbar('account')}` };
  const p = st.profile || {};
  const r = await data('myorders', async () => { const { data: rows, error } = await sb.from('orders').select('*, order_lines(*), sellers(name)').eq('buyer_id', uid()).order('created_at', { ascending: false }); return { data: rows || [], error }; });
  const html = `${topbar('', 'Account', `<button class="textbtn" data-act="signout">Log out</button>`)}
  <main class="main">
    <section class="section"><h2>My reservations</h2>
      ${(r.data || []).length ? r.data.map(o => `<a href="#/order/${o.id}" class="card list-link"><span class="col grow" style="gap:2px"><strong>${esc((o.sellers && o.sellers.name) || 'Seller')}</strong><span class="small muted">${esc(o.ref)} · ${fmtDate(o.created_at)} · ${gbp(o.total)}</span></span><span class="status ${o.status}">${{ new: 'Reserved', collected: 'Collected', cancelled: 'Cancelled' }[o.status]}</span></a>`).join('')
        : `<div class="card" style="padding:16px"><span class="small muted">No reservations yet.</span></div>`}
    </section>
    <form class="col" style="gap:12px" data-form="profile"><h2>My details</h2>
      <p class="small muted">Used to fill in your details when you reserve. Signed in as ${esc(st.session.user.email)}.</p>
      <label class="field">Full name<input id="pr_name" name="full_name" autocomplete="name" value="${esc(p.full_name)}"></label>
      <label class="field">Mobile<input id="pr_phone" name="phone" type="tel" autocomplete="tel" value="${esc(p.phone)}"></label>
      <label class="field">Address<input id="pr_addr" name="address" autocomplete="address-line1" value="${esc(p.address)}"></label>
      <div class="grid2"><label class="field">Village or town<input id="pr_town" name="town" autocomplete="address-level2" value="${esc(p.town)}"></label><label class="field">Postcode<input id="pr_pc" name="postcode" autocomplete="postal-code" value="${esc(p.postcode)}"></label></div>
      <button class="btn btn-brand" type="submit">Save my details</button>
    </form>
    <p class="small muted"><a href="#/about">About Pitchfork, terms and privacy</a></p>
  </main>${tabbar('account')}`;
  return { html };
}

/* ---------- Sell: the seller's own pages ---------- */
async function sellView(parts){
  if (!uid()) return { html: `${topbar('', 'Sell on Pitchfork')}<main class="main">
    <section class="col" style="gap:8px"><h2>Got more than your freezer can hold?</h2><p class="muted" style="line-height:1.5">Sell your surplus meat, veg and fruit to neighbours within ${CFG.radiusMiles} miles of ${esc(CFG.centre.name)}. Buyers reserve online, then pay you and collect from your gate.</p></section>
    <div class="card col" style="padding:18px;gap:10px"><strong>Create a free seller account</strong><div class="row wrap" style="gap:10px"><a class="btn btn-brand" href="#/signup?sell=1&next=${encodeURIComponent('/sell')}">Sign up to sell</a><a class="btn btn-line" href="#/login?next=${encodeURIComponent('/sell')}">Log in</a></div></div>
  </main>${tabbar('sell')}` };
  if (parts[1]) return editorView(parts[1], false);
  const r = await data('mysellers', async () => { const { data: rows, error } = await sb.from('sellers').select('*').eq('owner_id', uid()).order('created_at'); return { data: rows || [], error }; });
  const mine = r.data || [];
  if (mine.length === 1 && !st.createMore) { return editorView(mine[0].id, false); }
  const html = `${topbar('', mine.length ? 'My seller pages' : 'Start selling')}
  <main class="main">
    ${r.error ? notice('Couldn’t load your pages. Please refresh.', 'err') : ''}
    ${mine.map(s => `<a href="#/sell/${s.id}" class="card list-link">${sellerThumb(s, 52)}<span class="col grow" style="gap:2px"><strong>${esc(s.name) || 'Unnamed page'}</strong><span class="small muted">${esc(s.place) || ''}</span></span><span class="status ${s.status}">${s.status}</span></a>`).join('')}
    <form class="card col" style="padding:16px;gap:12px" data-form="newseller">
      <h2 style="font-size:18px">${mine.length ? 'Add another seller page' : 'Create your seller page'}</h2>
      <label class="field">Farm or smallholding name<input id="ns_name" name="name" required placeholder="e.g. Hilltop Dexters"></label>
      <label class="check"><input id="ns_food" name="food" type="checkbox" required><span>I’m registered as a food business with my local council, or I only sell produce that doesn’t need registration</span></label>
      ${st.formErr ? notice(esc(st.formErr), 'err') : ''}
      <button class="btn btn-brand" type="submit">Create page</button>
      <p class="small muted">New pages are checked by the Pitchfork team before they appear on the map. You can set everything up straight away.</p>
    </form>
  </main>${tabbar('sell')}`;
  return { html };
}

/* ---------- The seller page editor (sellers and admin) ---------- */
async function loadEditor(id, admin){
  const [s, p, it, cs, od] = await Promise.all([
    sb.from('sellers').select('*').eq('id', id).maybeSingle(),
    sb.from('seller_private').select('*').eq('seller_id', id).maybeSingle(),
    sb.from('items').select('*').eq('seller_id', id).order('sort').order('created_at'),
    sb.from('coming_soon').select('*').eq('seller_id', id).order('sort'),
    sb.from('orders').select('*, order_lines(*)').eq('seller_id', id).order('created_at', { ascending: false })
  ]);
  const err = s.error || p.error || it.error || cs.error || od.error;
  if (err || !s.data) return { error: err || { message: 'Page not found' } };
  let owner = null;
  if (admin) { const o = await sb.from('profiles').select('id, email, full_name').eq('id', s.data.owner_id).maybeSingle(); owner = o.data; }
  st.ed = { id, admin, seller: s.data, priv: p.data || { seller_id: id }, items: it.data || [], soon: cs.data || [], orders: od.data || [], owner, itemOpen: {} };
  return {};
}
async function editorView(id, admin){
  if (!st.ed || st.ed.id !== id || st.ed.admin !== admin) {
    const r = await loadEditor(id, admin);
    if (r.error) return { html: `${topbar(admin ? '#/admin' : '#/sell', 'Seller page')}<main class="main">${notice(errMsg(r.error), 'err')}</main>${tabbar(admin ? 'admin' : 'sell')}` };
  }
  const E = st.ed, s = E.seller, pv = E.priv, d = miles(s), cover = photoUrl(s.cover_path);
  const back = admin ? '#/admin' : (st.cache.mysellers && (st.cache.mysellers.data || []).length > 1 ? '#/sell?list=1' : '#/');
  const newOrders = E.orders.filter(o => o.status === 'new').length;
  const statusText = { pending: 'Waiting for approval. Set up your page now; it goes on the map once Pitchfork approves it and you switch it live.', suspended: 'This page has been suspended by Pitchfork and isn’t shown to buyers.' }[s.status];
  const html = `
  <header class="hero" style="gap:12px">
    <div class="row" style="gap:10px"><a href="${back}" class="round" style="background:var(--brand-dk);color:#fff" aria-label="Back">${ic('back',22,2.2)}</a>
      <div class="col grow"><span style="font-size:12px;font-weight:700;letter-spacing:.04em">${admin ? 'Pitchfork · Admin' : 'Pitchfork · Sell'}</span><h1 id="ed_title" style="font-weight:800;font-size:22px">${esc(s.name) || 'New seller page'}</h1></div>
      <span class="status ${s.status}">${s.status}</span></div>
    <div class="row" style="padding:12px 14px;border-radius:14px;background:var(--brand-dk)">
      <div class="col grow" style="gap:2px"><strong>${s.live ? 'Switched live' : 'Hidden'}</strong><span class="small">${s.status !== 'approved' ? 'Shows on the map once approved' : s.live ? 'Buyers can see this page' : 'Buyers can’t see this page'}</span></div>
      <button class="switch" role="switch" aria-checked="${s.live}" aria-label="Page visible to buyers" data-act="ed-live" style="${s.live ? 'background:var(--honey)' : ''}"></button></div>
  </header>
  <main class="main" style="gap:24px">
    ${statusText ? notice(statusText, 'warn') : ''}
    ${admin ? `<section class="card col" style="padding:14px;gap:10px"><h2 style="font-size:17px">Admin</h2>
      <div class="row wrap" style="gap:8px">${s.status !== 'approved' ? `<button class="btn btn-sm btn-brand" data-act="ad-status" data-id="approved">Approve</button>` : ''}${s.status !== 'suspended' ? `<button class="btn btn-sm btn-line" data-act="ad-status" data-id="suspended">Suspend</button>` : ''}${s.status === 'suspended' ? `<button class="btn btn-sm btn-line" data-act="ad-status" data-id="pending">Move back to pending</button>` : ''}</div>
      <span class="small muted">Owner: ${E.owner ? esc(E.owner.full_name || '') + ' &lt;' + esc(E.owner.email) + '&gt;' : 'unknown'} · Food registration confirmed: ${s.food_reg_confirmed ? 'yes' : 'no'}</span>
      <div class="row" style="gap:8px;align-items:flex-end"><label class="field grow">Hand this page to (their account email)<input id="ad_owner" type="email" placeholder="seller@example.com"></label><button class="btn btn-sm btn-line" data-act="ad-owner" style="min-height:48px">Transfer</button></div>
    </section>` : ''}

    <section class="section"><div class="row between" style="align-items:baseline"><h2>Orders</h2><span class="small muted">${newOrders} to sort out</span></div>
      ${E.orders.length ? E.orders.map(o => `<div class="card col" style="padding:14px;gap:8px">
        <div class="row" style="align-items:flex-start;gap:10px"><div class="col grow" style="gap:2px"><strong>${esc(o.buyer_name)}</strong>
          <span class="small muted num">${[o.buyer_phone ? `<a href="tel:${esc(o.buyer_phone)}">${esc(o.buyer_phone)}</a>` : '', o.buyer_email ? `<a href="mailto:${esc(o.buyer_email)}">${esc(o.buyer_email)}</a>` : ''].filter(Boolean).join(' · ')}</span>
          <span class="small muted">${esc(o.ref)} · ${fmtDate(o.created_at)} · ${o.fulfilment === 'deliver' ? 'Delivery' : 'Collect' + (o.slot ? ' ' + esc(o.slot) : '')}</span>
          ${o.buyer_address ? `<span class="small muted">${esc(o.buyer_address)}</span>` : ''}${o.note ? `<span class="small">“${esc(o.note)}”</span>` : ''}</div>
          <span class="status ${o.status}">${o.status}</span></div>
        <span style="font-size:14px">${(o.order_lines || []).map(l => l.qty + ' × ' + esc(l.name)).join(', ')}</span>
        <div class="row between wrap" style="gap:8px"><strong>${gbp(o.total)}</strong>${o.status === 'new' ? `<div class="row" style="gap:8px"><button class="btn btn-sm btn-line" data-act="ord-cancel" data-id="${o.id}">Cancel</button><button class="btn btn-sm btn-brand" data-act="ord-done" data-id="${o.id}">Mark collected</button></div>` : ''}</div>
      </div>`).join('') : `<div class="card" style="padding:16px"><span class="small muted">No orders yet. Reservations appear here; cancelling one puts the stock back.</span></div>`}
    </section>

    <section class="section"><h2>Your page</h2>
      <div style="height:150px;border-radius:16px;overflow:hidden;background:#CFE0D6">${cover ? `<img src="${esc(cover)}" alt="Cover photo" style="width:100%;height:100%;object-fit:cover;display:block">` : `<div class="col" style="height:100%;align-items:center;justify-content:center;gap:6px;color:#3B5E38">${ic('camera',32,1.6)}<span style="font-weight:600">No cover photo yet</span></div>`}</div>
      <div class="row wrap" style="gap:10px"><label class="upbtn"><input class="vh" type="file" accept="image/*" data-upload="cover">${ic('camera',18,2)}${cover ? 'Change cover photo' : 'Add cover photo'}</label>${cover ? `<button class="textbtn" data-act="cover-remove">Remove</button>` : ''}</div>
      <label class="field">Farm or smallholding name<input id="ed_name" data-sf="name" value="${esc(s.name)}" placeholder="e.g. Hilltop Dexters"></label>
      <label class="field">Your name (shown on the page)<input id="ed_person" data-sf="person" value="${esc(s.person)}" placeholder="e.g. Ruth Mallory"></label>
      <label class="field">About you and your animals<textarea id="ed_about" data-sf="about" rows="5" placeholder="What you keep, how it's raised, why you have extra to sell">${esc(s.about)}</textarea></label>
    </section>

    <section class="section"><h2>Location</h2>
      <label class="field">Village or hamlet<input id="ed_place" data-sf="place" value="${esc(s.place)}" placeholder="e.g. Sheepscombe"></label>
      <p class="small muted">Tap the map where buyers should find you${d != null ? ` · ${d.toFixed(1)} miles from ${esc(CFG.centre.name)}` : ''}. The pin is shown publicly, so you may prefer a spot near your gate rather than your house.</p>
      <div id="edmap" class="map small" role="region" aria-label="Map: tap to place your pin"></div>
    </section>

    <section class="section"><div class="row between" style="align-items:baseline"><h2>In the freezer</h2><span class="small muted">${E.items.filter(i => i.visible && i.price != null).length} showing</span></div>
      ${E.items.map(it => { const open = !!E.itemOpen[it.id], ph = photoUrl(it.photo_path);
        return `<div class="card col" style="padding:12px;gap:10px">
        <div class="row" style="align-items:flex-start">
          <label class="thumb ${ph ? 'has' : ''}" aria-label="${ph ? 'Change' : 'Add'} photo of ${esc(it.name)}"><input class="vh" type="file" accept="image/*" data-upload="item" data-id="${it.id}">${ph ? `<img src="${esc(ph)}" alt="">` : `${ic('camera',20,1.8)}<span>Add photo</span>`}</label>
          <div class="col grow" style="gap:2px"><strong>${esc(it.name) || 'New item'}</strong><span class="small muted">${esc(it.pack)}</span><strong style="font-size:14px">${gbp(it.price)}</strong></div>
          <button class="textbtn" data-act="item-open" data-id="${it.id}" aria-expanded="${open}">${open ? 'Done' : 'Edit'}</button></div>
        ${open ? `<div class="col" style="gap:10px">
          <label class="field">Name<input id="it_name_${it.id}" data-if="name" data-id="${it.id}" value="${esc(it.name)}" placeholder="e.g. Beef mince"></label>
          <div class="grid2"><label class="field">Pack size<input id="it_pack_${it.id}" data-if="pack" data-id="${it.id}" value="${esc(it.pack)}" placeholder="e.g. 500g pack"></label>
          <label class="field">Price (£)<input id="it_price_${it.id}" data-if="price" data-id="${it.id}" inputmode="decimal" value="${it.price != null ? Number(it.price).toFixed(2) : ''}" placeholder="0.00"></label></div>
          <div class="row wrap" style="gap:8px">${ph ? `<button class="textbtn" data-act="item-photo-remove" data-id="${it.id}">Remove photo</button>` : ''}<button class="textbtn" style="color:var(--danger)" data-act="item-delete" data-id="${it.id}">Delete item</button></div></div>` : ''}
        <div class="row" style="gap:10px"><span class="small muted">In stock</span>${stepper(it.id, it.stock, 9999, 'stock')}<span class="grow"></span>
          <span class="small" style="font-weight:600;color:${it.visible ? 'var(--brand)' : 'var(--muted)'}">${it.visible ? 'Showing' : 'Hidden'}</span>
          <button class="switch" role="switch" aria-checked="${it.visible}" aria-label="Show ${esc(it.name)}" data-act="item-visible" data-id="${it.id}"></button></div>
      </div>`; }).join('')}
      <button class="dashed" data-act="item-add">${ic('plus',18,2.2)}Add something to the freezer</button>
    </section>

    <section class="section"><h2>Coming soon</h2>
      ${E.soon.map(x => `<div class="card col" style="padding:12px;gap:10px">
        <div class="row" style="gap:10px;align-items:flex-end"><label class="field grow">What<input id="cs_name_${x.id}" data-cs="name" data-id="${x.id}" value="${esc(x.name)}" placeholder="e.g. Beef boxes, next batch"></label>
        <button class="round" style="color:var(--danger)" data-act="soon-delete" data-id="${x.id}" aria-label="Remove ${esc(x.name) || 'this item'}">${ic('trash',20,1.8)}</button></div>
        <label class="field">When<input id="cs_when_${x.id}" data-cs="when_text" data-id="${x.id}" value="${esc(x.when_text)}" placeholder="e.g. Late November"></label></div>`).join('')}
      <button class="dashed" data-act="soon-add">${ic('plus',18,2.2)}Add a coming-soon item</button>
      <p class="small muted">Buyers can tap “Notify me” on these.</p>
    </section>

    <section class="section"><h2>What you sell</h2>
      <div class="cats">${CATS.slice(1).map(([id, l]) => `<button data-act="ed-cat" data-id="${id}" aria-pressed="${(s.cats || []).includes(id)}">${nat(id, 34)}<span>${l}</span></button>`).join('')}</div>
      <p class="small muted">The first one you pick is your icon on the map${(s.cats || []).length ? ` (now: ${catLabel(s.cats[0])})` : ''}.</p>
    </section>

    <section class="section"><h2>Collection &amp; delivery</h2><div class="card col">
      <div class="row" style="padding:10px 14px"><strong class="grow">Collection from your gate</strong><button class="switch" role="switch" aria-checked="${s.collect}" aria-label="Collection" data-act="ed-collect"></button></div>
      ${s.collect ? `<div style="padding:0 14px 12px"><label class="field">Collection times, one per line<textarea id="ed_times" data-sf="collect_times" rows="3" placeholder="Sat 10:00–12:00&#10;Sun 14:00–16:00">${esc(s.collect_times)}</textarea></label></div>` : ''}
      <div class="divider"></div>
      <div class="row" style="padding:10px 14px"><strong class="grow">Local delivery</strong><button class="switch" role="switch" aria-checked="${s.deliver}" aria-label="Delivery" data-act="ed-deliver"></button></div>
      ${s.deliver ? `<div class="col" style="padding:0 14px 12px;gap:10px"><label class="field">Delivery details<input id="ed_dtext" data-sf="delivery_text" value="${esc(s.delivery_text)}" placeholder="e.g. Fridays, within 3 miles"></label>
        <label class="field">Delivery charge (£)<input id="ed_dfee" data-sf="delivery_fee" inputmode="decimal" value="${Number(s.delivery_fee) ? Number(s.delivery_fee).toFixed(2) : ''}" placeholder="0.00 for free"></label></div>` : ''}
    </div></section>

    <fieldset><legend>Contact details</legend>
      <p class="small muted" style="margin-top:-6px">Private: only you and the Pitchfork team see these.</p>
      <div class="grid2"><label class="field">Mobile<input id="pv_phone" data-pv="phone" type="tel" value="${esc(pv.phone)}"></label><label class="field">Email<input id="pv_email" data-pv="email" type="email" value="${esc(pv.email)}"></label></div>
      <label class="field">Address<input id="pv_addr" data-pv="address" value="${esc(pv.address)}"></label>
      <label class="field">Postcode<input id="pv_pc" data-pv="postcode" value="${esc(pv.postcode)}"></label>
    </fieldset>

    <fieldset class="card" style="padding:16px"><legend style="float:left;margin-bottom:0">Bank details for buyers (optional)</legend>
      <label class="field">Account holder name<input id="pv_bn" data-pv="bank_name" value="${esc(pv.bank_name)}" placeholder="Name on the account"></label>
      <div class="grid2"><label class="field">Sort code<input id="pv_sc" data-pv="sort_code" inputmode="numeric" value="${esc(pv.sort_code)}" placeholder="00-00-00"></label><label class="field">Account number<input id="pv_an" data-pv="account_no" inputmode="numeric" value="${esc(pv.account_no)}" placeholder="8 digits"></label></div>
      <p class="row small muted" style="gap:8px;align-items:flex-start">${ic('lock',18,2,'#8B6B4A')}Only shown to a buyer on their own reservation, if you'd like them to pay by transfer.</p>
    </fieldset>

    <section class="section"><button class="textbtn" style="align-self:flex-start;color:var(--danger)" data-act="seller-delete">${ic('trash',18,1.8)} Delete this seller page</button></section>
  </main>
  <div class="bottom"><a class="btn btn-line" style="flex:1" href="#/seller/${s.id}" data-act="ed-preview">${ic('eye',18,2)}Preview</a><button class="btn btn-brand" style="flex:1" data-act="ed-save" id="savebtn">${saveLabel()}</button></div>`;
  return { html, after(){
    const m = makeMap(document.getElementById('edmap'), { onClick(e){ s.lat = +e.latlng.lat.toFixed(6); s.lng = +e.latlng.lng.toFixed(6); queueSave('seller', saveSeller, 0); refresh(); } });
    if (s.lat != null) L.marker([s.lat, s.lng], { icon: pinIcon(mainCat(s), true), interactive: false }).addTo(m);
  } };
}

/* ---------- saving the editor ---------- */
const saver = { timers: {}, fns: {}, running: 0, state: 'saved' };
function saveLabel(){ return ic(saver.state === 'saved' ? 'check' : 'download', 18, 2.2) + ({ saved: 'Saved', pending: 'Save changes', saving: 'Saving…', error: 'Retry saving' }[saver.state]); }
function setSave(state){ saver.state = state; const b = document.getElementById('savebtn'); if (b) b.innerHTML = saveLabel(); }
function queueSave(key, fn, delay=800){ clearTimeout(saver.timers[key]); saver.fns[key] = fn; setSave('pending'); saver.timers[key] = setTimeout(() => runSave(key), delay); }
async function runSave(key){
  const fn = saver.fns[key]; delete saver.timers[key]; delete saver.fns[key]; if (!fn) return;
  saver.running++; setSave('saving');
  let error = null; try { const r = await fn(); error = r && r.error; } catch (e) { error = e; }
  saver.running--;
  if (error) { setSave('error'); toast(errMsg(error)); return; }
  if (!saver.running && !Object.keys(saver.timers).length) setSave('saved');
}
function flushSaves(){ for (const k of Object.keys(saver.timers)) { clearTimeout(saver.timers[k]); runSave(k); } }
const SELLER_FIELDS = ['name', 'person', 'place', 'lat', 'lng', 'cats', 'about', 'cover_path', 'collect', 'collect_times', 'deliver', 'delivery_text', 'delivery_fee', 'live'];
function saveSeller(){ const s = st.ed.seller, upd = {}; SELLER_FIELDS.forEach(k => upd[k] = s[k]); invalidate('public', 'seller:' + s.id, 'mysellers', 'admin'); return sb.from('sellers').update(upd).eq('id', s.id); }
function savePriv(){ const p = st.ed.priv; return sb.from('seller_private').update({ phone: p.phone || '', email: p.email || '', address: p.address || '', postcode: p.postcode || '', bank_name: p.bank_name || '', sort_code: p.sort_code || '', account_no: p.account_no || '' }).eq('seller_id', st.ed.id); }
function saveItem(id){ return () => { const it = st.ed.items.find(i => i.id === id); if (!it) return {}; invalidate('public', 'seller:' + st.ed.id);
  return sb.from('items').update({ name: it.name, pack: it.pack, price: it.price, stock: it.stock, visible: it.visible, photo_path: it.photo_path }).eq('id', id); }; }
function saveSoon(id){ return () => { const x = st.ed.soon.find(i => i.id === id); if (!x) return {}; invalidate('public', 'seller:' + st.ed.id); return sb.from('coming_soon').update({ name: x.name, when_text: x.when_text }).eq('id', id); }; }

function resizePhoto(file, max){
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image();
      img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => resolve(b), 'image/jpeg', 0.82); };
      img.onerror = () => resolve(null); img.src = r.result; };
    r.onerror = () => resolve(null); r.readAsDataURL(file);
  });
}
async function uploadPhoto(file, kind, itemId){
  const E = st.ed; if (!E) return;
  toast('Uploading photo…');
  const blob = await resizePhoto(file, kind === 'cover' ? 1600 : 1000);
  if (!blob) { toast('That file couldn’t be read as a photo.'); return; }
  const path = `${E.id}/${kind}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) { toast(errMsg(error)); return; }
  if (kind === 'cover') { const old = E.seller.cover_path; E.seller.cover_path = path; await runNow('seller', saveSeller); if (old) sb.storage.from('photos').remove([old]); }
  else { const it = E.items.find(i => i.id === itemId); if (!it) return; const old = it.photo_path; it.photo_path = path; await runNow('item:' + it.id, saveItem(it.id)); if (old) sb.storage.from('photos').remove([old]); }
  toast('Photo saved'); refresh();
}
async function runNow(key, fn){ clearTimeout(saver.timers[key]); saver.fns[key] = fn; await runSave(key); }

/* ---------- Admin ---------- */
async function adminView(parts){
  if (!uid()) return { html: `${topbar('', 'Admin')}<main class="main">${signInPrompt('Log in as an admin', '/admin')}</main>${tabbar('admin')}` };
  if (!isAdmin()) {
    await loadProfile();
    if (!isAdmin()) return { html: `${topbar('#/', 'Admin')}<main class="main">${notice('This area is for the Pitchfork team.', 'warn')}
      <div class="card col small" style="padding:14px;gap:4px"><strong>What the site can see</strong>
        <span>Signed in as: ${esc(st.session.user.email)}</span>
        <span>Account id: <span class="num">${esc(uid())}</span></span>
        <span>Profile found: ${st.profile ? 'yes' : 'no'}${st.profile ? ' · role: ' + esc(st.profile.role) + ' · email on profile: ' + esc(st.profile.email) : ''}</span>
        ${st.profileError ? `<span style="color:var(--danger)">Error reading profile: ${esc(st.profileError)}</span>` : ''}</div></main>${tabbar('home')}` };
  }
  const tab = parts[1] || 'sellers';
  if (tab === 'seller' && parts[2]) return editorView(parts[2], true);
  const tabs = `<nav class="tabs" aria-label="Admin sections">${[['sellers', 'Sellers'], ['orders', 'Orders'], ['people', 'People']].map(t => `<a href="#/admin/${t[0]}" ${tab === t[0] ? 'aria-current="page"' : ''}>${t[1]}</a>`).join('')}</nav>`;
  let body = '';
  if (tab === 'sellers') {
    const r = await data('admin:sellers', async () => { const { data: rows, error } = await sb.from('sellers').select('*, items(id, visible, price)').order('created_at', { ascending: false }); return { data: rows || [], error }; });
    const all = r.data || [], filter = st.adminFilter || 'all';
    const shown = filter === 'all' ? all : all.filter(s => s.status === filter);
    const counts = { all: all.length, pending: all.filter(s => s.status === 'pending').length, approved: all.filter(s => s.status === 'approved').length, suspended: all.filter(s => s.status === 'suspended').length };
    body = `<div class="row wrap" style="gap:6px">${['all', 'pending', 'approved', 'suspended'].map(f => `<button class="pill" style="min-height:40px;font-size:14px;border-radius:20px" data-act="ad-filter" data-id="${f}" aria-pressed="${filter === f}">${f[0].toUpperCase() + f.slice(1)} (${counts[f]})</button>`).join('')}</div>
      ${r.error ? notice(errMsg(r.error), 'err') : ''}
      ${shown.map(s => `<div class="card col" style="padding:12px;gap:10px"><div class="row">${sellerThumb(s, 52)}<div class="col grow" style="gap:2px"><strong>${esc(s.name) || 'Unnamed page'}</strong><span class="small muted">${esc(s.place) || 'No village'} · ${(s.items || []).filter(i => i.visible && i.price != null).length} items · ${s.live ? 'live' : 'hidden'}</span><span class="small muted">Created ${fmtDate(s.created_at)}</span></div><span class="status ${s.status}">${s.status}</span></div>
        <div class="row wrap" style="gap:8px">${s.status !== 'approved' ? `<button class="btn btn-sm btn-brand" data-act="ad-quick" data-id="${s.id}" data-status="approved">Approve</button>` : ''}${s.status === 'approved' ? `<button class="btn btn-sm btn-line" data-act="ad-quick" data-id="${s.id}" data-status="suspended">Suspend</button>` : ''}<a class="btn btn-sm btn-line" href="#/admin/seller/${s.id}">Edit</a><a class="btn btn-sm btn-line" href="#/seller/${s.id}">View</a></div></div>`).join('') || `<div class="card" style="padding:16px"><span class="small muted">No sellers here.</span></div>`}
      <button class="dashed" data-act="ad-new">${ic('plus',18,2.2)}Create a seller page for someone</button>
      <p class="small muted">Pages you create are owned by you until you hand them to the seller’s account with “Transfer”.</p>`;
  } else if (tab === 'orders') {
    const r = await data('admin:orders', async () => { const { data: rows, error } = await sb.from('orders').select('*, order_lines(*), sellers(name)').order('created_at', { ascending: false }).limit(1000); return { data: rows || [], error }; });
    const all = r.data || [];
    body = `<div class="row between wrap" style="gap:8px"><span class="small muted">${all.length} orders · ${all.filter(o => o.status === 'new').length} open · ${gbp(all.filter(o => o.status !== 'cancelled').reduce((a, o) => a + Number(o.total), 0))} reserved in total</span><button class="btn btn-sm btn-line" data-act="ad-csv">${ic('download',16,2)}Download CSV</button></div>
      ${r.error ? notice(errMsg(r.error), 'err') : ''}
      <div class="card scroll-x"><table class="data"><thead><tr><th>Ref</th><th>Date</th><th>Seller</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${all.map(o => `<tr><td class="num">${esc(o.ref)}</td><td class="num">${fmtDate(o.created_at)}</td><td>${esc((o.sellers && o.sellers.name) || '')}</td><td>${esc(o.buyer_name)}<br><span class="muted">${esc(o.buyer_phone)} ${esc(o.buyer_email)}</span></td><td>${(o.order_lines || []).map(l => l.qty + '× ' + esc(l.name)).join('<br>')}</td><td class="num">${gbp(o.total)}</td><td><span class="status ${o.status}">${o.status}</span></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No orders yet.</td></tr>'}
      </tbody></table></div>`;
  } else if (tab === 'people') {
    const r = await data('admin:people', async () => { const { data: rows, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false }); return { data: rows || [], error }; });
    const all = r.data || [];
    body = `<span class="small muted">${all.length} accounts · ${all.filter(p => p.role === 'seller').length} sellers · ${all.filter(p => p.role === 'admin').length} admins</span>
      ${r.error ? notice(errMsg(r.error), 'err') : ''}
      <div class="card scroll-x"><table class="data"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Role</th></tr></thead><tbody>
      ${all.map(p => `<tr><td>${esc(p.full_name)}</td><td>${esc(p.email)}</td><td class="num">${esc(p.phone)}</td><td class="num">${fmtDate(p.created_at)}</td><td><select aria-label="Role for ${esc(p.email)}" data-role="${p.id}" ${p.id === uid() ? 'disabled' : ''}>${['buyer', 'seller', 'admin'].map(x => `<option ${p.role === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  return { html: `${topbar('', 'Admin')}<main class="main">${tabs}${body}</main>${tabbar('admin')}` };
}
function downloadCsv(rows){
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Ref', 'Date', 'Seller', 'Status', 'Fulfilment', 'Slot', 'Buyer', 'Phone', 'Email', 'Address', 'Items', 'Subtotal', 'Delivery', 'Total'];
  const lines = rows.map(o => [o.ref, new Date(o.created_at).toISOString(), o.sellers && o.sellers.name, o.status, o.fulfilment, o.slot, o.buyer_name, o.buyer_phone, o.buyer_email, o.buyer_address,
    (o.order_lines || []).map(l => l.qty + ' x ' + l.name).join('; '), o.subtotal, o.delivery_fee, o.total].map(q).join(','));
  const blob = new Blob([[head.map(q).join(','), ...lines].join('\r\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pitchfork-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- About / terms ---------- */
function aboutView(){
  return { html: `${topbar('#/', 'About Pitchfork')}<main class="main" style="line-height:1.55">
    <section class="section"><h2>What Pitchfork is</h2><p>Pitchfork helps smallholders and hobby farmers within ${CFG.radiusMiles} miles of ${esc(CFG.centre.name)} sell their surplus to neighbours. Buyers reserve online; sellers get in touch to arrange payment and collection or delivery.</p>
    <p>Pitchfork introduces buyers and sellers. Each sale is between the buyer and the seller. Pitchfork doesn’t take payments and isn’t a party to the sale.</p></section>
    <section class="section"><h2>Terms of use</h2><p class="muted">[Your terms of use go here: who can sell, sellers’ responsibility for food safety, labelling and registration, cancellations, and how Pitchfork can remove pages.]</p></section>
    <section class="section"><h2>Privacy notice</h2><p class="muted">[Your privacy notice goes here: who runs Pitchfork, what personal data is collected (account, contact and order details), why, who sees it (the seller you reserve from sees your name and contact details), how long it is kept, and how to ask for it to be deleted.]</p></section>
    <section class="section"><h2>Contact</h2><p class="muted">[Your contact email]</p></section>
  </main>${tabbar('home')}` };
}

/* ================= ROUTER ================= */
function parseHash(){
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(query || '') };
}
async function route(){
  const { parts, q } = parseHash();
  switch (parts[0] || ''){
    case '': return homeView();
    case 'seller': return parts[1] ? sellerView(parts[1]) : homeView();
    case 'basket': return basketView();
    case 'order': return orderView(parts[1]);
    case 'login': return loginView(q);
    case 'signup': return signupView(q);
    case 'forgot': return forgotView();
    case 'reset': return resetView();
    case 'account': return accountView();
    case 'sell': if (q.get('list')) st.createMore = true; return sellView(parts);
    case 'admin': return adminView(parts);
    case 'about': return aboutView();
    default: return homeView();
  }
}
let seq = 0;
async function render(keepScroll){
  const my = ++seq, y = window.scrollY;
  if (!keepScroll) app.innerHTML = loadingView().html;
  let view;
  try { view = await route(); } catch (e) { console.error(e); view = { html: `<main class="main">${notice('Something went wrong loading this page. Please refresh.', 'err')}</main>` }; }
  if (my !== seq) return;
  maps.forEach(m => { try { m.remove(); } catch (e) {} }); maps = [];
  app.innerHTML = view.html + (st.toast ? `<div class="toast" role="status">${esc(st.toast)}</div>` : '');
  if (view.after) view.after();
  window.scrollTo(0, keepScroll ? y : 0);
}
const refresh = () => render(true);

/* ================= EVENTS ================= */
app.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const btn = f.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; }
  try {
    if (f.dataset.form === 'newseller') return await createSeller(new FormData(f));
    await submitForm(f.dataset.form, new FormData(f));
  } finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
});
async function createSeller(fd){
  st.formErr = '';
  if (!fd.get('food')) { st.formErr = 'Please confirm the food registration statement.'; return refresh(); }
  const { data: row, error } = await sb.from('sellers').insert({ owner_id: uid(), name: fd.get('name').trim(), food_reg_confirmed: true }).select().single();
  if (error) { st.formErr = errMsg(error); return refresh(); }
  invalidate('mysellers', 'admin'); st.createMore = false; st.ed = null;
  go((isAdmin() && location.hash.startsWith('#/admin') ? '#/admin/seller/' : '#/sell/') + row.id);
}

app.addEventListener('input', (e) => {
  const t = e.target, E = st.ed;
  if (t.dataset.co) { st.checkout = st.checkout || {}; st.checkout[t.dataset.co] = t.value; st.reserveError = ''; return; }
  if (!E) return;
  if (t.dataset.sf) { const k = t.dataset.sf;
    if (k === 'delivery_fee') { const v = parseFloat(t.value.replace(/[^0-9.]/g, '')); E.seller[k] = isNaN(v) ? 0 : Math.round(v * 100) / 100; }
    else E.seller[k] = t.value;
    if (k === 'name') { const h = document.getElementById('ed_title'); if (h) h.textContent = t.value || 'New seller page'; }
    queueSave('seller', saveSeller); }
  if (t.dataset.pv) { E.priv[t.dataset.pv] = t.value; queueSave('priv', savePriv); }
  if (t.dataset.if) { const it = E.items.find(i => i.id === t.dataset.id); if (!it) return;
    if (t.dataset.if === 'price') { const v = parseFloat(t.value.replace(/[^0-9.]/g, '')); it.price = isNaN(v) ? null : Math.round(v * 100) / 100; } else it[t.dataset.if] = t.value;
    queueSave('item:' + it.id, saveItem(it.id)); }
  if (t.dataset.cs) { const x = E.soon.find(i => i.id === t.dataset.id); if (!x) return; x[t.dataset.cs] = t.value; queueSave('soon:' + x.id, saveSoon(x.id)); }
});

app.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.upload && t.files && t.files[0]) { await uploadPhoto(t.files[0], t.dataset.upload, t.dataset.id); t.value = ''; }
  if (t.dataset.role) {
    const { error } = await sb.from('profiles').update({ role: t.value }).eq('id', t.dataset.role);
    if (error) toast(errMsg(error)); else { toast('Role updated'); invalidate('admin:people'); }
  }
});

app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id, E = st.ed;
  switch (act){
    case 'cat': st.cat = id; return refresh();
    case 'zoom': st.zoom = id; return refresh();
    case 'unzoom': st.zoom = null; return refresh();
    case 'q-inc': case 'q-dec': {
      const sid = (parseHash().parts[0] === 'seller') ? parseHash().parts[1] : st.basket.sellerId;
      const r = await fetchSeller(sid); const s = r.data; if (!s) return;
      if (st.basket.sellerId !== s.id) {
        if (basketCount() && !confirm('Your basket has items from another seller. Start a new basket with ' + s.name + '?')) return;
        st.basket = { sellerId: s.id, qty: {}, mode: s.collect ? 'collect' : 'deliver', slot: '' };
      }
      const it = (s.items || []).find(i => i.id === id); if (!it) return;
      st.basket.qty[id] = Math.max(0, Math.min(it.stock, (st.basket.qty[id] || 0) + (act === 'q-inc' ? 1 : -1)));
      if (!st.basket.qty[id]) delete st.basket.qty[id];
      saveBasket(); return refresh(); }
    case 'basket-clear': st.basket = { sellerId: null, qty: {}, mode: 'collect', slot: '' }; saveBasket(); return refresh();
    case 'mode': st.basket.mode = id; saveBasket(); return refresh();
    case 'slot': st.basket.slot = id; saveBasket(); st.reserveError = ''; return refresh();
    case 'reserve': return reserve();
    case 'notify': {
      if (!uid()) return go('#/login?next=' + encodeURIComponent(location.hash.slice(1)));
      const on = b.getAttribute('aria-pressed') === 'true';
      const r = on ? await sb.from('notify_requests').delete().eq('user_id', uid()).eq('coming_soon_id', id) : await sb.from('notify_requests').insert({ user_id: uid(), coming_soon_id: id });
      if (r.error) { toast(errMsg(r.error)); return; }
      invalidate('notify:'); toast(on ? 'Removed from the list' : 'We’ll let the seller know you’re interested'); return refresh(); }
    case 'signout': await sb.auth.signOut(); st.session = null; st.profile = null; st.ed = null; invalidate(''); return go('#/');
    case 'ad-filter': st.adminFilter = id; return refresh();
    case 'ad-quick': { const { error } = await sb.from('sellers').update({ status: b.dataset.status }).eq('id', id);
      if (error) toast(errMsg(error)); else { toast('Seller ' + b.dataset.status); invalidate('admin', 'public', 'seller:' + id); st.ed = null; }
      return refresh(); }
    case 'ad-new': { const { data: row, error } = await sb.from('sellers').insert({ owner_id: uid(), name: '' }).select().single();
      if (error) return toast(errMsg(error)); invalidate('admin'); st.ed = null; return go('#/admin/seller/' + row.id); }
    case 'ad-csv': { const r = await data('admin:orders', async () => ({ data: [] })); return downloadCsv(r.data || []); }
  }
  if (!E) return;
  const s = E.seller;
  switch (act){
    case 'ed-save': flushSaves(); return;
    case 'ed-preview': flushSaves(); invalidate('seller:' + s.id); return;
    case 'ed-live': s.live = !s.live; await runNow('seller', saveSeller); return refresh();
    case 'ed-collect': s.collect = !s.collect; await runNow('seller', saveSeller); return refresh();
    case 'ed-deliver': s.deliver = !s.deliver; await runNow('seller', saveSeller); return refresh();
    case 'ed-cat': s.cats = (s.cats || []).includes(id) ? s.cats.filter(c => c !== id) : [...(s.cats || []), id]; queueSave('seller', saveSeller, 0); return refresh();
    case 'cover-remove': { const old = s.cover_path; s.cover_path = null; await runNow('seller', saveSeller); if (old) sb.storage.from('photos').remove([old]); return refresh(); }
    case 'item-add': { const { data: row, error } = await sb.from('items').insert({ seller_id: s.id, name: '', pack: '', price: null, stock: 1, visible: true, sort: E.items.length }).select().single();
      if (error) return toast(errMsg(error)); E.items.push(row); E.itemOpen[row.id] = true; refresh();
      setTimeout(() => { const el = document.getElementById('it_name_' + row.id); if (el) el.focus(); }, 60); return; }
    case 'item-open': E.itemOpen[id] = !E.itemOpen[id]; if (!E.itemOpen[id]) flushSaves(); return refresh();
    case 'item-delete': { const it = E.items.find(i => i.id === id); if (!confirm('Delete ' + (it.name || 'this item') + '?')) return;
      const { error } = await sb.from('items').delete().eq('id', id); if (error) return toast(errMsg(error));
      if (it.photo_path) sb.storage.from('photos').remove([it.photo_path]);
      E.items = E.items.filter(i => i.id !== id); invalidate('public', 'seller:' + s.id); return refresh(); }
    case 'item-visible': { const it = E.items.find(i => i.id === id); it.visible = !it.visible; await runNow('item:' + id, saveItem(id)); return refresh(); }
    case 'item-photo-remove': { const it = E.items.find(i => i.id === id); const old = it.photo_path; it.photo_path = null; await runNow('item:' + id, saveItem(id)); if (old) sb.storage.from('photos').remove([old]); return refresh(); }
    case 'stock-inc': case 'stock-dec': { const it = E.items.find(i => i.id === id); it.stock = Math.max(0, it.stock + (act === 'stock-inc' ? 1 : -1)); queueSave('item:' + id, saveItem(id), 600); return refresh(); }
    case 'soon-add': { const { data: row, error } = await sb.from('coming_soon').insert({ seller_id: s.id, name: '', when_text: '', sort: E.soon.length }).select().single();
      if (error) return toast(errMsg(error)); E.soon.push(row); return refresh(); }
    case 'soon-delete': { const { error } = await sb.from('coming_soon').delete().eq('id', id); if (error) return toast(errMsg(error)); E.soon = E.soon.filter(x => x.id !== id); invalidate('public', 'seller:' + s.id); return refresh(); }
    case 'ord-done': case 'ord-cancel': {
      if (act === 'ord-cancel' && !confirm('Cancel this order? The stock goes back into your freezer list.')) return;
      const { error } = await sb.rpc('set_order_status', { p_order_id: id, p_status: act === 'ord-done' ? 'collected' : 'cancelled' });
      if (error) return toast(errMsg(error));
      await loadEditor(E.id, E.admin); invalidate('public', 'seller:' + s.id, 'admin:orders'); toast(act === 'ord-done' ? 'Marked collected' : 'Order cancelled, stock returned'); return refresh(); }
    case 'seller-delete': {
      if (!confirm('Delete ' + (s.name || 'this seller page') + '? Its items and orders are removed for good.')) return;
      const { error } = await sb.from('sellers').delete().eq('id', s.id); if (error) return toast(errMsg(error));
      st.ed = null; invalidate(''); toast('Seller page deleted'); return go(E.admin ? '#/admin' : '#/sell'); }
    case 'ad-status': { const { error } = await sb.from('sellers').update({ status: id }).eq('id', s.id);
      if (error) return toast(errMsg(error)); s.status = id; invalidate('admin', 'public', 'seller:' + s.id); toast('Seller ' + id); return refresh(); }
    case 'ad-owner': {
      const email = (document.getElementById('ad_owner').value || '').trim().toLowerCase(); if (!email) return;
      const { data: p } = await sb.from('profiles').select('id, email, full_name').ilike('email', email).maybeSingle();
      if (!p) return toast('No account with that email. Ask them to sign up first.');
      const { error } = await sb.from('sellers').update({ owner_id: p.id }).eq('id', s.id);
      if (error) return toast(errMsg(error)); s.owner_id = p.id; E.owner = p; toast('Page handed to ' + p.email); return refresh(); }
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.zoom) { st.zoom = null; refresh(); } });
window.addEventListener('beforeunload', (e) => { if (Object.keys(saver.timers).length || saver.running) { flushSaves(); e.preventDefault(); e.returnValue = ''; } });

/* ================= START ================= */
async function loadProfile(){
  if (!uid()) { st.profile = null; return; }
  const { data: p, error } = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle();
  st.profile = p || null; st.profileError = error ? (error.message + (error.code ? ' (' + error.code + ')' : '')) : '';
}
window.addEventListener('hashchange', () => {
  if (Object.keys(saver.timers).length) flushSaves();
  const p = parseHash().parts;
  if (st.ed && !((p[0] === 'sell' && p[1] === st.ed.id) || (p[0] === 'admin' && p[2] === st.ed.id) || (p[0] === 'sell' && !p[1]))) st.ed = null;
  if (p[0] !== 'sell') st.createMore = false;
  st.zoom = null; st.authMsg = (p[0] === 'login' && st.authMsg) ? st.authMsg : null; st.formErr = '';
  render();
});
sb.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    const changed = (session && session.user && session.user.id) !== uid();
    st.session = session;
    if (event === 'PASSWORD_RECOVERY') { location.hash = '#/reset'; return; }
    if (changed && st.authReady) { await loadProfile(); invalidate(''); st.ed = null; render(); }
  }, 0);
});
(async () => {
  const { data: d } = await sb.auth.getSession();
  st.session = d.session; await loadProfile(); st.authReady = true;
  render();
})();
})();
