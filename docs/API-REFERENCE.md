# FuseBead API 参考文档

## 通用约定

- **Base URL**: `https://api.fusebead.art/api`（生产） / `http://localhost:3001/api`（本地）
- **认证方式**: JWT Bearer Token，请求头 `Authorization: Bearer <token>`
- **Token 有效期**: 7 天
- **Content-Type**: `application/json`
- **错误响应格式**: `{ "error": "错误描述" }`
- **标注 🔒** 的需要 JWT 认证，**标注 👑** 的需要管理员权限

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 缺失或过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 冲突（如邮箱已注册） |
| 429 | 频率限制 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

---

## 一、认证模块 `/api/auth`

### `GET /api/auth/captcha`
获取图形验证码（CAPTCHA）。

**响应:**
```json
{
  "captchaId": "uuid-string",
  "svgBase64": "data:image/svg+xml;base64,..."
}
```
captchaId 用于后续注册/登录/发送验证码。

---

### `POST /api/auth/send-code`
发送邮箱验证码（需要先通过 CAPTCHA 验证）。

**请求体:**
```json
{
  "email": "user@example.com",
  "captchaId": "uuid-from-captcha",
  "captchaText": "ABCD"
}
```

**响应:** `{ "success": true }`

**错误:** 429 — 60 秒内重复请求

---

### `POST /api/auth/verify-code`
验证邮箱验证码并激活账户 + 自动登录。

**请求体:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应:**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1, "username": "test", "email": "user@example.com",
    "avatar_url": null, "plan": "free", "is_admin": false
  }
}
```

---

### `POST /api/auth/register`
注册新账户。

**请求体:**
```json
{
  "username": "test",
  "email": "user@example.com",
  "password": "mypassword",
  "captchaId": "uuid",
  "captchaText": "ABCD"
}
```

**响应:** `{ "success": true, "email": "user@example.com" }`

**流程:** 注册成功后自动发送 6 位验证码到邮箱，用户需调用 `verify-code` 激活。

**错误:** 409 — 邮箱已注册

---

### `POST /api/auth/login`
登录。

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "captchaId": "uuid",
  "captchaText": "ABCD"
}
```

**响应:**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1, "username": "test", "email": "user@example.com",
    "plan": "free", "avatar_url": null, "is_admin": false
  }
}
```

**错误:**
- 401 — 用户名或密码错误
- 403 — 邮箱未验证（需先验证邮箱），响应额外包含 `needVerify: true` 和 `email`

---

### `POST /api/auth/forgot-password`
发送密码重置验证码到邮箱。

**请求体:** `{ "email": "user@example.com" }`

**响应:** `{ "success": true }` （无论邮箱是否存在都返回成功，防止枚举攻击）

**限制:** 每个邮箱 60 秒内仅可请求 1 次

---

### `POST /api/auth/reset-password`
使用验证码重置密码。

**请求体:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "newpassword"
}
```

**限制:** 密码长度 ≥ 6 字符

**响应:** `{ "success": true }`

---

## 二、用户模块 `/api/user`

### `GET /api/user/me` 🔒
获取当前登录用户信息。

**响应:**
```json
{
  "id": 1, "username": "test", "email": "user@example.com",
  "avatar_url": null, "plan": "free", "is_admin": false,
  "subscription_expires_at": null, "subscription_status": "none",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

### `PUT /api/user/me` 🔒
更新当前用户资料。

**请求体:**
```json
{
  "username": "newName",
  "avatar_url": "https://example.com/avatar.png"
}
```
两个字段均为可选。

**响应:** `{ "success": true }`

---

### `GET /api/user/me/patterns` 🔒
获取当前用户的所有作品。

**响应:** PatternRow[] 数组，每个元素同 `/api/patterns/:id` 返回格式（不含 author_name）。

---

### `GET /api/user/me/favorites` 🔒
获取当前用户收藏的所有作品。

**响应:** PatternRow[] 数组。

---

### `POST /api/user/me/refresh-token` 🔒
支付成功后刷新 JWT Token（JWT plan 字段升级为 pro/team）。

**响应:** `{ "token": "new-jwt-token" }`

---

### `GET /api/user/me/stats` 🔒
获取当前用户统计数据。

**响应:**
```json
{
  "patternCount": 5,
  "favoriteCount": 12,
  "totalDownloads": 34
}
```

---

### `GET /api/user/profile/:id`
获取用户公开资料。

**响应:**
```json
{
  "id": 1, "username": "test", "avatar_url": null,
  "created_at": "...", "patternCount": 5, "totalLikes": 42
}
```

---

### `POST /api/user/feedback` 🔒
提交用户反馈。

**请求体:**
```json
{
  "subject": "功能建议 (max 200 chars)",
  "message": "详细内容 (max 2000 chars)"
}
```

**响应:** `{ "success": true }`

---

## 三、作品模块 `/api/patterns`

### `GET /api/patterns/`
获取公开作品列表（支持分页、筛选、搜索）。

**查询参数:**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 12 | 每页数量 |
| `sort` | "newest" \| "popular" | "newest" | 排序方式 |
| `category` | string | - | 分类筛选 |
| `search` | string | - | 标题/描述搜索 |
| `userId` | number | - | 按用户筛选 |

**响应:**
```json
{
  "patterns": [
    {
      "id": 1, "user_id": 1, "author_name": "test",
      "title": "My Pattern", "description": "...", "category": "animals",
      "brand": "perler", "grid_size": 32,
      "grid_data": "[[\"#FFFFFF\",\"#000000\"],...]",
      "color_counts": "{\"#FFFFFF\": 42, \"#000000\": 10}",
      "likes_count": 5, "downloads_count": 3,
      "is_public": true, "is_approved": true, "is_featured": false,
      "thumbnail_url": null, "is_deleted": false,
      "created_at": "...", "updated_at": "..."
    }
  ],
  "total": 100
}
```

---

### `GET /api/patterns/:id`
获取单个作品详情（含点赞状态）。支持 optional auth — 登录后返回 `is_liked`。

**响应:**
```json
{
  "id": 1, "user_id": 1, "author_name": "test",
  "title": "My Pattern", ...,
  "is_liked": false
}
```

---

### `POST /api/patterns/` 🔒
创建新作品。

**请求体:**
```json
{
  "title": "My Pattern",
  "description": "A cool pattern",
  "category": "animals",
  "brand": "perler",
  "gridSize": 32,
  "gridData": [["#FFFFFF","#000000"],...],
  "colorCounts": {"#FFFFFF": 42, "#000000": 10},
  "isPublic": true
}
```

**响应:** (201) 返回完整的 PatternRow 对象。

---

### `PUT /api/patterns/:id/publish` 🔒
将未公开作品发布为公开。

**响应:** `{ "success": true }`

---

### `DELETE /api/patterns/:id` 🔒
删除自己的作品。

**响应:** `{ "success": true }`

---

### `POST /api/patterns/:id/like` 🔒
切换点赞状态（未赞→赞，已赞→取消）。

**响应:**
```json
{ "liked": true }
// 或
{ "liked": false }
```

---

### `POST /api/patterns/:id/download`
增加下载计数（无需登录）。

**响应:** `{ "success": true }`

---

### 评论子路由

### `GET /api/patterns/:id/comments`
获取作品评论列表。

**响应:**
```json
[
  {
    "id": 1, "content": "Nice pattern!",
    "created_at": "...", "username": "test",
    "avatar_url": null, "user_id": 1
  }
]
```

---

### `POST /api/patterns/:id/comments` 🔒
添加评论。内容自动截断至 1000 字符。

**请求体:** `{ "content": "Nice pattern!" }`

**响应:** (201) `{ "success": true }`

---

### `DELETE /api/patterns/:id/comments/:commentId` 🔒
删除自己的评论。

**响应:** `{ "success": true }`

---

## 四、支付模块 `/api/payments`

### `POST /api/payments/create` 🔒
创建支付订单并生成 QR 码。

**请求体:**
```json
{
  "plan": "pro",
  "provider": "alipay"
}
```

- `plan`: `"pro"` (¥29/月) | `"team"` (¥69/月)
- `provider`: `"alipay"` | `"wechat"`

**响应:**
```json
{
  "orderNo": "FB-20260520-A1B2C3D4",
  "qrCode": "https://qr.alipay.com/...",
  "amount": 29,
  "plan": "pro",
  "provider": "alipay",
  "simulated": false
}
```
`simulated: true` 表示支付提供者不可用（无凭证），前端应展示"模拟支付"按钮。

---

### `GET /api/payments/order/:orderNo` 🔒
查询订单状态（前端每 2 秒轮询此接口）。

**响应:**
```json
{
  "status": "pending",
  "plan": "pro",
  "amount": 29
}
```
status 取值: `pending` | `paid` | `cancelled` | `expired` | `refunded`

---

### `GET /api/payments/orders` 🔒
获取当前用户的订单列表。

**响应:** OrderRow[] 数组。

---

### `POST /api/payments/cancel/:orderNo` 🔒
取消待支付订单（仅 `pending` 状态可取消）。

**响应:** `{ "success": true }`

---

### `POST /api/payments/simulate/:orderNo` 🔒
模拟支付成功（开发/测试用）。

**响应:** `{ "success": true }`

---

### `POST /api/payments/webhook/alipay`
支付宝异步通知回调（无需认证，由支付宝 SDK 验签）。

### `POST /api/payments/webhook/wechat`
微信支付回调通知（无需认证，由微信 V3 API 验签）。

---

## 五、管理后台 `/api/admin` 👑

所有接口需要先通过 `authMiddleware`（JWT 认证）再通过 `adminMiddleware`（查询数据库校验 `is_admin`）。

### 统计

### `GET /api/admin/stats` 👑

**响应:**
```json
{
  "totalUsers": 100,
  "totalPatterns": 500,
  "totalComments": 1200,
  "pendingPatterns": 5,
  "todayGenerations": 12
}
```

---

### 用户管理

### `GET /api/admin/users` 👑
用户列表（已过滤 password_hash）。

**查询参数:** `page`, `limit` (默认 20), `search`

**响应:** `{ "users": [...], "total": 100 }`

### `GET /api/admin/users/:id` 👑
单个用户详情。

### `PUT /api/admin/users/:id` 👑
修改用户属性（plan, is_banned, is_admin）。操作自动记录到 admin_logs。

**请求体:** `{ "plan": "pro", "is_banned": false, "is_admin": false }`

### `DELETE /api/admin/users/:id` 👑
删除用户（不能删除自己）。

---

### 作品管理

### `GET /api/admin/patterns` 👑
作品列表。**查询参数:** `status` (`all`|`pending`|`approved`|`deleted`), `page`, `limit`, `search`

### `PUT /api/admin/patterns/:id` 👑
审核/管理作品。

**请求体:**
```json
{ "action": "approve" }
```
action 取值: `approve` | `reject` | `feature` | `unfeature` | `softDelete` | `restore`

### `DELETE /api/admin/patterns/:id` 👑
永久删除作品。

---

### 评论管理

### `GET /api/admin/comments` 👑
所有评论列表（含作者名和作品标题）。

### `DELETE /api/admin/comments/:id` 👑
删除评论。

---

### 反馈管理

### `GET /api/admin/feedback` 👑
反馈列表（含提交者用户名和邮箱）。

### `POST /api/admin/feedback/read-all` 👑
全部标记已读。

### `POST /api/admin/feedback/:id/read` 👑
标记单条已读。

### `GET /api/admin/feedback/unread-count` 👑
未读反馈数。

---

### 操作日志

### `GET /api/admin/logs` 👑
管理员操作日志（分页）。每条日志含 `admin_name`（操作者用户名）。

---

### 系统设置

### `GET /api/admin/settings` 👑
获取全部系统设置（键值对）。

### `PUT /api/admin/settings` 👑
批量更新系统设置。

**请求体:**
```json
[
  { "key": "site_title", "value": "My Site" },
  { "key": "maintenance_mode", "value": "false" }
]
```

---

## 六、工具模块 `/api/tool`

### `POST /api/tool/convert`
图像转拼豆图案（代理转发到 Python 处理服务）。

**请求体:** 透传到 `PROCESSOR_URL` 服务。

**错误:** 503 — 图像处理服务未启动。

---

## 七、健康检查

### `GET /api/health`
**响应:** `{ "status": "ok", "timestamp": "2026-05-20T..." }`

无需认证，用于 Railway 健康检测和监控。

---

## 认证流程总结

```
注册: captcha → register → (自动发验证码) → verify-code → 获得 JWT
登录: captcha → login → 获得 JWT
忘记密码: forgot-password → (邮箱收验证码) → reset-password → 新密码登录
支付升级: create → (扫码支付) → 轮询 order/:orderNo → refresh-token → JWT plan 字段更新
```

## 支付流程总结

```
1. POST /payments/create     → 返回 orderNo + qrCode
2. 展示 QR 码                 → 用户扫码支付
3. GET /payments/order/:no   → 每 2 秒轮询
4. 支付宝/微信回调 webhook   → 后端验签 → completePayment → 升级用户 plan
5. POST /user/me/refresh-token → 前端获取新 JWT
```
