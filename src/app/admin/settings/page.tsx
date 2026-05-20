"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Save, Loader2 } from "lucide-react";

const SETTINGS_FIELDS = [
  { key: "site_name", en: "Site Name", zh: "站点名称" },
  { key: "site_description", en: "Site Description", zh: "站点描述" },
  { key: "max_grid_size", en: "Max Grid Size", zh: "最大网格尺寸" },
  { key: "allow_registration", en: "Allow Registration", zh: "允许注册" },
];

export default function AdminSettingsPage() {
  const { lang } = useLang();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/admin/settings").then(setSettings).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
      setMsg(lang === "zh" ? "保存成功" : "Saved successfully");
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg(lang === "zh" ? "保存失败" : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "系统设置" : "System Settings"}
      </h1>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 space-y-5">
        {SETTINGS_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium mb-1.5">{lang === "zh" ? field.zh : field.en}</label>
            {field.key === "allow_registration" ? (
              <select
                value={settings[field.key] || "true"}
                onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="true">{lang === "zh" ? "是" : "Yes"}</option>
                <option value="false">{lang === "zh" ? "否" : "No"}</option>
              </select>
            ) : (
              <input
                type={field.key === "max_grid_size" ? "number" : "text"}
                value={settings[field.key] || ""}
                onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            )}
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {lang === "zh" ? "保存设置" : "Save Settings"}
          </button>
          {msg && <span className="text-xs text-green-500">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
