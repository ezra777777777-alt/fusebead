"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./config/db");
(0, db_1.enableResourceRegistryMigration)();
(0, db_1.query)("SELECT 1").then(() => { console.log("共享查重数据库迁移完成"); process.exit(0); }, error => { console.error("共享查重数据库迁移失败", error); process.exit(1); });
