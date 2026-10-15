# FuseBead 项目文件说明

本文档用于交付时快速判断：哪些目录是核心源码，哪些是部署文档，哪些只是本地生成文件。

## 一眼看懂目录

| 路径 | 作用 | 交付关注点 |
| --- | --- | --- |
| `src/` | Next.js 前端源码 | 页面、组件、前端 API 调用都在这里 |
| `server/` | Express + TypeScript 后端 | API、认证、支付、数据库连接、生产环境变量模板 |
| `server/dist/` | 后端 TypeScript 构建产物 | 目前仍随仓库保存，ECS 可直接运行 `dist/index.js` |
| `processor/` | Flask 图片处理服务 | 图像转换依赖它，生产环境监听 `127.0.0.1:5000` |
| `docs/` | 项目、部署、运维、交付文档 | 接手人优先从 `docs/README.md` 和 `docs/HANDOVER.md` 看起 |
| `public/` | 前端静态资源 | Logo、示例图、前端可直接访问的静态文件 |
| `scripts/` | 辅助脚本 | 用前先读脚本内容，避免误跑生产相关操作 |
| `.env.local.example` | 前端环境变量模板 | Vercel 变量以这里为准 |
| `server/.env.example` | 后端环境变量模板 | ECS 后端变量以这里为准 |

## 不应提交的本地文件

这些文件或目录是本地安装、构建、运行时生成的内容，已经写入 `.gitignore`：

| 路径/模式 | 说明 |
| --- | --- |
| `node_modules/`、`server/node_modules/` | npm 依赖目录 |
| `.next/`、`out/` | Next.js 构建产物 |
| `.env`、`.env.local`、`server/.env` | 本地真实密钥和环境变量 |
| `server/data/` | 本地 SQLite 数据 |
| `__pycache__/`、`processor/__pycache__/`、`*.py[cod]` | Python 缓存 |
| `*.tsbuildinfo` | TypeScript 增量编译缓存 |
| `*.log` | 日志文件 |

注意：当前仓库中 `server/dist/` 是有意保留的部署产物，不要在普通整理中删除。只有当部署流程改成“服务器拉源码后自行构建”时，再单独评估是否移出 Git。

## 当前交付重点文件

| 文件 | 用途 |
| --- | --- |
| `README.md` | 中文项目总览 |
| `docs/README.md` | 文档入口 |
| `docs/HANDOVER.md` | 交付总说明 |
| `docs/ACCESS-INVENTORY.md` | 账号、域名、云服务器、GitHub/Vercel 权限清单 |
| `docs/PRODUCTION-OPERATIONS.md` | 生产运维手册 |
| `docs/RELEASE-CHECKLIST.md` | 发布和交付检查表 |
| `docs/DEPLOYMENT.md` | 部署方案，包括阿里云国内迁移 |
| `server/RUNBOOK.md` | 后端运行和排障步骤 |

## 本地整理建议

交付前先确认 Git 状态：

```bash
git status --short
```

只提交文档、源码和模板文件。不要提交真实 `.env`、`node_modules`、`.next`、日志、缓存文件。

本地磁盘需要瘦身时，可以删除这些可再生成目录：

```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force server\node_modules
Remove-Item -Recurse -Force processor\__pycache__
```

删除后如需继续开发，重新安装依赖：

```powershell
npm install
cd server
npm install
```

## 已知需要单独处理

- Git remote 曾出现过带 GitHub token 的 URL，交付前应在 GitHub 里吊销旧 token，并把远端地址改为普通 HTTPS 地址。
- `tsconfig.tsbuildinfo` 是生成文件。如果它已被 Git 跟踪，建议在单独提交中执行 `git rm --cached tsconfig.tsbuildinfo`，再保留 `.gitignore` 中的 `*.tsbuildinfo`。
- 本地如看到名字类似 `server src` 的异常空目录，确认里面没有文件后可以删除。它不属于项目结构。
