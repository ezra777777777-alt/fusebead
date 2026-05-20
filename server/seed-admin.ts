import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { query } from "./src/config/db";

async function seed() {
  const email = process.env.ADMIN_EMAIL || "admin@fusebead.art";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";

  console.log(`[Seed] Checking admin: ${email}`);

  const rows = await query<any[]>("SELECT id, is_admin FROM users WHERE email = ?", [email]);

  if (rows.length > 0) {
    // Update existing user to admin
    await query("UPDATE users SET is_admin = TRUE WHERE id = ?", [rows[0].id]);
    console.log(`[Seed] User ${email} already exists — set is_admin = TRUE`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await query(
      "INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, TRUE)",
      ["Admin", email, hash],
    );
    console.log(`[Seed] Admin created: ${email} / ${password}`);
  }

  // Ensure default settings exist
  const defaults: Record<string, string> = {
    site_name: "FuseBead.art",
    site_description: "Free online Perler bead pattern maker",
    max_grid_size: "150",
    allow_registration: "true",
  };

  for (const [key, value] of Object.entries(defaults)) {
    await query(
      "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value",
      [key, value],
    );
  }

  console.log("[Seed] Default settings created");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
