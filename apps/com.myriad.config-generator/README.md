# Myriad 安装配置生成器

一键生成 Myriad **proxy + updater 单运行槽**生产部署所需的配置文件。

> 对齐 Myriad 仓库的 `docker-compose.yml` / `.env.production.example` /
> `docs/updater-spec.md`。旧版「backend/frontend 直连宿主端口 + named volume」布局已移除。

## 功能

- **Docker Compose**：postgres / backend / frontend / proxy / updater 完整栈
- **.env**：密钥、镜像仓库与 tag、CORS、updater mode/channel 等部署契约
- **最新镜像 tag**：运行时从 Docker Hub 解析最新 **versioned** tag（禁止 `:latest`）；预发布 tag 使用 `preview` channel
- **Nginx**：外层 HTTPS 入口反代到 `HTTP_PORT`（唯一宿主端口）
- **DEPLOY.md**：目录布局、启动步骤、升级与救援说明
- **安全密钥**：自动生成 `POSTGRES_PASSWORD` / `JWT_SECRET` / `UPDATE_TOKEN`
- **SSL 保留**：上传现有 Nginx 时尽量保留证书路径，统一反代目标

## 架构要点

```text
外层 Nginx (HTTPS)
        │
        ▼
proxy (HTTP_PORT) ──┬──► frontend:1102
                    ├──► backend:1103 ──► postgres (./pgdata bind mount)
                    └──► updater:1101（内网；UI 经 /api/admin/updater/*）
```

- **单运行槽**：不是 A/B 双活。升级时进入维护模式，快照 `pgdata`，切换 `.env` 中的镜像 tag。
- **禁止 `:latest`**：回滚依赖 registry 中的旧 tag。
- **`pgdata` 必须是 bind mount**：updater 做文件级快照，不能用 Docker named volume。
- **channel 仅为 `stable` / `preview`**：与当前 updater 的启动配置严格一致。
- **签名默认 `strict`**：只有兼容无签名旧 release 时才手动降级。

## 使用方法

1. 填写主域名（可选额外域名，如 `www`）
2. 自动/手动生成三项密钥
3. 等待/点击「刷新最新版本」自动填入 Docker Hub 最新 versioned tag，确认 `HTTP_PORT`
4. （可选）上传已有 SSL Nginx 配置
5. 点击「生成配置文件」
6. 下载 `docker-compose.yml`、`.env`、Nginx 配置

## 生成的文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | 五服务生产栈；PostgreSQL 不设资源硬上限 |
| `.env` | 密钥与 tag；`chmod 600` 后与 compose 同目录 |
| `<domain>.conf` | 反代到 `127.0.0.1:HTTP_PORT` |
| `DEPLOY.md` | 启动 / 升级 / 救援速查 |

## 启动摘要

```bash
mkdir -p pgdata state state/snapshots state/cache backups
chmod 600 .env
docker compose up -d
```

日常升级：管理员登录 → 设置/配置 → 关于 → 更新管理。

## 注意事项

- 密钥使用字母数字，避免 `DATABASE_URL` 被特殊字符破坏
- 不上传 Nginx 时生成无 SSL 模板，需自行配证书
- 上传的配置会把旧式 `3000/4321/1102/1103` 上游统一改为 `HTTP_PORT`
- 新部署默认 PostgreSQL **18**；发布契约最低兼容 **16**，不设置最高版本
- PostgreSQL 18+ 的 `pgdata` 挂载点为 `/var/lib/postgresql`；已有数据库跨主版本升级前必须先执行 `pg_upgrade` 或 dump/restore
