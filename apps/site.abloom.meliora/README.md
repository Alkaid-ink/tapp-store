# Meliora Tapp

[Meliora](https://github.com/abloom25/Meliora) 的 Myriad [Tapp](https://github.com/Myriad-You/tapp-store) 版本:沉浸式歌词与节拍可视化。

**架构**:不重写视图层——直接复用主仓播放器代码(`LyricsPanel` 等组件原样保留),
仅把音频后端替换为 Myriad 宿主的 `Tapp.media`(状态/进度/歌词/节拍网格/频谱/控制),
Vue 应用经 Vite 打成单文件 `main.js` 后在沙箱运行。

## 功能

- 主仓原版歌词面板:FLIP 无缝重定向滚动、逐行高亮、快节奏自适应节奏(`--lyric-tempo`)
- 节拍呼吸背景:宿主离线节拍网格(`getBeatGrid`)驱动,无网格退回实时频谱低频
- 五段频谱柱:宿主 8 频段映射 + 快起慢落包络
- 传输控制、播放模式切换(循环/随机/顺序)、可点击进度条

## 开发

```bash
pnpm install
pnpm dev      # 本地预览(无宿主,媒体功能为空)
pnpm build    # 产出 main.js + styles.css(包根)
pnpm check    # tapp-cli 校验
pnpm pack     # 产出 dist/*.tapp
```

结构:

```
manifest.json / page.html   Tapp 包定义
main.js / styles.css        构建产物(随源码提交,包根即可安装)
src/
├── main.ts                 Tapp lifecycle 挂载
├── App.vue                 播放器页装配
├── tapp/media.ts           Tapp.media 防御性封装(唯一宿主接触面)
├── services/host-player.ts 播放后端(对齐主仓 useAudioPlayer 消费面)
├── services/lyrics.ts      歌词服务(宿主 getLyrics)
├── composables/useHostBeat.ts  节拍驱动(对齐主仓 useBeatAnalyser 形状)
├── stores/player.ts        播放状态镜像(store 由 host-player 单向写入)
├── components/             主仓组件(LyricsPanel 等,原样保留)
└── utils/ · types/         主仓纯函数与类型
```

## 许可

[AGPL-3.0-or-later](LICENSE)。包含移植自 [Meliora](https://github.com/abloom25/Meliora) 的代码(同许可)。
