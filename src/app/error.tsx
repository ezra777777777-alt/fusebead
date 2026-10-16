"use client";
import Link from "next/link";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto min-h-[70vh] max-w-xl px-5 py-32 text-center"><h1 className="text-3xl font-black">页面暂时出了点问题</h1><p className="my-6 leading-7">可以重新尝试，或返回社区继续浏览。如果问题反复出现，请通过右下角反馈告诉我们当时的操作。</p><div className="flex flex-wrap justify-center gap-5"><button onClick={reset} className="cyber-button bg-[var(--acid)]">重新尝试</button><Link href="/" className="cyber-button bg-white">返回社区</Link></div></main>;
}
