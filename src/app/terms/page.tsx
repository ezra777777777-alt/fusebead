import Link from "next/link";
export default function TermsPage() {
  return <article className="mx-auto max-w-3xl px-5 pb-16 pt-28 text-black"><p className="text-xs font-black tracking-widest text-[var(--orange)]">TERMS · 社区公测</p><h1 className="mt-3 text-4xl font-black">一起把社区用好。</h1><p className="mt-5 leading-8">此版本提供作品展示、投稿审核、评论、举报和原有拼豆工具。社区公测功能暂不收费。你可以通过站内反馈或 <a href="mailto:cx2548464278@163.com" className="underline">cx2548464278@163.com</a> 联系本站运营者。</p>
    <div className="mt-8 space-y-7 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
      <section><h2 className="text-xl font-black">账号与使用</h2><p className="mt-3 leading-8">请使用可接收验证邮件的邮箱，保管好登录凭证，不冒用他人身份。使用社区时请遵守 <Link href="/rules" className="underline">社区规则</Link>。不得通过自动化刷屏、攻击服务或绕过审核与封禁。</p></section>
      <section><h2 className="text-xl font-black">内容与权利</h2><p className="mt-3 leading-8">你保留投稿内容的原有权利，并确认有权提交这些内容。投稿意味着允许本站为审核和公开展示目的存储、展示内容及必要的截图。你可以撤回投稿；撤回后作品不再进入公开列表。请勿提交未经许可的他人资料、私有代码、商业秘密或侵权资源。</p></section>
      <section><h2 className="text-xl font-black">审核与争议</h2><p className="mt-3 leading-8">本站可依据社区规则退回或下架作品、移除评论、限制账号，并记录处理情况。审核结果和原因可在个人中心查看。举报与申诉按社区规则中的渠道处理。</p></section>
      <section><h2 className="text-xl font-black">公测与外部服务</h2><p className="mt-3 leading-8">公测期间功能可能调整，建议保留自己的作品原稿。投稿者的外部网站独立运行，本站的人工审核不保证链接永远可用或安全。清运值是社区展示指标，不可兑换现金。</p></section>
      <section><h2 className="text-xl font-black">资料使用</h2><p className="mt-3 leading-8">账号与内容数据的使用方式见 <Link href="/privacy" className="underline">隐私政策</Link>。重要规则或数据处理方式变更时，应更新说明并在站内提示用户。</p></section>
    </div><nav className="mt-7 flex gap-5 text-sm font-bold underline"><Link href="/rules">社区规则</Link><Link href="/privacy">隐私政策</Link><Link href="/">返回社区</Link></nav>
  </article>;
}
