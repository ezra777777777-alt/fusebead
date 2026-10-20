"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, Menu, Search, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export function Navbar() {
  const { user, loading, isAdmin, openAuth, logout } = useAuth();
  const guard = (href: string) => (event: { preventDefault: () => void }) => {
    setMobileOpen(false);
    if (!loading && !user) { event.preventDefault(); openAuth(href); }
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const links = [
    { href: "/works", label: "已审核作品" },
    { href: "/?sort=latest#feed", label: "最新作品" },
    { href: "/github", label: "资源分享" },
    { href: "/#community-boards", label: "软件分区" },
    { href: "/?category=教程与求助#feed", label: "教程求助" },
    { href: "/?sort=popular#feed", label: "污染热榜" },
  ];

  return (
    <header className="site-nav fixed inset-x-0 top-0 z-50 h-16 border-b border-white/15 bg-[#111] text-white" onKeyDown={event => {
      if (event.key === "Escape" && mobileOpen) { setMobileOpen(false); menuButton.current?.focus(); }
    }}>
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setMobileOpen(false)} className="group flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="flex h-9 w-9 -rotate-3 items-center justify-center border-2 border-white bg-[var(--orange)] text-lg font-black text-white transition-transform group-hover:rotate-3">搬</span>
          <span className="text-lg font-black tracking-[-0.04em]">赛博搬屎</span>
          <span className="hidden border border-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[var(--acid)] sm:inline">BETA</span>
        </Link>

        <div className="hidden items-center gap-3 whitespace-nowrap xl:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={guard(link.href)}
              aria-current={link.href === pathname ? "page" : undefined}
              className={`py-3 text-sm font-bold hover:text-[var(--acid)] ${link.href === pathname ? "text-[var(--acid)]" : "text-white/70"}`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && <Link href="/admin" className="text-sm font-black text-[var(--acid)]">环卫后台</Link>}
          <Link href="/#feed" onClick={guard("/#feed")} className="p-1.5 text-white/45 hover:text-white" aria-label="搜索作品"><Search className="h-4 w-4" /></Link>
          {user ? (
            <div className="flex items-center gap-2 text-xs font-bold">
              <Link href="/dashboard" className="max-w-24 truncate border border-white/25 px-2 py-1.5 text-white/75 hover:border-[var(--acid)] hover:text-[var(--acid)]">{user.username}</Link>
              <button onClick={logout} className="text-white/40 hover:text-white">退出</button>
            </div>
          ) : (
            <button onClick={() => openAuth()} className="flex items-center gap-1.5 border-2 border-[var(--acid)] bg-black px-3 py-1.5 text-sm font-black text-[var(--acid)]"><LogIn className="h-4 w-4" />登录</button>
          )}
          <Link href="/submit" className="flex items-center gap-1.5 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0_#fff] transition-transform hover:-translate-y-0.5">
            <Upload className="h-4 w-4" /> 上交本坨
          </Link>
        </div>

        <button ref={menuButton} onClick={() => setMobileOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center border border-white/30 xl:hidden" aria-label="菜单" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {mobileOpen && (
          <div id="mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto absolute inset-x-0 top-16 border-b-2 border-black bg-[#111] p-4 xl:hidden">
            <div className="grid gap-1">
              {links.map((link) => <Link key={link.label} href={link.href} onClick={guard(link.href)} className="border-b border-white/10 px-2 py-3 text-sm font-bold text-white/70">{link.label}</Link>)}
              {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="px-2 py-3 text-sm font-black text-[var(--acid)]">环卫后台</Link>}
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="px-2 py-3 text-sm font-bold text-white/70">个人中心</Link>
              <Link href="/help" onClick={() => setMobileOpen(false)} className="px-2 py-3 text-sm font-bold text-white/70">新手帮助</Link>
              <Link href="/submit" onClick={() => setMobileOpen(false)} className="px-2 py-3 text-sm font-black text-[var(--acid)]">上交本坨</Link>
              {user ? <button onClick={() => { logout(); setMobileOpen(false); }} className="px-2 py-3 text-left text-sm font-bold text-white/60">退出登录</button> : <button onClick={() => { openAuth(); setMobileOpen(false); }} className="border-2 border-[var(--acid)] px-2 py-3 text-left text-sm font-black text-[var(--acid)]">登录 / 注册</button>}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
