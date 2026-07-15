// Myriad Config Generator v1.0.0
// 生成 proxy + updater 单运行槽生产部署配置
// 对齐 Myriad docker-compose.yml / .env.production.example / docs/updater-spec.md
// 镜像 tag 在运行时从 Docker Hub 解析最新 versioned 标签（禁止 :latest）

// ========================================
// 配置模板（带占位符）
// ========================================

// 与官方 docker-compose.yml 对齐：proxy 唯一宿主端口、pgdata bind mount、
// 镜像 tag 由 .env 中 MYRIAD_TAG/PROXY_TAG/UPDATER_TAG 驱动。
var DOCKER_COMPOSE_TEMPLATE = `# Myriad Docker Compose (v2 — proxy + updater)
# 由 Myriad 安装配置生成器生成
#
# 架构:
#   proxy (\${HTTP_PORT:-80}) ──┬──► frontend:1102
#                              └──► backend:1103 ──► postgres
#   updater (内网) — 快照 pgdata / 切换版本 tag / 维护模式
#
# 升级: 管理后台 → 关于 → 更新管理
# 文档: docs/updater-spec.md / docs/UPDATER_QUICKSTART.md
#
# 首次启动:
#   1. 将本文件与 .env 放在同一目录
#   2. mkdir -p pgdata state state/snapshots state/cache backups
#   3. docker compose up -d
#   或使用仓库 scripts/docker/deploy.sh up

services:
  postgres:
    image: postgres:{{DB_VERSION}}-alpine
    container_name: myriad-postgres
    environment:
      POSTGRES_DB: myriad
      POSTGRES_USER: myriad
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C --lc-collate=C --lc-ctype=C"
      POSTGRES_SHARED_BUFFERS: 512MB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 1536MB
      POSTGRES_MAINTENANCE_WORK_MEM: 128MB
      POSTGRES_CHECKPOINT_COMPLETION_TARGET: 0.9
      POSTGRES_WAL_BUFFERS: 16MB
      POSTGRES_DEFAULT_STATISTICS_TARGET: 100
      POSTGRES_RANDOM_PAGE_COST: 1.1
      POSTGRES_EFFECTIVE_IO_CONCURRENCY: 200
      POSTGRES_WORK_MEM: 4MB
      POSTGRES_MIN_WAL_SIZE: 1GB
      POSTGRES_MAX_WAL_SIZE: 4GB
      POSTGRES_MAX_WORKER_PROCESSES: 4
      POSTGRES_MAX_PARALLEL_WORKERS_PER_GATHER: 2
      POSTGRES_MAX_PARALLEL_WORKERS: 4
      POSTGRES_MAX_PARALLEL_MAINTENANCE_WORKERS: 2
      TZ: Asia/Shanghai
    volumes:
      # PostgreSQL 18+ 使用 /var/lib/postgresql；挂载父目录也兼容 16/17。
      # IMPORTANT: bind mount，不可改为 named volume。updater 依赖文件级快照。
      - ./pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myriad -d myriad"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks: [myriad-net]
    restart: unless-stopped
    security_opt: [no-new-privileges:true]
    read_only: false
    tmpfs: [/tmp, /run]
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  backend:
    image: \${BACKEND_IMAGE:-docker.io/somekawahitomi/myriad-backend}:\${MYRIAD_TAG}
    container_name: myriad-backend
    deploy:
      resources:
        limits:
          cpus: '{{BACKEND_CPU_LIMIT}}'
          memory: {{BACKEND_MEM_LIMIT}}
        reservations:
          cpus: '0.5'
          memory: 512M
    environment:
      DATABASE_URL: postgres://myriad:\${POSTGRES_PASSWORD}@postgres:5432/myriad
      SERVER_HOST: 0.0.0.0
      SERVER_PORT: 1103
      JWT_SECRET: \${JWT_SECRET}
      # bundled proxy 会覆盖客户端伪造的转发头，backend 可据此读取真实来源 IP
      TRUST_PROXY_HEADERS: "true"
      CORS_ORIGINS: \${CORS_ORIGINS:-http://localhost}
      CSP_CONNECT_SRC: \${CSP_CONNECT_SRC:-'self' https:}
      ENVIRONMENT: \${ENVIRONMENT:-production}
      FRONTEND_URL: \${FRONTEND_URL:-}
      BASE_URL: \${BASE_URL:-}
      RUST_LOG: \${RUST_LOG:-info}
      TZ: Asia/Shanghai
      MYRIAD_VERSION: \${MYRIAD_TAG}
      # backend 持有 UPDATE_TOKEN，浏览器只走 admin session
      MYRIAD_UPDATER_URL: http://updater:1101
      UPDATE_TOKEN: \${UPDATE_TOKEN}
    # 不暴露宿主端口；仅 proxy 对外
    depends_on:
      postgres: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:1103/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    volumes:
      - backend_cache:/app/cache
      - backend_data:/app/data
    networks: [myriad-net]
    restart: unless-stopped
    security_opt: [no-new-privileges:true]
    read_only: false
    tmpfs: [/tmp]
    user: "0:0"
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  frontend:
    image: \${FRONTEND_IMAGE:-docker.io/somekawahitomi/myriad-frontend}:\${MYRIAD_TAG}
    container_name: myriad-frontend
    deploy:
      resources:
        limits:
          cpus: '{{FRONTEND_CPU_LIMIT}}'
          memory: {{FRONTEND_MEM_LIMIT}}
        reservations:
          cpus: '0.25'
          memory: 256M
    environment:
      PUBLIC_API_URL: \${PUBLIC_API_URL:-}
      NODE_ENV: production
      TZ: Asia/Shanghai
      MYRIAD_VERSION: \${MYRIAD_TAG}
    depends_on:
      backend: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:1102"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks: [myriad-net]
    restart: unless-stopped
    security_opt: [no-new-privileges:true]
    read_only: true
    tmpfs: [/tmp]
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  proxy:
    image: \${PROXY_IMAGE:-docker.io/somekawahitomi/myriad-proxy}:\${PROXY_TAG}
    container_name: myriad-proxy
    ports:
      - "\${HTTP_PORT:-80}:80"
    environment:
      PROXY_STATE_FILE: /state/maintenance.json
      PROXY_BACKEND_UPSTREAM: http://backend:1103
      PROXY_FRONTEND_UPSTREAM: http://frontend:1102
      PROXY_UPDATER_UPSTREAM: http://updater:1101
      # 默认关闭 /_updater/* 直连；推荐 /api/admin/updater/*
      PROXY_ALLOW_DIRECT_UPDATER: \${PROXY_ALLOW_DIRECT_UPDATER:-false}
      MYRIAD_VERSION: \${PROXY_TAG}
      TZ: Asia/Shanghai
    volumes:
      - ./state:/state:ro
    networks: [myriad-net]
    restart: unless-stopped
    security_opt: [no-new-privileges:true]
    read_only: true
    tmpfs: [/tmp]
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  updater:
    image: \${UPDATER_IMAGE:-docker.io/somekawahitomi/myriad-updater}:\${UPDATER_TAG}
    container_name: myriad-updater
    environment:
      UPDATE_TOKEN: \${UPDATE_TOKEN}
      CHANNEL: \${CHANNEL:-stable}
      GITHUB_TOKEN: \${GITHUB_TOKEN:-}
      REGISTRY_MIRROR: \${REGISTRY_MIRROR:-}
      MYRIAD_GITHUB_REPO: \${MYRIAD_GITHUB_REPO:-Myriad-You/Myriad}
      CHECK_INTERVAL_SECS: \${CHECK_INTERVAL_SECS:-3600}
      UPDATER_ENV_FILE: /host/compose/.env
      # 当前 updater 的安全默认值是 strict
      COSIGN_VERIFY: \${COSIGN_VERIFY:-strict}
      COMPOSE_PROJECT_NAME: \${COMPOSE_PROJECT_NAME:-myriad}
      MYRIAD_DOCKER_NETWORK: \${MYRIAD_DOCKER_NETWORK:-myriad-net}
      MYRIAD_VERSION: \${UPDATER_TAG}
      TZ: Asia/Shanghai
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./pgdata:/host/pgdata
      - ./state:/state
      - ./backups:/backups
      - ./:/host/compose
    networks: [myriad-net]
    restart: unless-stopped
    # 故意不设 read_only：需要写 state / 快照 / .env
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

volumes:
  backend_cache: { driver: local }
  backend_data: { driver: local }

networks:
  myriad-net:
    name: \${MYRIAD_DOCKER_NETWORK:-myriad-net}
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
`;

// .env 生产模板（密钥与域名由生成器填入）
var ENV_TEMPLATE = `# =============================================================================
# Myriad Production Environment Configuration
# 由 Myriad 安装配置生成器生成 — 请妥善保管，勿提交到 Git
# =============================================================================

# -----------------------------------------------------------------------------
# UPDATER REQUIRED
# -----------------------------------------------------------------------------
# 镜像 versioned tag（生成时解析自 Docker Hub 最新可用版本）。禁止 :latest。
# 之后由 updater 在升级时改写。
MYRIAD_TAG={{MYRIAD_TAG}}
PROXY_TAG={{PROXY_TAG}}
UPDATER_TAG={{UPDATER_TAG}}

# 业务镜像仓库（不含 tag）。commit 更新与 last-good 回滚固定依赖这两项。
BACKEND_IMAGE=docker.io/somekawahitomi/myriad-backend
FRONTEND_IMAGE=docker.io/somekawahitomi/myriad-frontend

COMPOSE_PROJECT_NAME=myriad

# 可选：同机多套部署时再改
# MYRIAD_DOCKER_NETWORK=myriad-net

# Updater API 鉴权 token（≥32 字符，仅服务端持有）
UPDATE_TOKEN={{UPDATE_TOKEN}}

# stable | preview（当前 updater 仅接受这两个值）
CHANNEL={{CHANNEL}}

# release（GitHub Release）| commit（CI dev-<sha>）；首次部署默认 release
UPDATE_MODE=release

# 可选：提升 GitHub API rate limit
# GITHUB_TOKEN=

# 可选：镜像 mirror 前缀
# REGISTRY_MIRROR=

MYRIAD_GITHUB_REPO=Myriad-You/Myriad
CHECK_INTERVAL_SECS=3600

# proxy 宿主端口（外层 Nginx 反代到这里）
HTTP_PORT={{HTTP_PORT}}

# 是否启用 /_updater/* 直连救援通道（默认 false，推荐走 admin API）
PROXY_ALLOW_DIRECT_UPDATER=false

# cosign 签名验证: off | soft | strict
COSIGN_VERIFY={{COSIGN_VERIFY}}

# -----------------------------------------------------------------------------
# REQUIRED SECURITY SETTINGS
# -----------------------------------------------------------------------------
POSTGRES_PASSWORD={{POSTGRES_PASSWORD}}
JWT_SECRET={{JWT_SECRET}}

# -----------------------------------------------------------------------------
# CORS / PUBLIC URL
# -----------------------------------------------------------------------------
# 生产环境必须配置真实域名，禁止 * 或留空
CORS_ORIGINS={{CORS_ORIGINS}}

# 对外公开访问地址（联邦 / OAuth 依赖）
BASE_URL=https://{{MAIN_DOMAIN}}
FRONTEND_URL=https://{{MAIN_DOMAIN}}

# 前端 API URL（留空则使用相对路径，推荐）
PUBLIC_API_URL=

# 日志级别
# RUST_LOG=info

# =============================================================================
# 安全检查清单
# =============================================================================
# ✅ POSTGRES_PASSWORD / JWT_SECRET / UPDATE_TOKEN 已生成
# ✅ CORS_ORIGINS 为实际 HTTPS 域名
# ✅ pgdata 为 ./pgdata bind mount（updater 快照依赖）
# ✅ 外层 HTTPS 入口代理到 HTTP_PORT，不要直连 backend:1103
# ✅ .env 权限建议 chmod 600
# =============================================================================
`;

// 默认外层 Nginx：全部流量反代到 Myriad proxy 的 HTTP_PORT
// （不要再拆 frontend/backend 端口）
var DEFAULT_NGINX_TEMPLATE = `server {
    listen 80;
    server_name {{MAIN_DOMAIN}};

    index index.php index.html index.htm default.php default.htm default.html;
    access_log /www/sites/{{MAIN_DOMAIN}}/log/access.log main;
    error_log /www/sites/{{MAIN_DOMAIN}}/log/error.log;

    # ----------------------------------------------------------------------
    # 全部流量交给 Myriad proxy（唯一宿主入口）
    # proxy 内部再路由 frontend / backend / 维护页 / updater 救援
    # ----------------------------------------------------------------------
    location / {
        proxy_pass http://127.0.0.1:{{HTTP_PORT}};

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket / 长连接（联邦等）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        proxy_buffering off;
        client_max_body_size 50M;
    }

    # 可选：直接探测 proxy 自身健康
    location = /healthz {
        proxy_pass http://127.0.0.1:{{HTTP_PORT}}/healthz;
        access_log off;
    }

    if ( $uri ~ "^/\\.well-known/.*\\.(php|jsp|py|js|css|lua|ts|go|zip|tar\\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }
    root /www/sites/{{MAIN_DOMAIN}}/index;
    error_page 404 /404.html;
}
`;

// 可选：额外域名（如 www）反代到同一 proxy
var DEFAULT_EXTRA_NGINX_TEMPLATE = `server {
    listen 80;
    server_name {{EXTRA_DOMAIN}};

    index index.php index.html index.htm default.php default.htm default.html;
    access_log /www/sites/{{EXTRA_DOMAIN}}/log/access.log main;
    error_log /www/sites/{{EXTRA_DOMAIN}}/log/error.log;

    location / {
        proxy_pass http://127.0.0.1:{{HTTP_PORT}};

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        proxy_buffering off;
        client_max_body_size 50M;
    }

    if ( $uri ~ "^/\\.well-known/.*\\.(php|jsp|py|js|css|lua|ts|go|zip|tar\\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }
    root /www/sites/{{EXTRA_DOMAIN}}/index;
    error_page 404 /404.html;
}
`;

// 部署说明（生成结果中的文本卡片）
var DEPLOY_NOTES_TEMPLATE = `# Myriad 部署说明

将 \`docker-compose.yml\` 和 \`.env\` 放在同一目录。\`.env\` 包含密钥，不要公开或提交到 Git。

## 启动

\`\`\`bash
cd /path/to/myriad-deploy
mkdir -p pgdata state state/snapshots state/cache backups
chmod 600 .env
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f --tail=100
\`\`\`

## HTTPS

- 将 https://{{MAIN_DOMAIN}} 反代到 \`127.0.0.1:{{HTTP_PORT}}\`。
- 不要把 backend、frontend、postgres 或 updater 端口暴露到公网。

## 首次使用和更新

1. 打开 https://{{MAIN_DOMAIN}} 并完成管理员初始化。
2. 以后在“设置 → 关于 → 更新管理”中升级。

当前更新通道：\`{{CHANNEL}}\`。

## 数据库

- 数据保存在 \`./pgdata\`。
- 更换 PostgreSQL 主版本前需先执行 \`pg_upgrade\` 或 dump/restore。

## 救援

\`\`\`bash
docker exec myriad-updater myriad-rescue status
docker exec myriad-updater myriad-rescue exit-maintenance --force
\`\`\`

## 当前版本

| 变量 | 当前值 | 说明 |
|------|--------|------|
| MYRIAD_TAG | {{MYRIAD_TAG}} | backend + frontend |
| PROXY_TAG | {{PROXY_TAG}} | proxy |
| UPDATER_TAG | {{UPDATER_TAG}} | 更新器 |

不要使用 \`:latest\`，否则无法可靠回滚。
`;

// ========================================
// 工具函数
// ========================================

// 生成 URL/连接串安全的随机串（避免 DATABASE_URL 被特殊字符破坏）
function generateSecret(length) {
  var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var out = '';
  var array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (var i = 0; i < length; i++) {
    out += charset[array[i] % charset.length];
  }
  return out;
}

// UPDATE_TOKEN：URL-safe 风格（对齐 deploy.sh）
function generateUpdateToken() {
  var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var out = '';
  var array = new Uint8Array(48);
  crypto.getRandomValues(array);
  for (var i = 0; i < 48; i++) {
    out += charset[array[i] % charset.length];
  }
  return out;
}

function generateJwtSecret() {
  return generateSecret(64);
}

function generatePassword() {
  return generateSecret(40);
}

// 替换 Nginx 配置中的域名（含宝塔路径与常见 Let's Encrypt 路径）
function replaceNginxDomain(config, newDomain) {
  var oldDomain = extractDomain(config);

  config = config.replace(/server_name\s+[^;]+;/g, function() {
    return 'server_name ' + newDomain + ';';
  });

  // 宝塔 / 1Panel 常见站点目录
  var domainRegex = new RegExp('/www/sites/[^/]+/', 'g');
  config = config.replace(domainRegex, '/www/sites/' + newDomain + '/');

  var includeRegex = new RegExp('include\\s+/www/sites/[^/]+/', 'g');
  config = config.replace(includeRegex, 'include /www/sites/' + newDomain + '/');

  // Let's Encrypt live / archive 路径
  if (oldDomain && oldDomain !== newDomain) {
    var leLive = new RegExp('/etc/letsencrypt/live/' + escapeRegExp(oldDomain) + '/', 'g');
    var leArchive = new RegExp('/etc/letsencrypt/archive/' + escapeRegExp(oldDomain) + '/', 'g');
    config = config.replace(leLive, '/etc/letsencrypt/live/' + newDomain + '/');
    config = config.replace(leArchive, '/etc/letsencrypt/archive/' + newDomain + '/');
  } else {
    config = config.replace(/\/etc\/letsencrypt\/live\/[^/]+\//g, '/etc/letsencrypt/live/' + newDomain + '/');
    config = config.replace(/\/etc\/letsencrypt\/archive\/[^/]+\//g, '/etc/letsencrypt/archive/' + newDomain + '/');
  }

  return config;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================
// Docker Hub 最新 versioned tag 解析
// ========================================

var DOCKER_REPOS = {
  backend: 'myriad-backend',
  frontend: 'myriad-frontend',
  proxy: 'myriad-proxy',
  updater: 'myriad-updater'
};

var tagFetchState = {
  loading: false,
  /** @type {Promise<object|null>|null} */
  inflight: null,
  lastError: '',
  lastResolved: null,
  channelTouched: false
};

function parseVersionTag(tag) {
  if (!tag || typeof tag !== 'string') return null;
  // 接受 v1.2.3 / 1.2.3 / v1.2.3-rc.1 / v1.2.3-beta.1 / v1.2.3-nightly.20260101
  var m = tag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/i);
  if (!m) return null;
  return {
    raw: tag,
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    pre: m[4] || null
  };
}

function comparePreRelease(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;  // 无 pre 的正式版更新
  if (!b) return -1;
  var pa = a.split('.');
  var pb = b.split('.');
  var n = Math.max(pa.length, pb.length);
  for (var i = 0; i < n; i++) {
    var xa = pa[i];
    var xb = pb[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    var na = /^\d+$/.test(xa) ? parseInt(xa, 10) : null;
    var nb = /^\d+$/.test(xb) ? parseInt(xb, 10) : null;
    if (na !== null && nb !== null) {
      if (na !== nb) return na - nb;
    } else {
      if (xa < xb) return -1;
      if (xa > xb) return 1;
    }
  }
  return 0;
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return comparePreRelease(a.pre, b.pre);
}

function pickLatestVersionedTag(tagNames) {
  var parsed = [];
  for (var i = 0; i < tagNames.length; i++) {
    var p = parseVersionTag(tagNames[i]);
    if (p) parsed.push(p);
  }
  if (!parsed.length) return null;
  parsed.sort(function(a, b) { return compareSemver(b, a); });
  return parsed[0].raw;
}

function pickLatestCommonVersionedTag(tagLists) {
  if (!tagLists || !tagLists.length) return null;
  var sets = tagLists.map(function(list) {
    var s = {};
    for (var i = 0; i < list.length; i++) s[list[i]] = true;
    return s;
  });
  var candidates = [];
  var first = tagLists[0] || [];
  for (var i = 0; i < first.length; i++) {
    var tag = first[i];
    if (!parseVersionTag(tag)) continue;
    var ok = true;
    for (var j = 1; j < sets.length; j++) {
      if (!sets[j][tag]) { ok = false; break; }
    }
    if (ok) candidates.push(tag);
  }
  return pickLatestVersionedTag(candidates);
}

function suggestChannelFromTag(tag) {
  var parsed = parseVersionTag(String(tag || ''));
  return parsed && parsed.pre ? 'preview' : 'stable';
}

function extractTagNamesFromHubPayload(data) {
  if (!data) return [];
  // Tapp.api 返回 data 字段；有时可能再包一层
  var payload = data;
  if (payload.data && (payload.data.results || Array.isArray(payload.data))) {
    payload = payload.data;
  }
  var results = payload.results;
  if (!Array.isArray(results)) return [];
  var names = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i] && results[i].name) names.push(results[i].name);
  }
  return names;
}

async function fetchDockerHubTags(repo) {
  // 优先走声明式 Tapp.api（沙箱内禁止裸 fetch）
  if (typeof Tapp !== 'undefined' && typeof Tapp.api === 'function') {
    var data = await Tapp.api('dockerHubTags', { repo: repo });
    return extractTagNamesFromHubPayload(data);
  }
  // 开发/测试环境降级
  if (typeof fetch === 'function') {
    var url = 'https://hub.docker.com/v2/repositories/somekawahitomi/' +
      encodeURIComponent(repo) +
      '/tags?page_size=100&ordering=-last_updated';
    var resp = await fetch(url);
    if (!resp.ok) throw new Error('Docker Hub HTTP ' + resp.status);
    var json = await resp.json();
    return extractTagNamesFromHubPayload(json);
  }
  throw new Error('当前环境无法请求 Docker Hub');
}

function setTagStatus(message, kind) {
  var el = document.getElementById('tag-status');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('is-loading', 'is-ok', 'is-error');
  if (kind) el.classList.add('is-' + kind);
}

function shouldFillTagInput(input, force) {
  if (!input) return false;
  if (force) return true;
  var v = (input.value || '').trim();
  if (!v) return true;
  // 仅覆盖自动填充过的字段，保留用户手改
  return input.dataset.autoFilled === 'true';
}

function applyResolvedTags(resolved, inputs, channelSelect, opts) {
  if (!resolved) return;
  opts = opts || {};
  var force = !!opts.force;

  if (shouldFillTagInput(inputs.myriad, force) && resolved.myriadTag) {
    inputs.myriad.value = resolved.myriadTag;
    inputs.myriad.dataset.autoFilled = 'true';
  }
  if (shouldFillTagInput(inputs.proxy, force) && resolved.proxyTag) {
    inputs.proxy.value = resolved.proxyTag;
    inputs.proxy.dataset.autoFilled = 'true';
  }
  if (shouldFillTagInput(inputs.updater, force) && resolved.updaterTag) {
    inputs.updater.value = resolved.updaterTag;
    inputs.updater.dataset.autoFilled = 'true';
  }

  // state 始终反映输入框当前值
  state.myriadTag = ((inputs.myriad && inputs.myriad.value) || resolved.myriadTag || '').trim();
  state.proxyTag = ((inputs.proxy && inputs.proxy.value) || resolved.proxyTag || '').trim();
  state.updaterTag = ((inputs.updater && inputs.updater.value) || resolved.updaterTag || '').trim();

  if (channelSelect && !tagFetchState.channelTouched) {
    var suggested = suggestChannelFromTag(resolved.myriadTag || resolved.proxyTag || resolved.updaterTag);
    channelSelect.value = suggested;
    state.channel = suggested;
  }
}

async function resolveLatestImageTags() {
  // 并行拉取，减少打开页到可生成的等待时间
  var results = await Promise.all([
    fetchDockerHubTags(DOCKER_REPOS.backend),
    fetchDockerHubTags(DOCKER_REPOS.frontend),
    fetchDockerHubTags(DOCKER_REPOS.proxy),
    fetchDockerHubTags(DOCKER_REPOS.updater)
  ]);
  var backendTags = results[0];
  var frontendTags = results[1];
  var proxyTags = results[2];
  var updaterTags = results[3];

  var myriadTag = pickLatestCommonVersionedTag([backendTags, frontendTags]);
  // 若 backend/frontend 暂无交集，分别取最新再优先 backend
  if (!myriadTag) {
    myriadTag = pickLatestVersionedTag(backendTags) || pickLatestVersionedTag(frontendTags);
  }
  var proxyTag = pickLatestVersionedTag(proxyTags) || myriadTag;
  var updaterTag = pickLatestVersionedTag(updaterTags) || myriadTag;

  if (!myriadTag && !proxyTag && !updaterTag) {
    throw new Error('Docker Hub 上未找到可用的 versioned tag（vX.Y.Z）');
  }

  return {
    myriadTag: myriadTag || '',
    proxyTag: proxyTag || '',
    updaterTag: updaterTag || '',
    backendCount: backendTags.length,
    frontendCount: frontendTags.length,
    proxyCount: proxyTags.length,
    updaterCount: updaterTags.length
  };
}

async function refreshLatestTags(inputs, channelSelect, opts) {
  opts = opts || {};
  // 复用进行中的请求，避免「启动拉取未完成时点生成」误失败
  if (tagFetchState.inflight) {
    return tagFetchState.inflight;
  }

  tagFetchState.loading = true;
  tagFetchState.lastError = '';

  var btn = document.getElementById('btn-refresh-tags');
  if (btn) btn.disabled = true;
  setTagStatus('正在从 Docker Hub 获取最新 versioned tag…', 'loading');

  tagFetchState.inflight = (async function() {
    try {
      var resolved = await resolveLatestImageTags();
      tagFetchState.lastResolved = resolved;
      // 手动点「刷新」时强制覆盖；自动拉取只填空/自动字段
      applyResolvedTags(resolved, inputs, channelSelect, { force: !!opts.force });
      setTagStatus(
        '已解析最新版本：MYRIAD=' + resolved.myriadTag +
        ' · PROXY=' + resolved.proxyTag +
        ' · UPDATER=' + resolved.updaterTag +
        '（禁止 :latest）',
        'ok'
      );
      if (opts.notify) {
        showNotification('已更新为 Docker Hub 最新 versioned tag', 'success');
      }
      return resolved;
    } catch (err) {
      var msg = (err && err.message) ? err.message : String(err);
      tagFetchState.lastError = msg;
      setTagStatus('获取失败：' + msg + '。请手动填写 versioned tag。', 'error');
      if (opts.notify) {
        showNotification('获取最新版本失败：' + msg, 'error');
      }
      return null;
    } finally {
      tagFetchState.loading = false;
      tagFetchState.inflight = null;
      if (btn) btn.disabled = false;
    }
  })();

  return tagFetchState.inflight;
}

// 将旧式 backend/frontend 直连端口统一改为 proxy HTTP_PORT
// 并尽量把 location 合并为单入口反代语义
function replaceNginxUpstreamToProxy(config, httpPort) {
  // 常见旧端口与自定义端口 → proxy
  config = config.replace(/127\.0\.0\.1:(3000|4321|1102|1103|80|8080)\b/g, '127.0.0.1:' + httpPort);
  config = config.replace(/localhost:(3000|4321|1102|1103|80|8080)\b/g, 'localhost:' + httpPort);

  // 若用户配置已是 proxy_pass 到自定义端口，再统一一次
  config = config.replace(/proxy_pass\s+http:\/\/127\.0\.0\.1:\d+/g, 'proxy_pass http://127.0.0.1:' + httpPort);
  config = config.replace(/proxy_pass\s+http:\/\/localhost:\d+/g, 'proxy_pass http://localhost:' + httpPort);

  return config;
}

function extractDomain(config) {
  var match = config.match(/server_name\s+([^;]+);/);
  if (match) {
    return match[1].trim().split(/\s+/)[0];
  }
  return null;
}

function normalizeDomain(domain) {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function isValidDomain(domain) {
  if (!domain || domain.length > 253) return false;
  // 宽松校验：hostname 形态
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
    || domain === 'localhost';
}

function buildCorsOrigins(mainDomain, extraDomain) {
  var origins = ['https://' + mainDomain];
  if (extraDomain && extraDomain !== mainDomain) {
    origins.push('https://' + extraDomain);
  }
  // 常见 www 变体：若主域不是 www 且用户没填额外域，不自动加 www（避免 CORS 过宽）
  return origins.join(',');
}

// ========================================
// 状态
// ========================================

var state = {
  mainDomain: '',
  extraDomain: '',
  dbPassword: '',
  jwtSecret: '',
  updateToken: '',
  nginxConfig: null,
  nginxFileName: '',
  extraNginxConfig: null,
  extraNginxFileName: '',
  httpPort: 80,
  dbVersion: '18',
  // 运行时由 Docker Hub 解析填充，不在源码中写死版本
  myriadTag: '',
  proxyTag: '',
  updaterTag: '',
  channel: 'stable',
  cosignVerify: 'strict',
  // backend / frontend 可按宿主机条件限制；PostgreSQL 不设置资源硬上限
  backendCpuLimit: '4.0',
  backendMemLimit: '4G',
  frontendCpuLimit: '2.0',
  frontendMemLimit: '2G'
};

// ========================================
// UI 交互
// ========================================

function initPage() {
  var mainDomainInput = document.getElementById('main-domain');
  var extraDomainInput = document.getElementById('extra-domain');
  var dbPasswordInput = document.getElementById('db-password');
  var jwtSecretInput = document.getElementById('jwt-secret');
  var updateTokenInput = document.getElementById('update-token');

  var genDbPasswordBtn = document.getElementById('gen-db-password');
  var genJwtSecretBtn = document.getElementById('gen-jwt-secret');
  var genUpdateTokenBtn = document.getElementById('gen-update-token');
  var generateAllBtn = document.getElementById('btn-generate-all');

  var uploadNginx = document.getElementById('upload-nginx-conf');
  var fileNginx = document.getElementById('file-nginx-conf');
  var uploadExtraNginx = document.getElementById('upload-extra-nginx-conf');
  var fileExtraNginx = document.getElementById('file-extra-nginx-conf');

  var httpPortInput = document.getElementById('http-port');
  var dbVersionSelect = document.getElementById('db-version');
  var myriadTagInput = document.getElementById('myriad-tag');
  var proxyTagInput = document.getElementById('proxy-tag');
  var updaterTagInput = document.getElementById('updater-tag');
  var channelSelect = document.getElementById('channel');
  var cosignSelect = document.getElementById('cosign-verify');

  var backendCpuLimitInput = document.getElementById('backend-cpu-limit');
  var backendMemLimitInput = document.getElementById('backend-mem-limit');
  var frontendCpuLimitInput = document.getElementById('frontend-cpu-limit');
  var frontendMemLimitInput = document.getElementById('frontend-mem-limit');
  var refreshTagsBtn = document.getElementById('btn-refresh-tags');

  var tagInputs = {
    myriad: myriadTagInput,
    proxy: proxyTagInput,
    updater: updaterTagInput
  };

  function markTagManual(input) {
    if (!input) return;
    input.dataset.autoFilled = 'false';
  }

  [myriadTagInput, proxyTagInput, updaterTagInput].forEach(function(input) {
    if (!input) return;
    input.addEventListener('input', function() {
      markTagManual(input);
    });
  });

  if (channelSelect) {
    channelSelect.addEventListener('change', function() {
      tagFetchState.channelTouched = true;
    });
  }

  genDbPasswordBtn.addEventListener('click', function() {
    dbPasswordInput.value = generatePassword();
    animateButton(genDbPasswordBtn);
  });

  genJwtSecretBtn.addEventListener('click', function() {
    jwtSecretInput.value = generateJwtSecret();
    animateButton(genJwtSecretBtn);
  });

  genUpdateTokenBtn.addEventListener('click', function() {
    updateTokenInput.value = generateUpdateToken();
    animateButton(genUpdateTokenBtn);
  });

  if (refreshTagsBtn) {
    refreshTagsBtn.addEventListener('click', function() {
      // 用户明确刷新：覆盖自动/当前值为最新
      refreshLatestTags(tagInputs, channelSelect, { notify: true, force: true });
    });
  }

  setupFileUpload(uploadNginx, fileNginx, function(content, fileName) {
    state.nginxConfig = content;
    state.nginxFileName = fileName;
    showUploadSuccess(uploadNginx, fileName);
  }, function() {
    state.nginxConfig = null;
    state.nginxFileName = '';
  });

  if (uploadExtraNginx && fileExtraNginx) {
    setupFileUpload(uploadExtraNginx, fileExtraNginx, function(content, fileName) {
      state.extraNginxConfig = content;
      state.extraNginxFileName = fileName;
      showUploadSuccess(uploadExtraNginx, fileName);
    }, function() {
      state.extraNginxConfig = null;
      state.extraNginxFileName = '';
    });
  }

  generateAllBtn.addEventListener('click', async function() {
    if (generateAllBtn.disabled) return;
    generateAllBtn.disabled = true;

    try {
      var mainDomain = normalizeDomain(mainDomainInput.value);
      var extraDomain = normalizeDomain(extraDomainInput.value || '');
      var dbPassword = dbPasswordInput.value.trim();
      var jwtSecret = jwtSecretInput.value.trim();
      var updateToken = updateTokenInput.value.trim();

      if (!mainDomain) {
        showNotification('请输入主域名', 'error');
        mainDomainInput.focus();
        return;
      }

      if (!isValidDomain(mainDomain)) {
        showNotification('主域名格式无效', 'error');
        mainDomainInput.focus();
        return;
      }

      if (extraDomain && !isValidDomain(extraDomain)) {
        showNotification('额外域名格式无效', 'error');
        extraDomainInput.focus();
        return;
      }

      // 密钥不足时当场补齐并继续，避免「生成后还要再点一次」
      if (!dbPassword || dbPassword.length < 32) {
        dbPassword = generatePassword();
        dbPasswordInput.value = dbPassword;
      }
      if (!jwtSecret || jwtSecret.length < 32) {
        jwtSecret = generateJwtSecret();
        jwtSecretInput.value = jwtSecret;
      }
      if (!updateToken || updateToken.length < 32) {
        updateToken = generateUpdateToken();
        updateTokenInput.value = updateToken;
      }

      state.mainDomain = mainDomain;
      state.extraDomain = extraDomain;
      state.dbPassword = dbPassword;
      state.jwtSecret = jwtSecret;
      state.updateToken = updateToken;

      state.httpPort = parseInt(httpPortInput.value, 10) || 80;
      if (state.httpPort < 1 || state.httpPort > 65535) {
        showNotification('HTTP 端口无效', 'error');
        httpPortInput.focus();
        return;
      }

      state.dbVersion = dbVersionSelect.value || '18';

      // 若 tag 为空：等待进行中的拉取，或发起新拉取（不强制覆盖手改字段）
      var myriadTag = (myriadTagInput.value || '').trim();
      var proxyTag = (proxyTagInput.value || '').trim();
      var updaterTag = (updaterTagInput.value || '').trim();
      if (!myriadTag || !proxyTag || !updaterTag) {
        var resolved = await refreshLatestTags(tagInputs, channelSelect, { notify: false, force: false });
        if (!resolved && (!myriadTag || !proxyTag || !updaterTag)) {
          showNotification('镜像 tag 为空且无法自动获取，请点击「刷新最新版本」或手动填写', 'error');
          myriadTagInput.focus();
          return;
        }
        myriadTag = (myriadTagInput.value || '').trim();
        proxyTag = (proxyTagInput.value || '').trim();
        updaterTag = (updaterTagInput.value || '').trim();
      }

      state.myriadTag = myriadTag;
      state.proxyTag = proxyTag;
      state.updaterTag = updaterTag;
      state.channel = channelSelect.value || 'stable';
      state.cosignVerify = cosignSelect.value || 'strict';

      state.backendCpuLimit = backendCpuLimitInput.value.trim() || '4.0';
      state.backendMemLimit = backendMemLimitInput.value.trim() || '4G';
      state.frontendCpuLimit = frontendCpuLimitInput.value.trim() || '2.0';
      state.frontendMemLimit = frontendMemLimitInput.value.trim() || '2G';

      if (!state.myriadTag || !state.proxyTag || !state.updaterTag) {
        showNotification('请填写完整的镜像 tag', 'error');
        return;
      }

      if (/^latest$/i.test(state.myriadTag) || /^latest$/i.test(state.proxyTag) || /^latest$/i.test(state.updaterTag)) {
        showNotification('禁止使用 :latest 标签。请使用 versioned tag，或点「刷新最新版本」', 'error');
        return;
      }

      if (!parseVersionTag(state.myriadTag) || !parseVersionTag(state.proxyTag) || !parseVersionTag(state.updaterTag)) {
        showNotification('tag 格式应为 vX.Y.Z 或 vX.Y.Z-rc.N 等 versioned 形式', 'error');
        return;
      }

      generateConfigs();
    } finally {
      generateAllBtn.disabled = false;
    }
  });

  document.querySelectorAll('.btn-copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = btn.getAttribute('data-target');
      var content = document.getElementById('result-' + target).textContent;
      copyToClipboard(content, btn);
    });
  });

  document.querySelectorAll('.btn-download').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = btn.getAttribute('data-target');
      var content = document.getElementById('result-' + target).textContent;
      var filename = btn.getAttribute('data-filename');

      if (target === 'main-nginx') {
        filename = state.mainDomain + '.conf';
      } else if (target === 'extra-nginx') {
        filename = (state.extraDomain || 'extra') + '.conf';
      }

      downloadFile(content, filename);
    });
  });

  // 自动生成密钥
  genDbPasswordBtn.click();
  genJwtSecretBtn.click();
  genUpdateTokenBtn.click();

  // 启动时解析 Docker Hub 最新 versioned tag（不写死版本号）
  refreshLatestTags(tagInputs, channelSelect, { notify: false });
}

function setupFileUpload(uploadBox, fileInput, onLoad, onClear) {
  if (!uploadBox || !fileInput) return;

  uploadBox.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-remove')) {
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files.length > 0) {
      readFile(fileInput.files[0], onLoad);
    }
  });

  uploadBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });

  uploadBox.addEventListener('dragleave', function() {
    uploadBox.classList.remove('dragover');
  });

  uploadBox.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0], onLoad);
    }
  });

  var removeBtn = uploadBox.querySelector('.btn-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      hideUploadSuccess(uploadBox);
      fileInput.value = '';
      if (typeof onClear === 'function') onClear();
    });
  }
}

function readFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    callback(e.target.result, file.name);
  };
  reader.readAsText(file);
}

function showUploadSuccess(uploadBox, fileName) {
  var placeholder = uploadBox.querySelector('.upload-placeholder');
  var success = uploadBox.querySelector('.upload-success');
  var fileNameEl = success.querySelector('.file-name');

  placeholder.hidden = true;
  success.hidden = false;
  fileNameEl.textContent = fileName;
}

function hideUploadSuccess(uploadBox) {
  var placeholder = uploadBox.querySelector('.upload-placeholder');
  var success = uploadBox.querySelector('.upload-success');

  placeholder.hidden = false;
  success.hidden = true;
}

function animateButton(btn) {
  btn.style.transform = 'rotate(180deg)';
  setTimeout(function() {
    btn.style.transform = '';
  }, 300);
}

// ========================================
// 生成配置
// ========================================

function applyPlaceholders(template, map) {
  var out = template;
  Object.keys(map).forEach(function(key) {
    var re = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
    out = out.replace(re, map[key]);
  });
  return out;
}

function generateConfigs() {
  var corsOrigins = buildCorsOrigins(state.mainDomain, state.extraDomain);

  var map = {
    DB_VERSION: state.dbVersion,
    BACKEND_CPU_LIMIT: state.backendCpuLimit,
    BACKEND_MEM_LIMIT: state.backendMemLimit,
    FRONTEND_CPU_LIMIT: state.frontendCpuLimit,
    FRONTEND_MEM_LIMIT: state.frontendMemLimit,
    POSTGRES_PASSWORD: state.dbPassword,
    JWT_SECRET: state.jwtSecret,
    UPDATE_TOKEN: state.updateToken,
    MAIN_DOMAIN: state.mainDomain,
    EXTRA_DOMAIN: state.extraDomain || '',
    CORS_ORIGINS: corsOrigins,
    HTTP_PORT: String(state.httpPort),
    MYRIAD_TAG: state.myriadTag,
    PROXY_TAG: state.proxyTag,
    UPDATER_TAG: state.updaterTag,
    CHANNEL: state.channel,
    COSIGN_VERIFY: state.cosignVerify
  };

  var dockerCompose = applyPlaceholders(DOCKER_COMPOSE_TEMPLATE, map);
  var envFile = applyPlaceholders(ENV_TEMPLATE, map);
  var deployNotes = applyPlaceholders(DEPLOY_NOTES_TEMPLATE, map);

  // 主域名 Nginx
  var mainNginx;
  if (state.nginxConfig) {
    mainNginx = replaceNginxDomain(state.nginxConfig, state.mainDomain);
    mainNginx = replaceNginxUpstreamToProxy(mainNginx, state.httpPort);
  } else {
    mainNginx = applyPlaceholders(DEFAULT_NGINX_TEMPLATE, map);
  }

  // 额外域名 Nginx（可选）
  var hasExtra = !!state.extraDomain;
  var extraNginx = '';
  var cardExtra = document.getElementById('card-extra-nginx');
  if (hasExtra) {
    if (state.extraNginxConfig) {
      extraNginx = replaceNginxDomain(state.extraNginxConfig, state.extraDomain);
      extraNginx = replaceNginxUpstreamToProxy(extraNginx, state.httpPort);
    } else {
      extraNginx = applyPlaceholders(DEFAULT_EXTRA_NGINX_TEMPLATE, map);
    }
    if (cardExtra) cardExtra.hidden = false;
  } else if (cardExtra) {
    cardExtra.hidden = true;
  }

  document.getElementById('result-docker-compose').textContent = dockerCompose;
  document.getElementById('result-env').textContent = envFile;
  document.getElementById('result-main-nginx').textContent = mainNginx;
  document.getElementById('result-deploy-notes').textContent = deployNotes;

  var extraResult = document.getElementById('result-extra-nginx');
  if (extraResult) {
    extraResult.textContent = extraNginx;
  }

  document.getElementById('name-main-nginx').textContent = state.mainDomain + '.conf';
  var nameExtra = document.getElementById('name-extra-nginx');
  if (nameExtra && hasExtra) {
    nameExtra.textContent = state.extraDomain + '.conf';
  }

  var resultsSection = document.getElementById('results-section');
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  showNotification('配置文件生成成功！请同时保存 docker-compose.yml 与 .env', 'success');
}

// ========================================
// 通用工具
// ========================================

function copyToClipboard(text, btn) {
  var originalHTML = btn.innerHTML;

  function onSuccess() {
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> 已复制';

    setTimeout(function() {
      btn.classList.remove('copied');
      btn.innerHTML = originalHTML;
    }, 2000);

    showNotification('已复制到剪贴板', 'success');
  }

  function onError(err) {
    console.error('复制失败:', err);
    showNotification('复制失败，请手动选择复制', 'error');
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(function() {
      fallbackCopy(text, onSuccess, onError);
    });
  } else {
    fallbackCopy(text, onSuccess, onError);
  }
}

function fallbackCopy(text, onSuccess, onError) {
  var textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    if (successful) {
      onSuccess();
    } else {
      onError(new Error('execCommand 返回 false'));
    }
  } catch (err) {
    onError(err);
  }

  document.body.removeChild(textArea);
}

function downloadFile(content, filename) {
  if (typeof Tapp !== 'undefined' && Tapp.file && Tapp.file.download) {
    Tapp.file.download(content, filename, 'text/plain;charset=utf-8')
      .then(function() {
        showNotification('文件下载成功: ' + filename, 'success');
      })
      .catch(function(err) {
        console.error('Tapp.file.download 失败:', err);
        fallbackDownload(content, filename);
      });
  } else {
    fallbackDownload(content, filename);
  }
}

function fallbackDownload(content, filename) {
  var dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);

  var a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  setTimeout(function() {
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 100);

  showNotification('文件下载已开始: ' + filename, 'success');
}

async function showNotification(message, type) {
  try {
    await Tapp.ui.showNotification({
      title: type === 'success' ? '成功' : '提示',
      message: message,
      type: type || 'info'
    });
  } catch (e) {
    console.log('[ConfigGenerator]', message);
  }
}

// ========================================
// 生命周期入口
// ========================================

(function() {
  var mode = window._TAPP_MODE;
  var hasHtml = window._TAPP_HAS_HTML;

  if (mode === 'page' || hasHtml) {
    Tapp.lifecycle.onReady(function() {
      initPage();
    });
  }
})();
