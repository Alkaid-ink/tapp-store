# 星辰小组件

当前版本包含三个模块：

## GitHub 数据卡片

可显示：

- GitHub 统计卡片
- 热门语言卡片
- 仓库卡片
- Gist 卡片
- WakaTime 卡片

默认服务域名为：

```text
https://github-stats-hazel-beta.vercel.app
```

每个 Dashboard 实例拥有独立设置，可以使用不同用户名、卡片类型、主题和服务域名。
“显示星辰外壳”默认关闭，此时仅显示 GitHub 卡片；开启后会显示标题、状态、星空背景、阴影和底部信息。该设置与 GitHub 卡片自身边框相互独立。
GitHub 卡片默认使用透明容器：根节点不绘制 `glass` 或整卡实色背景，SVG 使用透明背景，并根据宿主深浅色调整文字。通过“容器背景”仍可改为跟随深浅色、固定白色或固定黑色。

`高级查询参数` 支持继续使用 GitHub Stats Extended 官方文档中的参数，例如：

```text
hide_values=true&stats_format=bytes
```

结构化设置会覆盖高级参数中的同名字段，避免用户名、卡片类型等核心配置被意外覆盖。

## 网站访客

`网站访客` 小组件提供 `2x1` 和 `4x1` 两种尺寸。画布背景透明，默认使用浅粉色圆角数字条；实例设置中只提供“外层容器颜色”，并可修改标题颜色、数字颜色和圆角。

访客模块不再连接独立 Vercel 计数服务，也不会自行发送访客记录。它直接调用 Myriad 内置的：

```javascript
Tapp.analytics.getSummary({ days: 7 })
```

并从返回结果的 `all_time` 分组获取累计记录。实例可选择：

- `all_time.views`：累计访问量（PV），默认显示
- `all_time.unique_visitors`：累计独立访客（UV），受系统访客保留期限制

系统会统一负责站点访问记录、去重、保留策略和统计汇总，因此不再需要站点标识、外部接口、Redis 或自动计数开关。如果系统返回 `enabled: false`，小组件会提示站点统计尚未启用。

该模块需要 Manifest 中的 `analytics:read` 权限。安装或升级到新版本时，需要在权限确认中允许读取站点分析数据。

## 个人信息

`个人信息` 小组件提供 `2x1`、`4x1` 和 `2x2` 三种尺寸：横向尺寸使用圆角胶囊信息条，`2x2` 使用左上图标与纵向文字组成的方形名片。内置邮箱、QQ、微信、Telegram、GitHub、Gitee 和哔哩哔哩图标，也可以选择“自定义”并填写字符、Emoji 或 SVG 图标。

选择平台后会自动使用对应名称和品牌色；标题、内容、图标显示、图标底色、信息条颜色、文字颜色和圆角均可按实例单独设置。画布背景保持透明，仅信息胶囊本身上色。

选择“自定义”类型后，可以粘贴完整 SVG 代码；设置面板为单行输入，因此建议先压缩 SVG。渲染时仅保留安全的 SVG 图形、渐变和文本元素，脚本、事件、外部资源及危险标签会被删除。SVG 使用 `currentColor` 时会跟随“图标颜色”设置；代码无效时自动回退到字符或 Emoji 图标。

## 本地校验与打包

```powershell
node ..\pstarchen-tapp-store\tapp-cli\bin\myriad-tapp.mjs check . --json
node ..\pstarchen-tapp-store\tapp-cli\bin\myriad-tapp.mjs pack . --json
```

安装包输出位置：

```text
dist/cn.xciy.xingchen.widgets.tapp
```
