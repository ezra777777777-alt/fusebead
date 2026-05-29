"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type AdminUser = {
  id: number;
  username: string;
  email: string;
  plan: "free" | "pro" | "team";
  is_admin: boolean;
  is_banned: boolean;
  subscription_expires_at: string | null;
  subscription_status: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const { lang } = useLang();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [daysInputs, setDaysInputs] = useState<Record<number, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 20;

  const remainingDaysValue = (user: AdminUser): string => {
    if (user.plan === "free" || !user.subscription_expires_at) return "";
    const expires = new Date(user.subscription_expires_at).getTime();
    if (!Number.isFinite(expires)) return "";
    return String(Math.max(0, Math.ceil((expires - Date.now()) / 86400000)));
  };

  const remainingDaysLabel = (user: AdminUser): string => {
    if (user.plan === "free") return "-";
    if (!user.subscription_expires_at) return lang === "zh" ? "未设置" : "Not set";
    const days = Number(remainingDaysValue(user));
    if (days <= 0) return lang === "zh" ? "已过期" : "Expired";
    return lang === "zh" ? `${days} 天` : `${days}d left`;
  };

  const fetchUsers = () => {
    api<{ users: AdminUser[]; total: number }>(`/admin/users?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}`)
      .then((d) => {
        setUsers(d.users);
        setTotal(d.total);
        setDaysInputs(Object.fromEntries(d.users.map((u) => [u.id, remainingDaysValue(u)])));
      })
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [page]);
  useEffect(() => { setPage(1); fetchUsers(); }, [search]);

  const handleUpdate = async (id: number, data: Record<string, unknown>) => {
    await api(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
    fetchUsers();
  };

  const handleSetSubscriptionDays = async (user: AdminUser) => {
    const raw = daysInputs[user.id];
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      window.alert(lang === "zh" ? "请输入 1-3650 的整数天数" : "Enter a whole number from 1 to 3650");
      return;
    }
    await handleUpdate(user.id, { plan: user.plan === "free" ? "pro" : user.plan, subscription_days: days });
  };

  const handleDelete = async (id: number, username: string) => {
    const confirmMsg = lang === "zh"
      ? `确定要删除用户「${username}」吗？此操作不可撤销。`
      : `Delete user "${username}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    await api(`/admin/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "用户管理" : "User Management"}
      </h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "zh" ? "搜索用户名或邮箱..." : "Search username or email..."}
          className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-hover)] text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground/40">ID</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "用户名" : "Username"}</th>
                <th className="px-4 py-3 font-medium text-foreground/40">Email</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "套餐" : "Plan"}</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "剩余天数" : "Days Left"}</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "状态" : "Status"}</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "管理员" : "Admin"}</th>
                <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--surface-hover)]/50">
                  <td className="px-4 py-3 text-foreground/40">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-foreground/50">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={(e) => handleUpdate(u.id, { plan: e.target.value })}
                      className="text-xs rounded-lg border border-[var(--border)] px-2 py-1 bg-transparent"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="team">Team</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[184px] items-center gap-2">
                      <span className={`min-w-14 text-xs ${u.plan !== "free" && !u.subscription_expires_at ? "text-amber-600" : "text-foreground/50"}`}>
                        {remainingDaysLabel(u)}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={daysInputs[u.id] ?? ""}
                        onChange={(e) => setDaysInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder={lang === "zh" ? "天数" : "Days"}
                        className="w-16 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => handleSetSubscriptionDays(u)}
                        className="rounded-lg bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        {lang === "zh" ? "设置" : "Set"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleUpdate(u.id, { is_banned: !u.is_banned })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_banned
                          ? "bg-red-100 text-red-500"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {u.is_banned ? (lang === "zh" ? "已封禁" : "Banned") : (lang === "zh" ? "正常" : "Active")}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleUpdate(u.id, { is_admin: !u.is_admin })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_admin
                          ? "bg-purple-100 text-purple-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {u.is_admin ? "Admin" : "-"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/30">{new Date(u.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-1 rounded hover:bg-red-50 text-foreground/30 hover:text-red-500 transition-colors"
                        title={lang === "zh" ? "删除用户" : "Delete user"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-foreground/40">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
