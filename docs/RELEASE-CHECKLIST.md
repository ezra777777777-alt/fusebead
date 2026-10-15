# 交付验收清单

## 代码仓库

- [ ] `git status` 干净，除明确保留的本地文件外没有未提交改动
- [ ] `main` 已推送 GitHub
- [ ] Git remote 不含 GitHub token
- [ ] 任何已暴露 token 已轮换
- [ ] `server/dist/` 与 `server/src/` 同步
- [ ] `.env`、数据库文件、日志文件未提交

## 前端

- [ ] Vercel 项目为 `fusebead`
- [ ] Production 跟踪 `main`
- [ ] `NEXT_PUBLIC_API_URL=https://api.fusebead.cn/api`
- [ ] `NEXT_PUBLIC_SITE_URL=https://fusebead.cn`
- [ ] `fusebead.cn` 和 `www.fusebead.cn` 为 Valid Configuration
- [ ] `https://fusebead.cn` 跳转到 `https://www.fusebead.cn`
- [ ] Footer 显示 `粤ICP备2026067307号-1`

## 后端

- [ ] `https://api.fusebead.cn/api/health` 返回 200
- [ ] PM2 中 `fusebead` 状态为 online
- [ ] `HOST=127.0.0.1`
- [ ] `CORS_ORIGIN` 包含 `https://www.fusebead.cn`
- [ ] `PROCESSOR_URL=http://127.0.0.1:5000`
- [ ] `APP_BASE_URL=https://api.fusebead.cn`
- [ ] `JWT_SECRET` 是强随机值

## Processor

- [ ] `curl http://127.0.0.1:5000/health` 返回 `{"status":"ok"}`
- [ ] `systemctl status fusebead-processor` 正常
- [ ] 图片上传生成链路通过

## 数据库

- [ ] PostgreSQL 服务正常
- [ ] 应用使用 `DATABASE_URL` 指向本地 PostgreSQL
- [ ] 已确认是否需要从 Supabase 迁移数据
- [ ] 已建立数据库备份策略
- [ ] 接手人拿到 PostgreSQL 密码

## 域名与备案

- [ ] 阿里云 DNS 三条记录正确
- [ ] ICP 备案号为 `粤ICP备2026067307号-1`
- [ ] 备案号链接到 `https://beian.miit.gov.cn/`
- [ ] `api.fusebead.cn` HTTPS 证书有效
- [ ] `certbot renew --dry-run` 通过

## 业务功能验收

- [ ] 首页可访问
- [ ] 登录弹窗验证码可显示
- [ ] 注册/登录流程通过
- [ ] 邮箱验证码可收到
- [ ] Gallery 列表可加载
- [ ] 图片上传生成可用
- [ ] Dashboard 可访问
- [ ] 支付页面可打开
- [ ] 管理后台管理员账号可登录

## 账号交接

- [ ] GitHub 仓库权限
- [ ] Vercel 项目权限
- [ ] 阿里云账号/RAM 权限
- [ ] 域名和备案主体权限
- [ ] ECS 登录方式
- [ ] 163 邮箱和 SMTP 授权码
- [ ] 支付宝/微信支付商户权限
- [ ] 密码管理器中保存所有生产密钥
