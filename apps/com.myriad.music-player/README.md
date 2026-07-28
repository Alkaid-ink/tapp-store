# 音乐播放器

控制系统音乐播放，查看歌词与播放列表。

## Changelog

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
