import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t-4 border-black bg-[#111] pb-16 text-white md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black">
            <span className="flex h-9 w-9 items-center justify-center border-2 border-white bg-[var(--orange)]">搬</span>
            赛博搬屎
          </Link>
          <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/45">Vibe Coding 电子垃圾联合投喂平台。我们嘲笑软件，不围攻作者；收抽象作品，不收病毒木马。</p>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--acid)]">社区入口</h2>
          <div className="mt-4 grid gap-2 text-sm font-bold text-white/55">
            <Link href="/#feed" className="hover:text-white">最新热帖</Link>
            <Link href="/submit" className="hover:text-white">投稿一坨</Link>
            <Link href="/dashboard" className="hover:text-white">我的主页</Link>
            <Link href="/help" className="hover:text-white">新手帮助</Link>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--acid)]">底线</h2>
          <div className="mt-4 grid gap-2 text-sm font-bold text-white/55">
            <Link href="/rules" className="hover:text-white">社区规则与举报申诉</Link>
            <Link href="/privacy" className="hover:text-white">隐私政策</Link>
            <Link href="/terms" className="hover:text-white">用户协议</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs font-bold text-white/30 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 赛博搬屎 · 自己拉的，自己端。</span>
        </div>
      </div>
    </footer>
  );
}
