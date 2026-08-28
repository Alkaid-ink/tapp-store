# 蛋白质 3D 结构查看器

`cn.astelysin.protein-viewer` 是一个运行在 Myriad 中的在线 PDB 结构查看器，适合快速浏览蛋白质和分子结构。

## 使用方式

1. 在顶部输入框填写 PDB ID，例如 `1A3N` 或 `9WBA`，点击“加载结构”。
2. 也可以在名称搜索框中输入蛋白质名称，选择搜索结果后加载结构。
3. 加载完成后，可拖拽旋转、滚轮缩放、右键平移，并点击残基序列定位到对应位置。
4. 使用右侧工具栏筛选链、搜索结构、测量距离，或导出截图、mmCIF 文件。

## 功能

- **拖拽旋转 / 滚轮缩放 / 右键平移 / 双击重置视角**，支持触屏单指旋转、双指缩放。
- 单一渲染模式：**线框**（Wireframe），保持结构键和元素颜色清晰可读。
- 残基位置栏显示可点击的一字母氨基酸序列，支持按残基快速定位到三维视图。
- 两种配色：**元素配色**（CPK）与 **链配色**。
- 在线拉取：输入 **PDB ID**（如 `1A3N`）或按 **名称搜索** RCSB PDB（`full_text` 搜索 → GraphQL 标题 → mmCIF 坐标）。
- 历史记录：保存最近加载的结构 ID、标题、原子数与时间，可重新加载或清空。
- 结构工具：链筛选、结构内搜索、原子选择、两点测距、截图导出、mmCIF 下载与 PDB ID 复制。
- 大结构自动降级：原子数超过阈值时使用 Cα 线段，保证线框模式仍能显示结构轮廓。
- 自动旋转、全屏、加载状态、错误提示；三语（简中 / 英文 / 日文）。

## 技术说明

- 3D 渲染使用宿主注入的 **Three.js r170**（`runtimeModules: ["three"]`，全局 `THREE`），不打包任何库、不走 CDN。
- 数据源均为 RCSB PDB 公共接口，经 `manifest.apis` 代理（沙箱禁止直接 `fetch`）：
  - `search` → `search.rcsb.org/rcsbsearch/v2/query`（全文搜索）
  - `titles` → `data.rcsb.org/graphql`（批量标题/原子数）
  - `structure` → `files.rcsb.org/download/{id}.cif`（mmCIF 坐标）
- 沙箱响应体上限 2 MiB；超大结构可能无法完整在线拉取，页面会提示响应截断或降级为 Cα 线段。`Tapp.api` 文本响应做了防御式提取（`toText`）。

## 本地文件

```
manifest.json       Tapp 清单与 RCSB API 配置
page.html           页面结构
page.css            页面样式
page/viewer.js      三维视图、交互和数据加载
page/parser.js      mmCIF 解析
page/bonds.js       结构键检测
page/build.js       Wireframe 几何构建
page/colors.js      元素与链配色
i18n/               多语言文本
tests/              解析和几何构建测试
```

## 本地验证

```bash
node scripts/self-check.mjs
node --test tests/parser-bonds.test.mjs tests/build.test.mjs
```

## 已知边界

- WebGL 渲染与交互需要在 Myriad 宿主真机中验证；本地仅有解析/键检测等纯逻辑单测。
- `Tapp.api` 对文本（mmCIF）响应的实际返回形状取决于宿主运行时，已做多形态兼容。
- 在线拉取对超大结构可能会失败或截断；当前版本不再提供内置结构作为替代。

## 版本

当前版本：`0.4.3`

## License

MIT
