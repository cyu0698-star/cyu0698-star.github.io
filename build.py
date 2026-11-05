#!/usr/bin/env python3
"""静态站构建：src/*.html 片段 + 统一布局 → 站根 HTML。无依赖。
片段头部用注释声明：<!-- title: … --> <!-- desc: … --> <!-- nav: home|work --> <!-- noindex: yes|no -->
运行：python3 build.py   （输出到本目录，assets 原样）"""
import re, os, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
SITE_NAME = "程雨芊 Yuqian Cheng"
EMAIL = "yuqiancheng818@gmail.com"
NOINDEX_DEFAULT = True   # 她过目拍板前不让搜索引擎收录；改 False 后重跑
PAGES = {  # 输出路径 → 片段
    "index.html": "index.html",
    "work/helpyou/index.html": "work/helpyou.html",
    "work/verso/index.html": "work/verso.html",
    "work/deepchat-bi/index.html": "work/deepchat-bi.html",
    "work/financial-forms/index.html": "work/financial-forms.html",
}
def meta(frag, key, default=""):
    m = re.search(r"<!--\s*%s:\s*(.*?)\s*-->" % key, frag)
    return m.group(1).strip() if m else default
def layout(body, *, title, desc, root, nav, noindex):
    robots = '<meta name="robots" content="noindex, nofollow">' if noindex else ""
    def active(k): return ' class="is-active"' if nav == k else ""
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230c0c0c'/%3E%3Ctext x='32' y='42' font-size='30' text-anchor='middle' fill='%23fff' font-family='Inter,system-ui'%3E雨%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="{root}assets/css/tokens.css">
<link rel="stylesheet" href="{root}assets/css/site.css">
</head>
<body>
<nav class="nav" id="nav"><div class="container nav__in">
  <a class="nav__brand" href="{root}">程雨芊</a>
  <div class="nav__links">
    <a href="{root}"{active('home')}>首页</a>
    <a href="{root}#works"{active('work')}>作品</a>
    <a href="{root}#about">关于</a>
    <a href="{root}#contact">联系</a>
  </div>
  <div class="nav__lang"><span title="英文版筹备中" style="color:var(--t20)">EN</span><span>｜</span><a class="is-active" href="{root}">中文</a></div>
</div></nav>
<main>
{body}
</main>
<footer class="footer"><div class="container">
  <div class="footer__grid">
    <div class="footer__col"><h4>导航</h4><ul><li><a href="{root}">首页</a></li><li><a href="{root}#works">作品</a></li><li><a href="{root}#about">关于</a></li><li><a href="{root}#contact">联系</a></li></ul></div>
    <div class="footer__col"><h4>作品</h4><ul><li><a href="{root}work/helpyou/">帮你理 · AI 整理</a></li><li><a href="{root}work/verso/">Verso 名片 · iOS</a></li><li><a href="{root}work/deepchat-bi/">DeepChat BI · Agent SaaS</a></li><li><a href="{root}work/financial-forms/">I Love Financial Forms</a></li></ul></div>
    <div class="footer__col footer__col--wide"><h4>联系</h4><ul><li><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><span class="muted small">深圳 · 广州 · 杭州 · 上海 · 北京 均可</span></li></ul></div>
  </div>
  <div class="footer__name"><h2>程雨芊</h2><div class="row"><span>AI 产品设计师 · UX</span><span>© 2026 · 等你来…</span></div></div>
</div></footer>
<script src="{root}assets/js/site.js"></script>
</body>
</html>
"""
def build():
    n = 0
    for out, frag_name in PAGES.items():
        frag = (SRC / frag_name).read_text(encoding="utf-8")
        depth = out.count("/")
        root = "../" * depth if depth else "./"
        noindex = meta(frag, "noindex", "yes" if NOINDEX_DEFAULT else "no").lower() == "yes"
        html = layout(frag, title=meta(frag, "title", SITE_NAME), desc=meta(frag, "desc", ""), root=root, nav=meta(frag, "nav", "work"), noindex=noindex)
        html = html.replace("{{ROOT}}", root)
        p = ROOT / out; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(html, encoding="utf-8"); n += 1
    (ROOT / ".nojekyll").write_text("")
    print(f"built {n} pages · {datetime.datetime.now():%Y-%m-%d %H:%M}")
if __name__ == "__main__":
    build()
