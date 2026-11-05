# Flowtica Verso 官网 · 设计规律（作品集 Verso 案例模板的风格参考）

> 来源：https://www.flowtica.ai/pages/flowtica-verso ，2026-11-05 用 `extract-design-system` skill 实测（1440×900 + 375×812，整页滚动动效探针，CSS / JS 静态统计）。
> 机器可读版：同目录 `flowtica-verso-design-system.json`；原始测量与自动归纳：`工作流脚本/skills/_runs/flowtica-verso/`。
> 读法：【事实】= 实测或源码直接读到；【推断】= 从多处证据归纳的规律。「出处」是类名 / CSS 文件 / 页面元素，可回查。

## 一页结论

**一句话**：Verso 页是「暖调中性色 + 衬线大标题 + 细体正文 + 满屏吸顶叙事」的产品页。品牌规律几乎都写在 Flowtica 自建的 `verso-*` 区块和 `--verso-*` 变量里；Shopify Dawn 主题只提供外壳（根字号、购物车、语言、页脚组件）。【事实】技术栈：Shopify（主题名「Download App 页面重构」，基于 Dawn 15.6.6）+ Tailwind v4.2.1 工具类 + Swiper + Animate.css。

### 值得学的 6 条品牌规律

| # | 规律 | 证据（出处） | 判据：以后怎么用 / 怎么判断 |
|---|---|---|---|
| 1 | **衬线做标题，细无衬线做正文**：标题全部 Marcellus 400（单字重，靠字号分层）；正文 Inter **300**（细体占全页字数 62%），UI 文字 Inter 400，只有小标签用 600 | 字体实测 `Marcellus 400` + `Inter 300/400/500/600`；主题设置 `--font-heading-family: Marcellus` `--font-body-family: Inter` 【事实】 | 标题只要一个字重，层级全靠字号；长段阅读用细体 + 行高 1.5–1.7。判断：同一屏出现第三种标题字重 = 跑偏 |
| 2 | **按 1440 设计稿等比缩放字号**：`vw = 设计值 ÷ 1440`（64→`4.4444vw`、28→`1.9444vw`、20→`1.3889vw`），再用 `clamp(手机下限, vw, 设计值)` 封顶；卡片里的字用**容器单位** `calc(100cqw / 1250 × 设计值)` 跟卡片一起缩；手机端用 `min(100vw, 398px) × 系数`（398 宽手机稿） | `.verso-recording-summary__title` `clamp(36px, 4.4444vw, 64px)`；`.verso-go-anywhere__scene-title` `clamp(18px, 1.9444vw, 28px)`；`verso-capabilities-v2` 卡片 `calc(calc(100cqw / 1250) * 32)`；两档实测 64→30.8、28→18 【事实】 | 量到桌面稿多少 px，就写 `clamp(手机值, 设计值/14.4 vw, 设计值)`；卡片内部排版用容器单位，卡片缩放时不用再调字。判断：1440 下实测值 ≠ 设计稿值 = 公式写错 |
| 3 | **暖调中性色 + 深浅区块交替，只留一个彩色强调**：浅区 `#f7f1e9 / #fcfaf8 / #efeae1 / #e3dcd0`，深区 `#342f2c / #262320 / #423c39 / #373230`（暖棕黑，不用纯黑）；浅底深字 `#1a1a1a → #303030/#524e49 → #736e68` 三档，深底浅字 `#ffffff/#f3f2f1 → #c0c0c0 → #85817c`；彩色只有靛紫 `#5c54b7`（选中描边 / 强调词）和深靛 `#403a83`（轮播圆点） | 实测底色面积：`#342f2c` 31%、`#e3dcd0` 9%、`#f7f1e9` 8%…；文字色按字数；`--verso-page-outer-bg: #d8d2c6`（页面像一张纸放在米灰底上，`--verso-page-canvas-shadow: 0 0 42px rgba(17,17,17,.18)`）【事实】 | 大面积不用 #000 / #fff 纯色，用带一点棕的黑、带一点黄的白；一页只给一个彩色强调，且只用在「被选中 / 要被注意」的地方。判断：彩色出现在大面积底色上 = 违反 |
| 4 | **卡片 = 底色差 + 大圆角，不靠描边和投影**：卡片圆角 23–24px（`--verso-card-radius: 24px`，手机 15px），浅卡 `#f4f0ea / #f4ebe0` 放浅底、深卡 `#262320 / #373230` 放深底；全页几乎没有阴影，唯一的卡片阴影是**暖色**的 `0 12px 20px rgba(89,69,48,.1)` | 实测圆角 23×16、24×12；卡片描边 0；`.verso-reserve__card` 阴影色是棕 `rgb(89,69,48)` 不是黑 【事实】 | 分层先用底色深浅，再用圆角；真要投影就用品牌色调的低透明阴影。判断：同一区块里卡片既有描边又有投影 = 太重 |
| 5 | **固定的版面节奏变量**：标题→副标 14px、副标→内容 36px、区块顶 36px、卡片内边距 14px、区块左右边距 `clamp(20px, 7.3vw, 29px)`；每个区块自定内容宽（1160–1304px），不用全站统一容器 | `--verso-title-subtitle-space: 14px`、`--verso-subtitle-content-space: 36px`、`--verso-section-top-space: 36px`、`--verso-card-padding: 14px`、`--verso-section-inline-space`（`verso-base.css`）【事实】；「每区块自定宽度」【推断】（6 个不同 max-width） | 文字组内部用「小间距 14 / 大间距 36」两档，不要发明第三档；区块宽度按内容定（文字区窄、图片区宽）。判断：标题和副标之间的距离 > 副标和内容之间 = 层级反了 |
| 6 | **动效：方向性入场 + 吸顶叙事 + 克制 hover**：进入视口时淡入并位移 28px（左栏从左、右栏从右、其余从下），760ms `cubic-bezier(.22,1,.36,1)`，同组每个延迟 75ms；两个满屏 sticky 场景（滚动时画面钉住、内容在里面换），里面的产品图层以 0.37 倍速视差；hover 只改透明度 / 亮度 / 颜色（180–240ms）；有 67 条 `prefers-reduced-motion` 规则 | 动效探针 WAAPI：`versoRevealDirectional 760ms`，关键帧 `translate3d(0,28px,0)` / `(-28px,0,0)` / `(28px,0,0)` → 0，延迟 75/150/225/300/375/450ms；sticky：`.verso-notes-reveal__scene`、`.verso-ask__scene`（900px 高、top 0）；视差 0.37 ×4 层 【事实】 | 入场：位移 < 30px、0.7–0.8s、expo-out 类缓动、同组 75ms 递进；方向跟版面走（左边的从左进）。重点功能用「钉住一屏 + 滚动换内容」讲。必须给减少动效的用户关掉。判断：入场位移 > 40px 或时长 > 1s = 太戏剧 |

### 别学（Shopify / 第三方默认，不是 Flowtica 的设计）

| 东西 | 为什么不学 | 出处 |
|---|---|---|
| 根字号 62.5%（1rem = 10px） | Dawn 主题惯例，换算用，不是设计决定 | `html { font-size: calc(var(--font-body-scale) * 62.5%) }` |
| 标题 `calc(var(--font-heading-scale) * 2rem / 2.4rem)`、断点 750 / 990 | Dawn 基础样式；实测「See Verso in Action」48px 是被更具体的规则覆盖后的结果 | `theme.css` 里的 `h2, .h2` |
| `scroll-trigger animate--slide-in`：slideIn 600ms `cubic-bezier(0,0,.3,1)` 上移 2rem | Dawn 自带入场（只有「See Verso in Action」区块还在用），Verso 自己的区块都换成了 `versoRevealDirectional` | `.scribe-creator-reviews__heading-wrap` |
| 购物车 / 语言选择 / 搜索 / 超级菜单 / 页脚的样式 | Dawn 的 `component-*.css` / `section-*.css`（可能被改过，但不是 Verso 页的设计语言） | `component-cart-drawer.css` 等 20 个文件 |
| 轮播按钮 `duration-300 ease-in-out`、`hover:opacity-80` | Tailwind 默认缓动 `cubic-bezier(.4,0,.2,1)` | `.swiper-button-prev` |
| 部分大标题字距 +1px | 全局 `#MainContent > :where(.shopify-section…) { letter-spacing: 1px !important }` 覆盖了区块自己的 −0.01em，导致同为 64px 的标题字距不一致——是补丁，不是规律 | `verso-base.css` |
| Swiper 默认色 `#007aff`、Animate.css 关键帧、Judge.me / Klaviyo / Smile 插件（右下角浮窗、`smileLiteFadeInOut`） | 第三方库默认 | `swiper-bundle.min.css`、`animate.min.css`、插件脚本 |

## 10 项明细

### 1. 字体 typography

| 档位 | 桌面 | 手机 | 规则（出处） | 行高 / 字距 | 用在哪 |
|---|---|---|---|---|---|
| 区块大标题 | 64 | 30.8–40 | `clamp(36px, 4.4444vw, 64px)` / `40 → 48 @≥576 → 64 @≥1024` / `clamp(48px, 5.4vw, 64px)`（各区块各写一条） | 1.25（个别 0.94–1.56）/ −0.01em | One press… / Notes on its face / Evolve the way |
| 二级标题 | 48 | 28–36 | `36 → 42 @≥768 → 48 @≥1024`（FAQ） | 1.25 / +0.021em | FAQ、See Verso in Action |
| 卡片标题 | 40 / 32 | — / 22.6 | `calc(100cqw / 1250 × 40 / 32)` 容器单位 | 1.25 / −0.01em | 能力卡片 |
| 小标题 | 30 / 28 / 24 | 20 / 18 / 24 | `clamp(20px, 2.232vw, 30px)`、`clamp(18px, 1.9444vw, 28px)`、24 固定 | 1–1.2 / ±0.02em | 预约卡产品名、场景名、规格分组 |
| 正文大 | 20 | 16 | `clamp(16px, 1.3889vw, 20px)`，Inter 300 | 1.7 / −0.01em | 区块描述 |
| 正文 | 16–18 | 16 | 固定，Inter 300 | 1.5 / −0.01~−0.02em | FAQ 答案、规格描述、媒体引语（18） |
| 强调小标题 | 24 | 18 | Inter 600 | 1.29 | 预约阶段标题（强调词用 `#5c54b7`） |
| UI / 导航 | 14–16 | 14 | Inter 400 | 1.43 / −0.01em | 顶部导航、按钮 |
| 卡片内 UI | 11.7 | 9.7 | `calc(100cqw / 1250 × 11.706)` | 1.29 | 能力卡片里的会议提醒 |

### 2. 颜色 color

| 角色 | 值 | 说明 |
|---|---|---|
| 页面外底 | `#d8d2c6` | 内容像一张纸放在米灰底上 |
| 浅区底 | `#f7f1e9` `#fcfaf8` `#efeae1` `#e3dcd0` `#edeae6` | 都偏暖（带黄） |
| 深区底 | `#342f2c`（面积最大）`#262320` `#423c39` `#373230` `#1b1311` | 都偏暖（带棕） |
| 浅底文字 | 主 `#1a1a1a`/`#1b1917`/`#171614` → 次 `#303030`/`#524e49` → 弱 `#736e68`（对比 3.7，只够大字） | 三档 |
| 深底文字 | 主 `#ffffff`/`#f3f2f1`/`#f4f0ea` → 次 `#c0c0c0`（页脚链接）→ 弱 `#85817c`（3.4，只够大字） | 三档 |
| 强调 | `#5c54b7`（选中描边、内描边 `inset 0 0 0 1px`、强调词）；`#403a83`（轮播圆点）；棕 `#503629` + 底 `#f5e8e0`（SAVE $100 徽章） | 彩色极少 |
| 描边 | `#a89991`（规格行底线）、`#dad5d1`（搜索框）、`#7f6b5a` 0.5px（FAQ 分隔）、`#e8dfd7`/`#d9d1cc` | 全是暖灰细线 |
| 禁用 | `#dedede`（`aria-disabled`） | |

### 3. 间距 spacing
- 品牌变量：14（标题→副标、卡片内边距）/ 36（副标→内容、区块顶）/ `clamp(20px, 7.3vw, 29px)`（区块左右）。【事实】
- 组件间隙：24（卡片栅格）、12（能力卡）、10（倒计时）、6/24（规格行 行/列）。没有统一的 4 / 8 基准（4 的倍数只占 44%）——数值是按设计稿量的，不是按刻度取的。【推断】
- 内容宽：1248（预约）、1250（能力）、1304（媒体）、1220（人群）、1160（视频）、FAQ 文字列 758。

### 4. 圆角 radius
23–24（大卡片、媒体框，手机 15）· 18（媒体 logo）· 12（搜索框）· 6（标签）· 3→4（问答手机卡，≥768 变 4）· 30 胶囊（徽章）· 50%（圆按钮、标记点）。

### 5. 描边 / 阴影 stroke
描边只做分隔（1px / 0.5px 暖灰），卡片不描边；阴影几乎不用：页面画布 `0 0 42px rgba(17,17,17,.18)`、预约卡 `0 12px 20px rgba(89,69,48,.1)`（暖色阴影）、选中色块 `inset 0 0 0 1px #5c54b7`。

### 6. 布局 layout
- 全宽区块深浅交替；每个区块自带内容宽。
- 预约：两栏 552 / 648，间距 48；能力：不等宽三栏 bento 408 / 503 / 315，间距 12；会议时间线：三栏 344 × 3，间距 24；规格：147px 标签列 + 内容列（行间 6、列间 24）。
- 两个满屏 sticky 场景（`top: 0`、高 = 视口），用来做滚动叙事。
- 图片比例多样：2:3、4:5、1:1、3:2、2:1（产品图按内容定，不统一比例）。

### 7. 响应式 responsive
- Verso 自己的区块用 576 / 768 / 1024 / 1280（+ max 575）；Dawn 外壳用 750 / 990——两套断点并存。
- 手机：网格全部变一栏（规格 2→1、预约 2→1、能力 3→1）；顶部导航可见链接 18 → 6，其余收进菜单按钮；手机字号按 398 宽设计稿 `min(100vw, 398px) × 系数` 等比缩放。【事实】
- 首屏描述带 `verso-hero__desktop-only`，只在桌面显示；手机端应有另一份文案【推断，未逐个核对】。

### 8. 组件 components（品牌组件）
| 组件 | 结构 / 关键令牌 |
|---|---|
| 预约卡 `verso-reserve` | 阶段列表（序号圆点 + 标题 + 说明）+ 倒计时 4 格 + `SAVE $100` 棕色胶囊徽章 + 颜色选择（选中 = 紫色内描边）；卡片 23px 圆角 + 暖色阴影 |
| 能力 bento `verso-capabilities-v2` | 浅卡 `#f4f0ea` / 深卡 `#373230`，23px 圆角，卡内用容器单位排版，白色小胶囊按钮（Prepare brief） |
| 媒体评价轮播 `verso-press` | `#f4ebe0` 卡 23px 圆角、27px 内边距，深色标签 `#696157` 6px 圆角，Swiper speed 500 / 间距 24 |
| 问答提示 `verso-ask` | Marcellus 28px 文字按钮，hover / 选中变色 180ms；配手机截图卡片轮播（滑动 360ms `cubic-bezier(.2,.8,.2,1)`） |
| 规格表 `verso-specs` | 标签 / 值两栏 + 1px `#a89991` 底线，分组标题 Marcellus 24 |
| FAQ `faq-design` | `<details>` 折叠，0.5px 分隔线，图标旋转 220ms `cubic-bezier(.2,0,0,1)` |
| 顶部导航 | 不吸顶；半透明 `rgba(255,255,255,.05)` + `blur(7.5px)` 毛玻璃压在首屏上 |

### 9. 状态 states
hover：透明度 0.8（箭头）、亮度 0.92（首屏按钮）、文字变 `#efeae1`（问答提示）；focus-visible：2px 描边、偏移 3–4px（键盘可达）；禁用：底色 `#dedede`。

### 10. 动效与交互 interaction
| 场景 | 触发 → 变化 | 时长 / 缓动 / 延迟 |
|---|---|---|
| 入场（品牌） | 进入视口 → opacity 0→1，位移 28px→0（方向按版面） | 760ms `cubic-bezier(.22,1,.36,1)`，同组 75ms 递进 |
| 入场（淡入） | 区块标题 opacity 0→1 | 760ms |
| 吸顶叙事 | 滚动 → 画面钉住，图层视差 0.37 倍速 | 跟随滚动 |
| 轮播 | 拖动 / 箭头 → 滑动 | Swiper 500ms、间距 24/36、可抓取光标 |
| hover | 透明度 / 亮度 / 文字色 | 180–240ms ease |
| 折叠 | FAQ 图标旋转 | 220ms `cubic-bezier(.2,0,0,1)` |
| 减少动效 | 系统开启时关掉过渡 | 67 条 `prefers-reduced-motion` 规则 + JS 检测 |
| 进入视口检测 | IntersectionObserver ×11 | `rootMargin: 0px 0px -50px 0px`，threshold .1 / .2 / .5 |

## 局限
- 只测了这一页（单页结论 ≠ Flowtica 全站系统）；登录、购物车、弹层未测。
- hover 来自 CSS 规则匹配，没有真的悬停；入场时长取自 CSS 动画声明（精确），视差系数是滚动采样（近似）。
- 字体 Marcellus 由 Shopify 字体 CDN 提供；作品集若要借用，需要自托管字体文件或换系统衬线，不能依赖 Google Fonts。Marcellus 据我所知是 SIL OFL 开源授权，自托管前再核一次授权页【推断】。
