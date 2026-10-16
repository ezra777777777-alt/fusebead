import Link from "next/link";
export default function RulesPage() {
  return <article className="mx-auto max-w-3xl px-5 pb-16 pt-28 text-black"><p className="text-xs font-black tracking-widest text-[var(--orange)]">COMMUNITY GUIDELINES · 公测规则</p><h1 className="mt-3 text-4xl font-black">玩梗可以，害人不行。</h1><p className="mt-5 leading-8">这里收录可以公开体验的 Vibe Coding 作品、开发记录和求助。评价作品和想法，尊重屏幕另一边的人。</p>
    <div className="mt-8 space-y-7 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
      <section><h2 className="text-xl font-black">01 / 投稿与审核</h2><p className="mt-3 leading-8">请填写真实用途、可访问的试玩地址和必要的使用限制。只提交自己有权展示的文字、代码链接和截图。新投稿与修改后的投稿均需人工审核；审核期间不公开。你可以在个人中心查看状态、退回原因、修改重投或撤回。</p></section>
      <section><h2 className="text-xl font-black">02 / 禁止内容</h2><p className="mt-3 leading-8">禁止木马、钓鱼、盗取数据、恶意跳转、侵权盗版、冒充原创、欺诈、骚扰、泄露他人隐私和违法内容。禁止刷屏、重复投稿和操纵投票。公测不接收 EXE、APK 或压缩包。</p></section>
      <section><h2 className="text-xl font-black">03 / 评论与积分</h2><p className="mt-3 leading-8">评论应围绕作品，不进行人身攻击。每日签到奖励 5 点清运值，日期以北京时间计算；同一作品首次审核通过奖励 10 点，撤回、编辑、再次通过不重复奖励。点赞、取消点赞和评论均不加积分。积分只用于社区展示，没有现金价值。</p></section>
      <section><h2 className="text-xl font-black">04 / 举报与申诉</h2><p className="mt-3 leading-8">在作品详情点击“呼叫环卫”，选择原因并补充说明。处理进度和结论会显示在个人中心。管理员可退回、下架作品、删除评论或封禁账号。对处理有异议时，可使用页面右下角“反馈”说明作品编号、处理结果和理由；账号无法登录时，可通过反馈弹窗中的账号申诉入口提交。</p></section>
      <section><h2 className="text-xl font-black">05 / 外部网站</h2><p className="mt-3 leading-8">作品链接由投稿人提供，外部网站内容可能变化。人工审核不等于安全担保。跳转前请核对域名，不向不信任的网站提交密码、验证码、支付信息或敏感资料。</p></section>
    </div><nav className="mt-7 flex flex-wrap gap-5 text-sm font-bold underline"><Link href="/submit">去投稿</Link><Link href="/privacy">隐私政策</Link><Link href="/terms">用户协议</Link><Link href="/">返回社区</Link></nav>
  </article>;
}
