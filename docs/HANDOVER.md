# FuseBead 交接总览

## 交接目标

让接手人不依赖聊天记录，也能快速知道：

- 这个项目是什么、跑在哪里、怎么部署
- 线上资源归谁管、在哪里看、哪些密钥不能丢
- 出问题时从哪条链路开始排查
- 下一步还有哪些风险和待办

## 产品定位

FuseBead 是一个拼豆图案生成和社区平台。用户可以上传图片生成拼豆图纸，也可以手工编辑像素网格、发布到图纸库、收藏评论，并通过 Pro/Team 订阅解锁高级功能。

核心页面：

- 首页：`/`
- 生成器：`/generator`
- 编辑器：`/editor`
- 转换器：`/converter`
- 图纸库：`/gallery`
- 控制台：`/dashboard`
- 定价：`/pricing`
- 管理后台：`/admin`

## 当前线上架构

```text
用户浏览器
  |
  |  https://www.fusebead.cn
  v
Vercel 前端项目 fusebead
  |
  |  NEXT_PUBLIC_API_URL=https://api.fusebead.cn/api
  v
阿里云 ECS / Nginx :443
  |
  +--> Express API 127.0.0.1:3001 / PM2 进程 fusebead
  |
  +--> Flask Processor 127.0.0.1:5000 / systemd 服务 fusebead-processor
  |
  +--> PostgreSQL 本地实例 127.0.0.1:5432 / database fusebead
```

## 生产域名

| 用途 | 域名 | 说明 |
|------|------|------|
| 主站 | `https://www.fusebead.cn` | Vercel Production 域名 |
| 裸域名 | `https://fusebead.cn` | Vercel 308 跳转到 `www` |
| API | `https://api.fusebead.cn/api` | 阿里云 ECS Nginx 反代到 Express |
| API 健康检查 | `https://api.fusebead.cn/api/health` | 返回 `{ status: "ok" }` |

DNS 当前应为：

| 主机记录 | 类型 | 值 |
|----------|------|----|
| `@` | A | `216.198.79.1` |
| `www` | CNAME | `a3b6de8a5f0ba5c8.vercel-dns-017.com` |
| `api` | A | `8.137.212.1` |

> Vercel DNS 推荐值可能会变化。若 Vercel Domains 页面出现 `DNS Change Recommended`，以 Vercel 页面为准。

## 备案

- ICP 备案号：`粤ICP备2026067307号-1`
- 前端 Footer 已挂备案号并链接到 `https://beian.miit.gov.cn/`
- 备案号代码位置：`src/components/shared/footer.tsx`

## 代码仓库

- GitHub：`https://github.com/ezra777777777-alt/fusebead`
- 默认分支：`main`
- Vercel Production 跟踪分支：`main`
- 后端 ECS 部署目录：`/home/admin/fusebead`

交付前安全项：

- 本地检查曾发现 Git remote URL 嵌入过 GitHub PAT。接手前应轮换该 token。
- 本地 remote 应改为不带 token 的 URL：

```bash
git remote set-url origin https://github.com/ezra777777777-alt/fusebead.git
```

## 应用组件

| 组件 | 技术 | 路径 | 进程/平台 |
|------|------|------|-----------|
| 前端 | Next.js 16 / React 19 | `src/` | Vercel |
| API | Express / TypeScript | `server/src/` | PM2 `fusebead` |
| 图片处理 | Flask / Pillow / NumPy | `processor/` | systemd `fusebead-processor` |
| 数据库 | PostgreSQL | ECS 本地 | systemd `postgresql` |
| 反代 | Nginx + Certbot | `/etc/nginx/sites-available/fusebead` | systemd `nginx` |

## 必须保管的密钥

不要提交到 Git。应通过密码管理器交接：

- 阿里云账号和 MFA
- ECS root/admin 登录方式
- PostgreSQL 用户 `fusebead` 密码
- `server/.env` 全量内容
- `JWT_SECRET`
- SMTP 邮箱授权码
- 支付宝/微信支付正式凭证
- GitHub 账号和 PAT / deploy token
- Vercel 账号和项目权限

## 当前已知风险

- CORS 必须包含实际访问域名。当前前端会走 `https://www.fusebead.cn`，后端 `.env` 必须包含该 origin。
- Vercel 环境变量保存后必须重新部署，`NEXT_PUBLIC_*` 才会进入前端包。
- `server/dist/` 当前纳入仓库；若改后端源码并部署 `dist/index.js`，需要运行 `server` 构建并同步 dist。
- 根 `npm run lint` 仍可能扫描后端或 dist 产生噪音，参见此前项目检查记录。
- `server/data/` 和 `.env` 均不应提交。

## 接手人第一天应做

1. 登录 Vercel，确认 `fusebead.cn`、`www.fusebead.cn` 为 Valid Configuration。
2. 登录阿里云 DNS，确认 `@`、`www`、`api` 三条解析。
3. SSH 到 ECS，执行健康检查：

```bash
curl https://api.fusebead.cn/api/health
curl http://127.0.0.1:5000/health
pm2 status
sudo systemctl status fusebead-processor
sudo systemctl status nginx
sudo systemctl status postgresql
```

4. 打开 `https://www.fusebead.cn`，测试登录、验证码、图纸库、图片生成。
5. 轮换任何曾经暴露过的 GitHub token。
