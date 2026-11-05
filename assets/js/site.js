(function () {
  var nav = document.getElementById('nav');
  function onScroll() { if (!nav) return; nav.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // 定位句两版：?pos=b 或 #b 显示 B 版（投递时按公司换链接）
  var q = new URLSearchParams(location.search).get('pos') || (location.hash === '#b' ? 'b' : '');
  if (q === 'b') document.querySelectorAll('[data-pos]').forEach(function (el) { el.hidden = el.getAttribute('data-pos') !== 'b'; });
  // 案例页目录高亮
  var links = document.querySelectorAll('.toc a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (a) { a.classList.remove('is-active'); }); var a = map[e.target.id]; if (a) a.classList.add('is-active'); } });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }
})();
