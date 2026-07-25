// Dark mode — primeni odmah da nema "flash" svetle teme
(function(){
  const dark = localStorage.getItem('rimoteka_dark') === '1';
  if(dark) document.body.classList.add('dark-mode');
})();
