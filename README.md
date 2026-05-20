# FuseBead.art

FuseBead.art 是一个在线拼豆图案生成工具。用户可以上传图片，将图片转换为 Perler / Hama / Artkal 等拼豆色板风格的网格图案，并在站内进行编辑、发布、收藏、评论、会员支付和后台管理。

项目由三部分组成：

- `src/`：Next.js 前端应用
- `server/`：Node.js / Express 后端 API
- `processor/`：Python / Flask 图片处理服务

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 后端：Express、TypeScript、PostgreSQL 或本地 sql.js
- 图片处理：Flask、Pillow、NumPy
- 认证：JWT
- 支付：支付宝、微信支付接口封装

## 目录结构

```text
.
├─ src/                 # Next.js 前端源码
│  ├─ app/              # App Router 页面
│  ├─ components/       # UI 组件
│  └─ lib/              # API、认证、i18n、色板和工具函数
├─ server/              # Express 后端
│  ├─ src/config/       # 数据库配置
│  ├─ src/middleware/   # 认证和管理员中间件
│  ├─ src/models/       # 数据访问层
│  ├─ src/payment/      # 支付配置和支付 provider
│  └─ src/routes/       # API 路由
├─ processor/           # Flask 图片转换服务
├─ database/            # 数据库 schema
└─ public/              # 静态资源
```

## 环境要求

- Node.js 20 或更新版本
- npm
- Python 3.10 或更新版本
- PostgreSQL 可选；不配置 `DATABASE_URL` 时，后端会使用本地 sql.js 数据文件

## 安装依赖

安装前端依赖：

```bash
npm install
```

安装后端依赖：

```bash
cd server
npm install
```

安装图片处理服务依赖：

```bash
cd processor
pip install -r requirements.txt
```

## 环境变量

前端环境变量放在根目录 `.env.local`：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

后端环境变量建议放在 `server/.env`：

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=replace_with_a_strong_secret
CORS_ORIGIN=http://localhost:3000

# 可选：配置后使用 PostgreSQL；不配置则使用本地 sql.js
DATABASE_URL=
DB_PATH=./data/fusebead.db

# 图片处理服务
PROCESSOR_URL=http://localhost:5000

# 邮件验证码
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# 初始化管理员账号
ADMIN_EMAIL=admin@fusebead.art
ADMIN_PASSWORD=replace_with_a_strong_password

# 支付宝
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_SANDBOX=true
ALIPAY_NOTIFY_URL=

# 微信支付
WECHAT_MCH_ID=
WECHAT_SERIAL_NO=
WECHAT_PRIVATE_KEY=
WECHAT_API_V3_KEY=
WECHAT_SANDBOX=true
WECHAT_NOTIFY_URL=

APP_BASE_URL=http://localhost:3001
```

生产环境必须设置强随机 `JWT_SECRET`。不要使用默认管理员密码，也不要把真实密钥提交到 Git。

## 本地开发

需要分别启动三个服务。

启动图片处理服务：

```bash
cd processor
python main.py
```

默认监听：

```text
http://localhost:5000
```

启动后端 API：

```bash
cd server
npm run dev
```

默认监听：

```text
http://localhost:3001/api
```

启动前端：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 常用命令

根目录：

```bash
npm run dev       # 启动前端开发服务
npm run build     # 构建前端
npm run start     # 启动前端生产服务
npm run lint      # 运行 ESLint
```

后端目录：

```bash
cd server
npm run dev       # 启动后端开发服务
npm run build     # TypeScript 编译
npm run start     # 运行 dist/index.js
```

图片处理服务：

```bash
cd processor
python main.py
```

## 初始化管理员

配置好 `server/.env` 后，在 `server` 目录执行：

```bash
npx ts-node seed-admin.ts
```

请务必在执行前设置 `ADMIN_PASSWORD`，不要使用示例密码。

## 数据库

后端会根据环境变量自动选择数据库：

- 设置 `DATABASE_URL`：使用 PostgreSQL
- 未设置 `DATABASE_URL`：使用本地 sql.js，默认数据文件为 `server/data/fusebead.db`

数据库表结构主要包括：

- `users`
- `patterns`
- `favorites`
- `comments`
- `feedbacks`
- `verification_codes`
- `orders`
- `admin_logs`
- `system_settings`

## 图片转换接口

前端请求后端：

```text
POST /api/tool/convert
```

后端会转发给 Python 服务：

```text
POST http://localhost:5000/convert
```

因此本地转换图片时，`processor` 服务必须先启动。

## 部署说明

推荐分开部署：

- 前端部署到 Vercel 或其他 Next.js 托管平台
- 后端部署到 Railway、Render、Fly.io 等 Node.js 平台
- 图片处理服务部署到支持 Python / Flask 的平台
- 数据库使用托管 PostgreSQL

部署后需要更新：

- 前端 `NEXT_PUBLIC_API_URL`
- 前端 `NEXT_PUBLIC_SITE_URL`
- 后端 `CORS_ORIGIN`
- 后端 `PROCESSOR_URL`
- 支付回调地址 `ALIPAY_NOTIFY_URL` / `WECHAT_NOTIFY_URL`

## 当前项目检查备注

- 根目录 TypeScript 检查通过：`npx tsc --noEmit`
- 后端 TypeScript 编译通过：`cd server && npm run build`
- Python processor 语法检查通过：`python -m py_compile processor/main.py processor/dither.py processor/colors.py`
- 当前 ESLint 仍有较多问题，且根 lint 会扫到 `server/dist` 编译产物，建议后续调整 ESLint ignore 或拆分前后端 lint 配置
- 根目录前端构建曾遇到 `.next` 缓存文件占用导致的 `EPERM unlink`，可关闭占用进程或清理 `.next` 后重试

## 注意事项

- `.env.local`、`server/.env`、`server/data/` 不应提交到 Git
- 生产环境必须设置 `JWT_SECRET`
- 管理员初始化脚本不要使用默认密码
- 支付相关配置未填写时，部分 provider 会返回模拟二维码或不可用状态
- 如果图片转换接口返回 503，通常是 Python processor 服务未启动或 `PROCESSOR_URL` 配置错误
