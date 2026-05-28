'use strict';

/* ====================== Transliteracija ====================== */
const CYR2LAT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z',
  'и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o',
  'п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c',
  'ч':'č','џ':'dž','ш':'š'
};
const LAT2CYR = {
  'a':'а','b':'б','v':'в','g':'г','d':'д','đ':'ђ','e':'е','ž':'ж','z':'з',
  'i':'и','j':'ј','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','r':'р',
  's':'с','t':'т','ć':'ћ','u':'у','f':'ф','h':'х','c':'ц','č':'ч','š':'ш'
};
function toLatin(s){
  let out='';
  for(const ch of s){ out += (CYR2LAT[ch] !== undefined ? CYR2LAT[ch] : ch); }
  return out;
}
function toCyr(s){
  return s
    .replace(/dž/g,'џ').replace(/lj/g,'љ').replace(/nj/g,'њ')
    .replace(/[a-zđžćčš]/g, ch => LAT2CYR[ch] !== undefined ? LAT2CYR[ch] : ch);
}

/* ====================== Stanje ====================== */
let WORDS = [];          // sve reči (ekavske + ijekavske na kraju), latinica
let KEYS = [];           // jak ključ rime za svaku reč
let RANK = new Map();    // reč -> indeks (manji = češća)
let SET = new Set();     // za brzu proveru postojanja
let jekStart = 0;        // indeks od kog počinju ijekavske reči
const DEFS = new Map();  // ručno pisana srpska objašnjenja (Rimoteka)
let includeJek = localStorage.getItem('rimoteka_jekavica') === '1';
let script = localStorage.getItem('rimoteka_script') || 'lat';
let favorites = JSON.parse(localStorage.getItem('rimoteka_favorites') || '[]');

const VOWELS = new Set(['a','e','i','o','u']);

/* ====================== Lingvistika ====================== */
function vowelPositions(w){
  const p = [];
  for(let i=0;i<w.length;i++) if(VOWELS.has(w[i])) p.push(i);
  return p;
}
// Jak ključ: ako se reč završava suglasnikom -> od poslednjeg samoglasnika;
// ako se završava samoglasnikom -> od pretposlednjeg (poslednja ~2 sloga).
function rhymeKey(w){
  const vp = vowelPositions(w);
  if(vp.length === 0) return w;
  const last = vp[vp.length-1];
  if(last < w.length-1) return w.slice(last);
  if(vp.length >= 2) return w.slice(vp[vp.length-2]);
  return w.slice(last);
}
// Širi ključ: od poslednjeg samoglasnika (asonanca)
function looseKey(w){
  const vp = vowelPositions(w);
  if(vp.length === 0) return w;
  return w.slice(vp[vp.length-1]);
}
function commonSuffix(a,b){
  let n=0; const la=a.length, lb=b.length;
  while(n<la && n<lb && a[la-1-n]===b[lb-1-n]) n++;
  return n;
}
function syllables(w){
  let c=0;
  for(let i=0;i<w.length;i++){
    const ch=w[i];
    if(VOWELS.has(ch)) c++;
    else if(ch==='r'){
      const prevV = i>0 && VOWELS.has(w[i-1]);
      const nextV = i<w.length-1 && VOWELS.has(w[i+1]);
      if(!prevV && !nextV) c++;        // slogotvorno r (prst, srce, vrt)
    }
  }
  return c || 1;
}

/* ====================== Učitavanje ====================== */
async function loadDict(){
  const [ek, jek, defs] = await Promise.all([
    fetch('reci.txt').then(r=>r.text()),
    fetch('reci_jekavica.txt').then(r=>r.text()).catch(()=> ''),
    fetch('definicije.json').then(r=>r.ok?r.json():{}).catch(()=> ({}))
  ]);
  for(const k in defs) DEFS.set(k, defs[k]);
  const ekWords = ek.split('\n').filter(Boolean);
  const jekWords = jek.split('\n').filter(Boolean);
  jekStart = ekWords.length;
  WORDS = ekWords.concat(jekWords);   // ijekavske reči su na kraju (najniži rang)
  KEYS = new Array(WORDS.length);
  for(let i=0;i<WORDS.length;i++){
    const w = WORDS[i];
    KEYS[i] = rhymeKey(w);
    RANK.set(w, i);
    SET.add(w);
  }
  document.getElementById('loading').classList.add('hide');
}

/* ====================== Prikaz reči (čip) ====================== */
function disp(word){ return script==='cyr' ? toCyr(word) : word; }

function isFav(w){ return favorites.includes(w); }
function toggleFav(w){
  const i = favorites.indexOf(w);
  if(i>=0) favorites.splice(i,1); else favorites.unshift(w);
  localStorage.setItem('rimoteka_favorites', JSON.stringify(favorites));
  updateFavCount();
  renderFavorites();
  document.querySelectorAll(`.chip[data-w="${cssEsc(w)}"] .fav`).forEach(b=>{
    b.classList.toggle('on', isFav(w));
    b.textContent = isFav(w) ? '♥' : '♡';
  });
}
function cssEsc(s){ return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g,'\\$&'); }

function makeChip(word){
  const el = document.createElement('div');
  el.className = 'chip';
  el.dataset.w = word;
  const syl = syllables(word);
  el.innerHTML =
    `<span class="word" title="klikni da kopiraš">${disp(word)}</span>` +
    `<span class="syl" title="${syl} sloga">${syl}</span>` +
    `<button class="mini info" title="objašnjenje reči">ⓘ</button>` +
    `<button class="mini fav ${isFav(word)?'on':''}" title="sačuvaj u omiljene">${isFav(word)?'♥':'♡'}</button>` +
    `<button class="mini rh" title="nađi rime za ovu reč">🔁</button>`;
  const wEl = el.querySelector('.word');
  wEl.onclick = () => { copy(disp(word)); };
  wEl.addEventListener('mouseenter', () => { clearTimeout(defTimer); defTimer = setTimeout(() => showDefAt(word, wEl, false), 320); });
  wEl.addEventListener('mouseleave', () => { clearTimeout(defTimer); hideDef(); });
  el.querySelector('.info').onclick = (ev) => { ev.stopPropagation(); showDefAt(word, ev.currentTarget, true); };
  el.querySelector('.fav').onclick = () => toggleFav(word);
  el.querySelector('.rh').onclick = () => { rimeInput.value = disp(word); switchTab('rime'); doRhymes(); };
  return el;
}

function renderGroup(container, title, words, strong){
  if(!words.length) return;
  const g = document.createElement('div');
  g.className = 'res-group' + (strong ? ' strong-tier' : '');
  if(title){ const h=document.createElement('h3'); h.textContent=title; g.appendChild(h); }
  const wrap = document.createElement('div'); wrap.className='results';
  words.forEach(w => wrap.appendChild(makeChip(w)));
  g.appendChild(wrap);
  container.appendChild(g);
}

/* ====================== RIME ====================== */
const rimeInput = document.getElementById('rimeInput');
let rimeSyl = 0;
let loose = false;

function filterSyl(arr){
  if(!rimeSyl) return arr;
  if(rimeSyl===5) return arr.filter(w=>syllables(w)>=5);
  return arr.filter(w=>syllables(w)===rimeSyl);
}

function doRhymes(){
  const raw = rimeInput.value.trim().toLowerCase();
  const q = toLatin(raw).replace(/[^a-zčćžšđ]/g,'');
  const box = document.getElementById('rimeResults');
  box.innerHTML='';
  if(q.length<2){ box.innerHTML='<p class="empty">Upiši reč (bar dva slova).</p>'; return; }

  const key = rhymeKey(q);
  const keyLen = key.length;
  const limit = includeJek ? WORDS.length : jekStart;
  const strong = [];
  for(let i=0;i<limit;i++){
    if(KEYS[i]===key && WORDS[i]!==q) strong.push(WORDS[i]);
  }
  strong.sort((a,b)=>{
    const d = commonSuffix(q,b)-commonSuffix(q,a);
    if(d) return d;
    return RANK.get(a)-RANK.get(b);
  });
  const strongFiltered = filterSyl(strong);
  const best = strongFiltered.filter(w=>commonSuffix(q,w) > keyLen).slice(0,90);
  const good = strongFiltered.filter(w=>commonSuffix(q,w) === keyLen).slice(0,90);

  if(!best.length && !good.length && !loose){
    box.innerHTML = '<p class="empty">Nema rime za ovu reč. Probaj da uključiš „šire rime“ ispod.</p>';
  }
  renderGroup(box, best.length?'Najbolje rime':'', best, true);
  renderGroup(box, good.length?'Dobre rime':'', good, false);

  if(loose){
    const lk = looseKey(q);
    const seen = new Set(strong);
    const wide = [];
    for(let i=0;i<limit;i++){
      const w = WORDS[i];
      if(w===q || seen.has(w)) continue;
      if(looseKey(w)===lk) wide.push(w);
    }
    wide.sort((a,b)=>{
      const d = commonSuffix(q,b)-commonSuffix(q,a);
      if(d) return d;
      return RANK.get(a)-RANK.get(b);
    });
    renderGroup(box, 'Šire rime (asonanca)', filterSyl(wide).slice(0,70), false);
  }
}

document.getElementById('rimeBtn').onclick = doRhymes;
rimeInput.addEventListener('keydown', e=>{ if(e.key==='Enter') doRhymes(); });
document.getElementById('rimeSyl').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#rimeSyl button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); rimeSyl=+b.dataset.syl; if(rimeInput.value.trim()) doRhymes();
});
document.getElementById('looseToggle').addEventListener('change', e=>{ loose=e.target.checked; if(rimeInput.value.trim()) doRhymes(); });
const jekToggle = document.getElementById('jekToggle');
jekToggle.checked = includeJek;
jekToggle.addEventListener('change', e=>{
  includeJek = e.target.checked;
  localStorage.setItem('rimoteka_jekavica', includeJek ? '1' : '0');
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
});
document.getElementById('randomBtn').onclick = ()=>{
  // lepa, sadržajna reč: iz srednjeg opsega frekvencije, bar 2 sloga
  for(let t=0;t<40;t++){
    const i = 250 + Math.floor(Math.random()*9000);
    const w = WORDS[i];
    if(w && syllables(w)>=2){ rimeInput.value=disp(w); doRhymes(); return; }
  }
  rimeInput.value=disp(WORDS[500]); doRhymes();
};

/* ====================== PRETRAGA ====================== */
const searchInput = document.getElementById('searchInput');
let searchSyl = 0;
function doSearch(){
  const mode = document.getElementById('searchMode').value;
  const q = toLatin(searchInput.value.trim().toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
  const box = document.getElementById('searchResults');
  box.innerHTML='';
  if(q.length<2){ box.innerHTML='<p class="empty">Upiši bar dva slova.</p>'; return; }
  const out=[];
  const limit = includeJek ? WORDS.length : jekStart;
  for(let i=0;i<limit && out.length<600;i++){
    const w=WORDS[i];
    if(mode==='ends'   && w.endsWith(q))   out.push(w);
    else if(mode==='starts' && w.startsWith(q)) out.push(w);
    else if(mode==='contains' && w.includes(q)) out.push(w);
  }
  let arr = out;
  if(searchSyl){
    arr = searchSyl===5 ? arr.filter(w=>syllables(w)>=5) : arr.filter(w=>syllables(w)===searchSyl);
  }
  if(!arr.length){ box.innerHTML='<p class="empty">Nema reči koje odgovaraju.</p>'; return; }
  renderGroup(box, `Pronađeno (${arr.length>200?'200+':arr.length})`, arr.slice(0,200), false);
}
document.getElementById('searchBtn').onclick = doSearch;
searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
document.getElementById('searchSyl').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#searchSyl button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); searchSyl=+b.dataset.syl; if(searchInput.value.trim()) doSearch();
});

/* ====================== BROJAČ SLOGOVA ====================== */
function lineSyllables(line){
  const tokens = line.split(/\s+/).filter(Boolean);
  let total=0;
  for(const t of tokens){
    const w = toLatin(t.toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
    if(w) total += syllables(w);
  }
  return total;
}
const sylInput = document.getElementById('sylInput');
sylInput.addEventListener('input', ()=>{
  const out = document.getElementById('sylOutput');
  const lines = sylInput.value.split('\n');
  out.innerHTML='';
  let totalSyl=0, nonEmpty=0;
  lines.forEach(line=>{
    const s = lineSyllables(line);
    if(line.trim()){ totalSyl+=s; nonEmpty++; }
    const div=document.createElement('div'); div.className='syl-line';
    div.innerHTML = `<span class="count">${line.trim()?s:''}</span>`
      + `<span class="txt">${escapeHtml(line)||'&nbsp;'}</span>`
      + `<span class="chcount">${line.trim()? line.length+' zn.' : ''}</span>`;
    out.appendChild(div);
  });
  if(nonEmpty){
    const text = sylInput.value;
    const chars = text.length;
    const noSpace = text.replace(/\s/g,'').length;
    const words = (text.trim().match(/\S+/g)||[]).length;
    const t=document.createElement('div'); t.className='syl-total';
    t.innerHTML = `Ukupno: <b>${totalSyl}</b> slogova · <b>${words}</b> reči · <b>${chars}</b> znakova (${noSpace} bez razmaka) · ${nonEmpty} ${nonEmpty===1?'red':'redova'}`;
    out.appendChild(t);
  }
});
function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ====================== BELEŽNICA ====================== */
const noteInput = document.getElementById('noteInput');
const noteGutter = document.getElementById('noteGutter');
noteInput.value = localStorage.getItem('rimoteka_notes') || '';
function renderGutter(){
  const lines = noteInput.value.split('\n');
  noteGutter.textContent = lines.map(l => l.trim() ? lineSyllables(l) : '·').join('\n');
}
function updateNoteStats(){
  const text = noteInput.value;
  const stats = document.getElementById('noteStats');
  if(!text.trim()){ stats.textContent = ''; return; }
  const lines = text.split('\n').filter(l=>l.trim()).length;
  const words = (text.trim().match(/\S+/g)||[]).length;
  const chars = text.length;
  let syl=0; text.split('\n').forEach(l=>{ if(l.trim()) syl += lineSyllables(l); });
  stats.textContent = `${lines} ${lines===1?'red':'redova'} · ${words} reči · ${chars} znakova · ${syl} slogova`;
}
noteInput.addEventListener('input', ()=>{
  localStorage.setItem('rimoteka_notes', noteInput.value);
  renderGutter();
  updateNoteStats();
});
noteInput.addEventListener('scroll', ()=>{ noteGutter.scrollTop = noteInput.scrollTop; });
document.getElementById('clearNotes').onclick = ()=>{
  if(confirm('Obrisati celu belešku?')){ noteInput.value=''; localStorage.removeItem('rimoteka_notes'); renderGutter(); }
};

/* ====================== OMILJENE ====================== */
function updateFavCount(){ document.getElementById('favCount').textContent = favorites.length; }
function renderFavorites(){
  const box=document.getElementById('favResults');
  box.innerHTML='';
  if(!favorites.length){ box.innerHTML='<p class="empty">Još nemaš sačuvane reči. Klikni ♥ na bilo kojoj reči.</p>'; return; }
  renderGroup(box, `Tvoje reči (${favorites.length})`, favorites.slice(), false);
}
document.getElementById('copyFavs').onclick = ()=>{
  if(!favorites.length) return;
  copy(favorites.map(disp).join(', '));
};
document.getElementById('clearFavs').onclick = ()=>{
  if(favorites.length && confirm('Obrisati sve omiljene reči?')){
    favorites=[]; localStorage.setItem('rimoteka_favorites','[]'); updateFavCount(); renderFavorites();
  }
};

/* ====================== TABOVI / PISMO / TOAST ====================== */
function switchTab(name){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+name));
}
document.getElementById('tabs').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(b) switchTab(b.dataset.tab);
});

document.getElementById('scriptToggle').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  script=b.dataset.script;
  localStorage.setItem('rimoteka_script', script);
  document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
  // ponovo iscrtaj sve što je prikazano
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
  renderFavorites();
});

let toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),1600);
}
function copy(text){
  navigator.clipboard?.writeText(text).then(()=>toast(`kopirano: ${text}`)).catch(()=>toast('kopirano'));
}

/* ====================== DEFINICIJE (Викиречник) ====================== */
const defCache = new Map();
let defTimer = null, defPinned = false, defWord = null;
const defTip = document.createElement('div');
defTip.className = 'deftip';
defTip.style.display = 'none';
document.body.appendChild(defTip);

function firstSentence(t){
  t = t.trim();
  const m = t.match(/^([\s\S]{15,220}?[.!?])(\s|$)/);
  return m ? m[1] : (t.length > 220 ? t.slice(0,220) + '…' : t);
}

function parseSrMeaning(ext){
  const i = ext.indexOf('Значења');
  if(i < 0) return null;
  const lines = ext.slice(i).split('\n').slice(1);
  const out = [];
  for(let line of lines){
    line = line.trim();
    if(!line){ if(out.length) break; else continue; }
    if(line.startsWith('==') || /^(Порекло|Примери|Синоними|Антоними|Асоцијације|Изведене|Преводи|Референце|Хипоними|Сродне)/.test(line)) break;
    const m = line.match(/^\[\d+\.?\]\s*(.+)$/);
    if(m) out.push(m[1].trim());
    else if(out.length) out[out.length-1] += ' ' + line;
    if(out.length >= 2) break;
  }
  if(!out.length) return null;
  return out.length > 1 ? out.map((t,idx)=>`${idx+1}. ${t}`).join('  ') : out[0];
}

async function fetchDefinition(word){
  if(defCache.has(word)) return defCache.get(word);
  if(DEFS.has(word)){ const r = { text: DEFS.get(word), src:'Rimoteka' }; defCache.set(word, r); return r; }
  let result = null;
  try{
    const u = `https://sr.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(word)}&format=json&origin=*`;
    const d = await fetch(u).then(r=>r.json());
    const p = Object.values(d.query.pages)[0];
    if(p && p.extract){ const m = parseSrMeaning(p.extract); if(m) result = { text:m, src:'Викиречник' }; }
  }catch(e){}
  if(!result){
    try{
      const d = await fetch(`https://sr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`).then(r=>r.ok?r.json():null);
      if(d && d.type === 'standard' && d.extract){
        result = { text: firstSentence(d.extract), src:'Википедија' };
      }
    }catch(e){}
  }
  if(!result) result = { text:'Nema objašnjenja za ovu reč.', src:'' };
  defCache.set(word, result);
  return result;
}

function positionTip(anchor){
  const r = anchor.getBoundingClientRect();
  defTip.style.display = 'block';
  defTip.style.top = (r.bottom + window.scrollY + 6) + 'px';
  let left = r.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - defTip.offsetWidth - 10;
  if(left > maxLeft) left = Math.max(8, maxLeft);
  defTip.style.left = left + 'px';
}

async function showDefAt(word, anchor, pinned){
  defWord = word; defPinned = pinned;
  defTip.innerHTML = `<div class="deftip-w">${disp(word)}</div><div class="deftip-b">učitavanje…</div>`;
  positionTip(anchor);
  const res = await fetchDefinition(word);
  if(defWord !== word) return;
  defTip.innerHTML = `<div class="deftip-w">${disp(word)}</div><div class="deftip-b">${escapeHtml(res.text)}</div>` + (res.src ? `<div class="deftip-s">izvor: ${res.src}</div>` : '');
  positionTip(anchor);
}
function hideDef(){ if(!defPinned){ defTip.style.display = 'none'; defWord = null; } }
document.addEventListener('click', e=>{
  if(defPinned && !defTip.contains(e.target) && !e.target.classList.contains('info')){
    defPinned = false; defTip.style.display = 'none'; defWord = null;
  }
});

/* ====================== START ====================== */
document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
updateFavCount();
renderFavorites();
renderGutter();
updateNoteStats();
loadDict().then(()=>{ rimeInput.focus(); });
