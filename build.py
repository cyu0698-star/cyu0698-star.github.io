#!/usr/bin/env python3
"""静态站构建：src/<lang>/*.html 片段 + 统一布局 → 站根 HTML。无依赖。
中文片段在 src/（站根），英文在 src/en/（→ en/），德文在 src/de/（→ de/）。
片段头部用注释声明：<!-- title: … --> <!-- desc: … --> <!-- nav: home|work --> <!-- noindex: yes|no -->
运行：python3 build.py"""
import re, pathlib, datetime, hashlib
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
EMAIL = "yuqiancheng818@gmail.com"
SITE = "https://cyu0698-star.github.io/"
NOINDEX_DEFAULT = True   # 她 11-10 定：等所有作品集项目都做完才开搜索引擎收录（届时改 False 并重跑）；在那之前一律保持 True

LANGS = {
    "zh": dict(prefix="", html="zh-CN", name="中文",
               nav=("首页", "作品", "关于", "联系"), foot=("导航", "联系"), mail="电子邮箱",
               fname="程雨芊", role="AI 产品设计师", tail="等你来…"),
    "en": dict(prefix="en/", html="en", name="EN",
               nav=("Home", "Work", "About", "Contact"), foot=("Navigation", "Contact"), mail="Email",
               fname="Yuqian<br>Cheng", role="AI Product Designer", tail="Waiting for you…"),
    "de": dict(prefix="de/", html="de", name="DE",
               nav=("Start", "Arbeiten", "Über mich", "Kontakt"), foot=("Navigation", "Kontakt"), mail="E-Mail",
               fname="Yuqian<br>Cheng", role="AI-Produktdesignerin", tail="Bis bald…"),
}
# 页脚左侧四角星（旧站同款路径，48×48）
STAR = '<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 0L24.8 19.2L48 24L24.8 28.8L24 48L23.2 28.8L0 24L23.2 19.2L24 0Z" fill="currentColor"/></svg>'
# 页面键 → （输出相对路径，片段相对路径）；各语言相同
PAGES = {
    "home": ("index.html", "index.html"),
    "deepchat": ("work/deepchat-bi/index.html", "work/deepchat-bi.html"),
    "helpyou": ("work/helpyou/index.html", "work/helpyou.html"),
    "ff": ("work/financial-forms/index.html", "work/financial-forms.html"),
    "verso": ("work/verso/index.html", "work/verso.html"),
}

def ver(rel):
    """静态资源加内容指纹 ?v=xxxx：CSS / JS 改了，回访者的浏览器不会拿旧缓存配新 HTML"""
    return rel + "?v=" + hashlib.md5((ROOT / rel).read_bytes()).hexdigest()[:8]

def meta(frag, key, default=""):
    m = re.search(r"<!--\s*%s:\s*(.*?)\s*-->" % key, frag)
    return m.group(1).strip() if m else default

def layout(body, *, lang, page, title, desc, root, nav, noindex):
    L = LANGS[lang]
    robots = '<meta name="robots" content="noindex, nofollow">' if noindex else ""
    def active(k): return ' class="is-active"' if nav == k else ""
    rel = PAGES[page][0].replace("index.html", "")
    alts = "\n".join(f'<link rel="alternate" hreflang="{LANGS[l]["html"]}" href="{SITE}{LANGS[l]["prefix"]}{rel}">' for l in LANGS)
    is_active = ' class="is-active"'  # 不在 f-string 表达式里写反斜杠：Python 3.11 及以下会报 SyntaxError
    switch = "<span>｜</span>".join(
        f'<a href="{root}{LANGS[l]["prefix"]}{rel}"{is_active if l == lang else ""}>{LANGS[l]["name"]}</a>' for l in LANGS)
    home = root + L["prefix"]
    n1, n2, n3, n4 = L["nav"]; f1, f2 = L["foot"]
    return f"""<!DOCTYPE html>
<html lang="{L['html']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}
{alts}
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230c0c0c'/%3E%3Ctext x='32' y='42' font-size='30' text-anchor='middle' fill='%23fff' font-family='Inter,system-ui'%3E雨%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="{root}{ver('assets/css/tokens.css')}">
<link rel="stylesheet" href="{root}{ver('assets/css/site.css')}">
</head>
<body>
<nav class="nav" id="nav"><div class="container nav__in">
  <a class="nav__brand" href="{home}">程雨芊</a>
  <div class="nav__links">
    <a href="{home}"{active('home')}>{n1}</a>
    <a href="{home}#works"{active('work')}>{n2}</a>
    <a href="{home}#about">{n3}</a>
    <a href="{home}#contact">{n4}</a>
  </div>
  <div class="nav__lang">{switch}</div>
</div></nav>
<main>
{body}
</main>
<footer class="footer"><div class="container">
  <div class="footer__grid">
    <div class="footer__col footer__star">{STAR}</div>
    <div class="footer__col"><h4>{f1}</h4><ul class="footer__list"><li><a href="{home}">{n1}</a></li><li><a href="{home}#works">{n2}</a></li><li><a href="{home}#about">{n3}</a></li><li><a href="{home}#contact">{n4}</a></li></ul></div>
    <div class="footer__col"><h4>{f2}</h4><ul class="footer__list footer__list--ruled"><li><a href="mailto:{EMAIL}" title="{EMAIL}">{L['mail']}</a></li></ul></div>
  </div>
  <div class="footer__name"><h2>{L['fname']}</h2><div class="row"><span>{L['role']}</span><span>{L['tail']}</span></div></div>
</div></footer>
<script src="{root}{ver('assets/js/site.js')}"></script>
</body>
</html>
"""

def build():
    n = 0
    for lang, L in LANGS.items():
        for page, (out_rel, frag_rel) in PAGES.items():
            frag_path = SRC / L["prefix"] / frag_rel
            if not frag_path.exists():
                print("skip (no fragment):", frag_path.relative_to(ROOT)); continue
            frag = frag_path.read_text(encoding="utf-8")
            out = L["prefix"] + out_rel
            depth = out.count("/")
            root = "../" * depth if depth else "./"
            noindex = meta(frag, "noindex", "yes" if NOINDEX_DEFAULT else "no").lower() == "yes"
            html = layout(frag, lang=lang, page=page, title=meta(frag, "title", "程雨芊 Yuqian Cheng"), desc=meta(frag, "desc", ""),
                          root=root, nav=meta(frag, "nav", "work"), noindex=noindex)
            html = html.replace("{{ROOT}}", root).replace("{{HOME}}", root + L["prefix"])
            p = ROOT / out; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(html, encoding="utf-8"); n += 1
    (ROOT / ".nojekyll").write_text("")
    print(f"built {n} pages · {datetime.datetime.now():%Y-%m-%d %H:%M}")

if __name__ == "__main__":
    build()
