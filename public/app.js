'use strict';

/* ====================== Transliteracija ====================== */
const CYR2LAT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z',
  'и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o',
  'п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c',
  'ч':'č','џ':'dž','ш':'š',
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Ђ':'Đ','Е':'E','Ж':'Ž','З':'Z',
  'И':'I','Ј':'J','К':'K','Л':'L','Љ':'Lj','М':'M','Н':'N','Њ':'Nj','О':'O',
  'П':'P','Р':'R','С':'S','Т':'T','Ћ':'Ć','У':'U','Ф':'F','Х':'H','Ц':'C',
  'Ч':'Č','Џ':'Dž','Ш':'Š'
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

/* Reči koje se NE prikazuju kao rime (neprikladne, vulgarnosti, anatomija) */
const BLOCKED = new Set(['dupe','guzica','guzice','govno','govna','sranje','srao','serem','sere','picka','picku','pice','kurac','kurca','kura','dupeta','dubre','dubretar','pisaju','pisao','pisa','guz','guzi','guziti','seronja','seronje','pickica','pickice','kurvetina','kurvetine','jebem','jebi','jebanje','jebeno','jebeni','jebena','jebalo','jebaci','jebac','krvavo','krvavi','krvava','govnar','govnari','smece','smetlar','smetlarka']);

/* Kontekstualna isključenja: za određenu reč NE prikazuj određene rime (semantika, a ne vulgarnost) */
const RHYME_EXCLUSIONS = {
  'dete': new Set(['bidete','bide','bidi'])
};

/* ====================== Lingvistika ====================== */
function vowelPositions(w){
  const p = [];
  for(let i=0;i<w.length;i++){
    const ch = w[i];
    if(VOWELS.has(ch)){ p.push(i); continue; }
    if(ch==='r'){                        // slogotvorno r je nosilac sloga (srce, vrt, srve)
      const prevV = i>0 && VOWELS.has(w[i-1]);
      const nextV = i<w.length-1 && VOWELS.has(w[i+1]);
      if(!prevV && !nextV) p.push(i);
    }
  }
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
// Ključ završnog sloga: jedan onset suglasnik + poslednje jezgro + rep
// (za reči sa malo savršenih rima, npr. srce -> "ce": borce, dvorce, jezerce...)
function finalSylKey(w){
  const vp = vowelPositions(w);
  if(vp.length === 0) return w;
  const last = vp[vp.length-1];
  let start = last;
  if(last > 0 && vp.indexOf(last-1) === -1) start = last-1;
  return w.slice(start);
}
function commonSuffix(a,b){
  let n=0; const la=a.length, lb=b.length;
  while(n<la && n<lb && a[la-1-n]===b[lb-1-n]) n++;
  return n;
}
function countSyl(w){
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
  return c;
}
// Prikaz pojedinačne reči: bar 1 slog. Usamljeni suglasnički predlog (s, k, z) = 0.
function syllables(w){ return countSyl(w) || 1; }

/* ====================== Učitavanje ====================== */
let defsPromise = null;  // lazy load velikog rečnika definicija (20 MB)
async function loadLocalDefs(){
  if(DEFS.size) return;
  if(defsPromise) return defsPromise;
  defsPromise = fetch('definicije.json?v=228')
    .then(r => r.ok ? r.json() : {})
    .then(defs => {
      for(const k in defs) DEFS.set(k, defs[k]);
    })
    .catch(() => {});
  return defsPromise;
}

async function loadDict(){
  const [ek, jek] = await Promise.all([
    fetch('reci.txt?v=20260717').then(r=>r.text()),
    fetch('reci_jekavica.txt?v=20260717').then(r=>r.text()).catch(()=> '')
  ]);
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
let lastTrackedRhyme = '';   // GA4: da isti pojam ne šalje event na svaki filter-klik

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

  // sinhronizuj URL sa trenutnom pretragom (deljiv link, konzistentno sa landing stranicama)
  try{ const u=new URL(window.location.href); u.searchParams.set('rec', q); history.replaceState(null,'',u); }catch(e){}

  const key = rhymeKey(q);
  const keyLen = key.length;
  const excluded = RHYME_EXCLUSIONS[q] || new Set();
  const limit = includeJek ? WORDS.length : jekStart;
  const strong = [];
  for(let i=0;i<limit;i++){
    const w = WORDS[i];
    if(!BLOCKED.has(w) && !excluded.has(w) && KEYS[i]===key && w!==q) strong.push(w);
  }
  strong.sort((a,b)=>{
    const d = commonSuffix(q,b)-commonSuffix(q,a);
    if(d) return d;
    return RANK.get(a)-RANK.get(b);
  });
  const strongFiltered = filterSyl(strong);
  const best = strongFiltered.filter(w=>commonSuffix(q,w) > keyLen).slice(0,90);
  const good = strongFiltered.filter(w=>commonSuffix(q,w) === keyLen).slice(0,90);

  // Fallback za reči sa malo savršenih rima (npr. srce, srp): isti završni slog
  let finalExtra = [];
  if(best.length + good.length < 6){
    const fk = finalSylKey(q);
    const seen = new Set(strong); seen.add(q);
    const fin = [];
    for(let i=0;i<limit;i++){
      const w = WORDS[i];
      if(BLOCKED.has(w) || excluded.has(w) || seen.has(w)) continue;
      if(finalSylKey(w)===fk) fin.push(w);
    }
    fin.sort((a,b)=>{
      const d = commonSuffix(q,b)-commonSuffix(q,a);
      if(d) return d;
      return RANK.get(a)-RANK.get(b);
    });
    finalExtra = filterSyl(fin).slice(0,90);
  }

  if(!best.length && !good.length && !finalExtra.length && !loose){
    box.innerHTML = '<p class="empty">Nema rime za ovu reč. Probaj da uključiš „šire rime“ ispod.</p>';
  }
  renderGroup(box, best.length?'Najbolje rime':'', best, true);
  renderGroup(box, good.length?'Dobre rime':'', good, false);
  renderGroup(box, finalExtra.length?'Dobre rime (isti završni slog)':'', finalExtra, false);

  // GA4: zabeleži jedinstvenu pretragu rime (koje reči ljudi traže -> nove landing strane)
  if(q !== lastTrackedRhyme){
    lastTrackedRhyme = q;
    if(typeof gtag === 'function'){
      try{ gtag('event','rhyme_search',{ search_term: q, results_count: best.length + good.length + finalExtra.length }); }catch(e){}
    }
  }

  if(loose){
    const lk = looseKey(q);
    const seen = new Set(strong);
    finalExtra.forEach(w=>seen.add(w));
    const wide = [];
    for(let i=0;i<limit;i++){
      const w = WORDS[i];
      if(BLOCKED.has(w) || excluded.has(w) || w===q || seen.has(w)) continue;
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

/* ====================== AUTOCOMPLETE ZA RIME ====================== */
const acWrap = document.createElement('div');
acWrap.className = 'autocomplete';
acWrap.style.display = 'none';
rimeInput.parentNode.style.position = 'relative';
rimeInput.parentNode.appendChild(acWrap);
let acIndex = -1, acItems = [];

function updateAutocomplete(){
  const raw = rimeInput.value.trim().toLowerCase();
  const q = toLatin(raw).replace(/[^a-zčćžšđ]/g,'');
  acWrap.innerHTML = '';
  acIndex = -1; acItems = [];
  if(q.length < 2 || WORDS.length === 0){ acWrap.style.display='none'; return; }
  const limit = includeJek ? WORDS.length : jekStart;
  const out = [];
  for(let i=0;i<limit && out.length<8;i++){
    const w = WORDS[i];
    if(BLOCKED.has(w)) continue;
    if(w.startsWith(q) && w !== q) out.push(w);
  }
  if(!out.length){ acWrap.style.display='none'; return; }
  acItems = out;
  out.forEach((w,idx)=>{
    const div = document.createElement('div');
    div.className = 'ac-item';
    div.textContent = disp(w);
    div.dataset.idx = idx;
    div.dataset.w = w;
    div.onclick = ()=>{ rimeInput.value = disp(w); hideAutocomplete(); doRhymes(); };
    acWrap.appendChild(div);
  });
  acWrap.style.display = 'block';
}
function hideAutocomplete(){ acWrap.style.display='none'; acIndex=-1; acItems=[]; }
function moveAutocomplete(dir){
  if(!acItems.length) return;
  acIndex += dir;
  if(acIndex < 0) acIndex = acItems.length - 1;
  if(acIndex >= acItems.length) acIndex = 0;
  acWrap.querySelectorAll('.ac-item').forEach((el,i)=>el.classList.toggle('active', i===acIndex));
}
rimeInput.addEventListener('input', updateAutocomplete);
rimeInput.addEventListener('keydown', e=>{
  if(e.key === 'ArrowDown'){ e.preventDefault(); moveAutocomplete(1); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); moveAutocomplete(-1); }
  else if(e.key === 'Escape'){ hideAutocomplete(); }
  else if(e.key === 'Enter' && acIndex >= 0){
    e.preventDefault();
    rimeInput.value = disp(acItems[acIndex]);
    hideAutocomplete();
    doRhymes();
  }
});
document.addEventListener('click', e=>{ if(!rimeInput.parentNode.contains(e.target)) hideAutocomplete(); });

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
    if(BLOCKED.has(w)) continue;
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
const searchMode = document.getElementById('searchMode');
function updateSearchPlaceholder(){
  const ph = { ends:'npr. ica, ama, ost', starts:'npr. cvet, svet, mesec', contains:'npr. cvet, zvezd, ljub' };
  searchInput.placeholder = ph[searchMode.value] || '';
}
searchMode.addEventListener('change', ()=>{ updateSearchPlaceholder(); if(searchInput.value.trim()) doSearch(); });
updateSearchPlaceholder();
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
    if(w) total += countSyl(w);
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

/* ====================== BELEŽNICA — Editor sa obojenim rimama ====================== */
const noteInput = document.getElementById('noteInput');
const noteEditor = document.getElementById('noteEditor');
const noteGutter = document.getElementById('noteGutter');

// Paleta boja za rimske grupe (dovoljno različite, čitljive na svetloj i tamnoj pozadini)
const RHYME_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#d35400', '#c0392b', '#16a085',
  '#8e44ad', '#2980b9', '#27ae60', '#f1c40f', '#e91e63',
  '#00bcd4', '#4caf50', '#ff9800', '#673ab7', '#009688'
];

// Inicijalizacija — učitaj tekst iz localStorage i oboji rime
const savedText = localStorage.getItem('rimoteka_notes') || '';
noteInput.value = savedText;
if(savedText.trim()){
  const { colorMap } = analyzeRhymes(savedText);
  if(colorMap.size > 0){
    noteEditor.innerHTML = renderColoredText(savedText);
  } else {
    noteEditor.innerText = savedText;
  }
} else {
  noteEditor.innerText = savedText;
}

// Dobij plain text iz contenteditable div-a
function getEditorText(){
  return noteEditor.innerText || '';
}

// Postavi plain text u editor (bez boja)
function setEditorText(text){
  noteEditor.innerText = text;
}

// Sačuvaj poziciju kursora (broj karaktera od početka)
function saveCursorPosition(){
  const sel = window.getSelection();
  if(sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(noteEditor);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

// Vrati poziciju kursora
function restoreCursorPosition(pos){
  if(pos == null) return;
  const sel = window.getSelection();
  const range = document.createRange();
  let charCount = 0;
  const walker = document.createTreeWalker(noteEditor, NodeFilter.SHOW_TEXT, null);
  let node;
  while(node = walker.nextNode()){
    const nextCount = charCount + node.textContent.length;
    if(pos <= nextCount){
      range.setStart(node, pos - charCount);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    charCount = nextCount;
  }
  // ako nismo našli, stavi na kraj
  range.selectNodeContents(noteEditor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Analiziraj tekst i vrati mapu boja po redu
function analyzeRhymes(text){
  const lines = text.split('\n');
  const lastWords = lines.map(line => {
    const toks = toLatin(line.toLowerCase()).replace(/[^a-zčćžšđ\s]/g,' ').split(/\s+/).filter(Boolean);
    return toks.length ? toks[toks.length-1] : '';
  });
  // grupiši po loose_key (asonanca) — širi pojam rime, pokriva i savršene i bliske
  const groups = new Map();
  lastWords.forEach((word, idx) => {
    if(!word || word.length < 2) return;
    const key = rhymeKey(word);
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(idx);
  });
  // samo grupe sa 2+ reči se boje
  const colorMap = new Map();
  let colorIdx = 0;
  groups.forEach((indices, key) => {
    if(indices.length < 2) return;
    const color = RHYME_COLORS[colorIdx % RHYME_COLORS.length];
    indices.forEach(idx => colorMap.set(idx, color));
    colorIdx++;
  });
  return { lines, lastWords, colorMap };
}

// Renderuj tekst sa obojenim rimama
function renderColoredText(text){
  const { lines, lastWords, colorMap } = analyzeRhymes(text);
  if(colorMap.size === 0){
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  return lines.map((line, idx) => {
    const color = colorMap.get(idx);
    if(!color) return escapeHtml(line);
    const word = lastWords[idx];
    if(!word) return escapeHtml(line);
    // nađi poslednju pojavu reči u redu
    const lower = line.toLowerCase();
    const pos = lower.lastIndexOf(word);
    if(pos === -1) return escapeHtml(line);
    const before = line.slice(0, pos);
    const w = line.slice(pos, pos + word.length);
    const after = line.slice(pos + word.length);
    return escapeHtml(before) +
      `<span class="rhyme-word" style="color:${color};background:${color}22">${escapeHtml(w)}</span>` +
      escapeHtml(after);
  }).join('<br>');
}

// Glavna funkcija — analiziraj i renderuj
function updateEditor(){
  const text = getEditorText();
  noteInput.value = text;
  localStorage.setItem('rimoteka_notes', text);
  renderGutter();
  updateNoteStats();
  renderNoteRhymes();
}

// Debounce da ne renderujemo na svaki keystroke
let editorTimer = null;
function scheduleEditorUpdate(){
  clearTimeout(editorTimer);
  editorTimer = setTimeout(() => {
    const pos = saveCursorPosition();
    const text = getEditorText();
    noteInput.value = text;
    localStorage.setItem('rimoteka_notes', text);
    // renderuj sa bojama samo ako ima rimskih grupa
    const { colorMap } = analyzeRhymes(text);
    if(colorMap.size > 0){
      noteEditor.innerHTML = renderColoredText(text);
      restoreCursorPosition(pos);
    }
    renderGutter();
    updateNoteStats();
    renderNoteRhymes();
  }, 150);
}

// Event listeneri
noteEditor.addEventListener('input', scheduleEditorUpdate);
noteEditor.addEventListener('scroll', () => { noteGutter.scrollTop = noteEditor.scrollTop; });
noteEditor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
});

document.getElementById('clearNotes').onclick = () => {
  if(confirm('Obrisati celu belešku?')){
    setEditorText('');
    noteInput.value = '';
    localStorage.removeItem('rimoteka_notes');
    renderGutter();
    updateNoteStats();
    renderNoteRhymes();
  }
};

// Gutter — broj slogova po redu
function renderGutter(){
  const lines = getEditorText().split('\n');
  noteGutter.textContent = lines.map(l => l.trim() ? lineSyllables(l) : '·').join('\n');
}

// Statistika
function updateNoteStats(){
  const text = getEditorText();
  const stats = document.getElementById('noteStats');
  if(!text.trim()){ stats.textContent = ''; return; }
  const lines = text.split('\n').filter(l=>l.trim()).length;
  const words = (text.trim().match(/\S+/g)||[]).length;
  const chars = text.length;
  let syl=0; text.split('\n').forEach(l=>{ if(l.trim()) syl += lineSyllables(l); });
  stats.textContent = `${lines} ${lines===1?'red':'redova'} · ${words} reči · ${chars} znakova · ${syl} slogova`;
}

// Rime za poslednju reč u beležnici
function getLastWordInLine(line){
  const toks = toLatin(line.toLowerCase()).replace(/[^a-zčćžšđ\s]/g,' ').split(/\s+/).filter(Boolean);
  return toks.length ? toks[toks.length-1] : '';
}
function renderNoteRhymes(){
  const box = document.getElementById('noteRhymes');
  if(!box) return;
  const lines = getEditorText().split('\n');
  let lastLine = '';
  for(let i = lines.length - 1; i >= 0; i--){
    if(lines[i].trim()){ lastLine = lines[i]; break; }
  }
  const word = getLastWordInLine(lastLine);
  if(!word || word.length < 2){
    box.innerHTML = '';
    return;
  }
  const savedVal = rimeInput.value;
  rimeInput.value = word;
  doRhymes();
  rimeInput.value = savedVal;
  const src = document.getElementById('rimeResults');
  const chips = src.querySelectorAll('.chip');
  if(!chips.length){
    box.innerHTML = `<h4>Rime za <span class="nr-word">${escapeHtml(disp(word))}</span></h4><p class="nr-empty">Nema pronađenih rima.</p>`;
    return;
  }
  box.innerHTML = `<h4>Rime za <span class="nr-word">${escapeHtml(disp(word))}</span></h4>`;
  const rdiv = document.createElement('div');
  rdiv.className = 'results';
  let count = 0;
  chips.forEach(chip => {
    if(count >= 16) return;
    const clone = chip.cloneNode(true);
    clone.onclick = () => {
      const w = clone.querySelector('.word').textContent;
      // ubaci reč na poziciju kursora u editoru
      const sel = window.getSelection();
      if(sel.rangeCount > 0){
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(w);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        noteEditor.innerText += w;
      }
      noteEditor.focus();
      updateEditor();
    };
    rdiv.appendChild(clone);
    count++;
  });
  box.appendChild(rdiv);
}

// Čuvanje liste rima za poslednju reč
function getRhymeListForLastWord(){
  const lines = getEditorText().split('\n');
  let lastLine = '';
  for(let i = lines.length - 1; i >= 0; i--){
    if(lines[i].trim()){ lastLine = lines[i]; break; }
  }
  const word = getLastWordInLine(lastLine);
  if(!word || word.length < 2) return { word: '', rhymes: [] };
  const savedVal = rimeInput.value;
  rimeInput.value = word;
  doRhymes();
  rimeInput.value = savedVal;
  const src = document.getElementById('rimeResults');
  const chips = src.querySelectorAll('.chip .word');
  const rhymes = [];
  chips.forEach(c => { const t = c.textContent.trim(); if(t) rhymes.push(t); });
  return { word, rhymes };
}
document.getElementById('saveRhymeList').onclick = () => {
  const { word, rhymes } = getRhymeListForLastWord();
  if(!word || !rhymes.length){ toast('Nema rima za čuvanje'); return; }
  const lists = JSON.parse(localStorage.getItem('rimoteka_lists') || '[]');
  lists.unshift({ word, rhymes, date: new Date().toISOString() });
  localStorage.setItem('rimoteka_lists', JSON.stringify(lists.slice(0, 50)));
  toast(`Sačuvano ${rhymes.length} rima za „${word}"`);
};
document.getElementById('exportRhymeList').onclick = () => {
  const { word, rhymes } = getRhymeListForLastWord();
  if(!word || !rhymes.length){ toast('Nema rima za preuzimanje'); return; }
  const text = `Rime za „${word}"\n${'='.repeat(30)}\n${rhymes.join(', ')}\n\nGenerisano: Rimoteka.com`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rime-za-${word}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Preuzeta lista za „${word}"`);
};

// Inicijalno renderovanje
renderGutter();
updateNoteStats();
renderNoteRhymes();

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

const brandHome=document.getElementById('brandHome');
function goHome(){ switchTab('rime'); window.scrollTo({top:0, behavior:'smooth'}); }
brandHome.addEventListener('click', goHome);
brandHome.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goHome(); } });

document.getElementById('scriptToggle').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  script=b.dataset.script;
  localStorage.setItem('rimoteka_script', script);
  document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
  // ponovo iscrtaj sve što je prikazano
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
  renderFavorites();
  renderKlasici();
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
  await loadLocalDefs();  // učitaj lokalni rečnik definicija tek kada zatreba
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

/* ====================== KLASICI (javno vlasništvo) ====================== */
const POEMS = [
  { title:'Емина', author:'Алекса Шантић', years:'1868–1924',
    text:`Синоћ, кад се вратих из топла хамама,
Прођох покрај баште старога имама;
Кад тамо, у башти, у хладу јасмина,
С ибриком у руци стајаше Емина.

Ја каква је, пуста! Тако ми имана,
Стид је не би било да је код султана!
Па још кад се шеће и плећима креће...
- Ни хоџин ми запис више помоћ неће!...

Ја јој назвах селам. Ал' мога ми дина,
Не шће ни да чује лијепа Емина,
Но у сребрен ибрик захитила воде
Па по башти ђуле заливати оде;

С грана вјетар духну па низ плећи пусте
Расплете јој оне плетенице густе,
Замириса коса ко зумбули плави,
А мени се крену бурурет у глави!

Мало не посрнух, мојега ми дина,
Но мени не дође лијепа Емина.
Само ме је једном погледала мрко,
Нити хаје, алчак, што за њоме црко'!...` },

  { title:'Међу јавом и мед сном', author:'Лаза Костић', years:'1841–1910',
    text:`Срце моје самохрано,
ко те дозва у мој дом?
Неуморна плетисанко,
што плетиво плетеш танко
међу јавом и мед сном.

Срце моје, срце лудо,
шта ти мислиш са плетивом?
К'о плетиља она стара,
дан што плете, ноћ опара,
међу јавом и мед сном.

Срце моје, срце кивно,
убио те живи гром!
Што се не даш мени живу
разабрати у плетиву
међу јавом и мед сном!` },

  { title:'Вече', author:'Ђура Јакшић', years:'1832–1878',
    text:`Као златне токе, крвљу покапане,
Доле пада сунце за гору, за гране.

И све немо ћути, не миче се ништа,
Та најбољи витез паде са бојишта!

У срцу се живот застрашеном таји,
Само ветар хуји... То су уздисаји...

А славуји тихо уз песмицу жале,
Не би ли им хладне стене заплакале.

Немо поток бежи — ко зна куда тежи!
Можда гробу своме — мору хлађаноме?

Све у мртвом сану мрка поноћ нађе;
Све је изумрло. Сад месец изађе...

Смртно бледа лица, горе небу лети:
Погинули витез ено се посвети!...` },

  { title:'Пачија школа', author:'Јован Јовановић Змај', years:'1833–1904',
    text:`Јесте л' чули, кумо,
Верујте, без шале -
Отвара се школа
За пачиће мале.

Тако је и било,
Верујте, без шале -
Отворила се школа
За пачиће мале.

Сви пачићи дошли,
На скамијам' стоје;
Стари патак метно
Наочаре своје.

Све их је уписо
У каталог, мале,
Па их је прозиво -
Верујте, без шале.

Па се онда шето
С озбиљношћу крутом;
Учио их, учио
И књигом и прутом.

Учио их, учио
Од среде до петка,
Ал' се нису одмакли
Даље од почетка.

Није било успеха
Учитељском труду,
Цела мука његова
Остаде залуду.

Ништа више не научи
Пачурлија та,
Него што је и пре знала:
Га, га, га, га, га!` },

  { title:'Јабланови', author:'Јован Дучић', years:'1874–1943',
    text:`Зашто ноћас тако шуме јабланови,
Тако страсно, чудно? Зашто тако шуме?
Жути месец споро залази за хуме,
Далеке и црне, ко слутње; и снови

У тој мртвој ноћи пали су на воду,
Ко олово мирну и сиву, у мраку.
Јабланови само високо у зраку
Шуме, шуме чудно, и дрхћу у своду.

Сам, крај мирне воде, у ноћи, ја стојим
Ко потоњи човек. Земљом према, мени,
Лежи моја сенка. Ја се ноћас бојим
Себе, и ја стрепим сам од своје сени.` },

  { title:'Можда спава', author:'Владислав Петковић Дис', years:'1880–1917',
    text:`Заборавио сам јутрос песму једну ја.
Песму једну у сну што сам сву ноћ слушао:
Да је чујем узалуд сам данас кушао,
Као да је песма била срећа моја сва.
Заборавио сам јутрос песму једну ја.

У сну своме нисам знао за буђења моћ,
И да земљи треба сунца, јутра и зоре;
Да у дану губе звезде беле одоре;
Бледи месец да се креће у умрлу ноћ.
У сну своме нисам знао за буђења моћ.

Ја сад једва могу знати да имадох сан.
И у њему очи неке, небо нечије,
Неко лице не знам какво, можда дечије,
Стару песму, старе звезде, неки стари дан,
Ја сад једва могу знати да имадох сан.

Не сећам се ничег више, ни очију тих:
Као да је сан ми цео био од пене,
Ил' те очи да су моја душа ван мене;
Ни арије, ни свег другог, што ја ноћас сних:
Не сећам се ничег више, ни очију тих.

Али слутим, а слутити још једино знам.
Ја сад слутим за те очи да су баш оне
Што ме чудно по животу воде и гоне:
У сну дођу да ме виде шта ли радим сам.
Али слутим, а слутити још једино знам.

Да ме виде, дођу очи, и ја видим тад
И те очи, и ту љубав, и тај пут среће;
Њене очи, њено лице, њено пролеће
У сну видим, али не знам што не видим сад.
Да ме виде, дођу очи, и ја видим тад.

Њену главу с круном косе и у коси цвет,
И њен поглед што ме гледа као из цвећа,
Што ме гледа, што ми каже да ме осећа,
Што ми брижно пружа одмор и нежности свет,
Њену главу с круном косе и у коси цвет.

Ја сад немам своју драгу, и њен не знам глас;
Не знам место на ком живи или почива;
Не знам зашто њу и сан ми јава покрива;
Можда спава, и гроб тужно негује јој стас,
Ја сад немам своју драгу, и њен не знам глас.

Можда спава са очима изван сваког зла,
Изван ствари, илузија, изван живота,
И с њом спава, невиђена, њена лепота;
Можда живи и доћи ће после овог сна.
Можда спава са очима изван сваког зла.` }
];

const SCHEME_NAMES = {
  'AA':'parna (kupletna) rima',
  'AABB':'parna (kupletna) rima',
  'ABAB':'ukrštena rima',
  'ABBA':'obgrljena rima',
  'AAAA':'monorima'
};

function dispPoem(cyrText){ return script==='cyr' ? cyrText : toLatin(cyrText); }
function poemLastWord(line){
  const toks = toLatin(line.toLowerCase()).replace(/[^a-zčćžšđ\s]/g,' ').split(/\s+/).filter(Boolean);
  return toks.length ? toks[toks.length-1] : '';
}

function renderKlasici(){
  const box = document.getElementById('klasiciList');
  if(!box) return;
  box.innerHTML='';
  POEMS.forEach(p=>{
    const card = document.createElement('div');
    card.className='poem-card';
    card.innerHTML =
      `<div class="poem-head">`
      + `<span class="poem-title">${escapeHtml(dispPoem(p.title))}</span>`
      + `<span class="poem-meta">${escapeHtml(dispPoem(p.author))} · ${p.years}</span>`
      + `<span class="pd-badge" title="slobodno za objavljivanje — autor preminuo pre više od 70 godina">javno vlasništvo</span>`
      + `</div>`;
    const body = document.createElement('div'); body.className='poem-body';
    let firstScheme = '';
    p.text.split(/\n\s*\n/).forEach(st=>{
      const lines = st.split('\n').filter(l=>l.length);
      const keyToLetter = new Map(); let next=0;
      const letters = lines.map(l=>{
        const word = poemLastWord(l);
        if(!word) return '';
        const k = rhymeKey(word);
        if(!keyToLetter.has(k)) keyToLetter.set(k, String.fromCharCode(65 + (next++ % 26)));
        return keyToLetter.get(k);
      });
      if(!firstScheme) firstScheme = letters.join('');
      const stanza = document.createElement('div'); stanza.className='stanza';
      lines.forEach((l,idx)=>{
        const word = poemLastWord(l);
        const v = document.createElement('div'); v.className='verse';
        v.innerHTML =
          `<span class="vsyl" title="slogova u stihu">${lineSyllables(l)}</span>`
          + `<span class="vtext">${escapeHtml(dispPoem(l))}</span>`
          + `<span class="vrhyme" data-w="${escapeHtml(word)}" title="nađi rime za „${escapeHtml(word)}“">${letters[idx]||''}</span>`;
        stanza.appendChild(v);
      });
      body.appendChild(stanza);
    });
    card.appendChild(body);
    const foot = document.createElement('div'); foot.className='poem-foot';
    const nm = SCHEME_NAMES[firstScheme];
    foot.innerHTML = `<span class="poem-scheme">Šema rime (1. strofa): <b>${firstScheme||'—'}</b>${nm?' · '+nm:''}</span> · `;
    const btn = document.createElement('button'); btn.className='link-btn'; btn.textContent='prebaci u brojač slogova';
    btn.onclick = ()=>{ sylInput.value = dispPoem(p.text); sylInput.dispatchEvent(new Event('input')); switchTab('slogovi'); window.scrollTo({top:0,behavior:'smooth'}); };
    foot.appendChild(btn);
    card.appendChild(foot);
    box.appendChild(card);
  });
  box.querySelectorAll('.vrhyme').forEach(b=>{
    if(!b.dataset.w) return;
    b.style.cursor='pointer';
    b.onclick = ()=>{ rimeInput.value = disp(b.dataset.w); switchTab('rime'); window.scrollTo({top:0,behavior:'smooth'}); doRhymes(); };
  });
}

/* ====================== DARK MODE ====================== */
const darkToggle = document.getElementById('darkToggle');
function applyDarkIcon(){
  darkToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
darkToggle.onclick = ()=>{
  document.body.classList.toggle('dark-mode');
  const dark = document.body.classList.contains('dark-mode');
  localStorage.setItem('rimoteka_dark', dark ? '1' : '0');
  applyDarkIcon();
};
applyDarkIcon();

/* ====================== START ====================== */
document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
updateFavCount();
renderFavorites();
renderGutter();
updateNoteStats();
renderKlasici();
function initFromURL(){
  try{
    const params = new URLSearchParams(window.location.search);
    const p = params.get('rec');
    if(p && p.trim()){
      rimeInput.value = disp(p.trim().toLowerCase());
      switchTab('rime');
      doRhymes();
      return true;
    }
    const tab = params.get('tab');
    if(tab && ['rime','pretraga','slogovi','beleznica','klasici','omiljene'].includes(tab)){
      switchTab(tab);
      return true;
    }
  }catch(e){}
  return false;
}
/* ====================== PRO MODAL ====================== */
const proModal = document.getElementById('proModal');
const proToggle = document.getElementById('proToggle');
const proClose = document.getElementById('proClose');
const proSubscribe = document.getElementById('proSubscribe');
const proDonate = document.getElementById('proDonate');

proToggle.onclick = () => { proModal.classList.add('show'); };
proClose.onclick = () => { proModal.classList.remove('show'); };
proModal.onclick = (e) => { if(e.target === proModal) proModal.classList.remove('show'); };
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') proModal.classList.remove('show'); });

proSubscribe.onclick = () => {
  // TODO: povezati sa Stripe/PayPal kada bude spremno
  toast('Pro uskoro dostupan — prijavi se za raniji pristup!');
  proModal.classList.remove('show');
};
proDonate.onclick = () => {
  // TODO: povezati sa Buy Me a Coffee / PayPal
  window.open('https://buymeacoffee.com/rimoteka', '_blank');
  proModal.classList.remove('show');
};

loadDict().then(()=>{ if(!initFromURL()) rimeInput.focus(); });
