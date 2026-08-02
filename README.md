# Myriad Tapp Store

官方 **远程 Tapp 目录**，以静态 Git 仓库托管。Myriad 实例通过商店源 URL 拉取 `index.json`，再按 `download` 与 `manifest.assets` 安装应用。

| 项 | 值 |
| -- | -- |
| 目录 URL（Myriad 预置官方源） | `https://raw.githubusercontent.com/Myriad-You/tapp-store/main/index.json` |
| `base_url` | `https://raw.githubusercontent.com/Myriad-You/tapp-store/main` |
| Myriad 权威文档 | [Tapp 商店](https://github.com/Myriad-You/Myriad/blob/preview/docs/development/tapp/STORE.md) · [Tapp 开发索引](https://github.com/Myriad-You/Myriad/blob/preview/docs/development/TAPP_DEVELOPMENT.md) |

> **开发/运行时契约以 Myriad 主仓库为准。** 本仓库的 `development/` 为面向商店贡献者的镜像与摘要，可能滞后；冲突时以 Myriad `docs/development/tapp/` 为准。

## 在 Myriad 中使用

1. 新实例迁移会预置上述官方源（`official=true`）。
2. 管理员也可在 Tapp Store 设置中添加第三方目录 URL（须指向可公开 GET 的 `index.json`）。
3. 用户在商店 UI 浏览列表（浏览器直连索引）；安装时优先由 **后端** 出站下载，失败或大包时回退为浏览器下载 + direct 安装。

细节见 Myriad [STORE.md](https://github.com/Myriad-You/Myriad/blob/preview/docs/development/tapp/STORE.md)。

## 仓库结构

```text
tapp-store/
├── index.json              # 目录入口（必需）
├── categories.json         # UI 分类元数据（可选；安装权威是 apps[].category）
├── README.md
├── apps/
│   └── {app_id}/
│       ├── manifest.json   # 必需
│       ├── main.js         # 入口（或与 download.code 一致的 index.js 等）
│       ├── page.html / page.css / widget.css / …
│       ├── assets/         # manifest.assets 二进制
│       ├── i18n/
│       ├── page/           # pageModules
│       └── README.md
└── development/            # 贡献者文档镜像（见下）
```

## `index.json` 协议（摘要）

### 顶层

| 字段 | 说明 |
| ---- | ---- |
| `name` | 商店名称 |
| `version` | 目录版本（元数据） |
| `api_version` | 协议提示（当前官方 `"2"`） |
| `base_url` | 解析相对路径的根，无尾斜杠 |
| `updated_at` | ISO 更新时间 |
| `apps` | 应用数组（必需） |
| `maintainer` | 可选 |

### 每个 `apps[]` 条目

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| `id` | ✅ | 与 `manifest.id` 相同 |
| `name` / `version` / `description` | ✅ | 展示；`version` 与 Manifest 同步 |
| `author` | ✅ | `{ name, email?, url? }` |
| `category` | ✅ | 稳定用途 ID（见下）；**必须与 Manifest 一致** |
| `permissions` | ✅ | 申请权限 |
| `download` | ✅ | 相对 `base_url` 的路径表 |
| `locales` | ❌ | BCP-47 → `{ name?, description? }` |
| `long_description` / `tags` / `icon` / `icon_svg` / `theme_color` | ❌ | 展示 |
| `preview` | ❌ | 无脚本静态预览（HTML、CSS、桌面画布与裁切参数） |
| `size` | ❌ | 字节；**≥ 1 MiB 时 Myriad 走客户端下载进度** |
| `featured` / `verified` | ❌ | UI 徽章 |

### `download` 键

| 键 | 说明 |
| -- | ---- |
| `manifest` / `code` | 必需 |
| `readme` | 可选 |
| `styles` / `widget_styles` / `page_styles` | CSS |
| `page_template` | Page HTML |
| `widget_templates` | `widgetId → { size → path }` |
| `i18n` | `lang → path` |
| `page_modules` | **安装后文件名** → 商店路径 |

**二进制资源不要写入 `download`。** 声明在 `manifest.assets`，安装器拼：

```text
{base_url}/{packageRoot}/{assetPath}
# packageRoot = download.code 的父目录，例如 apps/com.myriad.doudizhu
```

Manifest 若声明了 `pageStyles` / `pageTemplate`，索引必须提供对应 `page_styles` / `page_template` 且文件可下载，否则安装失败。

### 分类（稳定 ID）

| ID | 用途 |
| -- | ---- |
| `ai` | AI 应用 |
| `data` | 数据处理与展示 |
| `developer` | 开发工具 |
| `game` | 游戏（注意是 `game` 不是 `games`） |
| `media` | 音频/视频等媒体 |
| `productivity` | 效率 / 笔记 |
| `social` | 社交协作 |
| `utility` | 其他通用工具 |

运行形态（Page / Widget / headless）与 demo/test 阶段用 Manifest 字段或 `tags` 表达，不要塞进 `category`。

### 最小示例

```json
{
  "name": "Example Store",
  "api_version": "2",
  "base_url": "https://raw.githubusercontent.com/org/repo/main",
  "apps": [
    {
      "id": "com.example.notes",
      "name": "Notes",
      "version": "1.0.0",
      "description": "Notes Tapp",
      "author": { "name": "Example" },
      "category": "productivity",
      "permissions": ["storage", "widget:register"],
      "download": {
        "manifest": "apps/com.example.notes/manifest.json",
        "code": "apps/com.example.notes/main.js"
      }
    }
  ]
}
```

## 贡献应用

1. Fork 本仓库。
2. 在 `apps/{id}/` 添加完整包文件（建议先用 Myriad [`@myriad/tapp-cli`](https://github.com/Myriad-You/Myriad/tree/preview/tools/tapp-cli) 在本地 `check` / `pack`）。
3. 更新根目录 `index.json`：版本、权限、`download` 全路径、`category`、`size`（大包必填）、`locales`。
4. 确认 **索引 `category` / `version` 与 `manifest.json` 一致**。
5. 若声明 `preview`，运行 `node scripts/validate-previews.mjs` 检查字段、路径与静态资源安全。
6. 提交 Pull Request。

### 发布检查清单

- [ ] `download.manifest` / `download.code` 可公开 GET
- [ ] Manifest 声明的 page/widget CSS、HTML 模板均在 `download` 中有路径
- [ ] `page_modules` 的键是安装后文件名
- [ ] `manifest.assets` 均在 `{packageRoot}/assets/...`
- [ ] 分类与版本双端一致
- [ ] 路径大小写与 Git 一致

## 当前应用

以 `index.json` 的 `apps` 为准，包括但不限于：

| ID | 说明 |
| -- | ---- |
| `com.myriad.music-player` | 系统音乐控制 |
| `com.myriad.quick-notes` | 便签 + Widget |
| `com.myriad.config-generator` | 部署配置生成 |
| `com.myriad.doudizhu` | 斗地主（含 assets） |
| `com.myriad.aro` | 社交中心 |
| `com.myriad.cdn-cache` | CDN 缓存刷新（管理员） |

## 开发者文档

| 路径 | 说明 |
| ---- | ---- |
| [development/TAPP_DEVELOPMENT.md](./development/TAPP_DEVELOPMENT.md) | 文档索引与 Myriad 链接 |
| [development/tapp/STORE.md](./development/tapp/STORE.md) | 商店协议全文（与 Myriad 同步） |
| [development/tapp/](./development/tapp/) | Manifest / SDK / 沙箱等镜像 |

完整运行时与后端边界请读 Myriad 主仓库文档，不要仅依赖本镜像。

## 许可证

MIT License
