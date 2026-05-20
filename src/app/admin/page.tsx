"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Users, Grid3X3, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const { lang } = useLang();
  const [stats, setStats] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    api("/admin/stats").then(setStats).catch(() => {});
    api("/admin/users?limit=5").then((d) => setRecentUsers(d.users)).catch(() => {});
    api("/admin/logs?limit=5").then((d) => setRecentLogs(d.logs)).catch(() => {});
  }, []);

  const statCards = [
    { icon: Users, label: lang === "zh" ? "总用户" : "Total Users", value: stats?.totalUsers ?? "-", color: "var(--bead-coral)" },
    { icon: Grid3X3, label: lang === "zh" ? "总图案" : "Total Patterns", value: stats?.totalPatterns ?? "-", color: "var(--blue-primary)" },
    { icon: Clock, label: lang === "zh" ? "今日生成" : "Today", value: stats?.todayGenerations ?? "-", color: "var(--bead-amber)" },
    { icon: AlertTriangle, label: lang === "zh" ? "待审核" : "Pending", value: stats?.pendingPatterns ?? "-", color: "#D4B8E0" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "管理仪表盘" : "Admin Dashboard"}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-white p-5" style={{ boxShadow: "var(--card-shadow)" }}>
            <s.icon className="h-5 w-5 mb-3" style={{ color: s.color }} />
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
            <p className="text-xs text-foreground/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "最近注册" : "Recent Users"}
            </h2>
            <Link href="/admin/users" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              {lang === "zh" ? "查看全部" : "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-foreground/30">{lang === "zh" ? "暂无数据" : "No data"}</p>
            ) : (
              recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{u.username}</p>
                    <p className="text-xs text-foreground/40">{u.email}</p>
                  </div>
                  <span className="text-xs text-foreground/30">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent logs */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "最近操作" : "Recent Activity"}
            </h2>
            <Link href="/admin/logs" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              {lang === "zh" ? "查看全部" : "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-foreground/30">{lang === "zh" ? "暂无数据" : "No data"}</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-xs font-medium">{log.action}</p>
                    <p className="text-xs text-foreground/40">{log.admin_name} — {log.target_type}{log.target_id ? ` #${log.target_id}` : ""}</p>
                  </div>
                  <span className="text-xs text-foreground/30">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
