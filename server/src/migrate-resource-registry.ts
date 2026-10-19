import "dotenv/config";
import { enableResourceRegistryMigration, query } from "./config/db";

enableResourceRegistryMigration();
query("SELECT 1").then(() => { console.log("共享查重数据库迁移完成"); process.exit(0); }, error => { console.error("共享查重数据库迁移失败", error); process.exit(1); });
