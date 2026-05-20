import nodemailer from "nodemailer";

function getTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.163.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendVerificationCode(to: string, code: string, type: "email_verify" | "password_reset" = "email_verify"): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || to;
  const transporter = getTransporter();

  const isReset = type === "password_reset";

  await transporter.sendMail({
    from,
    to,
    subject: isReset
      ? "FuseBead - Reset Password / 重置密码"
      : "FuseBead - Email Verification / 邮箱验证码",
    html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px">
  <h2 style="color:#f472b6;margin:0 0 16px">FuseBead.art</h2>
  ${isReset
    ? `<p style="color:#333;font-size:14px">Your password reset code is：</p>
       <p style="color:#333;font-size:14px">您的密码重置验证码是：</p>`
    : `<p style="color:#333;font-size:14px">Your verification code is：</p>
       <p style="color:#333;font-size:14px">您的验证码是：</p>`}
  <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:20px;background:#fef3c7;border-radius:8px;margin:16px 0;color:#333">
    ${code}
  </div>
  <p style="color:#888;font-size:12px;margin:0">This code expires in 10 minutes. / 验证码10分钟内有效。</p>
  <p style="color:#888;font-size:12px;margin:4px 0 0">If you did not request this, please ignore. / 如非本人操作请忽略。</p>
</div>`,
  });
}
