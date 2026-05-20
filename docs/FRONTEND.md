# FuseBead 前端文档

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.2.6 |
| UI | React | 19.2.4 |
| 样式 | Tailwind CSS | v4 |
| 动画 | Framer Motion | 12.38 |
| 图标 | Lucide React | 1.16 |
| QR 码 | qrcode.react | 4.2 |
| 工具 | clsx + class-variance-authority + tailwind-merge | - |

---

## App Router 页面结构

```
src/app/
├── layout.tsx                  # 根布局：AuthProvider + LangProvider + Navbar + Footer + AuthModal
├── page.tsx                    # 首页 Landing Page
├── globals.css                 # 全局样式 + CSS 自定义属性 + Tailwind CSS v4
├── not-found.tsx               # 404 页面
├── sitemap.ts                  # 动态 Sitemap（从 NEXT_PUBLIC_SITE_URL 读域名）
├── robots.ts                   # Robots.txt
│
├── generator/page.tsx          # 图片上传 → 生成拼豆图纸（需登录）
├── editor/page.tsx             # 手工编辑器（Canvas 像素网格 + 缩放/平移）
├── converter/page.tsx          # 品牌色号转换（Perler / Hama / Artkal）
├── gallery/
│   ├── page.tsx                # 图纸库列表（搜索/筛选/分页）
│   └── [id]/page.tsx           # 图纸详情页（含评论 + 点赞 + 下载）
├── dashboard/page.tsx          # 控制台（我的作品/收藏/订单/资料，含分页）
├── pricing/page.tsx            # 定价页（Free / Pro ¥29 / Team ¥69）
├── admin/
│   ├── page.tsx                # 管理后台首页（统计面板）
│   ├── users/page.tsx          # 用户管理
│   ├── patterns/page.tsx       # 作品审核
│   ├── comments/page.tsx       # 评论管理
│   ├── featured/page.tsx       # 推荐管理
│   ├── feedback/page.tsx       # 反馈管理
│   ├── settings/page.tsx       # 系统设置
│   └── logs/page.tsx           # 操作日志
├── user/[id]/page.tsx          # 用户主页
├── payment/
│   ├── success/page.tsx        # 支付成功页
│   └── cancel/page.tsx         # 支付取消/失败页
│
└── icon.tsx                    # 已删除 — 使用 public/icon.svg 替代
```

**总计: 20 个页面路由**（含动态路由），大部分为 `"use client"` 页面（交互密集）。

---

## 组件树

```
RootLayout
├── AuthProvider          # JWT 认证状态管理
├── LangProvider          # 中英语言切换
├── Navbar                # 顶部导航栏
│   ├── Logo + 导航链接
│   ├── 语言切换按钮
│   ├── 登录/用户头像
│   └── ProBadge          # Pro 用户徽章
├── Footer                # 页脚（链接/版权）
├── AuthModal             # 登录/注册/忘记密码弹窗
├── FeedbackButton        # 侧边反馈按钮
└── {page content}
```

### 核心组件清单

| 组件路径 | 用途 | 关键 Props |
|----------|------|-----------|
| `shared/navbar.tsx` | 全局导航（根据登录状态/管理员显示不同链接） | - |
| `shared/footer.tsx` | 全局页脚 | - |
| `shared/Pagination.tsx` | 通用分页器（省略号处理 >7 页） | `page, totalPages, onChange` |
| `shared/ProBadge.tsx` | Pro/Team 订阅徽章 | - |
| `shared/ProFeaturePrompt.tsx` | 免费用户点击 Pro 功能时的升级提示弹窗 | `onClose` |
| `auth/AuthModal.tsx` | 登录/注册/邮箱验证/忘记密码一体化弹窗 | - |
| `auth/RequireAuth.tsx` | 未登录时显示登录提示或拦截 | `children` |
| `landing/hero.tsx` | 首页 Hero 区 | - |
| `gallery/GalleryFAB.tsx` | 图纸库浮动操作按钮 | - |
| `comments/CommentsSection.tsx` | 评论区（评论列表 + 发评论表单） | `patternId` |
| `publish/PublishFormModal.tsx` | 发布作品表单弹窗 | `onClose` |
| `payment/PaymentProviderSelector.tsx` | 支付方式选择器（支付宝/微信） | `onSelect` |
| `payment/QRCodeModal.tsx` | QR 码弹窗（qrcode.react 渲染 + 轮询状态） | `order` |
| `dashboard/OrderHistory.tsx` | 订单历史记录列表 | - |
| `feedback/FeedbackButton.tsx` | 侧边反馈按钮 + 反馈表单弹窗 | - |

---

## 状态管理

所有状态管理通过 React Context 实现，无 Redux / Zustand 等外部库。

### AuthContext (`src/lib/AuthContext.tsx`)

管理用户认证状态、登录/注册/登出操作、AuthModal 开关。

```typescript
// 核心状态
user: User | null          // 当前登录用户（null = 未登录）
loading: boolean           // 初始化加载中 (true = 正在从 localStorage 恢复)
isAdmin: boolean           // 是否为管理员
pendingEmail: string | null // 待验证的邮箱（注册后未验证时设置）
isOpen: boolean            // AuthModal 开关

// 核心方法
login(email, password, captchaId, captchaText)    // 登录，403 时自动设置 pendingEmail
register(username, email, password, captchaId, captchaText) // 注册后设置 pendingEmail
verifyEmail(email, code)   // 验证邮箱并自动登录
sendCode(email, captchaId, captchaText)            // 重发验证码
refreshUser()              // 重新获取用户信息（支付后刷新 plan）
refreshToken()             // 调用 /user/me/refresh-token 获取含新 plan 的 JWT
logout()                   // 清除 localStorage token + user 状态
openAuth() / closeAuth()   // 控制 AuthModal
```

**初始化流程:** App 挂载时 `useEffect` 检查 `localStorage.token`。存在则调用 `GET /user/me` 恢复 session，失败则清除过期 token。

### LangContext (`src/lib/LangContext.tsx`)

管理中英语言切换，通过 `t()` 函数获取翻译文本。

```typescript
lang: "zh" | "en"         // 当前语言（默认 zh）
setLang(l)                 // 切换语言
t(key)                     // 获取翻译文本，从 i18n.ts 字典查找
```

### usePro (`src/lib/usePro.ts`)

判断用户是否为 Pro/Team 订阅者，控制 Pro 功能提示弹窗。

```typescript
isPro: boolean             // user.plan === "pro" || "team" || is_admin
showPrompt                 // Pro 功能提示弹窗状态
openPrompt() / closePrompt()
```

### usePayment (`src/lib/usePayment.ts`)

管理支付流程：创建订单、QR 码轮询、模拟支付。

```typescript
currentOrder: PaymentOrder | null    // 当前订单信息
isPolling: boolean                   // 是否在轮询
pollResult: "paid" | "pending" | null // 轮询结果

createOrder(plan, provider)  // POST /payments/create
startPolling(orderNo)        // 启动 2 秒轮询 GET /payments/order/:no
stopPolling()                // 停止轮询
simulatePayment(orderNo)     // 模拟支付（开发用）
cancelOrder(orderNo)         // 取消订单
reset()                      // 重置全部状态
```

**轮询逻辑:** 每 2 秒调用 `GET /payments/order/:orderNo`，状态变为 `paid` 时自动 `refreshToken()`，变为 `cancelled`/`expired` 时停止。

---

## API 客户端 (`src/lib/api.ts`)

封装 `fetch`，自动处理 JWT Token 和错误。

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

api<T>(path: string, options?: RequestInit): Promise<T>
```

- 自动从 `localStorage.token` 读取 JWT，添加到 `Authorization: Bearer` 头
- 自动设置 `Content-Type: application/json`
- 非 2xx 响应抛出 `ApiError`（含 HTTP 状态码）
- 无需手动处理 token 传递

---

## 国际化 (i18n)

翻译字典集中在 `src/lib/i18n.ts`，包含 200+ 翻译 key。

### 结构

```typescript
export const T: Record<string, Record<Lang, string>> = {
  "nav.generator": { en: "Generator", zh: "生成器" },
  "home.title1":   { en: "Turn", zh: "拼出创意，" },
  // ... 200+ keys
};
```

### 使用方式

```tsx
const { t } = useLang();
return <h1>{t("nav.generator")}</h1>; // 中文: 生成器, English: Generator
```

### 翻译 key 命名规范

- 按页面/模块分组: `nav.*`, `home.*`, `auth.*`, `gallery.*`, `editor.*`, `dashboard.*`, `pricing.*`, `payment.*`, `admin.*`, `footer.*`, `feedback.*`, `profile.*`, `pro.*`, `error.*`, `generic.*`
- 新增 UI 文本时必须在 `T` 字典中添加中英双语条目

---

## CSS 体系

### Tailwind CSS v4

使用 CSS 自定义属性 + Tailwind CSS v4 的 `@theme` 语法。自定义主题定义在 `src/app/globals.css`。

### CSS 自定义属性

```css
:root {
  --background: #fefefe;    /* 页面背景 */
  --foreground: #1a1a2e;    /* 文字颜色 */
  --primary:     #ff6b6b;   /* 主色调（珊瑚红） */
  --primary-foreground: #fff;
  --secondary:   #f8f9fa;   /* 次要背景 */
  --accent:      #ffa502;   /* 强调色（橙） */
  /* ... 更多变量 */
}
```

### 渐变

首页 Hero 区和 Pricing 卡片使用自定义渐变背景，通过 `bg-gradient-to-br` 等 Tailwind 渐变类 + CSS 变量实现。

---

## 字体

使用 Google Fonts：
- **Fredoka**（400/500/600/700）— 标题、品牌文字
- **Nunito**（400/500/600/700）— 正文

在 `layout.tsx` 中通过 `<link>` 标签预加载。

---

## 编辑器 Canvas 实现

编辑器 (`src/app/editor/page.tsx`) 使用原生 Canvas API：

- **像素网格渲染**: 根据 bead-colors 色库在 canvas 上绘制每个像素方块
- **缩放**: `Ctrl + 滚轮` 缩放 0.5x ~ 3x，CSS `transform: scale()` 应用到 canvas 容器
- **平移**: 鼠标右键拖拽（`onMouseDown` + `onMouseMove` 更新 `panOffset`），通过 CSS `transform: translate()` 实现
- **品牌切换**: 切换 Perler / Hama / Artkal 色库
- **Suspense**: 编辑器页面用 Suspense 包裹，因为使用了 `useSearchParams()`

---

## 前端页面架构总结

```
            ┌──────────────────────────┐
            │     RootLayout            │
            │  AuthProvider            │
            │  LangProvider            │
            │  Navbar + Footer         │
            │  AuthModal (条件弹窗)      │
            │  FeedbackButton          │
            └──────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    公开页面      需登录页面     管理后台
    /             /generator    /admin/*
    /gallery      /editor       (需 is_admin)
    /pricing      /dashboard
    /user/:id     /converter
    /payment/*    (发布/评论/点赞)
```
