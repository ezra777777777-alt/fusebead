"use client";

import { categoryLabel, serverDate } from "@/lib/community";
import { approvedWorksOnly, failureReason } from "@/lib/load-state";
import { LoadingSkeleton } from "@/components/shared/LoadState";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pagination } from "@/components/shared/Pagination";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import {
  BadgeCheck,
  BellRing,
  Bug,
  ChevronRight,
  Clock3,
  Code2,
  Download,
  Eye,
  Flame,
  Gamepad2,
  Hammer,
  MessageCircle,
  MonitorSmartphone,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";

const boards = [
  { name: "全部", icon: Radio },
  { name: "能跑就行", icon: Wrench },
  { name: "AI 套壳", icon: Sparkles },
  { name: "网页小玩具", icon: Code2 },
  { name: "手机端", icon: MonitorSmartphone },
  { name: "游戏乱炖", icon: Gamepad2 },
  { name: "纯抽象", icon: Bug },
  { name: "教程与求助", icon: Code2 },
];

export function CyberHome() { return <Suspense fallback={<div className="min-h-screen bg-[var(--background)] px-4 pt-24"><LoadingSkeleton label="正在打开社区…" variant="rows" /></div>}><CommunityFeed /></Suspense>; }
function CommunityFeed() {
  const params = useSearchParams();
  const { user, openAuth, refreshUser } = useAuth();
  const activeBoard = params.get("category") || "全部";
  const search = params.get("search") || "";
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinText, setCheckinText] = useState("签到，领 5 点清运值");
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const sort = params.get("sort") || "latest";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [rankings, setRankings] = useState<any[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const userId = user?.id;
  const changeFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === "page" && value === "1") || (key === "category" && value === "全部")) next.delete(key);
      else next.set(key, value);
    }
    window.history.replaceState(null, "", `/${next.size ? `?${next}` : ""}#feed`);
  };
  const projectHref = (id: number) => `/projects/${id}${params.size ? `?feed=${encodeURIComponent(params.toString())}` : ""}`;
  useEffect(() => {
    let active = true;
    setCheckedIn(false); setCheckinText("签到，领 5 点清运值");
    if (userId) api<{checkedIn:boolean}>("/user/me/check-in").then(data => { if (active) { setCheckedIn(data.checkedIn); if (data.checkedIn) setCheckinText("今日已签到"); } }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  useEffect(() => { api("/projects?sort=popular&limit=5").then(data => setRankings(approvedWorksOnly(data.projects))).catch(() => {}); }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timer = window.setTimeout(() => {
    const query = new URLSearchParams({ sort, category: activeBoard, search: search.trim(), page: String(page), limit: "20" });
    api(`/projects?${query}`)
      .then((data) => {
        if (!active) return;
        setTotal(data.total);
        const tones: Record<string, string> = { "AI 套壳": "#ff5b35", "网页小玩具": "#ffa51f", "能跑就行": "#66cc33", "游戏乱炖": "#8b5cf6", "纯抽象": "#06b6d4", "手机端": "#1769ff" };

        setPosts(approvedWorksOnly(data.projects).map((project: any) => ({
          id: project.id,
          board: project.category,
          title: project.title,
          excerpt: project.summary,
          authorId: project.user_id,
          author: project.author_name || "匿名搬运工",
          level: Math.max(1, Math.floor(Number(project.author_points || 0) / 50) + 1),
          time: serverDate(project.created_at).toLocaleDateString("zh-CN"),
          replies: Number(project.comments_count || 0),
          views: Number(project.views_count || 0),
          votes: Number(project.votes_count || 0),
          badge: project.is_featured ? "重点" : "",
          tone: tones[project.category] || "#ff4f18",
          live: true,
        })));
      })
      .catch((e) => { if (active) { setError(failureReason(e, "加载失败")); setPosts([]); } })
      .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeBoard, search, sort, page, retry]);

  const visiblePosts = posts;

  const checkIn = async () => {
    if (!user) { openAuth(); return; }
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const result = await api<any>("/user/me/check-in", { method: "POST" });
      setCheckedIn(true);
      setCheckinText(result.awarded ? "已签到 · 清运值 +5" : "今天已经签过了");
      try { await refreshUser(); } catch { setCheckinText("今日已签到 · 积分信息稍后刷新"); }
    } catch { setCheckinText("签到失败，点击重试"); } finally { setCheckingIn(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pt-16">
      <section className="cyber-hero border-b-4 border-black">
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-16 sm:px-6 sm:py-10 lg:grid-cols-[1.5fr_0.5fr] lg:px-8 lg:py-14">
          <Link
            href="/beads"
            aria-label="奇怪的按钮，打开拼豆工坊"
            className="group absolute right-4 top-0 z-10 flex h-16 w-40 touch-manipulation items-center justify-center outline-none sm:right-6 sm:top-16 lg:right-8 lg:top-20"
          >
            <span className="flex min-h-11 items-center gap-2 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black text-black opacity-0 shadow-[4px_4px_0_var(--orange)] transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-white">
              <span aria-hidden="true">?</span> 奇怪的按钮
            </span>
          </Link>
          <div>
            <div className="mb-5 inline-flex rotate-[-1deg] items-center gap-2 border-2 border-black bg-[var(--acid)] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000]">
              <Radio className="h-3.5 w-3.5" /> CYBER SANITATION SYSTEM · 404 环卫站
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.07em] text-white sm:text-7xl lg:text-[92px]">
              你负责现拉，<br />
              <span className="text-[var(--acid)]">我们负责端上来。</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-white/70 sm:text-lg">
              全国 Vibe Coding 屎山统一收容点。项目没用不要紧，能打开就算成功。别藏着了，端出来让老哥们看看这坨到底熟没熟。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/submit" className="cyber-button bg-[var(--orange)] text-white">
                <Upload className="h-5 w-5" /> 上交本坨
              </Link>
              <Link href="/works" className="cyber-button bg-[var(--acid)] text-black">
                <BadgeCheck className="h-5 w-5" /> 已审核作品
              </Link>
              <a href="#feed" className="cyber-button bg-white text-black">
                <Eye className="h-5 w-5" /> 开始受害
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-white/50">
              <span>{`当前找到 ${total} 份作品`}</span>
              <span>投稿先审后发</span>
              <span>外链先警告再跳转</span>
            </div>
          </div>

          <div className="flex items-end justify-center lg:justify-end">
            <div className="relative w-full max-w-sm rotate-[2deg] border-4 border-black bg-[#fff7d6] p-5 text-black shadow-[10px_10px_0_var(--orange)]">
              <div className="absolute -right-3 -top-4 rotate-6 border-2 border-black bg-[var(--acid)] px-3 py-1 text-sm font-black">今日公告</div>
              <div className="mb-5 font-mono text-xs font-bold text-black/50">NOTICE_2026_1016.TXT</div>
              <h2 className="text-2xl font-black leading-tight">本站收电子垃圾，<br />不收真病毒。</h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-black/65">
                木马、钓鱼、偷数据、违法内容直接抬走。玩梗可以，害人不行。所有投稿先过环卫质检。
              </p>
              <div className="mt-5 flex items-center gap-2 border-t-2 border-dashed border-black/30 pt-4 text-xs font-black">
                <ShieldCheck className="h-4 w-4" /> 管理员「扫地僧」发布
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="community-boards" className="scroll-mt-16 border-b-2 border-black bg-white" aria-label="社区分区">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-max py-3">
            <Link href="/github" className="mr-2 flex items-center gap-2 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black text-black hover:-translate-y-0.5"><Code2 className="h-4 w-4" /> 资源分享</Link>
            {boards.map((board) => {
              const Icon = board.icon;
              const active = board.name === activeBoard;
              return (
                <button
                  key={board.name}
                  onClick={() => { changeFilters({ category: board.name, page: "1" }); }}
                  className={`mr-2 flex items-center gap-2 border-2 border-black px-4 py-2 text-sm font-black transition-transform hover:-translate-y-0.5 ${
                    active ? "bg-black text-[var(--acid)]" : "bg-white text-black hover:bg-[var(--paper)]"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {board.name}
                  
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="feed" className="mx-auto grid grid-cols-1 scroll-mt-16 max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:px-8 lg:py-10">
        <main className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--orange)]">COMMUNITY FEED</div>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-black">刚完成清运的污染物</h2>
            </div>
            <label className="flex h-11 items-center gap-2 border-2 border-black bg-white px-3 shadow-[3px_3px_0_#000] sm:w-72">
              <Search className="h-4 w-4 text-black/45" />
              <input
                value={search}
                onChange={(event) => { changeFilters({ search: event.target.value, page: "1" }); }}
                aria-label="搜索社区作品"
                id="community-search"
                maxLength={80}
                placeholder="搜软件、老哥或病情"
                className="min-w-0 w-full bg-transparent text-sm font-bold text-black outline-none placeholder:text-black/30"
              />
            </label>
          </div>

          <div className="border-2 border-black bg-white shadow-[6px_6px_0_#000]">
            <div className="flex items-center justify-between border-b-2 border-black bg-[var(--paper)] px-4 py-3 text-xs font-black text-black">
              <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-[var(--orange)]" /> {categoryLabel(activeBoard)} · <select aria-label="作品排序" value={sort} onChange={e => { changeFilters({ sort: e.target.value, page: "1" }); }} className="bg-transparent"><option value="latest">最新发布</option><option value="popular">最多点赞</option><option value="discussed">最多评论</option></select></div>
              <span>{total} 个作品</span>
            </div>

            {error ? <div role="alert" data-phase="error" className="p-10 text-center"><p className="font-black">没有加载成功</p><p className="mt-2 text-sm font-semibold text-black/70">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black">重试</button></div> : loading ? <LoadingSkeleton label="正在清点作品…" variant="rows" /> : visiblePosts.length ? visiblePosts.map((post) => (
              <article key={post.id} className="group grid gap-4 border-b border-black/15 p-4 last:border-b-0 hover:bg-[#fffdf5] sm:grid-cols-[76px_minmax(0,1fr)_110px] sm:p-5">
                <div className="hidden sm:block">
                  <div className="flex h-14 w-14 rotate-[-2deg] items-center justify-center border-2 border-black text-xl font-black text-white shadow-[3px_3px_0_#000]" style={{ background: post.tone }}>
                    {String(post.id).padStart(3, "0")}
                  </div>
                  <div className="mt-2 text-center text-[10px] font-black text-black/40">污染编号</div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {post.badge && <span className="border border-black bg-black px-1.5 py-0.5 text-[10px] font-black text-[var(--acid)]">{post.badge}</span>}
                    <button onClick={() => { changeFilters({ category: post.board, page: "1" }); }} className="text-xs font-black text-[var(--orange)] hover:underline">[{categoryLabel(post.board)}]</button>
                  </div>
                  {post.live ? (
                    <Link href={projectHref(post.id)} className="block [overflow-wrap:anywhere] text-base font-black leading-6 text-black group-hover:text-[var(--orange)] sm:text-lg">{post.title}</Link>
                  ) : (
                    <h3 className="text-base font-black leading-6 text-black group-hover:text-[var(--orange)] sm:text-lg">{post.title}</h3>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-black/50">{post.excerpt}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-black/40">
                    <Link href={`/user/${post.authorId}`} className="min-w-0 [overflow-wrap:anywhere] text-black/70 hover:underline">{post.author}</Link>
                    <span className="border border-black/20 bg-[var(--paper)] px-1.5 py-0.5">L{post.level}</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{post.time}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.votes}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-black text-black/45 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {post.replies}</span>
                  <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.views}</span>
                  <ChevronRight className="ml-auto h-5 w-5 text-black/20 transition-transform group-hover:translate-x-1 group-hover:text-[var(--orange)] sm:ml-0" />
                </div>
              </article>
            )) : (
              <div className="px-6 py-20 text-center">
                <Bug className="mx-auto h-12 w-12 text-black/20" />
                <p className="mt-4 text-lg font-black text-black">这个分区干净得不像本站</p>
                <p className="mt-1 text-sm font-medium text-black/45">换个关键词，或者亲自来污染一下环境。</p>
                <button onClick={() => changeFilters({ search: "", category: "", page: "1" })} className="mt-5 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black">清除筛选，查看全部作品</button>
              </div>
            )}
          </div>

          {total > 20 && <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={value => changeFilters({ page: String(value) })} />}
          <Link href="/submit" className="mt-6 flex items-center justify-between border-2 border-black bg-[var(--acid)] px-5 py-4 text-black shadow-[5px_5px_0_#000] transition-transform hover:-translate-y-1">
            <span className="flex items-center gap-3 text-lg font-black"><Upload className="h-5 w-5" /> 没看到满意的？自己搬一坨。</span>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="border-2 border-black bg-white shadow-[5px_5px_0_#000]">
            <div className="flex items-center justify-between border-b-2 border-black bg-black px-4 py-3 text-white">
              <h2 className="flex items-center gap-2 text-sm font-black"><BellRing className="h-4 w-4 text-[var(--acid)]" /> 今日签到</h2>
              <span className="text-[10px] font-bold text-white/45">北京时间 · 每日一次</span>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold leading-6 text-black/55">每日签到 +5，作品首次审核通过 +10。点赞和评论不奖励积分。</p>
              <button
                onClick={checkIn}
                disabled={checkedIn || checkingIn}
                className={`mt-4 w-full border-2 border-black py-2.5 text-sm font-black shadow-[3px_3px_0_#000] transition-all ${checkedIn ? "bg-[#ddd8ca] text-black/45" : "bg-[var(--orange)] text-white hover:-translate-y-0.5"}`}
              >
                {checkingIn ? "签到中…" : checkinText}
              </button>
            </div>
          </section>

          <section className="border-2 border-black bg-white shadow-[5px_5px_0_#000]">
            <div className="flex items-center gap-2 border-b-2 border-black bg-[var(--orange)] px-4 py-3 text-white">
              <Trophy className="h-4 w-4" /> <h2 className="text-sm font-black">重点污染物</h2>
            </div>
            <ol className="divide-y divide-black/10 p-2">
              {rankings.map((item, index) => (
                <li key={item.id} className="flex items-center gap-3 px-2 py-2.5 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center border border-black text-xs font-black ${index < 3 ? "bg-[var(--acid)]" : "bg-[var(--paper)]"}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-black"><Link href={`/projects/${item.id}`}>{item.title}</Link></span>
                  <span className="text-xs font-black text-black/40">{item.votes_count} 赞</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-2 border-dashed border-black/40 bg-[var(--paper)] p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-black"><Zap className="h-4 w-4 text-[var(--orange)]" /> 赛博环卫公约</h2>
            <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-black/55">
              <li>· 作品首次审核通过，奖励 10 点</li>
              <li>· 每日签到奖励 5 点，不重复领取</li>
              <li>· 等级高不代表代码好，只代表待得久</li>
              <li>· 破解、盗版、木马、钓鱼一律不收</li>
            </ul>
          </section>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-black bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <a href="#feed" className="flex flex-col items-center gap-1 py-2 text-[10px] font-black text-black"><Flame className="h-5 w-5" />热帖</a>
        <button onClick={() => document.getElementById("community-boards")?.scrollIntoView({ block: "start" })} className="flex flex-col items-center gap-1 py-2 text-[10px] font-black text-black"><Radio className="h-5 w-5" />分区</button>
        <Link href="/submit" className="flex flex-col items-center gap-1 bg-[var(--orange)] py-2 text-[10px] font-black text-white"><Upload className="h-5 w-5" />投稿</Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1 py-2 text-[10px] font-black text-black"><Download className="h-5 w-5" />我的</Link>
      </div>
    </div>
  );
}
