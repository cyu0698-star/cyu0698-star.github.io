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
  // Verso 正文风格层 · 入场动效（参考/flowtica-verso-design-system.md 第 6 条）：
  // 进入视口淡入 + 位移 28px，760ms；同一批进入视口的元素每个延迟 75ms；只触发一次；系统开了「减少动效」就不做
  var verso = document.querySelector('.theme-verso');
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (verso && !calm && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = Math.min(k++, 6) * 75 + 'ms';
        e.target.classList.add('is-in'); ro.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
    var reveal = function (el) {
      var d = el.getAttribute('data-reveal');  // 版面方向：left = 从左，right = 从右，默认自下
      el.classList.add('rv'); if (d === 'left') el.classList.add('rv--l'); if (d === 'right') el.classList.add('rv--r');
      ro.observe(el);
    };
    verso.querySelectorAll('.csec').forEach(function (sec) {
      var units = sec.classList.contains('csec--first') ? sec.querySelectorAll('.overview > *') : sec.children;
      Array.prototype.forEach.call(units, function (el) {
        if (el.classList.contains('phones')) Array.prototype.forEach.call(el.children, reveal);  // 截图组：每张单独入场
        else reveal(el);
      });
    });
  }
})();
