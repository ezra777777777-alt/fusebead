"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Star, X, Search, Trash2 } from "lucide-react";

export default function AdminFeaturedPage() {
  const { lang } = useLang();
  const [featured, setFeatured] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    api("/admin/patterns?status=approved&limit=100")
      .then((d) => setFeatured(d.patterns.filter((p: any) => p.is_featured)))
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const d = await api(`/admin/patterns?status=approved&search=${encodeURIComponent(search)}&limit=10`);
    setSearchResults(d.patterns.filter((p: any) => !p.is_featured));
  };

  const handleAdd = async (id: number) => {
    await api(`/admin/patterns/${id}`, { method: "PUT", body: JSON.stringify({ action: "feature" }) });
    // Refresh
    const d = await api("/admin/patterns?status=approved&limit=100");
    setFeatured(d.patterns.filter((p: any) => p.is_featured));
    setSearchResults((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemove = async (id: number) => {
    await api(`/admin/patterns/${id}`, { method: "PUT", body: JSON.stringify({ action: "unfeature" }) });
    setFeatured((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "首页推荐管理" : "Featured Management"}
      </h1>

      {/* Add */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "添加推荐" : "Add Featured"}
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={lang === "zh" ? "搜索图案..." : "Search patterns..."}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
          </div>
          <button onClick={handleSearch}
            className="rounded-xl px-4 py-2.5 text-sm font-medium bg-[var(--surface-hover)] hover:bg-[var(--border)] transition-colors">
            {lang === "zh" ? "搜索" : "Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--surface-hover)]">
                <span className="text-sm">{p.title} <span className="text-foreground/40">by {p.author_name}</span></span>
                <button onClick={() => handleAdd(p.id)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                  <Star className="h-3 w-3" /> {lang === "zh" ? "添加推荐" : "Add"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current featured */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "当前推荐" : "Currently Featured"} ({featured.length})
        </h2>

        {featured.length === 0 ? (
          <p className="text-sm text-foreground/30">{lang === "zh" ? "暂无推荐图案" : "No featured patterns"}</p>
        ) : (
          <div className="space-y-2">
            {featured.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--surface-hover)]">
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4" style={{ color: "var(--bead-amber)" }} />
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-foreground/40">{p.author_name} · ID: {p.id}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(p.id)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                  <X className="h-3 w-3" /> {lang === "zh" ? "移除" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
