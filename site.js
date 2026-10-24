// language: remembered choice, else the device's; then the toggle
(() => {
  const html = document.documentElement;
  let l = null;
  try { l = localStorage.getItem('aphelion.langue'); } catch (e) {}
  if (l !== 'fr' && l !== 'en') l = (navigator.languages || [navigator.language || 'fr']).some(x => /^fr/i.test(x)) ? 'fr' : 'en';
  const poser = v => {
    html.dataset.l = v; html.lang = v;
    document.querySelectorAll('.langue button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === v)));
    const t = document.querySelector(`meta[name="titre-${v}"]`); if (t) document.title = t.content;
  };
  poser(l);
  document.addEventListener('click', e => {
    const b = e.target.closest('.langue button'); if (!b) return;
    poser(b.dataset.l);
    try { localStorage.setItem('aphelion.langue', b.dataset.l); } catch (e) {}
  });
  // sections come in as they scroll into view
  const els = document.querySelectorAll('.vient');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('la')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('la'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach(e => io.observe(e));
})();
