#!/usr/bin/env python3
"""静态站构建：src/<lang>/*.html 片段 + 统一布局 → 站根 HTML。无依赖。
中文片段在 src/（站根），英文在 src/en/（→ en/），德文在 src/de/（→ de/）。
片段头部用注释声明：<!-- title: … --> <!-- desc: … --> <!-- nav: home|work --> <!-- noindex: yes|no -->
运行：python3 build.py"""
import re, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
EMAIL = "yuqiancheng818@gmail.com"
SITE = "https://cyu0698-star.github.io/"
NOINDEX_DEFAULT = True   # 她过目拍板前不让搜索引擎收录；改 False 后重跑

LANGS = {
    "zh": dict(prefix="", html="zh-CN", name="中文",
               nav=("首页", "作品", "关于", "联系"), foot=("导航", "作品", "联系"),
               works=("DeepChat BI · Agent SaaS", "帮你理 · AI 整理", "I Love Financial Forms", "Verso 名片 · iOS"),
               cities="深圳 · 广州 · 杭州 · 上海 · 北京 均可", role="AI 产品设计师", tail="© 2026 · 等你来…"),
    "en": dict(prefix="en/", html="en", name="EN",
               nav=("Home", "Work", "About", "Contact"), foot=("Navigation", "Work", "Contact"),
               works=("DeepChat BI · Agent SaaS", "Help-You-Organize · AI organizing", "I Love Financial Forms", "Verso card · iOS"),
               cities="Open to Shenzhen · Guangzhou · Hangzhou · Shanghai · Beijing", role="AI Product Designer", tail="© 2026 · see you soon…"),
    "de": dict(prefix="de/", html="de", name="DE",
               nav=("Start", "Arbeiten", "Über mich", "Kontakt"), foot=("Navigation", "Arbeiten", "Kontakt"),
               works=("DeepChat BI · Agent-SaaS", "Help-You-Organize · KI-Ordnung", "I Love Financial Forms", "Verso-Karte · iOS"),
               cities="Offen für Shenzhen · Guangzhou · Hangzhou · Shanghai · Peking", role="AI-Produktdesignerin", tail="© 2026 · bis bald…"),
}
# 页面键 → （输出相对路径，片段相对路径）；各语言相同
PAGES = {
    "home": ("index.html", "index.html"),
    "deepchat": ("work/deepchat-bi/index.html", "work/deepchat-bi.html"),
    "helpyou": ("work/helpyou/index.html", "work/helpyou.html"),
    "ff": ("work/financial-forms/index.html", "work/financial-forms.html"),
    "verso": ("work/verso/index.html", "work/verso.html"),
}

# 布局级样式补丁：英 / 德文比中文长，暴露了 site.css 的两处溢出（assets/ 暂不改，确认后可整段迁入 site.css）
# ① 手机端导航：语言切换被挤出屏幕（EN/DE 点不到）→ 两行：品牌 + 语言一行，四个导航链接一行
# ② 案例页栅格列默认 min-width:auto，表格 / 长单词把整页撑宽 → 列宽归零，表格在 .table-wrap 内横滑
OVERRIDE_CSS = """<style>
@media (max-width: 767px) {
  .nav__in { flex-wrap: wrap; column-gap: 16px; row-gap: 4px; }
  .nav__brand, .nav__lang { white-space: nowrap; }
  .nav__links { order: 3; width: 100%; flex-wrap: wrap; column-gap: 12px; row-gap: 4px; }
  .nav__links a { letter-spacing: .1em; white-space: nowrap; }
}
.case-content { min-width: 0; }
</style>"""

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
    n1, n2, n3, n4 = L["nav"]; f1, f2, f3 = L["foot"]; w1, w2, w3, w4 = L["works"]
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
<link rel="stylesheet" href="{root}assets/css/tokens.css">
<link rel="stylesheet" href="{root}assets/css/site.css">
{OVERRIDE_CSS}
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
    <div class="footer__col"><h4>{f1}</h4><ul><li><a href="{home}">{n1}</a></li><li><a href="{home}#works">{n2}</a></li><li><a href="{home}#about">{n3}</a></li><li><a href="{home}#contact">{n4}</a></li></ul></div>
    <div class="footer__col"><h4>{f2}</h4><ul><li><a href="{home}work/deepchat-bi/">{w1}</a></li><li><a href="{home}work/helpyou/">{w2}</a></li><li><a href="{home}work/financial-forms/">{w3}</a></li><li><a href="{home}work/verso/">{w4}</a></li></ul></div>
    <div class="footer__col footer__col--wide"><h4>{f3}</h4><ul><li><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><span class="muted small">{L['cities']}</span></li></ul></div>
  </div>
  <div class="footer__name"><h2>程雨芊</h2><div class="row"><span>{L['role']}</span><span>{L['tail']}</span></div></div>
</div></footer>
<script src="{root}assets/js/site.js"></script>
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
