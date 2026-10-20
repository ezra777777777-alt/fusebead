import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "新手帮助", description: "了解注册、投稿审核、草稿、举报反馈和拼豆工具的使用方法。" };

export default function HelpPage() {
  return <article className="mx-auto max-w-3xl px-5 pb-16 pt-28 text-black">
    <p className="text-xs font-black tracking-widest text-[var(--orange)]">GET STARTED · 公测使用指南</p><h1 className="mt-3 text-4xl font-black">第一次来，从这里开始。</h1>
    <p className="mt-5 leading-8">登录后才能查看作品、资源分享和帖子。注册、登录、验证码，以及本页、社区规则、用户协议和隐私政策都可以直接打开。想评论、点赞、签到或投稿时，使用菜单里的“登录 / 注册”。</p>
    <nav aria-label="帮助目录" className="my-7 flex flex-wrap gap-4 text-sm font-bold underline"><a href="#account">注册与登录</a><a href="#submit">投稿与草稿</a><a href="#review">查看审核</a><a href="#feedback">举报与反馈</a><a href="#tools">拼豆工具</a><a href="#github">资源分享</a></nav>
    <div className="space-y-8 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
      <section id="account" className="scroll-mt-24"><h2 className="text-xl font-black">01 / 注册、验证和找回密码</h2><p className="mt-3 leading-8">填写昵称、邮箱和密码，完成图形验证码并阅读协议后注册。使用邮件中的最新验证码验证邮箱，才能登录。没收到验证码时，先核对邮箱和垃圾邮件文件夹；等待页面倒计时结束后重发，旧验证码会失效。</p><p className="mt-3 leading-8">忘记密码时，在登录窗口选择“忘记密码”，按邮件验证码重置，再用新密码登录。无法登录或账号被封禁时，右下角反馈入口仍可提交账号申诉；不要在反馈里填写密码或验证码。</p><p className="mt-3 border-l-4 border-[var(--acid)] bg-[var(--paper)] p-3 text-sm leading-7">当前是本机预览，验证邮件只保存在这台电脑的测试收件目录，不会发送到真实邮箱。公开公测前需要启用真实邮件服务。</p></section>
      <section id="submit" className="scroll-mt-24"><h2 className="text-xl font-black">02 / 填写投稿和继续草稿</h2><ol className="mt-3 list-decimal space-y-2 pl-5 leading-8"><li>准备作品名称、一句话用途、分区和可打开的试玩网址。</li><li>可选填写源码地址、制作过程和截图；截图支持 PNG、JPEG、WebP，最大 2 MB。</li><li>阅读社区规则并确认内容有权公开，然后送审。</li></ol><p className="mt-3 leading-8">填写时自动保存本机草稿，离开或刷新后回到投稿页可继续。修改旧投稿的草稿从个人中心对应作品的“编辑投稿”进入。草稿仅保存在当前浏览器，不跨设备同步；清理网站数据会删除草稿。确认送审成功后，可到个人中心查看进度。</p><Link href="/submit" className="mt-3 inline-block font-bold underline">开始投稿 / 继续本机草稿 →</Link></section>
      <section id="review" className="scroll-mt-24"><h2 className="text-xl font-black">03 / 投稿为什么还没出现在首页</h2><p className="mt-3 leading-8">新投稿先进入“待审核”，只有通过后才公开。在个人中心刷新投稿列表，查看“需修改”的原因，再修改并重新送审。已公开作品再次修改也会重新审核，审核期间暂不公开；撤回后可修改重投。已下架作品需通过反馈说明情况，不能直接重新发布。</p><p className="mt-3 leading-8">公测由人工审核，暂不承诺固定时限。每日签到加 5 点清运值，按北京时间计算；作品首次通过审核加 10 点，重复通过、点赞和评论不加分。</p><Link href="/dashboard" className="mt-3 inline-block font-bold underline">查看我的投稿 →</Link></section>
      <section id="feedback" className="scroll-mt-24"><h2 className="text-xl font-black">04 / 危险作品、问题反馈与申诉</h2><p className="mt-3 leading-8">作品有问题时，在详情页点击“呼叫环卫”，提交原因和说明，在个人中心的“举报结果”查看结论。网站使用问题、审核异议和数据请求通过右下角反馈提交；登录用户可在“我的反馈”查看记录和管理员站内回复。已查阅不代表问题已解决。</p><p className="mt-3 leading-8">未登录申诉提交后，管理员需核实身份，不会自动解封。恢复登录后可查看账号对应的申诉记录。外部试玩网站由作者提供，跳转前核对域名，勿输入不必要的私人信息。</p><div className="mt-3 flex flex-wrap gap-5 font-bold underline"><Link href="/dashboard?tab=feedback">我的反馈 →</Link><Link href="/rules">社区规则 →</Link></div></section>
      <section id="tools" className="scroll-mt-24"><h2 className="text-xl font-black">05 / 拼豆图纸去哪里</h2><p className="mt-3 leading-8">拼豆工坊保留图片转图纸、像素画板、色号转换和图纸库。拼豆图纸通过工具里的发布入口进入图纸库；软件项目通过社区投稿进入作品列表，两种内容分别展示，共用同一账号。</p><Link href="/beads" className="mt-3 inline-block font-bold underline">打开拼豆工坊 →</Link></section>
      <section id="github" className="scroll-mt-24"><h2 className="text-xl font-black">06 / 资源分享</h2><p className="mt-3 leading-8">在资源分享专区点击“分享资源”，填写项目名称、用途和公开仓库主页（https://github.com/作者/项目），可补充技术栈、使用方法和截图。没有演示网站也能投稿。推荐他人的项目时，请保留原作者出处，遵守仓库许可证，不要将他人项目冒充原创。</p><p className="mt-3 leading-8">分享与普通投稿一样先审核，退回后从个人中心修改重投；通过后可搜索、点赞、评论和举报。专区入口的草稿与普通投稿草稿分别保存，不会互相覆盖。仓库地址格式校验不代表项目一定公开或仍在维护，分享前请自行打开确认。</p><Link href="/github" className="mt-3 inline-block font-bold underline">逛资源分享 →</Link></section>
    </div><Link href="/" className="mt-8 inline-block font-bold underline">← 返回社区</Link>
  </article>;
}
