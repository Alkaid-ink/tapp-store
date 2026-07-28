# 音乐播放器

控制系统音乐播放，查看歌词与播放列表。

## Changelog

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
