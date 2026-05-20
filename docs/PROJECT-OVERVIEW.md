# FuseBead 项目总览

## 项目简介

FuseBead（fusebead.art）是一个拼豆图案设计平台。用户可以上传图片自动生成拼豆图案，手工编辑像素网格，浏览社区作品，以及购买 Pro/Team 订阅解锁高级功能。

## 核心功能

| 模块 | 功能 | 需要登录 |
|------|------|----------|
| **Generator 生成器** | 上传图片 → AI 颜色匹配 → 生成拼豆图纸 | 是 |
| **Editor 编辑器** | 手工绘制/编辑像素网格，缩放平移，品牌切换 | 是 |
| **Converter 转换器** | 跨品牌色号转换（Perler / Hama / Artkal） | 是 |
| **Gallery 图纸库** | 浏览社区公开作品，搜索/分类/点赞/下载 | 否 |
| **Dashboard 控制台** | 我的作品、收藏、订单记录、个人资料 | 是 |
| **Pricing 定价** | 免费 / Pro ¥29/月 / Team ¥69/月 | 否 |
| **Admin 管理后台** | 用户管理、作品审核、系统设置、操作日志 | 管理员 |
| **Auth 认证** | 注册、登录、邮箱验证、忘记密码 | 否 |

## 系统架构

```
┌──────────────────────────────┐     ┌───────────────────────────┐
│   Frontend (Next.js 16)      │     │   Backend (Express)       │
│   Vercel / Port 3000         │────▶│   Railway / Port 3001     │
│                              │     │                           │
│  • App Router (28 routes)    │     │  • JWT Auth Middleware    │
│  • Tailwind CSS v4           │     │  • REST API (40+ routes)  │
│  • Framer Motion             │     │  • BCrypt password hash   │
│  • i18n (中/英)              │     │  • Nodemailer (163 SMTP)  │
│  • qrcode.react              │     │  • Alipay/WeChat SDK      │
└──────────────────────────────┘     └───────────┬───────────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │   Database        │
                                        │   Supabase PG     │
                                        │   (or SQLite dev) │
                                        └──────────────────┘
```

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | Next.js 16.2 (App Router) | 全部 "use client" 页面（交互密集） |
| 前端样式 | Tailwind CSS v4 | CSS 自定义属性 + 渐变 |
| 前端动画 | Framer Motion 12 | 页面过渡、hover 动效 |
| 前端图标 | Lucide React | SVG 图标库 |
| 后端框架 | Express 4 | TypeScript + CommonJS 编译 |
| 后端认证 | JWT (jsonwebtoken) | 7 天过期，Bearer Token |
| 后端密码 | BCrypt (bcryptjs) | 10 轮哈希 |
| 后端邮件 | Nodemailer | 163.com SMTP，SSL 465 端口 |
| 数据库(生产) | PostgreSQL (Supabase) | `pg` 驱动，连接池 max: 10 |
| 数据库(本地) | SQLite (sql.js WASM) | 无需安装，文件存储 |
| 支付 | Alipay SDK / WeChat V3 | 沙箱模式可测试 |
| 部署(前端) | Vercel | 自动 HTTPS + CDN |
| 部署(后端) | Railway | Nixpacks 构建 |

## 目录结构

```
fusebead/
├── src/                          # 前端 Next.js 源码
│   ├── app/                      # App Router 页面
│   │   ├── page.tsx              # 首页 Landing
│   │   ├── layout.tsx            # 根布局（字体、Metadata）
│   │   ├── globals.css           # 全局样式 + CSS 变量
│   │   ├── generator/            # 生成器
│   │   ├── editor/               # 编辑器
│   │   ├── converter/            # 转换器
│   │   ├── gallery/              # 图纸库 + [id] 详情页
│   │   ├── dashboard/            # 控制台
│   │   ├── pricing/              # 定价页
│   │   ├── admin/                # 管理后台（7 个子页）
│   │   ├── payment/              # 支付成功/取消页
│   │   ├── user/[id]/            # 用户主页
│   │   ├── not-found.tsx         # 404 页面
│   │   ├── sitemap.ts            # 动态 Sitemap
│   │   └── robots.ts             # Robots.txt
│   ├── components/
│   │   ├── shared/               # 通用组件（navbar, footer, Pagination, ProBadge）
│   │   ├── auth/                 # 认证组件（AuthModal, RequireAuth）
│   │   ├── gallery/              # 图纸组件（GalleryFAB）
│   │   ├── payment/              # 支付组件（QRCodeModal, PaymentProviderSelector）
│   │   ├── publish/              # 发布组件（PublishFormModal）
│   │   ├── dashboard/            # 控制台组件（OrderHistory）
│   │   ├── comments/             # 评论组件（CommentsSection）
│   │   ├── feedback/             # 反馈组件（FeedbackButton）
│   │   └── landing/              # 首页组件（hero）
│   └── lib/
│       ├── api.ts                # API 客户端（fetch 封装）
│       ├── AuthContext.tsx        # 用户认证状态 Context
│       ├── LangContext.tsx        # 语言切换 Context
│       ├── i18n.ts               # 翻译字典（200+ key）
│       ├── usePro.ts             # Pro 功能检测 Hook
│       ├── usePayment.ts         # 支付流程 Hook
│       ├── bead-colors.ts        # 拼豆色库（Perler/Hama/Artkal）
│       └── color-convert.ts      # 跨品牌色号转换
├── public/
│   └── icon.svg                  # 网站图标
├── server/                       # 后端 Express 源码
│   ├── src/
│   │   ├── index.ts              # Express 入口 + CORS + 定时任务
│   │   ├── config/
│   │   │   └── db.ts             # 数据库层（PG 连接池 + SQLite 兜底）
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT 认证中间件
│   │   │   └── admin.ts          # 管理员权限中间件
│   │   ├── models/               # 数据访问层（8 个模型）
│   │   │   ├── user.ts
│   │   │   ├── pattern.ts
│   │   │   ├── favorite.ts
│   │   │   ├── verificationCode.ts
│   │   │   ├── order.ts
│   │   │   ├── feedback.ts
│   │   │   ├── adminLog.ts
│   │   │   └── systemSetting.ts
│   │   ├── routes/               # API 路由（7 个模块）
│   │   │   ├── auth.ts           # 注册/登录/忘记密码
│   │   │   ├── verification.ts   # CAPTCHA/验证码
│   │   │   ├── user.ts           # 用户信息/作品/收藏
│   │   │   ├── patterns.ts       # 图纸 CRUD/评论
│   │   │   ├── payments.ts       # 支付下单/轮询/回调
│   │   │   ├── admin.ts          # 管理后台全部接口
│   │   │   └── tool.ts           # 图像处理代理
│   │   ├── payment/              # 支付模块
│   │   │   ├── config.ts         # 支付配置（环境变量）
│   │   │   ├── provider.ts       # 支付提供者接口
│   │   │   └── providers/
│   │   │       ├── alipay.ts     # 支付宝实现
│   │   │       └── wechat.ts     # 微信支付实现
│   │   └── utils/
│   │       ├── captcha.ts        # SVG CAPTCHA 生成
│   │       └── mailer.ts         # 邮件发送（验证码/重置密码）
│   ├── data/                     # SQLite 数据库文件（本地开发）
│   ├── railway.toml              # Railway 部署配置
│   ├── .env.example              # 环境变量模板
│   └── tsconfig.json             # TypeScript 配置
├── docs/                         # 项目文档
│   ├── PROJECT-OVERVIEW.md
│   ├── DEPLOYMENT.md
│   ├── API-REFERENCE.md
│   ├── DATABASE.md
│   └── FRONTEND.md
├── .env.local.example            # 前端环境变量模板
├── next.config.ts                # Next.js 配置
├── package.json                  # 前端依赖
└── tsconfig.json                 # 前端 TypeScript 配置
```

## 关键工作流

### 用户注册流程
```
用户填写表单 → 获取 CAPTCHA → 输入验证码 → 提交注册
→ 后端创建用户(email_verified=0) → 发送6位数验证码到邮箱
→ 用户输入验证码 → 后端激活账户 → 返回 JWT Token → 登录成功
```

### 支付流程
```
选择套餐 → 选择支付方式(支付宝/微信) → 后端生成订单+QR码
→ 前端展示二维码 → 用户扫码支付 → 前端每2秒轮询订单状态
→ 支付成功 → 后端更新订单状态 → 升级用户plan → 刷新JWT → 跳转成功页
```

### 图片生成流程
```
上传图片 → 前端裁剪/缩放 → POST /api/tool/convert → Python 处理器
→ Floyd-Steinberg 抖动 + 颜色匹配 → 返回 hex 网格 → 前端渲染预览
→ 用户调节参数(网格大小/颜色上限) → 实时更新预览 → 导出 PNG / 发布
```

## 多语言支持

支持中文(zh)和英文(en)，通过 `LangContext` 管理。翻译字典集中在 `src/lib/i18n.ts`，包含 200+ 翻译 key。所有 UI 文本必须通过 `useLang()` 获取 `t()` 函数来翻译。

## 数据库切换机制

- **检测 `DATABASE_URL` 环境变量**：有则使用 PostgreSQL（生产），无则使用 SQLite（本地开发）
- 两个后端共享同一套 SQL 语法（`?` 占位符自动转换为 PG 的 `$n`）
- SQLite 专用语法（`datetime('now')` 等）在 PG 模式下自动转换
- 数据库 Schema 在两种模式下自动创建（`CREATE TABLE IF NOT EXISTS`）
