# Myriad 安装配置生成器

生成自托管 Myriad 所需的配置文件。

## 功能

- `docker-compose.yml`：启动全部服务
- `.env`：保存密钥、域名和版本
- Nginx 配置：将 HTTPS 流量转到 proxy
- `DEPLOY.md`：启动、更新和救援步骤

## 使用方法

1. 填写域名。
2. 设置 PostgreSQL 版本、数据库名和用户名，确认自动生成的密钥。
3. 如有现成的 Nginx SSL 配置，可选择上传。
4. 点击“生成配置文件”并下载结果。

在 1Panel 中，将 `docker-compose.yml` 粘到“编排”，将 `.env` 全文粘到“环境变量”。
Nginx 请上传当前域名的站点配置，不要上传包含其他站点的完整 `nginx.conf`。

## 生成的文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | 服务编排 |
| `.env` | 密钥、域名和版本 |
| `<domain>.conf` | HTTPS 反向代理 |
| `DEPLOY.md` | 部署步骤 |

## 启动摘要

```bash
mkdir -p pgdata state state/snapshots state/cache backups
chmod 600 .env
docker compose up -d
```

## 注意事项

- 不要公开或提交 `.env`。
- 1Panel 默认只在 `127.0.0.1:8080` 提供 proxy；也可选择所有网卡和其他端口。
- Nginx 只反代到 proxy，不要开放其他服务端口。
- PostgreSQL 默认使用 18，数据库名、用户名、密码、CPU 和内存都可设置。
- 更换 PostgreSQL 主版本前需先迁移数据。
- 不要使用 `:latest` 镜像标签。
