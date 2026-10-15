# FuseBead 文档入口

这份目录是给接手人看的入口。先读本文件，再按问题类型跳到对应文档。

## 一眼看懂

- [交接总览](./HANDOVER.md)：当前线上架构、域名、仓库、部署状态和优先风险。
- [项目文件说明](./PROJECT-FILE-GUIDE.md)：项目目录、哪些文件该提交、哪些只是本地缓存。
- [账号与资源清单](./ACCESS-INVENTORY.md)：阿里云、Vercel、GitHub、邮箱、支付和密钥交接。
- [生产运维手册](./PRODUCTION-OPERATIONS.md)：上线、重启、日志、CORS、证书、数据库备份。
- [交付验收清单](./RELEASE-CHECKLIST.md)：交付前和接手后需要逐项确认的事项。

## 深入文档

- [项目总览](./PROJECT-OVERVIEW.md)：产品、模块、架构和关键流程。
- [前端文档](./FRONTEND.md)：Next.js 页面、组件、状态、i18n 和样式体系。
- [API 文档](./API-REFERENCE.md)：REST API、认证、作品、支付和管理后台接口。
- [数据库文档](./DATABASE.md)：PostgreSQL / SQLite 双引擎、表结构和定时任务。
- [部署指南](./DEPLOYMENT.md)：Vercel/Railway/Supabase 与阿里云 ECS 部署。
- [后端 Runbook](../server/RUNBOOK.md)：Express 后端运行、排障和常用命令。

## 当前生产环境摘要

- 前端域名：`https://www.fusebead.cn`
- 主域名跳转：`https://fusebead.cn` -> `https://www.fusebead.cn`
- API 域名：`https://api.fusebead.cn/api`
- 健康检查：`https://api.fusebead.cn/api/health`
- 备案号：`粤ICP备2026067307号-1`
- 后端服务器：阿里云轻量应用服务器，公网 IP `8.137.212.1`
- 前端托管：Vercel 项目 `fusebead`
- 代码仓库：GitHub `ezra777777777-alt/fusebead`

## 交接原则

- 文档只记录资源位置、配置项名称和操作步骤，不记录密码、token、私钥、SMTP 授权码。
- 真实密钥通过密码管理器或云平台密钥管理交接。
- 交付前必须轮换所有曾经暴露在终端、截图、聊天记录或 remote URL 里的 token。
