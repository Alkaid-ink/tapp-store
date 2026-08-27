# 蛋白质 3D 结构查看器（Protein 3D Viewer）

`cn.astelysin.protein-viewer` — 一个在 Myriad 中运行的交互式 3D 分子结构查看器。

## 功能

- **拖拽旋转 / 滚轮缩放 / 右键平移 / 双击重置视角**，支持触屏单指旋转、双指缩放。
- 六种渲染模式：**空间填充**（Space-filling，默认）、**球棍**（Ball-and-stick）、**α 碳骨架**（Backbone）、**Ribbon 卡通**（Ribbon Cartoon）、**线框**（Wireframe）与**混合**（蛋白质用 Ribbon、配体用球棍）。
- 残基位置栏显示可点击的一字母氨基酸序列，支持按残基快速定位到三维视图。
- 两种配色：**元素配色**（CPK）与 **链配色**。
- 在线拉取：输入 **PDB ID**（如 `1A3N`）或按 **名称搜索** RCSB PDB（`full_text` 搜索 → GraphQL 标题 → mmCIF 坐标）。
- 历史记录：保存最近加载的结构 ID、标题、原子数与时间，可重新加载或清空。
- 结构工具：链筛选、结构内搜索、原子选择、两点测距、截图导出、mmCIF 下载与 PDB ID 复制。
- 大结构自动降级：原子数超过阈值时仅渲染 α 碳骨架，保证流畅；Ribbon 和 Wireframe 在降级结构上会回退到可用的骨架显示。
- 自动旋转、全屏、加载状态、错误提示；三语（简中 / 英文 / 日文）。

## 技术说明

- 3D 渲染使用宿主注入的 **Three.js r170**（`runtimeModules: ["three"]`，全局 `THREE`），不打包任何库、不走 CDN。
- 数据源均为 RCSB PDB 公共接口，经 `manifest.apis` 代理（沙箱禁止直接 `fetch`）：
  - `search` → `search.rcsb.org/rcsbsearch/v2/query`（全文搜索）
  - `titles` → `data.rcsb.org/graphql`（批量标题/原子数）
  - `structure` → `files.rcsb.org/download/{id}.cif`（mmCIF 坐标）
- 沙箱响应体上限 2 MiB；超大结构可能无法完整在线拉取，页面会提示响应截断或自动降级为 α 碳骨架。`Tapp.api` 文本响应做了防御式提取（`toText`）。

## 目录

```
├── manifest.json / catalog.json / README.md
├── main.js                 # core 入口（headless；渲染在 page 层）
├── page.html / page.css    # 页面模板与样式
├── page/
│   ├── entry.js            # 页面入口（require viewer）
│   ├── viewer.js           # Three 场景、轨道相机、UI 接线、在线拉取
│   ├── parser.js           # mmCIF 解析（沙箱 / 脚本 / 测试共用）
│   ├── bonds.js            # 距离键检测
│   ├── build.js            # 三种渲染模式的 InstancedMesh 构建
│   └── colors.js           # CPK 与链配色
├── i18n/                   # zh-CN / en-US / ja-JP
├── preview.html / preview.css  # 商店静态快照
└── tests/parser-bonds.test.mjs # 单测
```

## 开发与验证

```bash
node scripts/self-check.mjs                            # 结构自检：manifest/资源/require 图/语法
node --test tests/parser-bonds.test.mjs tests/build.test.mjs  # 解析、键检测、几何构建单测
```

商店发布遵循 tapp-store 规则：单 app、不手改 `index.json`、实质改动 bump `manifest.version`。上架前用官方校验跑一遍：

```bash
node scripts/check-pr-scope.mjs
node scripts/sync-index.mjs validate --app cn.astelysin.protein-viewer
node scripts/validate-app.mjs --app cn.astelysin.protein-viewer
npx --yes --package=@myriad/tapp-cli@0.1.0 myriad-tapp check apps/cn.astelysin.protein-viewer --json
```

## 已知边界

- WebGL 渲染与交互需要在 Myriad 宿主真机中验证；本地仅有解析/键检测等纯逻辑单测。
- `Tapp.api` 对文本（mmCIF）响应的实际返回形状取决于宿主运行时，已做多形态兼容。
- 在线拉取对超大结构可能会失败或截断；当前版本不再提供内置结构作为替代。

## License

MIT
