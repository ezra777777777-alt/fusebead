import { query } from "../config/db";

export interface SystemSettingRow {
  id: number;
  setting_key: string;
  setting_value: string | null;
  updated_at: string;
}

export async function getAll(): Promise<Record<string, string>> {
  const rows = await query<SystemSettingRow[]>("SELECT setting_key, setting_value FROM system_settings");
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.setting_key] = row.setting_value || "";
  }
  return result;
}

export async function set(key: string, value: string): Promise<void> {
  await query(
    "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value",
    [key, value],
  );
}

export async function setMany(settings: { key: string; value: string }[]): Promise<void> {
  for (const s of settings) {
    await set(s.key, s.value);
  }
}
