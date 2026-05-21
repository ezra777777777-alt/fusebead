# FuseBead 部署指南

## 架构概览

### 海外部署（默认）

```
用户浏览器
    │
    ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Vercel (前端)   │────▶│  Railway (后端)   │────▶│  Supabase    │
│  Next.js 16      │     │  Express 4        │     │  PostgreSQL  │
│  Port: 443       │     │  Port: 3001       │     │  Port: 5432  │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

### 国内部署（混合架构）

```
用户浏览器 (国内)
    │
    ├──▶ Vercel (前端) — 自定义域名
    │
    └──▶ 阿里云 ECS
           ├── Nginx :443
           ├── Express :3001 (PM2)
           ├── Flask :5000 (gunicorn/systemd)
           └── PostgreSQL 本地实例
```

---

## 部署方式一：海外平台（Vercel + Railway + Supabase）

适合国际用户，国内访问受限。三个平台各司其职：Vercel 托管前端（免费），Railway 运行后端（$5/月额度），Supabase 提供 PostgreSQL（免费 500MB）。

---

## 一、Supabase 数据库配置

### 1.1 注册 + 创建项目

1. 访问 [supabase.com](https://supabase.com)，用 GitHub 登录
2. 创建新项目：Dashboard → New project
3. 输入项目名（如 `fusebead`），设置数据库密码（**务必记住**）
4. Region 选离用户最近的（亚洲用户选 `ap-southeast-1` 新加坡）
5. 等待项目初始化（约 1-2 分钟）

### 1.2 获取连接字符串

1. 进入项目 → Settings → Database
2. 找到 **Connection string** 区域
3. 选择 **URI** 标签页
4. 复制连接字符串，格式如下：

```
postgresql://postgres.[项目ID]:[密码]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

> **务必使用 Pooler 连接**（端口 6543），不要用直连 5432。Pooler 支持 IPv4，Railway 出站需要 IPv4。

### 1.3 数据库初始化

Supabase 不需要手动建表。后端启动时会自动执行 `CREATE TABLE IF NOT EXISTS` 初始化所有 10 张表、索引和外键约束。详见 `server/src/config/db.ts` 的 `initPgSchema()`。

---

## 二、Railway 后端部署

### 2.1 注册 + 创建项目

1. 访问 [railway.app](https://railway.app)，用 GitHub 登录
2. 创建新项目：New Project → Deploy from GitHub repo
3. 选择 `fusebead` 仓库
4. 项目创建后会触发首次部署 — **首次必定失败**（未配置环境变量），这是正常的

### 2.2 设置 Root Directory

Railway 默认从仓库根目录构建，必须指定 `server/` 目录：

1. 进入项目 → Settings
2. 找到 **Root Directory** 设置
3. 输入 `server/`

### 2.3 配置环境变量

进入项目 → Variables，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `3001` | 服务端口（Railway 会通过 `PORT` 注入实际端口，但设置默认值可防错） |
| `JWT_SECRET` | *生成一个随机字符串* | JWT 签名密钥，必须强随机。参考命令：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | 前端域名。支持多个：逗号分隔，如 `https://a.com,https://b.com` |
| `HOST` | `0.0.0.0` | Express 绑定地址。Railway/ECS 生产环境建议 `0.0.0.0`（Railway 容器需要）或 ECS 设 `127.0.0.1`（Nginx 反代） |
| `DATABASE_URL` | *Supabase 连接字符串* | 步骤 1.2 获取的 Pooler 连接字符串 |
| `SMTP_HOST` | `smtp.163.com` | 邮件服务商 |
| `SMTP_PORT` | `465` | SMTP SSL 端口 |
| `SMTP_USER` | `your_email@163.com` | 发件邮箱 |
| `SMTP_PASS` | *163 授权码* | 邮箱 SMTP 授权码（非登录密码） |
| `SMTP_FROM` | `your_email@163.com` | 发件人地址 |
| `ALIPAY_APP_ID` | （可选） | 支付宝 App ID，沙箱可不填 |
| `ALIPAY_PRIVATE_KEY` | （可选） | 支付宝私钥 |
| `ALIPAY_PUBLIC_KEY` | （可选） | 支付宝公钥 |
| `ALIPAY_SANDBOX` | `true` | 沙箱模式开 |
| `WECHAT_MCH_ID` | （可选） | 微信商户号 |
| `WECHAT_SERIAL_NO` | （可选） | 微信证书序列号 |
| `WECHAT_PRIVATE_KEY` | （可选） | 微信 API 私钥 |
| `WECHAT_API_V3_KEY` | （可选） | 微信 APIv3 密钥 |
| `WECHAT_SANDBOX` | `true` | 沙箱模式开 |
| `PROCESSOR_URL` | `http://localhost:5000` | 图像处理服务地址。ECS 部署时同机 `127.0.0.1:5000`；若独立部署则填实际地址 |
| `ALIPAY_NOTIFY_URL` | `https://api.xxx.cn/api/payments/webhook/alipay` | 支付宝异步通知回调（生产必填） |
| `WECHAT_NOTIFY_URL` | `https://api.xxx.cn/api/payments/webhook/wechat` | 微信支付回调（生产必填） |
| `APP_BASE_URL` | `https://api.xxx.cn` | 应用基础 URL（用于构造回调地址等） |
| `NODE_ENV` | `production` | 生产环境标识 |

### 2.4 部署验证

1. 环境变量设置完成后，在 Railway Dashboard 点击 **Deploy** 重新部署
2. 部署完成后，Railway 会分配一个域名，格式：`fusebead-production-xxxx.up.railway.app`
3. 在浏览器访问 `https://你的域名.up.railway.app/api/health`
4. 看到 `{"status":"ok","timestamp":"..."}` 即表示部署成功

### 2.5 获取生产域名（可选）

如果不想用 Railway 自带的随机域名：

1. Railway 项目 → Settings → Public Networking → Custom Domain
2. 添加你自己的域名（如 `api.fusebead.art`）
3. 在 DNS 提供商处添加 CNAME 记录指向 Railway 分配的域名

---

## 三、Vercel 前端部署

### 3.1 注册 + 导入项目

1. 访问 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点击 **Add New Project**
3. 选择 `fusebead` 仓库
4. Vercel 会自动识别为 Next.js 项目

### 3.2 配置环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://你的域名.up.railway.app/api` | Railway 后端地址 + `/api` 后缀 |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | 前端自身域名（用于 sitemap/open graph） |

### 3.3 部署验证

1. 点击 Deploy，等待构建完成
2. 访问 Vercel 分配的域名（`https://xxx.vercel.app`）
3. 打开浏览器开发者工具 Network 标签
4. 检查 API 请求是否成功发往 Railway 后端（无 CORS 报错）
5. 测试注册/登录流程，确认邮件验证码能发送

---

## 四、生产环境安全检查清单

### JWT_SECRET

- [ ] `JWT_SECRET` 不是 `fallback-secret` 或 `dev-secret-do-not-use-in-production`
- [ ] 值由 `crypto.randomBytes(32)` 生成，长度 >= 64 字符
- [ ] **如果 JWT_SECRET 仍是弱密钥，后端在生产环境会直接 crash**（`process.exit(1)`）

### CORS

- [ ] `CORS_ORIGIN` 精确匹配 Vercel 域名（含 `https://`）
- [ ] 开发环境不设置或设为 `http://localhost:3000`

### 数据库

- [ ] `DATABASE_URL` 指向 Supabase Pooler 连接（端口 6543）
- [ ] 密码不是默认值
- [ ] SSL 已启用（Pooler 自动处理）

### 邮件

- [ ] SMTP 邮箱确实能发送邮件（测试注册流程）
- [ ] 授权码正确（163.com 需要开启 SMTP 服务后获取）

---

## 五、本地开发

### 后端启动

```bash
cd server
cp .env.example .env      # 编辑 .env 填入真实 SMTP 等配置
npm install
npm run dev               # nodemon + ts-node，监听 :3001
```

本地开发**不设置 `DATABASE_URL`** 时，自动使用 SQLite（文件在 `server/data/fusebead.db`）。

### 前端启动

```bash
cp .env.local.example .env.local   # 编辑 API URL 指向本地后端
npm install
npm run dev                         # Next.js dev server，监听 :3000
```

---

## 六、常见故障排除

### Railway 部署后 502 Bad Gateway

1. 检查 Root Directory 是否设为 `server/`
2. 检查环境变量是否完整（尤其是 `DATABASE_URL` 和 `JWT_SECRET`）
3. 在 Railway Dashboard 查看 Deploy Logs，搜索 `Error` 或 `FATAL`

### CORS 报错 "No 'Access-Control-Allow-Origin' header"

1. 确认 `CORS_ORIGIN` 包含前端域名（精确匹配，含 `https://`）
2. 支持多个域名：逗号分隔，如 `CORS_ORIGIN=https://fusebead.cn,https://xxx.vercel.app,http://localhost:3000`
3. 修改环境变量后需要**重新部署**才能生效
4. 如果 Nginx 反代了后端，确认 `proxy_set_header Host` 已设置

### 数据库连接失败

1. 确认用 Supabase Pooler 地址（端口 6543），不是直连端口 5432
2. 检查密码中是否包含特殊字符需要转义
3. 在 Railway 中使用以下命令测试：`bash` → `node -e "const {Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(r=>console.log(r.rows)).catch(e=>console.error(e))"`
4. 在 Railway 中运行测试命令的方法：Settings → 开启 Shell 功能，或在本地设置 `DATABASE_URL` 运行后端

### 邮件发送失败

1. 163.com 邮箱需要开启 SMTP 服务：登录 163 邮箱 → 设置 → POP3/SMTP/IMAP → 开启 SMTP → 获取授权码
2. `SMTP_PASS` 填授权码，不是邮箱登录密码
3. `SMTP_FROM` 必须与 `SMTP_USER` 相同（163 不允许代发）

### Supabase 密码重置

1. 进入 Supabase 项目 → Settings → Database
2. 点击 **Reset database password**
3. 注意：这会重置 `postgres` 用户的密码，不影响数据
4. 重置后需要更新 Railway 中 `DATABASE_URL` 的密码部分

### Railway 免费额度耗尽

1. Railway 免费额度 $5/月，按使用量计费
2. 进入项目 → Usage 查看用量
3. 如果额度耗尽，服务会暂停，需等到下个计费周期或升级
4. 替代方案：迁移到 Render（有完全免费层）、Fly.io（免费 3 个 VM）或自建 VPS

### 前端构建失败

1. Vercel 构建日志中搜索 `Error`
2. 常见原因：
   - `useSearchParams()` 未包裹 Suspense（Next.js 16 强制要求）
   - `icon.tsx` 返回格式不符（已删除，使用 `public/icon.svg`）
   - 环境变量缺失导致构建时 fetch
3. 查看 `next.config.ts` 是否有问题配置

### 支付功能不工作

1. 确认 `ALIPAY_SANDBOX=true` / `WECHAT_SANDBOX=true`
2. 无真实支付凭证时，微信支付自动使用**模拟模式**（返回占位 QR + 前端显示"模拟支付"按钮）
3. 支付宝需要真实沙箱凭证才能生成 QR 码（免费注册：[open.alipay.com](https://open.alipay.com)）
4. 测试用 `POST /api/payments/simulate/:orderNo` 可以直接标记订单为已支付（仅开发环境）

---

## 部署方式二：国内服务器（阿里云 ECS）

适合中国大陆用户。前端仍用 Vercel + 自定义域名，后端 + 数据库 + Processor 部署在阿里云轻量应用服务器。

### 准备工作

1. **域名** — 阿里云万网购买（如 `fusebead.cn` ¥29/年），立即实名认证
2. **ICP 备案** — 同步提交，约 2-3 周。域名指向国内服务器**必须备案**，否则会被拦截
3. **服务器** — 阿里云轻量应用服务器 2C2G / 50GB / 3Mbps，¥68/月，Ubuntu 22.04

### 服务器初始化

```bash
# 系统更新
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL（版本非强依赖，14/15/16 均可）
sudo apt install -y postgresql postgresql-contrib

# Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Python 3
sudo apt install -y python3 python3-pip python3-venv

# PM2
sudo npm install -g pm2

# 基础工具
sudo apt install -y git curl unzip
```

### 防火墙

阿里云轻量服务器默认只开放 22/80/443。**不额外开放 3001/5000**，Express 和 Flask 由 Nginx 反向代理。

### PostgreSQL 配置

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE fusebead;
CREATE USER fusebead WITH PASSWORD '强随机密码';
GRANT ALL PRIVILEGES ON DATABASE fusebead TO fusebead;
\c fusebead
GRANT ALL ON SCHEMA public TO fusebead;
EOF

# 验证
psql "postgresql://fusebead:密码@127.0.0.1:5432/fusebead" -c "SELECT 1;"
```

### 部署后端

```bash
cd /home/admin
git clone <repo_url> fusebead
cd fusebead/server

# 安装 + 构建
npm install
npm run build

# 配置环境变量
cat > .env << 'EOF'
PORT=3001
HOST=127.0.0.1
JWT_SECRET=<强随机字符串>
CORS_ORIGIN=https://fusebead.cn,https://xxx.vercel.app,http://localhost:3000
DATABASE_URL=postgresql://fusebead:密码@127.0.0.1:5432/fusebead
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASS=your_auth_code
SMTP_FROM=your_email@163.com
PROCESSOR_URL=http://127.0.0.1:5000
ALIPAY_SANDBOX=true
ALIPAY_NOTIFY_URL=https://api.fusebead.cn/api/payments/webhook/alipay
WECHAT_SANDBOX=true
WECHAT_NOTIFY_URL=https://api.fusebead.cn/api/payments/webhook/wechat
APP_BASE_URL=https://api.fusebead.cn
NODE_ENV=production
EOF

# PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 复制输出的 sudo 命令执行
```

### 部署 Processor

```bash
cd /home/admin/fusebead/processor
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

# systemd 管理（推荐）
sudo tee /etc/systemd/system/fusebead-processor.service << 'SVC'
[Unit]
Description=FuseBead Image Processor
After=network.target

[Service]
User=admin
WorkingDirectory=/home/admin/fusebead/processor
ExecStart=/home/admin/fusebead/processor/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 main:app
Restart=always

[Install]
WantedBy=multi-user.target
SVC

sudo systemctl enable --now fusebead-processor

# 验证
curl http://127.0.0.1:5000/health
# → {"status":"ok"}
```

### Nginx 配置（备案前）

```bash
sudo tee /etc/nginx/sites-available/fusebead << 'NGINX'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# 禁用默认站点，避免冲突
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/fusebead /etc/nginx/sites-enabled/fusebead
sudo nginx -t && sudo systemctl reload nginx
```

### 备案通过后启用 HTTPS

```bash
# 先更新 server_name
sudo sed -i 's/server_name _;/server_name api.fusebead.cn;/' /etc/nginx/sites-available/fusebead
sudo nginx -t && sudo systemctl reload nginx

# DNS 确认生效后，运行 certbot（自动加 SSL）
sudo certbot --nginx -d api.fusebead.cn
```

### Vercel 环境变量

```
NEXT_PUBLIC_API_URL=https://api.fusebead.cn/api
NEXT_PUBLIC_SITE_URL=https://fusebead.cn
```

### 数据库迁移（从 Supabase）

```bash
# 导出 Supabase
pg_dump "postgresql://postgres.xxx:密码@aws-1.pooler.supabase.com:6543/postgres" \
  --no-owner --clean --if-exists > backup.sql

# 导入 ECS
psql "postgresql://fusebead:密码@127.0.0.1:5432/fusebead" < backup.sql
```

### 国内故障排除

| 问题 | 排查 |
|------|------|
| Processor 启动失败 | `systemctl status fusebead-processor`，检查路径是否正确 |
| PM2 启动但无法访问 | 检查 `HOST=127.0.0.1` 是否在 .env 中，检查 nginx proxy_pass |
| certbot 失败 | 确认 DNS 已生效（`dig api.fusebead.cn +short`），确认 80 端口可从公网访问 |
| 备案被驳回 | 通常是因为网站名称/内容描述不匹配，按短信提示修改后重新提交 |
| PM2 开机不自启 | `pm2 startup` 只是输出命令，需要复制它输出的 sudo 命令手动执行一次 |

---

## 部署记录

### 2026-05-21：第一阶段部署（ECS 后端 + DB + Processor）

**服务器:** 阿里云轻量应用服务器  
**公网 IP:** 8.137.212.1  
**系统:** Ubuntu 22.04 LTS (2C2G / 40GB)  
**域名:** fusebead.cn（备案中）

**部署组件：**

| 组件 | 版本 | 绑定地址 | 进程管理 | 开机自启 |
|------|------|---------|---------|---------|
| Node.js | 20 LTS | - | - | - |
| Express | dist/index.js | 127.0.0.1:3001 | PM2 (fusebead) | ✓ |
| Flask Processor | main.py | 127.0.0.1:5000 | systemd (fusebead-processor) | ✓ |
| Nginx | 1.x | :80 → :3001 | systemd | ✓ |
| PostgreSQL | 16 | 127.0.0.1:5432 | systemd | ✓ |

**验证结果：**
- `curl http://127.0.0.1:3001/api/health` → `{"status":"ok"}`
- `curl http://127.0.0.1:5000/health` → `{"status":"ok"}`
- `curl http://127.0.0.1/api/health` → `{"status":"ok"}`
- `curl http://8.137.212.1/api/health` → `{"status":"ok"}`
- POST /api/tool/convert Express → Processor 图片转换链路 ✓
- 数据库 `SELECT 1` ✓

**参考:** 完整部署步骤见 [server/RUNBOOK.md](../server/RUNBOOK.md)

**下一步:** 备案通过 → 绑定 api.fusebead.cn → certbot HTTPS → Vercel 切换 API URL
