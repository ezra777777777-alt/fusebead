# 账号与资源交接清单

本文只记录资源在哪里、应该交接什么，不记录真实密码或私钥。

## 资源总览

| 类别 | 平台/资源 | 当前值 | 接手动作 |
|------|-----------|--------|----------|
| 代码仓库 | GitHub | `ezra777777777-alt/fusebead` | 加接手人为 collaborator 或转移仓库 |
| 前端托管 | Vercel | 项目 `fusebead` | 加接手人到 Vercel team/project |
| 域名 | 阿里云万网 | `fusebead.cn` | 转移域名管理权或加账号权限 |
| DNS | 阿里云云解析 DNS | `@`、`www`、`api` | 确认解析和 TTL |
| ICP | 阿里云备案 | `粤ICP备2026067307号-1` | 交接备案主体账号 |
| 后端服务器 | 阿里云轻量应用服务器 | `8.137.212.1` | 交接 ECS 控制台权限和 SSH 登录 |
| 数据库 | ECS 本地 PostgreSQL | database `fusebead` | 交接 DB 密码和备份方式 |
| 邮件 | 163 SMTP | `SMTP_USER` 对应邮箱 | 交接邮箱和 SMTP 授权码 |
| 支付 | 支付宝/微信支付 | 沙箱或正式商户号 | 交接商户平台权限和证书 |

## GitHub

需要交接：

- GitHub 仓库管理权限
- 默认分支保护策略，如有
- GitHub token / deploy token，如有
- GitHub Actions secrets，如未来新增

安全注意：

- 不要把 PAT 写在 remote URL 里。
- 交接前轮换任何已经出现在终端、截图、聊天记录或本地 remote 配置中的 PAT。
- 推荐 remote：

```bash
git remote set-url origin https://github.com/ezra777777777-alt/fusebead.git
```

## Vercel

项目：`fusebead`

Production 域名：

- `fusebead.vercel.app`
- `fusebead.cn`
- `www.fusebead.cn`

Production 环境变量：

```env
NEXT_PUBLIC_API_URL=https://api.fusebead.cn/api
NEXT_PUBLIC_SITE_URL=https://fusebead.cn
NEXT_PUBLIC_SUPABASE_URL=<如仍使用 Supabase 存储才需要>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<如仍使用 Supabase 存储才需要>
```

接手动作：

1. 加接手人为 Vercel 项目成员。
2. 确认 Domains 页面全部是 Valid Configuration。
3. 确认 Production 环境变量不是旧的 `localhost` 或 Railway 地址。
4. 推送 main 后观察自动部署。

## 阿里云域名与 DNS

域名：`fusebead.cn`

DNS 记录：

| 主机记录 | 类型 | 值 | 用途 |
|----------|------|----|------|
| `@` | A | `216.198.79.1` | Vercel 裸域名 |
| `www` | CNAME | `a3b6de8a5f0ba5c8.vercel-dns-017.com` | Vercel 主站 |
| `api` | A | `8.137.212.1` | ECS API |

接手动作：

- 交接阿里云账号或 RAM 权限。
- 确认域名实名认证和备案主体不会过期。
- 若 Vercel 提示 DNS 推荐值变化，以 Vercel Domains 页面为准修改。

## 阿里云 ECS

当前公开信息：

- 公网 IP：`8.137.212.1`
- 系统：Ubuntu 22.04 LTS
- 推荐应用用户：`admin`
- 代码目录：`/home/admin/fusebead`
- Nginx 配置：`/etc/nginx/sites-available/fusebead`
- API 域名：`api.fusebead.cn`

需要交接：

- 阿里云控制台登录和 MFA
- root/admin SSH 登录方式
- ECS 实例续费方式
- 安全组/防火墙规则
- PostgreSQL 密码
- `/home/admin/fusebead/server/.env` 内容

公网端口原则：

- 只开放 `22`、`80`、`443`
- 不开放 `3001`、`5000`
- Express 和 Flask 仅监听 `127.0.0.1`

## 后端生产环境变量

文件位置：

```text
/home/admin/fusebead/server/.env
```

必须项：

```env
PORT=3001
HOST=127.0.0.1
JWT_SECRET=<强随机值>
CORS_ORIGIN=https://fusebead.cn,https://www.fusebead.cn,https://fusebead.vercel.app,http://localhost:3000
DATABASE_URL=postgresql://fusebead:<password>@127.0.0.1:5432/fusebead
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=<邮箱>
SMTP_PASS=<SMTP 授权码>
SMTP_FROM=<邮箱>
PROCESSOR_URL=http://127.0.0.1:5000
APP_BASE_URL=https://api.fusebead.cn
ALIPAY_NOTIFY_URL=https://api.fusebead.cn/api/payments/webhook/alipay
WECHAT_NOTIFY_URL=https://api.fusebead.cn/api/payments/webhook/wechat
NODE_ENV=production
```

支付凭证根据是否正式上线填写。

## 备案

- 备案号：`粤ICP备2026067307号-1`
- 页面展示位置：全站 Footer
- 代码位置：`src/components/shared/footer.tsx`
- 链接：`https://beian.miit.gov.cn/`

接手人需确保备案主体、域名持有者、实际网站内容一致。
