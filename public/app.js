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

/* ============ LOKALNA MEMORIJA KOJA NE OBARA SAJT ============
 * `localStorage` nije uvek dostupan: privatni režim, blokirani kolačići,
 * školski/firmski pregledač i „Block third-party cookies" bacaju
 * `SecurityError` već pri ČITANJU. Ranije su tri takva čitanja stajala na vrhu
 * fajla, IZNAD `const VOWELS` — pa je greška obarala celu skriptu, a sigurnosna
 * mreža iz `setTimeout` pucala na TDZ grešci („Cannot access 'VOWELS' before
 * initialization") i nije spasila ništa. Rezultat: sajt daje 0 rima (nalaz K4).
 * Isto tako, pokvaren sadržaj (`{nije-json`) obarao je `JSON.parse` (nalaz K5).
 * Svako čitanje i pisanje sada ide kroz ove tri funkcije i NIKAD ne baca.
 * ============================================================= */
/* Da li se strana upravo napušta. Koristi se da se prekinuta preuzimanja ne
   prijavljuju kao kvar (v. `loadDict().catch`). `pagehide` je pouzdaniji od
   `beforeunload` — jedini koji radi i na iOS-u, i pri povratku iz keša. */
let seIzlazi = false;
addEventListener('pagehide', () => { seIzlazi = true; });
addEventListener('beforeunload', () => { seIzlazi = true; });

function lsGet(k, podrazumevano = null){
  try { const v = localStorage.getItem(k); return v === null ? podrazumevano : v; }
  catch(e){ return podrazumevano; }
}
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function lsRemove(k){ try { localStorage.removeItem(k); } catch(e){} }
/* JSON iz lokalne memorije: pokvaren zapis, `null` i pogrešan tip svi vraćaju
   podrazumevanu vrednost umesto da obore stranu. */
function lsJSON(k, podrazumevano){
  const sirovo = lsGet(k);
  if(sirovo === null) return podrazumevano;
  try {
    const v = JSON.parse(sirovo);
    if(v === null || v === undefined) return podrazumevano;
    if(Array.isArray(podrazumevano) && !Array.isArray(v)) return podrazumevano;
    return v;
  } catch(e){ return podrazumevano; }
}

/* ============ DVA OTVORENA TABA RIMOTEKE ============
 * Beležnica i omiljene reči se čuvaju u lokalnoj memoriji, koju DELE svi tabovi
 * istog sajta. Svaki tab je pisao pri svakom otkucaju, pa je poslednji upis
 * gazio prethodni: napišeš strofu u jednom tabu, otkucaš jedno slovo u drugom
 * (koji još drži staru pesmu) — i strofa NESTANE, bez ijedne poruke.
 * Rešenje bez servera: pamtimo šta smo mi poslednji put upisali i slušamo
 * događaj `storage`, koji stiže SAMO iz drugih tabova.
 *  · nismo ništa dirali od tog upisa → tiho preuzmemo noviji tekst
 *  · imamo svoje nesačuvane izmene  → NE gazimo ništa, nego javimo korisniku
 * ==================================================== */
let poslednjaSacuvanaBeleska = null;   // šta je OVAJ tab poslednji put upisao
/* „Nikad ne izgubi pesmu" — izgubljen tekst je najbolnija pritužba svih alata
   za pisanje, a naša beležnica je već jednom pokvarena logikom (redovi slepljeni
   u jedan — nalaz M1). Zato pored glavnog ključa čuvamo i poslednje TRI verzije
   pesme: najviše jedna na 30 sekundi, da svako slovo ne puni istoriju. */
function sacuvajBelesku(text){
  poslednjaSacuvanaBeleska = text;
  lsSet('rimoteka_notes', text);
  if(!text.trim()) return;
  try {
    const ist = lsJSON('rimoteka_notes_istorija', []).filter(x => x && typeof x.tekst === 'string');
    const sad = Date.now();
    const posl = ist[ist.length - 1];
    if(posl && posl.tekst === text) return;
    if(posl && sad - (posl.vreme || 0) < 30000) ist[ist.length - 1] = { vreme: sad, tekst: text };
    else { ist.push({ vreme: sad, tekst: text }); if(ist.length > 3) ist.shift(); }
    lsSet('rimoteka_notes_istorija', JSON.stringify(ist));
  } catch(e){}
}
function sacuvajOmiljene(){
  lsSet('rimoteka_favorites', JSON.stringify(favorites));
}

/* ====================== Stanje ====================== */
let WORDS = [];          // sve reči (ekavske + ijekavske na kraju), latinica
let KEYS = [];           // jak ključ rime za svaku reč
let MALE = [];           // ista reč malim slovima — za poređenja (v. `Beograd`)
let RANK = new Map();    // reč -> indeks (manji = češća)
let SET = new Set();     // za brzu proveru postojanja
let jekStart = 0;        // indeks od kog počinju ijekavske reči
/* JEKAVSKI OBLICI KOJI ŽIVE U EKAVSKOM `reci.txt`.
   Prijava vlasnice 30.07.2026: „naizmjence izašlo iako nije čekirana ijekavica".
   Uzrok: ijekavica se uključuje širenjem granice (`limit = includeJek ? WORDS.length
   : jekStart`), a `naizmjence` NIJE u `reci_jekavica.txt` — stoji u `reci.txt`, dakle
   PRE granice, pa je izlazilo uvek. Nađeno **1.127** takvih reči (objašnjenje im samo
   kaže „ijekavski").
   Zašto se ne premeštaju u `reci_jekavica.txt`: od tih 1.127 njih **277 je sporno** —
   npr. `ded`, `dio`, `dobivati` su u Rečniku Matice srpske kao standardne, pa bi
   premeštanje sakrilo ekavske reči od ekavskih korisnika. A `reci.txt` se ne menja bez
   odobrenja vlasnice (CLAUDE.md, odeljak 9). Zato se filtrira u kodu — povratno je,
   ništa se ne gubi, i spisak spornih čeka njenu odluku. */
let JEKAVSKI = new Set();
let SYNONYMS = {};       // sinonimi iz sinonimi.json (učitavaju se u pozadini)
let MATICA = new Set();  // reči potvrđene kao odrednica u Rečniku Matice srpske
const DEFS = new Map();  // ručno pisana srpska objašnjenja (Rimoteka)
let includeJek = lsGet('rimoteka_jekavica') === '1';
let script = lsGet('rimoteka_script') || 'lat';
/* Pokvaren zapis ovde je 28.07.2026. obarao ceo sajt na 0 rima (nalaz K5). */
let favorites = lsJSON('rimoteka_favorites', []).filter(w => typeof w === 'string');

const VOWELS = new Set(['a','e','i','o','u']);

/* Reči koje se NE prikazuju kao rime (neprikladne, vulgarnosti, anatomija) */
const BLOCKED = new Set(['dupe','guzica','guzice','govno','govna','srao','serem','sere','picka','picku','pice','kurac','kurca','dupeta','dubre','dubretar','pisaju','guzi','guziti','seronja','seronje','pickica','pickice','kurvetine','jebem','jebi','jebanje','jebeno','jebeni','jebena','jebalo','jebaci','jebac','govnar','govnari','smece','smetlarka']);
/* 04.08.2026: `guz`, `sranje`, `kurvetina` su izašli odavde — odluka vlasnice:
   vulgarne reči POSTOJE u rečniku (odrasli ih vide), a skriva ih dečji režim
   (dakle su u KIDS_BLOCKED, ne ovde). */

/* Dečji režim — dodatne reči koje nisu pogodne za decu (seksualne, nasilne, psihološki teške) */
const KIDS_BLOCKED = new Set([
  // seksualne
  'seks','seksualan','seksualnost','erotika','erotičan','pornografija','pornografski','orgazam','orgazmičan','masturbacija','masturbirati','prostitucija','prostituirati','bordel','bordeli','kurva','kurve','kurvati','jebačina','jebačine','jebački','jebačkima','sperma','spermijum','vagina','vagine','vaginalan','penis','penisi','penisalan','klitoris','klitorisi','testis','testisi','skrotum','skrotumi','anus','anusi','analni','fela','felacija','felacije','kondom','kondomi','kontracepcija','kontraceptiv','abortus','abortirati','abortirano','silovanje','silovati','silovano','nasilje','nasilnik','nasilnici','pedofilija','pedofil','pedofili','incest','incestalan','bestijalnost','bestijalan','nekrofilija','nekrofil','nekrofili',
  // nasilne / psihološki teške
  'ubistvo','ubiti','ubijen','ubijena','ubice','ubicama','ubojstvo','ubojiti','ubojica','ubojice','masakr','masakrirati','genocid','genocidni','bombardovanje','bombardovati','eksplozija','eksplozije','eksplozivan','granata','granate','minomet','minometi','snajper','snajperi','snajperist','terorizam','terorista','teroristi','teroristički','samoubistvo','suicid','suicidni','samoubica','samoubice','mrtav','mrtva','mrtvi','mrtvilo','mrtvila','mrtvački','mrtvačnica','mrtvačnice','groblje','groblja','grobljanski','kletva','kletve','kleti','prokletstvo','prokletstva','proklet','prokleta','prokleti','đavo','đavoli','đavolji','demon','demoni','demonski','sotona','sotone','pakao','pakleni','paklena','pakleno',
  // vulgarne — od 04.08.2026. POSTOJE u rečniku i odrasli ih vide; dečji režim
  // ih skriva (odluka vlasnice: ne brisati ih sa sajta kad postoji dečji režim)
  'drkan','drkati','guz','kurvetina','kurvica','kurvinski','kurčiti','posrati','prokurvati','sranje','zapišati','šupak',
  'muda'
]);

/* Kontekstualna isključenja: za određenu reč NE prikazuj određene rime (semantika, a ne vulgarnost) */
const RHYME_EXCLUSIONS = {
  'dete': new Set(['bidete','bide','bidi'])
};
/* Jedan zajednički prazan skup — vraća se kad reč nema svoja isključenja.
   Nikad se ne menja, pa je bezbedno deliti ga. */
const EMPTY_SET = new Set();

/* OSNOVE ZA DEČJI REŽIM — odluka vlasnice 29.07.2026.
   Tačan oblik nije dovoljan: lista je hvatala „dupe" ali ne i „dupetu", pa je
   dete koje traži rimu za „krevetu" dobijalo „dupetu", a za „protestu" —
   „incestu" na 2. mestu od 20. Izmereno: 284 propuštena oblika kod 75 reči.
   Zato se u dečjem režimu gleda i POČETAK reči.

   Svaka osnova je pre upisa PROVERENA nad celim rečnikom (278.083 reči) da ne
   hvata nijednu nevinu reč — spisak i brojevi u `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`.
   Osnove koje su odbačene baš zato što hvataju nevine reči, i NE SMEJU se
   dodati: `silov` (silovit), `seks` (sekstet), `kond` (kondenzacija),
   `pisa` (pisac, pisati), `kura` (kurator), `pice` (picerija), `sere`
   (serenada), `dubr` (Dubravka), `granat` (granat — dragi kamen), `krvav`
   (krvavica), `mrš` (mršav), `gad` (Gadafi), `materin` (materinji jezik).
   Nova osnova se dodaje TEK pošto se proveri nad rečnikom. Nikad „po analogiji".

   Reč „rat" i njena porodica (ratovi, ratni, ratnik, ratnici, ratovanje) su
   svesno IZBAČENE iz dečjeg režima: deca se igraju rata i reč im nije strana. */
const KIDS_STEMS = [
  'anus','penis','vagin','klitoris','testis','skrotum','masturb',
  'pornograf','prostitu','bordel','incest','pedofil','abortu','erot',
  'sperm','dupe'
];

// Provera da li je reč neprikladna za decu
function isKidsBlocked(w){
  if(KIDS_BLOCKED.has(w)) return true;
  for(const osn of KIDS_STEMS){ if(w.startsWith(osn)) return true; }
  return false;
}

/* ====================== Lingvistika ====================== */
function vowelPositions(w){
  const p = [];
  /* Mala slova, uvek. U rečniku od 02.08.2026. stoje i vlastita imena velikim
     slovom (`Amerika`, `Isus`), a `VOWELS` sadrži samo mala — bez ovoga bi
     veliko početno `A` ispalo suglasnik i `Amerika` bi imala tri sloga umesto
     četiri, pa bi upala u pogrešnu grupu rima. */
  w = w.toLowerCase();
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
  /* č≡ć i dž≡đ: u rimi su to parovi koji se razlikuju samo po „tvrdoći"
     afrikata i pesnici ih slobodno rimuju („šećera/večera", „džep/đep").
     Bez izjednačavanja „šećera" i „večera" dele samo „era" — isto koliko i
     „šećera" i „partnera" — pa česte reči po učestalosti pretiču bolju rimu
     (prijava vlasnice 16.08.2026: „zašto je partnera bolja rima od večera?").
     Pravopis se NE dira — izjednačavanje važi samo za MERENJE sličnosti. */
  const norm = s => s.toLowerCase().replace(/č/g,'ć').replace(/dž/g,'đ');
  a = norm(a); b = norm(b);
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
  /* Jedan neuspeh je ranije TRAJNO ubijao sve definicije: `defsPromise` je
     ostajao zapamćen i posle greške, pa se drugi pokušaj nikad nije desio, a
     `defCache` je zauvek pamtio „Nema objašnjenja za ovu reč". Sad se pamćenje
     briše kad skidanje ne uspe, pa sledeći hover pokušava ponovo. */
  defsPromise = fetch('/definicije.json?v=cb62a039')
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(defs => {
      for(const k in defs) DEFS.set(k, defs[k]);
    })
    .catch(e => {
      console.warn('[Rimoteka] Definicije nisu učitane, pokušaću ponovo:', e.message);
      defsPromise = null;      // dozvoli nov pokušaj
    });
  return defsPromise;
}

/* Skidanje rečnika koje ume da RAZLIKUJE kvar od praznog odgovora.
   Ranije se pisalo `fetch(...).then(r=>r.text())` bez provere `r.ok`: kad server
   vrati 404 ili 502, telo je HTML strana greške — ona se uredno „učitala" kao
   rečnik od par stotina besmislenih redova, pa je sajt tvrdio „nema rime za ovu
   reč" umesto da prijavi kvar. Zato: status + provera da odgovor nije HTML. */
async function uzmiTekst(url, obavezno){
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const t = await r.text();
    if(/^\s*<(!doctype|html)/i.test(t)) throw new Error('server je vratio HTML umesto rečnika');
    return t;
  }catch(e){
    if(obavezno) throw e;
    console.warn('[Rimoteka] Neobavezan spisak nije učitan:', url, e.message);
    return '';
  }
}

async function loadDict(){
  // Prvo učitaj samo rečnik (mali, brz) — rime rade odmah
  const [ek, jek] = await Promise.all([
    uzmiTekst('/reci.txt?v=8a9899b2', true),
    uzmiTekst('/reci_jekavica.txt?v=1e9eef37', false)
  ]);
  if(ek.split('\n').filter(Boolean).length < 1000){
    // Ispravan `reci.txt` ima preko 250.000 redova. Sve ispod hiljadu je kvar,
    // ne rečnik — bolje jasna greška nego tiho „nema rime".
    throw new Error('reci.txt je stigao nepotpun (' + ek.length + ' bajtova)');
  }
  const ekWords = ek.split('\n').filter(Boolean);
  const jekWords = jek.split('\n').filter(Boolean);
  const svi = ekWords.concat(jekWords);   // ijekavske reči su na kraju (najniži rang)

  /* OBRADA U KOMADIMA, NE U JEDNOM DAHU.
     Računanje ključa rime za 278.000 reči je ranije zamrzavalo glavnu nit
     824 ms u komadu (izmereno u auditu; ukupno blokirano 1.174 ms). Za to vreme
     strana ne reaguje ni na kucanje ni na klik — a već je iscrtana, pa deluje
     pokvareno. Sada se radi u komadima, uz predah između njih, tako da
     pregledač stigne da obradi unos korisnika.
     Rezultati se upisuju u PRIVREMENE strukture i tek na kraju objavljuju:
     `doRhymes` prepoznaje spremnost po `WORDS.length`, pa ne sme da vidi
     poluprazan `KEYS`. */
  const kljucevi = new Array(svi.length);
  const male = new Array(svi.length);     // isti niz, sve malim slovima — v. niže
  const rang = new Map();
  const skup = new Set();
  const KOMAD = 20000;
  for(let i = 0; i < svi.length; i += KOMAD){
    const kraj = Math.min(i + KOMAD, svi.length);
    for(let j = i; j < kraj; j++){
      const w = svi[j];
      /* VLASTITA IMENA STOJE U REČNIKU VELIKIM SLOVOM (`Beograd`, `Saturn`,
         `Isus`) — odluka vlasnice 02.08.2026. Razlog je beležnica: klik na
         ponuđenu rimu ubacuje reč pravo u stih, pa bi `beograd` ostavio
         gramatičku grešku u gotovoj pesmi.
         Zato se ZAPIS čuva onakav kakav je, a sve POREĐENJE ide preko malih
         slova: ključ rime, spisak postojećih reči i pretraga. Bez ovoga bi
         `Beograd` dobio ključ od velikog slova i ne bi se rimovao ni sa čim. */
      const malo = w.toLowerCase();
      male[j] = malo;
      kljucevi[j] = rhymeKey(malo);
      rang.set(w, j);
      skup.add(malo);
    }
    if(kraj < svi.length) await new Promise(r => setTimeout(r, 0));
  }
  jekStart = ekWords.length;
  WORDS = svi; MALE = male; KEYS = kljucevi; RANK = rang; SET = skup;

  // Zatim učitaj frekvenciju i sinonime u pozadini — ne blokiraju rime
  loadExtras();
}

// Lazy load frekvencije i sinonima — ne blokira rime
async function loadExtras(){
  try{
    const [freqRes, synRes, maticaRes] = await Promise.all([
      fetch('/frekvencija.json?v=1bfe729c').then(r=>r.json()).catch(()=> ({})),
      fetch('/sinonimi.json?v=a6c3cea3').then(r=>r.json()).catch(()=> ({})),
      /* matica.json — spisak naših reči koje su ODREDNICA u Rečniku Matice srpske.
         Zašto postoji kao poseban fajl, a ne kao izmišljen broj u frekvenciji:
         srLex (veb-korpus) ne poznaje sve standardne srpske reči — `hiljada` i
         `hiljadu` imaju u njemu NULA pojava, jer je to rupa u tom resursu. Ranije
         je reč bez broja dobijala pozitivan rang, a sve sa brojem negativan, pa je
         reč viđena JEDAN put (`abakuse`) preticala `hiljada` — i `hiljada` nikad
         nije ulazila u bazen „poznatih reči" za kockicu i igru.
         Rešenje NIJE upisati lažan broj (srednja vrednost je 91, a za ulazak u
         bazen treba 5.074 — ne bi pomoglo, a bio bi izmišljen podatak). Rešenje je
         drugi, nezavistan signal: da li Matica srpska tu reč ima kao odrednicu.
         Frekvencija kaže KOLIKO se reč koristi; Matica kaže DA LI je standardna. */
      fetch('/matica.json?v=fb9dfdde').then(r=>r.json()).catch(()=> ([]))
    ]);
    SYNONYMS = synRes;
    MATICA = new Set(Array.isArray(maticaRes) ? maticaRes : []);
    /* Jekavski oblici zaostali u ekavskom rečniku — skidaju se ovde, a filtriraju u
       `izbaciJekavske()`. Ako skidanje ne uspe, skup ostaje prazan i sve radi kao
       ranije: bolje da se pokaže jedna jekavska reč nego da nestanu sve rime. */
    try{
      const jr = await (await fetch('/jekavski.json?v=40070794')).json();
      if(Array.isArray(jr)) JEKAVSKI = new Set(jr);
    }catch(e){ /* namerno tiho — v. komentar iznad */ }
    // Ažuriraj rangiranje sa frekvencijom.
    // NAPOMENA: NE koristiti Math.max(...Object.values(freqRes)) — frekvencija.json
    // ima ~435.000 reči, a spread toliko argumenata obara stek
    // (RangeError: Maximum call stack size exceeded) i ceo blok padne u catch,
    // pa rangiranje i sinonimi tiho prestanu da rade. Zato obična petlja.
    /* Tri sloja ranga, i nijedan ne može da preskoči prethodni:
         1. reč IMA broj iz korpusa   -> negativan rang, češće = manje = ranije
         2. nema broj, ali JE odrednica u Rečniku Matice srpske -> rang `i`
         3. nema broj i nije u Matici -> rang `i + WORDS.length`, dakle iza svih

       Sloj 2 postoji zato što je ranije reč viđena JEDAN put (`abakuse`) preticala
       `hiljada` — standardnu srpsku reč koju srLex uopšte ne poznaje (rupa u tom
       resursu). Sada `hiljada` i dalje ide iza svega što ima stvaran broj, ali PRED
       reči koje nijedan izvor ne potvrđuje. Matica ne daje broj i ne sme da ga
       izmišlja — daje samo potvrdu da reč postoji u standardnom srpskom. */
    /* PRAG ŠUMA. Broj 1 u korpusu od 6,9 miliona oblika nije podatak nego šum —
       jedno pojavljivanje na jednom sajtu. Do 30.07.2026. se i takav broj računao
       kao „poznata reč", pa je `abakuse` (viđeno JEDAN put) preticalo `hiljada`,
       standardnu reč koju srLex uopšte ne poznaje. Sve pod 10 pojava tretira se kao
       „nema signala", ne kao „najređe". Izmereno: to je 27.561 reč (13,1%), i sve
       ostaju u rečniku i dalje izlaze kao rime — menja se samo njihov REDOSLED. */
    const PRAG = 10;
    const POMAK = WORDS.length;
    for(let i=0;i<WORDS.length;i++){
      const w = WORDS[i];
      const freq = freqRes[w] || 0;
      RANK.set(w, freq >= PRAG ? -freq : (MATICA.has(w) ? i : i + POMAK));
    }

    /* PONOVO ISCRTAJ ONO ŠTO JE VEĆ NA EKRANU — nalaz K1 (audit 20.08.2026).
       `loadDict()` prvo upiše AZBUČNI `RANK` (redni broj reči), pa tek onda, ne
       čekajući, pozove ovu funkciju koja ga prepiše frekvencijskim. A pretraga iz
       adrese (`?rec=…`) kreće čim je rečnik gotov — dakle PRE ovog trenutka. Bez
       ovog osvežavanja svako ko dođe klikom na rimu ili iz Gugla dobija azbučni
       spisak, a samo onaj ko sam ukuca reč posle učitavanja dobija pravi.
       Izmereno pre popravke, 12 prolaza na 4 reči, svih 12 isto:
         /?rec=reka  →  breka, dreka, kreka, preka, smreka, beka, bleka, deka
         ručno       →  preka, dreka, smreka, breka, kreka, neka, veka, čeka
       `silent` je obavezan: bez njega bi osvežavanje ponovo upisalo `?rec=` u
       adresu i drugi put poslalo GA4 događaj za istu pretragu.
       Čeka se da rezultati stvarno postoje — ako korisnik nije ništa tražio, nema
       šta da se osvežava. Provera: test, sekcija 35. */
    try{
      const imaRezultata = document.querySelector('#rimeResults .word');
      if(imaRezultata && rimeInput && rimeInput.value.trim()) doRhymes(true);
    }catch(e){ /* osvežavanje prikaza ne sme da obori učitavanje rangiranja */ }
  }catch(e){
    console.warn('Extras nisu učitani:', e);
  }
}

/* OBRISANA FUNKCIJA `loadDefs()` (nalaz N11).
   Bila je mrtav kod — niko je nije zvao — ali opasan mrtav kod: prepisivala je
   `RANK.set(w, i)` po redosledu iz `reci.txt` i time BRISALA frekvencijsko
   rangiranje koje postavlja `loadExtras()`. Da ju je iko pozvao, rime bi se
   vratile na azbučni redosled. Definicije se učitavaju kroz `loadLocalDefs()`,
   koja rangiranje ne dira. Ne vraćati je. */

/* ====================== Prikaz reči (čip) ====================== */
function disp(word){ return script==='cyr' ? toCyr(word) : word; }
// Natpisi koje JS crta posle applyScriptToUI — moraju sami da prate pismo
function uiTxt(s){ return script==='cyr' ? toCyr(s) : s; }

function isFav(w){ return favorites.includes(w); }
function toggleFav(w){
  const i = favorites.indexOf(w);
  if(i>=0) favorites.splice(i,1); else favorites.unshift(w);
  sacuvajOmiljene();
  updateFavCount();
  renderFavorites();
  document.querySelectorAll(`.chip[data-w="${cssEsc(w)}"] .fav`).forEach(b=>{
    /* Menja se SAMO klasa — oba znaka (srce i nota) već stoje u dugmetu, jedan
       preko drugog, pa CSS može da ih pretopi. Kad se ranije prepisivao
       `textContent`, znak je iskakao bez prelaza. */
    b.classList.toggle('on', isFav(w));
    b.setAttribute('aria-pressed', isFav(w) ? 'true' : 'false');
    b.title = favNaslov(w);
    b.setAttribute('aria-label', `${favNaslov(w)}: ${disp(w)}`);
  });
}
/* Naslov dugmeta mora da kaže šta će se desiti na SLEDEĆI klik, ne kakvo je
   stanje — inače čitač ekrana kaže „sačuvaj" i za reč koja je već sačuvana. */
function favNaslov(w){ return uiTxt(isFav(w) ? 'ukloni iz omiljenih' : 'sačuvaj u omiljene'); }

/* PUNA NOTA — znak da je reč sačuvana. Isti crtež kao note na notnom sistemu
   u futeru (glava je elipsa nagnuta za 18°, vrat gore-desno, zastavica), samo
   sveden na veličinu ikonice. Boja ide kroz `--nota-fav` (postoji u obe teme).
   `aria-hidden` jer ime dugmeta nosi `aria-label`, ne crtež. */
const FAV_NOTA_SVG =
  '<svg class="fav-nota" viewBox="0 0 22 32" fill="currentColor" aria-hidden="true" focusable="false">' +
  '<g transform="translate(7 26)">' +
  '<path d="M6.6,-23.2c6.8,3.3 9,8.4 6.5,14.7c0.6,-5.7 -1.7,-8.9 -6.5,-11.5z"/>' +
  '<rect x="4.6" y="-23" width="2" height="23.2" rx="1"/>' +
  '<ellipse rx="6" ry="4.4" transform="rotate(-18)"/>' +
  '</g></svg>';
function cssEsc(s){ return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g,'\\$&'); }

function makeChip(word){
  const el = document.createElement('div');
  el.className = 'chip';
  el.dataset.w = word;
  const syl = syllables(word);
  el.innerHTML =
    `<span class="word" tabindex="0" role="button" title="${uiTxt('klikni da kopiraš')}">${disp(word)}</span>` +
    `<span class="syl" title="${syl} ${uiTxt(slogRec(syl))}">${syl}</span>` +
    `<button class="mini info" title="${uiTxt('objašnjenje reči')}" aria-label="${uiTxt('objašnjenje reči')} ${disp(word)}">ⓘ</button>` +
    `<button class="mini fav ${isFav(word)?'on':''}" aria-pressed="${isFav(word)?'true':'false'}" title="${favNaslov(word)}" aria-label="${favNaslov(word)}: ${disp(word)}"><span class="fav-srce" aria-hidden="true">♡</span>${FAV_NOTA_SVG}</button>` +
    `<button class="mini rh" title="${uiTxt('nađi rime za ovu reč')}" aria-label="${uiTxt('nađi rime za')} ${disp(word)}">🔁</button>`;
  const wEl = el.querySelector('.word');
  wEl.onclick = () => { copy(disp(word)); };
  // Nalaz N5: reč je bila `<span>` sa `onclick` — mišem radi, tastaturom ne.
  wEl.onkeydown = (ev) => {
    if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); copy(disp(word)); }
  };
  wEl.addEventListener('mouseenter', () => { clearTimeout(defTimer); defTimer = setTimeout(() => showDefAt(word, wEl, false), 320); });
  wEl.addEventListener('mouseleave', () => { clearTimeout(defTimer); hideDef(); });
  el.querySelector('.info').onclick = (ev) => { ev.stopPropagation(); showDefAt(word, ev.currentTarget, true); };
  el.querySelector('.fav').onclick = () => toggleFav(word);
  el.querySelector('.rh').onclick = () => { rimeInput.value = disp(word); switchTab('rime'); doRhymes(); };
  /* Na telefonu čipovi stoje u mreži jednakih kolona; duga reč mora da dobije
     dve ili tri kolone. Merenje je zajedničko za sve čipove i ide jednom po
     kadru — v. `zakaziMerenjeCipova`. Van telefona ne radi ništa. */
  zakaziMerenjeCipova();
  return el;
}

/* Legenda — objašnjava šta znače broj i ikonice na svakoj rimi.
   Bez nje korisnik vidi „usvajanje (4)" i tri sitne ikonice bez objašnjenja.
   Na telefonu nema prelaska mišem, pa `title` atributi ne pomažu — jedini
   način je da bude napisano. Prikazuje se samo kad ima rezultata. */
function renderLegend(container){
  const l = document.createElement('div');
  l.className = 'res-legend';
  /* Na telefonu ikonice NISU u pil\u0443\u043b\u0438 \u2014 pojave se iznad re\u010di kad se na nju
     kucne (v. \u201eMOBILNA VERZIJA"). Legenda zato mora da ka\u017ee drugu stvar: ne
     \u201e\u0161ta zna\u010di ova ikonica" nego \u201ekako da do nje do\u0111e\u0161". Stara legenda je na
     telefonu opisivala tri ikonice kojih na ekranu nema. */
  l.innerHTML = jeTelefon()
    ? '<span class="legend-item"><span class="syl">2</span> ' + uiTxt('broj slogova') + '</span>' +
      '<span class="legend-item legend-tap">' + uiTxt('dodirni re\u010d \u2192 zna\u010denje, \u2661 i rime') + '</span>'
    : '<span class="legend-item"><span class="syl">2</span> ' + uiTxt('broj slogova') + '</span>' +
      '<span class="legend-item"><span class="legend-ic">\u24D8</span> ' + uiTxt('zna\u010denje re\u010di') + '</span>' +
      '<span class="legend-item"><span class="legend-ic">\u2661</span> ' + uiTxt('sa\u010duvaj u \u201eOmiljene\u201c') + '</span>' +
      '<span class="legend-item"><span class="legend-ic">\u{1F501}</span> ' + uiTxt('na\u0111i rime za tu re\u010d') + '</span>' +
      '<span class="legend-item legend-tap">' + uiTxt('klikni na re\u010d da je kopira\u0161') + '</span>';
  container.appendChild(l);
}

/* ══════════════════════════════════════════════════════════════════════════
   MOBILNA VERZIJA — 31.07.2026
   Sve u ovom odeljku radi SAMO na telefonu (do 560 px). Računar i tablet ne
   ulaze ni u jednu granu — njihovo ponašanje se ne menja ni za piksel.
   ══════════════════════════════════════════════════════════════════════════ */

/* Isti prag koji CSS koristi za mobilni raspored. Čita se pri svakom pozivu,
   ne kešira se — okretanje telefona menja odgovor. */
function jeTelefon(){
  return window.matchMedia
    ? window.matchMedia('(max-width:560px)').matches
    : window.innerWidth <= 560;
}

/* ── VISINA TASTATURE NA EKRANU ─────────────────────────────────────────────
   `position:fixed; bottom:0` NE računa se prema onome što se vidi, nego prema
   layout viewport-u — a on se pri otvaranju tastature ne smanjuje ni na iOS-u
   ni na Androidu (podrazumevano `interactive-widget=resizes-visual`). Zato
   panel sa rimama u beležnici završi TAČNO ISPOD tastature.

   Izmereno 31.07.2026 na 390×844: panel je stajao od 557 do 844 px, a tastatura
   pokriva otprilike od 540 px naniže — dakle nijedna rima se nije videla. To je
   prijava vlasnice, potvrđena merenjem.

   `visualViewport` je jedini put koji radi i na iOS-u i na Androidu:
   VirtualKeyboard API i `env(keyboard-inset-height)` postoje samo u Chrome-u
   (WebKit ih nije prihvatio ni šest godina posle specifikacije). Razlika između
   layout viewport-a i vidljivog dela JESTE visina tastature; upisuje se u
   promenljivu `--kb`, a CSS njome podiže sve što stoji na dnu ekrana.

   Prag od 90 px je namerno: skrivanje adresne trake takođe menja vidljivi deo
   (60–70 px), a to nije tastatura. Nijedna tastatura nije niža od ~200 px. */
let kbZakazano = false;
function osveziVisinuTastature(){
  const vv = window.visualViewport;
  if(!vv) return;
  const layout = document.documentElement.clientHeight;
  let kb = Math.round(layout - vv.height - vv.offsetTop);
  if(!(kb > 90)) kb = 0;              // NaN i negativno takođe padaju na 0
  const koren = document.documentElement;
  if(koren.__kb === kb) return;
  koren.__kb = kb;
  koren.style.setProperty('--kb', kb + 'px');
  document.body.classList.toggle('kb-open', kb > 0);
}

/* KORISNIK KOJI SKROLUJE SE NE DIRA (prijava vlasnice 16.08.2026: „kad skrolujem
   nagore, strana se sama vrati naniže; sadržaj se preklapa i treperi").
   Uzrok: `visualViewport` na telefonu dešava „scroll" pri SVAKOM pomeranju strane
   dok je tastatura otvorena (vidljivi deo klizi preko layout viewport-a), a ovde
   je na taj događaj stajala ispravka položaja — `keepCaretVisible()` /
   `drziPoljeUVidokrugu()` pozovu `window.scrollBy` kad kursor ili polje ispadnu
   iz vidokruga. Čovek skroluje nagore, kod ga vrati naniže, pa on opet — borba
   stotinama puta u sekundi, što se na ekranu vidi kao skokovi i preklapanje.
   Zato važi dvoje:
     1. usred korisnikovog skrola ispravka položaja SE NE RADI (zastavica dole);
     2. na „scroll" događaj se samo prati visina tastature (--kb), a red se
        dovraća u vidokrug samo na „resize" (tastatura se otvorila/zatvorila),
        pri fokusu i pri kucanju — nikad usred skrola. */
let korisnikSkroluje = false, korisnikSkrolujeTimer = null;
function oznaciSkrolanje(){
  korisnikSkroluje = true;
  clearTimeout(korisnikSkrolujeTimer);
  korisnikSkrolujeTimer = setTimeout(() => { korisnikSkroluje = false; }, 350);
}
['touchmove', 'wheel'].forEach(dog =>
  window.addEventListener(dog, oznaciSkrolanje, { passive: true, capture: true }));
window.addEventListener('scroll', oznaciSkrolanje, { passive: true });

function zakaziOsveziTastaturu(samoVisina){
  if(kbZakazano) return;
  kbZakazano = true;
  requestAnimationFrame(() => {
    kbZakazano = false;
    osveziVisinuTastature();
    if(samoVisina || korisnikSkroluje) return;
    /* Tastatura se otvara POSLE fokusa, pa red u kome se piše tek tada može da
       ostane ispod nje. Panel se u istom kadru pomerio na svoje novo mesto, pa
       je ovo pravi trenutak da se proveri vidi li se kursor. */
    if(document.body.classList.contains('notes-typing')) keepCaretVisible();
    else drziPoljeUVidokrugu();
  });
}

/* Isto pravilo za obična polja (rime, rečnik, igra, naslov pesme).
   Pregledač i sam pomera polje u vidokrug kad se tastatura otvori, ali to radi
   po svojoj proceni i ne zna za ono što stoji ispod polja — u igri su tako
   „Proveri" i poruka o tačnosti umeli da ostanu pod tastaturom. Provera je
   namerno USLOVNA: ako je polje već vidljivo, ne pomera se ništa, pa se ovo
   nikad ne otima pregledaču. */
function drziPoljeUVidokrugu(){
  if(!jeTelefon()) return;
  if(korisnikSkroluje) return;   // ne otima se prstu — v. „KORISNIK KOJI SKROLUJE SE NE DIRA"
  const vv = window.visualViewport;
  if(!vv) return;
  const a = document.activeElement;
  if(!a || !a.matches || !a.matches('input, textarea') || a.closest('.sr-only')) return;
  const r = a.getBoundingClientRect();
  if(r.height === 0) return;
  /* Ne gleda se samo polje nego i red u kome stoji (dugme pored) i prvi red
     ispod njega — poruka o tačnosti u igri stoji tačno tu. */
  const red = a.closest('.game-input-row, .search-row') || a;
  const rr = red.getBoundingClientRect();
  const sledeci = red.nextElementSibling;
  const sr = sledeci ? sledeci.getBoundingClientRect() : null;
  const dole = Math.max(rr.bottom, (sr && sr.height > 0 && sr.top - rr.bottom < 60) ? sr.bottom : 0);
  const vidljivoDno = vv.offsetTop + vv.height;
  if(dole > vidljivoDno - 12){
    let pomak = Math.ceil(dole - vidljivoDno + 12);
    /* Visoko polje (tekst-arija brojača slogova): kad celo ne može iznad
       tastature, dovlačenje DNA bi mu izguralo VRH iz kadra — prijava
       vlasnice 16.08.2026: dodir u prazno polje je „odneo" stranu na dno,
       polje ostane usečeno na vrhu. Zato se pomeraj seče: vrh polja nikad
       ne sme iznad gornje ivice vidokruga. */
    const najvise = Math.max(0, Math.floor(rr.top - vv.offsetTop - 8));
    if(pomak > najvise) pomak = najvise;
    if(pomak > 0) window.scrollBy(0, pomak);
  }
}
/* Safari traka iznad tastature na iOS-u (~50 px, izmereno na snimku vlasnice):
   lebdi preko donjeg dela vidokruga, pa `visualViewport` visina je zahvata.
   Deklarisano PRE vv bloka ispod jer ga taj blok čita pri učitavanju. */
const JE_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const TRAKA_SAFARI_PX = 56;
if(window.visualViewport){
  /* „resize" = tastatura se otvorila/zatvorila → tu se red dovraća u vidokrug.
     „scroll" = korisnik skroluje → tu se SAMO prati visina (--kb), bez diranja
     položaja — v. komentar „KORISNIK KOJI SKROLUJE SE NE DIRA" iznad.
     Uz oba događaja se i traka rima dovraća na dno VIDLJIVOG vidokruga
     (`zakaziLepljenjeTrake`) — ona ne skroluje stranu, samo se sama premi. */
  visualViewport.addEventListener('resize', () => { zakaziOsveziTastaturu(false); zakaziLepljenjeTrake(); });
  visualViewport.addEventListener('scroll', () => { zakaziOsveziTastaturu(true); zakaziLepljenjeTrake(); });
  window.addEventListener('orientationchange', () => setTimeout(osveziVisinuTastature, 250));
  osveziVisinuTastature();
  /* Safari traka iznad tastature na iOS-u — koliko treba podići traku rima
     i donji rub sadržaja (na ostalim platformama 0). */
  document.documentElement.style.setProperty('--traka-lift', (JE_IOS ? TRAKA_SAFARI_PX : 0) + 'px');
}

/* ── ŠIRINA ČIPA U MREŽI ────────────────────────────────────────────────────
   Na telefonu rime stoje u mreži od 2–3 jednake kolone (v. `style.css`,
   odeljak „MOBILNA VERZIJA"). Duga reč („dobročiniteljka") ne stane u jednu
   kolonu, a prelamanje reči na dva reda razvuklo bi CELU vrstu mreže — svaki
   sused bi dobio duplo veću pilulu. Zato takva reč zauzme dve ili tri kolone.

   Merenje ide u tri odvojena prolaza (obriši → pročitaj sve → upiši sve). Da su
   čitanje i pisanje izmešani, svaki od 195 čipova izazvao bi svoj preračun
   rasporeda; ovako ga ima jedan. */
/* Zastavica stoji NA SAMOJ FUNKCIJI, ne u `let` promenljivoj iznad: `makeChip`
   je u fajlu ranije od ovog odeljka, pa bi `let` deklarisan ovde bio u „mrtvoj
   zoni" ako bi neko ikad pozvao `makeChip` pre nego što izvršavanje stigne
   dovde. Deklaracija funkcije se podiže na vrh, njeno svojstvo ne može da pukne. */
function zakaziMerenjeCipova(){
  if(zakaziMerenjeCipova.cekaKadar) return;
  zakaziMerenjeCipova.cekaKadar = true;
  requestAnimationFrame(() => { zakaziMerenjeCipova.cekaKadar = false; izmeriCipove(); });
}
function izmeriCipove(){
  /* Od 16.08.2026 (drugi prolaz) mobilni `.results` je FLEX-red koji se
     prelama — pilula je široka tačno koliko joj treba, pa merenje i dodela
     kolona (`chip-siri`/`chip-najsiri`) više nema šta da radi: te klase su
     izbačene iz CSS-a zajedno sa mrežom. Funkcija ostaje samo da počisti
     zaostale klase (npr. star dokument ili povratak sa starije verzije),
     a pozivi se zadržavaju — jeftina je i ne dira raspored. */
  document.querySelectorAll('.results > .chip.chip-siri, .results > .chip.chip-najsiri')
    .forEach(c => c.classList.remove('chip-siri','chip-najsiri'));
}
window.addEventListener('resize', zakaziMerenjeCipova);

/* ── RADNJE NAD REČJU — ISKAČU IZNAD ČIPA ───────────────────────────────────
   Na telefonu su ⓘ ♡ 🔁 sklonjeni iz pilule: sa njima je čip bio širok 228 px
   od 390 (izmereno), pa je u red stajala TAČNO JEDNA reč — 195 rima davalo je
   spisak visok 12.524 px. Bez ikonica u red staju tri.

   Ikonice se ne gube nego se pojave IZNAD reči kad se na nju kucne — isto kao
   iOS-ova traka nad izabranim tekstom. Ništa nije skriveno, samo se ne troši
   širina na ono što u tom trenutku ne treba. */
/* Ikonice u traci su NACRTANE, ne otkucane.
   Sa znakovima iz fonta traka je izgledala kao četiri različita sajta u jednom
   redu: ⓘ i ♡ dolaze iz teksta i tanke su, 🔁 je emodži pa ga sistem crta u
   boji, a ⧉ postoji u malo fontova i pada na sistemski. Jedan skup poteza
   („stroke") iste debljine daje jedan izgled na svakom telefonu, i sam prati
   boju teme jer koristi `currentColor`. */
const SVG_OKVIR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
const IKONA = {
  znacenje: SVG_OKVIR + '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.9"/></svg>',
  srce:     SVG_OKVIR + '<path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20z"/></svg>',
  /* Sačuvano stanje NIJE puno srce nego PUNA NOTA — isti crtež kao u pilulama
     i kao note u futeru, samo u meri trake (20 px). Boju daje `.ca-btn.on`. */
  notaPuna: '<svg viewBox="0 0 22 32" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor">' +
    '<g transform="translate(7 26)">' +
    '<path d="M6.6,-23.2c6.8,3.3 9,8.4 6.5,14.7c0.6,-5.7 -1.7,-8.9 -6.5,-11.5z"/>' +
    '<rect x="4.6" y="-23" width="2" height="23.2" rx="1"/>' +
    '<ellipse rx="6" ry="4.4" transform="rotate(-18)"/>' +
    '</g></svg>',
  rime:     SVG_OKVIR + '<path d="M3.5 9.5A6 6 0 0 1 9.5 4h5.8"/><path d="M13 1.8 16.2 4 13 6.2"/><path d="M20.5 14.5A6 6 0 0 1 14.5 20H8.7"/><path d="M11 22.2 7.8 20 11 17.8"/></svg>',
  kopiraj:  SVG_OKVIR + '<rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5.5 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v.5"/></svg>',
};

let cipTraka = null, cipTrakaZa = null;
function napraviCipTraku(){
  if(cipTraka) return cipTraka;
  cipTraka = document.createElement('div');
  cipTraka.className = 'chip-actions';
  cipTraka.setAttribute('role', 'group');
  cipTraka.hidden = true;
  document.body.appendChild(cipTraka);
  return cipTraka;
}
function zatvoriCipTraku(){
  if(!cipTraka || cipTraka.hidden) return;
  cipTraka.hidden = true;
  if(cipTrakaZa) cipTrakaZa.classList.remove('chip-izabran');
  cipTrakaZa = null;
}
function otvoriCipTraku(cip, rec){
  const t = napraviCipTraku();
  if(cipTrakaZa === cip && !t.hidden){ zatvoriCipTraku(); return; }   // drugi dodir zatvara
  zatvoriCipTraku();
  cipTrakaZa = cip;
  cip.classList.add('chip-izabran');
  const omiljena = isFav(rec);
  t.innerHTML =
    `<button type="button" class="ca-btn" data-act="def" aria-label="${uiTxt('značenje reči')} ${disp(rec)}">` +
      `<span class="ca-ic">${IKONA.znacenje}</span><span class="ca-txt">${uiTxt('značenje')}</span></button>` +
    `<button type="button" class="ca-btn${omiljena ? ' on' : ''}" data-act="fav" aria-label="${uiTxt('sačuvaj u „Omiljene“')}: ${disp(rec)}">` +
      `<span class="ca-ic">${omiljena ? IKONA.notaPuna : IKONA.srce}</span><span class="ca-txt">${uiTxt('omiljene')}</span></button>` +
    `<button type="button" class="ca-btn" data-act="rime" aria-label="${uiTxt('nađi rime za')} ${disp(rec)}">` +
      `<span class="ca-ic">${IKONA.rime}</span><span class="ca-txt">${uiTxt('rime')}</span></button>` +
    `<button type="button" class="ca-btn" data-act="kopiraj" aria-label="${uiTxt('kopiraj reč')} ${disp(rec)}">` +
      `<span class="ca-ic">${IKONA.kopiraj}</span><span class="ca-txt">${uiTxt('kopiraj')}</span></button>`;
  t.hidden = false;
  t.dataset.w = rec;
  postaviCipTraku(cip);
  t.querySelectorAll('.ca-btn').forEach(b => {
    b.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();          // da document-osluškivač ne zatvori oblačić
      const a = b.dataset.act;
      if(a === 'def'){ pripremiDefinicije(); showDefAt(rec, b, true); zatvoriCipTraku(); }
      else if(a === 'fav'){
        toggleFav(rec);
        const on = isFav(rec);
        b.classList.toggle('on', on);
        b.querySelector('.ca-ic').innerHTML = on ? IKONA.notaPuna : IKONA.srce;
      }
      else if(a === 'rime'){ zatvoriCipTraku(); rimeInput.value = disp(rec); switchTab('rime'); doRhymes(); }
      else { copy(disp(rec)); zatvoriCipTraku(); }
    };
  });
}
function postaviCipTraku(cip){
  if(!cipTraka || cipTraka.hidden) return;
  const r = cip.getBoundingClientRect();
  const w = cipTraka.offsetWidth, h = cipTraka.offsetHeight;
  let levo = r.left + r.width / 2 - w / 2 + window.scrollX;
  const najvise = window.scrollX + document.documentElement.clientWidth - w - 8;
  levo = Math.max(window.scrollX + 8, Math.min(levo, najvise));
  const iznad = r.top >= h + 14;
  const gore = iznad ? (r.top - h - 8) : (r.bottom + 8);
  cipTraka.classList.toggle('ispod', !iznad);
  cipTraka.style.left = Math.round(levo) + 'px';
  cipTraka.style.top = Math.round(gore + window.scrollY) + 'px';
  // strelica pokazuje na sredinu čipa i kad je traka pomerena uz ivicu ekrana
  const strela = Math.round(r.left + r.width / 2 + window.scrollX - levo);
  cipTraka.style.setProperty('--strela', Math.max(14, Math.min(w - 14, strela)) + 'px');
}

/* Dodir na reč u rezultatima otvara traku umesto da kopira.
   Hvata se u FAZI SPUŠTANJA (`capture`) i zaustavlja — inače bi se izvršio i
   `onclick` sa samog `.word`, pa bi se reč i kopirala i otvorila traka.
   Ne dira: panel uz stih (tamo klik ubacuje reč), statične strane `/rime-za/`
   (tamo je čip link) i sve iznad 560 px. */
document.addEventListener('click', (e) => {
  if(!jeTelefon()) return;
  const t = e.target;
  if(!t || !t.closest) return;
  if(t.closest('.chip-actions')) return;
  const cip = t.closest('.chip');
  if(!cip || !cip.querySelector('.mini') || cip.closest('.note-rhymes')){
    if(!t.closest('.chip-actions')) zatvoriCipTraku();
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  otvoriCipTraku(cip, cip.dataset.w || '');
}, true);
window.addEventListener('scroll', zatvoriCipTraku, { passive: true });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') zatvoriCipTraku(); });
/* Promena širine (okretanje telefona, otvaranje tastature na Androidu) menja i
   gde je čip — traka bi ostala da visi na starom mestu. */
window.addEventListener('resize', zatvoriCipTraku);

/* ── REDOVI KOJI SE POMERAJU U STRANU ───────────────────────────────────────
   Traka rima iznad tastature ne staje u širinu ekrana. Bez ikakvog znaka red
   deluje odsečen, pa se blago izbledi desna ivica — a čim se dopomera do
   kraja, bleđenje se sklanja da poslednje dugme ne ostane sivo.
   (Traka akcija u beležnici i traka tabova su ovo koristile do 16.08.2026 —
   tada su po odluci vlasnice prešle na PRELAMANJE u više redova, pa klasa
   `red-do-kraja` za njih više nema vizuelnog efekta.) */
function osveziMaskuReda(red){
  if(!red) return;
  const doKraja = red.scrollLeft + red.clientWidth >= red.scrollWidth - 4;
  red.classList.toggle('red-do-kraja', doKraja || red.scrollWidth <= red.clientWidth + 4);
}
/* `trajno` samo za elemente koji žive koliko i strana. Traka rima se pri
   svakom pomeranju kursora crta iznova — da i ona kači osluškivač na `window`,
   za sat pisanja bi ih se nakupilo na stotine. Njoj je dovoljan osluškivač na
   samoj traci, koji nestaje zajedno sa njom. */
function pratiPomeranjeUStranu(red, trajno){
  if(!red || red.__prati) return;
  red.__prati = true;
  const osvezi = () => osveziMaskuReda(red);
  red.addEventListener('scroll', osvezi, { passive: true });
  if(trajno) window.addEventListener('resize', osvezi);
  osvezi();
}
/* `.hint-actions` se od 16.08.2026. PRELAMA (ne pomera u stranu), pa se ovde
   više ne kači — jedini red sa bočnim pomeranjem je traka rima iznad
   tastature (poziv iz `renderNoteRhymes`). */

/* ── POSLE PRETRAGE ODMAH POKAŽI RIME ───────────────────────────────────────
   Na telefonu je iznad rezultata stajalo 1.070 px sadržaja (logo, traka alata,
   naslov, uvodni pasus, polje, filteri, legenda) — izmereno na 390×844. Ko
   otkuca reč i kucne „Nađi rime", ostane da gleda isti ekran i mora sam da
   skrola do rezultata. Zato se posle SVESNE pretrage (dugme ili Enter, ne
   promena filtera) tastatura zatvara i lista se dovodi pod prst.
   Van telefona ne radi ništa — tamo se cela strana ionako vidi. */
function pokaziRimeNaTelefonu(){
  if(!jeTelefon()) return;
  const box = el('rimeResults');
  if(!box || !box.children.length) return;
  try{ rimeInput.blur(); }catch(e){}
  requestAnimationFrame(() => {
    const y = box.getBoundingClientRect().top + window.scrollY - 8;
    if(y > window.scrollY) window.scrollTo({ top: Math.round(y), behavior: 'smooth' });
  });
}

/* Sinonimi — zasebna, vizuelno izdvojena kartica.
   Ranije su bili obična grupa na DNU liste, ispod stotinu rima, pa se
   praktično nisu videli. Sinonimi su prednost koju konkurencija nema, zato
   idu odmah ispod najboljih rima, jasno označeni. */
function renderSynonyms(container, word, syns){
  if(!syns.length) return;
  const card = document.createElement('section');
  card.className = 'syn-card';
  const h = document.createElement('h2');
  h.className = 'syn-title';
  h.innerHTML = '<span class="syn-badge">' + uiTxt('sinonimi') + '</span> '
    + uiTxt('Druge re\u010di za') + ' \u201e' + disp(word) + '\u201c';
  const hint = document.createElement('p');
  hint.className = 'syn-hint';
  hint.textContent = uiTxt('Kad rima ne odgovara po smislu \u2014 zameni re\u010d na kraju stiha i potra\u017ei rime za nju.');
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
  if(gameCombo >= 2){ b.hidden = false; b.textContent = '\u{1F525} ' + gameCombo + ' ' + uiTxt('u nizu'); }
  else { b.hidden = true; }
}

function renderGroup(container, title, words, strong){
  if(!words.length) return;
  const g = document.createElement('div');
  g.className = 'res-group' + (strong ? ' strong-tier' : '');
  /* `h2`, ne `h3`: iznad je `h1` strane, pa bi `h3` preskočio nivo — čitač
     ekrana tada javlja pogrešnu dubinu (nalaz N9 na statičnim stranama, N14 u
     živom alatu). CSS pokriva oba nivoa, izgled se ne menja.
     `uiTxt` jer naslov crta JS POSLE `applyScriptToUI`, pa ga ćirilica inače
     nikad ne dohvati (nalaz S3). */
  if(title){ const h=document.createElement('h2'); h.textContent=uiTxt(title); g.appendChild(h); }
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
/* Reč koju je korisnik tražio dok rečnik još nije bio spreman (nalaz V5). */
let cekaRec = '';
function pokreniOdlozenuPretragu(){
  el('rimeBtn').classList.remove('ucitava');
  el('rimeBtn').disabled = false;
  if(!cekaRec) return;
  const q = cekaRec;
  cekaRec = '';
  if(!rimeInput.value.trim()) rimeInput.value = disp(q);
  doRhymes();
}

function filterSyl(arr){
  if(!rimeSyl) return arr;
  if(rimeSyl===5) return arr.filter(w=>syllables(w)>=5);
  return arr.filter(w=>syllables(w)===rimeSyl);
}

/* `silent` je zastavica, ne događaj. Kad je `doRhymes` bio zakačen direktno
   (`onclick = doRhymes`), pregledač je kao prvi argument prosleđivao `MouseEvent`
   — a on je truthy, pa je SVAKI klik na glavno dugme radio u tihom režimu:
   bez `?rec=` u URL-u, bez GA4 događaja i bez poruke na nevalidan unos.
   Zato se ovde vrednost svodi na pravo `true`, a poziv je umotan (linija ~491). */
function doRhymes(silent){
  silent = silent === true;
  hideAutocomplete();
  const raw = rimeInput.value.trim().toLowerCase();
  const q = toLatin(raw).replace(/[^a-zčćžšđ]/g,'');
  const box = el('rimeResults');
  box.innerHTML='';
  /* Poruke o stanju pišemo SAMO kad je korisnik sam tražio rime. U tihom
     pozivu (beležnica računa rime za reč pod kursorom) panel je pozajmljen —
     tu bi poruka izgledala kao da je korisnik nešto tražio. Zbog toga je na
     početnoj strani pisalo „Učitavam rečnik…" iako niko nije upisao ni reč. */
  if(q.length<2){
    if(!silent){
      /* POLJE JE ISPRAŽNJENO — strana se vraća u početno stanje.
         Bez ovoga bi `h1`, naslov i opis ostali zaglavljeni na poslednjoj
         traženoj reči („Rime za reč „ljubav“") iako na ekranu više nema nijedne
         rime, a `noindex` bi ostao na strani koja opet sme u indeks.
         `osveziSeoZaRec` se ovde ne može pozvati — ona radi sa rečju, a reči
         više nema; zato se vraćanje radi ovde, na jedinom mestu odakle se
         izlazi bez upita. */
      vratiSeoNaPocetno();
      /* Unos od kog ne ostane nijedno slovo („123", „😀", „!!!") nije isto što i
         prekratka reč — bez ove razlike je panel na takav unos ostajao PRAZAN
         i alat je delovao pokvareno (nalaz V4). */
      box.innerHTML = (raw.length && !q.length)
        ? '<p class="empty">' + uiTxt('Upiši reč slovima — brojevi i znaci se ne rimuju.') + '</p>'
        : '<p class="empty">' + uiTxt('Upiši reč (bar dva slova).') + '</p>';
    }
    return;
  }
  if(WORDS.length === 0){
    /* Nalaz V5: strana je iscrtana za 1,5 s, a rime su na 4G proradile tek posle
       10,3 s. Do sada je korisnik dobijao „Učitavam rečnik…" i morao SAM da
       klikne ponovo. Sada se reč zapamti i pretraga se pokrene čim rečnik stigne. */
    if(!silent){
      cekaRec = q;
      box.innerHTML = '<p class="empty">' + uiTxt('Učitavam rečnik… rime za tu reč stižu čim bude gotovo.') + '</p>';
      el('rimeBtn').classList.add('ucitava');
      el('rimeBtn').disabled = true;
    }
    return;
  }

  // sinhronizuj URL sa trenutnom pretragom (samo ako nije silent — beležnica ne sme da dira URL)
  if(!silent){
    try{ const u=new URL(window.location.href); u.searchParams.set('rec', q); history.replaceState(null,'',u); }catch(e){}
  }

  const key = rhymeKey(q);
  const keyLen = key.length;
  /* `RHYME_EXCLUSIONS` je običan objekat, pa `RHYME_EXCLUSIONS['constructor']`
     vrati funkciju iz prototipa umesto `undefined` — i tada `excluded.has`
     nije funkcija, što je rušilo ceo prikaz rima (nalaz N2). Isto važi za
     „__proto__", „toString", „valueOf". */
  const excluded = Object.prototype.hasOwnProperty.call(RHYME_EXCLUSIONS, q)
    ? RHYME_EXCLUSIONS[q] : EMPTY_SET;
  const limit = includeJek ? WORDS.length : jekStart;
  const strong = [];
  for(let i=0;i<limit;i++){
    const w = WORDS[i];
    /* Spiskovi zabrana i tražena reč su svi malim slovima, pa se poredi sa
       `MALE[i]`, ne sa zapisom. Inače bi `Beograd` izmakao svakoj zabrani, a
       na upit „beograd" bi izašao kao rima samom sebi. */
    const m = MALE[i];
    if(BLOCKED.has(m) || excluded.has(m) || (kidsMode && isKidsBlocked(m))) continue;
    // jekavski oblik zaostao u ekavskom rečniku — v. komentar kod `JEKAVSKI`
    if(!includeJek && JEKAVSKI.has(m)) continue;
    if(KEYS[i]===key && m!==q) strong.push(w);
  }
  /* Redosled rima — tri merila, ovim redom:
     1. duži zajednički završetak (bogatija rima)
     2. BLIŽI BROJ SLOGOVA traženoj reči
     3. učestalost reči

     Zašto broj slogova: prava rima počinje od poslednjeg NAGLAŠENOG
     samoglasnika (vidi GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md, pogl. 7).
     Podatke o akcentu nemamo, a `rhymeKey` od pretposlednjeg samoglasnika je
     samo aproksimacija — ona jednako tretira „rima/štima" (akcenat na istom
     mestu, prava rima) i „rima/računarima" (zajedničko „ima" je tamo
     nenaglašeno, dakle slabija rima). Blizina broja slogova je najbolja
     zamena za akcenat koju imamo, jer reči sličnog obima obično imaju i
     sličan raspored akcenta. */
  const qSyl = syllables(q);
  strong.sort((a,b)=>{
    // prvo blizina broja slogova, pa tek onda duži zajednički završetak
    const ds = Math.abs(syllables(a)-qSyl) - Math.abs(syllables(b)-qSyl);
    if(ds) return ds;
    const d = commonSuffix(q,b)-commonSuffix(q,a);
    if(d) return d;
    return RANK.get(a)-RANK.get(b);
  });
  /* Podela na „najbolje" i „dobre" ide po BROJU SLOGOVA, ne po broju
     zajedničkih slova.

     Ranije je „najbolje" značilo „deli više slova od ključa rime". Zbog toga su
     za „rima" na vrh izlazili „stvarima, centrima, dobrima, čarima, morima" —
     dativi i instrumentali množine koji dele četiri slova (`rima`) — dok je
     „štima", koje deli tri (`ima`), padalo na 111. mesto.

     A u „stvarima" je to `rima` NENAGLAŠENO. Prava rima počinje od poslednjeg
     naglašenog samoglasnika (GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md, pogl. 7),
     pa je „rima/štima" jača rima od „rima/stvarima", iako deli manje slova.

     Podatke o akcentu nemamo. Isti broj slogova je najbolja zamena koju imamo,
     jer reči sličnog obima obično imaju i sličan raspored akcenta. */
  const strongFiltered = filterSyl(strong);
  const best = strongFiltered.filter(w=>syllables(w) === qSyl).slice(0,90);
  const good = strongFiltered.filter(w=>syllables(w) !== qSyl).slice(0,90);

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
    box.innerHTML = '<p class="empty">' + uiTxt('Nema čiste rime za ovu reč. Štikliraj „i šire (slabije) rime“ ispod polja — tada ulaze i bliske rime. Ako ni tada nema, probaj kraću reč ili neku drugu sa kraja stiha.') + '</p>';
  }
  if(best.length || good.length || finalExtra.length) renderLegend(box);
  renderGroup(box, best.length?'Najbolje rime':'', best, true);

  // Sinonimi idu ODMAH ispod najboljih rima — vidljivo, a rime i dalje prve.
  /* Isti razlog kao kod `RHYME_EXCLUSIONS` (nalaz N2): `SYNONYMS` je običan
     objekat učitan iz JSON-a, pa `SYNONYMS['constructor']` vrati funkciju iz
     prototipa i `syns.slice` pukne. Provera vlasništva ključa to zatvara. */
  const syns = (Object.prototype.hasOwnProperty.call(SYNONYMS, q) && Array.isArray(SYNONYMS[q]))
    ? SYNONYMS[q] : [];
  if(syns.length > 0){
    renderSynonyms(box, q, syns.slice(0, 20));
  }

  renderGroup(box, good.length?'Dobre rime':'', good, false);
  renderGroup(box, finalExtra.length?'Dobre rime (isti završni slog)':'', finalExtra, false);

  /* Nalaz N1: rezultati se ubacuju u DOM bez ijedne najave, pa čitač ekrana
     ćuti i posle 195 pronađenih rima. Sam spisak NE ide u `aria-live` (čitao bi
     svih 195 reči) — najavljuje se samo broj, u zasebnom nevidljivom polju. */
  if(!silent){
    const ukupno = best.length + good.length + finalExtra.length;
    el('rimeStatus').textContent = ukupno
      ? `${ukupno} ${uiTxt(rimaRec(ukupno))} ${uiTxt('za')} „${disp(q)}“`
      : uiTxt('Nema rime za tu reč.');
  }

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
    /* Isti redosled merila kao kod čistih rima (CLAUDE.md, 6.2a): PRVO blizina
       broja slogova, pa duži zajednički završetak, pa učestalost. Do 03.08.2026.
       je ovde bio samo završetak, pa je spisak preplavljivao jedan nastavak:
       za „sunce" je prvih sedamdeset mesta zauzelo `-nce` (mladunce, begunce,
       licence…), a `srce` — reč zbog koje ova opcija i postoji — palo je na
       150. mesto i nije se videlo. Sa blizinom slogova `srce` (2 sloga, kao
       `sunce`) ulazi u prvi krug. */
    const qSylW = syllables(q);
    wide.sort((a,b)=>{
      const ds = Math.abs(syllables(a)-qSylW) - Math.abs(syllables(b)-qSylW);
      if(ds) return ds;
      const d = commonSuffix(q,b)-commonSuffix(q,a);
      if(d) return d;
      return RANK.get(a)-RANK.get(b);
    });
    renderGroup(box, 'Šire rime (asonanca)', filterSyl(wide).slice(0,70), false);
  }
  osveziSeoZaRec(q, best.length + good.length + finalExtra.length,
                 best.slice(0, 6).join(', '));
}

/* ── SEO PO UPITU `?rec=` — dinamička adresa po reči ──────────────────────
   Model dokazan kod konkurencije (azrhymes, rime.com.hr — viđeno uživo na
   upitu „rima za malena" 19.08.2026): jedna strana-alat čija adresa nosi reč
   indeksira se kao posebna strana po reči — tako pokrivamo i reči BEZ
   statičke strane, bez pravljenja novih fajlova (zabrana vlasnice 19.08).
   Kanonikal: ako reč ima statičku stranu (`/rime-za/<slug>/`, spisak iz
   `rime-strane.json`) — kanonikal ka njoj, da se autoritet ne deli; ako
   nema — adresa je kanonična samoj sebi. Važi samo na početnoj (`/`). */
const SEO_SLUG_MAP = {'š':'s','č':'c','ć':'c','ž':'z','đ':'dj'};
function slugLat(w){
  return [...w.toLowerCase()].map(ch => SEO_SLUG_MAP[ch] || ch).join('');
}
let rimeStraneSlugovi = null;
async function imasStranu(slug){
  if(rimeStraneSlugovi === null){
    rimeStraneSlugovi = await fetch('/rime-strane.json?v=1')
      .then(r => r.ok ? r.json() : [])
      .then(a => new Set(a))
      .catch(() => new Set());
  }
  return rimeStraneSlugovi.has(slug);
}
function postaviMeta(ime, sadrzaj){
  const m = document.querySelector('meta[name="' + ime + '"]');
  if(m) m.content = sadrzaj;
}
/* OpenGraph oznake koriste `property=`, ne `name=` — zato ih `postaviMeta` nikad
   nije pogađao (nalaz K2, audit 20.08.2026). Posledica: kad se `/?rec=kapućino`
   podeli na Vocapu ili Fejsbuku, prikazivao se naslov POČETNE strane, a ne reči. */
function postaviOG(svojstvo, sadrzaj){
  const m = document.querySelector('meta[property="' + svojstvo + '"]');
  if(m) m.content = sadrzaj;
}
/* `noindex` za adrese koje nemaju šta da pokažu. Do 20.08.2026. `noindex` nije
   postojao nigde u projektu, pa je `/?rec=xqzwptr` — bilo koji niz slova — bio
   uredna, indeksabilna strana bez ijedne rime. Oznaka se DODAJE i UKLANJA, jer
   ista strana u istoj poseti prelazi iz jedne pretrage u drugu. */
function postaviRobots(vrednost){
  let m = document.querySelector('meta[name="robots"]');
  if(!vrednost){ if(m) m.remove(); return; }
  if(!m){ m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
  m.content = vrednost;
}
/* Vraća naslov, opis, glavni naslov i kanonikal na ono što stoji u `index.html`.
   Početne vrednosti se pamte pri prvoj izmeni, pa se ne moraju nigde duplirati. */
function vratiSeoNaPocetno(){
  if(location.pathname !== '/' && location.pathname !== '/index.html') return;
  const h1 = document.querySelector('h1');
  if(h1 && h1.dataset.pocetni !== undefined) h1.textContent = h1.dataset.pocetni;
  if(document.body.dataset.seoNaslov !== undefined) document.title = document.body.dataset.seoNaslov;
  if(document.body.dataset.seoOpis !== undefined) postaviMeta('description', document.body.dataset.seoOpis);
  const kan = document.querySelector('link[rel="canonical"]');
  if(kan && document.body.dataset.seoKanonikal !== undefined) kan.href = document.body.dataset.seoKanonikal;
  postaviOG('og:title', document.title);
  postaviOG('og:description', (document.querySelector('meta[name="description"]') || {}).content || '');
  if(kan) postaviOG('og:url', kan.href);
  postaviRobots('');
}

async function osveziSeoZaRec(q, broj, prvih){
  if(!q || (location.pathname !== '/' && location.pathname !== '/index.html')) return;
  const dq = disp(q);
  /* Početne vrednosti se pamte pre prve izmene — da `vratiSeoNaPocetno()` ima
     šta da vrati, a da se tekst ne duplira ni ovde ni u `index.html`. */
  const b = document.body;
  if(b.dataset.seoNaslov === undefined){
    b.dataset.seoNaslov = document.title;
    b.dataset.seoOpis = (document.querySelector('meta[name="description"]') || {}).content || '';
    const k0 = document.querySelector('link[rel="canonical"]');
    if(k0) b.dataset.seoKanonikal = k0.href;
  }
  const recOblik = (broj % 10 === 1 && broj % 100 !== 11) ? 'reč' : 'reči';
  document.title = broj > 0
    ? `Rime za reč „${dq}": ${broj} ${recOblik} koje se rimuju | Rimoteka rečnik rima`
    : `Rime za reč „${dq}" | Rimoteka rečnik rima`;
  postaviMeta('description', broj > 0
    ? `Sve rime za „${dq}": ${broj} reči. Uz svaku piše broj slogova i šta znači. Na vrhu su: ${prvih}.`
    : `Koje se reči rimuju sa „${dq}"? Rimoteka — rečnik rima, broj slogova i značenja svake reči.`);
  const kan = document.querySelector('link[rel="canonical"]');
  if(!kan) return;
  /* Kanonikal se postavlja ODMAH na samu adresu (sinhrono — na produkciji
     `rime-strane.json` na hladnom startu kasni kroz service worker, pa bi
     kanonikal zakasnio i ostao početni), pa se NADOGRAĐUJE na statičku
     stranu kad spisak stigne i ako reč stranu ima. */
  const sebe = `https://rimoteka.com/?rec=${encodeURIComponent(q)}`;
  kan.href = sebe;

  /* GLAVNI NASLOV PRATI REČ (nalaz K2). Posle `title`, `h1` je najjači signal na
     strani — a stajao je generički („Rimovanje reči na srpskom jeziku…"), pa se
     na strani koja se indeksira po reči ta reč nije pominjala nijednom.
     Početni tekst se pamti da bi se vratio kad se polje isprazni. */
  const h1 = document.querySelector('h1');
  if(h1){
    if(h1.dataset.pocetni === undefined) h1.dataset.pocetni = h1.textContent;
    h1.textContent = broj > 0 ? uiTxt('Rime za reč') + ' \u201e' + dq + '\u201c' : h1.dataset.pocetni;
  }

  /* Deljenje na društvenim mrežama — v. `postaviOG`. `og:url` ide na KANONIKAL,
     ne na `?rec=`: ako reč ima svoju stranu, deli se ona. */
  postaviOG('og:title', document.title);
  postaviOG('og:description',
    (document.querySelector('meta[name="description"]') || {}).content || '');

  /* KOJA ADRESA SME U GUGLOV INDEKS.
     Prvo pravilo je bilo „ima li rima", i palo je na prvoj proveri: `xqzwptrv`
     nije reč, ali se završava na `-rv`, pa alat uredno vrati `strv, krv, crv,
     hrv, brv` — pet rima, dakle „vredno indeksiranja". Po tom merilu bi svaki
     niz slova sa srpskim završetkom pravio novu stranu za Gugla, a upravo to je
     nalaz K2 trebalo da spreči.
     Merilo je zato REČNIK: indeksira se samo adresa čija je reč stvarno u našem
     rečniku. Svaka prava srpska reč tu jeste; greške u kucanju i nizovi slova
     nisu. Za čoveka se ništa ne menja — rime se i dalje prikazuju svakome ko ih
     potraži, menja se samo šta nudimo robotu. */
  const znanaRec = (typeof SET !== 'undefined') && SET.has(q);
  postaviRobots(znanaRec && broj > 0 ? '' : 'noindex,follow');

  const postoji = await imasStranu(slugLat(q));
  if(postoji) kan.href = `https://rimoteka.com/rime-za/${slugLat(q)}/`;
  postaviOG('og:url', kan.href);
}

/* PILULE KOJE NISU LINKOVI (nalaz K2). Na generisanim stranama `/rime-za/…/`
   reč koja NEMA svoju stranu crta se kao `<button class="chip chip-btn"
   data-rec="…">`, a ne kao `<a href="/?rec=…">` — da Gugl ne dobije 96.115 adresa
   za obilazak (v. `chip()` u `build/gen_pages.py`). Za čoveka se ništa ne menja:
   klik vodi tačno tamo gde je i pre vodio.
   Zašto ovde a ne u zasebnom fajlu: CSP sajta je `script-src 'self'`, skripta
   upisana u stranu bi bila blokirana, a `app.js` te strane ionako učitavaju.
   Delegirano sa `document`, pa radi i za pilule koje JS iscrta kasnije. */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.chip[data-rec]');
  if(!b) return;
  e.preventDefault();
  location.href = '/?rec=' + encodeURIComponent(b.dataset.rec);
});

el('rimeBtn').onclick = () => { doRhymes(); pokaziRimeNaTelefonu(); };
rimeInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ doRhymes(); pokaziRimeNaTelefonu(); } });
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
  lsSet('rimoteka_jekavica', includeJek ? '1' : '0');
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
});
// Dečji režim — filtrira neprikladne reči za decu
/* Dečji režim se može uključiti i adresom: `?decji=1`.
   Strane za decu su tvrdile da su rezultati „uvek filtrirani i bezbedni", a
   dodatni dečji filter je podrazumevano bio ISKLJUČEN. Sada dugme sa tih strana
   vodi na alat sa uključenim režimom, a tekst na njima kaže kako stvari stoje. */
let kidsMode = lsGet('rimoteka_kids') === '1';
try{
  if(new URLSearchParams(location.search).get('decji') === '1'){
    kidsMode = true;
    lsSet('rimoteka_kids', '1');
  }
}catch(e){}
const kidsToggle = el('kidsToggle');
kidsToggle.checked = kidsMode;
kidsToggle.addEventListener('change', e=>{
  kidsMode = e.target.checked;
  lsSet('rimoteka_kids', kidsMode ? '1' : '0');
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
/* IJEKAVICA U IGRI I NA KOCKICI — pravilo projekta: u igri ijekavskih reči NEMA
   (prijava vlasnice 16.08.2026: igra je ponudila „dvije"). Ijekavske reči stoje
   na KRAJU niza `WORDS` (od indeksa `jekStart`), a deo jekavskih oblika živi i
   unutar ekavskog dela (skup `JEKAVSKI` — v. komentar uz njega). Bazen se gradi
   iz celog `WORDS` po frekvenciji, pa je `dvije` (13.461 pojava) ulazio u bazen.
   Provera se radi pri svakom IZBORU, ne pri gradnji bazena — `JEKAVSKI` stiže
   mrežom kasnije, pa bi filter pri gradnji bio zastareo. */
let jekReciSkup = null;
function jeJekavskaRec(w){
  if(!jekReciSkup) jekReciSkup = new Set(WORDS.slice(jekStart));
  return jekReciSkup.has(w) || JEKAVSKI.has(w.toLowerCase());
}
function getCommonPool(){
  if(commonPool) return commonPool;
  /* Bazen ide ISKLJUČIVO po frekvenciji — namerno, i to je provereno.
     30.07.2026. je probano da se u bazen dodaju i reči potvrđene u Rečniku Matice
     srpske koje korpus ne zna (da bi `hiljada` mogla da izađe na kockici). NE RADI:
     od 6.323 takve reči većina su `adađo`, `abonos`, `adhezioni`, `abrakadabra`,
     `admiralitetski` — tačno „arhaični i nepoznati oblici" zbog kojih je bazen i
     napravljen. Odrednica u Matici znači da je reč STANDARDNA, ne da je POZNATA;
     to su dva različita svojstva i Matica meri samo prvo.
     Ni finiji signal ne pomaže: `admiralitetski` je u srLex-u sa brojem 0 (korpus
     ga video i izbrojao nula), a `hiljada` nije u srLex-u uopšte (rupa u resursu) —
     ali u istoj grupi „nije u srLex-u" su i `adađo` i `abonos`. Automatske razlike
     između „česta reč koju je korpus promašio" i „retka reč koju je korpus promašio"
     NEMA.
     Zato se reči tipa `hiljada` dodaju iz izvora koji dokazuje da ih ljudi ZAISTA
     koriste — pretrage iz Google Analytics-a (vidi TODO 0.05-E) — ili ručno, na
     zahtev vlasnice. Ne nagađanjem. */
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
    /* Kockica poštuje kvačicu „uključi ijekavicu": kad je isključena, ijekavski
       oblici ne izlaze (u igri ih nema nikad — to filter dolazi kroz extraFilter). */
    if(!includeJek && jeJekavskaRec(w)) continue;
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
// Strana bez polja za rime (npr. brojač slogova) nema gde da zakači predloge —
// `el()` vraća NOOP element, a njegov parentNode je null. Bez ove provere
// app.js pukne na TAKVOJ strani i obori sve ostale alate na njoj.
if(rimeInput.parentNode){
  rimeInput.parentNode.style.position = 'relative';
  rimeInput.parentNode.appendChild(acWrap);
}
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
    const w = WORDS[i], m = MALE[i];   // poređenje malim slovima — v. `Beograd`
    if(BLOCKED.has(m)) continue;
    if(!includeJek && JEKAVSKI.has(m)) continue;   // v. komentar kod `JEKAVSKI`
    if(m.startsWith(q) && m !== q) out.push(w);
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
/* Prebacivanje ide PRE dopune reči, da lista predloga radi nad onim što se
   zaista vidi u polju. `prebaciUnos` je definisan niže u fajlu, ali je funkcija
   deklarativna pa je dostupna i ovde. */
rimeInput.addEventListener('input', () => prebaciUnos(rimeInput));
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
document.addEventListener('click', e=>{ if(rimeInput.parentNode && !rimeInput.parentNode.contains(e.target)) hideAutocomplete(); });

/* ====================== PRETRAGA ====================== */
const searchInput = el('searchInput');
searchInput.addEventListener('input', () => prebaciUnos(searchInput));
let searchSyl = 0;
function doSearch(){
  const mode = el('searchMode').value;
  const q = toLatin(searchInput.value.trim().toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
  const box = el('searchResults');
  box.innerHTML='';
  if(q.length<2){
    box.innerHTML = (searchInput.value.trim().length && !q.length)
      ? '<p class="empty">' + uiTxt('Upiši slova — brojevi i znaci se ne pretražuju.') + '</p>'
      : '<p class="empty">' + uiTxt('Upiši bar dva slova.') + '</p>';
    return;
  }
  /* Dok rečnik nije stigao, `WORDS` je prazan i petlja ispod ne nađe ništa —
     ranije je zbog toga pisalo „Nema reči koje odgovaraju", što je neistina:
     reči ima, samo još nisu učitane. */
  if(WORDS.length === 0){ box.innerHTML='<p class="empty">' + uiTxt('Učitavam rečnik…') + '</p>'; return; }
  const out=[];
  const limit = includeJek ? WORDS.length : jekStart;
  for(let i=0;i<limit && out.length<600;i++){
    const w=WORDS[i], m=MALE[i];      // poređenje malim slovima — v. `Beograd`
    if(BLOCKED.has(m)) continue;
    if(!includeJek && JEKAVSKI.has(m)) continue;   // v. komentar kod `JEKAVSKI`
    if(mode==='ends'   && m.endsWith(q))   out.push(w);
    else if(mode==='starts' && m.startsWith(q)) out.push(w);
    else if(mode==='contains' && m.includes(q)) out.push(w);
  }
  let arr = out;
  if(searchSyl){
    arr = searchSyl===5 ? arr.filter(w=>syllables(w)>=5) : arr.filter(w=>syllables(w)===searchSyl);
  }
  if(!arr.length){ box.innerHTML='<p class="empty">' + uiTxt('Nema reči sa tim slovima. Probaj kraći niz — na primer „ost“ umesto „nost“ — ili promeni način pretrage gore.') + '</p>'; return; }
  renderGroup(box, `Pronađeno (${arr.length>200?'200+':arr.length})`, arr.slice(0,200), false);
  el('searchStatus').textContent = `${arr.length} ${uiTxt(recRec(arr.length))} ${uiTxt('pronađeno')}`;
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
/* Brojevi slogova stoje LEVO od reda, u istom okviru — kao u beležnici.
   Ovde je namerno običan <textarea> (otporan na nalepljivanje, undo i mobilnu
   tastaturu), a pošto se u njega ne može crtati, položaj svakog reda se meri na
   nevidljivoj kopiji: jedan <div> po redu, iste širine i istog fonta kao polje,
   pa se redovi prelamaju identično. */
const sylGutterInner = el('sylGutterInner');
const sylMirror = el('sylMirror');

function syncSylMirror(lines){
  const cs = getComputedStyle(sylInput);
  const st = sylMirror.style;
  st.font = cs.font;
  st.fontSize = cs.fontSize;
  st.fontFamily = cs.fontFamily;
  st.fontWeight = cs.fontWeight;
  st.lineHeight = cs.lineHeight;
  st.letterSpacing = cs.letterSpacing;
  // kopija je BEZ paddinga i okvira — offsetTop reda tako kreće od nule,
  // a padding polja se dodaje pri crtanju gutter-a
  st.padding = '0';
  st.border = '0';
  // širina SADRŽAJA polja (bez paddinga i bez trake za skrolovanje)
  const unutra = sylInput.clientWidth
    - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  st.width = unutra + 'px';
  sylMirror.innerHTML = lines
    .map(l => `<div class="ml">${escapeHtml(l) || '&nbsp;'}</div>`).join('');
}

function renderSylGutter(lines){
  if(sylGutterInner.__noop) return;
  const redovi = [...sylMirror.querySelectorAll('.ml')];
  const frag = document.createDocumentFragment();
  const pad = parseFloat(getComputedStyle(sylInput).paddingTop) || 0;
  lines.forEach((line, i) => {
    const m = redovi[i];
    if(!m) return;
    const row = document.createElement('div');
    row.className = 'gutter-row';
    row.style.top = (m.offsetTop + pad) + 'px';
    row.style.height = m.offsetHeight + 'px';
    row.style.lineHeight = getComputedStyle(sylInput).lineHeight;
    const ima = !!line.trim();
    const slog = ima ? lineSyllables(line) : 0;
    row.innerHTML = `<span class="g-syl">${ima ? slog : '·'}</span>`;
    if(ima) row.title = `${slog} ${slogRec(slog)} · ${line.length} ${znakRec(line.length)}`;
    frag.appendChild(row);
  });
  sylGutterInner.innerHTML = '';
  sylGutterInner.appendChild(frag);
  sylGutterInner.style.transform = `translateY(${-sylInput.scrollTop}px)`;
}

function updateSyl(){
  const out = el('sylOutput');
  const text = sylInput.value;
  const lines = text.split('\n');
  syncSylMirror(lines);
  renderSylGutter(lines);
  // na dnu ostaje SAMO zbir — tekst se više ne ponavlja ispod polja
  out.innerHTML = '';
  let totalSyl = 0, nonEmpty = 0;
  lines.forEach(line => { if(line.trim()){ totalSyl += lineSyllables(line); nonEmpty++; } });
  if(!nonEmpty) return;
  const chars = text.length;
  const noSpace = text.replace(/\s/g, '').length;
  const words = (text.trim().match(/\S+/g) || []).length;
  const t = document.createElement('div');
  t.className = 'syl-total';
  t.innerHTML = `${uiTxt('Ukupno')}: <b>${totalSyl}</b> ${uiTxt(slogRec(totalSyl))} · <b>${words}</b> ${uiTxt(recRec(words))}`
    + ` · <b>${chars}</b> ${uiTxt(znakRec(chars))} (${noSpace} ${uiTxt('bez razmaka')})`
    + ` · ${nonEmpty} ${uiTxt(redRec(nonEmpty))}`;
  out.appendChild(t);
}

sylInput.addEventListener('input', updateSyl);
sylInput.addEventListener('scroll', () => {
  if(!sylGutterInner.__noop) sylGutterInner.style.transform = `translateY(${-sylInput.scrollTop}px)`;
});
let sylResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(sylResizeTimer);
  sylResizeTimer = setTimeout(() => { if(sylInput.value) updateSyl(); }, 150);
});
/* Navodnici se MORAJU štititi: bez njih tekst upisan u atribut može da izađe
   iz njega i doda svoj (`title="..." onmouseover=...`). Danas se `escapeHtml`
   koristi samo za sadržaj elementa, pa nije bilo iskoristivo — ali funkcija sa
   ovim imenom mora da bude bezbedna i za sledeću upotrebu (nalaz N13). */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ====================== BELEŽNICA — Editor sa obojenim rimama ====================== */
// Nazivi šema rime — koristi ih i beležnica (statistika) i tab „Klasici".
// MORA biti iznad beležnice: init odmah zove updateNoteStats() (const ne hoist-uje).
const SCHEME_NAMES = {
  'AA':'parna (kupletna) rima',
  'AABB':'parna (kupletna) rima',
  'ABAB':'ukrštena rima',
  'ABBA':'obgrljena rima',
  'AAAA':'monorima'
};

const noteInput = el('noteInput');
const noteEditor = el('noteEditor');
const noteGutter = el('noteGutter');
const noteTitle = el('noteTitle');

// Naslov pesme — opciono, čuva se uz pesmu; koristi se u PDF/TXT/deljenju
noteTitle.value = lsGet('rimoteka_notes_title') || '';
noteTitle.addEventListener('input', () => {
  lsSet('rimoteka_notes_title', noteTitle.value);
});
function getPoemTitle(){ return noteTitle.value.trim(); }

/* Paleta boja za rimske grupe.
 *
 * Jedna paleta za obe teme NE RADI, i to je izmereno: reč se ispisuje svojom
 * bojom preko iste te boje na 13% prozirnosti, pa kontrast zavisi isključivo od
 * toga koliko je boja tamna u odnosu na podlogu. Stara zajednička paleta davala
 * je u SVETLOJ temi 1,89:1 (zelena), 1,98:1 (narandžasta), 2,14:1 — dakle reč
 * koja se praktično ne vidi; u tamnoj 3,16:1 (ljubičasta) i 3,83:1 (crvena).
 *
 * Zato dve palete: ISTA nijansa i zasićenost, pomerena samo svetlina — dole za
 * svetlu temu, gore za tamnu. Sve vrednosti su izmerene na ≥ 4,6:1 nad stvarnom
 * podlogom (bela, odnosno #1e1a2e), sa uračunatom prozirnom pozadinom reči.
 * Boje ostaju međusobno razlučive, pa rimske grupe i dalje imaju svoju boju. */
const RHYME_COLORS_SVETLA = [
  '#c42818', '#1d6da3', '#1b7742', '#925d07', '#8f4bab',
  '#107461', '#9f5412', '#af4600', '#bc382a', '#107562',
  '#8e44ad', '#236d9e', '#1a7641', '#7c6507', '#c61350',
  '#007180', '#337636', '#965a00', '#673ab7', '#00756a'
];
const RHYME_COLORS_TAMNA = [
  '#eb6d60', '#3a9bdc', '#2ecc71', '#f39c12', '#b584c9',
  '#1abc9c', '#e67e22', '#f96300', '#de766b', '#17a78b',
  '#b782ce', '#449cd6', '#27ae60', '#f1c40f', '#f06192',
  '#00bcd4', '#4caf50', '#ff9800', '#a486d9', '#00a596'
];
function rimaBoja(i){
  const p = document.body.classList.contains('dark-mode') ? RHYME_COLORS_TAMNA : RHYME_COLORS_SVETLA;
  return p[i % p.length];
}

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
// Ako glavni zapis nedostaje ili je prazan, a istorija ima verziju — vratimo
// najnoviju (spas posle pokvarenog upisa ili obrisanog ključa; prazan editor je
// uvek gori izbor od vraćene pesme).
let savedText = lsGet('rimoteka_notes') || '';
if(!savedText.trim()){
  const ist = lsJSON('rimoteka_notes_istorija', []);
  const spas = [...ist].reverse().find(x => x && typeof x.tekst === 'string' && x.tekst.trim());
  if(spas) savedText = spas.tekst;
}
// Ako lokalna memorija ne radi (privatni režim, blokirano skladište), pesma se
// NEĆE sačuvati — korisnik mora to da zna PRE nego što napiše strofu.
(function(){
  let radi = true;
  try {
    localStorage.setItem('rimoteka_provera', '1');
    radi = localStorage.getItem('rimoteka_provera') === '1';
    localStorage.removeItem('rimoteka_provera');
  } catch(e){ radi = false; }
  if(!radi){
    const w = el('noteStorageWarn');
    if(w && !w.__noop) w.hidden = false;
  }
})();
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
// Blokovi (<div>, <p>) SU prelomi reda: mobilni Chrome/Safari na Enter prave
// <div> po redu, ne <br>. Bez ovoga se na telefonu redovi slepe u jedan
// ("…nekadu tvom…") — mrtvo bojenje rima (nalaz M1), ali i pokvarena pesma u
// localStorage, brojač slogova i statistika: svi čitaju ovu funkciju.
function getEditorText(){
  let out = '';
  const blok = (el) => el.nodeName === 'DIV' || el.nodeName === 'P';
  const walk = (node) => {
    node.childNodes.forEach(child => {
      if(child.nodeType === Node.TEXT_NODE) out += child.data;
      else if(child.nodeName === 'BR'){
        // pomoćni <br> za kursor (iOS fix) nije deo teksta; <br> koji je jedini
        // sadržaj bloka je prazan red — prelom mu dodaje sam blok (bez dvostrukog)
        if(child.classList.contains('cursor-br')) return;
        if(blok(child.parentNode) && child.parentNode.childNodes.length === 1) return;
        out += '\n';
      }
      else if(blok(child)){
        // Svaki blok je NOVI RED — bezuslovno. Uslov „samo ako prethodni ne
        // završava na \n" proguta prazan red: `a<div><br></div><div>b</div>`
        // je "a\n\nb" (tri reda), ne "a\nb" (dva). <br> jedinac u bloku je samo
        // vidljivost praznog reda, pa mu se prelom ne računa dvaput (v. gore).
        if(out !== '') out += '\n';
        walk(child);
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

/* Kursor je bio na KRAJU svog tekstualnog čvora (dakle na kraju reda).
   Sam broj znakova to ne može da razlikuje: „kraj trećeg reda" i „početak
   četvrtog reda" su isti broj znakova, jer se prelom (`<br>`) ne broji. Zato se
   uz broj pamti i ovaj podatak. */
let kursorNaKrajuCvora = false;

// Sačuvaj poziciju kursora (broj karaktera od početka)
function saveCursorPosition(){
  const sel = window.getSelection();
  if(sel.rangeCount === 0){ kursorNaKrajuCvora = false; return 0; }
  const range = sel.getRangeAt(0);
  kursorNaKrajuCvora = range.startContainer.nodeType === 3 &&
                       range.startOffset === range.startContainer.textContent.length;
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
    /* PRIJAVA VLASNICE 03.08.2026: „otkucam dva slova i odmah pređe u sledeći
       red". Uzrok je bio baš ovde. Pravilo je glasilo „strogo <", pa je kursor
       koji stoji tačno na KRAJU reda pri svakom osvežavanju odlazio na POČETAK
       sledećeg reda — i sledeće slovo se kucalo tamo. U njenoj pesmi je zato
       „ kapa joj je" pukla na „kapa" i „ joj je".
       Pravilo „strogo <" je uvedeno zbog suprotnog slučaja: pritisneš Enter,
       kursor treba da bude ISPOD preloma, a ostajao je iznad njega.
       Ta dva slučaja imaju isti broj znakova i razlikuju se samo po tome gde je
       kursor stajao PRE osvežavanja — na kraju tekstualnog čvora (kraj reda)
       ili ne (novi red posle Entera). Zato se sada gleda i to. */
    if(pos < nextCount || (kursorNaKrajuCvora && pos === nextCount)){
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

/* ====================== BELEŽNICA PRATI PISMO ======================
 * Prijava vlasnice 29.07.2026: pesma nalepljena na latinici ostajala je na
 * latinici i kad se ceo sajt prebaci na ćirilicu. Ranije je to bila NAMERNA
 * odluka („alat ne sme sam da prekucava tekst korisnika"), ali u praksi znači
 * da pola strane bude ćirilica a pesma latinica. Vlasnica je odlučila da se i
 * pesma prebacuje — u OBA smera, pa se ništa ne gubi: povratak na latinicu
 * vraća pesmu na latinicu.
 *
 * Kursor se čuva u BROJU ZNAKOVA od početka, a ne u DOM čvoru, jer se ceo
 * sadržaj editora zamenjuje. Pozicija se preračunava kroz isti prevod, da ne
 * odskoči kad se `lj` skupi u jedno slovo `љ`.
 * ================================================================== */

/* `saveCursorPosition` ne proverava da li je izbor UOPŠTE u beležnici — kad se
   klikne na prekidač za pismo, izbor je na dugmetu, pa bi vratila besmislicu.
   Ova vraća `null` u tom slučaju, da pozivalac zna da kursor ne treba dirati. */
function pozicijaKursoraUBelesci(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if(!noteEditor.contains(r.startContainer)) return null;
  return saveCursorPosition();
}

/* Ponovo iscrta boje rima posle zamene teksta — bez ovoga pesma posle
   prebacivanja pisma ostane crna dok se ne otkuca sledeće slovo. */
function osveziBelesku(tekst, poz){
  noteInput.value = tekst;
  sacuvajBelesku(tekst);
  const { colorMap } = analyzeRhymes(tekst);
  if(colorMap.size > 0) noteEditor.innerHTML = renderColoredText(tekst);
  if(poz != null) restoreCursorPosition(poz);
}

/* Cela beleška u izabrano pismo. Zove se pri prebacivanju pisma, pri učitavanju
   strane i posle svakog otkucanog slova dok je izabrana ćirilica.
   Prevodi se CEO tekst, a ne samo reč pod kursorom: digrafi (`lj` → `љ`) traže
   dva znaka, pa jedno slovo nije dovoljno, a računanje granica reči preko dve
   različite mere dužine (v. napomenu o prelomima ispod) unosi grešku koja se
   vidi tek u dugačkoj pesmi. Prevod je čist prolaz kroz niz znakova i na pesmi
   od hiljadu redova traje manje od milisekunde — kratkoća koda ovde vredi više
   od uštede koja se ne meri.

   PAŽNJA NA DVE MERE DUŽINE: `getEditorText()` broji svaki prelom reda kao znak
   `\n`, a `saveCursorPosition`/`restoreCursorPosition` prelome NE broje (idu
   samo kroz tekstualne čvorove). Zato se nova pozicija kursora računa nad
   `noteEditor.textContent` — to je ista mera koju kursor koristi. Sa
   `getEditorText()` bi kursor u pesmi sa više redova odskakao za broj redova. */
function prebaciBelesku(){
  if(!noteEditor || noteEditor.__noop) return;
  const stari = getEditorText();
  if(!stari.trim()) return;
  const novi = uPismo(stari);
  if(novi === stari) return;
  const poz = pozicijaKursoraUBelesci();
  const novaPoz = poz == null ? null : uPismo(noteEditor.textContent.slice(0, poz)).length;
  setEditorText(novi);
  osveziBelesku(novi, novaPoz);
}

/* Dok se KUCA: u ćirilici i otkucano slovo odmah prelazi u ćirilicu, isto kao
   u polju za rime. U latinici se ne dira ništa — ko piše latinicom, piše
   latinicom. */
function prebaciKucanoUBelesci(){
  if(script === 'cyr') prebaciBelesku();
}

// Analiziraj tekst i vrati mapu boja po redu
/* Poslednja reč u stihu — sa POLOŽAJEM u izvornom tekstu.
   Ranije se vraćao samo latinični oblik reči, pa je bojenje rima u ćiriličnoj
   pesmi tražilo „љубав" kao „ljubav" u ćiriličnom redu, nije ga nalazilo
   (`lastIndexOf` = -1) i nijedna rima se nije obojila (nalaz S4).
   Zato se opseg računa nad IZVORNIM redom, a latinica služi samo za ključ rime. */
function poslednjaRecSaMestom(line){
  const re = /[a-zA-ZčćžšđČĆŽŠĐЀ-ӿ]+/g;
  let m, zadnji = null;
  while((m = re.exec(line)) !== null) zadnji = m;
  if(!zadnji) return null;
  return {
    pocetak: zadnji.index,
    kraj: zadnji.index + zadnji[0].length,
    latinica: toLatin(zadnji[0].toLowerCase())
  };
}

function analyzeRhymes(text){
  const lines = text.split('\n');
  const lastWords = lines.map(poslednjaRecSaMestom);
  // grupiši po rhymeKey uz sonantnosnu toleranciju — savršena rima po izgovoru
  const groups = new Map();
  lastWords.forEach((rec, idx) => {
    if(!rec || rec.latinica.length < 2) return;
    const key = lenientRhymeKey(rec.latinica);
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(idx);
  });
  // samo grupe sa 2+ reči se boje
  const colorMap = new Map();
  let colorIdx = 0;
  groups.forEach((indices, key) => {
    if(indices.length < 2) return;
    const color = rimaBoja(colorIdx);
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
    const rec = lastWords[idx];
    if(!rec) return escapeHtml(line);
    const before = line.slice(0, rec.pocetak);
    const w = line.slice(rec.pocetak, rec.kraj);
    const after = line.slice(rec.kraj);
    return escapeHtml(before) +
      `<span class="rhyme-word" style="color:${color};background:${color}22">${escapeHtml(w)}</span>` +
      escapeHtml(after);
  }).join('<br>');
}

// Glavna funkcija — analiziraj i renderuj
function updateEditor(){
  const text = getEditorText();
  noteInput.value = text;
  sacuvajBelesku(text);
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
    sacuvajBelesku(text);
    renderGutter();
    updateNoteStats();
    renderNoteRhymes();
    keepCaretVisible();
  }, 150);
  clearTimeout(editorColorTimer);
  editorColorTimer = setTimeout(() => {
    const pos = saveCursorPosition();
    const text = getEditorText();
    // renderuj kad ima rimskih grupa — ili kad grupe VIŠE nema, a stari obojeni
    // spanovi su ostali u editoru (brisanjem reči grupa pukne, boja bi zastala)
    const { colorMap } = analyzeRhymes(text);
    if(colorMap.size > 0 || noteEditor.querySelector('.rhyme-word')){
      noteEditor.innerHTML = renderColoredText(text);
      restoreCursorPosition(pos);
    }
  }, 500);
}

// Event listeneri
noteEditor.addEventListener('input', () => {
  prebaciKucanoUBelesci();  // u ćirilici i otkucano slovo odmah prelazi u ćirilicu
  scheduleEditorUpdate();
});
noteEditor.addEventListener('scroll', () => {
  const inner = el('noteGutterInner');
  if(!inner.__noop) inner.style.transform = `translateY(${-noteEditor.scrollTop}px)`;
});
/* LEPLJENJE PESME — PRELOMI REDOVA SE MORAJU SAČUVATI.
   Do 29.07.2026. je ovde stajalo `execCommand('insertText', …)`, koje u ovom
   editoru GUTA `\n`: nalepljena pesma od dvanaest stihova postajala je JEDAN
   red. Izmereno: brojač je posle lepljenja pokazivao „1 red · 6 reči", a levi
   brojač slogova jedan jedini broj. Za beležnicu za pesme to nije sitnica —
   sa prelomima nestaju i slogovi po stihu, i šema rime, i bojenje.
   Zato se tekst ubacuje sam, čvor po čvor: red kao tekst, prelom kao <br> —
   isti oblik koji editor pravi na Enter. */
noteEditor.addEventListener('paste', (e) => {
  e.preventDefault();
  let text = (e.clipboardData || window.clipboardData).getData('text/plain');
  if(!text) return;
  text = text.replace(/\r\n?/g, '\n');
  // Nalepljena pesma odmah ulazi u izabrano pismo. Prevodi se ceo tekst
  // odjednom, da digrafi na granicama reči ostanu ispravni.
  if(script === 'cyr') text = uPismo(text);

  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0) return;
  const r = sel.getRangeAt(0);
  if(!noteEditor.contains(r.startContainer)) return;
  r.deleteContents();

  const frag = document.createDocumentFragment();
  text.split('\n').forEach((red, i) => {
    if(i) frag.appendChild(document.createElement('br'));
    if(red) frag.appendChild(document.createTextNode(red));
  });
  let zadnji = frag.lastChild;
  /* Ako se nalepljeno završava prelomom, kursor ne sme da stane odmah iza
     njega — pregledač ga vrati ISPRED preloma, pa bi se sledeći red spojio sa
     prethodnim. Isti pomoćni <br> koji koristi `restoreCursorPosition`. */
  if(zadnji && zadnji.nodeName === 'BR'){
    const cb = document.createElement('br');
    cb.className = 'cursor-br';
    frag.appendChild(cb);
    zadnji = cb;
  }
  r.insertNode(frag);
  if(zadnji){
    const nr = document.createRange();
    nr.setStartAfter(zadnji);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
  }
  noteEditor.dispatchEvent(new Event('input', { bubbles: true }));
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

/* Rime uz editor.
   Desktop: panel stoji desno od beležnice i „lepi se" pri skrolovanju (CSS).
   Telefon: dok kucaš, panel se prikači za dno ekrana — inače bi bio ~170 px
   ispod pregiba (izmereno na 390×844), pa se rime u praksi nikad ne vide. */
const noteRhymesBox = el('noteRhymes');
// Stanje panela sa rimama: koliko ih je prikazano i šta je poslednje iscrtano
// (da se DOM ne ruši bez potrebe — v. renderNoteRhymes).
const NOTE_RHYMES_STEP = 16;
let notePanelKey = null, notePanelBase = null, notePanelExpanded = false;
// Reč za koju panel trenutno pokazuje rime i reč koju smo upravo ubacili klikom.
// Klik na rimu je stavlja pod kursor, pa bi panel inače skočio na NJENE rime —
// lista se prerači, kliknuti čip nestane i sve „trepne". Zato panel ostaje
// usidren za reč sa kojom se rimuješ dok god je pod kursorom baš ubačena reč.
let notePanelWord = '', noteInsertedWord = '';
const isNarrow = () => window.matchMedia('(max-width:900px)').matches;
/* TRAKA RIMA ZALEPPLJENA ZA VIDOKRUG, NE ZA STRANU (prijave vlasnice
   16.08.2026, drugi prolaz):
   1) dok se skroluje nagore, panel je „plovio" preko editora — `position:fixed;
      bottom:var(--kb)` meri se od layout-vidokruga, a kad se prstom pomera
      vidljivi deo, layout stoji pa panel na ekranu „beži" preko teksta;
   2) na iPhone-u Safari-jeva traka (lozinka/kartica/lokacija) lebdi IZNAD
      tastature i prekriva pilule (v. `JE_IOS`/`TRAKA_SAFARI_PX` gore).
   Zato se položaj panela računa od VIDLJIVOG vidokruga (`top` u layout
   koordinatama) na svaki „scroll"/„resize" vidokruga — bez `window.scrollBy`,
   prst se ne dira — a na iOS-u se podiže za visinu Safari trake. */
function zalepiTrakuRima(){
  const vv = window.visualViewport;
  if(!vv || !document.body.classList.contains('notes-typing')) return;
  const lift = JE_IOS ? TRAKA_SAFARI_PX : 0;
  noteRhymesBox.style.bottom = 'auto';
  noteRhymesBox.style.top = Math.max(0,
    Math.round(vv.offsetTop + vv.height - noteRhymesBox.offsetHeight - lift)) + 'px';
}
function odlepiTrakuRima(){
  noteRhymesBox.style.top = '';
  noteRhymesBox.style.bottom = '';
}
let lepljenjeZakazano = false;
function zakaziLepljenjeTrake(){
  if(lepljenjeZakazano) return;
  lepljenjeZakazano = true;
  requestAnimationFrame(() => { lepljenjeZakazano = false; zalepiTrakuRima(); });
}
function setTypingMode(on){
  document.body.classList.toggle('notes-typing', !!on && isNarrow());
  if(document.body.classList.contains('notes-typing')) zalepiTrakuRima();
  else odlepiTrakuRima();
}
noteEditor.addEventListener('focus', () => { setTypingMode(true); setTimeout(keepCaretVisible, 250); });
noteEditor.addEventListener('blur', () => setTypingMode(false));
// Klik na rimu ne sme da oduzme fokus editoru — inače se izgubi pozicija kursora
// i reč nema gde da se ubaci.
noteRhymesBox.addEventListener('pointerdown', (e) => {
  if(e.target.closest('.chip')) e.preventDefault();
});
// Na telefonu panel sa rimama stoji preko dna ekrana — browser to ne zna kad
// sam skroluje do kursora, pa red u kome se kuca može da završi ispod panela.
// Donja ivica reda u kome je kursor, u koordinatama ekrana.
// Kolabiran Range ume da vrati prazan pravougaonik (npr. kad je kursor unutar
// obojene rime), pa se u tom slučaju pada nazad na izmereni red iz gutter-a.
function caretViewportBottom(){
  const sel = window.getSelection();
  if(!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if(!noteEditor.contains(range.startContainer)) return null;
  const r = range.getBoundingClientRect();
  if(r && r.height > 0) return r.bottom;
  const pos = getCaretTextPos();
  if(pos == null) return null;
  const lines = getEditorText().split('\n');
  const boxes = (lastGutterLines === lines.join('\n') && lastGutterBoxes)
    ? lastGutterBoxes : measureLineBoxes(lines);
  let idx = 0, acc = 0;
  for(let i = 0; i < lines.length; i++){
    if(pos <= acc + lines[i].length){ idx = i; break; }
    acc += lines[i].length + 1;
  }
  if(!boxes[idx]) return null;
  return noteEditor.getBoundingClientRect().top + boxes[idx].top + boxes[idx].height - noteEditor.scrollTop;
}
function keepCaretVisible(){
  if(!document.body.classList.contains('notes-typing')) return;
  if(korisnikSkroluje) return;   // ne otima se prstu — v. „KORISNIK KOJI SKROLUJE SE NE DIRA"
  const bottom = caretViewportBottom();
  if(bottom == null) return;
  const panel = noteRhymesBox.getBoundingClientRect();
  if(panel.height === 0) return;
  /* Donja ivica onoga što se STVARNO vidi, ne `window.innerHeight`.
     `innerHeight` je visina layout viewport-a i ostaje ista kad se otvori
     tastatura — pa je ovaj račun ranije mislio da ispod kursora ima 300 px
     slobodnog prostora, a tamo je bila tastatura. `getBoundingClientRect`
     vraća koordinate u odnosu na layout viewport, a `visualViewport.offsetTop`
     kaže gde u njemu počinje vidljivi deo, pa se sabiraju. */
  const vv = window.visualViewport;
  const vidljivoDno = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
  const limit = vidljivoDno - panel.height - 12;
  if(bottom > limit) window.scrollBy(0, Math.ceil(bottom - limit));
}

// Promena širine prelama stihove drugačije → gutter se mora premeriti
let gutterResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(gutterResizeTimer);
  gutterResizeTimer = setTimeout(renderGutter, 150);
});

el('clearNotes').onclick = () => {
  if(confirm('Obrisati celu belešku?')){
    setEditorText('');
    noteInput.value = '';
    noteTitle.value = '';
    sacuvajBelesku('');
    lsRemove('rimoteka_notes');
    lsRemove('rimoteka_notes_title');
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

/* ---------- Gutter: slogovi + šema rime + hvataljka za premeštanje ----------
   Redovi gutter-a se NE crtaju kao tekst nego se pozicioniraju po izmerenoj
   visini stvarnog reda u editoru. Tako ostaju poravnati i kad se dug stih
   prelomi u dva vizuelna reda (stari gutter je u tom slučaju „klizio"). */

// Jedan prolaz kroz DOM editora → mapa „tekstualna pozicija ↔ čvor"
// (iste koordinate kao getEditorText, dakle <br> broji kao jedan znak)
/* Spisak „koja tekstualna pozicija leži u kom čvoru".
   MORA da broji IDENTIČNO kao `getEditorText()` — to su dve strane iste stvari:
   jedna daje tekst, druga kaže gde se koje slovo tog teksta nalazi u DOM-u.

   Do 31.07.2026. nisu se poklapale. `getEditorText()` je 29.07. naučen da svaki
   BLOK (`<div>`, `<p>`) računa kao novi red — mobilni Chrome i Safari na Enter
   prave blokove, ne `<br>` (nalaz M1). Ali ovaj spisak nije: on je brojao samo
   slova i `<br>`-ove, pa mu je posle svakog bloka nedostajao po jedan znak.

   Posledica, izmerena na 1440 px i na 390 px: broj slogova i slovo šeme rime
   POMERE SE za ceo red kod poslednjeg stiha. Pesma od četiri stiha imala je
   „D 6" ispod praznog reda, a stih „plamen koji ludi" bez ijedne oznake.
   Greška raste sa brojem stihova (po jedan znak po bloku), pa se na kratkoj
   pesmi jedva vidi, a na dužoj su oznake potpuno razminute sa stihovima.

   Ovo je jedini korisnik ovog spiska (`measureLineBoxes`), pa popravka ne
   dodiruje ni kursor ni čuvanje teksta — samo poravnanje oznaka uz stih. */
function editorTextIndex(){
  const items = [];
  let pos = 0;
  const blok = (el) => el && (el.nodeName === 'DIV' || el.nodeName === 'P');
  const walk = (node) => {
    for(const child of node.childNodes){
      if(child.nodeType === Node.TEXT_NODE){
        items.push({ node: child, from: pos, to: pos + child.data.length });
        pos += child.data.length;
      } else if(child.nodeName === 'BR'){
        if(child.classList.contains('cursor-br')) continue;
        /* `<br>` koji je jedini sadržaj bloka je samo vidljivost praznog reda —
           prelom mu dodaje sam blok. Isti uslov stoji u `getEditorText()`.
           Stavka se ipak upisuje (širine nula) jer `brAt()` preko nje meri gde
           taj prazan red stoji na ekranu. */
        const jedinacUBloku = blok(child.parentNode) && child.parentNode.childNodes.length === 1;
        items.push({ br: child, from: pos, to: pos + (jedinacUBloku ? 0 : 1) });
        if(!jedinacUBloku) pos += 1;
      } else if(blok(child)){
        // isti uslov kao `out !== ''` u getEditorText: prvi blok ne dodaje prelom
        if(pos !== 0) pos += 1;
        walk(child);
      } else walk(child);
    }
  };
  walk(noteEditor);
  return items;
}
// Tačka (čvor + offset) za datu tekstualnu poziciju
function pointAt(items, pos){
  for(const it of items){
    if(it.node && pos >= it.from && pos <= it.to) return { node: it.node, offset: pos - it.from };
  }
  return null;
}
function brAt(items, pos){
  for(const it of items){ if(it.br && it.from === pos) return it.br; }
  return null;
}

/* Izmeri svaki logički red editora (u koordinatama sadržaja).
   VAŽNO: Range vraća okvir OTISKA slova (ascent+descent), a ne ceo linijski
   okvir — između njih stoji polovina proreda. Ako se gutter red zalepi na vrh
   otiska, brojevi i slova ispadnu niže od stiha za tu polovinu proreda.
   Zato se od izmerenog vrha oduzima half-leading, pa gutter red počinje tačno
   tamo gde počinje linijski okvir stiha. */
function measureLineBoxes(lines){
  const base = noteEditor.getBoundingClientRect();
  const off = noteEditor.scrollTop;
  const cs = getComputedStyle(noteEditor);
  const lh = parseFloat(cs.lineHeight) || 24;
  const padTop = parseFloat(cs.paddingTop) || 0;
  const items = editorTextIndex();
  const boxes = [];
  let pos = 0;
  for(let i = 0; i < lines.length; i++){
    let firstTop = null, visualLines = 1, glyphHeight = 0;
    if(lines[i].length){
      const a = pointAt(items, pos), b = pointAt(items, pos + lines[i].length);
      if(a && b){
        const rr = document.createRange();
        rr.setStart(a.node, a.offset);
        rr.setEnd(b.node, b.offset);
        // različiti vrhovi = prelomljeni (obmotani) vizuelni redovi
        const tops = new Set();
        let minTop = Infinity, h = 0;
        for(const x of rr.getClientRects()){
          if(x.height === 0) continue;
          tops.add(Math.round(x.top));
          if(x.top < minTop){ minTop = x.top; h = x.height; }
        }
        if(minTop !== Infinity){ firstTop = minTop; glyphHeight = h; visualLines = tops.size || 1; }
      }
    } else {
      // prazan red — meri se po <br>-u koji ga zatvara
      const br = brAt(items, pos);
      if(br){
        const rr = document.createRange();
        rr.selectNode(br);
        const r = rr.getBoundingClientRect();
        if(r.height > 0 || r.top !== 0){ firstTop = r.top; glyphHeight = r.height; }
      }
    }
    let top, height;
    if(firstTop != null){
      const halfLeading = Math.max(0, (lh - glyphHeight) / 2);
      top = firstTop - halfLeading - base.top + off;
      height = lh * visualLines;
    } else {
      // fallback — merenje nije uspelo, nastavi ispod prethodnog reda
      top = boxes.length ? boxes[boxes.length-1].top + boxes[boxes.length-1].height : padTop;
      height = lh;
    }
    boxes.push({ top, height, lineHeight: lh });
    pos += lines[i].length + 1;
  }
  return boxes;
}

/* Šema rime po strofi (strofa = blok redova između praznih redova).
   Svaki stih dobija slovo — kao u tabu „Klasici" i kao u statistici — ali se
   stih koji se ni sa čim ne rimuje prikazuje bledo, da se šema (npr. ABCB)
   vidi cela, a oko odmah uhvati koji stihovi se zaista poklapaju. */
function rhymeSchemeLetters(lines){
  const letters = lines.map(() => ({ letter: '', repeated: false }));
  let start = 0;
  const closeStanza = (from, to) => {
    if(to <= from) return;
    const keys = new Map();
    for(let i = from; i < to; i++){
      const w = getLastWordInLine(lines[i]);
      if(!w || w.length < 2) continue;
      const k = lenientRhymeKey(w);
      if(!keys.has(k)) keys.set(k, []);
      keys.get(k).push(i);
    }
    let next = 0;
    keys.forEach(idxs => {
      const letter = String.fromCharCode(65 + (next++ % 26));
      idxs.forEach(i => letters[i] = { letter, repeated: idxs.length > 1 });
    });
  };
  for(let i = 0; i < lines.length; i++){
    if(!lines[i].trim()){ closeStanza(start, i); start = i + 1; }
  }
  closeStanza(start, lines.length);
  return letters;
}

// Šema prve strofe kao string (za statistiku: „ABAB · ukrštena rima")
function firstStanzaScheme(lines){
  let from = 0;
  while(from < lines.length && !lines[from].trim()) from++;
  let to = from;
  while(to < lines.length && lines[to].trim()) to++;
  if(to - from < 2) return '';
  const keys = new Map();
  let next = 0;
  let out = '';
  for(let i = from; i < to; i++){
    const w = getLastWordInLine(lines[i]);
    if(!w || w.length < 2) return '';
    const k = lenientRhymeKey(w);
    if(!keys.has(k)) keys.set(k, String.fromCharCode(65 + (next++ % 26)));
    out += keys.get(k);
  }
  return out;
}

// poslednje izmereno stanje redova — deli ga i provera vidljivosti kursora
let lastGutterBoxes = null, lastGutterLines = null;

function renderGutter(){
  const inner = el('noteGutterInner');
  if(inner.__noop) return;
  const lines = getEditorText().split('\n');
  const { colorMap } = analyzeRhymes(lines.join('\n'));
  const letters = rhymeSchemeLetters(lines);
  const boxes = measureLineBoxes(lines);
  lastGutterBoxes = boxes;
  lastGutterLines = lines.join('\n');
  const frag = document.createDocumentFragment();
  lines.forEach((line, i) => {
    const row = document.createElement('div');
    row.className = 'gutter-row';
    row.dataset.line = String(i);
    row.style.top = boxes[i].top + 'px';
    row.style.height = boxes[i].height + 'px';
    // isti prored kao u editoru → hvataljka, slovo i broj sede na istoj
    // osnovnoj liniji kao stih, bez obzira što su različite veličine slova
    row.style.lineHeight = boxes[i].lineHeight + 'px';
    const color = colorMap.get(i);
    const { letter, repeated } = letters[i];
    row.innerHTML =
      `<span class="g-drag" title="${uiTxt('prevuci da premestiš stih')}" aria-label="${uiTxt('premesti stih')}">⠿</span>` +
      `<span class="g-letter${repeated ? '' : ' g-letter-solo'}"${color ? ` style="color:${color}"` : ''}>${letter}</span>` +
      `<span class="g-syl">${line.trim() ? lineSyllables(line) : '·'}</span>`;
    frag.appendChild(row);
  });
  inner.innerHTML = '';
  inner.appendChild(frag);
  inner.style.transform = `translateY(${-noteEditor.scrollTop}px)`;
}

/* ====================== METAR (ritam stiha) ======================
   Naglasak se izvodi SAMO iz pravila koja su sigurna (v. GRAMATIKA-I-PRAVOPIS
   -SRPSKOG-JEZIKA.md, odeljak 7):
     · poslednji slog reči NIKAD nije naglašen
     · jednosložna reč nosi akcenat — osim klitika (nenaglašene rečce)
     · dvosložna reč: akcenat je na prvom slogu (drugi je poslednji, dakle ne)
   Kod reči od tri i više slogova zna se samo da poslednji nije naglašen; koji
   od prethodnih jeste, ne može se izvesti iz oblika reči (za to treba
   akcentovani rečnik). Takvi slogovi se prikazuju kao NEPOZNATI — radije
   priznajemo da ne znamo nego da nagađamo. */

// Klitike — zatvorena klasa nenaglašenih jednosložnih reči.
// Namerno bez „nas/vas/nam/vam" (imaju i naglašeni oblik, pa su dvosmisleni).
const CLITICS = new Set([
  // glagolske enklitike
  'sam','si','je','smo','ste','su','bih','bi','bismo','biste',
  'ću','ćeš','će','ćemo','ćete',
  // zamenički oblici bez akcenta
  'me','te','se','ga','ju','mu','joj','im','ih','mi','ti',
  // upitna rečca
  'li',
  // predlozi (proklitike)
  'u','na','o','po','za','od','do','iz','s','sa','k','ka','kroz',
  'pred','nad','pod','uz','niz','bez','pri','pre','kod','uoči',
  // veznici i rečca za negaciju
  'i','a','ni','pa','te','da','ili','ali','jer','no','ne'
]);

const STRESS = { YES: 'S', NO: 'U', UNKNOWN: '?' };

// Raspored naglasaka u jednoj reči
function wordStress(word){
  const n = countSyl(word);
  if(n === 0) return [];                                   // suglasnički predlog (s, k, z)
  if(n === 1) return [CLITICS.has(word) ? STRESS.NO : STRESS.YES];
  if(n === 2) return [STRESS.YES, STRESS.NO];
  return new Array(n - 1).fill(STRESS.UNKNOWN).concat(STRESS.NO);
}

// Ritam celog stiha: niz slogova, svaki zna kojoj reči pripada
function lineStress(line){
  const out = [];
  const tokens = line.split(/\s+/).filter(Boolean);
  tokens.forEach((tok, wi) => {
    const w = toLatin(tok.toLowerCase()).replace(/[^a-zčćžšđ]/g, '');
    if(!w) return;
    wordStress(w).forEach((mark, si) => out.push({ mark, word: wi, first: si === 0 }));
  });
  return out;
}

// Nazivi stiha po broju slogova + mesto cezure kod klasičnih oblika
const VERSE_NAMES = {
  6:'šesterac', 7:'sedmerac', 8:'osmerac',
  10:'deseterac', 11:'jedanaesterac', 12:'dvanaesterac'
};
const CAESURA = { 10: 4, 12: 6 };   // deseterac 4+6, dvanaesterac 6+6

// Oblici se crtaju CSS-om (klase m-s / m-u / m-q) — znakovi ●·◦ se u različitim
// fontovima crtaju skoro isto veliki, pa se naglašen i nenaglašen slog ne razlikuju.
const METER_TITLE = { S:'naglašen slog', U:'nenaglašen slog', '?':'akcenat je na jednom od ovih slogova' };

let meterOn = lsGet('rimoteka_meter') === '1';

function renderMeter(){
  const box = el('noteMeter');
  if(box.__noop) return;
  if(!meterOn){ box.hidden = true; box.innerHTML = ''; return; }
  const lines = getEditorText().split('\n');
  const verses = lines.filter(l => l.trim());
  if(!verses.length){ box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;

  // preovlađujuća dužina stiha — po njoj se meri odstupanje
  // Red bez ijednog sloga (npr. samo znak interpunkcije) nije stih — ne sme da
  // postane „preovlađujuća dužina 0".
  const counts = new Map();
  let merljivih = 0;
  verses.forEach(l => {
    const n = lineSyllables(l);
    if(n === 0) return;
    merljivih++;
    counts.set(n, (counts.get(n) || 0) + 1);
  });
  let dominant = 0, best = 0;
  counts.forEach((c, n) => { if(c > best){ best = c; dominant = n; } });
  const odstupa = merljivih - best;
  const naziv = VERSE_NAMES[dominant];
  const cez = CAESURA[dominant];

  let html = `<div class="meter-head">`
    + (dominant
        ? `${escapeHtml(uiTxt('Preovlađuje'))} <b>${dominant}</b> ${escapeHtml(uiTxt(slogRec(dominant)))}`
        : escapeHtml(uiTxt('Ritam stiha')))
    + (naziv ? ` — <b>${escapeHtml(uiTxt(naziv))}</b>` : '')
    + (cez ? ` · ${escapeHtml(uiTxt('cezura posle'))} ${cez}. ${escapeHtml(uiTxt('sloga'))}` : '')
    + (odstupa ? ` · <span class="m-warn">${odstupa} ${escapeHtml(uiTxt(stihRec(odstupa) + ' odstupa'))}</span>` : '')
    + `</div>`;

  lines.forEach(line => {
    if(!line.trim()) { html += `<div class="meter-line meter-gap"></div>`; return; }
    const syls = lineStress(line);
    const n = syls.length;
    let marks = '';
    syls.forEach((s, i) => {
      // razmak između reči — da se ritam čita po rečima
      if(i > 0 && s.first) marks += `<span class="m-gap"></span>`;
      if(cez && i === cez && n === dominant){
        // cezura pada na granicu reči = dobro; usred reči = stih „zapinje"
        const ok = s.first;
        marks += `<span class="m-cez ${ok ? 'ok' : 'off'}" title="${escapeHtml(uiTxt(ok ? 'cezura na granici reči' : 'cezura pada usred reči'))}">│</span>`;
      }
      marks += `<span class="m-syl m-${s.mark === '?' ? 'q' : s.mark.toLowerCase()}" title="${escapeHtml(uiTxt(METER_TITLE[s.mark]))}"></span>`;
    });
    html += `<div class="meter-line">`
      + `<span class="m-count${n === dominant ? '' : ' off'}">${n}</span>`
      + `<span class="m-marks">${marks}</span>`
      + `<span class="m-text">${escapeHtml(line)}</span>`
      + `</div>`;
  });

  html += `<div class="meter-legend">`
    + `<span><span class="m-syl m-s"></span> ${escapeHtml(uiTxt('naglašen'))}</span>`
    + `<span><span class="m-syl m-u"></span> ${escapeHtml(uiTxt('nenaglašen'))}</span>`
    + `<span><span class="m-syl m-q"></span> ${escapeHtml(uiTxt('akcenat je na jednom od ovih slogova'))}</span>`
    + (cez ? `<span><span class="m-cez ok">│</span> ${escapeHtml(uiTxt('cezura — predah u sredini stiha'))}</span>` : '')
    + `</div>`;
  box.innerHTML = html;
}

function updateMeterButton(){
  const b = el('toggleMeter');
  b.textContent = uiTxt(meterOn ? 'sakrij metar' : 'prikaži metar');
  b.setAttribute('aria-pressed', meterOn ? 'true' : 'false');
}
el('toggleMeter').onclick = () => {
  meterOn = !meterOn;
  lsSet('rimoteka_meter', meterOn ? '1' : '0');
  updateMeterButton();
  renderMeter();
};
updateMeterButton();

/* ---------- Premeštanje stihova (drag & drop, miš i prst) ---------- */
// Upisuje novi tekst u editor i osvežava sve što od njega zavisi
function setNoteText(text){
  const { colorMap } = analyzeRhymes(text);
  noteEditor.innerHTML = colorMap.size > 0
    ? renderColoredText(text)
    : escapeHtml(text).replace(/\n/g, '<br>');
  noteInput.value = text;
  sacuvajBelesku(text);
  renderGutter();
  updateNoteStats();
  renderNoteRhymes();
}

let dragState = null;
function dropIndicator(){
  let d = el('noteDropLine');
  if(d.__noop){
    d = document.createElement('div');
    d.id = 'noteDropLine';
    d.className = 'note-drop-line';
    noteEditor.parentNode.appendChild(d);
  }
  return d;
}
// Indeks pred koji bi red upao ako se sad pusti
function dropIndexAt(clientY){
  const base = noteEditor.getBoundingClientRect();
  const y = clientY - base.top + noteEditor.scrollTop;
  const boxes = dragState.boxes;
  for(let i = 0; i < boxes.length; i++){
    if(y < boxes[i].top + boxes[i].height / 2) return i;
  }
  return boxes.length;
}
function paintDropIndicator(index){
  const d = dropIndicator();
  const boxes = dragState.boxes;
  const top = index < boxes.length
    ? boxes[index].top
    : (boxes.length ? boxes[boxes.length-1].top + boxes[boxes.length-1].height : 0);
  d.style.top = (top - noteEditor.scrollTop) + 'px';
  d.classList.add('show');
}
noteGutter.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.g-drag');
  if(!handle) return;
  const row = handle.closest('.gutter-row');
  if(!row) return;
  const lines = getEditorText().split('\n');
  if(lines.length < 2) return;
  e.preventDefault();
  dragState = { from: Number(row.dataset.line), lines, boxes: measureLineBoxes(lines), to: null };
  handle.setPointerCapture(e.pointerId);
  row.classList.add('dragging');
  document.body.classList.add('notes-dragging');
  dragState.row = row;
  dragState.handle = handle;
  paintDropIndicator(dragState.from);
});
noteGutter.addEventListener('pointermove', (e) => {
  if(!dragState) return;
  e.preventDefault();
  // auto-skrol kad se prevuče do ivice editora
  const base = noteEditor.getBoundingClientRect();
  if(e.clientY < base.top + 24) noteEditor.scrollTop -= 8;
  else if(e.clientY > base.bottom - 24) noteEditor.scrollTop += 8;
  dragState.to = dropIndexAt(e.clientY);
  paintDropIndicator(dragState.to);
});
function endDrag(){
  if(!dragState) return;
  const { from, to, lines, row } = dragState;
  row.classList.remove('dragging');
  document.body.classList.remove('notes-dragging');
  dropIndicator().classList.remove('show');
  dragState = null;
  if(to == null || to === from || to === from + 1){ renderGutter(); return; }
  const next = lines.slice();
  const [moved] = next.splice(from, 1);
  const novoMesto = to > from ? to - 1 : to;
  next.splice(novoMesto, 0, moved);
  setNoteText(next.join('\n'));
  /* Kursor ide na KRAJ premeštenog stiha.
     Ranije ga `setNoteText` nije nigde postavljao, pa je padao na sam početak
     pesme — sledeći otkucani znak je upadao u prvi red, a korisnik gleda u
     stih koji je upravo pomerio. */
  let kraj = moved.length;
  for(let i = 0; i < novoMesto; i++) kraj += next[i].length + 1;
  noteEditor.focus();
  setCaretAtTextPos(kraj);
  toast(uiTxt('Stih premešten'));
}
noteGutter.addEventListener('pointerup', endDrag);
noteGutter.addEventListener('pointercancel', endDrag);

// Statistika
function updateNoteStats(){
  const text = getEditorText();
  const stats = el('noteStats');
  // metar se osvežava odavde: updateNoteStats zovu SVA mesta koja menjaju belešku
  renderMeter();
  if(!text.trim()){ stats.textContent = ''; return; }
  const allLines = text.split('\n');
  const lines = allLines.filter(l=>l.trim()).length;
  const words = (text.trim().match(/\S+/g)||[]).length;
  const chars = text.length;
  let syl=0; allLines.forEach(l=>{ if(l.trim()) syl += lineSyllables(l); });
  const scheme = firstStanzaScheme(allLines);
  const schemeName = scheme ? SCHEME_NAMES[scheme] : '';
  // slova šeme ostaju latinična (ista notacija kao u tabu „Klasici")
  stats.textContent = uiTxt(`${lines} ${redRec(lines)} · ${words} ${recRec(words)} · ${chars} ${znakRec(chars)} · ${syl} ${slogRec(syl)}`)
    + (scheme ? ` · ${uiTxt('šema 1. strofe')}: ${scheme}${schemeName ? ' (' + uiTxt(schemeName) + ')' : ''}` : '');
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

/* Reč na kojoj stoji kursor, ili poslednja reč pre njega u tom redu.
   Traži se nad IZVORNIM redom, a latinica se pravi tek od nađene reči.
   Ranije se prvo ceo red pretvarao u latinicu pa se u njemu tražila kolona
   kursora — a `љ`, `њ` i `џ` u latinici postaju DVA znaka, pa se svaka kolona
   posle njih pomeri i panel je nudio rime za pogrešnu reč. */
function getWordAtLineCol(line, col){
  const re = /[a-zA-ZčćžšđČĆŽŠĐЀ-ӿ]+/g;
  let m, best = '';
  while((m = re.exec(line)) !== null){
    if(m.index <= col && col <= m.index + m[0].length) return toLatin(m[0].toLowerCase());
    if(m.index + m[0].length <= col) best = toLatin(m[0].toLowerCase());
    if(m.index > col) break;
  }
  return best;
}

/* Beležnica i „sačuvaj rime" nemaju svoj pretraživač — pozajmljuju vidljivi
   panel `#rimeResults` da izračunaju rime za jednu reč. Pre ove funkcije su ga
   ostavljale prepisanog: povratkom na tab „Rimovanje reči" korisnik je zaticao
   tuđi rezultat ili poruku o učitavanju. Ovde se sadržaj panela zapamti kao
   ČVOROVI (ne innerHTML — tako ⓘ/♡/🔁 zadrže svoje osluškivače) i vrati nazad. */
function tiheRime(word){
  const box = el('rimeResults');
  const sacuvano = [...box.childNodes];
  const staraVrednost = rimeInput.value;
  rimeInput.value = word;
  doRhymes(true);
  rimeInput.value = staraVrednost;
  // sinonimi se preskaču — sinonim nije rima („naći" → izumeti, otkriti)
  const chips = [...box.querySelectorAll('.chip')].filter(c => !c.closest('.syn-card'));
  box.innerHTML = '';
  sacuvano.forEach(n => box.appendChild(n));
  return chips;
}

/* ── ZAGLAVLJE PANELA SA RIMAMA ────────────────────────────────────────────
   Na telefonu panel dok se piše stoji kao TRAKA IZNAD TASTATURE — jedan red
   rima koji se pomera u stranu, po ugledu na traku predloga same tastature.
   Razlog: dok je bio otvoren list visok 34 vh (287 px od 844), zaklanjao je i
   sam stih koji se piše — izmereno, donja ivica editora je bila na 645 px, a
   panel je počinjao na 557. Traka uzima ~78 px i pesma ostaje na ekranu.

   Dugme sa strelicom razvija traku u pun list kad korisnik hoće da razgleda.
   Na računaru i tabletu dugme je sakriveno CSS-om, a panel je isti kao pre. */
function zaglavljePanelaRima(word){
  return `<h4><span class="nr-head-txt">${escapeHtml(uiTxt('Rime za'))} `
    /* Sama reč iz zaglavlja je DUGME (04.08.2026, prijava vlasnice: obrisala je
       „ruta" iz stiha, panel je i dalje pisao „Rime za ruta", a ta reč se nije
       mogla kliknuti da se vrati). Klik je vraća u stih, isto kao klik na rimu
       ispod. `data-nr-rec` nosi pravi zapis (bez pretvaranja u ćirilicu), jer
       se u tekst upisuje ono što je u rečniku. */
    + `<button type="button" class="nr-word nr-word-btn" data-nr-rec="${escapeHtml(word)}" `
    + `title="${escapeHtml(uiTxt('klikni da vratiš ovu reč u stih'))}">`
    + `${escapeHtml(disp(word))}</button></span>`
    /* Strelica je nacrtana, ne otkucana: znakovi ⌃ i ⌄ u većini fontova nemaju
       pravi oblik (u Rubiku ispadne kao mali ugao u ćošku) i zavise od toga koji
       je font stigao. SVG uvek izgleda isto. */
    + `<button type="button" class="nr-toggle" aria-expanded="false" `
    + `aria-label="${uiTxt('prikaži sve rime')}">`
    + `<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" focusable="false">`
    + `<path d="M4.5 12.75 10 7.25l5.5 5.5" fill="none" stroke="currentColor" `
    + `stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></h4>`;
}
function vezniProsirivacPanela(box){
  const w = box.querySelector('.nr-word-btn');
  if(w){
    w.onclick = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      insertRhymeAtCaret(w.dataset.nrRec || w.textContent);
      w.classList.add('nr-word-vracena');
      setTimeout(() => w.classList.remove('nr-word-vracena'), 320);
    };
    // klik na zaglavlje ne sme da oduzme fokus editoru — inače nema gde da uđe reč
    w.onpointerdown = (ev) => ev.preventDefault();
  }
  const b = box.querySelector('.nr-toggle');
  if(!b) return;
  const otvoren = box.classList.contains('nr-open');
  b.setAttribute('aria-expanded', otvoren ? 'true' : 'false');
  b.setAttribute('aria-label', uiTxt(otvoren ? 'skupi listu rima' : 'prikaži sve rime'));
  b.onclick = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const sada = box.classList.toggle('nr-open');
    b.setAttribute('aria-expanded', sada ? 'true' : 'false');
    b.setAttribute('aria-label', uiTxt(sada ? 'skupi listu rima' : 'prikaži sve rime'));
    zakaziLepljenjeTrake();   // visina panela se promenila → dovraći ga na dno vidokruga
    if(!sada) box.scrollTop = 0;
    // razvijanje menja red iz „pomera se u stranu" u „prelama se" i obrnuto
    osveziMaskuReda(box.querySelector('.results'));
    keepCaretVisible();
  };
  // klik na traku ne sme da oduzme fokus editoru — inače nestane mesto za unos
  b.onpointerdown = (ev) => ev.preventDefault();
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
  // ostani na reči sa kojom se rimuješ dok je pod kursorom upravo ubačena rima
  if(noteInsertedWord && word === noteInsertedWord && notePanelWord){
    word = notePanelWord;
  } else {
    noteInsertedWord = '';
    notePanelWord = word;
  }
  if(!word || word.length < 2){
    box.innerHTML = '';
    box.classList.remove('nr-open');
    notePanelKey = notePanelBase = null;
    notePanelWord = noteInsertedWord = '';
    return;
  }
  const chips = tiheRime(word);
  if(!chips.length){
    notePanelKey = null;
    box.innerHTML = zaglavljePanelaRima(word)
      + `<p class="nr-empty">${escapeHtml(uiTxt('Nema pronađenih rima.'))}</p>`;
    vezniProsirivacPanela(box);
    return;
  }

  /* Bez nepotrebnog precrtavanja: kad klikneš rimu, ubačena reč postaje reč pod
     kursorom, a ona se rimuje sa istom grupom — lista je ista. Ranije se ceo
     panel svejedno rušio i ponovo gradio, pa je okvir čipa „trepnuo" (nov čvor
     kreće bez :hover pa ga odmah dobije, a ima prelaz na border-color). */
  const baza = chips.map(c => c.querySelector('.word').textContent).join('|');
  // druga rimska grupa → lista se skuplja nazad na prvih NOTE_RHYMES_STEP
  if(baza !== notePanelBase){ notePanelBase = baza; notePanelExpanded = false; }
  const kljuc = baza + '#' + (notePanelExpanded ? 'sve' : 'deo');
  if(kljuc === notePanelKey){
    const wEl = box.querySelector('.nr-word');
    if(wEl) wEl.textContent = disp(word);   // samo naslov, čipovi ostaju netaknuti
    return;
  }
  notePanelKey = kljuc;

  box.innerHTML = zaglavljePanelaRima(word);
  vezniProsirivacPanela(box);
  const rdiv = document.createElement('div');
  rdiv.className = 'results';
  const limit = notePanelExpanded ? chips.length : NOTE_RHYMES_STEP;
  chips.slice(0, limit).forEach(chip => {
    const clone = chip.cloneNode(true);
    // Klonovi nemaju event listenere originala, pa bi ⓘ/♡/🔁 bili mrtva dugmad —
    // sklanjamo ih; u uskom bočnom panelu ostaje samo reč + broj slogova.
    clone.querySelectorAll('.mini').forEach(b => b.remove());
    // Tekst mora da opisuje ono što se STVARNO dešava: klik zamenjuje reč pod
    // kursorom, a ubacuje samo kad je kursor u praznini (nalaz V6).
    clone.title = uiTxt('klikni da uneseš reč u stih (menja reč pod kursorom)');
    /* ZNAČENJE REČI I U BOČNOM PANELU (04.08.2026, pitanje vlasnice: „zašto
       rime u desnoj koloni imaju samo broj slogova?").
       Dugme ⓘ se ovde ne vraća — panel je uzak, a svaka ikonica pojede mesto
       koje treba rimi. Umesto toga objašnjenje se pokaže samo od zadržavanja
       kursora na reči, u istom oblačiću koji ⓘ koristi u rezultatima.
       Zašto sa zadržavanjem od 420 ms: bez odlaganja bi oblačić iskakao dok oko
       prelazi preko spiska, a čovek tu bira reč pogledom, ne čitanjem svake.
       Skidanje rečnika objašnjenja kreće tek na prvi prelaz mišem, ne pri
       učitavanju strane (v. `pripremiDefinicije`). */
    let cekaObjasnjenje = null;
    const rec = clone.querySelector('.word').textContent;
    clone.addEventListener('mouseenter', () => {
      if(jeTelefon()) return;          // na dodir panel radi drugačije — dodir ubacuje reč
      pripremiDefinicije();
      clearTimeout(cekaObjasnjenje);
      cekaObjasnjenje = setTimeout(() => showDefAt(clone.dataset.w || rec, clone, false), 420);
    });
    clone.addEventListener('mouseleave', () => { clearTimeout(cekaObjasnjenje); hideDef(); });
    /* Tastatura: ista stvar bez miša. Čip u panelu nije dugme, pa dobija
       `tabindex` — inače se do objašnjenja ne može bez pokazivača. */
    clone.tabIndex = 0;
    clone.addEventListener('focus', () => { pripremiDefinicije(); showDefAt(clone.dataset.w || rec, clone, false); });
    clone.addEventListener('blur', hideDef);
    clone.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); clone.click(); }
    });
    clone.onclick = () => {
      insertRhymeAtCaret(clone.querySelector('.word').textContent);
      clone.classList.add('chip-inserted');
      setTimeout(() => clone.classList.remove('chip-inserted'), 320);
    };
    rdiv.appendChild(clone);
  });
  box.appendChild(rdiv);
  // na telefonu traka se pomera u stranu — desna ivica kaže da ima još rima
  pratiPomeranjeUStranu(rdiv, false);
  // sadržaj panela se promenio → visina je drugačija → traku dovraći na dno
  zakaziLepljenjeTrake();

  // „još N rima" — otvara se u samom panelu; odlazak na drugu stranu bi
  // prekinuo pisanje, a zbog toga panel i postoji
  if(chips.length > NOTE_RHYMES_STEP){
    const more = document.createElement('button');
    more.className = 'nr-more';
    more.textContent = notePanelExpanded
      ? uiTxt('prikaži manje')
      : `${uiTxt('još')} ${chips.length - NOTE_RHYMES_STEP} ${uiTxt(rimaRec(chips.length - NOTE_RHYMES_STEP))}`;
    more.onclick = () => {
      notePanelExpanded = !notePanelExpanded;
      notePanelKey = null;          // traži ponovno crtanje
      renderNoteRhymes();
      if(!notePanelExpanded) box.scrollTop = 0;
    };
    box.appendChild(more);
  }
}

// „1 slog" / „2 sloga" / „5 slogova"
function slogRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'slog';
  if(d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'sloga';
  return 'slogova';
}

// „1 stih" / „2 stiha" / „5 stihova"
function stihRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'stih';
  if(d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'stiha';
  return 'stihova';
}

// „još 1 rima" / „još 2 rime" / „još 48 rima"
function rimaRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'rima';
  if(d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'rime';
  return 'rima';
}

/* Srpska množina — jedno pravilo, tri oblika: 1 / 2–4 / 5+.
   Izuzetak su 11–14 (jedanaest reči, dvanaest reči), zato `dd` provera.
   Ranije je na tri mesta pisalo „1 reči", „2 slogova", „4 redova", jer su
   se koristili uslovi tipa `n===1 ? 'red' : 'redova'` — a to je tačno samo
   za jedninu, dok 2–4 u srpskom traže poseban oblik. */
// „1 reč" / „2 reči" / „5 reči"
function recRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'reč';
  return 'reči';
}
// „1 znak" / „2 znaka" / „5 znakova"
function znakRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'znak';
  if(d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'znaka';
  return 'znakova';
}
// „1 poen" / „2 poena" / „5 poena"
function poenRec(n){
  const d = n % 10, dd = n % 100;
  return (d === 1 && dd !== 11) ? 'poen' : 'poena';
}
// „1 red" / „2 reda" / „5 redova"
function redRec(n){
  const d = n % 10, dd = n % 100;
  if(d === 1 && dd !== 11) return 'red';
  if(d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'reda';
  return 'redova';
}

/* Slovo — i latinično i ćirilično. Radi na IZVORNOM tekstu, bez prolaska kroz
   `toLatin()`: pretvaranje „њ" u „nj" pomeri sve indekse za jedno mesto, pa bi
   opseg reči pao pored (isti uzrok kao nalaz o koloni kursora u ćirilici). */
const SLOVO = /[a-zA-ZčćžšđČĆŽŠĐЀ-ӿ]/;

/* Opseg reči na kojoj stoji kursor, u koordinatama `getEditorText()`.
   Vraća `null` kad je kursor u praznini (ni levo ni desno nema slovo) — tada
   korisnik piše novu reč, pa se rima UBACUJE umesto da nešto zameni. */
function wordRangeAt(text, pos){
  if(pos == null) return null;
  let s = pos, e = pos;
  while(s > 0 && SLOVO.test(text[s - 1])) s--;
  while(e < text.length && SLOVO.test(text[e])) e++;
  return s === e ? null : { start: s, end: e };
}

/* Postavljanje kursora na tačnu poziciju u koordinatama `getEditorText()`
   (dakle sa `<br>` = jedan znak). `restoreCursorPosition` to ne ume — ona broji
   samo tekstualne čvorove, pa posle zamene reči na kraju stiha kursor odskoči
   u sledeći red. */
function setCaretAtTextPos(pos){
  const sel = window.getSelection();
  const range = document.createRange();
  let acc = 0, done = false;
  const walk = (node) => {
    for(const child of node.childNodes){
      if(done) return;
      if(child.nodeType === Node.TEXT_NODE){
        const len = child.data.length;
        if(pos <= acc + len){ range.setStart(child, pos - acc); done = true; return; }
        acc += len;
      } else if(child.nodeName === 'BR'){
        if(child.classList && child.classList.contains('cursor-br')) continue;
        if(pos <= acc){ range.setStartBefore(child); done = true; return; }
        acc += 1;
      } else walk(child);
    }
  };
  walk(noteEditor);
  if(!done){ range.selectNodeContents(noteEditor); range.collapse(false); }
  else range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/* Klik na rimu u beležnici — ZAMENJUJE reč pod kursorom (nalaz V6).
   Panel piše „RIME ZA NADA", pa i klik mora da promeni baš „nada". Ranije se
   rima samo umetala na mesto kursora, pa je kursor usred reči davao
   „gde je na kadada" umesto „gde je kada".
   Pravilo: kursor u reči ili uz nju → ZAMENI; kursor u praznini → UBACI
   (tada korisnik piše novi stih, i razmak i dalje treba dodati). */
function insertRhymeAtCaret(w){
  // panel ostaje na reči sa kojom se rimuje, ne skače na upravo ubačenu
  noteInsertedWord = toLatin(w.toLowerCase()).replace(/[^a-zčćžšđ]/g, '');
  const text = getEditorText();
  const caret = getCaretTextPos();

  if(caret == null){
    // kursor nije u editoru — dopiši na kraj (staro ponašanje)
    const novi = text + (text && !/[\s\n]$/.test(text) ? ' ' : '') + w;
    zapisiBelesku(novi, novi.length);
    return;
  }

  const opseg = wordRangeAt(text, caret);
  if(opseg){
    zapisiBelesku(text.slice(0, opseg.start) + w + text.slice(opseg.end),
                  opseg.start + w.length);
  } else {
    const levo = text.slice(0, caret);
    const razmak = (levo.length > 0 && !/[\s\n(„"'\-]$/.test(levo)) ? ' ' : '';
    zapisiBelesku(levo + razmak + w + text.slice(caret),
                  caret + razmak.length + w.length);
  }
}

/* Upiši nov tekst u editor pa VRATI kursor, tim redom. Obrnuto ne valja:
   `setNoteText` odmah zove `renderNoteRhymes`, koji čita položaj kursora — a
   on posle prepisivanja `innerHTML`-a više ne postoji, pa bi panel skočio. */
function zapisiBelesku(text, caretPos){
  const { colorMap } = analyzeRhymes(text);
  noteEditor.innerHTML = colorMap.size > 0
    ? renderColoredText(text)
    : escapeHtml(text).replace(/\n/g, '<br>');
  noteEditor.focus();
  setCaretAtTextPos(caretPos);
  updateEditor();
}

/* Reč za koju se čuva/preuzima lista rima.
   Ranije je ovo UVEK bila poslednja reč cele beleške, pa su dugmad „sačuvaj
   rime" i „preuzmi listu" davala rime za drugu reč nego što panel pokazuje —
   dovoljno je bilo kliknuti u sredinu pesme. Sada se prvo uzima reč koju panel
   stvarno prikazuje (`notePanelWord`), a poslednja reč ostaje kao rezerva za
   slučaj kad kursor nije u editoru. */
function getRhymeListForLastWord(){
  let word = notePanelWord;
  if(!word){
    const lines = getEditorText().split('\n');
    let lastLine = '';
    for(let i = lines.length - 1; i >= 0; i--){
      if(lines[i].trim()){ lastLine = lines[i]; break; }
    }
    word = getLastWordInLine(lastLine);
  }
  if(!word || word.length < 2) return { word: '', rhymes: [] };
  // i ovde bez sinonima — lista se zove „Rime za X", pa mora da sadrži samo rime
  const rhymes = [];
  tiheRime(word).forEach(c => {
    const t = c.querySelector('.word')?.textContent.trim();
    if(t) rhymes.push(t);
  });
  return { word, rhymes };
}
el('saveRhymeList').onclick = () => {
  const { word, rhymes } = getRhymeListForLastWord();
  if(!word || !rhymes.length){ toast('Prvo klikni na reč u pesmi — rime za nju se pojave sa strane, pa ih onda sačuvaš'); return; }
  const lists = lsJSON('rimoteka_lists', []);
  lists.unshift({ word, rhymes, date: new Date().toISOString() });
  lsSet('rimoteka_lists', JSON.stringify(lists.slice(0, 50)));
  toast(`Sačuvano ${rhymes.length} rima za „${word}"`);
};
el('exportRhymeList').onclick = () => {
  const { word, rhymes } = getRhymeListForLastWord();
  if(!word || !rhymes.length){ toast('Nema još nijedne rime — klikni na reč u pesmi pa se rime pojave sa strane'); return; }
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
  if(!text.trim()){ toast('Beležnica je prazna — napiši prvi stih pa je preuzmi'); return; }
  const full = getPoemTitle() ? getPoemTitle() + '\n\n' + text : text;
  const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pesma-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Pesma je preuzeta');
};

// Inicijalno renderovanje
renderGutter();
updateNoteStats();
renderNoteRhymes();
poslednjaSacuvanaBeleska = getEditorText();

/* Drugi tab je promenio zajedničku memoriju (v. objašnjenje uz `sacuvajBelesku`).
   `storage` stiže samo iz DRUGIH tabova, nikad iz ovog. */
window.addEventListener('storage', e => {
  if(e.key === 'rimoteka_notes'){
    const noviTekst = e.newValue || '';
    const mojTekst = getEditorText();
    if(noviTekst === mojTekst) return;
    if(mojTekst === poslednjaSacuvanaBeleska){
      // ništa nismo dirali od svog poslednjeg upisa → bezbedno je preuzeti
      poslednjaSacuvanaBeleska = noviTekst;
      setNoteText(noviTekst);
    } else {
      // imamo svoje izmene: ne diramo ništa, ali korisnik MORA da zna
      toast(uiTxt('Pesma je promenjena u drugom tabu Rimoteke. Ovde je tvoja verzija — zatvori jedan tab da se ne bi pregazile.'));
    }
    return;
  }
  if(e.key === 'rimoteka_favorites'){
    favorites = lsJSON('rimoteka_favorites', []).filter(w => typeof w === 'string');
    updateFavCount();
    renderFavorites();
  }
});

/* ====================== OMILJENE ====================== */
function updateFavCount(){ el('favCount').textContent = favorites.length; }
function renderFavorites(){
  const box=el('favResults');
  box.innerHTML='';
  if(!favorites.length){ box.innerHTML='<p class="empty">' + uiTxt('Još nemaš sačuvane reči. Klikni ♡ pored bilo koje reči — pretvoriće se u notu.') + '</p>'; return; }
  renderGroup(box, `Tvoje reči (${favorites.length})`, favorites.slice(), false);
}
el('copyFavs').onclick = ()=>{
  if(!favorites.length) return;
  copy(favorites.map(disp).join(', '));
};
el('clearFavs').onclick = ()=>{
  if(favorites.length && confirm('Obrisati sve omiljene reči?')){
    favorites=[]; sacuvajOmiljene(); updateFavCount(); renderFavorites();
  }
};

/* ====================== TABOVI / PISMO / TOAST ====================== */
/* Aktivan tab mora da se VIDI — i čitaču ekrana i na uskom telefonu.
   Nalaz N8: stanje je postojalo samo kao CSS klasa, bez `aria-current`, pa
   čitač ekrana nije imao odakle da zna gde se korisnik nalazi. */
function oznaciAktivanTab(name){
  document.querySelectorAll('#tabs [data-tab]').forEach(b => {
    const jeste = b.dataset.tab === name;
    b.classList.toggle('active', jeste);
    if(jeste) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}
/* Od 16.08.2026. traka tabova se na telefonu PRELAMA u više redova (odluka
   vlasnice: ništa se ne seče) — `scrollWidth` je tada jednak `clientWidth`, pa
   ova dva mehanizma (dovlačenje aktivnog taba, maska) miruju. Ostaju kao
   rezerva za slučaj da se red sa pomeranjem ikad vrati. */
function dovediAktivanTabUVid(){
  const traka = document.getElementById('tabs');
  const akt = traka && traka.querySelector('[data-tab].active');
  if(!traka || !akt || traka.scrollWidth <= traka.clientWidth) return;
  const cilj = akt.offsetLeft - (traka.clientWidth - akt.offsetWidth) / 2;
  traka.scrollLeft = Math.max(0, cilj);
}

const trakaTabova = document.getElementById('tabs');
function osveziMaskuTabova(){
  if(!trakaTabova) return;
  const doKraja = trakaTabova.scrollLeft + trakaTabova.clientWidth >= trakaTabova.scrollWidth - 4;
  trakaTabova.classList.toggle('tabs-do-kraja', doKraja);
}
if(trakaTabova){
  trakaTabova.addEventListener('scroll', osveziMaskuTabova, {passive:true});
  window.addEventListener('resize', osveziMaskuTabova);
  osveziMaskuTabova();
}


/* ── NASLOV PRATI TAB (03.08.2026) ──────────────────────────────────────────
   Prijava vlasnice: „klikne se Rečnik, adresa se promeni, a naslov ostane sa
   početne". Tačno tako je i bilo. Svaka strana IMA svoj `h1` u svom HTML-u —
   `/recnik-srpskog-jezika/` ima „Rečnik srpskog jezika" i to Google i vidi kad
   je otvori. Ali prebacivanje taba menja samo adresu (`pushState`), a naslov,
   podnaslov i naslov kartice ostaju sa strane sa koje se krenulo.

   Zato se ovde, uz tab, menja i naslovni blok. Ovo NE dira ono što Google
   čita: on svaku stranu skida zasebno i dobija njen pravi `h1` iz HTML-a.
   Ovo je za čoveka koji klikće po tabovima. */
const TAB_NASLOV = {
  rime: {
    h1: 'Rimovanje reči na srpskom jeziku — rečnik rima za tvoj stih',
    p: 'Upiši reč i odmah dobiješ sve rime. Uz svaku piše koliko ima slogova i šta znači, a celu pesmu pišeš u beležnici — rime se tamo boje dok kucaš.',
    naslov: 'Rimovanje reči na srpskom — rime, slogovi, pesme | Rimoteka',
  },
  beleznica: {
    h1: 'Pisanje pesama uz rime koje se boje dok kucaš',
    p: 'Piši pesmu, a rime za reč pod kursorom stoje sa strane — klikni i reč uđe u stih. Uz svaki stih piše broj slogova.',
    naslov: 'Pisanje pesama — beležnica sa rimama, slogovima i metrom | Rimoteka',
  },
  slogovi: {
    h1: 'Brojanje slogova i karaktera — u reči, stihu ili celoj pesmi',
    p: 'Upiši ili nalepi tekst — uz svaki red stoji broj slogova, a na dnu zbir slogova, reči i znakova.',
    naslov: 'Brojanje slogova i karaktera — brojač za reč, stih i pesmu | Rimoteka',
  },
  pretraga: {
    h1: 'Rečnik srpskog jezika — traži reč po slovima, čitaj šta znači',
    p: 'Traži reč po početku, kraju ili slovima u sredini. Uz svaku piše šta znači i koliko ima slogova.',
    naslov: 'Rečnik srpskog jezika — pretraga reči i značenja | Rimoteka',
  },
  igra: {
    h1: 'Igra rimovanja — koliko dug niz rima možeš da sastaviš?',
    p: 'Rime na vreme, sam ili sa društvom. Koliko dug niz možeš da sastaviš?',
    naslov: 'Igra rimovanja — vežbaj rime na vreme, sam ili sa društvom | Rimoteka',
  },
  klasici: {
    h1: 'Klasici srpske poezije — poznate pesme sa šemom rime',
    p: 'Poznate pesme velikih srpskih pesnika, sa brojem slogova uz svaki stih i slovom šeme rime. Klikni završnu reč stiha pa vidiš koje se reči rimuju sa njom.',
    naslov: 'Srpske pesme — klasici sa šemom rime i brojem slogova | Rimoteka',
  },
  omiljene: {
    h1: 'Omiljene reči',
    p: 'Reči koje si sačuvao stoje ovde, na jednom mestu — pri ruci dok pišeš.',
    naslov: 'Omiljene reči | Rimoteka',
  },
};
function postaviNaslovTaba(name){
  const t = TAB_NASLOV[name];
  if(!t) return;
  const h1 = document.querySelector('.hero h1');
  const p  = document.querySelector('.hero p');
  /* Ćirilica: naslov se upisuje kroz `disp`-ov put, isto kao sve ostalo na
     strani, pa se pri uključenoj ćirilici ne vrati latinicom. */
  if(h1) h1.textContent = script === 'cyr' ? toCyr(t.h1) : t.h1;
  if(p)  p.textContent  = script === 'cyr' ? toCyr(t.p)  : t.p;
  document.title = t.naslov;
}
function switchTab(name){
  oznaciAktivanTab(name);
  postaviNaslovTaba(name);
  dovediAktivanTabUVid();
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+name));
  if(name === 'igra') initGame();
  /* Nalaz S7: igra je nastavljala da radi i posle prelaska na drugi tab —
     odbrojavanje je teklo, zvuk je kucao, vreme je isticalo i reči su se
     trošile dok korisnik piše pesmu. Sada se pri odlasku pauzira, a pri
     povratku se odbrojavanje nastavlja od zaustavljene sekunde. */
  // `try` jer se `switchTab` može pozvati i iz sigurnosne mreže, pre nego što
  // promenljive igre postoje — pauza igre nikad ne sme da obori prebacivanje taba
  try { if(name !== 'igra') pauzirajIgru(); else nastaviIgru(); } catch(e){}
  // Tekst o alatu ispod tabova pripada tabu „Rime" — na ostalim tabovima bi
  // pričao o pogrešnoj stvari (npr. o rimovanju dok gledaš Igru). CSS ga
  // sakriva preko ovog atributa.
  document.body.dataset.tab = name;
  /* i <html> drži istu oznaku — po njoj CSS bira traku ili futerski poziv za
     saradnju (početna vrednost stiže iz kratke skripte u zaglavlju) */
  document.documentElement.dataset.tab = name;
  if(name !== 'beleznica'){ document.body.classList.remove('notes-typing'); odlepiTrakuRima(); }
  // brojač se meri iz stvarnog rasporeda — sakriven panel nema širinu
  if(name === 'slogovi' && sylInput.value) updateSyl();
  // gutter se meri iz stvarnog rasporeda — sakriven panel nema visinu, pa se
  // redovi moraju premeriti čim tab postane vidljiv
  if(name === 'beleznica') renderGutter();
}
/* Traka tabova je ujedno navigacija sajta: svaki alat ima svoju stranu, pa su
   stavke pravi linkovi (Google tako vidi istu strukturu na svakoj strani).
   Ako alat POSTOJI na ovoj strani — a na početnoj postoje svi — klik se
   presreće i tab se samo prebaci, bez osvežavanja. Na stranama gde tog panela
   nema, link radi kao običan link. */
/* URL JE STANJE (nalaz V7).
   Traka tabova jesu pravi linkovi, ali je klik bio presretnut i adresa je
   ostajala ista na svih sedam tabova — pa nije bilo deljivog linka, „Nazad"
   nije radio, a osvežavanje je vraćalo na rime. Zato se posle prebacivanja
   adresa gura u istoriju (`pushState`), a „Nazad" se hvata (`popstate`).
   Adresa se uzima iz samog `href`-a taba, da postoji samo na jednom mestu. */
const TAB_URL_FALLBACK = { omiljene: '/?tab=omiljene', igra: '/igra-rimovanja/' };
function tabHref(name){
  const t = document.querySelector('#tabs [data-tab="' + name + '"]');
  const h = t && t.getAttribute ? t.getAttribute('href') : null;
  return h || TAB_URL_FALLBACK[name] || ('/?tab=' + name);
}
// Koji je tab opisan trenutnom adresom (za „Nazad" i za prvo učitavanje)
function tabIzURLa(){
  try{
    const t = new URLSearchParams(location.search).get('tab');
    if(t && document.getElementById('panel-' + t)) return t;
    const put = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
    for(const b of document.querySelectorAll('#tabs [data-tab]')){
      const h = b.getAttribute('href');
      if(h && h === put && document.getElementById('panel-' + b.dataset.tab)) return b.dataset.tab;
    }
  }catch(e){}
  return 'rime';
}
// Adresa koja odgovara tabu, sa `?rec=` samo dok smo na rimama
function urlZaTab(name){
  let url = tabHref(name);
  if(name === 'rime'){
    const q = toLatin(rimeInput.value.trim().toLowerCase()).replace(/[^a-zčćžšđ]/g,'');
    if(q.length >= 2) url += (url.includes('?') ? '&' : '?') + 'rec=' + encodeURIComponent(q);
  }
  return url;
}
el('tabs').addEventListener('click', e=>{
  const t = e.target.closest('[data-tab]');
  if(!t) return;
  const name = t.dataset.tab;
  if(!document.getElementById('panel-' + name)) return;   // nema panela → pusti link
  if(e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;  // novi tab/prozor
  e.preventDefault();
  switchTab(name);
  try{
    const url = urlZaTab(name);
    if(location.pathname + location.search !== url) history.pushState({ tab:name }, '', url);
  }catch(err){}
});
window.addEventListener('popstate', ()=>{
  const name = tabIzURLa();
  if(!document.getElementById('panel-' + name)) return;
  switchTab(name);
  try{
    const p = new URLSearchParams(location.search).get('rec');
    if(name === 'rime' && p && p.trim()){
      rimeInput.value = disp(p.trim().toLowerCase());
      doRhymes();
    }
  }catch(e){}
});

const brandHome = el('brandHome');
/* Nalaz S1: logo na početnoj ima `cursor:pointer`, dakle obećava „nazad na
   početak", a klik je samo prebacivao tab — polje, svih 180 rima i `?rec=` u
   adresi ostajali su netaknuti. Na generisanim stranama logo JESTE `<a href="/">`
   i tamo uredno resetuje; ovde se isti ishod postiže bez diranja logotipa
   (pravilo 8a: ne menja se ni tag, ni klasa, ni CSS oko njega). */
/* Prazno stanje panela sa rimama (`index.html`, `.prazno-stanje`) zapamti se pri
   učitavanju, da bi se vratilo kad se čovek klikom na logo vrati „na početak".
   Ranije je `goHome()` upisivao prazan niz, pa je posle prvog povratka taj prostor
   ostajao potpuno prazan — i sve što u njemu piše videlo bi se samo jednom.
   Čita se lenjo i uz `try`, jer skripta ne sme da padne ako elementa nema. */
let praznoStanjeHtml = null;
function pamtiPraznoStanje(){
  if(praznoStanjeHtml === null){
    try{ praznoStanjeHtml = el('rimeResults')?.innerHTML || ''; }catch(e){ praznoStanjeHtml = ''; }
  }
  return praznoStanjeHtml;
}
try{ pamtiPraznoStanje(); }catch(e){}

function goHome(){
  rimeInput.value = '';
  el('rimeResults').innerHTML = pamtiPraznoStanje();
  hideAutocomplete();
  switchTab('rime');
  try{
    if(location.search || location.pathname !== '/') history.pushState(null, '', '/');
  }catch(e){}
  window.scrollTo({top:0, behavior:'smooth'});
}
brandHome.addEventListener('click', goHome);
brandHome.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goHome(); } });

el('scriptToggle').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  script=b.dataset.script;
  lsSet('rimoteka_script', script);
  document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
  applyScriptToUI();
  prebaciBelesku();          // i pesma u beležnici prelazi u izabrano pismo
  prikaziUputstvoZaTastaturu();
  // ponovo iscrtaj sve što je prikazano
  if(rimeInput.value.trim()) doRhymes();
  if(searchInput.value.trim()) doSearch();
  renderFavorites();
  renderKlasici();
  // beležnica: gutter, statistika, metar i panel sa rimama se crtaju iz JS-a
  renderGutter();
  updateMeterButton();
  updateNoteStats();
  renderNoteRhymes();
  toast(script === 'cyr' ? 'Све се приказује ћирилицом' : 'Sve se prikazuje latinicom');
});

/* Ćirilica/latinica za CEO interfejs (tabovi, dugmad, labele, placeholderi).
   Konverzija je dvosmerna (toCyr/toLatin sa digrafima lj/nj/dž), pa se
   primenjuje direktno na tekst nodove — bez čuvanja originala. */
const UI_SCRIPT_SELS = [
  // Tabovi su 28.07.2026. postali pravi <a href> zbog SEO-a; ostao je samo
  // „Omiljene" kao <button>. Selektor je ostao na `button`, pa se od cele trake
  // u ćirilicu prebacivala jedino ta jedna stavka.
  '#tabs a', '#tabs button', '.flabel', '.syl-filter button', '.loose-toggle', '.notepad-legend',
  '#rimeBtn', '#searchBtn', '#searchMode option', '.hint',
  /* Ekran igre je ranije ostajao POLA latinica: uputstvo „Nađi rimu za reč:",
     dugme „Proveri" i sve povratne poruke nisu bili u ovom spisku. */
  '.game-setup-label', '#gameStart', '#gameHandoffStart', '.game-handoff-hint',
  '#gameHandoffTitle', '.game-results-title', '#gameAgain', '.game-label',
  '.game-instruction', '#gameSubmit', '#panel-igra .hint',
  '.landing h2', '.landing-faq summary',
  /* Prekidač za pismo menja CEO tekst strane, ne samo dugmad i rezultate.
     Ranije je hvatao samo okvir alata, pa je naslov, uvod, SEO tekst i odgovor
     na često pitanje ostajao na latinici i kad je izabrana ćirilica. */
  '.hero h1', '.hero p', '.seo-content', '.notepad-title',
  '.landing-h1', '.landing-lead', '.landing-cta', '.crumbs',
  '.res-group', '.landing-faq details p', '.slog-table', '.syl-label',
  '.footer-desc', '.footer-keys', '.footer-rimes-label'
];
const UI_SCRIPT_INPUTS = ['rimeInput', 'searchInput', 'sylInput', 'noteTitle', 'gameInput', 'gamePlayersCustom'];

/* Polja u koja se KUCA reč koja se traži. Kad je izabrana ćirilica, i ono što
   korisnik upiše prikazuje se ćirilicom — inače pola strane bude ćirilica, a
   reč u polju latinica.
   NAMERNO nisu ovde beležnica i brojač slogova: tamo stoji tekst korisnika
   (pesma se čuva na uređaju), pa ga alat ne sme prekucavati sam od sebe.
   Prebacuje se preko latinice — `toCyr(toLatin(v))` — da bi digrafi radili:
   posle „l" stoji „л", a čim stigne „j" ceo niz se pročita kao „lj" → „љ". */
const UNOS_PO_PISMU = ['rimeInput', 'searchInput', 'gameInput'];

/* ĆIRILIČNA TASTATURA + ĆIRILIČNI REŽIM — alat je kvario reč dok se kuca.
   Prebacivanje ide kroz latinicu (ćirilica → latinica → ćirilica), a u latinici
   su `dž`, `nj` i `lj` DIGRAFI — jedno slovo. Kad se u ćirilici д i ж samo
   DODIRUJU a nisu digraf, povratni prolaz ih spoji:
       „надживети" → „nadživeti" → „наџивети"
       „инјекција" → „injekcija" → „ињекција"
   Zato se između takva dva slova ubaci nevidljivi čuvar, koji digrafska pravila
   razdvaja, pa se na kraju ukloni. Isti obrazac koji `convertTextNodes` koristi
   da zaštiti skraćenice. */
const CUVAR_DIGRAFA = '';
function toLatinCuvano(s){
  return toLatin(s.replace(/([дДнНлЛ])([жЖјЈ])/g, (m, a, b) => a + CUVAR_DIGRAFA + b));
}
function bezCuvara(s){ return s.split(CUVAR_DIGRAFA).join(''); }

/* ISTI PROBLEM, DRUGI SMER: latinica → ćirilica.
   Kad tekst DOLAZI iz ćirilice, čuvar iznad zna gde digraf nije digraf. Kad je
   tekst otkucan ili nalepljen na latinici, te obaveštenosti nema — a `dž`, `nj`
   i `lj` na granici prefiksa i korena nisu jedno slovo:
       „nadživeti" → „наџивети"   (treba „надживети")
       „injekcija" → „ињекција"   (treba „инјекција")
   Pravilo se ne da izvesti iz oblika reči: „konj" JESTE digraf, „konjugacija"
   nije; „inje" jeste, „injekcija" nije. Zato stoji spisak osnova, a ne pravilo.
   Spisak je namerno uzak — svaka stavka samo SPREČAVA pogrešno spajanje, pa ne
   može da pokvari reč koja na njemu nije. Nove reči se dodaju ovde, uz proveru
   u `test/predeploy.mjs`. */
const LAT_NE_DIGRAF = /(nadživ|nadžanr|nadžnj|nadžet|podžanr|podžup|odžval|odžvak|odžive|predželud|predživot|injekc|injekt|injicir|konjug|konjunk|konjukt|tanjug|vanjezič|panjevrop)/gi;
function cuvajLatDigrafe(s){
  return s.replace(LAT_NE_DIGRAF, m =>
    m.replace(/([dnl])([žj])/i, (x, a, b) => a + CUVAR_DIGRAFA + b));
}

/* Jedno mesto na kome se BILO KOJI tekst korisnika prebacuje u izabrano pismo.
   Uvek ide preko latinice, jer su digrafi definisani na latinici. */
function uPismo(s){
  const lat = toLatinCuvano(s);            // čuvar ostaje unutra, namerno
  return bezCuvara(script === 'cyr' ? toCyr(cuvajLatDigrafe(lat)) : toLatin(lat));
}

function prebaciUnos(inp){
  if(!inp || inp.__noop || !inp.value) return;
  const novo = uPismo(inp.value);
  if(novo === inp.value) return;
  const kraj = inp.selectionStart == null || inp.selectionStart === inp.value.length;
  const poz = kraj ? novo.length : uPismo(inp.value.slice(0, inp.selectionStart)).length;
  inp.value = novo;
  try { inp.setSelectionRange(poz, poz); } catch(e){}
}

/* ========== SRPSKI RASPORED TASTATURE U ĆIRILIČNOM REŽIMU ==========
 * Na američkom rasporedu nema tastera za `ć č š đ ž`, pa se u ćirilici nikako
 * nisu mogla otkucati slova `ћ ч ш ђ ж` — a to je pet od trideset slova azbuke.
 * Na srpskom rasporedu ta slova stoje desno od `L` i desno od `P`, na tasterima
 * koji na američkom daju `; ' [ ] \`. Preslikavamo tačno te tastere, pa ko zna
 * srpski raspored kuca kao i inače.
 *
 * Radi SAMO u ćiriličnom režimu i SAMO ako taster stvarno daje interpunkciju:
 * kad je na računaru već izabran srpski raspored, sistem šalje `š`, ne `[`, pa
 * ovo ćuti i ništa ne kvari.
 *
 * APOSTROF: `'` daje `ћ`, pa bi „нек'" i „ил'" ostali bez apostrofa. Zato drugi
 * uzastopni pritisak istog tastera zamenjuje upisano slovo pravim znakom —
 * dobija se i slovo i interpunkcija, bez posebnog režima i bez novog dugmeta.
 * ================================================================== */
const SR_TASTERI = {
  ';': 'ч', "'": 'ћ', '[': 'ш', ']': 'ђ', '\\': 'ж',
  ':': 'Ч', '"': 'Ћ', '{': 'Ш', '}': 'Ђ', '|': 'Ж'
};
const SR_POLJA = '#rimeInput, #searchInput, #gameInput, #sylInput, #noteTitle, #noteEditor';
let zadnjaZamena = null;    // {polje, taster} — pamti se samo jedan potez unazad

function umetniZnak(polje, znak, obrisiPrethodni){
  if(polje.isContentEditable){
    const sel = window.getSelection();
    if(obrisiPrethodni && sel && sel.rangeCount){
      const r = sel.getRangeAt(0);
      if(r.collapsed && r.startContainer.nodeType === Node.TEXT_NODE && r.startOffset > 0){
        r.setStart(r.startContainer, r.startOffset - 1);
        sel.removeAllRanges(); sel.addRange(r);
      } else if(sel.modify){
        sel.modify('extend', 'backward', 'character');
      }
    }
    document.execCommand('insertText', false, znak);
    return;
  }
  const kraj = polje.selectionEnd;
  const poc = (obrisiPrethodni ? polje.selectionStart - 1 : polje.selectionStart);
  if(poc < 0) return;
  polje.value = polje.value.slice(0, poc) + znak + polje.value.slice(kraj);
  const p = poc + znak.length;
  try { polje.setSelectionRange(p, p); } catch(e){}
  polje.dispatchEvent(new Event('input', { bubbles: true }));
}

document.addEventListener('keydown', e => {
  const polje = e.target;
  if(!polje || !polje.closest || !polje.closest(SR_POLJA)) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const slovo = SR_TASTERI[e.key];
  if(slovo === undefined){ zadnjaZamena = null; return; }
  if(script !== 'cyr'){ zadnjaZamena = null; return; }
  e.preventDefault();
  const ponovljen = zadnjaZamena && zadnjaZamena.polje === polje && zadnjaZamena.taster === e.key;
  if(ponovljen){
    umetniZnak(polje, e.key, true);      // drugi pritisak vraća pravi znak
    zadnjaZamena = null;
  } else {
    umetniZnak(polje, slovo, false);
    zadnjaZamena = { polje, taster: e.key };
  }
}, true);
// klik ili odlazak sa polja prekida niz — „нек'" se pravi samo dva pritiska zaredom
document.addEventListener('pointerdown', () => { zadnjaZamena = null; });
document.addEventListener('focusout', () => { zadnjaZamena = null; });

/* Uputstvo o srpskim slovima ima smisla samo dok je izabrana ćirilica.
   Prvi put se otvori samo, da se sazna da postoji; posle pamti šta je izabrano. */
function prikaziUputstvoZaTastaturu(){
  const b = el('kbdHelp');
  if(!b || b.__noop) return;
  b.hidden = script !== 'cyr';
  if(script !== 'cyr') return;
  const det = b.querySelector('details');
  if(det && lsGet('rimoteka_kbd_seen') !== '1'){
    det.open = true;
    lsSet('rimoteka_kbd_seen', '1');
  }
}

/* Šta se NIKAD ne prebacuje u drugo pismo:
   - logo i ime u futeru (logo se ne dira — pravilo 8a u CLAUDE.md)
   - mejl i domen: „info@rimoteka.com" u ćirilici prestaje da bude adresa
   - skraćenice velikim slovima (PDF, ABAB, AABB) — to su oznake, ne reči */
/* `.kbd-help` je uputstvo koje POSTOJI samo u ćirilici i već je napisano
   ćirilicom — kad bi ga prekidač prevodio, tabela tastera bi se pri povratku
   na latinicu prepisala u „š / č", a to nije ono što piše na tasteru. */
const BEZ_PISMA_SEL = '.brand, .brand-logo, .footer-brand, .footer-contact, .footer-legal, .deftip, .kbd-help';
const ADRESA = /[@]|\b[a-z0-9-]+\.(com|rs|org|net)\b/i;
const SKRACENICA = /\b[A-ZĐŽĆČŠ]{2,}\b/g;

function convertTextNodes(root, fn){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n; while((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(t => {
    if(!t.textContent.trim()) return;
    if(t.parentElement && t.parentElement.closest(BEZ_PISMA_SEL)) return;
    if(ADRESA.test(t.textContent)) return;
    /* Skraćenice se izuzmu iz konverzije pa vrate na svoje mesto. Oznaka mora
       da bude znak koji se u tekstu NE MOŽE pojaviti — sa običnim brojem bi
       „ima 3 sloga" bilo prepoznato kao oznaka i tekst bi se pokvario. */
    const cuvane = [];
    const sa = t.textContent.replace(SKRACENICA, m => '\u0000' + (cuvane.push(m) - 1) + '\u0000');
    t.textContent = fn(sa).replace(/\u0000(\d+)\u0000/g, (_, i) => cuvane[+i]);
  });
}
function applyScriptToUI(){
  const fn = script === 'cyr' ? toCyr : toLatin;
  UI_SCRIPT_SELS.forEach(sel => document.querySelectorAll(sel).forEach(elm => convertTextNodes(elm, fn)));
  UI_SCRIPT_INPUTS.forEach(id => {
    const i = el(id); if(i && i.placeholder) i.placeholder = fn(i.placeholder);
  });
  // ono što je već upisano prelazi u izabrano pismo, u oba smera
  UNOS_PO_PISMU.forEach(id => prebaciUnos(el(id)));
  const ne = el('noteEditor');
  if(ne && ne.dataset.placeholder) ne.dataset.placeholder = fn(ne.dataset.placeholder);
  const rb = el('randomBtn');
  if(rb && rb.title) rb.title = fn(rb.title);
}

let toastTimer;
/* Koliko obaveštenje stoji na ekranu. Bilo je 1,6 s za svaku poruku, pa je
   uputstvo od dvadesetak reči („Prvo klikni na reč u pesmi…") nestajalo pre
   nego što se pročita — prijava vlasnice 03.08.2026.
   Sada vreme prati DUŽINU poruke: „kopirano: ljubav" i dalje odmah odlazi, a
   uputstvo ostaje dovoljno dugo. Računica: 1,6 s najmanje, plus 45 ms po
   znaku, najviše 6 s. Prosečno čitanje je oko 20 znakova u sekundi, pa 45 ms
   po znaku daje otprilike dvostruko vreme od čitanja — taman da se stigne i
   pogledati i pročitati. */
function toast(msg){
  const t=el('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  const trajanje = Math.min(6000, Math.max(1600, 1600 + String(msg).length * 45));
  toastTimer=setTimeout(()=>t.classList.remove('show'),trajanje);
}
function copy(text){
  navigator.clipboard?.writeText(text).then(()=>toast(`${uiTxt('kopirano')}: ${text}`)).catch(()=>toast(uiTxt('kopirano')));
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

/* Spoljni poziv sa rokom. Викиречник и Википедија umeju da ćute neograničeno
   (zagušena mreža, hotelski wi-fi, portal koji guta zahtev) — a `fetch` sam po
   sebi NEMA rok. Zbog toga je oblačić sa objašnjenjem znao da zauvek stoji na
   „učitavanje…". Sada oba poziva imaju rok (4 s + 3,5 s), pa oblačić najkasnije za osam
   sekundi pošteno kaže da objašnjenja nema. */
function fetchSaRokom(url, ms = 6000){
  if(typeof AbortController === 'undefined') return fetch(url);
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));
}

async function fetchDefinition(word){
  if(defCache.has(word)) return defCache.get(word);
  await loadLocalDefs();  // učitaj lokalni rečnik definicija tek kada zatreba
  if(DEFS.has(word)){ const r = { text: DEFS.get(word), src:'Rimoteka' }; defCache.set(word, r); return r; }
  let result = null;
  try{
    const u = `https://sr.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(word)}&format=json&origin=*`;
    const d = await fetchSaRokom(u, 4000).then(r=>r.json());
    const p = Object.values(d.query.pages)[0];
    if(p && p.extract){ const m = parseSrMeaning(p.extract); if(m) result = { text:m, src:'Викиречник' }; }
  }catch(e){}
  if(!result){
    try{
      const d = await fetchSaRokom(`https://sr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`, 3500).then(r=>r.ok?r.json():null);
      if(d && d.type === 'standard' && d.extract){
        result = { text: firstSentence(d.extract), src:'Википедија' };
      }
    }catch(e){}
  }
  if(!result){
    /* Negativan ishod se NE pamti trajno. Ranije je jedan pad mreže (ili jedan
       neuspeh `definicije.json`) zauvek upisivao „Nema objašnjenja za ovu reč"
       u keš, pa je i posle povratka veze ta reč ostajala bez objašnjenja do
       osvežavanja strane. */
    return { text:'Nema objašnjenja za ovu reč.', src:'' };
  }
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
    b.onclick = ()=>{
      /* MRTVO DUGME NA `/klasici/` — nađeno 31.07.2026.
         Na početnoj `switchTab('rime')` prebaci na tab sa rimama i sve radi.
         Na zasebnoj strani `/klasici/` tog taba NEMA: `rimeInput` je tada
         prazan `NOOP_EL`, `switchTab` nema šta da prebaci i klik NE URADI
         NIŠTA — a strana u uputstvu obećava „klikni da nađeš rime". Izmereno:
         138 stihova, nijedan klik ništa ne menja, adresa ostaje ista.
         Na takvoj strani se ide na početnu sa upitom — isti oblik linka koji
         već koriste pilule na stranama `/rime-za/…` (`/?rec=…`). */
      if(!document.getElementById('panel-rime')){
        location.href = '/?rec=' + encodeURIComponent(b.dataset.w);
        return;
      }
      rimeInput.value = disp(b.dataset.w); switchTab('rime');
      window.scrollTo({top:0,behavior:'smooth'}); doRhymes();
    };
  });
}

/* ====================== DARK MODE ====================== */
/* `dark-mode-init.js` postavlja klasu na <html> još u <head> (tamo `body` ne
   postoji), a na `body` je prenosi tek na DOMContentLoaded. `app.js` stoji na
   kraju <body> i izvršava se PRE toga — bez ove linije bi tema bila tamna, a
   ikonica bi pokazivala 🌙, dakle suprotno od stanja. */
if(document.documentElement.classList.contains('dark-mode')) document.body.classList.add('dark-mode');
const darkToggle = document.getElementById('darkToggle');
function applyDarkIcon(){
  if(!darkToggle) return;
  darkToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
if(darkToggle) darkToggle.onclick = ()=>{
  document.body.classList.toggle('dark-mode');
  const dark = document.body.classList.contains('dark-mode');
  // Klasa stoji i na <html> — nju postavlja dark-mode-init.js pre iscrtavanja,
  // da pri sledećem učitavanju ne bude belog bljeska (nalaz K1).
  document.documentElement.classList.toggle('dark-mode', dark);
  lsSet('rimoteka_dark', dark ? '1' : '0');
  applyDarkIcon();
  // Boje rima u beležnici su upisane INLINE u HTML pri iscrtavanju, pa ih
  // promena teme sama ne dira — bez ovoga bi posle prebacivanja ostale boje
  // stare teme i reč bi opet bila nečitljiva.
  const ed = document.getElementById('noteEditor');
  if(ed && typeof setNoteText === 'function' && typeof getEditorText === 'function'){
    const pos = typeof saveCursorPosition === 'function' ? saveCursorPosition() : null;
    setNoteText(getEditorText());
    if(pos && typeof restoreCursorPosition === 'function') restoreCursorPosition(pos);
  }
};
applyDarkIcon();

/* Kopiranje cele liste rima na stranama /rime-za/[reč]/.
   Ranije je stajalo kao inline `onclick` u HTML-u, a CSP (`script-src 'self'`)
   inline kod blokira — dugme je bilo mrtvo na 1.988 strana (nalaz V2). */
document.querySelectorAll('.copy-all-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const reci = btn.dataset.words || '';
    const vrati = ()=>{ btn.textContent = 'Kopiraj sve rime'; btn.classList.remove('copied'); };
    const uspeh = ()=>{ btn.textContent = 'Kopirano!'; btn.classList.add('copied'); setTimeout(vrati, 1600); };
    const greska = ()=>{ btn.textContent = 'Greška'; setTimeout(vrati, 1600); };
    if(!navigator.clipboard){ greska(); return; }
    navigator.clipboard.writeText(reci).then(uspeh).catch(greska);
  });
});

/* ====================== START ====================== */
document.querySelectorAll('#scriptToggle button').forEach(x=>x.classList.toggle('active', x.dataset.script===script));
if(script === 'cyr') applyScriptToUI();
/* Beležnica se učitava iz memorije uređaja PRE nego što se primeni pismo, pa
   pri osvežavanju strane u ćirilici mora i ona da se prebaci — inače je posle
   F5 ceo sajt ćirilica a pesma opet latinica. */
if(script === 'cyr') prebaciBelesku();
prikaziUputstvoZaTastaturu();
document.body.dataset.tab = 'rime';   // podrazumevani tab pri učitavanju
/* Na SEO podstranama `switchTab` se nikad ne pozove (tamo nema panela — aktivan
   tab dolazi već označen iz šablona), pa se `aria-current` i pomeranje trake
   moraju uraditi i ovde. Bez ovoga je aktivan tab na telefonu ostajao izvan
   vidljivog dela trake, do 309 px desno. */
{
  const aktivan = document.querySelector('#tabs [data-tab].active');
  if(aktivan){
    aktivan.setAttribute('aria-current', 'page');
    dovediAktivanTabUVid();
  }
}
window.addEventListener('resize', dovediAktivanTabUVid);
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
    // „igra" je ranije nedostajala u ovom spisku, pa se `?tab=igra` tiho
    // ignorisao i link na igru je otvarao rime (nalaz N3).
    const tab = params.get('tab');
    if(tab && ['rime','pretraga','slogovi','beleznica','klasici','igra','omiljene'].includes(tab)
       && document.getElementById('panel-' + tab)){
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
    lsSet(PRO_CACHE_KEY, JSON.stringify({ pro: !!proState.pro }));
  } catch (e) {}
}

// Keš primenjujemo odmah da reklamni prostor ne bljesne Pro korisniku
try {
  const cached = lsJSON(PRO_CACHE_KEY, null);
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
gameInput.addEventListener('input', () => prebaciUnos(gameInput));
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
    // `ishodi` pamti REDOSLED tačnih i netačnih odgovora — bez toga tačkice
    // napretka ne mogu da pokažu koja je reč promašena (nalaz N4).
    gamePlayersData.push({ score: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, maxCombo: 0, ishodi: [] });
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
  if(title) title.textContent = `${uiTxt('Vreme je za igrača')} ${broj}`;
  if(sub){
    const pret = gamePlayersData[gameCurrentPlayerIdx - 1];
    sub.textContent = pret
      ? `${uiTxt('Igrač')} ${gameCurrentPlayerIdx} ${uiTxt('je osvojio')} ${pret.score} ${uiTxt(poenRec(pret.score))} (${pret.correct} ${uiTxt('od')} ${gameWordsPerPlayer} ${uiTxt('tačno')}).`
      : '';
  }
  if(gamePlay) gamePlay.style.display = 'none';
  if(gameResults) gameResults.style.display = 'none';
  if(gameHandoff) gameHandoff.style.display = 'block';
  if(gameHandoffStart) gameHandoffStart.focus();
}

/* Postoji li odgovor koji bi igra PRIHVATILA za ovu reč?
   Mora da koristi isto pravilo kao checkGameAnswer (savršena rima ILI asonanca) —
   inače bi izbacivala reči koje se sasvim lepo igraju. Npr. „valjda" nema
   savršenu rimu, ali ima „heljda", „vajda", „možda" — i igra ih priznaje.
   Indeks se gradi jednom, pri prvom pokretanju igre. */
let RHYME_COUNTS = null, LOOSE_COUNTS = null;
function imaRimu(w){
  if(!RHYME_COUNTS){
    RHYME_COUNTS = new Map();
    LOOSE_COUNTS = new Map();
    for(const x of WORDS){
      const k = rhymeKey(x);
      RHYME_COUNTS.set(k, (RHYME_COUNTS.get(k) || 0) + 1);
      const l = looseKey(x);
      LOOSE_COUNTS.set(l, (LOOSE_COUNTS.get(l) || 0) + 1);
    }
  }
  return (RHYME_COUNTS.get(rhymeKey(w)) || 0) >= 2
      || (LOOSE_COUNTS.get(looseKey(w)) || 0) >= 2;
}

function nextWord(){
  if(gameState !== 'play') return;   // predaja ili rezultati su u toku
  if(gameCurrentWordIdx >= gameWordsPerPlayer){
    gameCurrentPlayerIdx++;
    gameCurrentWordIdx = 0;
    gameCombo = 0;
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
    // biramo iz bazena poznatih reči — igra sa arhaizmima nije igra —
    // i OBAVEZNO reč koja uopšte ima rimu (npr. „valjda" je nema, pa je
    // igrač ne može rešiti ni kad zna sve reči srpskog jezika).
    // Ijekavski oblici nikad (pravilo projekta — v. `jeJekavskaRec`).
    const w = randomCommonWord(x => !BLOCKED.has(x) && !(kidsMode && isKidsBlocked(x)) && !jeJekavskaRec(x) && imaRimu(x));
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

/* Pauza igre pri odlasku na drugi tab (nalaz S7).
   `igraPauzirana` pamti da je odbrojavanje ZAUSTAVLJENO, a ne završeno — pa se
   pri povratku nastavlja od preostalih sekundi umesto da počne iznova ili da
   reč propadne. */
let igraPauzirana = false;
function odbrojavanjeTece(){
  return !!gameTimer && gamePlay && gamePlay.style.display !== 'none';
}
function pauzirajIgru(){
  if(!odbrojavanjeTece()) return;
  clearInterval(gameTimer);
  gameTimer = null;
  igraPauzirana = true;
}
function nastaviIgru(){
  if(!igraPauzirana) return;
  igraPauzirana = false;
  if(gameTimeLeft > 0) pokreniOdbrojavanje();
}

function pokreniOdbrojavanje(){
  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    gameTimeLeft--;
    gameTimerEl.textContent = gameTimeLeft;
    if(gameTimeLeft <= 5){
      gameTimerEl.classList.add('low');
      if(gameTimeLeft > 0) playTick();
    }
    if(gameTimeLeft <= 0){
      clearInterval(gameTimer);
      gameTimer = null;
      timeUp();
    }
  }, 1000);
}

function startTimer(){
  igraPauzirana = false;
  gameTimeLeft = gameTimePerWord;
  gameTimerEl.textContent = gameTimeLeft;
  gameTimerEl.classList.remove('low');
  pokreniOdbrojavanje();
}

function timeUp(){
  gameFeedback.textContent = `⏰ ${uiTxt('Vreme isteklo! Rima za')} „${disp(gameCurrentWord)}" ${uiTxt('nije uneta.')}`;
  gameFeedback.className = 'game-feedback wrong';
  gamePlayersData[gameCurrentPlayerIdx].wrong++;
  gamePlayersData[gameCurrentPlayerIdx].ishodi[gameCurrentWordIdx] = false;
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
    gameFeedback.textContent = uiTxt('Upiši rimu (bar 2 slova)');
    gameFeedback.className = 'game-feedback hint';
    return;
  }
  if(answer === gameCurrentWord){
    gameFeedback.textContent = uiTxt('To je ista reč — probaj drugu');
    gameFeedback.className = 'game-feedback hint';
    return;
  }
  if(!SET.has(answer)){
    gameFeedback.textContent = uiTxt('Ta reč nije u rečniku — probaj drugu');
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
    player.ishodi[gameCurrentWordIdx] = true;     // redosled ishoda za tačkice (N4)
    player.streak++;
    if(player.streak > player.bestStreak) player.bestStreak = player.streak;

    gameFeedback.textContent = `✓ ${uiTxt('Tačno!')} +${points} ${uiTxt(poenRec(points))} (${gameTimeLeft}s + ${gameCombo}x ${uiTxt('niz')})`;
    gameFeedback.className = 'game-feedback correct';

    playCorrect();
    if(gameCombo >= 3) playCombo(gameCombo);
    confetti();
  } else {
    player.wrong++;
    player.ishodi[gameCurrentWordIdx] = false;    // redosled ishoda za tačkice (N4)
    player.streak = 0;
    gameCombo = 0;
    renderCombo();
    gameFeedback.textContent = `✗ „${disp(answer)}" ${uiTxt('se ne rimuje sa')} „${disp(gameCurrentWord)}"`;
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
    /* Nalaz N4: ranije je stajalo `correct > i`, pa su prve tačkice UVEK bile
       zelene bez obzira na to koja je reč zaista promašena — promašiš prvu i
       pogodiš drugu, a igra prikaže obrnuto. Sada se čita stvaran ishod. */
    const ishodi = (gamePlayersData[gameCurrentPlayerIdx] || {}).ishodi || [];
    if(i < gameCurrentWordIdx) dot.classList.add(ishodi[i] ? 'correct' : 'wrong');
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
  if(gameMaxCombo >= 5) achievements.push('🔥 Pet rima zaredom');
  if(gameMaxCombo >= 10) achievements.push('⚡ Deset rima zaredom');
  if(sorted[0].correct === gameWordsPerPlayer) achievements.push('🎯 Sve tačno, bez greške');
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
  /* Partija u toku se NE prekida kad se korisnik vrati na tab.
     Ranije je svaki povratak vraćao početni ekran i brisao partiju — a otkad se
     igra pauzira pri odlasku (nalaz S7), to bi značilo i da odbrojavanje teče
     nevidljivo iza početnog ekrana. Zato se resetuje samo kad partija ne traje. */
  if(gameState === 'play' || gameState === 'handoff') return;
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
  /* Rečnik treba samo alatima koji traže reči (rime, pretraga, igra, beležnica).
     Strane sa čistim brojačem slogova nemaju nijedan od njih, a rečnik je 2,6 MB —
     bez ovog izuzetka bi se skidao potpuno bez potrebe. Brojanje slogova je
     čista funkcija nad tekstom i radi odmah, bez ijedne učitane reči. */
  const trebaRecnik = !el('rimeInput').__noop || !el('searchInput').__noop
    || !el('noteEditor').__noop || !el('gameSetup').__noop;
  if(!trebaRecnik){
    initFromURL();
    return;
  }
  loadDict().then(()=>{
    if(cekaRec){ pokreniOdlozenuPretragu(); return; }
    if(!initFromURL()) rimeInput.focus();
  }).catch(e=>{
    /* Ako korisnik ode sa strane dok se rečnik još skida, pregledač prekine
       preuzimanje i ovde stigne „Failed to fetch". To NIJE kvar — strana koju
       napuštamo nema kome da prijavi grešku, a poruka o neuspehu bi bljesnula
       na izlasku. Zato se pri napuštanju strane ćuti; svaki drugi neuspeh se i
       dalje prijavljuje i pokazuje korisniku. */
    if(seIzlazi) return;
    el('rimeBtn').classList.remove('ucitava');
    el('rimeBtn').disabled = false;
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
  /* DEFINICIJE SE VIŠE NE SKIDAJU UNAPRED.
     Ranije je `definicije.json` (20 MB sirovo, 5,3 MB gzip) kretao na SVAKOM
     učitavanju strane, samo da bi prvi prelazak mišem preko ⓘ bio trenutan.
     Izmereno u auditu: kretao je ~4 ms posle `reci.txt` i time gurao spremnost
     rečnika sa 7,3 s na 10,6 s — dakle 3,3 sekunde čekanja na rime, zbog
     oblačića koji većina korisnika nikad ne otvori.
     Sada se skida tek kad zaista zatreba: `fetchDefinition()` na početku zove
     `loadLocalDefs()`. Da prvi klik ne bi bio spor, skidanje se pokreće i na
     prvi prelazak mišem preko bilo kog ⓘ (v. `pripremiDefinicije` niže) — dakle
     na nagoveštaj namere, a ne na svako učitavanje strane. */
}

/* Prvi nagoveštaj da će definicije zatrebati: miš je prešao preko dugmeta ⓘ.
   Skidanje kreće tada, pa je do klika obično već gotovo. */
let definicijeNajavljene = false;
function pripremiDefinicije(){
  if(definicijeNajavljene) return;
  definicijeNajavljene = true;
  const conn = navigator.connection;
  if(conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;  // ne troši tuđi paket
  loadLocalDefs();
}
document.addEventListener('pointerover', e => {
  if(e.target && e.target.closest && e.target.closest('.mini.info')) pripremiDefinicije();
}, { passive: true });

bootstrap();

/* ── NOTA U FUTERU SE NA KLIK PRETVARA U SRCE (03.08.2026) ──────────────────
   Zahtev vlasnice. Sitnica koja se ne traži i ne objavljuje — ko klikne notu
   na notnom sistemu iznad futera, dobije srce; ko klikne ponovo, vrati notu.

   Zašto ovako, a ne sa srcem već upisanim u svaki SVG: nota se u futeru
   pojavljuje dvanaest puta, pa bi to bilo dvanaest istih putanja u strani koje
   99% ljudi nikad ne vidi. Ovako crtež nastaje tek pri prvom kliku na TU notu.

   Srce se crta NA MESTU GLAVE note: svaka nota ima svoj `translate(x y)` (glava
   sedi na svojoj liniji notnog sistema), pa se iste vrednosti prepisuju na
   putanju srca — inače bi srce svima iskočilo na istoj visini, a note stoje na
   pet različitih linija. */
(function notaUSrce(){
  /* Dve grupe nota: notni sistem u futeru i traka sa pozivom na saradnju iznad
     njega. Osluškuje se `document`, pa se ne mora znati koje su tačno na strani
     — statične strane nemaju traku, a početna ima obe. */
  const grupe = document.querySelectorAll('.futer-notni, .saradnja-note');
  if(!grupe.length) return;
  const SRCE = 'M0,3.8 C-5.8,-0.4 -5.6,-5.6 -2.7,-5.6 C-1.1,-5.6 -0.3,-4.5 0,-3.7 ' +
               'C0.3,-4.5 1.1,-5.6 2.7,-5.6 C5.6,-5.6 5.8,-0.4 0,3.8 Z';
  grupe.forEach(grupa => grupa.addEventListener('click', (e) => {
    const nota = e.target.closest('.nota');
    if(!nota) return;
    if(!nota.querySelector('.nota-srce-lik')){
      const g = nota.querySelector('g');
      if(!g) return;
      /* DVA elementa, ne jedan: spoljni `g` nosi POLOŽAJ (translate na glavu
         note), unutrašnja putanja nosi POKRET (uvećanje pri ulasku). Da su na
         istom elementu, CSS `transform` bi pregazio `transform` iz atributa —
         provereno: srce je odletelo u gornji levi ugao note. */
      const omot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      omot.setAttribute('class', 'nota-srce-omot');
      omot.setAttribute('transform', g.getAttribute('transform') || '');
      const put = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      put.setAttribute('class', 'nota-srce-lik');
      put.setAttribute('d', SRCE);
      put.setAttribute('fill', 'currentColor');
      omot.appendChild(put);
      nota.appendChild(omot);
    }
    nota.classList.toggle('u-srcu');
  }));
})();
