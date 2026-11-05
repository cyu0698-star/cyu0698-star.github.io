# 程雨芊 · 作品集（GitHub Pages 静态站）

- 样式令牌：`design-tokens.json`（机器可读）+ `设计令牌_旧站实测.md`（人读）→ `assets/css/tokens.css`；组件在 `assets/css/site.css`。
- 页面内容在 `src/`（片段），布局在 `build.py`。改内容 → `python3 build.py` → 提交。
- 字体：`assets/fonts/` 只有 Verso 案例页正文标题用的 Marcellus（SIL OFL 1.1，许可证 `Marcellus-OFL.txt` 同目录），自托管，不请求 Google Fonts。
- `参考/`：外部网站的设计规律（Flowtica Verso 页），Verso 案例页风格层（`.theme-verso`）的依据，随站公开。
- 图片：`assets/img/`，Figma 画板导出（节点对照表 `assets/img/figma-node-map.json`），统一 WebP；设计稿帧 2x。
- 搜索引擎：`build.py` 里 `NOINDEX_DEFAULT = True`（过目拍板前不收录），上线定稿后改 False 重跑。
- 本地预览：`python3 -m http.server 8080` 后开 http://localhost:8080/
