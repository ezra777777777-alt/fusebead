# 自动维护操作说明

规则来源：[smfworks/prime-directive](https://github.com/smfworks/prime-directive)（[builder-build-standard](https://github.com/smfworks/prime-directive/blob/021a15d8d583e1b44f63723861b0490774c251be/docs/skills/builder-build-standard.md)、[builder-reviewer-loop](https://github.com/smfworks/prime-directive/blob/021a15d8d583e1b44f63723861b0490774c251be/docs/skills/builder-reviewer-loop.md)、[gatekeeper-review-standard](https://github.com/smfworks/prime-directive/blob/021a15d8d583e1b44f63723861b0490774c251be/docs/skills/gatekeeper-review-standard.md)），MIT 许可。

## 每日节奏
1. **小改动**：每天至多一个聚焦的改动（一般 < 400 行；更大的先写计划交 Gatekeeper 认可）。
2. 从最新 `origin/main` 切新分支，在独立工作区开发；本机先 commit 保全成果。
3. 本地跑完 CI 同款检查（见 AGENTS.md），在 PR 的 Test plan 写出实际命令和结果；既有失败要与本次改动区分。
4. 开 PR（使用 `.github/PULL_REQUEST_TEMPLATE.md`），把 head SHA 和测试证据发给 **Gatekeeper Prime 独立复核**。
5. 按审查意见在同一分支修复，每个修复提交注明对应 finding。
6. **合并只由主人对该 PR 明确同意后进行**。Builder/Gatekeeper 都不自行合并、不部署生产。

## 资源分享专区（/github）内容整理
- 只收录真实存在的 GitHub 项目，每条必须保留：**原作者、仓库链接（出处）、许可证、用途、安装步骤、限制/注意事项**。
- 许可证以仓库 LICENSE 为准；无许可证要写明“未声明许可证”，不复制其代码。
- Bot 只产出**待审草稿**，走站内“先审后发”流程，**不自动发布**、不以管理员身份放行。

## 红线
- 不直接改 main，不 force-push，不生产部署，不对真实数据库迁移。
- 不读取/提交私密配置、运行数据、数据库、日志、密钥。
- 不破坏 `/beads` 拼豆工具；涉及 `processor/` 的改动必须跑 Python 测试。
- 新增外部权限、账号连接、定时任务需主人另行确认。
