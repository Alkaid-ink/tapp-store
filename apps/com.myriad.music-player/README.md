# 音乐播放器

控制系统音乐播放，查看歌词与播放列表。

## Changelog

### 1.1.42

**切换语言后播放列表头部的文案不跟随。** `setLabel(...)` / `title` / `aria-label`
那一批写在 `bindControls()` 里，而该函数有 `if (controlsBound) return` 的幂等守卫
（防重复绑事件）只会执行一次。locale 变化走
`onLocaleChange → setLocale + initPage`，`initPage` 里的 `bindControls` 直接返回，
于是这批文案永远停在**首次加载时的语言**。首屏正常，切语言才暴露。

抽成 `applyStaticLabels()` 并交给 `setLocale()` 每次调用——那里本来就在刷新
Fab 标签与空态提示，是这个代码库放 locale 静态文案的地方。

实测（真实 locale 变更链 `setLocale + initPage`，390×844）：

| en-US / ja-JP 下 | 1.1.41 | 1.1.42 |
| --- | --- | --- |
| 外部歌单按钮 | **外部歌单**（中文） | External / 外部歌単 |
| 导入按钮 | **导入**（中文） | Import / 読込 |
| 歌单 ID 占位符 | **网易云歌单 ID 或链接** | Netease playlist ID or link |
| `aria-label` | **外部歌单** | External / 外部歌単 |

**移除未使用的 `ui:notification` 权限。** 它只 gate `ui.showNotification` 与
`dynamicContent.*`，本 tapp 一个都没调用（页内状态条是自绘的 `.status-banner`）。
`network:fetch` **保留**——它同时是外链图片的 CSP 开关
（`cspExfiltration.test.ts`：需要外链图或远程媒体的 Tapp 必须声明），
删掉会让所有封面加载失败。

### 1.1.41

**手机上歌词/列表弹窗直接贴顶。** 手机块本来就写了
`top: max(12%, env(safe-area-inset-top,0) + 40px)`，计算值也确实是 101px，
但渲染出来是 `top=0` 且占满全屏。两层原因叠在一起：

1. `.player-right` 与 `.content-area > .player-right` 各设了一次
   `height: 100%`（桌面双栏需要）。fixed 元素同时拿到 top / bottom / height
   会过约束，结果被拉回视口顶端
2. **媒体查询不增加特异性**：手机块里的 `.player-right`(0,1,0) 压不过外层的
   `.content-area > .player-right`(0,2,0)，所以直接在块内写 `height: auto` 无效，
   必须用同等特异性的选择器覆盖。平板块用的是
   `html.mp-is-mobile .player-right`(0,2,0)，所以平板一直是好的——这也是为什么
   只有手机端出问题

顺带把顶部留白下限从 40px 提到 56px（`env()` 在 tapp 的 iframe 里恒为 0，
真正兜底的是这个像素值）。

实测（iframe 内真实 390×844 视口，同时也复现了 iframe 里 `env()` 为 0 的实际环境）：

| | 1.1.39 | 1.1.41 |
| --- | --- | --- |
| 顶部留白 | **0px / 0%** | **101px / 12.0%** |
| Sheet 高度 | 844（占满） | 743 |

Sheet 变矮后歌词引擎回归正常：容器 679px 被正确测到、行高/总高/可滚动均正确、
30 行只绘制 12 行（屏外剔除仍生效）、无运行时异常。

**清理无词占位死代码。** `buildLyricsEmptyHtml()` 每次空态渲染都构建含内联 SVG
的整块 DOM，随后被 `.lyrics-empty { display:none !important }` 无条件隐藏；
无词态早已改由封面优先布局表达。移除 JS 构建器、`page.html` 里的占位 div、
以及约 60 行永不可见的 CSS（`.lyrics-empty` / `-rich` / `-visual` / `-icon` /
`-title` / `-hint`）。另删掉 `initPage` 里对不存在的 `#page-title` 的赋值。

### 1.1.40

**减弱动效档位一直被忽略。** 宿主的档位词表是 `'exlight' | 'light' | 'standard'`
（`useAnimationLevel.ts`），其中 `exlight` 正是 `prefers-reduced-motion` 的落点
且**不可被用户覆盖**；`animation.shouldAnimate` 返回 `!isExlight(level)`。
而本文件通篇按 `'none'` 判断——宿主从不下发这一档：

- `shouldAnimate()` 里的 `level !== 'none'` 是恒真死条件
- `onLevelChange` 把 `shouldAnimate` 重算成 `level !== 'none'`，`exlight` 得到
  **true**，把初始那次正确的 `false` 覆盖掉
- `isAnimLight()` 不认识 `exlight`，于是走完整 standard 路径

净效果：开了减弱动效的用户，只要档位事件一到，就拿到**最重**的视觉路径
（60fps rAF + Aurora + 涟漪 + 背景漂移）。新增 `isAnimMinimal()` 统一判定，
`'none'` 保留仅为向后兼容。

实测（harness 按真实宿主实现 `shouldAnimate = !isExlight(level)`）：

| | 1.1.39 | 1.1.40 |
| --- | --- | --- |
| exlight 初始 | shouldAnimate=false / fx=false | 同左 ✓ |
| exlight 档位事件后 | **true / true** ✗ | **false / false** ✓ |
| light / standard | — | 正常开启，standard 切行仍为 ~0.8s 弹簧 ✓ |

### 1.1.39

**hero 区（封面+标题）模式切换动效找回。** 真因不在 1.1.37/1.1.38，而在 1.1.36：
那次为规避「列宽过渡中 ~8px 极窄宽 → pre-wrap 歌词炸高 → 滚动锁死」，把
`.content-area` 的 `grid-template-columns / column-gap` 过渡整条删了。hero 的宽度
跟着 grid 列宽走，过渡一删，有词↔无词切换时 hero 就是硬跳。

- 恢复列宽过渡（0.46s），并改为**过渡期间挂起歌词测量**：`lyricMeasureSuspended()`
  跟随 `.content-area` 上真实运行中的过渡对象（比纯计时准），`transitionend`
  再做一次权威重测。窄宽帧根本不会被测到，1.1.36 要防的问题从源头消失
- 实测：过渡对象 `grid-template-columns` / `column-gap` 各 460ms，列宽逐帧插值
  （t=0 → 320/481，t=115 → 478/337，t=230 → 716/104，t=460 → 821/0）；
  过渡期间 `measured=false`（此前会在 94px 处测出 96px 行高），结束后一次性
  测到最终宽度 481px / 行高 58px
- `ensureLyricLayoutReady()` 在挂起期间不再清 `measured`——清了会让 focus 整条
  路径罢工（歌词卡住不动）

**滚动回焦不再闪现。** 去掉「超过 1.5 屏就瞬移」的阈值：线性弹簧的收敛时间与
幅度无关（5000px 与 300px 同样约 1s，只是中途更快），当初的顾虑不成立；而按
屏高设阈值会让移动端/长歌单里常规地翻两屏也落进瞬移分支。现在一律走波浪。

**滚动性能。** 每行都带 `blur(5px)` + `will-change: transform`，长歌单就是上百个
各自要做模糊的合成层，滚动逐帧全量重绘。屏外行改为 `visibility: hidden` 退出绘制
（仍保留布局盒，`measureLyricLayout` 读 `offsetHeight` 不受影响）：
200 行歌单参与绘制的行由 **200 → 27**，视口内 11 行无一被误隐藏。

**另修**：切歌未清跳转意图，导致点歌词/拖进度后立刻切歌时，新曲的歌词时钟落在
旧曲的目标时间（实测 62s，应为 0），约 1.5s 才回正。

### 1.1.38

修 1.1.37 自己引入的回归：**世代绑定不该本地自增**。

- `boundGeneration` 只能存宿主给的世代号。`isStatusCurrent` 是拿事件里的
  `status.generation` 跟它比大小，本地计数器与宿主计数器是两套编号，混用直接判错
- 宿主的 generation 从 0 起（`useRef(0)`），只有选歌才 `++`。1.1.37 在首次绑定时
  本地自增到 1，之后每个 `generation: 0` 的事件都被判为过期 →
  `updatePlayerUI` / `updateProgressOnly` 永久跳过
- 症状：刚进页面歌名停在「未在播放」、进度条不动、`mp-has-track` 不挂，
  页面挂着歌词模式的类却没有 track 类 → 有词/无词布局错乱；切一次歌才自愈
- 宿主不下发世代时，串曲由 `boundTrackId` 比较兜住，本就不需要世代
- 对照实测（harness 按真实宿主把 generation 设为 0）：
  1.1.37 初始 `isStatusCurrent=false`、歌名「未在播放」、缺 `mp-has-track`；
  1.1.38 初始正常，有词↔无词来回切四次布局类与侧栏状态全对

### 1.1.37

- 切行恢复波浪跟焦：progress 热路径原本一律 `focusInstant`，弹簧引擎被整个绕过，
  只有间奏呼吸点那条路径还在动 —— 于是「有间奏的歌顺滑、连唱的句子硬跳」
- 顺序推进（≤3 行）走弹簧，seek 级跨度（>3 行）仍瞬移
- 波浪循环加视口外剔除：目标位与当前位都在可视区外一屏以上的行直接吸附，
  200 行歌单每帧参与计算的行从 200 降到 ≤41（这正是当初改瞬移的性能顾虑）
- 手动滚动后的回焦：1.5 屏以内走波浪，更远仍瞬移；显式清残余甩动惯性
- 点歌词跳转不再"没有动画"：宿主 seek 落位有延迟，期间 progress 仍推旧位置，
  会把刚起步的波浪先打回上一句、再在落位那帧硬跳。新增跳转意图
  （`noteSeekIntent` / `resolveSeekPosition`），落位或 1.5s 超时前用意图位置
  推进 UI。歌词点击 / 进度条拖动（含节流 flush 与 change）/ `[` `]` 全部接入
- 实测：切行 1 帧 58px 硬跳 → ~59 帧弹簧；剔除后全 200 行落位误差 0；
  点击第 24 行由「波浪→回退第 20 行→硬跳」变为单次波浪跑满 ~1.1s，零回退

全量代码审计一并修掉的 6 处：

- `bindTrackFromStatus` 先写 `boundTrackId` 再比较，`else if` 恒为 false ——
  宿主不下发 `generation` 时世代永远停在 0，`isStatusCurrent` 的世代校验形同虚设
- 拖进度条回弹：宿主回推的旧 position 会把滑块从手指下拽走，时间显示来回跳；
  改用同一套跳转意图（实测拖到 100s 时旧 progress 不再把滑块拉回 10s）
- `getLyrics` 失败回退用了 `pageState.currentLyricIndex || -1`，正在唱第一句
  （索引 0）时高亮被吞掉 —— 这正是本文件别处已注释警告过的坑
- 逐字歌词的词缺 `text` 时 `textContent = undefined` 会把 "undefined" 写进歌词
- 移动端面板标题写死中文，en-US / ja-JP 下也显示「歌词 / 播放列表」；
  改为点击时取 `t()`（实测三语均正确）
- 播放列表过滤缓存只按 (query, length) 判定，导入等长的另一张歌单时返回旧结果；
  加首尾曲 id 签名
- 销毁清理补齐：歌词延迟重测 rAF/timer、容器 ResizeObserver、跑马灯重测 timer、
  列表手势 timer、跳转意图（原先只活在闭包里，页面销毁后仍会触发）

### 1.1.36

- 取消 content-area 列宽 CSS 过渡（根治打开瞬间 ~8px 窄宽炸高）
- 移动端 Tab：吞掉 touchend 后的幽灵 click，避免打开立刻关掉
- 滚轮/触摸交互时若未测到布局会再硬测一次
- Chrome headless：桌面/移动/平板 PASS；打开瞬间宽度即正常

### 1.1.35

- 真因：侧栏 grid 过渡时宽≈8px 仍被测量，pre-wrap 炸高行距锁死滚动
- 拒测宽 <120 / 单行过高；RO + settle 在展开后再测
- Chrome headless 验证桌面 1280 / 移动 390 / 平板 820 测量与滚轮/位移

### 1.1.34

- 歌词滚动逻辑收敛：删除多层重试/清 transform/多 settle timer
- 测量只保留 w/h>0 + offsetHeight；打开面板立刻测 + 过渡结束再测
- 保留桌面绝对铺满高度与 touch-action:none（布局层，不搞复杂状态机）

### 1.1.33

- 全端歌词滚动：测高前清 scale transform，避免行距累计错乱
- 桌面侧栏 panel/lyrics 绝对铺满，稳定 clientHeight
- wheel deltaMode 归一化；lyric-line touch-action:none 不再与 JS 抢手势
- minS>maxS 时不再锁死滚动

### 1.1.32

- 修复每首歌歌词必加载两次（init snapshot + 同曲在飞勿 gen++ 作废）
- 歌词滚动：去掉误杀合法行高的 avgH 守卫；测量失败短延迟重试；触摸未测到时仍占手势

### 1.1.31

- 确认无词后粘住 empty：progress/宿主短词不得再 empty→loading 闪回歌词模式

### 1.1.30

- 全端歌词：修复右栏 overflow 被左列规则盖成 visible 导致高度链断裂
- 测量拒绝窄宽/异常炸高行距；打开歌词 Tab 全端硬重测
- 触控平板 769–900 与 checkIsMobile 对齐，强制 Sheet 布局

### 1.1.29

- 移动端控制岛左/右/底边距统一为 --m-gutter
- 全面：封面父级 overflow 与 mask 圆角问题再修

### 1.1.28

- 桌面+移动：修复封面圆角被父级 overflow 裁切；img 去基线空隙

### 1.1.27

- 修复移动端封面下左右圆角被父级 overflow 裁切

### 1.1.26

- 移动端：歌名/歌手回到封面下方

### 1.1.25

- 移动端控制岛更紧凑（间距/按钮/内边距收紧）

### 1.1.24

- 移动端：歌名/歌手直接叠在封面底部，去掉玻璃岛卡片

### 1.1.23

- 移动端「舞台卡」布局：曲目信息玻璃卡叠封面；控制坞悬浮胶囊

### 1.1.22

- 修复移动端歌词滚动：Sheet flex 高度链、touch preventDefault、打开后硬重测

### 1.1.21

- 移动端布局重构：居中 hero、分层底栏、Sheet 手柄与安全区
- 平板端双栏比例/触控热区/竖屏适配

### 1.1.20

- 全面性能：progress 不再全量 UI；主题色-only 快路径；切行走 instant 焦点
- 宿主取色 settle 更快（需 Myriad 前端同步）

### 1.1.19

- 修复无词→有词后歌词挤在顶部（0 高测量拒绝 + empty→ready 硬重测）

### 1.1.18

- 修复 progress 热路径反复 loadLyrics 拖慢封面同步
- 列表绝对定位虚拟滚动，减轻上滚卡顿

### 1.1.17

- 歌词判定顺序：先乐观有词（loading）→ 确认后再 empty（少于 5 行/无词）

### 1.1.16

- 歌词回焦加速：打开 Tab 立刻 snap；手动滚动后 1.1s 即时回位（原 3s 波浪）

### 1.1.15

- 实质歌词少于 5 行视作无歌词

### 1.1.14

- 歌词判定改为优先「有」：≥1 行实质内容即有词，仅真正无词才进无词模式

### 1.1.13

- 修复进入歌词模式时莫名重排（过渡中禁 force 全量测量，ResizeObserver 防抖）

### 1.1.12

- 歌手名字号两种模式统一再降 2px

### 1.1.11

- 歌词 Tab 开着时：无词/过短（<3 有效行）自动进无歌词封面优先；够长自动恢复侧栏

### 1.1.10

- 歌词行数/时间轴长度不对 → 无歌词模式；有效歌词或曲长补全后自动恢复

### 1.1.9

- 有歌词模式标题降 1px；歌曲信息 gap 统一 5px

### 1.1.8

- 修复回无词/关侧栏时 hero 闪现：统一列内居中，只过渡 max-width/padding
- 去掉 align/text-align/margin:auto 硬切；封面随 hero 宽缩放

### 1.1.7

- 移动端：封面+信息同宽 hero；安全区；Sheet 开合与歌词重测时序
- 横屏矮屏压缩封面；平板侧栏比例与内边距对齐
- 无词/默认态居中放大；关闭动画保持 grid 不闪塌

### 1.1.6

- 修复侧栏 0 宽时歌词行高炸裂（测量同时校验宽高，ResizeObserver 自愈）
- 打开歌词面板立刻重测，不再等列宽过渡结束才就位
- 宿主已有歌词时保留占位行并走快路径，恢复不再闪空等网络
- 收紧封面–信息间距与标题/歌手行距；信息字号大一号
- 歌词/列表态 hero 内边距加大；统一侧栏/面板/切歌动效曲线

### 1.1.5

- 优化 none/歌词/列表切换动效（grid + 叠层淡入）
- 歌词与列表打开时占地完全一致

### 1.1.4

- 修复长标题溢出到歌词区（左列硬裁剪 + 布局后重测跑马灯）

### 1.1.3

- 侧栏三态：默认都不选（仅封面+标题）、歌词、列表；再点 Tab 可关闭
- 去掉「暂无歌词」空态占位

### 1.1.2

- 去掉歌词加载 spinner/入场动画；无词时静默空态
- 封面+标题整体 hero；无词布局随侧栏焦点切换

### 1.1.1

- 抽象通用 Fab 浮动图标组件：定位当前、动效、翻译共用

### 1.1.0

- 无歌词模式：加载中/无词空态，桌面封面优先布局

### 1.0.10

- 边框/阴影与主题色同步渐变，消除滞后

### 1.0.9

- 「定位当前」改为播放列表右下角浮动图标按钮

### 1.0.8

- 主题色切换改为 CSS 渐变插值（`@property` + transition）

### 1.0.7

- 识别宿主 `hasThemePalette`：占位/默认色不覆盖上一首主题

### 1.0.6

- 切歌时保留上一首主题色，取色完成后再切换，不再闪默认色

### 1.0.5

- 移除封面区加载遮罩与 spinner

### 1.0.4

- 播放失败时顶部状态条提示（依赖宿主 `lastError`）
- 空列表展示导入引导；搜索无结果 i18n
- 键盘 `[` / `]`（或 PgUp/PgDn）快退/快进 5 秒
- 音量快捷键与滑条统一为 0–100

### 1.0.3

- **状态绑定**：`trackId + generation` 硬丢弃过期 UI 补丁，减少串曲/串色
- **空态 / 缓冲**：无曲提示、切歌加载指示、顶部状态条
- **封面**：crossfade 淡入淡出；列表当前曲封面 eager
- **主题色**：无取色时中性色，避免残留上一首
- **交互**：空格播放、←→ 切歌、↑↓ 音量、L/P 切面板；列表「定位当前」
- **偏好**：默认歌词/列表面板持久化；移动端左右滑切换面板

### 1.0.2

- 主题色：`primaryColor` / `secondaryColor` 变化视为关键状态更新，异步取色到达后立刻刷新 UI
- 封面：当前封面高优先级解码；切歌时预解码邻曲封面
- Windows / 触控：`isLaidOut` 替代易误判的 `offsetParent`；Aurora 无频谱时呼吸底光
- 权限：保留 `network:fetch` 以加载远程封面

### 1.0.1

- 声明 `network:fetch`（远程封面 CSP）

## 功能

- **播放控制**：播放/暂停、上一首/下一首、进度拖动
- **歌词**：同步滚动，自动跟随进度
- **播放列表**：查看与搜索当前列表
- **播放模式**：顺序、循环、单曲、随机
- **音量**：调节音量、静音
- **主题**：跟随系统明暗模式
- **布局**：桌面与移动端自适应

## 界面布局

```
┌─────────────────────────────────────────┐
│  ┌─────────────┐  ┌──────────────────┐  │
│  │             │  │                  │  │
│  │   封面      │  │     歌词         │  │
│  │   信息      │  │                  │  │
│  │   控制      │  ├──────────────────┤  │
│  │             │  │                  │  │
│  │             │  │   播放列表       │  │
│  │             │  │                  │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

- **左侧**: 专辑封面、歌曲信息、进度条、播放控制
- **右上**: 歌词显示区域，自动滚动高亮当前行
- **右下**: 播放列表，支持搜索过滤

## 使用的 API

### 媒体控制 API (`media:control`)

```javascript
// 播放控制
Tapp.media.play();
Tapp.media.pause();
Tapp.media.next();
Tapp.media.prev();
Tapp.media.seek(seconds);

// 音量控制
Tapp.media.setVolume(0.8);
Tapp.media.mute();
Tapp.media.unmute();

// 播放模式
Tapp.media.setMode("repeat"); // repeat | single | shuffle

// 播放指定曲目
Tapp.media.playTrack(trackId, trackIndex);
```

### 媒体读取 API (`media:read`)

```javascript
// 获取播放状态
const status = await Tapp.media.getStatus();
// { isPlaying, currentTrack, position, volume, mode, muted }

// 获取播放列表
const playlist = await Tapp.media.getPlaylist();

// 监听状态变化
Tapp.media.onStateChange((state) => {
  console.log("播放状态:", state);
});

// 监听轻量进度更新
Tapp.media.onProgress((progress) => {
  console.log(progress.current, progress.duration, progress.percentage);
});
```

## 权限要求

| 权限              | 用途           |
| ----------------- | -------------- |
| `storage`         | 保存用户设置   |
| `ui:notification` | 显示通知提示   |
| `ui:theme`        | 获取主题和颜色 |
| `media:control`   | 控制音乐播放   |
| `media:read`      | 读取播放状态   |

## 设置选项

| 设置           | 类型   | 默认值 | 说明         |
| -------------- | ------ | ------ | ------------ |
| `showLyrics`   | toggle | true   | 显示歌词面板 |
| `autoScroll`   | toggle | true   | 歌词自动滚动 |
| `showSpectrum` | toggle | true   | 显示频谱动画 |

## 多语言支持

- 🇨🇳 简体中文
- 🇺🇸 English
- 🇯🇵 日本語

## 开发者

- **作者**: Myriad Team
- **版本**: 1.0.0
- **许可**: MIT
