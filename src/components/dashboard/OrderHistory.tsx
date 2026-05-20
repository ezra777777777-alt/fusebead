"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";

interface Order {
  id: number;
  order_no: string;
  provider: string;
  plan: string;
  amount: number;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, Record<string, string>> = {
  pending: { en: "Pending", zh: "待支付" },
  paid: { en: "Paid", zh: "已支付" },
  cancelled: { en: "Cancelled", zh: "已取消" },
  expired: { en: "Expired", zh: "已过期" },
  refunded: { en: "Refunded", zh: "已退款" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-500 bg-amber-50",
  paid: "text-green-500 bg-green-50",
  cancelled: "text-gray-400 bg-gray-50",
  expired: "text-gray-400 bg-gray-50",
  refunded: "text-red-400 bg-red-50",
};

export function OrderHistory() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api<Order[]>("/payments/orders")
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-foreground/30">{lang === "zh" ? "加载中..." : "Loading..."}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-foreground/30">
          {lang === "zh" ? "暂无订单记录" : "No orders yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left border-b border-[var(--border)]">
          <tr className="text-foreground/40">
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "订单号" : "Order No"}</th>
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "套餐" : "Plan"}</th>
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "金额" : "Amount"}</th>
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "支付方式" : "Method"}</th>
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "状态" : "Status"}</th>
            <th className="py-2 px-3 font-medium">{lang === "zh" ? "时间" : "Date"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-[var(--surface-hover)]/50">
              <td className="py-2.5 px-3 font-mono text-xs text-foreground/50">{o.order_no}</td>
              <td className="py-2.5 px-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  o.plan === "pro" ? "bg-[var(--bead-coral)]/10 text-[var(--bead-coral)]" : "bg-[var(--bead-amber)]/10 text-[var(--bead-amber)]"
                }`}>
                  {o.plan === "pro" ? "Pro" : "Team"}
                </span>
              </td>
              <td className="py-2.5 px-3">¥{o.amount}</td>
              <td className="py-2.5 px-3 text-xs text-foreground/50">
                {o.provider === "alipay" ? (lang === "zh" ? "支付宝" : "Alipay") : (lang === "zh" ? "微信" : "WeChat")}
              </td>
              <td className="py-2.5 px-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || ""}`}>
                  {STATUS_MAP[o.status]?.[lang as keyof typeof STATUS_MAP.pending] || o.status}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs text-foreground/30">
                {new Date(o.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
