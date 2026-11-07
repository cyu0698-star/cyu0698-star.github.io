/* Verso iOS redesign · clickable prototype runtime (zero dependencies)
   Router: push / pop / sheet / state.  Hotspots in HTML:
     data-go="02"     push a screen (or switch state if it belongs to the current screen)
     data-sheet="02e" present a sheet
     data-back        pop / dismiss the top sheet
     data-act="…"     named action (see ACTIONS)
   Screens with data-ctrl="…" are rendered from a small model (edit page, photo flow).
   Motion values come from the CSS custom properties in proto.css (spec 26 §7 / §8). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = getComputedStyle(document.documentElement);
  const cssVar = (n) => css.getPropertyValue(n).trim();
  const ms = (n) => parseFloat(cssVar(n)) || 0;
  const M = {
    push: [ms('--dur-push'), cssVar('--ease-push')],
    sheet: [ms('--dur-sheet'), cssVar('--ease-sheet')],
    scrim: ms('--dur-scrim'),
    reveal: [ms('--dur-reveal'), cssVar('--ease-reveal'), ms('--stagger-reveal')],
    carousel: [ms('--dur-carousel'), cssVar('--ease-carousel')],
    faceSwap: ms('--dur-face-swap'),
    toast: ms('--dur-toast'),
    reduced: ms('--dur-reduced'),
  };
  const params = new URLSearchParams(location.search);
  const store = {
    get(k) { try { return localStorage.getItem('verso-proto:' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('verso-proto:' + k, v); } catch (e) { /* private mode */ } },
  };
  const isTouch = window.matchMedia ? matchMedia('(pointer: coarse)').matches : false;

  /* ───────── demo data (spec 26 D13) ───────── */
  const OPENS = {
    bio: { label: 'Bio Page', link: 'verso.flowtica.ai/c/sarah-mitchell', state02: '02', state06: '06' },
    contact: { label: 'Contact', link: 'verso.flowtica.ai/c/sarah-mitchell', state02: '02b', state06: '06b' },
    custom: { label: 'Custom Link', get link() { return S.customUrl; }, state02: '02c', state06: '06c' },
  };
  const INFO0 = [{ t: 'Email', v: 'sarah@northwind.co' }, { t: 'Phone', v: '+1 (415) 555-0132' }, { t: 'LinkedIn', v: 'linkedin.com/in/sarahmitchell' }];
  const ADD_KINDS = {
    email: { title: 'Email', label: 'Email address', ph: 'name@company.com', type: 'email', hint: 'If blank, it won’t appear on your Bio Page', err: 'Enter a valid email', ok: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
    phone: { title: 'Phone', label: 'Phone number', ph: '+1 (415) 555-0100', type: 'tel', hint: 'If blank, it won’t appear on your Bio Page', err: 'Enter a phone number', ok: (v) => v.replace(/\D/g, '').length >= 7 },
    sms: { title: 'SMS', label: 'Phone number', ph: '+1 (415) 555-0100', type: 'tel', hint: 'If blank, it won’t appear on your Bio Page', err: 'Enter a phone number', ok: (v) => v.replace(/\D/g, '').length >= 7 },
    whatsapp: { title: 'WhatsApp', label: 'Phone number', ph: '+1 (415) 555-0100', type: 'tel', hint: 'If blank, it won’t appear on your Bio Page', err: 'Enter a phone number', ok: (v) => v.replace(/\D/g, '').length >= 7 },
    website: { title: 'Website', link: true }, calendly: { title: 'Calendly', link: true }, link: { title: 'Custom Link', link: true },
  };
  const URL_OK = (v) => /^https:\/\/[^\s/.]+\.[^\s]{2,}$/.test(v.trim());
  const FIELDS0 = { name: 'Sarah Mitchell', title: 'Account Director', company: 'Northwind Partners', slogan: 'Ideas into reality.', email: 'sarah@northwind.co', website: 'northwind.co', bio: 'Account director at Northwind Partners. Helping teams turn conversations into decisions.' };
  const LONG_SLOGAN = 'Ideas into reality, every single day.';
  // 13 templates (spec 26 §3 order). o = orientation of the master: p 528×792 / l 792×528 (shown rotated 90° in the device)
  const TEMPLATES = [
    { id: 'logo-signature', name: 'Logo Signature', o: 'p', logo: true },
    { id: 'logo-company', name: 'Logo Company', o: 'l', logo: true },
    { id: 'logo-mark', name: 'Logo Mark', o: 'p', logo: true },
    { id: 'bc1', name: 'BC1', o: 'l' }, { id: 'bc2', name: 'BC2', o: 'l' }, { id: 'bc4', name: 'BC4', o: 'l' }, { id: 'bc9', name: 'BC9', o: 'l' },
    { id: 'text', name: 'Text', o: 'p', slogan: true }, { id: 'badge', name: 'Badge', o: 'p', slogan: true }, { id: 'avatar', name: 'Avatar', o: 'p', slogan: true },
    { id: 'portrait', name: 'Portrait', o: 'p', slogan: true }, { id: 'monogram', name: 'Monogram', o: 'p', slogan: true }, { id: 'grid', name: 'Grid', o: 'p', slogan: true },
  ];
  // which templates print the slogan (Figma masters) → the Slogan field only shows for these
  TEMPLATES.forEach((t) => { t.slogan = ['bc1', 'bc2', 'bc4', 'text', 'badge', 'avatar', 'portrait', 'grid'].includes(t.id); });
  const PORTRAIT = TEMPLATES.findIndex((t) => t.id === 'portrait');
  const faceSrc = (id) => (PHOTOS[id] ? PHOTOS[id].src : `assets/cards/${/^photo/.test(id) ? 'bc1' : id}.jpg`);
  const faceOrient = (id) => (PHOTOS[id] ? PHOTOS[id].o : /^photo/.test(id) ? 'l' : (TEMPLATES.find((t) => t.id === id) || { o: 'p' }).o);

  /* ───────── batch 3 placeholders (renders not in yet) ─────────
     [id, 中文帧名, nav title, kind, group-parent, links[]]   link: 'go:x' | 'sheet:x' | 'state:x' | 'opens:k' */
  const PLACEHOLDERS = []; // every frame now has a real screen; kept for future batches
  const PH_NOTE = { '06': 'NFC settings', '07': 'Info & Links', '08': 'Bio page' };
  // where a frame lives in the main path (tour jump / deep link rebuild the stack from this)
  const PATH = { '00': [], '01': ['00'], '02': ['00', '01'], '03': ['00', '01'], '04': ['00', '01', '03'], '05': ['00', '01', '03'], '05d': ['00', '01', '03'], '06': ['00', '01'], '07': ['00', '01', '06'], '07c': ['00', '01', '06', '07'], '08': ['00', '01', '02'] };
  const SHEET_UNDER = { '01h': '01', '02d': '02', '02e': '02', '04b': '03c', '06e': '06' };
  const LOGO_TPL = ['logo-signature', 'logo-company', 'logo-mark'];

  const phone = $('#phone');
  const root = document.documentElement;
  const S = { stack: [], sheet: null, asheet: null, opens: 'bio', customUrl: 'https://northwind.co', info: INFO0.slice(), add: null, pending: true, wallet: false, variant: store.get('variant') || '00', busy: false, timers: [] };
  const later = (fn, t) => { const id = setTimeout(fn, t); S.timers.push(id); return id; };
  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ───────── batch 3 placeholders ───────── */
  function buildPlaceholders() {
    const groups = {};
    PLACEHOLDERS.forEach((f) => { const key = f[3] === 'state' ? f[4] : f[0]; (groups[key] = groups[key] || []).push(f); });
    Object.keys(groups).forEach((key) => {
      if ($(`.screen[data-id="${key}"]`)) return; // a real screen exists → skip
      const frames = groups[key]; const head = frames[0]; const isSheet = head[3] === 'sheet';
      const sec = document.createElement('section');
      sec.className = 'screen is-placeholder' + (isSheet ? ' is-sheet' : '');
      sec.dataset.id = key; sec.dataset.state = key; sec.dataset.title = head[1];
      if (frames.length > 1) sec.dataset.states = frames.map((f) => f[0]).join(' ');
      frames.forEach((f) => { sec.dataset['title-' + f[0]] = f[1]; });
      const links = (f) => (f[5].length ? `<div class="c-list">${f[5].map(([label, act]) => `<button class="c-list__row is-link" type="button" data-link="${act}"><span class="c-list__title">${esc(label)}</span><span class="c-list__chev"><svg class="i"><use href="#chevron.right"/></svg></span></button>`).join('')}</div>` : '');
      const note = 'Coming next · NFC settings / Info &amp; Links / Bio page are being drawn';
      const body = frames.map((f) => `<div data-when="${f[0]}">
          <div class="ph-card__id">${f[0]}</div>
          <div class="ph-card__name">${esc(f[2])}</div>
          <div class="ph-card__note">${note}</div>
          ${links(f)}</div>`).join('');
      sec.innerHTML = isSheet
        ? `<div class="ph-sheet" data-sheet-panel>${body}<div class="ph-card__back"><button class="c-pill c-pill--auto" type="button" data-back>Close</button></div></div>`
        : `<header class="c-nav">
            <button class="c-nav__back" type="button" data-back aria-label="Back"><svg class="i"><use href="#chevron.left"/></svg></button>
            <h1 class="c-nav__title">${esc(head[2])}</h1></header>
          <div class="ph-card" data-reveal>${body}<div class="ph-card__back"><button class="c-pill c-pill--auto" type="button" data-back><svg class="i"><use href="#chevron.left"/></svg>Back</button></div></div>`;
      $('#asheet').before(sec);
    });
  }

  /* ───────── index of frames → section + state ───────── */
  const FRAME = {};
  function indexFrames() {
    $$('.screen', phone).forEach((sec) => {
      (sec.dataset.states || sec.dataset.id).split(/\s+/).forEach((st) => { FRAME[st] = { sec, state: st, title: sec.dataset['title-' + st] || sec.dataset.title }; });
      if (!sec.querySelector(':scope > .screen__dim')) { const d = document.createElement('div'); d.className = 'screen__dim'; sec.appendChild(d); }
      sec.hidden = true;
    });
  }
  const ORDER = () => Object.keys(FRAME).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  /* ───────── generated content: QR, card faces ───────── */
  function qrSvg(size, seed) {
    const n = 25; const m = Array.from({ length: n }, () => Array(n).fill(0)); const fixed = Array.from({ length: n }, () => Array(n).fill(false));
    let s = seed * 2654435761 % 4294967296 || 1;
    const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) { const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue; fixed[rr][cc] = true; const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); m[rr][cc] = on ? 1 : 0; } };
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (let i = 8; i < n - 8; i++) { m[6][i] = m[i][6] = i % 2 === 0 ? 1 : 0; fixed[6][i] = fixed[i][6] = true; }
    const a = n - 9; for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) { fixed[a + r][a + c] = true; m[a + r][a + c] = (Math.max(Math.abs(r), Math.abs(c)) !== 1) ? 1 : 0; }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!fixed[r][c]) m[r][c] = rnd() < 0.48 ? 1 : 0;
    let d = '';
    for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (m[r][c]) { const st = c; while (c < n && m[r][c]) c++; d += `M${st} ${r}h${c - st}v1h${st - c}z`; } else c++; } }
    return `<svg viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="#010102"/></svg>`;
  }
  function renderQR(scope) { $$('[data-qr]', scope).forEach((el) => { if (!el.firstChild) el.innerHTML = qrSvg(+el.dataset.qr, +el.dataset.seed || 1); }); }

  function faceLayer(id) {
    const layer = document.createElement('div'); layer.className = 'face-layer';
    if (id === 'photo' || !FACE_HTML[id]) { // the photographed paper card stays a picture
      layer.innerHTML = `<img class="face-img${faceOrient(id) === 'l' ? ' is-landscape' : ''}" src="${faceSrc(id)}" alt="" draggable="false">`;
      return layer;
    }
    const c = document.createElement('div'); c.className = 'ff-canvas' + (faceOrient(id) === 'l' ? ' is-land' : '') + (id === 'text' ? ' is-framed' : '');
    c.style.background = FACE_BG[id]; c.innerHTML = FACE_HTML[id]();
    layer.appendChild(c); return layer;
  }
  function renderFaces(scope) {
    $$('.c-card-face', scope).forEach((el) => {
      if (el.firstChild) return; const id = el.dataset.fixedFace || 'portrait'; el.dataset.face = id; el.appendChild(faceLayer(id));
    });
  }
  /** Swap the face on every device hero that follows the chosen template (cross-fade, spec §8). */
  function setCardFace(id, instant) {
    $$('#phone .c-device-hero .c-card-face:not([data-fixed-face])').forEach((el) => {
      if (el.dataset.face === id) return; el.dataset.face = id;
      if (instant) { el.replaceChildren(faceLayer(id)); return; }
      const old = $$('.face-layer', el); const layer = faceLayer(id); layer.style.opacity = '0'; el.appendChild(layer);
      const dur = isRM() ? M.reduced : M.faceSwap;
      requestAnimationFrame(() => requestAnimationFrame(() => { layer.style.transitionDuration = dur + 'ms'; layer.style.opacity = '1'; }));
      setTimeout(() => old.forEach((o) => o.remove()), dur + 60);
    });
  }
  function syncFields(key) { // live mapping: every bound text on every phone-side face (carousel, neighbours, hero)
    $$(`#phone .c-card-face [data-field${key ? `="${key}"` : ''}]${key === 'name' ? ', #phone .c-card-face [data-field="initial"]' : ''}`).forEach((el) => { el.textContent = fv(el.dataset.field); });
  }

  /* ───────── motion helpers ───────── */
  const mqRM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const isRM = () => root.classList.contains('rm');
  function run(el, frames, dur, easing, delay = 0) {
    if (!el || !el.animate) return Promise.resolve();
    const a = el.animate(frames, { duration: dur, easing, delay, fill: 'both' });
    return a.finished.then(() => a).catch(() => a);
  }
  const done = (anims) => anims.forEach((a) => a && a.cancel && a.cancel());
  function reveal(sec) {
    const items = $$('[data-reveal]', sec).filter((el) => !el.hidden);
    const [dur, ease, step] = M.reveal;
    return Promise.all(items.map((el, i) => isRM()
      ? run(el, [{ opacity: 0 }, { opacity: 1 }], M.reduced, 'linear')
      : run(el, [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], dur, ease, i * step))).then(done);
  }

  /* ═════════════ controllers ═════════════ */
  /* ── 03 · Edit card ── */
  const Edit = {
    m: null,
    reset() {
      this.m = { photoIds: [], get photos() { return this.photoIds.length; }, verified: false, logoFail: false, lastTpl: PORTRAIT, idx: PORTRAIT, applied: 'portrait', logo: false, logoPrompt: false, fields: { ...FIELDS0 }, focus: null, banner: false, filled: false, toast: false, snapshot: null };
    },
    cards() { return this.m.photoIds.map((id, i) => ({ id, name: `Photo card ${i + 1}`, o: faceOrient(id), photo: true })).concat(TEMPLATES); },
    current() { return this.cards()[this.m.idx]; },
    state() {
      const m = this.m; const cur = this.current();
      if (m.toast) return '05f';
      if (m.logoFail) return '03h';
      if (m.banner) return '05c';
      if (!m.fields.name.trim()) return '03e';
      if (cur.slogan && m.fields.slogan.length > 20) return '03f';
      if (m.focus) return '03g';
      if (m.logoPrompt && !m.logo) return '03c';
      if (m.logo) return '03d';
      if (cur.o === 'l') return '03b';
      return '03';
    },
    preset(st) {
      this.reset(); const m = this.m;
      if (st === '03b') m.idx = TEMPLATES.findIndex((t) => t.id === 'bc1');
      if (st === '03c') m.logoPrompt = true;
      if (st === '03d') { m.logo = true; m.idx = TEMPLATES.findIndex((t) => t.id === 'logo-mark'); }
      if (st === '03e') m.fields.name = '';
      if (st === '03f') m.fields.slogan = LONG_SLOGAN;
      if (st === '05c') { m.photoIds = ['photo']; m.idx = 0; m.banner = true; m.filled = true; m.snapshot = { ...FIELDS0 }; }
      if (st === '05f') { m.photoIds = ['photo', 'photo', 'photo', 'photo']; m.idx = 4 + PORTRAIT; }
      if (st === '03g') m.focus = 'title';
      if (st === '03h') m.logoFail = true;
      this.scrollTo = { '03f': 730, '03g': 550 }[st] || 0;
      this.applied = this.current().id;
      syncFields();
    },
    sec: null,
    build() {
      const sec = this.sec = FRAME['03'].sec;
      // carousel drag
      const stage = $('.carousel__stage', sec);
      let drag = null;
      stage.addEventListener('pointerdown', (e) => {
        if (S.busy) return; drag = { x: e.clientX, y: e.clientY, dx: 0, live: false, id: e.pointerId };
      });
      stage.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const scale = phoneScale(); drag.dx = (e.clientX - drag.x) / scale;
        if (!drag.live && Math.abs(drag.dx) > 6 && Math.abs(drag.dx) > Math.abs((e.clientY - drag.y) / scale)) { drag.live = true; stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging'); }
        if (drag.live) { e.preventDefault(); this.layoutCards(-drag.dx / 230, false); }
      });
      const end = (e) => {
        if (!drag) return; const d = drag; drag = null; stage.classList.remove('is-dragging');
        if (!d.live) { if (e.type === 'pointerup' && e.target.closest('.carousel__card.is-current')) { if (this.current().photo) push('05d'); else { S.fullFace = this.current().id; presentSheet('01h'); } } return; }
        const n = this.cards().length; const shift = Math.round(-d.dx / 120);
        this.go(Math.max(0, Math.min(n - 1, this.m.idx + Math.max(-1, Math.min(1, shift)))), -d.dx / 230);
      };
      stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
      stage.addEventListener('dragstart', (e) => e.preventDefault());
      // keyboard arrows on the carousel (desktop)
      stage.tabIndex = 0;
      stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') this.go(Math.min(this.cards().length - 1, this.m.idx + 1), 0); if (e.key === 'ArrowLeft') this.go(Math.max(0, this.m.idx - 1), 0); });
      // fields
      $$('.c-field', sec).forEach((f) => {
        const key = f.dataset.key; const input = $('.c-field__input', f);
        input.addEventListener('input', () => { this.m.fields[key] = input.value; if (this.m.banner) { this.m.banner = false; this.m.filled = false; } syncFields(key); this.render(); S.pending = true; });
        input.addEventListener('focus', () => { this.m.focus = key; this.render(); });
        input.addEventListener('blur', () => { setTimeout(() => { if (this.m.focus === key && document.activeElement !== input) { this.m.focus = null; this.render(); } }, 0); });
      });
      const scroller = $('.scroller', sec); const nav = $('.c-nav', sec);
      scroller.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scroller.scrollTop > 8), { passive: true });
      this.buildKeyboard();
    },
    buildKeyboard() {
      const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
      const box = $('.kbd__keys', this.sec);
      box.innerHTML = rows.map((r, i) => `<div class="kbd__row">${i === 2 ? '<button type="button" class="is-fn" data-k="shift">⇧</button>' : ''}${[...r].map((c) => `<button type="button" data-k="${c}">${c}</button>`).join('')}${i === 2 ? '<button type="button" class="is-fn" data-k="del">⌫</button>' : ''}</div>`).join('')
        + '<div class="kbd__row"><button type="button" class="is-fn" data-k="123">123</button><button type="button" class="is-wide" data-k=" ">space</button><button type="button" class="is-fn" data-k="done" style="width:88px">done</button></div>';
      box.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus in the field
      box.addEventListener('click', (e) => {
        const b = e.target.closest('button'); const input = document.activeElement; if (!b || !input || !input.classList.contains('c-field__input')) return;
        const k = b.dataset.k;
        if (k === 'done') { input.blur(); return; }
        if (k === 'shift' || k === '123') return;
        if (k === 'del') input.value = input.value.slice(0, -1);
        else if (!input.maxLength || input.maxLength < 0 || input.value.length < input.maxLength) input.value += k;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
    pos(o) { // card left (in stage coords) for offset o from the current card
      const L = (x) => x - 16; const cur = 107, left = -124, right = 354, step = 207;
      if (o === 0) return L(cur);
      if (o >= 1) return L(right + (o - 1) * step);
      if (o <= -1) return L(left + (o + 1) * step);
      return o > 0 ? L(cur + (right - cur) * o) : L(cur + (cur - left) * o);
    },
    layoutCards(frac, animate, fromFrac = 0) {
      const track = $('.carousel__track', this.sec); const cards = $$('.carousel__card', track);
      const [dur, ease] = M.carousel;
      cards.forEach((c, i) => {
        const o = i - this.m.idx - frac; const x = this.pos(o); const op = 1 - 0.4 * Math.min(1, Math.abs(o));
        c.classList.toggle('is-current', Math.abs(o) < 0.5);
        if (animate && !isRM()) {
          const o0 = i - this.m.idx - fromFrac;
          run(c, [{ transform: `translateX(${this.pos(o0)}px)`, opacity: 1 - 0.4 * Math.min(1, Math.abs(o0)) }, { transform: `translateX(${x}px)`, opacity: op }], dur, ease).then((a) => { c.style.transform = `translateX(${x}px)`; c.style.opacity = op; a && a.cancel(); });
        } else { c.getAnimations && c.getAnimations().forEach((a) => a.cancel()); c.style.transform = `translateX(${x}px)`; c.style.opacity = op; }
        c.style.visibility = Math.abs(o) > 2.5 ? 'hidden' : '';
      });
    },
    go(idx, fromFrac) { // snap to idx; fromFrac = where the drag left the strip, relative to the old index
      const old = this.m.idx; this.m.idx = idx;
      const startFrac = fromFrac + old - idx; // keep cards where they are, then animate to 0
      this.layoutCards(0, true, startFrac);
      if (idx !== old) { this.m.logoPrompt = false; S.pending = true; }
      if (!this.current().photo) this.m.lastTpl = TEMPLATES.indexOf(this.current());
      this.render(true);
    },
    buildCards() {
      const track = $('.carousel__track', this.sec); track.innerHTML = '';
      this.cards().forEach((c) => {
        const el = document.createElement('div'); el.className = 'carousel__card eink';
        const face = document.createElement('div'); face.className = 'c-card-face'; face.dataset.face = c.id; face.appendChild(faceLayer(c.id));
        el.appendChild(face); track.appendChild(el);
      });
      const dots = $('.c-dots', this.sec); dots.innerHTML = this.cards().map(() => '<i></i>').join('');
    },
    render(skipLayout) {
      const sec = this.sec; const m = this.m; const cur = this.current(); const cards = this.cards();
      if ($$('.carousel__card', sec).length !== cards.length) { this.buildCards(); skipLayout = false; }
      if (!skipLayout) this.layoutCards(0, false);
      $$('.c-dots i', sec).forEach((d, i) => d.classList.toggle('is-on', i === m.idx));
      const tplNo = TEMPLATES.indexOf(cur) + 1;
      $('.carousel__caption', sec).textContent = cur.photo ? `${cur.name} · Added just now`
        : cur.id === 'portrait' ? `Portrait · Template ${tplNo} of 13` : `${cur.name} · ${cur.o === 'l' ? 'Horizontal' : 'Portrait'} · Template ${tplNo} of 13`;
      // logo row
      $('.logo-plus', sec).style.display = m.logo || (m.logoPrompt && !m.logo) ? 'none' : '';
      $('.logo-value .logo-ring', sec).style.display = m.logo ? '' : 'none';
      $('.edit__chip-row', sec).hidden = !((m.logoPrompt && !m.logo) || m.logoFail); // 03h keeps ✦ Find my logo under the row (Figma 03h)
      $('.logo-retry', sec).hidden = !m.logoFail; if (m.logoFail) $('.logo-plus', sec).style.display = 'none';
      // banner
      const banner = $('.ai-banner', sec); banner.hidden = !m.banner;
      // fields
      $$('.c-field', sec).forEach((f) => {
        const key = f.dataset.key; const input = $('.c-field__input', f); const v = m.fields[key];
        if (input.value !== v) input.value = v;
        const count = $('.c-field__count', f); if (count) count.textContent = `${v.length}/20`;
        const err = (key === 'name' && !v.trim()) || (key === 'slogan' && v.length > 20);
        f.classList.toggle('is-error', !!err);
        f.classList.toggle('is-focus', m.focus === key && !err);
        f.classList.toggle('is-filled', m.filled && ['name', 'title', 'company', 'slogan'].includes(key) && !err);
      });
      $('[data-key-group="slogan"]', sec).hidden = false; // Figma 03 family shows Slogan on every template (03 / 03b / 03c / 03d / 03h / 04b / 05c / 05f)
      $('[data-act="fit20"]', sec).hidden = !(cur.slogan && m.fields.slogan.length > 20);
      // keyboard stand-in (desktop only)
      const kbd = $('.kbd', sec); const kOn = !!m.focus && !isTouch; kbd.classList.toggle('is-on', kOn);
      $('.edit', sec).style.paddingBottom = kOn ? '360px' : '';
      applyState(sec, this.state(), true);
    },
    enter() { this.render(); },
    applyScroll() { const sc = $('.scroller', this.sec); if (sc) { sc.scrollTop = this.scrollTo || 0; sc.dispatchEvent(new Event('scroll')); } this.scrollTo = 0; },
    leave(instant) { // back to 01: hero follows the chosen card
      const id = this.current().id; if (id !== this.m.applied) { this.m.applied = id; setCardFace(id, instant); }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    },
    addPhoto(fields, id, verified) {
      const m = this.m; m.snapshot = { ...m.fields };
      const got = fields || { name: FIELDS0.name, title: FIELDS0.title, company: FIELDS0.company };
      ['name', 'title', 'company', 'email', 'website'].forEach((k) => { if (got[k]) { let v = String(got[k]).trim(); const max = k === 'email' || k === 'website' ? 60 : 20; if (v.length > max) { const cut = v.slice(0, max + 1).lastIndexOf(' '); v = (cut > 8 ? v.slice(0, cut) : v.slice(0, max)).replace(/[\s&,-]+$/, ''); } m.fields[k] = v; } });
      m.snapshotInfo = S.info.map((r) => ({ ...r }));
      [['Email', got.email], ['Phone', got.phone]].forEach(([t, v]) => { if (!v) return; const r = S.info.find((x) => x.t === t); if (r) r.v = v; else S.info.push({ t, v }); });
      m.verified = !!verified; $('.ai-banner__note', this.sec).hidden = !verified;
      syncFields(); m.photoIds.unshift(id || 'photo'); m.idx = 0; m.banner = true; m.filled = false; m.logoPrompt = false; S.pending = true;
      this.render();
      const banner = $('.ai-banner', this.sec); banner.classList.remove('is-sweep'); void banner.offsetWidth; banner.classList.add('is-sweep');
      // recognised fields light up one by one (120ms apart, spec §7.1)
      ['name', 'title', 'company', 'slogan'].forEach((k, i) => later(() => { const f = $(`.c-field[data-key="${k}"]`, this.sec); if (f && m.banner) f.classList.add('is-filled'); if (i === 3) m.filled = true; }, isRM() ? 0 : 200 + i * 120));
    },
    undo() {
      const m = this.m; if (m.snapshot) m.fields = { ...m.snapshot }; if (m.snapshotInfo) S.info = m.snapshotInfo; m.snapshotInfo = null; m.photoIds.shift(); m.idx = m.photos + PORTRAIT; m.banner = false; m.filled = false; m.snapshot = null;
      syncFields(); this.render();
    },
  };
  Edit.reset();

  /* ── 05 · Create from Photo ── */
  /* ═════════════ 05 · Create from Photo — real camera / library + on-device OCR (Tesseract.js, WASM in a Web Worker) ═════════════
     Photos never leave the device: OCR, field parsing and dithering all run in the browser. */
  const VENDOR = 'assets/vendor/tesseract/';
  const PHOTOS = {}; // id → { src, o }
  let photoSeq = 0;
  const OCR = {
    worker: null, loading: null,
    load() {
      if (this.worker) return Promise.resolve(this.worker);
      if (this.loading) return this.loading;
      this.loading = new Promise((res, rej) => {
        const go = () => window.Tesseract.createWorker('eng', 1, {
          workerPath: VENDOR + 'worker.min.js', corePath: VENDOR, langPath: VENDOR + 'lang', gzip: false, workerBlobURL: false, logger: () => {},
        }).then((w) => { this.worker = w; res(w); }, rej);
        if (window.Tesseract) go();
        else { const s = document.createElement('script'); s.src = VENDOR + 'tesseract.min.js'; s.onload = go; s.onerror = rej; document.head.appendChild(s); }
      }).catch((e) => { this.loading = null; throw e; });
      return this.loading;
    },
  };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  /* local field heuristics (no online model) */
  const KW_TITLE = /\b(director|manager|founder|co-?founder|designer|architect|attorney|dentist|engineer|principal|partner at|ceo|cto|coo|cfo|vp|vice president|head of|lead|consultant|owner|officer|specialist|associate|analyst|chef|barista|realtor|agent|dds|esq)\b/i;
  const KW_COMPANY = /\b(inc|llc|ltd|co\.|corp|company|studio|studios|partners|legal|law|roasters|coffee|architects|architecture|dental|group|labs|agency|design|consulting|collective|bakery|clinic|realty|associates)\b/i;
  function parseCard(text) {
    const clean = (l) => l.replace(/[^A-Za-z0-9&@.,'’+()\-/: ]+/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^[^A-Za-z0-9+(]+/, '').replace(/^[A-Za-z0-9]{1,2}[)\]]?\s+(?=\S{3})/, '').replace(/(\s\S{1,2})+$/, (m, _a, _o, str) => (/\d{3}.*\d{4}/.test(str) ? m : '')).trim();
    const lines = text.split(/\n+/).map(clean).filter((l) => l.length >= 3 && /[A-Za-z]{2}/.test(l) && (l.match(/[A-Za-z]/g) || []).length / l.length > 0.5 || /@|\d{3}/.test(l));
    const out = { name: '', title: '', company: '', email: '', phone: '', website: '' }; const used = new Set();
    const all = lines.join('\n');
    const em = all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); if (em) out.email = em[0].toLowerCase();
    const ph = all.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/); if (ph) out.phone = ph[0].trim();
    const webs = all.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|co|io|net|org|ai|dev|design|studio|law|us|uk|app|cafe|coffee|legal|dental)\b(?:\/\S*)?/gi) || [];
    const web = webs.find((w) => !out.email || !out.email.endsWith(w.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase()) || !out.email.includes('@' + w));
    if (web && !(out.email && out.email.includes(web.toLowerCase()) && !/^www\./i.test(web))) out.website = web.replace(/^https?:\/\//, '').toLowerCase();
    lines.forEach((l, i) => { if ((out.email && l.toLowerCase().includes(out.email)) || (out.phone && l.includes(out.phone)) || (out.website && l.toLowerCase().includes(out.website))) used.add(i); });
    const isName = (l) => !KW_COMPANY.test(l) && !KW_TITLE.test(l) && /^(?:(?:Dr|Mr|Ms|Mrs|Prof)\.?\s)?[A-Z][a-z'’-]+(?:\s[A-Z]\.?)?\s[A-Z][a-z'’-]+(?:,?\s[A-Z]{2,4})?$/.test(l);
    let ni = lines.findIndex((l, i) => i < 3 && !used.has(i) && isName(l));
    if (ni < 0) ni = lines.findIndex((l, i) => !used.has(i) && isName(l));
    if (ni >= 0) { out.name = lines[ni]; used.add(ni); }
    const ti = lines.findIndex((l, i) => !used.has(i) && KW_TITLE.test(l)); if (ti >= 0) { out.title = lines[ti]; used.add(ti); }
    let ci = lines.findIndex((l, i) => !used.has(i) && KW_COMPANY.test(l));
    if (ci < 0) { let best = -1; lines.forEach((l, i) => { if (!used.has(i) && /[a-z]/i.test(l) && (best < 0 || l.length > lines[best].length)) best = i; }); ci = best; }
    if (ci >= 0) { out.company = lines[ci]; used.add(ci); }
    return out;
  }

  /* photo → 528×792 (or 792×528) greyscale, 16 levels, Floyd–Steinberg dithered e-ink card */
  function ditherCard(img) {
    const land = img.naturalWidth > img.naturalHeight; const W = land ? 792 : 528, H = land ? 528 : 792;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight); const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const d = g.getImageData(0, 0, W, H); const px = d.data; const L = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    const step = 255 / 15;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; const o = L[i]; const q = Math.max(0, Math.min(255, Math.round(o / step) * step)); const e = o - q; L[i] = q;
      if (x + 1 < W) L[i + 1] += e * 7 / 16;
      if (y + 1 < H) { if (x > 0) L[i + W - 1] += e * 3 / 16; L[i + W] += e * 5 / 16; if (x + 1 < W) L[i + W + 1] += e / 16; }
    }
    for (let i = 0; i < W * H; i++) { const v = L[i]; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0);
    return { src: c.toDataURL('image/png'), o: land ? 'l' : 'p' };
  }

  function prepOCR(img) { // upscale small photos, greyscale + stretch contrast so card text survives
    const k = Math.min(3, Math.max(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight)));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.filter = 'grayscale(1) contrast(1.6)'; g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

  let SAMPLES = [];
  function loadSamples() {
    return fetch('assets/photos/samples.json').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((j) => {
      const arr = Array.isArray(j) ? j : (j.samples || j.cards || Object.values(j));
      SAMPLES = (arr || []).map((s, i) => {
        const n = String(i + 1).padStart(2, '0');
        const file = s.file || s.image || s.src || `sample_${n}.jpg`;
        const f = s.fields || s.truth || s;
        return { file: /\//.test(file) ? file : 'assets/photos/' + file, thumb: s.thumb ? (/\//.test(s.thumb) ? s.thumb : 'assets/photos/' + s.thumb) : null, truth: { name: f.name || '', title: f.title || '', company: f.company || '', email: f.email || '', phone: f.phone || '', website: f.website || '' } };
      });
      const grid = $('.picker__samples');
      if (!grid) return;
      grid.innerHTML = SAMPLES.map((s, i) => `<button type="button" class="picker__sample" data-sample="${i}" aria-label="Sample card ${i + 1}"><img src="${s.thumb || s.file}" alt="" draggable="false" onerror="this.src='${s.file}'"></button>`).join('');
      $('.picker__samples-wrap').hidden = !SAMPLES.length;
    });
  }

  const Photo = {
    fail: false, current: null, stream: null,
    start(st) { // simulated branch kept for the tour (05b / 05e jump) and long-press failure
      applyState(FRAME['05'].sec, st);
      if (st !== '05b') return;
      if (this.fail) later(() => { if (FRAME['05'].sec.dataset.state === '05b') { this.fail = false; applyState(FRAME['05'].sec, '05e'); } }, 2400);
      else if (!this.current) this.current = { src: 'assets/cards/bc1.jpg', sample: null };
      if (!this.fail) this.process(this.current);
    },
    tab(t) {
      const sec = FRAME['05'].sec; $$('.picker__tabs button', sec).forEach((b) => b.classList.toggle('is-on', b.dataset.tab === t));
      $('.picker__lib', sec).hidden = t !== 'library'; $('.picker__cam', sec).hidden = t !== 'camera';
      if (t === 'camera') this.openCamera(); else this.closeCamera();
    },
    openCamera() {
      const sec = FRAME['05'].sec; const v = $('.picker__video', sec); const msg = $('.picker__cam-msg', sec);
      if (isTouch || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { v.hidden = true; $('[data-act="snap"]', sec).hidden = true; msg.hidden = false; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }).then((st) => {
        this.stream = st; v.srcObject = st; v.hidden = false; $('[data-act="snap"]', sec).hidden = false; msg.hidden = true; v.play().catch(() => {});
      }).catch(() => { v.hidden = true; $('[data-act="snap"]', sec).hidden = true; msg.hidden = false; });
    },
    closeCamera() { if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; } },
    snap() {
      const v = $('.picker__video'); if (!v.videoWidth) return;
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
      this.closeCamera(); this.begin({ src: c.toDataURL('image/jpeg', 0.92), sample: null });
    },
    fromFile(file) { if (!file) return; const r = new FileReader(); r.onload = () => this.begin({ src: r.result, sample: null }); r.readAsDataURL(file); },
    fromSample(i) { const s = SAMPLES[i]; if (s) this.begin({ src: s.file, sample: s }); },
    begin(item) {
      this.current = item; this.fail = false;
      const first = !OCR.worker;
      const go = () => { applyState(FRAME['05'].sec, '05b'); this.process(item); };
      if (first) { const el = $('#loader'); el.classList.add('is-on'); OCR.load().then(() => { el.classList.remove('is-on'); go(); }, () => { el.classList.remove('is-on'); applyState(FRAME['05'].sec, '05e'); }); } else go();
    },
    async process(item) {
      const sec = FRAME['05'].sec; $('.scan__photo img', sec).src = item.src;
      const t0 = performance.now(); const token = ++this.token;
      let fields = null; let verified = false; let card = null;
      try {
        const img = await loadImg(item.src);
        card = ditherCard(img);
        const w = await withTimeout(OCR.load(), 12000);
        // two passes (as-is + contrast-boosted) and merge field by field — cheap insurance for photos of paper cards
        const a = await withTimeout(w.recognize(img), 12000);
        const b = await withTimeout(w.recognize(prepOCR(img)), 12000);
        const fa = parseCard(a.data.text || ''), fb = parseCard(b.data.text || '');
        fields = {}; Object.keys(fa).forEach((k) => { fields[k] = fb[k] && (!fa[k] || fb[k].length <= fa[k].length + 4) ? fb[k] : fa[k] || fb[k]; });
        ['name', 'email', 'phone'].forEach((k) => { if (fa[k] && fb[k]) fields[k] = k === 'name' ? fb[k] : fa[k]; });
        const anyText = ((a.data.text || '') + (b.data.text || '')).replace(/\s/g, '').length >= 4;
        if (!anyText && !item.sample) fields = null;
      } catch (e) { fields = item.sample ? {} : null; }
      if (item.sample) {
        const t = item.sample.truth; const miss = ['name', 'title', 'company', 'email'].some((k) => t[k] && !(fields && fields[k]));
        if (!fields || miss) { fields = { ...t }; verified = true; }
      }
      const wait = Math.max(0, 1600 - (performance.now() - t0)); await new Promise((r) => setTimeout(r, wait));
      if (token !== this.token || sec.dataset.state !== '05b' || top() !== sec) return;
      if (!fields || (!fields.name && !fields.company && !fields.email)) { applyState(sec, '05e'); return; }
      const id = 'photo:' + (++photoSeq); PHOTOS[id] = card || { src: item.src, o: 'l' };
      this.lastFields = fields;
      pop('03').then(() => Edit.addPhoto(fields, id, verified));
    },
    token: 0,
  };
  window.VersoOCR = { parseCard, prepOCR, OCR, Photo };

  /* ───────── state ───────── */
  function applyState(sec, st, fromRender) {
    if (!fromRender && sec.dataset.ctrl === 'edit') { Edit.preset(st); Edit.render(); return; }
    sec.dataset.state = st;
    $$('[data-when]', sec).forEach((el) => { el.hidden = !el.dataset.when.split(/\s+/).includes(st); });
    const dark = sec.dataset.dark === '1' || (sec.dataset.darkStates || '').split(/\s+/).includes(st);
    sec.classList.toggle('screen--dark', dark);
    $$('[data-bind="opensLabel"]').forEach((el) => { el.textContent = OPENS[S.opens].label; });
    $$('[data-bind="opensLink"]').forEach((el) => { el.textContent = OPENS[S.opens].link; });
    $$('[data-bind="previewLabel"]').forEach((el) => { el.textContent = 'Preview ' + OPENS[S.opens].label; });
    $$('#phone .menu [data-opens]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.opens === S.opens)));
    if (sec.dataset.id === '06') { $('#nfcUrl').classList.toggle('is-error', st === '06d'); const inp = $('#nfcUrl input'); if (inp.value !== S.customUrl) inp.value = S.customUrl; }
    if (sec.dataset.id === '07') renderInfo();
    if (window.VersoDevice) window.VersoDevice.sync();
    syncTour();
  }
  function setState(st) { const f = FRAME[st]; if (f) applyState(f.sec, st); }
  function defaultState(id) {
    if (id === '00') return S.variant;
    if (id === '01') return LOGO_TPL.includes(Edit.m.applied) && !Edit.m.logo ? '01i' : S.pending ? '01b' : '01';
    if (id === '02') return OPENS[S.opens].state02;
    if (id === '06') return S.opens === 'custom' && !URL_OK(S.customUrl) ? '06d' : OPENS[S.opens].state06;
    if (id === '07') return S.info.length ? '07' : '07b';
    return id;
  }
  const top = () => S.stack[S.stack.length - 1];
  const current = () => (S.sheet ? FRAME[S.sheet] : top() && FRAME[top().dataset.state]);
  function enterSection(sec, st) {
    if (sec.dataset.ctrl === 'edit') { Edit.enter(); return; }
    applyState(sec, st);
  }

  /* ───────── router ───────── */
  function lock(on) { S.busy = on; phone.classList.toggle('is-busy', on); }
  async function push(id) {
    if (S.busy || !FRAME[id]) return;
    const { sec } = FRAME[id];
    if (sec.classList.contains('is-sheet')) return presentSheet(id);
    const st = id === sec.dataset.id ? defaultState(sec.dataset.id) : id;
    const from = top();
    if (from === sec) { applyState(sec, st); return; }
    enterSection(sec, st);
    S.stack.push(sec); syncChrome();
    sec.hidden = false; sec.style.zIndex = 2; from.style.zIndex = 1;
    if (sec.dataset.id === '02' && ['00', '01'].includes(from.dataset.id) && !isRM()) { // §11.2: hero card shrinks away, QR takes over
      const scr = $('.c-device-hero__screen', from); const r1 = rel(scr); const q = rel($('.share-card__qr', sec));
      scr.style.visibility = 'hidden';
      fly(Edit.m.applied, r1, { x: q.x + q.w / 2 - 24, y: q.y + q.h / 2 - 36, w: 48, h: 72 }, 320, M.reveal[1], true).then(() => { scr.style.visibility = ''; });
      run($('.share-card__qr svg', sec), [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], 320, M.reveal[1]).then((a) => a && a.cancel());
    }
    if (sec.dataset.id === '05d') { const f = $('.c-card-face', sec); f.replaceChildren(faceLayer(Edit.current().id)); }
    if (sec.dataset.id === '05') { Photo.tab('library'); if (!SAMPLES.length) loadSamples(); }
    if (sec.dataset.id === '08' && !S.bioLoaded) { S.bioLoaded = true; inkLoad(1200); }
    if (sec.dataset.id === '01' && !store.get('coach')) applyState(sec, '01g');
    lock(true);
    const [dur, ease] = M.push; const dim = $('.screen__dim', from);
    reveal(sec); // content entrance runs on its own clock; navigation unlocks after the push
    const anims = isRM()
      ? await Promise.all([run(sec, [{ opacity: 0 }, { opacity: 1 }], M.reduced, 'linear')])
      : await Promise.all([
        run(sec, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], dur, ease),
        run(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(-30%)' }], dur, ease),
        run(dim, [{ opacity: 0 }, { opacity: 0.08 }], dur, ease)]);
    from.hidden = true; done(anims); sec.style.zIndex = ''; from.style.zIndex = '';
    lock(false); syncTour();
  }

  async function pop(toId) {
    if (S.busy) return;
    if (S.asheet) return closeActionSheet();
    if (S.sheet) return dismissSheet();
    if (S.stack.length < 2) return;
    const from = S.stack.pop();
    if (toId) while (S.stack.length > 1 && top().dataset.id !== toId) S.stack.pop().hidden = true;
    const to = top();
    const flyHome = from.dataset.id === '03' && to.dataset.id === '01' && !isRM();
    const r1 = flyHome && $('.carousel__card.is-current', from) ? rel($('.carousel__card.is-current', from)) : null;
    if (from.dataset.id === '03') Edit.leave(!!r1);
    if (from.dataset.id === '05') { Photo.closeCamera(); Photo.token += 1; }
    if (to.dataset.id === '01' && from.dataset.id === '03') S.pending = true;
    clearTimers();
    if (to.dataset.ctrl === 'edit') Edit.render();
    else applyState(to, ['01', '02', '06'].includes(to.dataset.id) ? defaultState(to.dataset.id) : to.dataset.state);
    syncChrome();
    to.hidden = false; to.style.zIndex = 1; from.style.zIndex = 2;
    if (r1) { // §11.2: the current carousel card flies back into the hero; the machine fades in
      const scr = $('.c-device-hero__screen', to); const r2 = rel(scr); scr.style.visibility = 'hidden';
      run($('.c-device-hero__img', to), [{ opacity: 0 }, { opacity: 1 }], 200, 'linear').then((a) => a && a.cancel());
      fly(Edit.m.applied, r1, r2, 420, M.carousel[1]).then(() => { scr.style.visibility = ''; });
    }
    lock(true);
    const [dur, ease] = M.push; const dim = $('.screen__dim', to);
    const anims = isRM()
      ? await Promise.all([run(from, [{ opacity: 1 }, { opacity: 0 }], M.reduced, 'linear')])
      : await Promise.all([
        run(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], dur, ease),
        run(to, [{ transform: 'translateX(-30%)' }, { transform: 'translateX(0)' }], dur, ease),
        run(dim, [{ opacity: 0.08 }, { opacity: 0 }], dur, ease)]);
    from.hidden = true; done(anims); to.style.zIndex = ''; from.style.zIndex = '';
    lock(false); syncTour();
  }

  async function showPanel(panels, show) {
    const scrim = $('#scrim'); const [dur, ease] = M.sheet;
    if (show) scrim.classList.add('is-on');
    lock(true);
    const anims = await Promise.all([
      run(scrim, show ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], isRM() ? M.reduced : M.scrim, 'linear', !show && !isRM() ? dur - M.scrim : 0),
      ...panels.map((p) => (p.dataset.anim === 'pop' && !isRM()
        ? run(p, show ? [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], 250, ease)
        : isRM()
        ? run(p, show ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], M.reduced, 'linear')
        : run(p, show ? [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }] : [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], dur, ease)))]);
    scrim.style.opacity = show ? '1' : ''; if (!show) scrim.classList.remove('is-on');
    return anims;
  }
  async function presentSheet(id) {
    if (S.busy || S.sheet || !FRAME[id]) return;
    const { sec } = FRAME[id]; applyState(sec, id);
    if (id === '02d') $('.wallet-sheet', sec).dataset.mode = S.wallet ? 'view' : 'add';
    if (id === '01h') buildFullview(S.fullFace || Edit.m.applied);
    S.sheet = id; sec.hidden = false;
    const spark = $('.ai-spark', sec); if (spark) { spark.classList.remove('ai-flash'); void spark.getBoundingClientRect(); spark.classList.add('ai-flash'); }
    const anims = await showPanel($$('[data-sheet-panel]', sec), true);
    done(anims); lock(false); syncTour();
  }
  async function dismissSheet() {
    if (!S.sheet) return;
    const { sec } = FRAME[S.sheet];
    const anims = await showPanel($$('[data-sheet-panel]', sec), false);
    sec.hidden = true; done(anims); S.sheet = null; lock(false); syncTour();
  }

  /* system action sheet stand-in (04 ⋯, 05d ⋯) */
  async function openActionSheet(title, items) {
    if (S.busy || S.asheet) return;
    const el = $('#asheet'); const group = $('.asheet__group', el);
    group.innerHTML = `<div class="asheet__title">${esc(title)}</div>` + items.map((it, i) => `<button type="button" data-asheet="${i}"${it.destructive ? ' class="is-destructive"' : ''}>${esc(it.label)}</button>`).join('');
    S.asheet = items; el.classList.add('is-open');
    const anims = await showPanel([el], true); done(anims); lock(false);
  }
  async function closeActionSheet() {
    if (!S.asheet) return; const el = $('#asheet');
    const anims = await showPanel([el], false); done(anims); el.classList.remove('is-open'); S.asheet = null; lock(false);
  }

  /* jump (tour / deep link): rebuild the stack without animation */
  function jump(id) {
    if (!FRAME[id]) id = S.variant;
    clearTimers(); hideToast();
    $$('.screen', phone).forEach((s) => { s.hidden = true; s.style.zIndex = ''; });
    $('#asheet').classList.remove('is-open'); S.asheet = null;
    $('#scrim').classList.remove('is-on'); $('#scrim').style.opacity = ''; S.sheet = null;
    const sheetUnder = SHEET_UNDER[id];
    const baseId = sheetUnder || id; const base = FRAME[baseId].sec;
    const path = base.dataset.id === '00' ? ['00'] : (PATH[base.dataset.id] || ['00']).concat(base.dataset.id);
    S.stack = path.map((p) => FRAME[p].sec);
    if (/^02[bc]?$/.test(baseId)) S.opens = { '02': 'bio', '02b': 'contact', '02c': 'custom' }[baseId];
    if (/^06[bcd]?$/.test(baseId)) S.opens = { '06': 'bio', '06b': 'contact', '06c': 'custom', '06d': 'custom' }[baseId];
    S.customUrl = baseId === '06d' ? 'northwind.co' : 'https://northwind.co';
    if (baseId === '07b') S.info = []; else if (/^0[78]/.test(baseId)) S.info = INFO0.slice();
    if (baseId === '07c') setupAdd('email');
    if (baseId === '07e') { S.info = INFO0.slice(); setupAdd('email', 0); }
    if (baseId === '01i') { Edit.preset('03'); Edit.m.idx = 0; Edit.m.applied = 'logo-signature'; setCardFace('logo-signature', true); }
    if (baseId === '01h') S.fullFace = Edit.m.applied;
    if (baseId === '05g') { Edit.preset('05c'); Edit.m.banner = false; }
    if (baseId === '07d') { setupAdd('link'); $('#addUrl input').value = 'northwind'; S.add.touched = { label: true, url: true }; checkAdd(); }
    if (baseId === '00' || baseId === '00c') { S.variant = baseId; syncVariant(); }
    if (/^01/.test(baseId)) S.pending = baseId !== '01' && baseId !== '01d';
    if (baseId === '08') S.bioLoaded = true;
    if (baseId === '04') Edit.preset('03d');
    if (/^05[be]?$/.test(baseId)) Edit.preset('03');
    if (baseId === '05d' || baseId === '05g') { Edit.preset('05c'); Edit.m.banner = false; Edit.m.filled = false; }
    S.stack.forEach((s) => { if (s !== base) { if (s.dataset.ctrl === 'edit') Edit.render(); else applyState(s, defaultState(s.dataset.id)); } });
    applyState(base, baseId);
    if (base.dataset.ctrl === 'edit') requestAnimationFrame(() => Edit.applyScroll());
    base.hidden = false;
    if (baseId === '01g') store.set('coach', '');
    if (baseId === '01d') toast('ok', 'Updated on Verso', () => setState('01'));
    if (baseId === '01e') toast('err', 'Couldn’t update Verso. Try again', () => setState('01b'));
    if (baseId === '05g') toast('err', 'Couldn’t delete this photo. Try again', () => applyState(FRAME['05d'].sec, '05d'));
    if (baseId === '03h') toast('err', 'Couldn’t upload this logo. Try again');
    if (baseId === '05f') toast('err', 'You can upload up to 4 photos', () => { Edit.m.toast = false; Edit.render(); });
    if (baseId === '05b') Photo.start('05b');
    if (sheetUnder) {
      const { sec } = FRAME[id]; applyState(sec, id); sec.hidden = false; S.sheet = id;
      if (id === '02d') $('.wallet-sheet', sec).dataset.mode = S.wallet ? 'view' : 'add';
      if (id === '01h') buildFullview(S.fullFace || Edit.m.applied);
      $('#scrim').classList.add('is-on'); $('#scrim').style.opacity = '1';
    }
    syncChrome(); syncTour();
  }

  /* ───────── chrome: status bar colour follows the screen ───────── */
  function syncChrome() { const t = top(); phone.classList.toggle('is-dark', !!t && t.classList.contains('screen--dark')); phone.classList.toggle('is-08', !!t && t.dataset.id === '08'); }

  /* ───────── toast (§8: fade in + rise 8px, hold 2s, fade out) ─────────
     「Toast 临时接管次级说明」: while up, the secondary caption lines under the hero fade out. */
  let toastTimer = null;
  function toast(kind, msg, after) {
    const el = $('#toast'); clearTimeout(toastTimer);
    const t = top(); el.style.top = ((t && t.dataset.toastTop) || 730) + 'px';
    el.classList.toggle('is-inverse', !!(t && t.classList.contains('screen--dark')) || S.sheet === '01h'); // dark pages: inverted toast
    $('use', el).setAttribute('href', kind === 'err' ? '#exclamationmark.circle' : '#checkmark');
    $('span', el).textContent = msg;
    phone.classList.add('toast-on');
    const d = isRM() ? M.reduced : M.toast;
    el.getAnimations && el.getAnimations().forEach((a) => a.cancel());
    run(el, isRM() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], d, 'ease-out');
    toastTimer = setTimeout(() => {
      run(el, [{ opacity: 1, transform: 'translate(-50%, 0)' }, { opacity: 0, transform: 'translate(-50%, 0)' }], d, 'ease-in').then(() => {
        el.getAnimations && el.getAnimations().forEach((x) => x.cancel()); el.style.opacity = '0'; phone.classList.remove('toast-on'); if (after) after();
      });
    }, 2000 + d);
  }
  function hideToast() { clearTimeout(toastTimer); phone.classList.remove('toast-on'); const el = $('#toast'); el.getAnimations && el.getAnimations().forEach((a) => a.cancel()); el.style.opacity = '0'; }

  /* ───────── actions ───────── */
  function doUpdate(fail) {
    setState('01c'); Device.startUpdate(); // optimistic: Updating at once, no handshake wait
    later(() => {
      if (fail) { Device.finishUpdate(false); }
      else { Device.finishUpdate(true, Edit.m.applied); heroInk(FRAME['01'].sec); }
      if (fail) { setState('01e'); toast('err', 'Couldn’t update Verso. Try again', () => { if (FRAME['01'].sec.dataset.state === '01e') setState('01b'); }); }
      else { S.pending = false; setState('01d'); toast('ok', 'Updated on Verso', () => { if (FRAME['01'].sec.dataset.state === '01d') setState('01'); }); }
    }, 2200);
  }
  function chipProcess(chip, ms, then) {
    if (chip.classList.contains('is-processing')) return;
    chip.classList.add('is-processing'); lock(true);
    setTimeout(() => { chip.classList.remove('is-processing'); lock(false); then(); }, ms);
  }
  const ACTIONS = {
    update: (t) => { if (!longFired) doUpdate(false); longFired = false; },
    connect: () => setState('01b'),
    copy: async () => {
      const link = OPENS[S.opens].link; try { navigator.clipboard && navigator.clipboard.writeText(link).catch(() => {}); } catch (err) { /* ignore */ }
      if (S.sheet) await dismissSheet();
      toast('ok', 'Link copied');
    },
    'wallet-add': async () => {
      await dismissSheet(); S.wallet = true; syncWallet(); toast('ok', 'Added to Wallet');
    },
    photo: () => {
      if (longFired) { longFired = false; return; }
      if (Edit.m.photos >= 4) { Edit.m.toast = true; Edit.render(); toast('err', 'You can upload up to 4 photos', () => { Edit.m.toast = false; Edit.render(); }); return; }
      Photo.fail = false; push('05');
    },
    snap: () => Photo.snap(),
    'pick-again': () => { applyState(FRAME['05'].sec, '05'); Photo.tab('library'); },
    retry: () => { Photo.fail = false; if (Photo.current) Photo.begin(Photo.current); else applyState(FRAME['05'].sec, '05'); },
    'logo-row': () => { if (Edit.m.logo) push('04'); else { Edit.m.logoPrompt = true; Edit.render(); } },
    'find-logo': (t) => chipProcess(t, isRM() ? 300 : 900, () => inkLoad(1000).then(() => presentSheet('04b'))),
    'use-logo': async () => {
      if (S.sheet) await dismissSheet(); Edit.m.logo = true; Edit.m.logoPrompt = false; Edit.m.logoFail = false;
      const i = TEMPLATES.findIndex((x) => x.id === 'logo-mark') + Edit.m.photos; Edit.go(i, 0); S.pending = true;
    },
    fit20: (t) => chipProcess(t, isRM() ? 300 : 1000, () => { Edit.m.fields.slogan = 'Ideas into reality.'; syncFields('slogan'); Edit.render(); }),
    undo: () => Edit.undo(),
    'logo-menu': () => openActionSheet('Logo', [{ label: 'Replace Logo', fn: () => {} }, { label: 'Delete Logo', destructive: true, fn: () => { Edit.m.logo = false; pop('03'); } }]),
    'photo-menu': () => openActionSheet('Photo card', [{ label: 'Save Image', fn: () => {} }, { label: 'Delete Photo', destructive: true,
      fn: () => { // remove → back to 03 on the first remaining photo, else the last template used
        const k = Edit.m.photoIds.indexOf(Edit.current().id); Edit.m.photoIds.splice(k < 0 ? 0 : k, 1);
        Edit.m.idx = Edit.m.photos ? 0 : Edit.m.lastTpl; Edit.m.banner = false; pop('03');
      },
      fail: () => { applyState(FRAME['05d'].sec, '05g'); toast('err', 'Couldn’t delete this photo. Try again', () => applyState(FRAME['05d'].sec, '05d')); } }]),
    fullview: () => { S.fullFace = Edit.m.applied; presentSheet('01h'); },
    'upload-logo': () => { if (longFired) { longFired = false; return; } ACTIONS['use-logo'](); },
    'logo-retry': () => { Edit.m.logoFail = false; ACTIONS['use-logo'](); },
    'asheet-cancel': () => closeActionSheet(),
    'save-contact': () => toast('ok', 'Contact saved'),
    'add-save': () => {
      if (!addValid()) return; const a = S.add; const { v, u } = addVals();
      if (a.edit != null && a.orig === JSON.stringify(addVals())) return;
      if ((a.kind.link && !u) || (!a.kind.link && !v)) { if (a.edit != null) S.info.splice(a.edit, 1); pop('07'); return; } // blank → not shown
      if (a.edit != null) { S.info.splice(a.edit, 1, a.kind.link ? { t: $('#addLabel input').value.trim(), v: u.replace(/^https:\/\//, '') } : { t: S.info[a.edit].t, v }); pop('07'); return; }
      S.info.push(a.kind.link ? { t: $('#addLabel input').value.trim(), v: $('#addUrl input').value.trim().replace(/^https:\/\//, '') } : { t: a.kind.title, v: $('#addValue input').value.trim() });
      pop('07');
    },
    noop: () => {},
  };
  function syncWallet() {
    const sec = FRAME['02'].sec;
    $('[data-wallet="add"]', sec).hidden = S.wallet; $('[data-wallet="view"]', sec).hidden = !S.wallet;
  }
  async function linkAction(act) {
    const [k, v] = act.split(':');
    if (k === 'state') setState(v);
    else if (k === 'go') push(v);
    else if (k === 'sheet') presentSheet(v);
    else if (k === 'opens') { S.opens = v; await dismissSheet(); setState(defaultState('06')); }
  }

  /* 01h · full-screen card: landscape masters shown upright (unrotated), fit to the screen */
  function buildFullview(id) {
    const box = $('.fullview__card'); const face = $('.c-card-face', box); const land = faceOrient(id) === 'l';
    const W = land ? 792 : 528, H = land ? 528 : 792; const k = land ? 370 / 792 : Math.min(370 / 528, 640 / 792);
    box.style.width = Math.round(W * k) + 'px'; box.style.height = Math.round(H * k) + 'px';
    // Figma 01h: portrait card at 16/160 (370×555); landscape centred on the same axis; corner 7 @ 528 base
    box.style.top = (land ? Math.round(437.5 - H * k / 2) : 160) + 'px'; box.style.borderRadius = (7 * k).toFixed(2) + 'px';
    Object.assign(face.style, { width: W + 'px', height: H + 'px' }); face.style.setProperty('--s', k);
    const layer = faceLayer(id); const c = layer.firstElementChild; if (c && c.classList.contains('is-land')) c.style.transform = 'none';
    if (land && c && c.classList.contains('face-img')) Object.assign(c.style, { transform: 'none', width: '792px', height: '528px' });
    face.replaceChildren(layer);
  }

  /* ───────── 07 info list + add page ───────── */
  function renderInfo() {
    const list = $('#displayList'); const empty = $('#displayEmpty');
    list.innerHTML = S.info.map((r, i) => `<button type="button" class="c-list__row is-link" data-edit="${i}"><span class="c-list__title">${esc(r.t)}</span><span class="c-list__value">${esc(r.v)}</span><span class="c-list__chev"><svg class="i"><use href="#chevron.right"/></svg></span></button>`).join('');
    list.hidden = !S.info.length; empty.hidden = !!S.info.length;
  }
  function setupAdd(k, editIdx) {
    const kind = ADD_KINDS[k]; S.add = { k, kind, touched: {}, edit: editIdx == null ? null : editIdx };
    FRAME['07c'].sec.dataset.form = kind.link ? 'link' : 'single';
    $('#addTitle').textContent = kind.title;
    if (!kind.link) {
      const f = $('#addValue'); const inp = $('input', f);
      $('.c-field__label', f).textContent = kind.label; inp.type = kind.type; inp.placeholder = kind.ph; inp.value = '';
      $('.c-field__error', f).textContent = kind.err; f.nextElementSibling.textContent = kind.hint;
    } else { $('#addLabel input').value = k === 'link' ? '' : kind.title; $('#addUrl input').value = ''; }
    if (editIdx != null) { // 07e · prefill an existing row; Done stays off until something changes
      const r = S.info[editIdx]; $('#addTitle').textContent = r.t;
      if (kind.link) { $('#addLabel input').value = r.t; $('#addUrl input').value = /^https?:\/\//.test(r.v) ? r.v : 'https://' + r.v; } else $('#addValue input').value = r.v;
      S.add.orig = JSON.stringify(addVals());
    }
    checkAdd();
  }
  function editKind(t) { const k = { email: 'email', phone: 'phone', sms: 'sms', whatsapp: 'whatsapp' }[t.toLowerCase()]; return k || 'link'; }
  function addVals() { return { v: $('#addValue input').value.trim(), l: $('#addLabel input').value.trim(), u: $('#addUrl input').value.trim() }; }
  function addValid() { // blank = item not shown (allowed); only non-empty + malformed blocks Done
    const a = S.add; if (!a) return false; const { v, l, u } = addVals();
    if (!a.kind.link) return !v || a.kind.ok(v);
    if (!l && !u) return true;
    return !!l && URL_OK(u);
  }
  function checkAdd() {
    const a = S.add; if (!a) return; const { v, l, u } = addVals();
    if (!a.kind.link) $('#addValue').classList.toggle('is-error', !!a.touched.value && !!v && !a.kind.ok(v));
    else {
      $('#addLabel').classList.toggle('is-error', !!a.touched.label && !l && !!u);
      $('#addUrl').classList.toggle('is-error', !!a.touched.url && !!u && !URL_OK(u));
    }
    const unchanged = a.edit != null && a.orig === JSON.stringify(addVals());
    $('[data-act="add-save"]').setAttribute('aria-disabled', String(!addValid() || unchanged));
  }
  [['#addValue', 'value'], ['#addLabel', 'label'], ['#addUrl', 'url']].forEach(([sel, key]) => {
    const inp = $(sel + ' input');
    inp.addEventListener('input', checkAdd);
    inp.addEventListener('blur', () => { if (S.add) { S.add.touched[key] = true; checkAdd(); } });
  });
  $('#nfcUrl input').addEventListener('input', (e) => { S.customUrl = e.target.value; setState(URL_OK(S.customUrl) ? '06c' : '06d'); });

  /* ───────── input ───────── */
  let longPress = null; let longFired = false;
  phone.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button'); if (b && !b.closest('.kbd')) b.classList.add('is-pressed');
    const asLP = e.target.closest('[data-asheet]');
    if (asLP && S.asheet && S.asheet[+asLP.dataset.asheet].fail) {
      longFired = false; const it = S.asheet[+asLP.dataset.asheet];
      longPress = setTimeout(async () => { longFired = true; await closeActionSheet(); it.fail(); }, 600);
    }
    const lp = e.target.closest('[data-act="update"],[data-act="photo"],[data-act="upload-logo"]');
    if (lp) {
      longFired = false;
      longPress = setTimeout(() => {
        longFired = true; lp.classList.remove('is-pressed');
        if (lp.dataset.act === 'update') doUpdate(true);
        else if (lp.dataset.act === 'upload-logo') { dismissSheet().then(() => { Edit.m.logoFail = true; Edit.render(); toast('err', 'Couldn’t upload this logo. Try again'); }); }
        else { Photo.fail = true; push('05'); }
      }, 600);
    }
  });
  const release = () => { clearTimeout(longPress); $$('.is-pressed', phone).forEach((b) => b.classList.remove('is-pressed')); };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => phone.addEventListener(t, release));
  phone.addEventListener('contextmenu', (e) => e.preventDefault());

  phone.addEventListener('click', async (e) => {
    if (e.target.closest('.coach')) { store.set('coach', '1'); setState('01b'); return; }
    if (S.busy) return;
    const as = e.target.closest('[data-asheet]');
    if (as) { if (longFired) { longFired = false; return; } const it = S.asheet[+as.dataset.asheet]; await closeActionSheet(); it.fn(); return; }
    const tabB = e.target.closest('[data-tab]');
    if (tabB) { if (tabB.dataset.tab === 'camera' && isTouch) { $('[data-file="cam"]').click(); return; } Photo.tab(tabB.dataset.tab); return; }
    const smp = e.target.closest('[data-sample]');
    if (smp) { if (Photo.fail) { Photo.start('05b'); return; } Photo.fromSample(+smp.dataset.sample); return; }
    const op = e.target.closest('[data-opens]');
    if (op) { S.opens = op.dataset.opens; await dismissSheet(); setState(defaultState('06')); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { const i = +ed.dataset.edit; setupAdd(editKind(S.info[i].t), i); push('07e'); return; }
    const add = e.target.closest('[data-add]');
    if (add) { setupAdd(add.dataset.add); push(ADD_KINDS[add.dataset.add].link ? '07d' : '07c'); return; }
    const cand = e.target.closest('[data-cand]');
    if (cand) { $$('[data-cand]', cand.parentNode).forEach((c) => c.classList.toggle('is-selected', c === cand)); return; }
    const t = e.target.closest('[data-go],[data-sheet],[data-back],[data-act],[data-link]');
    if (!t) return;
    if (t.dataset.go) push(t.dataset.go);
    else if (t.dataset.sheet) presentSheet(t.dataset.sheet);
    else if (t.hasAttribute('data-back')) pop();
    else if (t.dataset.link) linkAction(t.dataset.link);
    else if (ACTIONS[t.dataset.act]) ACTIONS[t.dataset.act](t);
  });
  document.addEventListener('change', (e) => { const f = e.target.closest && e.target.closest('[data-file]'); if (!f) return; const file = f.files && f.files[0]; f.value = ''; if (!file) return; if (Photo.fail) { Photo.start('05b'); return; } Photo.fromFile(file); });
  $('#scrim').addEventListener('click', () => { if (S.busy) return; if (S.asheet) closeActionSheet(); else dismissSheet(); });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'Escape' || e.key === 'Backspace') pop();
  });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ───────── tour bar ───────── */
  const tour = { id: $('#tourId'), title: $('#tourTitle'), jump: $('#tourJump') };
  function syncTour() {
    const f = current(); if (!f) return;
    const id = S.sheet || f.state;
    tour.id.textContent = id; tour.title.textContent = (FRAME[id] && FRAME[id].title) || '';
    if (tour.jump.value !== id) tour.jump.value = id;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + id);
  }
  function syncVariant() {
    $$('.tour .seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.variant === S.variant)));
    store.set('variant', S.variant);
  }
  function buildTour() {
    tour.jump.innerHTML = ORDER().map((id) => `<option value="${id}">${id} · ${esc(FRAME[id].title || '')}${FRAME[id].sec.classList.contains('is-placeholder') ? '（占位）' : ''}</option>`).join('');
    tour.jump.addEventListener('change', () => jump(tour.jump.value));
    $$('.tour .seg button').forEach((b) => b.addEventListener('click', () => {
      S.variant = b.dataset.variant; syncVariant();
      const sec = FRAME['00'].sec; if (top() === sec && !S.sheet) applyState(sec, S.variant); else if (sec.dataset.state !== '00d') sec.dataset.state = S.variant;
    }));
    const rm = $('#optRM'); const saved = store.get('rm');
    rm.checked = saved === null ? mqRM.matches : saved === '1';
    const setRM = () => root.classList.toggle('rm', rm.checked);
    rm.addEventListener('change', () => { store.set('rm', rm.checked ? '1' : '0'); setRM(); }); setRM();
    const hot = $('#optHot'); hot.addEventListener('change', () => root.classList.toggle('show-hot', hot.checked));
    $('#tourReset').addEventListener('click', reset);
  }
  function reset(fromDemo) {
    if (!fromDemo) Demo.stop();
    store.set('coach', ''); S.bioLoaded = false;
    S.opens = 'bio'; S.customUrl = 'https://northwind.co'; S.info = INFO0.slice(); S.pending = true; S.wallet = false; syncWallet();
    Edit.reset(); syncFields(); setCardFace('portrait', true); Device.reset(); jump(S.variant); if (!fromDemo) reveal(top());
  }

  /* ───────── scale the phone to the viewport ───────── */
  let SCALE = 1; const phoneScale = () => SCALE;
  function fit() {
    const demo = root.classList.contains('is-demo');
    const tourH = demo ? 0 : $('#tour').offsetHeight;
    const mobile = window.innerWidth < 600;
    root.classList.toggle('is-mobile', mobile);
    const rig = $('#scaler'); const W = rig.offsetWidth, H = rig.offsetHeight; // natural (unscaled) rig size
    const pad = mobile ? 0 : 32;
    const vw = window.innerWidth, vh = window.innerHeight - tourH;
    let s = mobile ? vw / W : Math.min((vw - pad * 2) / W, (vh - pad * 2) / H, 1); SCALE = s;
    $('.stage').style.top = tourH + 'px';
    const box = $('#rigSize'); box.style.width = Math.round(W * s) + 'px'; box.style.height = Math.round(H * s) + 'px';
    box.style.marginLeft = Math.max(0, Math.round((vw - W * s) / 2)) + 'px';
    box.style.marginTop = mobile ? '0px' : Math.max(0, Math.round((vh - H * s) / 2)) + 'px';
    rig.style.transform = `scale(${s})`;
  }

  /* ───────── picker tiles (decorative greys around the one real photo) ───────── */
  function buildPicker() {
    const grid = $('.picker__grid'); if (!grid) return;
    const tones = ['#cfc9c1', '#b9b2a8', '#ddd8d1', '#a8a199', '#c6bfb5', '#e4e0da', '#bcb5ab', '#d6d0c8'];
    tones.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'picker__tile'; b.dataset.act = 'pick'; b.setAttribute('aria-label', 'Photo ' + (i + 2)); b.style.background = `linear-gradient(${135 + i * 17}deg, ${c}, #8f877d)`; grid.appendChild(b); });
  }

  /* ═════════════ 13 card faces as live DOM (Figma「C · Card face」40000041:71024, 528 × 792 / 792 × 528) ═════════════
     Every text is bound with data-field → typing in Edit Card updates the carousel, its neighbours and the home hero.
     Only the pictures are image slices (BC1 spheres, BC2 moon, Badge waveform, the dithered portrait). */
  const INK = 'var(--ink)';
  const fv = (k) => {
    const f = Edit.m.fields;
    if (k === 'initial') return (f.name.trim()[0] || '').toUpperCase();
    return f[k] == null ? '' : f[k];
  };
  // positioned text bound to a field
  const T = (k, x, y, font, color, extra = '') => `<div class="ff" data-field="${k}" style="left:${x}px;top:${y}px;font:${font};color:${color};${extra}">${esc(fv(k))}</div>`;
  // static (template-owned) text
  const X = (txt, x, y, font, color, extra = '') => `<div class="ff" style="left:${x}px;top:${y}px;font:${font};color:${color};${extra}">${txt}</div>`;
  // flow text inside a stack
  const F = (k, font, color, extra = '') => `<div class="ffs" data-field="${k}" style="font:${font};color:${color};${extra}">${esc(fv(k))}</div>`;
  const R = (x, y, w, h, bg) => `<i class="fr" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg}"></i>`;
  const RING = (x, y, d, c) => `<i class="fr" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;box-shadow:inset 0 0 0 2px ${c}"></i>`;
  const QR = (x, y, box, mod, plate) => `<div class="fq" style="left:${x}px;top:${y}px;width:${box}px;height:${box}px;${plate ? 'background:var(--paper);' : ''}padding:${(box - mod) / 2}px">${qrSvg(mod, 7)}</div>`;
  const IMG = (src, x, y, w, h, extra = '') => `<img class="fi" src="${src}" alt="" draggable="false" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">`;
  const A = (w, s, l) => `${w} ${s}px/${l}px var(--f-face)`;
  const I = (w, s, l) => `${w} ${s}px/${l}px var(--f-ui)`;
  const MC = (s, l) => `400 ${s}px/${l}px var(--f-display)`;
  const NOWRAP = 'white-space:nowrap;';
  const PERSONA = 'assets/persona_a_eink.png';

  const FACE_HTML = {
    'logo-signature': () => RING(50, 62, 57, '#9a9a9a') + RING(50, 62, 52, '#1a1a1a')
      + T('company', 124, 72, I(400, 26, 31), '#1a1a1a', NOWRAP) + R(44, 148, 440, 1, '#1a1a1a')
      + T('name', 42, 500, MC(56, 70), '#1a1a1a', 'max-width:440px') + T('title', 46, 576, I(400, 20, 24), '#1a1a1a', 'letter-spacing:2.4px;' + NOWRAP)
      + T('email', 46, 704, I(400, 16, 19), '#1a1a1a', 'letter-spacing:.96px;' + NOWRAP) + T('website', 46, 730, I(400, 16, 19), '#1a1a1a', 'letter-spacing:.96px;' + NOWRAP)
      + QR(414, 674, 68, 68),
    'logo-company': () => RING(118, 136, 121, '#9a9a9a') + RING(117, 137, 110, '#1a1a1a')
      + T('company', 69, 290, I(500, 18, 22), '#1a1a1a', 'letter-spacing:2.16px;' + NOWRAP)
      + T('name', 338, 168, MC(48, 60), '#1a1a1a', 'max-width:420px') + T('title', 340, 236, I(400, 20, 24), '#1a1a1a', 'letter-spacing:2px;' + NOWRAP)
      + R(0, 372, 792, 156, '#111') + T('email', 48, 420, I(400, 18, 22), '#fff', 'letter-spacing:1.08px;' + NOWRAP) + T('website', 48, 452, I(400, 18, 22), '#fff', 'letter-spacing:1.08px;' + NOWRAP)
      + QR(668, 402, 92, 84, true),
    'logo-mark': () => RING(69, 77, 92, '#9a9a9a') + RING(68, 78, 84, '#1a1a1a')
      + T('name', 58, 512, MC(48, 60), '#1a1a1a', 'max-width:410px') + T('title', 62, 572, I(400, 20, 24), '#1a1a1a', 'letter-spacing:2.4px;' + NOWRAP)
      + R(62, 640, 360, 1, '#1a1a1a') + R(428, 639, 38, 3, '#1a1a1a')
      + T('email', 62, 694, I(400, 16, 19), '#1a1a1a', 'letter-spacing:.64px;' + NOWRAP) + T('website', 62, 720, I(400, 16, 19), '#1a1a1a', 'letter-spacing:.64px;' + NOWRAP)
      + QR(398, 672, 68, 68),
    bc1: () => IMG('assets/cards/slices/bc1-spheres.jpg', 554, 26, 238, 446)
      + X('TURNING CONVERSATIONS INTO DECISIONS', 40, 42, I(400, 14, 17), '#5a5a5a', 'letter-spacing:1.68px;' + NOWRAP)
      + T('company', 40, 116, I(600, 24, 29), '#1a1a1a', NOWRAP) + T('slogan', 40, 166, I(400, 18, 22), '#1a1a1a', NOWRAP)
      + T('name', 36, 254, MC(52, 65), '#1a1a1a', 'max-width:500px')
      + R(40, 370, 300, 34, '#121212') + T('title', 50, 376, I(400, 18, 22), '#fff', 'letter-spacing:.72px;text-transform:uppercase;' + NOWRAP),
    bc2: () => R(40, 40, 432, 1, '#777') + T('company', 40, 154, I(600, 26, 31), '#1a1a1a', NOWRAP) + T('slogan', 40, 206, I(400, 20, 24), '#1a1a1a', NOWRAP)
      + R(40, 277, 432, 1, '#777') + T('name', 36, 304, MC(50, 63), '#1a1a1a', 'max-width:460px;' + NOWRAP) + T('title', 40, 376, I(400, 22, 27), '#1a1a1a', NOWRAP)
      + X('TURNING CONVERSATIONS INTO DECISIONS', 40, 434, I(400, 14, 17), '#6a6a6a', 'letter-spacing:1.68px;' + NOWRAP)
      + IMG('assets/cards/slices/bc2-moon.jpg', 512, 56, 240, 336),
    bc4: () => R(40, 40, 712, 1, '#777') + T('name', 38, 80, MC(52, 65), '#1a1a1a', NOWRAP) + T('title', 40, 160, I(400, 20, 24), '#1a1a1a', NOWRAP) + T('company', 40, 192, I(400, 20, 24), '#1a1a1a', NOWRAP)
      + R(40, 254, 712, 1, '#777') + X('SLOGAN', 40, 310, I(400, 12, 15), '#1a1a1a', 'letter-spacing:2.4px') + T('slogan', 40, 348, I(400, 22, 27), '#1a1a1a', NOWRAP)
      + X('TURNING<br>CONVERSATIONS<br>INTO DECISIONS', 440, 290, I(600, 30, 35), '#1a1a1a', NOWRAP)
      + R(40, 436, 600, 1, '#777') + X('IDEAS&nbsp;&nbsp;&nbsp;PEOPLE&nbsp;&nbsp;&nbsp;PROGRESS', 40, 480, I(400, 12, 15), '#1a1a1a', 'letter-spacing:2.4px;' + NOWRAP)
      + QR(688, 448, 56, 56),
    bc9: () => T('name', 40, 56, MC(52, 65), '#fff', NOWRAP) + T('title', 40, 140, I(400, 20, 24), '#fff', NOWRAP) + T('company', 40, 176, I(400, 20, 24), '#fff', NOWRAP)
      + R(40, 238, 712, 1, '#fff') + X('TURNING<br>CONVERSATIONS<br>INTO DECISIONS', 40, 292, MC(40, 46), '#fff', NOWRAP) + R(40, 478, 712, 1, '#fff'),
    text: () => `<div class="fst" style="left:58px;top:48px;width:422px">`
      + F('company', A(700, 24, 28), INK) + '<i style="height:68px"></i>' + F('name', A(700, 96, 111), INK) + '<i style="height:24px"></i>'
      + F('title', A(700, 36, 42), INK) + '<i style="height:12px"></i>' + F('company', A(400, 28, 33), INK) + '<i style="height:36px"></i>' + F('slogan', A(400, 30, 35), INK) + '</div>'
      + R(58, 600, 422, 2, INK) + X('Scan to<br>connect', 58, 652, A(700, 26, 31), INK) + QR(352, 619, 128, 105),
    badge: () => T('company', 48, 48, A(700, 26, 32), '#fff', NOWRAP) + T('website', 260, 50, A(400, 20, 28), '#fff', 'width:220px;text-align:right;' + NOWRAP)
      + IMG('assets/cards/slices/badge-wave.jpg', 48, 96, 432, 120) + R(48, 232, 432, 1, '#fff')
      + `<div class="fst" style="left:48px;top:249px;width:464px;gap:8px">` + F('name', A(700, 64, 74), '#fff') + F('title', A(700, 34, 40), '#fff') + F('company', A(400, 28, 34), '#fff') + F('slogan', A(400, 28, 38), '#fff') + '</div>'
      + R(48, 591, 432, 1, '#fff') + X('LET’S<br>CONNECT.', 48, 625, A(700, 24, 30), '#fff') + X('SCAN TO CONNECT', 48, 701, A(400, 20, 26), '#fff', NOWRAP)
      + R(338, 602, 148, 148, 'var(--paper)') + QR(344, 608, 136, 112, true), // Figma Badge: QR plate 148 white backing (黑底需白衬)
    avatar: () => T('company', 48, 48, A(700, 24, 28), INK, NOWRAP)
      + `<div class="fst" style="left:48px;top:104px;width:432px;gap:28px">`
      + `<div style="display:flex;align-items:center;gap:24px;min-height:191px"><img src="${PERSONA}" alt="" draggable="false" style="width:120px;height:120px;border-radius:50%;object-fit:cover;flex:none">`
      + `<div style="display:flex;flex-direction:column;gap:8px;width:288px">` + F('name', A(700, 60, 75), INK) + F('company', A(400, 28, 33), INK) + '</div></div>'
      + F('title', A(700, 40, 47), INK) + F('slogan', A(400, 30, 35), INK) + '</div>'
      + R(48, 594, 432, 2, INK) + X('Scan to connect', 48, 670, A(700, 24, 28), INK, NOWRAP) + QR(352, 620, 128, 105),
    portrait: () => IMG(PERSONA, 48, 48, 432, 432, 'object-fit:cover')
      + `<div class="fst" style="left:48px;top:496px;width:280px;gap:4px">` + F('name', A(700, 58, 70), INK) + F('title', A(700, 30, 30), INK, 'letter-spacing:-.6px') + '</div>'
      + QR(352, 519, 128, 105)
      + `<div class="fst" style="left:48px;top:686px;width:432px;gap:8px">` + F('company', A(400, 26, 31), INK) + F('slogan', A(400, 26, 31), INK) + '</div>',
    monogram: () => T('initial', 48, 48, MC(240, 240), '#ccc')
      + `<div class="fst" style="left:48px;bottom:48px;width:285px;gap:12px">` + F('name', MC(44, 52), INK)
      + `<div style="display:flex;flex-direction:column;gap:8px">` + F('title', I(400, 22, 28), '#666') + F('company', I(500, 18, 24), '#666', 'letter-spacing:.72px') + '</div></div>'
      + QR(352, 616, 128, 128),
    grid: () => R(264, 48, 1, 696, INK) + R(48, 396, 432, 1, INK)
      + `<div class="fst" style="left:48px;top:48px;width:192px">` + F('name', MC(44, 52), INK) + '</div>'
      + `<div class="fst" style="left:288px;top:48px;width:192px;gap:8px">` + F('company', I(500, 22, 28), INK, 'letter-spacing:.88px') + F('title', I(400, 18, 24), '#666') + '</div>'
      + `<div class="fst" style="left:48px;top:420px;width:192px">` + F('slogan', I(300, 22, 28), '#666') + '</div>'
      + QR(320, 584, 160, 160),
  };
  const FACE_BG = { 'logo-signature': 'var(--paper)', 'logo-company': 'var(--paper)', 'logo-mark': 'var(--paper)', bc1: 'var(--paper-2)', bc2: 'var(--paper-2)', bc4: 'var(--paper-2)', bc9: '#1a1a1a', text: 'var(--paper)', badge: '#010102', avatar: 'var(--paper)', portrait: 'var(--paper)', monogram: 'var(--paper)', grid: 'var(--paper)' };

  /* ═════════════ Verso device simulator + Ink flip (spec §10 / §10.3 / §11.3) ═════════════
     The e-ink screen never animates smoothly: every change is a sequence of discrete frames
     (invert flashes, white frame, band-by-band print, checkerboard flip, partial-refresh rings). */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rectPath = (rs) => rs.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join('');
  const OPENS_DEV = { bio: 'Bio page', contact: 'Contact', custom: 'Custom link' };
  const devOpens = () => ({ short: OPENS_DEV[S.opens], dest: `${OPENS_DEV[S.opens]} · ${OPENS[S.opens].link.replace(/^https:\/\//, '')}` });

  const Device = {
    state: 'card', face: 'portrait', busy: false, token: 0, qrTimer: null, dotTimer: null, chain: Promise.resolve(),
    init() {
      const e = $('#eink'); this.el = { eink: e, cur: $('.eink__cur', e), ghost: $('.eink__ghost', e), next: $('.eink__next', e), fx: $('.eink__fx', e) };
      this.el.cur.replaceChildren(this.node('card'));
    },
    node(state) {
      const d = document.createElement('div'); d.className = 'dv'; const o = devOpens();
      if (state === 'card') {
        const f = document.createElement('div'); f.className = 'c-card-face'; f.dataset.face = this.face; f.appendChild(faceLayer(this.face)); d.appendChild(f);
      } else if (state === 'qr') {
        d.innerHTML = `<div class="dv__t dv-qr__name">${esc(Edit.m.fields.name || 'Sarah Mitchell')}</div><div class="dv-qr__code">${qrSvg(350, 7)}</div>
          <div class="dv__t dv-qr__cta">Scan to save my card</div>
          <div class="dv-qr__hint"><svg viewBox="0 0 24 24"><use href="#nfc.arcs"/></svg><span data-dev-opens="short">or tap your phone here · Opens ${esc(o.short)}</span></div>`;
      } else if (state === 'nfc') {
        d.innerHTML = `<i class="dv-nfc__ring r240"></i><i class="dv-nfc__ring r180"></i><i class="dv-nfc__ring r120"></i>
          <svg class="dv-nfc__mark" viewBox="0 0 24 24"><use href="#nfc.arcs"/></svg>
          <div class="dv__t dv-nfc__title">Opened on their phone</div><div class="dv__t dv-nfc__dest" data-dev-opens="dest">${esc(o.dest)}</div>`;
      } else if (state === 'upd') {
        d.classList.add('dv--dark');
        d.innerHTML = '<div class="dv__t dv-upd__label">Updating…</div><div class="dv-upd__dots"><i class="d0"></i><i class="d1"></i><i class="d2"></i></div>';
      }
      return d;
    },
    async flash(path, ms, white) {
      const fx = this.el.fx; fx.classList.toggle('is-white', !!white);
      fx.style.clipPath = path ? `path('${path}')` : 'none'; fx.style.display = 'block';
      await wait(ms); fx.style.display = 'none';
    },
    async ghostOld(ms = 500) { // previous image lingers at 5%, then clears in one step
      const g = this.el.ghost; g.replaceChildren(...Array.from(this.el.cur.childNodes).map((n) => n.cloneNode(true)));
      g.style.display = 'block'; const t = this.token; await wait(ms); if (t === this.token) { g.style.display = 'none'; g.replaceChildren(); }
    },
    swap(node) { this.el.cur.replaceChildren(node); },
    async full(node) { // invert 120 → white 120 → new image (+5% ghost 500ms)
      await this.flash(null, 120);
      const fx = this.el.fx; fx.classList.add('is-white'); fx.style.clipPath = 'none'; fx.style.display = 'block';
      const ghost = this.ghostOld(); this.swap(node); await wait(120); fx.style.display = 'none'; fx.classList.remove('is-white');
      return ghost;
    },
    async print(node) { // new card printed top→bottom in 8 bands, then the stamp (full invert → white)
      if (isRM()) return this.full(node);
      const next = this.el.next; next.replaceChildren(node); next.style.display = 'block';
      const ghost = this.el.ghost; ghost.replaceChildren(...Array.from(this.el.cur.childNodes).map((n) => n.cloneNode(true))); ghost.style.display = 'block';
      const bh = 99;
      for (let k = 0; k < 8; k++) {
        next.style.clipPath = `path('${rectPath([[0, 0, 528, (k + 1) * bh]])}')`;
        await this.flash(rectPath([[0, k * bh, 528, bh]]), 60);
        await this.flash(rectPath([[0, (k + 1) * bh - 8, 528, 8]]), 50); // 8pt inverted edge at the frontier
      }
      this.swap(node); next.style.display = 'none'; next.style.clipPath = ''; next.replaceChildren(); ghost.style.display = 'none'; ghost.replaceChildren();
      await wait(120);
      await this.flash(null, 120); // the stamp
      await this.flash(null, 120, true);
    },
    async checker(node) { // QR flips in as a checkerboard, 6 waves × 40ms, then text settles with a partial refresh
      if (isRM()) return this.full(node);
      const next = this.el.next; next.replaceChildren(node); next.style.display = 'block';
      const cells = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) cells.push([c * 88, r * 88, 88, 88, ((c + r) % 2) * 3 + ((c + 2 * r) % 3)]);
      for (let w = 0; w < 6; w++) {
        next.style.clipPath = `path('${rectPath(cells.filter((x) => x[4] <= w))}')`;
        await this.flash(rectPath(cells.filter((x) => x[4] === w)), 40);
      }
      this.swap(node); next.style.display = 'none'; next.style.clipPath = ''; next.replaceChildren();
      await this.flash(rectPath([[0, 40, 528, 52], [0, 560, 528, 180]]), 60);
    },
    async ripple(node) { // 3 partial-refresh rings from the NFC coil, 60ms each, 200ms apart
      if (isRM()) return this.full(node);
      for (const r of [120, 180, 240]) {
        const ring = document.createElement('i'); ring.className = 'ink-ring';
        Object.assign(ring.style, { left: `${264 - r - 14}px`, top: `${320 - r - 14}px`, width: `${2 * r + 28}px`, height: `${2 * r + 28}px` });
        this.el.eink.insertBefore(ring, this.el.fx); await wait(60); ring.remove(); await wait(140);
      }
      this.swap(node);
      await this.flash(rectPath([[24, 80, 480, 480], [0, 590, 528, 100]]), 60);
    },
    run(state, how) { // serialise screen ops
      const t = this.token;
      this.chain = this.chain.then(async () => {
        if (t !== this.token) return;
        this.busy = true; this.state = state;
        clearInterval(this.dotTimer);
        await this[how](this.node(state));
        if (state === 'upd') this.spinDots();
        this.busy = false;
      });
      return this.chain;
    },
    spinDots() { // discrete steps, 400ms — a moving indicator, never smooth
      let i = 0; clearInterval(this.dotTimer);
      this.dotTimer = setInterval(() => { const dots = $$('.dv-upd__dots i', this.el.cur); if (!dots.length) return clearInterval(this.dotTimer); i = (i + 1) % 3; dots.forEach((d, k) => { d.className = 'd' + ((k - i + 3) % 3); }); }, 400);
    },
    key() {
      if (this.busy || this.state === 'upd' || this.state === 'nfc') return;
      clearTimeout(this.qrTimer);
      if (this.state === 'card') { this.run('qr', 'checker'); this.qrTimer = setTimeout(() => { if (this.state === 'qr' && !this.busy) this.run('card', 'full'); }, 30000); } else this.run('card', 'full');
    },
    nfc() {
      if (this.busy || this.state === 'upd' || this.state === 'nfc') return Promise.resolve();
      const prev = this.state; const t = this.token;
      this.run('nfc', 'ripple');
      return this.chain.then(() => wait(2000)).then(() => { if (t === this.token && this.state === 'nfc') return this.run(prev, 'full'); });
    },
    startUpdate() { clearTimeout(this.qrTimer); return this.run('upd', 'full'); },
    finishUpdate(ok, face) { if (ok) { this.face = face; return this.run('card', 'print'); } return this.run('card', 'full'); },
    sync() { // Opens changed on the phone → QR / NFC copy follows with a partial refresh
      if (!this.el || this.busy) return; const o = devOpens();
      $$('[data-dev-opens]', this.el.cur).forEach((el) => {
        const v = el.dataset.devOpens === 'short' ? `or tap your phone here · Opens ${o.short}` : o.dest;
        if (el.textContent !== v) { el.textContent = v; this.flash(rectPath(el.dataset.devOpens === 'short' ? [[0, 690, 528, 48]] : [[0, 640, 528, 46]]), 60); }
      });
    },
    reset() {
      this.token += 1; clearTimeout(this.qrTimer); clearInterval(this.dotTimer); this.busy = false; this.chain = Promise.resolve();
      this.state = 'card'; this.face = 'portrait'; this.el.fx.style.display = 'none'; this.el.ghost.style.display = 'none'; this.el.next.style.display = 'none';
      this.swap(this.node('card'));
    },
  };
  window.VersoDevice = Device;

  /* the phone hero rehearses the same Ink flip rhythm (its card stays white) */
  async function heroInk(sec) {
    const scr = $('.c-device-hero__screen', sec); if (!scr || isRM()) return;
    let fx = $('.hero-fx', scr); if (!fx) { fx = document.createElement('div'); fx.className = 'hero-fx'; scr.appendChild(fx); }
    const W = scr.clientWidth, H = scr.clientHeight, bh = H / 8;
    const flash = async (path, ms, white) => { fx.classList.toggle('is-white', !!white); fx.style.clipPath = path ? `path('${path}')` : 'none'; fx.style.display = 'block'; await wait(ms); fx.style.display = 'none'; };
    for (let k = 0; k < 8; k++) { await flash(rectPath([[0, Math.round(k * bh), W, Math.ceil(bh)]]), 60); await wait(50); }
    await wait(120); await flash(null, 120); await flash(null, 120, true);
  }

  /* ───────── shared-element flyer (§11.2) ───────── */
  function rel(el) { const a = el.getBoundingClientRect(), p = phone.getBoundingClientRect(); return { x: (a.left - p.left) / SCALE, y: (a.top - p.top) / SCALE, w: a.width / SCALE, h: a.height / SCALE }; }
  function fly(src, r1, r2, dur, ease, fade) {
    const f = document.createElement('div'); f.className = 'flyer eink';
    Object.assign(f.style, { width: r1.w + 'px', height: r1.h + 'px', borderRadius: '2px' });
    const face = document.createElement('div'); face.className = 'c-card-face'; face.style.setProperty('--s', r1.w / 528); face.appendChild(faceLayer(src)); f.appendChild(face);
    phone.appendChild(f);
    const k = r2.w / r1.w;
    return run(f, [{ transform: `translate(${r1.x}px, ${r1.y}px)`, opacity: 1 }, { transform: `translate(${r2.x}px, ${r2.y}px) scale(${k})`, opacity: fade ? 0 : 1 }], dur, ease).then((a) => { a && a.cancel(); f.remove(); });
  }

  /* ───────── skeleton loading (§11.2): skeleton only if the wait passes 1s ───────── */
  function inkLoad(ms) { // §12.5 system wait > 1s: scrim + white card + ink spinner
    const el = $('#loader'); el.classList.add('is-on'); lock(true);
    return new Promise((res) => later(() => { el.classList.remove('is-on'); lock(false); res(); }, ms));
  }
  function simulateLoad(box, total) {
    if (!box) return; box.classList.add('is-loading'); box.classList.remove('is-skel');
    const t1 = setTimeout(() => box.classList.add('is-skel'), 1000);
    later(() => {
      clearTimeout(t1); box.classList.remove('is-loading', 'is-skel');
      $$(':scope > [data-load]', box).forEach((el) => run(el, [{ opacity: 0 }, { opacity: 1 }], isRM() ? 0 : 200, 'linear').then((a) => a && a.cancel()));
    }, total);
  }

  /* ───────── demos (§10.2) — any user touch stops the script ───────── */
  const Demo = {
    token: 0, running: false,
    cap(t) { $('#demoCap').textContent = t || ''; },
    stop() { if (!this.running) return; this.running = false; this.token += 1; this.cap('Demo stopped · your turn'); $$('[data-demo]').forEach((b) => b.setAttribute('aria-pressed', 'false')); },
    async tap(el, inRig) {
      if (!el) return; const host = inRig ? $('#scaler') : phone; const a = el.getBoundingClientRect(), p = host.getBoundingClientRect();
      const dot = document.createElement('i'); dot.className = 'touch-dot';
      dot.style.left = ((a.left + a.width / 2 - p.left) / SCALE) + 'px'; dot.style.top = ((a.top + a.height / 2 - p.top) / SCALE) + 'px';
      host.appendChild(dot); await wait(260); dot.remove();
    },
    async play(n) {
      this.stop(); const t = ++this.token; this.running = true;
      $$(`[data-demo]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.demo === String(n))));
      const ok = () => t === this.token;
      const step = async (cap, fn, ms) => { if (!ok()) throw 0; this.cap(cap); if (fn) await fn(); await wait(ms); if (!ok()) throw 0; };
      const tapPhone = async (sel) => { const el = $$(sel, phone).find((x) => x.offsetParent); await this.tap(el); el && el.click(); };
      try {
        reset(true);
        if (n === 1) {
          await step('Demo 1 · Hand over the card — start on Contact Card', () => { S.pending = false; jump('01'); }, 1200);
          await step('Phone · Share card: the QR here is the same link as on Verso', () => tapPhone('.screen[data-id="01"] [data-go="02"]'), 1800);
          await step('Verso · side key → QR flips in as a checkerboard', async () => { await this.tap($('.verso__key'), true); Device.key(); }, 1800);
          await step('Their phone taps Verso → partial-refresh rings, link opens', async () => { await this.tap($('.demo-row [data-dev="nfc"]'), true); Device.nfc(); }, 900);
          await step('Their phone · your Bio Page (loads, then fades in)', () => { push('08'); }, 2400);
          await step('Both return to rest — Verso does one clean full refresh', () => { jump('01'); }, 1600);
        } else {
          await step('Demo 2 · Update the card — start on Contact Card', () => { S.pending = false; jump('01'); }, 1200);
          await step('Phone · Edit card', () => tapPhone('.screen[data-id="01"] [data-go="03"]'), 1400);
          await step('Swipe to the Badge template — the machine stays, only the face moves', () => Edit.go(TEMPLATES.findIndex((x) => x.id === 'badge') + Edit.m.photos, 0), 1600);
          await step('Back — the card flies home into the hero', () => tapPhone('.screen[data-id="03"] .c-nav__back'), 1600);
          await step('Update on Verso — optimistic: Updating… at once, Verso inverts', () => tapPhone('.screen[data-id="01"] [data-act="update"]'), 2600);
          await step('Ink flip — the new card prints top to bottom, then the stamp', null, 2000);
        }
        this.cap('Demo finished · try it yourself');
      } catch (e) { /* stopped */ }
      if (t === this.token) { this.running = false; $$('[data-demo]').forEach((b) => b.setAttribute('aria-pressed', 'false')); }
    },
  };
  document.addEventListener('pointerdown', (e) => {
    if (!Demo.running || !e.isTrusted) return;
    if (e.target.closest('[data-demo]')) return;
    Demo.stop();
  }, true);
  document.addEventListener('click', (e) => {
    const d = e.target.closest('[data-demo]'); if (d) { Demo.play(+d.dataset.demo); return; }
    const k = e.target.closest('[data-dev]'); if (!k) return;
    if (k.dataset.dev === 'key') Device.key(); else Device.nfc();
  });

  /* ───────── boot ───────── */
  if (params.get('demo') === '1') root.classList.add('is-demo');
  if (params.get('rm') === '1') store.set('rm', '1');
  buildPlaceholders();
  indexFrames();
  renderQR(document); renderFaces(document);
  Edit.build(); buildPicker(); syncWallet(); Device.init(); loadSamples();
  $('.bio').dataset.load = '1'; $('.logo-sheet__list').dataset.load = '1';
  buildTour(); syncVariant();
  window.addEventListener('resize', fit); fit();
  const start = decodeURIComponent(location.hash.slice(1));
  jump(FRAME[start] ? start : S.variant);
  reveal(top());
  window.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (FRAME[id] && id !== (S.sheet || (current() && current().state))) jump(id); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);

  window.VersoProto = { Photo, faceLayer, push, pop, jump, setState, setCardFace, presentSheet, dismissSheet, state: S, edit: Edit, frames: FRAME };
})();
