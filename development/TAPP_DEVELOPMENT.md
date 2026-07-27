# Tapp 开发文档（tapp-store 镜像）

本目录是 [Myriad 主仓库](https://github.com/Myriad-You/Myriad) `docs/development/` 的**贡献者镜像**，方便在商店仓库内阅读协议与 SDK 说明。

| 优先级 | 说明 |
| ------ | ---- |
| **权威** | Myriad `docs/development/tapp/*` 与当前安装器代码 |
| **本镜像** | 可能随 PR 同步；若与主仓库冲突，以 Myriad 为准 |

商店仓库自身的目录协议与发布流程见：

- 根目录 [README.md](../README.md)
- [tapp/STORE.md](./tapp/STORE.md)（与 Myriad 同步的全文）

## 模块文档

| 文档 | 说明 |
| ---- | ---- |
| [架构总览](tapp/ARCHITECTURE.md) | 安装态、运行态、沙箱、后台 core 与调度器 |
| [Tapp 商店](tapp/STORE.md) | 远程目录 `index.json`、源管理、安装链路与发布 |
| [Tapp Playground](tapp/PLAYGROUND.md) | Pro AI 生成、预览、导出 |
| [Playground 生成上下文](tapp/PLAYGROUND_GENERATION_CONTEXT.md) | 注入模型的开发上下文 |
| [快速入门](tapp/QUICKSTART.md) | CLI、代码架构、生命周期 |
| [Manifest 配置](tapp/MANIFEST.md) | manifest.json 字段 |
| [SDK API 参考](tapp/API_REFERENCE.md) | 沙箱 SDK |
| [小组件开发](tapp/WIDGET.md) | Widget |
| [页面样式规范](tapp/PAGE.md) | Page 布局与深色模式 |
| [安全沙箱](tapp/SANDBOX.md) | CSP 与权限 |
| [图形与轻量游戏](tapp/GRAPHICS.md) | Canvas / assets |
| [样式规范](tapp/STYLING.md) | Glass / Tailwind |
| [设计规范摘要](tapp/DESIGN_SPEC.md) | Playground 设计语言 |
| [运行时契约](tapp/RUNTIME_CONTRACT_DESIGN.md) | Grant / Data Exchange / AI / Event |
| [REST API](tapp/REST_API.md) | 宿主后端路由 |
| [故障排除](tapp/TROUBLESHOOTING.md) | 常见问题 |
| [权限 fixtures](tapp/fixtures/README.md) | host / action 权限对照 |

## 仅存在于 Myriad 主仓库

下列内容请直接打开主仓库，本镜像不维护副本：

| 文档 | 链接 |
| ---- | ---- |
| `.tapp` ZIP 格式 | [TAPP_FILE_FORMAT.md](https://github.com/Myriad-You/Myriad/blob/preview/docs/features/TAPP_FILE_FORMAT.md) |
| `@myriad/tapp-cli` | [tools/tapp-cli](https://github.com/Myriad-You/Myriad/tree/preview/tools/tapp-cli) |
| 系统架构 / 构建 | [ARCHITECTURE](https://github.com/Myriad-You/Myriad/blob/preview/docs/development/ARCHITECTURE.md) · [BUILD](https://github.com/Myriad-You/Myriad/blob/preview/docs/development/BUILD.md) |

## 给商店贡献者的最短路径

1. 读 [STORE.md](./tapp/STORE.md) 与根 [README](../README.md)  
2. 用 CLI 在本地 `check` / `pack`（见 [QUICKSTART](./tapp/QUICKSTART.md)）  
3. 把应用放进 `apps/{id}/` 并更新 `index.json`  
4. 核对 **category / version / download 路径 / assets**  
5. 在 Myriad 实例上强制刷新商店源并试装  

## 同步说明

从 Myriad 更新镜像时，复制：

```text
Myriad/docs/development/TAPP_DEVELOPMENT.md  →  development/TAPP_DEVELOPMENT.md  （再按本文件调整镜像说明）
Myriad/docs/development/tapp/**              →  development/tapp/**
```

不要把 Myriad 整仓 `docs/deployment` 等非 Tapp 文档复制进来。
