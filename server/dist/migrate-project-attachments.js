"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./config/db");
// Creates project_attachments on the database selected by DATABASE_URL or DB_PATH.
// Normal server startup does not call this. Do not point it at production unless that run was explicitly approved.
(0, db_1.enableProjectAttachmentsMigration)();
(0, db_1.query)("SELECT 1").then(() => {
    console.log("帖子附件表迁移完成");
    process.exit(0);
}, (error) => {
    console.error("帖子附件表迁移失败", error);
    process.exit(1);
});
