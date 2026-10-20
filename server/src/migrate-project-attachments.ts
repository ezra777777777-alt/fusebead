import "dotenv/config";
import { enableProjectAttachmentsMigration, query } from "./config/db";

// Creates project_attachments on the database selected by DATABASE_URL or DB_PATH.
// Normal server startup does not call this. Do not point it at production unless that run was explicitly approved.
enableProjectAttachmentsMigration();
query("SELECT 1").then(() => {
  console.log("帖子附件表迁移完成");
  process.exit(0);
}, (error) => {
  console.error("帖子附件表迁移失败", error);
  process.exit(1);
});
