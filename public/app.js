'use strict';

/* ============ SIGURNOSNA MREŽA ZA UČITAVANJE REČNIKA ============
 * Ako bilo koja UI sekcija ispod pukne (npr. dugme obrisano iz HTML-a, a
 * kod ga i dalje traži), izvršavanje skripte se prekida i bootstrap na
 * kraju fajla se NIKAD ne pozove — rečnik ostane prazan i sajt "visi" na
 * "Učitavam rečnik...". Tako je 26.07.2026. ceo sajt bio oboren jednom
 * jedinom greškom (proToggle je bio zakomentarisan u index.html).
 * Ovaj tajmer se izvršava iz event petlje, dakle i kad skripta pukne,
 * pa rime rade čak i ako je nešto drugo polomljeno.
 * ================================================================ */
let BOOTED = false;
setTimeout(() => {
  if (BOOTED) return;
  console.warn('[Rimoteka] Bootstrap nije stigao do kraja skripte — pokrećem rečnik iz sigurnosne mreže.');
  try { bootstrap(); } catch (e) { console.error('[Rimoteka] Sigurnosna mreža nije uspela:', e); }
}, 0);

/* ============ BEZBEDAN PRAZAN ELEMENT ============
 * `app.js` se koristi i na stranama koje NEMAJU sve elemente (npr.
 * /rimovanje-reci/ ima samo alat za rime, bez tabova, beležnice i igre).
 * Bez ovoga bi prvi nedostajući element oborio celu skriptu — tačno ono što
 * je 26.07.2026. oborilo sajt. `el('id')` vraća pravi element ako postoji, a
 * inače bezopasan objekat nad kojim sve operacije prolaze bez efekta.
 * VAŽNO: `el()` NIKAD ne vraća null, pa se ne sme koristiti tamo gde kod
 * proverava `if (element)` da bi odlučio da li nešto uraditi — za takva
 * mesta ostaje običan `document.getElementById`.
 * ================================================== */
const NOOP_EL = {
  addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
  appendChild(x){ return x; }, removeChild(x){ return x; }, remove(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  closest(){ return null; }, contains(){ return false; },
  getBoundingClientRect(){ return {width:0,height:0,top:0,left:0,right:0,bottom:0}; },
  scrollIntoView(){}, setAttribute(){}, getAttribute(){ return null; },
  classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  style:{}, dataset:{},
  value:'', textContent:'', innerText:'', innerHTML:'', placeholder:'', title:'',
  checked:false, disabled:false, hidden:false, scrollTop:0, scrollHeight:0,
  isContentEditable:false, parentNode:null, onclick:null, oninput:null, onchange:null,
  childNodes:[], children:[], firstChild:null, lastChild:null, nodeType:1, nodeName:'DIV',
  __noop:true
};
function el(id){ return document.getElementById(id) || NOOP_EL; }

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
const LAT2CYR_U = {};
for(const k in LAT2CYR) LAT2CYR_U[k.toUpperCase()] = LAT2CYR[k].toUpperCase();
const DIGRAPH2CYR = { 'dž':'џ','Dž':'Џ','DŽ':'Џ','lj':'љ','Lj':'Љ','LJ':'Љ','nj':'њ','Nj':'Њ','NJ':'Њ' };
function toCyr(s){
  return s
    .replace(/dž|Dž|DŽ|lj|Lj|LJ|nj|Nj|NJ/g, m => DIGRAPH2CYR[m])
    .replace(/[a-zA-ZđžćčšĐŽĆČŠ]/g, ch =>
      LAT2CYR[ch] !== undefined ? LAT2CYR[ch] :
      (LAT2CYR_U[ch] !== undefined ? LAT2CYR_U[ch] : ch));
}

/* ====================== Stanje ====================== */
let WORDS = [];          // sve reči (ekavske + ijekavske na kraju), latinica
let KEYS = [];           // jak ključ rime za svaku reč
let RANK = new Map();    // reč -> indeks (manji = češća)
let SET = new Set();     // za brzu proveru postojanja
let jekStart = 0;        // indeks od kog počinju ijekavske reči
let SYNONYMS = {};       // sinonimi iz sinonimi.json (učitavaju se u pozadini)
const DEFS = new Map();  // ručno pisana srpska objašnjenja (Rimoteka)
let includeJek = localStorage.getItem('rimoteka_jekavica') === '1';
let script = localStorage.getItem('rimoteka_script') || 'lat';
let favorites = JSON.parse(localStorage.getItem('rimoteka_favorites') || '[]');

const VOWELS = new Set(['a','e','i','o','u']);

/* Reči koje se NE prikazuju kao rime (neprikladne, vulgarnosti, anatomija) */
const BLOCKED = new Set(['dupe','guzica','guzice','govno','govna','sranje','srao','serem','sere','picka','picku','pice','kurac','kurca','kura','dupeta','dubre','dubretar','pisaju','pisao','pisa','guz','guzi','guziti','seronja','seronje','pickica','pickice','kurvetina','kurvetine','jebem','jebi','jebanje','jebeno','jebeni','jebena','jebalo','jebaci','jebac','krvavo','krvavi','krvava','govnar','govnari','smece','smetlar','smetlarka']);

/* Dečji režim — dodatne reči koje nisu pogodne za decu (seksualne, nasilne, psihološki teške) */
const KIDS_BLOCKED = new Set([
  // seksualne
  'seks','seksualan','seksualnost','erotika','erotičan','pornografija','pornografski','orgazam','orgazmičan','masturbacija','masturbirati','prostitucija','prostituirati','bordel','bordeli','kurva','kurve','kurvati','jebačina','jebačine','jebački','jebačkima','sperma','spermijum','vagina','vagine','vaginalan','penis','penisi','penisalan','klitoris','klitorisi','testis','testisi','skrotum','skrotumi','anus','anusi','analni','fela','felacija','felacije','kondom','kondomi','kontracepcija','kontraceptiv','abortus','abortirati','abortirano','silovanje','silovati','silovano','nasilje','nasilnik','nasilnici','pedofilija','pedofil','pedofili','incest','incestalan','bestijalnost','bestijalan','nekrofilija','nekrofil','nekrofili',
  // nasilne / psihološki teške
  'ubistvo','ubiti','ubijen','ubijena','ubice','ubicama','ubojstvo','ubojiti','ubojica','ubojice','masakr','masakrirati','genocid','genocidni','rat','ratovi','ratni','ratnik','ratnici','ratovanje','bombardovanje','bombardovati','eksplozija','eksplozije','eksplozivan','granata','granate','minomet','minometi','snajper','snajperi','snajperist','terorizam','terorista','teroristi','teroristički','samoubistvo','suicid','suicidni','samoubica','samoubice','mrtav','mrtva','mrtvi','mrtvilo','mrtvila','mrtvački','mrtvačnica','mrtvačnice','groblje','groblja','grobljanski','kletva','kletve','kleti','prokletstvo','prokletstva','proklet','prokleta','prokleti','đavo','đavoli','đavolji','demon','demoni','demonski','sotona','sotone','pakao','pakleni','paklena','pakleno'
]);

/* Kontekstualna isključenja: za određenu reč NE prikazuj određene rime (semantika, a ne vulgarnost) */
const RHYME_EXCLUSIONS = {
  'dete': new Set(['bidete','bide','bidi'])
};

// Provera da li je reč neprikladna za decu
function isKidsBlocked(w){
  return KIDS_BLOCKED.has(w);
}

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
  defsPromise = fetch('/definicije.json?v=230')
    .then(r => r.ok ? r.json() : {})
    .then(defs => {
      for(const k in defs) DEFS.set(k, defs[k]);
    })
    .catch(() => {});
  return defsPromise;
}

async function loadDict(){
  // Prvo učitaj samo rečnik (mali, brz) — rime rade odmah
  const [ek, jek] = await Promise.all([
    fetch('/reci.txt?v=20260727').then(r=>r.text()),
    fetch('/reci_jekavica.txt?v=20260726').then(r=>r.text()).catch(()=> '')
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
  // Zatim učitaj frekvenciju i sinonime u pozadini — ne blokiraju rime
  loadExtras();
}

// Lazy load frekvencije i sinonima — ne blokira rime
async function loadExtras(){
  try{
    const [freqRes, synRes] = await Promise.all([
      fetch('/frekvencija.json?v=1').then(r=>r.json()).catch(()=> ({})),
      fetch('/sinonimi.json?v=1').then(r=>r.json()).catch(()=> ({}))
    ]);
    SYNONYMS = synRes;
    // Ažuriraj rangiranje sa frekvencijom.
    // NAPOMENA: NE koristiti Math.max(...Object.values(freqRes)) — frekvencija.json
    // ima ~435.000 reči, a spread toliko argumenata obara stek
    // (RangeError: Maximum call stack size exceeded) i ceo blok padne u catch,
    // pa rangiranje i sinonimi tiho prestanu da rade. Zato obična petlja.
    for(let i=0;i<WORDS.length;i++){
      const w = WORDS[i];
      const freq = freqRes[w] || 0;
      // Reči sa frekvencijom idu prve (negativan rang, češće = manje).
      // Reči bez frekvencije zadržavaju originalni redosled iz reci.txt (rang i >= 0),
      // pa ijekavske ostaju na kraju kao i do sada.
      RANK.set(w, freq > 0 ? -freq : i);
    }
  }catch(e){
    console.warn('Extras nisu učitani:', e);
  }
}

// Lazy load definicija — ne blokira učitavanje stranice
let defsLoaded = false;
async function loadDefs(){
  if(defsLoaded) return;
  defsLoaded = true;
  try{
    const res = await fetch('/definicije.json?v=230');
    const defs = await res.json();
    // Ažuriraj rangiranje sa definicijama
    for(let i=0;i<WORDS.length;i++){
      const w = WORDS[i];
      const hasDef = defs[w] && !defs[w].startsWith('Oblik');
      if(hasDef) RANK.set(w, i);
    }
  }catch(e){
    console.warn('Definicije nisu učitane:', e);
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

/* Legenda — objašnjava šta znače broj i ikonice na svakoj rimi.
   Bez nje korisnik vidi „usvajanje (4)" i tri sitne ikonice bez objašnjenja.
   Na telefonu nema prelaska mišem, pa `title` atributi ne pomažu — jedini
   način je da bude napisano. Prikazuje se samo kad ima rezultata. */
function renderLegend(container){
  const l = document.createElement('div');
  l.className = 'res-legend';
  l.innerHTML =
    '<span class="legend-item"><span class="syl">2</span> broj slogova</span>' +
    '<span class="legend-item"><span class="legend-ic">\u24D8</span> zna\u010denje re\u010di</span>' +
    '<span class="legend-item"><span class="legend-ic">\u2661</span> sa\u010duvaj u \u201eOmiljene\u201c</span>' +
    '<span class="legend-item"><span class="legend-ic">\u{1F501}</span> na\u0111i rime za tu re\u010d</span>' +
    '<span class="legend-item legend-tap">klikni na re\u010d da je kopira\u0161</span>';
  container.appendChild(l);
}

/* Sinonimi — zasebna, vizuelno izdvojena kartica.
   Ranije su bili obična grupa na DNU liste, ispod stotinu rima, pa se
   praktično nisu videli. Sinonimi su prednost koju konkurencija nema, zato
   idu odmah ispod najboljih rima, jasno označeni. */
function renderSynonyms(container, word, syns){
  if(!syns.length) return;
  const card = document.createElement('section');
  card.className = 'syn-card';
  const h = document.createElement('h3');
  h.className = 'syn-title';
  h.innerHTML = '<span class="syn-badge">sinonimi</span> Druge re\u010di za \u201e' + disp(word) + '\u201c';
  const hint = document.createElement('p');
  hint.className = 'syn-hint';
  hint.textContent = 'Kad rima ne odgovara po smislu \u2014 zameni re\u010d na kraju stiha i potra\u017ei rime za nju.';
  const wrap = document.createElement('div');
  wrap.className = 'results';
  syns.forEach(w => wrap.appendChild(makeChip(w)));
  card.appendChild(h); card.appendChild(hint); card.appendChild(wrap);
  container.appendChild(card);
}

/* Bedž sa nizom tačnih odgovora u igri — vizuelna nagrada. */
function renderCombo(){
  const b = el('gameComboBadge');
  if(b.__noop) return;
  if(gameCombo >= 2){ b.hidden = false; b.textContent = '\u{1F525} ' + gameCombo + ' u nizu'; }
  else { b.hidden = true; }
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
const rimeInput = el('rimeInput');
let rimeSyl = 0;
let loose = false;
let lastTrackedRhyme = '';   // GA4: da isti pojam ne šalje event na svaki filter-klik

function filterSyl(arr){
  if(!rimeSyl) return arr;
  if(rimeSyl===5) return arr.filter(w=>syllables(w)>=5);
  return arr.filter(w=>syllables(w)===rimeSyl);
}

function doRhymes(silent){
  hideAutocomplete();
  const raw = rimeInput.value.trim().toLowerCase();
  const q = toLatin(raw).replace(/[^a-zčćžšđ]/g,'');
  const box = el('rimeResults');
  box.innerHTML='';
  if(q.length<2){ box.innerHTML='<p class="empty">Upiši reč (bar dva slova).</p>'; return; }
  if(WORDS.length === 0){ box.innerHTML='<p class="empty">Učitavam rečnik…</p>'; return; }

  // sinhronizuj URL sa trenutnom pretragom (samo ako nije silent — beležnica ne sme da dira URL)
  if(!silent){
    try{ const u=new URL(window.location.href); u.searchParams.set('rec', q); history.replaceState(null,'',u); }catch(e){}
  }

  const key = rhymeKey(q);
  const keyLen = key.length;
  const excluded = RHYME_EXCLUSIONS[q] || new Set();
  const limit = includeJek ? WORDS.length : jekStart;
  const strong = [];
  for(let i=0;i<limit;i++){
    const w = WORDS[i];
    if(BLOCKED.has(w) || excluded.has(w) || (kidsMode && isKidsBlocked(w))) continue;
    if(KEYS[i]===key && w!==q) strong.push(w);
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
      if(BLOCKED.has(w) || excluded.has(w) || (kidsMode && isKidsBlocked(w)) || seen.has(w)) continue;
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
  if(best.length || good.length || finalExtra.length) renderLegend(box);
  renderGroup(box, best.length?'Najbolje rime':'', best, true);

  // Sinonimi idu ODMAH ispod najboljih rima — vidljivo, a rime i dalje prve.
  const syns = SYNONYMS[q] || [];
  if(syns.length > 0){
    renderSynonyms(box, q, syns.slice(0, 20));
  }

  renderGroup(box, good.length?'Dobre rime':'', good, false);
  renderGroup(box, finalExtra.length?'Dobre rime (isti završni slog)':'', finalExtra, false);

  // GA4: zabeleži jedinstvenu pretragu rime (samo ako nije silent)
  if(!silent && q !== lastTrackedRhyme){
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
      if(BLOCKED.has(w) || excluded.has(w) || (kidsMode && isKidsBlocked(w)) || w===q || seen.has(w)) continue;
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

el('rimeBtn').onclick = doRhymes;
rimeInput.addEventListener('keydown', e=>{ if(e.key==='Enter') doRhymes(); });
el('rimeSyl').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#rimeSyl button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); rimeSyl=+b.dataset.syl; if(rimeInput.value.trim()) doRhymes();
});
el('looseToggle').addEventListener('change', e=>{ loose=e.target.checked; if(rimeInput.value.trim()) doRhymes(); });
const jekToggle = el('jekToggle');
jekToggle.checked = includeJek;
jekToggle.addEventListener('change', e=>{
  includeJek = e.target.checked;
  localStorage.setItem('rimoteka_jekavica', includeJek ? '1' : '0');
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
});
// Dečji režim — filtrira neprikladne reči za decu
let kidsMode = localStorage.getItem('rimoteka_kids') === '1';
const kidsToggle = el('kidsToggle');
kidsToggle.checked = kidsMode;
kidsToggle.addEventListener('change', e=>{
  kidsMode = e.target.checked;
  localStorage.setItem('rimoteka_kids', kidsMode ? '1' : '0');
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
});
/* ============ POZNATE REČI (za kockicu i igru) ============
 * Nasumičan izbor iz celog rečnika daje uglavnom arhaične i nepoznate
 * oblike ("praotaca") — kockica i igra su zbog toga bile neupotrebljive.
 * Kad se frekvencija učita (RANK < 0 = reč ima frekvenciju), gradimo
 * bazen najčešćih reči i biramo iz njega. Dok frekvencija ne stigne,
 * fallback je ceo rečnik, pa ništa ne čeka.
 * ========================================================== */
const COMMON_POOL_SIZE = 8000;
let commonPool = null;
function getCommonPool(){
  if(commonPool) return commonPool;
  const sa = [];
  for(const w of WORDS){
    const r = RANK.get(w);
    if(r !== undefined && r < 0 && syllables(w) >= 2 && w.length >= 3) sa.push(w);
  }
  if(sa.length < 500) return null;          // frekvencija još nije učitana
  sa.sort((a,b) => RANK.get(a) - RANK.get(b));
  commonPool = sa.slice(0, COMMON_POOL_SIZE);
  return commonPool;
}
function randomCommonWord(extraFilter){
  const pool = getCommonPool() || WORDS;
  for(let t=0;t<60;t++){
    const w = pool[Math.floor(Math.random()*pool.length)];
    if(!w || syllables(w) < 2 || w.length < 3) continue;
    if(extraFilter && !extraFilter(w)) continue;
    return w;
  }
  return null;
}

el('randomBtn').onclick = ()=>{
  const w = randomCommonWord();
  if(w){ rimeInput.value = disp(w); doRhymes(); }
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
const searchInput = el('searchInput');
let searchSyl = 0;
function doSearch(){
  const mode = el('searchMode').value;
  const q = toLatin(searchInput.value.trim().toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
  const box = el('searchResults');
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
el('searchBtn').onclick = doSearch;
searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
const searchMode = el('searchMode');
function updateSearchPlaceholder(){
  const ph = { ends:'npr. ica, ama, ost', starts:'npr. cvet, svet, mesec', contains:'npr. cvet, zvezd, ljub' };
  searchInput.placeholder = ph[searchMode.value] || '';
}
searchMode.addEventListener('change', ()=>{ updateSearchPlaceholder(); if(searchInput.value.trim()) doSearch(); });
updateSearchPlaceholder();
el('searchSyl').addEventListener('click', e=>{
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
const sylInput = el('sylInput');
sylInput.addEventListener('input', ()=>{
  const out = el('sylOutput');
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
const noteInput = el('noteInput');
const noteEditor = el('noteEditor');
const noteGutter = el('noteGutter');
const noteTitle = el('noteTitle');

// Naslov pesme — opciono, čuva se uz pesmu; koristi se u PDF/TXT/deljenju
noteTitle.value = localStorage.getItem('rimoteka_notes_title') || '';
noteTitle.addEventListener('input', () => {
  localStorage.setItem('rimoteka_notes_title', noteTitle.value);
});
function getPoemTitle(){ return noteTitle.value.trim(); }

// Paleta boja za rimske grupe (dovoljno različite, čitljive na svetloj i tamnoj pozadini)
const RHYME_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#d35400', '#c0392b', '#16a085',
  '#8e44ad', '#2980b9', '#27ae60', '#f1c40f', '#e91e63',
  '#00bcd4', '#4caf50', '#ff9800', '#673ab7', '#009688'
];

// Sonantnosna tolerancija za bojenje: završni suglasnik se pred izgovorom
// ogusi (grad izgovaramo "grat"), pa bojimo i takve parove — i dalje savršena
// rima za uho, samo tolerantna na pravopis. NE looseKey (asonanca) — odobreno.
// (Mora biti IZNAD init bloka — init odmah poziva analyzeRhymes.)
const DEVOICED = { 'd':'t','b':'p','g':'k','z':'s','ž':'š' };
function lenientRhymeKey(w){
  const k = rhymeKey(w);
  const last = k[k.length-1];
  return DEVOICED[last] ? k.slice(0,-1) + DEVOICED[last] : k;
}

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
// Deterministička serijalizacija: innerText gubi <br> na kraju (Chrome quirk),
// pa bi re-render "pojeo" prelom reda — zato sami hodamo po DOM-u.
function getEditorText(){
  let out = '';
  const walk = (node) => {
    node.childNodes.forEach(child => {
      if(child.nodeType === Node.TEXT_NODE) out += child.data;
      else if(child.nodeName === 'BR'){
        // pomoćni <br> za kursor (iOS fix) nije deo teksta
        if(!child.classList.contains('cursor-br')) out += '\n';
      }
      else walk(child);
    });
  };
  walk(noteEditor);
  return out;
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
    // strogo <: pozicija tačno na kraju text node-a ide u SLEDEĆI text node
    // (offset 0) — inače bi kursor ostao ispred <br> preloma i unos bi se spajao
    if(pos < nextCount){
      range.setStart(node, pos - charCount);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    charCount = nextCount;
  }
  // ako nismo našli, kursor je na kraju teksta
  // Ako se editor završava na <br>, kursor ne sme direktno posle njega
  // (browser ga klampuje ispred preloma → sledeći unos se spaja u prethodni red).
  // Rešenje: pomoćni <br> za kursor, pa kursor između njih dvaju.
  let last = null;
  for(let i = noteEditor.childNodes.length - 1; i >= 0; i--){
    const c = noteEditor.childNodes[i];
    if(c.nodeType === Node.TEXT_NODE && c.data === '') continue;
    if(c.nodeName === 'BR' && c.classList.contains('cursor-br')) continue;
    last = c; break;
  }
  if(last && last.nodeName === 'BR'){
    let cb = last.nextSibling;
    if(!(cb && cb.nodeName === 'BR' && cb.classList.contains('cursor-br'))){
      cb = document.createElement('br');
      cb.className = 'cursor-br';
      last.after(cb);
    }
    range.setStartBefore(cb);
  } else {
    range.selectNodeContents(noteEditor);
    range.collapse(false);
  }
  range.collapse(true);
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
  // grupiši po rhymeKey uz sonantnosnu toleranciju — savršena rima po izgovoru
  const groups = new Map();
  lastWords.forEach((word, idx) => {
    if(!word || word.length < 2) return;
    const key = lenientRhymeKey(word);
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

// Dva debounce-a: brzi (čuvanje/gutter/statistika/rime — ne dira DOM editora)
// i sporiji (bojenje rima — innerHTML rewrite tek kad korisnik zastane sa kucanjem,
// da re-render ne jede prelome redova usred kucanja)
let editorUiTimer = null;
let editorColorTimer = null;
function scheduleEditorUpdate(){
  clearTimeout(editorUiTimer);
  editorUiTimer = setTimeout(() => {
    const text = getEditorText();
    noteInput.value = text;
    localStorage.setItem('rimoteka_notes', text);
    renderGutter();
    updateNoteStats();
    renderNoteRhymes();
  }, 150);
  clearTimeout(editorColorTimer);
  editorColorTimer = setTimeout(() => {
    const pos = saveCursorPosition();
    const text = getEditorText();
    // renderuj sa bojama samo ako ima rimskih grupa
    const { colorMap } = analyzeRhymes(text);
    if(colorMap.size > 0){
      noteEditor.innerHTML = renderColoredText(text);
      restoreCursorPosition(pos);
    }
  }, 500);
}

// Event listeneri
noteEditor.addEventListener('input', scheduleEditorUpdate);
noteEditor.addEventListener('scroll', () => { noteGutter.scrollTop = noteEditor.scrollTop; });
noteEditor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
});

// iOS Safari fix — Enter ne radi u contenteditable nakon renderovanja HTML-a
noteEditor.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    e.preventDefault();
    // Ručno insertujemo <br> da bi Enter radio na iOS
    const sel = window.getSelection();
    if(sel.rangeCount > 0){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const br = document.createElement('br');
      range.insertNode(br);
      // Kursor ne ume da stoji posle ZAVRŠNOG <br>-a — browser ga vrati ispred,
      // pa bi sledeće kucanje i sledeći Enter išli PRE preloma (redovi se spajaju).
      // Napomena: insertNode podeli text node, pa iza br često ostane prazan
      // text node — zato proveravamo da iza br nema SADRŽAJA, ne lastChild.
      let atEnd = true;
      for(let n = br.nextSibling; n; n = n.nextSibling){
        if(n.nodeType !== Node.TEXT_NODE || n.data !== ''){ atEnd = false; break; }
      }
      if(atEnd){
        const cursorBr = document.createElement('br');
        cursorBr.className = 'cursor-br';
        br.after(cursorBr);
      }
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    scheduleEditorUpdate();
  }
});

// Rime prate kursor — klik mišem ili strelice prebacuju ciljnu reč
let caretTimer = null;
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if(sel.rangeCount === 0 || !noteEditor.contains(sel.getRangeAt(0).startContainer)) return;
  clearTimeout(caretTimer);
  caretTimer = setTimeout(renderNoteRhymes, 120);
});

el('clearNotes').onclick = () => {
  if(confirm('Obrisati celu belešku?')){
    setEditorText('');
    noteInput.value = '';
    noteTitle.value = '';
    localStorage.removeItem('rimoteka_notes');
    localStorage.removeItem('rimoteka_notes_title');
    renderGutter();
    updateNoteStats();
    renderNoteRhymes();
  }
};

/* Štampa / PDF — browser-ov print dijalog uz print CSS koji prikazuje samo pesmu.
   Naslov dolazi iz opcionog polja; ako je prazno, štampamo bez naslova (bez nagađanja). */
el('printPoem').onclick = () => {
  const text = getEditorText();
  if(!text.trim()){ toast('Beležnica je prazna.'); return; }
  const title = getPoemTitle();
  el('printArea').innerHTML =
    (title ? `<h1>${escapeHtml(title)}</h1>` : '') +
    text.split('\n').map(l => `<p>${escapeHtml(l) || '&nbsp;'}</p>`).join('');
  window.print();
};

/* Deljenje pesme linkom — tekst se kodira u ?pesma= parametar (base64url) */
function encodePoem(text){
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodePoem(s){
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}
el('sharePoem').onclick = () => {
  const text = getEditorText();
  if(!text.trim()){ toast('Beležnica je prazna.'); return; }
  if(text.length > 1800){ toast('Pesma je predugačka za link (do ~1800 znakova).'); return; }
  const url = location.origin + location.pathname + '?pesma=' + encodePoem(text) +
    (getPoemTitle() ? '&naslov=' + encodeURIComponent(getPoemTitle()) : '');
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>toast('Link kopiran — slobodno ga podeli!')).catch(()=>prompt('Kopiraj link:', url));
  } else {
    prompt('Kopiraj link:', url);
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
  const stats = el('noteStats');
  if(!text.trim()){ stats.textContent = ''; return; }
  const lines = text.split('\n').filter(l=>l.trim()).length;
  const words = (text.trim().match(/\S+/g)||[]).length;
  const chars = text.length;
  let syl=0; text.split('\n').forEach(l=>{ if(l.trim()) syl += lineSyllables(l); });
  stats.textContent = `${lines} ${lines===1?'red':'redova'} · ${words} reči · ${chars} znakova · ${syl} slogova`;
}

// Rime za reč na kojoj je kursor u beležnici (ranije: uvek poslednja reč)
function getLastWordInLine(line){
  const toks = toLatin(line.toLowerCase()).replace(/[^a-zčćžšđ\s]/g,' ').split(/\s+/).filter(Boolean);
  return toks.length ? toks[toks.length-1] : '';
}

// Pozicija kursora u istim koordinatama kao getEditorText (računajući i <br>)
function getCaretTextPos(){
  const sel = window.getSelection();
  if(sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if(!noteEditor.contains(range.startContainer)) return null;
  let pos = 0, done = false;
  const subtreeLen = (node) => {
    if(node.nodeType === Node.TEXT_NODE) return node.data.length;
    if(node.nodeName === 'BR') return node.classList.contains('cursor-br') ? 0 : 1;
    let n = 0;
    node.childNodes.forEach(c => n += subtreeLen(c));
    return n;
  };
  const walk = (node) => {
    for(let i = 0; i < node.childNodes.length && !done; i++){
      const child = node.childNodes[i];
      if(node === range.startContainer && i === range.startOffset){ done = true; return; }
      if(child === range.startContainer && child.nodeType === Node.TEXT_NODE){
        pos += range.startOffset; done = true; return;
      }
      if(child.contains(range.startContainer)) walk(child);
      else pos += subtreeLen(child);
    }
    if(node === range.startContainer && range.startOffset >= node.childNodes.length) done = true;
  };
  walk(noteEditor);
  return done ? pos : null;
}

// Reč na kojoj stoji kursor, ili poslednja reč pre njega u tom redu
function getWordAtLineCol(line, col){
  const latin = toLatin(line.toLowerCase());
  const re = /[a-zčćžšđ]+/g;
  let m, best = '';
  while((m = re.exec(latin)) !== null){
    if(m.index <= col && col <= m.index + m[0].length) return m[0];
    if(m.index + m[0].length <= col) best = m[0];
    if(m.index > col) break;
  }
  return best;
}

function renderNoteRhymes(){
  const box = el('noteRhymes');
  if(!box) return;
  const text = getEditorText();
  const caret = getCaretTextPos();
  let word = '';
  if(caret != null){
    // linija u kojoj je kursor + kolona
    const before = text.slice(0, caret);
    const ls = before.lastIndexOf('\n') + 1;
    const le = text.indexOf('\n', caret);
    const line = text.slice(ls, le === -1 ? text.length : le);
    word = getWordAtLineCol(line, caret - ls);
    // nema reči u redu pre kursora → poslednja reč prethodne neprazne linije
    if(!word){
      const prev = text.slice(0, ls).split('\n');
      for(let i = prev.length - 1; i >= 0; i--){
        if(prev[i].trim()){ word = getLastWordInLine(prev[i]); break; }
      }
    }
  } else {
    // kursor van editora — stara logika: poslednja neprazna linija
    const lines = text.split('\n');
    for(let i = lines.length - 1; i >= 0; i--){
      if(lines[i].trim()){ word = getLastWordInLine(lines[i]); break; }
    }
  }
  if(!word || word.length < 2){
    box.innerHTML = '';
    return;
  }
  const savedVal = rimeInput.value;
  rimeInput.value = word;
  doRhymes(true);
  rimeInput.value = savedVal;
  const src = el('rimeResults');
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
  doRhymes(true);
  rimeInput.value = savedVal;
  const src = el('rimeResults');
  const chips = src.querySelectorAll('.chip .word');
  const rhymes = [];
  chips.forEach(c => { const t = c.textContent.trim(); if(t) rhymes.push(t); });
  return { word, rhymes };
}
el('saveRhymeList').onclick = () => {
  const { word, rhymes } = getRhymeListForLastWord();
  if(!word || !rhymes.length){ toast('Nema rima za čuvanje'); return; }
  const lists = JSON.parse(localStorage.getItem('rimoteka_lists') || '[]');
  lists.unshift({ word, rhymes, date: new Date().toISOString() });
  localStorage.setItem('rimoteka_lists', JSON.stringify(lists.slice(0, 50)));
  toast(`Sačuvano ${rhymes.length} rima za „${word}"`);
};
el('exportRhymeList').onclick = () => {
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
el('exportPoem').onclick = () => {
  const text = getEditorText();
  if(!text.trim()){ toast('Nema teksta za preuzimanje'); return; }
  const full = getPoemTitle() ? getPoemTitle() + '\n\n' + text : text;
  const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pesma-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Preuzeta pesma');
};

// Inicijalno renderovanje
renderGutter();
updateNoteStats();
renderNoteRhymes();

/* ====================== OMILJENE ====================== */
function updateFavCount(){ el('favCount').textContent = favorites.length; }
function renderFavorites(){
  const box=el('favResults');
  box.innerHTML='';
  if(!favorites.length){ box.innerHTML='<p class="empty">Još nemaš sačuvane reči. Klikni ♥ na bilo kojoj reči.</p>'; return; }
  renderGroup(box, `Tvoje reči (${favorites.length})`, favorites.slice(), false);
}
el('copyFavs').onclick = ()=>{
  if(!favorites.length) return;
  copy(favorites.map(disp).join(', '));
};
el('clearFavs').onclick = ()=>{
  if(favorites.length && confirm('Obrisati sve omiljene reči?')){
    favorites=[]; localStorage.setItem('rimoteka_favorites','[]'); updateFavCount(); renderFavorites();
  }
};

/* ====================== TABOVI / PISMO / TOAST ====================== */
function switchTab(name){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+name));
  if(name === 'igra') initGame();
}
el('tabs').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(b) switchTab(b.dataset.tab);
});

const brandHome = el('brandHome');
function goHome(){ switchTab('rime'); window.scrollTo({top:0, behavior:'smooth'}); }
brandHome.addEventListener('click', goHome);
brandHome.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goHome(); } });

el('scriptToggle').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  script=b.dataset.script;
  localStorage.setItem('rimoteka_script', script);
  document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
  applyScriptToUI();
  // ponovo iscrtaj sve što je prikazano
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
  renderFavorites();
  renderKlasici();
  toast(script === 'cyr' ? 'Све се приказује ћирилицом' : 'Sve se prikazuje latinicom');
});

/* Ćirilica/latinica za CEO interfejs (tabovi, dugmad, labele, placeholderi).
   Konverzija je dvosmerna (toCyr/toLatin sa digrafima lj/nj/dž), pa se
   primenjuje direktno na tekst nodove — bez čuvanja originala. */
const UI_SCRIPT_SELS = [
  '#tabs button', '.flabel', '.syl-filter button', '.loose-toggle',
  '#rimeBtn', '#searchBtn', '#searchMode option', '.hint',
  '.game-setup-label', '#gameStart', '#gameHandoffStart', '.game-handoff-hint',
  '#gameHandoffTitle', '.game-results-title', '#gameAgain', '.game-label',
  '.landing h2', '.landing-faq summary'
];
const UI_SCRIPT_INPUTS = ['rimeInput', 'searchInput', 'sylInput', 'noteTitle'];
function convertTextNodes(root, fn){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n; while((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(t => { if(t.textContent.trim()) t.textContent = fn(t.textContent); });
}
function applyScriptToUI(){
  const fn = script === 'cyr' ? toCyr : toLatin;
  UI_SCRIPT_SELS.forEach(sel => document.querySelectorAll(sel).forEach(elm => convertTextNodes(elm, fn)));
  UI_SCRIPT_INPUTS.forEach(id => {
    const i = el(id); if(i && i.placeholder) i.placeholder = fn(i.placeholder);
  });
  const ne = el('noteEditor');
  if(ne && ne.dataset.placeholder) ne.dataset.placeholder = fn(ne.dataset.placeholder);
  const rb = el('randomBtn');
  if(rb && rb.title) rb.title = fn(rb.title);
}

let toastTimer;
function toast(msg){
  const t=el('toast');
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
  const box = el('klasiciList');
  if(!box) return;
  box.innerHTML='';
  POEMS.forEach(p=>{
    const card = document.createElement('div');
    card.className='poem-card';
    card.innerHTML =
      `<div class="poem-head">`
      + `<span class="poem-title">${escapeHtml(dispPoem(p.title))}</span>`
      + `<span class="poem-meta">${escapeHtml(dispPoem(p.author))} · ${p.years}</span>`
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
  if(!darkToggle) return;
  darkToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
if(darkToggle) darkToggle.onclick = ()=>{
  document.body.classList.toggle('dark-mode');
  const dark = document.body.classList.contains('dark-mode');
  localStorage.setItem('rimoteka_dark', dark ? '1' : '0');
  applyDarkIcon();
};
applyDarkIcon();

/* ====================== START ====================== */
document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
if(script === 'cyr') applyScriptToUI();
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
    // Podeljena pesma — otvori u beležnicu BEZ brisanja postojeće beleške
    // (localStorage se ne dira dok korisnik sam ne počne da kuca)
    const pesma = params.get('pesma');
    if(pesma){
      const text = decodePoem(pesma);
      if(text && text.trim()){
        noteInput.value = text;
        const naslov = params.get('naslov');
        if(naslov) noteTitle.value = naslov;
        const { colorMap } = analyzeRhymes(text);
        if(colorMap.size > 0) noteEditor.innerHTML = renderColoredText(text);
        else setEditorText(text);
        switchTab('beleznica');
        renderGutter();
        updateNoteStats();
        renderNoteRhymes();
        // skloni parametar da refresh ne bi uvek vraćao podeljenu pesmu
        history.replaceState(null, '', location.pathname);
        toast('Pesma je otvorena — tvoja sačuvana beleška je netaknuta dok ne počneš da kucaš.');
        return true;
      }
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

// Pro dugme je privremeno sakriveno u HTML-u (backend nije deployovan) — zato guard
if (proToggle) proToggle.onclick = () => { proModal.classList.add('show'); };
if (proClose) proClose.onclick = () => { proModal.classList.remove('show'); };
if (proModal) proModal.onclick = (e) => { if(e.target === proModal) proModal.classList.remove('show'); };
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && proModal) proModal.classList.remove('show'); });

if (proDonate) proDonate.onclick = () => {
  window.open('https://buymeacoffee.com/rimoteka', '_blank');
  proModal.classList.remove('show');
};

/* ====================== PRO PRETPLATA (Stripe) ======================
 * VAŽNO: localStorage je ovde SAMO keš da stranica ne trepne pri učitavanju.
 * O tome ko je zaista Pro odlučuje isključivo server (GET /api/status).
 * Izmena keša u DevTools ne otključava ništa — sve Pro funkcije koje nešto
 * koštaju moraju se proveravati na serveru.
 * ==================================================================== */
const PRO_CACHE_KEY = 'rimoteka_pro_cache';

const stepLogin   = document.getElementById('proStepLogin');
const stepPlan    = document.getElementById('proStepPlan');
const stepActive  = document.getElementById('proStepActive');
const loginForm   = document.getElementById('proLoginForm');
const loginInput  = document.getElementById('proEmail');
const loginBtn    = document.getElementById('proLoginBtn');
const loginHint   = document.getElementById('proLoginHint');
const planHint    = document.getElementById('proPlanHint');
const activeInfo  = document.getElementById('proActiveInfo');
const portalBtn   = document.getElementById('proPortal');

let proState = { authenticated: false, pro: false };

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data?.error || `Greška ${res.status}`);
  return data;
}

function renderPro(state) {
  proState = state || { authenticated: false, pro: false };

  // Reklame i Pro oznaka — CSS reaguje na klasu na <body>
  document.body.classList.toggle('is-pro', !!proState.pro);
  if (proToggle) {
    proToggle.textContent = proState.pro ? 'Pro ✓' : 'Pro';
    proToggle.title = proState.pro ? 'Rimoteka Pro je aktivan' : 'Rimoteka Pro';
  }

  stepLogin.hidden  = proState.authenticated;
  stepPlan.hidden   = !proState.authenticated || proState.pro;
  stepActive.hidden = !proState.pro;

  if (proState.pro && proState.currentPeriodEnd) {
    const datum = new Date(proState.currentPeriodEnd).toLocaleDateString('sr-RS');
    activeInfo.textContent = proState.cancelAtPeriodEnd
      ? `Pretplata je otkazana i važi do ${datum}.`
      : `Sledeća naplata: ${datum}.`;
  }
  if (proState.authenticated && !proState.pro) {
    planHint.textContent = `Prijavljena/prijavljen kao ${proState.email}.`;
  }

  try {
    localStorage.setItem(PRO_CACHE_KEY, JSON.stringify({ pro: !!proState.pro }));
  } catch (e) {}
}

// Keš primenjujemo odmah da reklamni prostor ne bljesne Pro korisniku
try {
  const cached = JSON.parse(localStorage.getItem(PRO_CACHE_KEY) || 'null');
  if (cached?.pro) document.body.classList.add('is-pro');
} catch (e) {}

async function refreshPro() {
  try {
    renderPro(await api('/status'));
  } catch (e) {
    // Backend nedostupan — ostavljamo besplatnu verziju, alat i dalje radi
    console.warn('[pro] Status nije dostupan:', e.message);
  }
}

/* Povratak sa magic-link mejla: Supabase vrati #access_token=... */
async function handleAuthRedirect() {
  if (!location.hash.includes('access_token')) return false;

  const token = new URLSearchParams(location.hash.slice(1)).get('access_token');
  history.replaceState(null, '', location.pathname + location.search);
  if (!token) return false;

  try {
    await api('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ access_token: token }),
    });
    await refreshPro();
    proModal.classList.add('show');
    toast('Prijava uspešna.');
  } catch (e) {
    toast(e.message);
  }
  return true;
}

/* Povratak sa Stripe Checkout-a */
async function handleProReturn() {
  const params = new URLSearchParams(location.search);
  const status = params.get('pro');
  if (!status) return;

  params.delete('pro');
  params.delete('session_id');
  const rest = params.toString();
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''));

  if (status === 'cancel') {
    toast('Plaćanje je otkazano.');
    return;
  }
  if (status !== 'success') return;

  // Webhook ume da stigne koji trenutak posle povratka korisnika,
  // pa proveravamo nekoliko puta pre nego što odustanemo.
  toast('Plaćanje primljeno — aktiviram Pro…');
  for (let i = 0; i < 6; i++) {
    await refreshPro();
    if (proState.pro) {
      toast('Pro je aktivan. Hvala! 🎉');
      proModal.classList.add('show');
      return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  toast('Plaćanje je prošlo. Aktivacija traje još koji trenutak — osveži stranicu.');
}

if (loginForm) loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = loginInput.value.trim();
  if (!email) return;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Šaljem…';
  try {
    await api('/auth/request', { method: 'POST', body: JSON.stringify({ email }) });
    loginHint.hidden = false;
    loginHint.textContent = `Poslali smo link na ${email}. Otvori mejl i klikni na njega.`;
    loginForm.hidden = true;
  } catch (err) {
    loginHint.hidden = false;
    loginHint.textContent = err.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Pošalji mi link';
  }
};

if (proSubscribe) proSubscribe.onclick = async () => {
  const plan = document.querySelector('input[name="proPlan"]:checked')?.value || 'monthly';
  proSubscribe.disabled = true;
  proSubscribe.textContent = 'Otvaram plaćanje…';
  try {
    const { url } = await api('/checkout', { method: 'POST', body: JSON.stringify({ plan }) });
    location.href = url;
  } catch (e) {
    toast(e.message);
    proSubscribe.disabled = false;
    proSubscribe.textContent = 'Aktiviraj Pro';
  }
};

if (portalBtn) portalBtn.onclick = async () => {
  portalBtn.disabled = true;
  try {
    const { url } = await api('/portal', { method: 'POST' });
    location.href = url;
  } catch (e) {
    toast(e.message);
    portalBtn.disabled = false;
  }
};

/* Pro backend još nije deployovan i Pro dugme je sakriveno u index.html.
   Zato NE zovemo /api/status pri svakom učitavanju — to je bio 404 zahtev
   na svakoj poseti (usporava i zagađuje konzolu). Kad se Pro uključi
   (proToggle se odkomentariše u HTML-u), provera se sama vraća. */
if (proToggle) {
  handleAuthRedirect().then((handled) => {
    handleProReturn();
    if (!handled) refreshPro();
  });
}

/* ====================== IGRA RIMA — zarazna verzija ====================== */
let gamePlayers = 1;
let gameWordsPerPlayer = 10;
let gameTimePerWord = 15;
let gameCurrentPlayerIdx = 0;
let gameCurrentWordIdx = 0;
let gamePlayersData = [];
let gameTimer = null;
let gameTimeLeft = 0;
let gameCurrentWord = '';
let gameCombo = 0;
let gameMaxCombo = 0;

const gameSetup = document.getElementById('gameSetup');
const gamePlay = document.getElementById('gamePlay');
const gameResults = document.getElementById('gameResults');
const gameHandoff = document.getElementById('gameHandoff');
const gameHandoffStart = document.getElementById('gameHandoffStart');
const gameWordEl = el('gameWord');
const gameInput = el('gameInput');
const gameSubmit = document.getElementById('gameSubmit');
const gameFeedback = el('gameFeedback');
const gameTimerEl = el('gameTimer');
const gameCurrentPlayerEl = el('gameCurrentPlayer');
const gameWordCountEl = el('gameWordCount');
const gameProgress = el('gameProgress');
const gameResultsList = el('gameResultsList');

// Zvuk — Web Audio API
let audioCtx = null;
function playSound(freq, duration, type = 'sine'){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  }catch(e){}
}
function playCorrect(){ playSound(523, 0.15); setTimeout(()=>playSound(659, 0.15), 100); setTimeout(()=>playSound(784, 0.3), 200); }
function playWrong(){ playSound(200, 0.3, 'sawtooth'); }
function playTick(){ playSound(800, 0.05, 'square'); }
function playCombo(n){ playSound(400 + n * 100, 0.2); }

// Confetti
function confetti(){
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  for(let i = 0; i < 50; i++){
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;left:${Math.random()*100}%;top:-10px;width:${5+Math.random()*10}px;height:${5+Math.random()*10}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'0'};z-index:9999;pointer-events:none;animation:confetti-fall ${1+Math.random()*2}s ease-out forwards`;
    document.body.appendChild(div);
    setTimeout(()=>div.remove(), 3000);
  }
}

// Setup — izbor opcija
document.querySelectorAll('.game-setup-options').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.game-option');
    if(!btn) return;
    const value = btn.dataset.value;
    const customInput = group.parentElement.querySelector('.game-custom-input');
    group.querySelectorAll('.game-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(value === 'custom' && customInput){
      customInput.style.display = 'block';
      customInput.focus();
    } else if(customInput){
      customInput.style.display = 'none';
    }
  });
});

const gameStartBtn = document.getElementById('gameStart');
if (gameStartBtn) gameStartBtn.onclick = () => {
  const playersBtn = document.querySelector('#gamePlayers .game-option.active');
  const wordsBtn = document.querySelector('#gameWords .game-option.active');
  const timeBtn = document.querySelector('#gameTime .game-option.active');
  const customInput = el('gamePlayersCustom');

  gamePlayers = playersBtn.dataset.value === 'custom'
    ? Math.min(10, Math.max(1, parseInt(customInput.value) || 1))
    : parseInt(playersBtn.dataset.value);
  gameWordsPerPlayer = parseInt(wordsBtn.dataset.value);
  gameTimePerWord = parseInt(timeBtn.dataset.value);

  gamePlayersData = [];
  for(let i = 0; i < gamePlayers; i++){
    gamePlayersData.push({ score: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, maxCombo: 0 });
  }

  gameCurrentPlayerIdx = 0;
  gameCurrentWordIdx = 0;
  gameCombo = 0;
  renderCombo();
  gameMaxCombo = 0;

  gameSetup.style.display = 'none';
  gamePlay.style.display = 'block';
  gameResults.style.display = 'none';
  if(gameHandoff) gameHandoff.style.display = 'none';
  clearTimeout(gameNextTimeout);
  gameState = 'play';

  nextWord();
};

/* Zakazani prelaz na sledeću reč i stanje igre.
   `setTimeout(nextWord, 1500)` se zvao i posle odgovora i posle isteka vremena,
   pa su se zakazani pozivi nagomilavali i utrkivali sa ekranom predaje
   (igra bi se sama nastavila i pustila tajmer dok predaja još stoji).
   Zato: pamtimo zakazani prelaz da ga možemo otkazati, i držimo stanje igre
   pa nextWord() ne radi ništa ako igra nije u toku. */
let gameNextTimeout = null;
let gameState = 'setup';   // 'setup' | 'play' | 'handoff' | 'results'

function zakaziSledecuRec(ms){
  clearTimeout(gameNextTimeout);
  gameNextTimeout = setTimeout(nextWord, ms);
}

/* Predaja uređaja između igrača.
   Bez ovog ekrana se smena igrača nije videla: nextWord() bi samo povećao
   igrača i ODMAH pustio tajmer, pa je drugom igraču vreme već otkucavalo
   dok je uređaj još bio u ruci prvog. Sada igra stane i čeka klik. */
function showHandoff(){
  clearInterval(gameTimer);
  clearTimeout(gameNextTimeout);
  gameState = 'handoff';
  const badge = document.getElementById('gameHandoffBadge');
  const title = document.getElementById('gameHandoffTitle');
  const sub   = document.getElementById('gameHandoffSub');
  const broj  = gameCurrentPlayerIdx + 1;
  if(badge) badge.textContent = broj;
  if(title) title.textContent = `Vreme je za igrača ${broj}`;
  if(sub){
    const pret = gamePlayersData[gameCurrentPlayerIdx - 1];
    sub.textContent = pret
      ? `Igrač ${gameCurrentPlayerIdx} je osvojio ${pret.score} ${pret.score === 1 ? 'poen' : 'poena'} (${pret.correct} od ${gameWordsPerPlayer} tačno).`
      : '';
  }
  if(gamePlay) gamePlay.style.display = 'none';
  if(gameResults) gameResults.style.display = 'none';
  if(gameHandoff) gameHandoff.style.display = 'block';
  if(gameHandoffStart) gameHandoffStart.focus();
}

function nextWord(){
  if(gameState !== 'play') return;   // predaja ili rezultati su u toku
  if(gameCurrentWordIdx >= gameWordsPerPlayer){
    gameCurrentPlayerIdx++;
    gameCurrentWordIdx = 0;
    gameCombo = 0;
    renderCombo();
  renderCombo();
    if(gameCurrentPlayerIdx >= gamePlayers){
      showResults();
      return;
    }
    // Ima još igrača — stani i čekaj da se zamene.
    showHandoff();
    return;
  }

  for(let t = 0; t < 50; t++){
    // biramo iz bazena poznatih reči — igra sa arhaizmima nije igra
    const w = randomCommonWord(x => !BLOCKED.has(x) && !(kidsMode && isKidsBlocked(x)));
    if(w){
      gameCurrentWord = w;
      gameWordEl.textContent = disp(w);
      gameInput.value = '';
      gameInput.focus();
      gameFeedback.textContent = '';
      gameFeedback.className = 'game-feedback';
      gameSubmit.disabled = false;

      gameCurrentPlayerEl.textContent = gameCurrentPlayerIdx + 1;
      gameWordCountEl.textContent = `${gameCurrentWordIdx + 1}/${gameWordsPerPlayer}`;
      renderProgress();
      startTimer();
      return;
    }
  }
  gameWordEl.textContent = '...';
}

function startTimer(){
  clearInterval(gameTimer);
  gameTimeLeft = gameTimePerWord;
  gameTimerEl.textContent = gameTimeLeft;
  gameTimerEl.classList.remove('low');

  gameTimer = setInterval(() => {
    gameTimeLeft--;
    gameTimerEl.textContent = gameTimeLeft;
    if(gameTimeLeft <= 5){
      gameTimerEl.classList.add('low');
      if(gameTimeLeft > 0) playTick();
    }
    if(gameTimeLeft <= 0){
      clearInterval(gameTimer);
      timeUp();
    }
  }, 1000);
}

function timeUp(){
  gameFeedback.textContent = `⏰ Vreme isteklo! Rima za "${disp(gameCurrentWord)}" nije uneta.`;
  gameFeedback.className = 'game-feedback wrong';
  gamePlayersData[gameCurrentPlayerIdx].wrong++;
  gamePlayersData[gameCurrentPlayerIdx].streak = 0;
  gameCombo = 0;
  renderCombo();
  gameCurrentWordIdx++;
  gameSubmit.disabled = true;
  zakaziSledecuRec(1500);
}

function checkGameAnswer(){
  const answer = toLatin(gameInput.value.trim().toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
  if(!answer || answer.length < 2){
    gameFeedback.textContent = 'Upiši rimu (bar 2 slova)';
    gameFeedback.className = 'game-feedback hint';
    return;
  }
  if(answer === gameCurrentWord){
    gameFeedback.textContent = 'To je ista reč — probaj drugu';
    gameFeedback.className = 'game-feedback hint';
    return;
  }
  if(!SET.has(answer)){
    gameFeedback.textContent = 'Ta reč nije u rečniku — probaj drugu';
    gameFeedback.className = 'game-feedback hint';
    return;
  }

  clearInterval(gameTimer);
  const player = gamePlayersData[gameCurrentPlayerIdx];
  const qKey = rhymeKey(gameCurrentWord);
  const aKey = rhymeKey(answer);
  const isRhyme = qKey === aKey || looseKey(gameCurrentWord) === looseKey(answer);

  if(isRhyme){
    gameCombo++;
    if(gameCombo > gameMaxCombo) gameMaxCombo = gameCombo;
    renderCombo();
    if(gameCombo > player.maxCombo) player.maxCombo = gameCombo;

    const timeBonus = Math.max(0, gameTimeLeft);
    const comboBonus = Math.min(50, gameCombo * 5);
    const points = 10 + timeBonus + comboBonus;
    player.score += points;
    player.correct++;
    player.streak++;
    if(player.streak > player.bestStreak) player.bestStreak = player.streak;

    gameFeedback.textContent = `✓ Tačno! +${points} poena (${gameTimeLeft}s + ${gameCombo}x combo)`;
    gameFeedback.className = 'game-feedback correct';

    playCorrect();
    if(gameCombo >= 3) playCombo(gameCombo);
    confetti();
  } else {
    player.wrong++;
    player.streak = 0;
    gameCombo = 0;
    renderCombo();
  renderCombo();
    gameFeedback.textContent = `✗ "${disp(answer)}" se ne rimuje sa "${disp(gameCurrentWord)}"`;
    gameFeedback.className = 'game-feedback wrong';
    playWrong();
    gameWordEl.style.animation = 'shake 0.5s';
    setTimeout(() => gameWordEl.style.animation = '', 500);
  }

  gameCurrentWordIdx++;
  gameSubmit.disabled = true;
  renderProgress();
  zakaziSledecuRec(1500);
}

function renderProgress(){
  gameProgress.innerHTML = '';
  for(let i = 0; i < gameWordsPerPlayer; i++){
    const dot = document.createElement('span');
    dot.className = 'game-progress-dot';
    if(i < gameCurrentWordIdx) dot.classList.add(gamePlayersData[gameCurrentPlayerIdx].correct > i ? 'correct' : 'wrong');
    else if(i === gameCurrentWordIdx) dot.classList.add('current');
    gameProgress.appendChild(dot);
  }
}

function showResults(){
  clearInterval(gameTimer);
  clearTimeout(gameNextTimeout);
  gameState = 'results';
  gamePlay.style.display = 'none';
  if(gameHandoff) gameHandoff.style.display = 'none';
  gameResults.style.display = 'block';

  const sorted = gamePlayersData.map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score);

  gameResultsList.innerHTML = '';
  sorted.forEach((p, rank) => {
    const div = document.createElement('div');
    div.className = 'game-result-item' + (rank === 0 ? ' winner' : '');
    div.innerHTML = `
      <span class="game-result-player">${rank === 0 ? '🏆 ' : ''}Igrač ${p.idx + 1}</span>
      <span class="game-result-score">${p.score}</span>
      <span class="game-result-details">${p.correct}✓ ${p.wrong}✗ combo:${p.maxCombo}x</span>
    `;
    gameResultsList.appendChild(div);
  });

  // Dostignuća
  const achievements = [];
  if(gameMaxCombo >= 5) achievements.push('🔥 Combo master (5x+)');
  if(gameMaxCombo >= 10) achievements.push('⚡ Combo legend (10x+)');
  if(sorted[0].correct === gameWordsPerPlayer) achievements.push('🎯 Perfect score');
  if(achievements.length > 0){
    const div = document.createElement('div');
    div.style.cssText = 'margin-top:1rem;padding:1rem;background:#f8f0fe;border-radius:14px;font-weight:600';
    div.innerHTML = achievements.map(a => `<p style="margin:.3rem 0">${a}</p>`).join('');
    gameResultsList.appendChild(div);
  }
}

if (gameHandoffStart) gameHandoffStart.onclick = () => {
  gameHandoff.style.display = 'none';
  gamePlay.style.display = 'block';
  gameState = 'play';
  nextWord();          // gameCurrentWordIdx je 0, pa ovo samo daje reč
};

const gameAgainBtn = document.getElementById('gameAgain');
if (gameAgainBtn) gameAgainBtn.onclick = () => {
  gameSetup.style.display = 'block';
  gameResults.style.display = 'none';
  if(gameHandoff) gameHandoff.style.display = 'none';
};

if (gameSubmit) gameSubmit.onclick = checkGameAnswer;
gameInput.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !gameSubmit.disabled) checkGameAnswer();
});

// pokreni igru kad se otvori tab
function initGame(){
  if(WORDS.length > 0){
    gameSetup.style.display = 'block';
    gamePlay.style.display = 'none';
    gameResults.style.display = 'none';
    if(gameHandoff) gameHandoff.style.display = 'none';
  } else {
    // rečnik još nije učitan — prikaži poruku ispod setup-a, ne uništavaj ga
    if(!document.getElementById('gameLoading')){
      const loading = document.createElement('p');
      loading.id = 'gameLoading';
      loading.className = 'empty';
      loading.textContent = 'Učitavam rečnik...';
      gameSetup.appendChild(loading);
    }
    setTimeout(initGame, 1000);
  }
}

/* Bootstrap — poziva se odavde u normalnom toku, a iz sigurnosne mreže
   na vrhu fajla ako skripta pukne pre ove linije. Funkcija je deklarativna
   (hoisted) baš zato da bude dostupna i u tom slučaju. */
/* Poslednja linija odbrane: ako rečnik ipak ne uspe da se učita, korisnik NE
   sme da ostane pred mrtvom stranom. Ne može da zna da je problem u kešu na
   njegovom uređaju, pa mu dajemo dugme koje očisti keš, odjavi service worker
   i ponovo učita stranu. */
async function ocistiKesIOsvezi(){
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch(e) {}
  location.reload();
}
window.ocistiKesIOsvezi = ocistiKesIOsvezi;

function bootstrap(){
  if(BOOTED) return;
  BOOTED = true;
  loadDict().then(()=>{ if(!initFromURL()) rimeInput.focus(); }).catch(e=>{
    console.error('Greška pri učitavanju rečnika:', e);
    const box = el('rimeResults');
    if(box){
      box.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Rečnik nije uspeo da se učita. Najčešće pomogne da očistimo memoriju pregledača:';
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = 'Očisti i probaj ponovo';
      btn.onclick = ocistiKesIOsvezi;
      box.appendChild(p);      box.appendChild(btn);
    }
  });
  // Definicije učitaj u pozadini čim browser bude slobodan — da prvi hover na ⓘ
  // bude trenutan. Preskačemo na Save-Data / 2g vezama (fajl je velik).
  const conn = navigator.connection;
  const slow = conn && (conn.saveData || /2g/.test(conn.effectiveType || ''));
  if(!slow){
    if('requestIdleCallback' in window) requestIdleCallback(() => loadLocalDefs(), { timeout: 5000 });
    else setTimeout(() => loadLocalDefs(), 3000);
  }
}

bootstrap();
