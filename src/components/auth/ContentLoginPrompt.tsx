"use client";

import { useAuth } from "@/lib/AuthContext";

export function ContentLoginPrompt({
  title = "登录后才能查看",
  detail = "作品、资源和帖子只对登录用户开放。登录完成后会回到这个页面。",
  returnTo,
}: {
  title?: string;
  detail?: string;
  returnTo?: string;
}) {
  const { openAuth } = useAuth();
  return (
    <section className="cyber-paper border-4 border-black p-8 text-black shadow-[8px_8px_0_var(--orange)]">
      <p className="text-xs font-black tracking-[0.18em] text-[var(--orange)]">MEMBERS ONLY · 登录口</p>
      <h2 className="mt-3 text-3xl font-black">{title}</h2>
      <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-black/70">{detail}</p>
      <button
        type="button"
        className="cyber-button mt-6 bg-[var(--acid)] text-black"
        onClick={() => openAuth(returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}`)}
      >
        登录后查看
      </button>
    </section>
  );
}
