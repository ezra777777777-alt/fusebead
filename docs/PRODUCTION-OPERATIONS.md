# 生产运维手册

## 快速健康检查

本地电脑：

```bash
curl https://api.fusebead.cn/api/health
nslookup fusebead.cn
nslookup www.fusebead.cn
nslookup api.fusebead.cn
```

ECS：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:5000/health
curl https://api.fusebead.cn/api/health
pm2 status
sudo systemctl status fusebead-processor
sudo systemctl status nginx
sudo systemctl status postgresql
```

## 前端发布

前端托管在 Vercel，Production 跟踪 `main` 分支。

常规发布：

```bash
git push origin main
```

Vercel 环境变量变更后，必须在 Vercel Dashboard 重新部署。尤其是：

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`

浏览器验证：

1. 打开 `https://www.fusebead.cn`
2. DevTools -> Network
3. 确认 API 请求指向 `https://api.fusebead.cn/api`
4. Footer 能看到 `粤ICP备2026067307号-1`

## 后端发布

SSH 到 ECS：

```bash
ssh root@8.137.212.1
```

推荐用 `admin` 用户管理应用：

```bash
cd /home/admin/fusebead
git pull
cd server
npm install
npm run build
pm2 restart fusebead
```

验证：

```bash
curl https://api.fusebead.cn/api/health
pm2 logs fusebead --lines 50
```

## Processor 发布

当 `processor/` 代码或依赖变更时：

```bash
cd /home/admin/fusebead
git pull
cd processor
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart fusebead-processor
curl http://127.0.0.1:5000/health
```

日志：

```bash
sudo journalctl -u fusebead-processor -n 100 --no-pager
```

## CORS 故障

症状：

- 浏览器控制台出现 `No Access-Control-Allow-Origin`
- 验证码加载一直转圈
- 图纸库、登录、注册接口失败

检查当前访问域名。若页面是 `https://www.fusebead.cn`，ECS `server/.env` 必须包含：

```env
CORS_ORIGIN=https://fusebead.cn,https://www.fusebead.cn,https://fusebead.vercel.app,http://localhost:3000
```

修改后：

```bash
cd /home/admin/fusebead/server
pm2 restart fusebead
```

验证：

```bash
curl -i -H "Origin: https://www.fusebead.cn" https://api.fusebead.cn/api/auth/captcha
```

应看到：

```text
Access-Control-Allow-Origin: https://www.fusebead.cn
```

## Nginx 和证书

配置文件：

```text
/etc/nginx/sites-available/fusebead
```

检查配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

证书由 Certbot 管理：

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

若重新申请：

```bash
sudo certbot --nginx -d api.fusebead.cn
```

前提：

- `api.fusebead.cn` DNS 指向 `8.137.212.1`
- 阿里云防火墙开放 80/443
- Nginx 能响应 80 端口

## PostgreSQL 备份

建议每天至少一份逻辑备份。手动备份：

```bash
mkdir -p /home/admin/backups
pg_dump "postgresql://fusebead:<password>@127.0.0.1:5432/fusebead" \
  --no-owner --format=custom \
  > /home/admin/backups/fusebead-$(date +%F-%H%M).dump
```

恢复到空库：

```bash
pg_restore --clean --if-exists \
  --dbname "postgresql://fusebead:<password>@127.0.0.1:5432/fusebead" \
  /home/admin/backups/<backup-file>.dump
```

不要只依赖 ECS 本机磁盘。正式交付前建议配置异地备份。

## 常见问题

### `https://api.fusebead.cn/api` 返回 `Cannot GET /api/`

正常。根 `/api/` 没有定义路由。健康检查用：

```text
https://api.fusebead.cn/api/health
```

### 验证码不显示

优先查 CORS，其次查数据库写入验证码是否失败：

```bash
pm2 logs fusebead --lines 80
curl -i -H "Origin: https://www.fusebead.cn" https://api.fusebead.cn/api/auth/captcha
```

### 图片生成失败

检查 Express 到 Processor：

```bash
curl http://127.0.0.1:5000/health
sudo systemctl status fusebead-processor
pm2 logs fusebead --lines 80
```

### Vercel 域名无法访问

检查 Vercel Domains 页面是否为 Valid Configuration。当前 DNS 应为：

```text
@    A      216.198.79.1
www  CNAME  a3b6de8a5f0ba5c8.vercel-dns-017.com
```

如果 Vercel 提示新推荐记录，以 Vercel 页面为准。

## 安全操作

- `.env`、数据库密码、SMTP 授权码、支付私钥不要提交到 Git。
- GitHub PAT 如果出现在 remote URL、截图、聊天记录中，立即轮换。
- 阿里云 ECS 只开放 22/80/443。
- 定期检查 `pm2 logs`、`journalctl`、Nginx error log。
