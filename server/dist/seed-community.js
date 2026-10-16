"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const db_1 = require("./config/db");
const samples = [
    ["花了三天做了个帮你决定今天中午吃什么的网站，最后只会推荐黄焖鸡", "接了四个模型、六张表和一个向量数据库，解决了一个掷硬币能解决的问题。", "AI 套壳", "Next.js、四个模型、一些不必要的向量搜索", 1],
    ["老板键生成器：按一下，自动生成一份看起来很忙的 Excel", "别问数据哪来的，问就是大模型根据你的工位气质推理出来的。", "网页小玩具", "React、SheetJS、强烈的求生欲", 1],
    ["我做了个待办软件，但每添加一条任务它都会劝你放弃", "主打一个从源头消灭生产力焦虑。目前唯一的 Bug 是它说得有点道理。", "能跑就行", "Vue、LocalStorage、消极心理学", 0],
    ["GPT 写的肉鸽小游戏，第一关 Boss 因为空指针当场去世", "作者宣布这是动态难度系统。在线试玩，刷新页面可以复活 Boss。", "游戏乱炖", "Canvas、TypeScript、一个没处理的 null", 1],
    ["给猫做的记账软件：它目前欠我八万七千块猫粮钱", "支持月度报表、坏账核销和欠债猫排行榜，不支持猫还钱。", "纯抽象", "Svelte、SQLite、无法执行的还款计划", 0],
];
async function main() {
    if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
        throw new Error("样例仅供本机 SQLite 预览");
    let [author] = await (0, db_1.query)("SELECT id FROM users WHERE email = ?", ["demo@cyber.local"]);
    if (!author) {
        const passwordHash = await bcryptjs_1.default.hash(`disabled-${(0, crypto_1.randomUUID)()}`, 12);
        const created = await (0, db_1.query)("INSERT INTO users (username, email, password_hash, email_verified, is_banned, contribution_points) VALUES (?, ?, ?, 1, 1, 0)", ["环卫站样例库", "demo@cyber.local", passwordHash]);
        author = { id: created.insertId };
    }
    for (const [title, summary, category, techStack, featured] of samples) {
        const existing = await (0, db_1.query)("SELECT id FROM projects WHERE title = ? AND user_id = ?", [title, author.id]);
        if (existing.length)
            continue;
        await (0, db_1.query)(`INSERT INTO projects (user_id, title, summary, category, demo_url, tech_stack, confession, status, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`, [author.id, title, summary, category, "https://example.com/", techStack, "这是本地预览用的样例档案。正式上线后会由真实投稿替换。", featured]);
    }
    console.log("Community demo data is ready.");
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
