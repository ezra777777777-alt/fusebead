# FuseBead 数据库文档

## 数据库架构

FuseBead 使用**双数据库引擎**设计：

- **生产环境（DATABASE_URL 存在）**: PostgreSQL（通过 Supabase 托管）
- **本地开发（DATABASE_URL 未设置）**: SQLite（通过 sql.js WASM，文件存储）
- 数据访问层代码完全一致，差异由 `server/src/config/db.ts` 的 `query()` 函数自动处理

### SQL 兼容层

`query()` 函数自动执行以下转换（PG 模式）：

| SQLite 写法 | PostgreSQL 转换 |
|-------------|-----------------|
| `?` 占位符 | `$1`, `$2`, `$3`... |
| `datetime('now')` | `NOW()` |
| `datetime('now', ? \|\| ' minutes')` | `NOW() + (? \|\| ' minutes')::INTERVAL` |
| `DATE('now')` | `CURRENT_DATE` |
| `TRUE` / `FALSE` | `1` / `0` |
| `INSERT ... VALUES (...)` | 自动追加 `RETURNING id` |

---

## 表结构

### 1. users — 用户表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `username` | TEXT | TEXT | NOT NULL | 用户名 |
| `email` | TEXT | TEXT | NOT NULL, UNIQUE | 邮箱（唯一） |
| `password_hash` | TEXT | TEXT | NOT NULL | BCrypt 哈希（10 轮） |
| `avatar_url` | TEXT | TEXT | NULLABLE | 头像 URL |
| `plan` | TEXT | TEXT | DEFAULT 'free' | 套餐：free / pro / team |
| `is_admin` | INTEGER | INTEGER | DEFAULT 0 | 管理员标志 |
| `is_banned` | INTEGER | INTEGER | DEFAULT 0 | 封禁标志 |
| `email_verified` | INTEGER | INTEGER | DEFAULT 1 | 邮箱验证状态（PG 默认 1，本地开发默认 1） |
| `subscription_expires_at` | TEXT | TEXT | NULLABLE | 订阅到期时间（ISO 字符串） |
| `subscription_status` | TEXT | TEXT | DEFAULT 'none' | 订阅状态：none / active / expired |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 创建时间 |
| `updated_at` | TEXT | TEXT | DEFAULT NOW() | 更新时间 |

**外键引用方:** patterns, favorites, comments, orders, feedbacks, admin_logs

---

### 2. patterns — 作品/图纸表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 作者 |
| `title` | TEXT | TEXT | NOT NULL | 标题 |
| `description` | TEXT | TEXT | NULLABLE | 描述 |
| `category` | TEXT | TEXT | NULLABLE | 分类标签 |
| `brand` | TEXT | TEXT | DEFAULT 'perler' | 品牌：perler / hama / artkal |
| `grid_size` | INTEGER | INTEGER | NOT NULL | 网格尺寸（N×N） |
| `grid_data` | TEXT | TEXT | NOT NULL | 像素数据（JSON 二维数组 `[["#fff","#000"],...]`） |
| `color_counts` | TEXT | TEXT | NULLABLE | 颜色统计（JSON 对象 `{"#fff":42,"#000":10}`） |
| `thumbnail_url` | TEXT | TEXT | NULLABLE | 缩略图 URL |
| `likes_count` | INTEGER | INTEGER | DEFAULT 0 | 收藏/点赞数 |
| `downloads_count` | INTEGER | INTEGER | DEFAULT 0 | 下载数 |
| `is_public` | INTEGER | INTEGER | DEFAULT 1 | 是否公开 |
| `is_approved` | INTEGER | INTEGER | DEFAULT 1 | 审核状态 |
| `is_featured` | INTEGER | INTEGER | DEFAULT 0 | 是否推荐 |
| `is_deleted` | INTEGER | INTEGER | DEFAULT 0 | 软删除标志 |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 创建时间 |
| `updated_at` | TEXT | TEXT | DEFAULT NOW() | 更新时间 |

**索引:** user_id（通过外键自动索引）
**被引用:** favorites(pattern_id), comments(pattern_id)

---

### 3. favorites — 收藏表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 用户 |
| `pattern_id` | INTEGER | INTEGER | NOT NULL, FK→patterns(id) ON DELETE CASCADE | 作品 |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 收藏时间 |

**唯一约束:** `UNIQUE(user_id, pattern_id)` — 同一用户不能重复收藏同一作品

---

### 4. comments — 评论表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 评论者 |
| `pattern_id` | INTEGER | INTEGER | NOT NULL, FK→patterns(id) ON DELETE CASCADE | 被评论作品 |
| `content` | TEXT | TEXT | NOT NULL | 评论内容（最长 1000 字符） |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 评论时间 |

---

### 5. orders — 订单表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 用户 |
| `order_no` | TEXT | TEXT | NOT NULL, UNIQUE | 订单号（格式: FB-YYYYMMDD-XXXXXXXX） |
| `provider` | TEXT | TEXT | NOT NULL, CHECK IN ('alipay','wechat') | 支付方式 |
| `plan` | TEXT | TEXT | NOT NULL, CHECK IN ('pro','team') | 套餐类型 |
| `amount` | DOUBLE PRECISION / REAL | REAL | NOT NULL | 金额（CNY）：pro=29, team=69 |
| `out_trade_no` | TEXT | TEXT | NULLABLE | 支付平台交易号 |
| `qr_code` | TEXT | TEXT | NULLABLE | QR 码 URL 或内容 |
| `status` | TEXT | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','paid','cancelled','expired','refunded') | 订单状态 |
| `paid_at` | TEXT | TEXT | NULLABLE | 支付时间（ISO 字符串） |
| `subscription_expires_at` | TEXT | TEXT | NULLABLE | 订阅到期时间 |
| `auto_renew` | INTEGER | INTEGER | DEFAULT 1 | 自动续费标志 |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 创建时间 |
| `updated_at` | TEXT | TEXT | DEFAULT NOW() | 更新时间 |

---

### 6. admin_logs — 管理员操作日志

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `admin_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 操作者 |
| `action` | TEXT | TEXT | NOT NULL | 操作类型（update_user, delete_user, approve, feature, hard_delete 等） |
| `target_type` | TEXT | TEXT | NULLABLE | 操作目标类型（user, pattern, comment, system_settings） |
| `target_id` | INTEGER | INTEGER | NULLABLE | 操作目标 ID |
| `detail` | TEXT | TEXT | NULLABLE | 操作详情（JSON 字符串） |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 操作时间 |

---

### 7. system_settings — 系统设置

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `setting_key` | TEXT | TEXT | NOT NULL, UNIQUE | 设置键名 |
| `setting_value` | TEXT | TEXT | NULLABLE | 设置值 |
| `updated_at` | TEXT | TEXT | DEFAULT NOW() | 更新时间 |

使用 `ON CONFLICT ... DO UPDATE`（PG）/ `INSERT OR REPLACE` 模式实现 upsert。

---

### 8. verification_codes — 验证码表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `email` | TEXT | TEXT | NOT NULL | 邮箱（或 CAPTCHA ID） |
| `code` | TEXT | TEXT | NOT NULL | 验证码（6 位数字 / 4 位字母） |
| `type` | TEXT | TEXT | NOT NULL, CHECK IN ('captcha','email_verify','password_reset') | 验证码类型 |
| `expires_at` | TEXT | TEXT | NOT NULL | 过期时间 |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 创建时间 |

**索引:** `idx_verification_codes_type_email ON (type, email)` — 加速按类型+邮箱查验证码

**TTL:**
- captcha: 5 分钟
- email_verify: 10 分钟
- password_reset: 10 分钟

---

### 9. feedbacks — 用户反馈表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NOT NULL, FK→users(id) ON DELETE CASCADE | 提交者 |
| `subject` | TEXT | TEXT | NOT NULL | 主题（最长 200 字符） |
| `message` | TEXT | TEXT | NOT NULL | 内容（最长 2000 字符） |
| `is_read` | INTEGER | INTEGER | DEFAULT 0 | 管理员已读标志 |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 提交时间 |

---

### 10. generation_logs — 生成日志表

| 列名 | PG 类型 | SQLite 类型 | 约束 | 说明 |
|------|---------|-------------|------|------|
| `id` | SERIAL | INTEGER | PRIMARY KEY | 自增主键 |
| `user_id` | INTEGER | INTEGER | NULLABLE | 用户 ID |
| `pattern_id` | INTEGER | INTEGER | NULLABLE | 生成的作品 ID |
| `source_type` | TEXT | TEXT | NULLABLE | 来源类型（upload / camera / demo） |
| `created_at` | TEXT | TEXT | DEFAULT NOW() | 生成时间 |

---

## 实体关系图 (ERD)

```
users (1) ─────< patterns (N)     user 创作作品
users (1) ─────< favorites (N)    user 收藏作品
users (1) ─────< comments (N)     user 发表评论
users (1) ─────< orders (N)       user 创建订单
users (1) ─────< feedbacks (N)    user 提交反馈
users (1) ─────< admin_logs (N)   admin 操作日志
users (1) ─────< generation_logs (N)  生成日志
patterns (1) ──< favorites (N)   pattern 被收藏
patterns (1) ──< comments (N)    pattern 被评论
```

所有外键均设置 `ON DELETE CASCADE`，删除用户时级联删除其所有作品、收藏、评论、订单、反馈和日志。

---

## 定时任务

后端有两个定时清理任务（`server/src/index.ts`）：

1. **清理过期验证码** — 每 5 分钟执行一次
   ```sql
   DELETE FROM verification_codes WHERE expires_at <= NOW()
   ```

2. **检查订阅到期** — 每小时执行一次
   ```sql
   UPDATE users SET plan = 'free', subscription_status = 'expired',
     subscription_expires_at = NULL, updated_at = NOW()
   WHERE subscription_status = 'active'
     AND subscription_expires_at IS NOT NULL
     AND subscription_expires_at <= NOW()
     AND plan != 'free'
   ```
   返回降级用户数，不为 0 时打印日志。

---

## 本地 SQLite 数据库

- 文件位置: `server/data/fusebead.db`
- 读写通过 sql.js WASM（纯 JavaScript SQLite 实现）
- 每次写操作后自动 `fs.writeFileSync` 保存
- 约束：
  - WAL 日志模式（`PRAGMA journal_mode = WAL`）
  - 外键约束开启（`PRAGMA foreign_keys = ON`）
  - SQLite CHECK 约束重建（迁移 verification_codes 的 type CHECK 到包含 password_reset）
- `.gitignore` 已排除 `server/data/` 目录
