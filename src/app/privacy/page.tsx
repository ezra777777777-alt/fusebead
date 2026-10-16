import Link from "next/link";
export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl px-5 pb-16 pt-28 text-black"><p className="text-xs font-black tracking-widest text-[var(--orange)]">PRIVACY · 社区公测</p><h1 className="mt-3 text-4xl font-black">你的资料，怎样使用。</h1><p className="mt-5 leading-8">本页说明本站公测版本的数据使用方式。隐私相关请求可通过站内反馈或 <a href="mailto:cx2548464278@163.com" className="underline">cx2548464278@163.com</a> 联系本站运营者。</p>
    <div className="mt-8 space-y-7 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
      <section><h2 className="text-xl font-black">账号资料</h2><p className="mt-3 leading-8">注册使用邮箱、昵称和密码。邮箱用于验证、登录和找回密码，不在公开主页展示。数据库保存密码的哈希值。昵称、头像、公开作品、评论和清运值会向访客展示。</p></section>
      <section><h2 className="text-xl font-black">投稿、审核与反馈</h2><p className="mt-3 leading-8">我们保存投稿内容、上传截图及图片链接、审核状态、审核说明、投票、评论、签到和举报记录，用于提供社区功能和处理争议。待审核、退回或撤回的作品正文只对作者及管理员提供访问。举报详情由管理员处理，处理结论对举报人展示。反馈内容与管理员回复仅供对应账号及管理员查看；未登录申诉填写的邮箱尚需人工核实。上传的截图即使尚未通过投稿审核，持有图片链接的人也可以直接访问；外部图片网址也可能被其他访问者或图片服务提供方直接访问，请勿上传私人或敏感截图。</p></section>
      <section><h2 className="text-xl font-black">浏览器与服务提供方</h2><p className="mt-3 leading-8">登录凭证、语言偏好和自动或手动保存的草稿存储在当前浏览器。退出登录会清除登录凭证；清理浏览器网站数据会删除本机草稿。前端页面由 Vercel 托管，账号、作品和上传截图存储在阿里云服务器，验证码邮件通过网易邮箱 SMTP 服务发送。服务提供方会处理提供服务所需的网络请求信息。访问投稿者提供的图片或外部链接时，对方网站可能接收你的网络信息。</p></section>
      <section><h2 className="text-xl font-black">存储与请求</h2><p className="mt-3 leading-8">账号与社区数据保存在服务器数据库，上传截图保存在服务器文件目录，并进行备份。用于限流的账号或网络标识在短时间窗口内保留。你可以在个人中心修改资料、撤回投稿，并删除自己的评论。若需要查询、更正或删除账号相关数据，可通过“反馈”或上述联系邮箱提出请求；无法登录时可使用账号申诉入口。管理员核实后处理，备份中的数据需在备份轮换时一并处理。</p></section>
    </div><nav className="mt-7 flex gap-5 text-sm font-bold underline"><Link href="/rules">社区规则</Link><Link href="/terms">用户协议</Link><Link href="/">返回社区</Link></nav>
  </article>;
}
