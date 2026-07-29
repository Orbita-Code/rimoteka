// Tamni režim — primeni pre iscrtavanja, da nema belog bljeska.
//
// Ranije je ova skripta stajala u <head> i pisala po `document.body`, a `body`
// tada JOŠ NE POSTOJI — `classList` na `null` baci grešku i postavka se gubila
// baš pri učitavanju (nalaz K1). Zato:
//   1) klasa ide na <html>, koji u <head> uvek postoji → pozadina je odmah tamna;
//   2) čim `body` postoji, ista klasa se prenosi i na njega, jer se svih 117
//      pravila u style.css vezuje za `body.dark-mode`.
// localStorage je u try/catch: u privatnom režimu i uz blokirane kolačiće
// čitanje baca SecurityError, a to ne sme da obori stranu.
(function () {
  var dark = false;
  try { dark = localStorage.getItem('rimoteka_dark') === '1'; } catch (e) {}
  if (!dark) return;
  document.documentElement.classList.add('dark-mode');
  var naBody = function () {
    if (document.body) document.body.classList.add('dark-mode');
  };
  naBody();
  if (!document.body) document.addEventListener('DOMContentLoaded', naBody);
})();
