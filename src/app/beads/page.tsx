import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Grid3X3,
  ImagePlus,
  Palette,
  Pencil,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "拼豆工坊",
  description: "图片转拼豆图纸、像素画板、品牌色号转换和社区图纸库。",
};

const tools = [
  {
    href: "/generator",
    eyebrow: "01 / AUTO PATTERN",
    title: "图片转拼豆图纸",
    description: "上传图片，自动匹配拼豆颜色，生成网格、用量清单和可下载图纸。",
    action: "开始转换",
    icon: ImagePlus,
    color: "bg-[var(--orange)] text-white",
    tag: "最常用",
  },
  {
    href: "/editor",
    eyebrow: "02 / PIXEL EDITOR",
    title: "自由像素画板",
    description: "一颗一颗慢慢摆。支持画笔、填充、橡皮、撤销以及图纸导出。",
    action: "打开画板",
    icon: Pencil,
    color: "bg-[var(--acid)] text-black",
    tag: "手搓党",
  },
  {
    href: "/converter",
    eyebrow: "03 / COLOR MAP",
    title: "品牌色号转换",
    description: "不同拼豆品牌之间查找相近颜色，少买错一袋，就少吃一次灰。",
    action: "查询色号",
    icon: Palette,
    color: "bg-[#8b7cff] text-white",
    tag: "工具箱",
  },
  {
    href: "/gallery",
    eyebrow: "04 / PATTERN ARCHIVE",
    title: "社区图纸库",
    description: "找现成图纸、收藏喜欢的作品，也可以把自己的图纸公开出来。",
    action: "逛图纸库",
    icon: BookOpen,
    color: "bg-white text-black",
    tag: "捡现成",
  },
];

const beads = [
  "#ff5a36", "#c7ff2e", "#111111", "#8b7cff", "#ffffff", "#ffcf3f",
  "#8b7cff", "#ffffff", "#ff5a36", "#111111", "#c7ff2e", "#ffffff",
  "#111111", "#ffcf3f", "#ffffff", "#ff5a36", "#8b7cff", "#c7ff2e",
];

export default function BeadsPortalPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] pt-16 text-black">
      <section className="border-b-2 border-black bg-[#111] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_360px] lg:items-center lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-[var(--acid)] bg-[var(--acid)] px-3 py-1.5 font-mono text-xs font-black tracking-[0.14em] text-black">
              <Grid3X3 className="h-4 w-4" /> FUSE BEAD TOOLKIT
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-7xl">
              赛博搬屎的<br /><span className="text-[var(--acid)]">正经拼豆入口。</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-bold leading-7 text-white/60 sm:text-lg">
              这里不收电子垃圾，只负责把照片压成像素、把像素变成豆子。原来的拼豆工具都在，一个也没丢。
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs font-black">
              <span className="border border-white/25 px-3 py-2">图片转图纸</span>
              <span className="border border-white/25 px-3 py-2">像素画板</span>
              <span className="border border-white/25 px-3 py-2">色号转换</span>
              <span className="border border-white/25 px-3 py-2">图纸分享</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[360px]">
            <div className="absolute -right-3 -top-3 h-full w-full border-2 border-[var(--acid)]" />
            <div className="relative border-2 border-white bg-[#1b1b1b] p-5 shadow-[8px_8px_0_var(--orange)]">
              <div className="mb-4 flex items-center justify-between font-mono text-[10px] font-black tracking-widest text-white/45">
                <span>BEAD SAMPLE</span><span>18 PCS</span>
              </div>
              <div className="grid grid-cols-6 gap-2" aria-hidden="true">
                {beads.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="aspect-square rounded-full border-2 border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.45)]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-5 border-t border-dashed border-white/25 pt-4 font-mono text-xs font-bold text-[var(--acid)]">
                STATUS: 工具完好，可以开搓
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-3 border-b-2 border-black pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="font-mono text-xs font-black tracking-[0.18em] text-[var(--orange)]">SELECT A STATION</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">选个工位，开始摆豆</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-black/45"><Sparkles className="h-4 w-4" /> 四个入口，共用同一账号</div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative min-h-64 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000] transition-transform hover:-translate-x-1 hover:-translate-y-1 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center border-2 border-black ${tool.color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="border border-black bg-[var(--paper)] px-2 py-1 font-mono text-[10px] font-black">{tool.tag}</span>
                </div>
                <div className="mt-8 font-mono text-[10px] font-black tracking-[0.16em] text-black/35">{tool.eyebrow}</div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.035em]">{tool.title}</h3>
                <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/55">{tool.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-black text-[var(--orange)]">
                  {tool.action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-2 border-black bg-[var(--acid)] px-5 py-5 shadow-[5px_5px_0_#000] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-black">做完图纸，也能回来交作业</div>
            <div className="mt-1 text-sm font-semibold text-black/60">拼豆作品进图纸库，抽象软件去社区；两边各走各的通道。</div>
          </div>
          <Link href="/" className="inline-flex shrink-0 items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#000]">
            返回赛博环卫站<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
