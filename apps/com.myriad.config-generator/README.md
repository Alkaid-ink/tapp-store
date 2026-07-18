# Myriad 安装配置生成

生成生产用 `docker-compose.yml`、`.env`、Nginx 与部署说明。

## 输出

| 文件 | 内容 |
|------|------|
| `docker-compose.yml` | proxy / frontend / backend / backend-volume-init / postgres / docker-guard / updater / updater-gateway |
| `.env` | 密钥与 tag（勿提交） |
| `<domain>.conf` | 外层反代到 proxy |
| `DEPLOY.md` | 启动与救援 |

## 网络

| 网络 | 成员 |
|------|------|
| `myriad-net` | proxy, frontend, backend, postgres |
| `myriad-admin-net` | backend, updater, updater-gateway, proxy |
| `myriad-docker-guard-net` (internal) | updater, docker-guard |

- backend-volume-init 使用 `network_mode: none`
- 仅 docker-guard 挂 sock
- backend 只持 `UPDATER_GATEWAY_SECRET`，经 gateway 更新
- backend-volume-init 会在 backend 启动前修复持久卷权限
- 禁止 `:latest`

## 用法

1. 填域名 / 数据库，确认密钥  
2. 可选上传 Nginx 站点配置  
3. 生成并下载  

1Panel：YAML → 编排，`.env` → 环境变量。

```bash
mkdir -p pgdata state backups
chmod 600 .env
docker compose up -d
```

可选：`scripts/docker/deploy.sh up`。

## 注意

- 勿公开 `.env`
- 仅 proxy 映射宿主端口
- cosign=`off` 时需双钥匙（见生成的 `.env`）
