# FuseBead 阿里云 ECS 部署 Runbook

**服务器 IP:** 8.137.212.1
**系统:** Ubuntu 22.04 LTS (2C2G / 40GB)
**目标:** Express :3001 + Flask :5000 + PostgreSQL + Nginx

---

## 一、SSH 登录（在你的电脑终端）

```bash
ssh root@8.137.212.1
```

首次登录会提示指纹确认，输入 `yes`。输入你在控制台设的密码。

---

## 二、创建管理员用户（安全起见，不用 root 跑应用）

```bash
adduser admin
# 按提示设密码，其余信息一路回车跳过
usermod -aG sudo admin
```

---

## 三、基础环境安装

```bash
# 1. 系统更新
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 4. Nginx
sudo apt install -y nginx

# 5. Certbot + nginx 插件
sudo apt install -y certbot python3-certbot-nginx

# 6. Python 3
sudo apt install -y python3 python3-pip python3-venv

# 7. PM2
sudo npm install -g pm2

# 8. Git + 基础工具
sudo apt install -y git curl unzip

# 验证各组件版本
node -v    # 应显示 v20.x.x
python3 --version
psql --version
nginx -v
pm2 -v
```

---

## 四、防火墙确认

阿里云轻量服务器默认只开 22/80/443，无需额外操作。验证一下：

```bash
# 看一眼防火墙状态（轻量服务器控制台管理的，系统级别应该没开 ufw）
sudo ufw status
# 如显示 inactive，没问题。端口由阿里云控制台防火墙管理
```

不开放 3001/5000 公网端口，Express 和 Flask 只通过 Nginx 反向代理访问。

---

## 五、配置 PostgreSQL

```bash
# 1. 启动 PG
sudo systemctl enable --now postgresql

# 2. 生成数据库密码（记下来，等下填 .env 用）
openssl rand -base64 24

# 3. 创建数据库和用户（把 <密码> 替换成上面生成的）
sudo -u postgres psql <<'SQL'
CREATE DATABASE fusebead;
CREATE USER fusebead WITH PASSWORD '<密码>';
GRANT ALL PRIVILEGES ON DATABASE fusebead TO fusebead;
\c fusebead
GRANT ALL ON SCHEMA public TO fusebead;
SQL

# 4. 验证连接
psql "postgresql://fusebead:<密码>@127.0.0.1:5432/fusebead" -c "SELECT 1;"
```

---

## 六、生成 JWT Secret

```bash
openssl rand -hex 32
# 记下来，等下填 .env 用
```

---

## 七、部署 Express 后端

```bash
# 1. 克隆项目
cd /home/admin
git clone https://github.com/ezra777777777-alt/fusebead.git
cd fusebead/server

# 2. 安装依赖 + 编译
npm install
npm run build

# 3. 创建 .env（把尖括号部分替换成实际值）
cat > .env << 'EOF'
PORT=3001
HOST=127.0.0.1
JWT_SECRET=<第六步生成的>
CORS_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://fusebead:<密码>@127.0.0.1:5432/fusebead

SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASS=your_auth_code
SMTP_FROM=your_email@163.com

PROCESSOR_URL=http://127.0.0.1:5000

ALIPAY_SANDBOX=true
WECHAT_SANDBOX=true

NODE_ENV=production
EOF

# 4. PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# ↑ 复制它输出的 sudo 命令，粘贴执行
```

---

## 八、部署 Flask Processor

```bash
cd /home/admin/fusebead/processor

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

# 创建 systemd 服务
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

sudo systemctl daemon-reload
sudo systemctl enable --now fusebead-processor

# 验证 Processor
sleep 2
curl http://127.0.0.1:5000/health
# → {"status":"ok"}
```

---

## 九、配置 Nginx（备案前，仅 HTTP + IP 访问）

```bash
sudo tee /etc/nginx/sites-available/fusebead << 'NGINX'
server {
    listen 80;
    server_name _;

    # Express API
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

---

## 十、全链路验证

```bash
# 1. Express 内部检查
echo "=== Express ==="
curl http://127.0.0.1:3001/api/health

# 2. Processor 健康检查
echo "=== Processor ==="
curl http://127.0.0.1:5000/health

# 3. Nginx 代理检查
echo "=== Nginx ==="
curl http://127.0.0.1/api/health

# 4. 公网可访问性
echo "=== Public ==="
curl http://8.137.212.1/api/health

# 5. 数据库
echo "=== Database ==="
psql "postgresql://fusebead:<密码>@127.0.0.1:5432/fusebead" -c "SELECT 1;"
```

全部 5 项返回 200 或 `1` 即部署成功。

---

## 十一、备案通过后启用 HTTPS

```bash
# 1. 更新 Nginx server_name
sudo sed -i 's/server_name _;/server_name api.fusebead.cn;/' /etc/nginx/sites-available/fusebead
sudo nginx -t && sudo systemctl reload nginx

# 2. 确认 DNS 生效
dig api.fusebead.cn +short    # 应返回 8.137.212.1

# 3. 获取 SSL 证书
sudo certbot --nginx -d api.fusebead.cn

# 4. 更新 Express .env
# CORS_ORIGIN=https://fusebead.cn,http://localhost:3000
# 重新构建并重启
cd /home/admin/fusebead/server
npm run build && pm2 restart fusebead
```

---

## 常用运维命令

```bash
# Express
pm2 status                       # 进程状态
pm2 logs fusebead --lines 50     # 查看日志
pm2 restart fusebead             # 重启

# Processor
sudo systemctl status fusebead-processor
sudo systemctl restart fusebead-processor

# Nginx
sudo nginx -t                    # 检查配置
sudo systemctl reload nginx      # 重载配置（不中断服务）

# PostgreSQL
sudo systemctl status postgresql
psql "postgresql://fusebead:<密码>@127.0.0.1:5432/fusebead"

# 更新代码
cd /home/admin/fusebead
git pull
cd server && npm install && npm run build && pm2 restart fusebead
```
