# Myriad 安装配置生成

填写部署参数，生成与官方生产拓扑一致的 hardened Compose、环境变量与 Nginx 配置。

## 功能

- `docker-compose.yml`：proxy + frontend + backend + postgres + **docker-guard** + **updater** + **updater-gateway**
- `.env`：密钥（含 `UPDATE_TOKEN`、`UPDATER_GATEWAY_SECRET`）、域名与 versioned 镜像 tag
- Nginx 配置：将 HTTPS 流量转到 proxy
- `DEPLOY.md`：启动、拓扑、doctor、救援与 volume 权限提示

## 安全拓扑（v1.1）

| 网络 | 成员 | 说明 |
|------|------|------|
| `myriad-net` | proxy, frontend, backend, postgres | 业务平面 |
| `myriad-admin-net` | backend, updater, updater-gateway, proxy | 管理平面 |
| `myriad-docker-guard-net` (internal) | updater, docker-guard | 唯一 docker.sock 路径 |

要点：

- **仅 docker-guard** 挂载 `/var/run/docker.sock`；updater 经 `DOCKER_HOST=tcp://docker-guard:2375` 访问
- **backend 不持有 `UPDATE_TOKEN`**，只持有 `UPDATER_GATEWAY_SECRET`，经 `http://updater-gateway:1104` 更新
- backend 以非 root（uid 1000）运行；可用 `scripts/docker/deploy.sh` chown named volumes
- 禁止 `:latest`；镜像 tag 从 Docker Hub 解析 versioned 标签

## 使用方法

1. 填写域名。
2. 设置 PostgreSQL 版本、数据库名和用户名，确认自动生成的密钥（含网关密钥）。
3. 如有现成的 Nginx SSL 配置，可选择上传。
4. 点击“生成配置文件”并下载结果。

在 1Panel 中，将 `docker-compose.yml` 粘到“编排”，将 `.env` 全文粘到“环境变量”。
Nginx 请上传当前域名的站点配置，不要上传包含其他站点的完整 `nginx.conf`。

## 生成的文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | hardened 服务编排 |
| `.env` | 密钥、域名和版本（勿提交 Git） |
| `<domain>.conf` | HTTPS 反向代理 |
| `DEPLOY.md` | 部署步骤 |

## 启动摘要

```bash
mkdir -p pgdata state state/snapshots state/cache backups
chmod 600 .env
docker compose up -d
```

可选：源码仓库内 `scripts/docker/deploy.sh up`（补齐目录并对 backend volume chown）。

## 注意事项

- 不要公开或提交 `.env`（含 `UPDATE_TOKEN` 与 `UPDATER_GATEWAY_SECRET`）。
- 1Panel 默认只在 `127.0.0.1:8080` 提供 proxy；也可选择所有网卡和其他端口。
- 不要映射 docker-guard:2375、updater-gateway:1104、updater:1101 等到公网。
- Nginx 只反代到 proxy，不要开放其他服务端口。
- PostgreSQL 默认使用 18，数据库名、用户名、密码、CPU 和内存都可设置。
- 更换 PostgreSQL 主版本前需先迁移数据。
- 不要使用 `:latest` 镜像标签。
- `COSIGN_VERIFY=off` 时需在 `.env` 额外设置双钥匙之一：`UPDATER_ALLOW_INSECURE_COSIGN=true` 或 `COSIGN_INSECURE_OK=true`。
