import { env } from "../config/env.js";

type OtpEmail = {
  subject: string;
  html: string;
  text: string;
};

export const buildOtpEmail = (name: string, code: string): OtpEmail => {
  const minutes = env.OTP_EXPIRY_MINUTES;

  return {
    subject: `${code} is your AgroStore verification code`,
    text: `Hello ${name},\n\nYour AgroStore verification code is ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not create an AgroStore account, ignore this email.`,
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1b2a1b">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px">Verify your email</h1>
      <p style="margin:0 0 24px;color:#5a6b5a;font-size:14px">Hello ${name}, use this code to finish creating your AgroStore account.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#eef4ee;border-radius:8px">${code}</div>
      <p style="margin:24px 0 0;color:#5a6b5a;font-size:13px">This code expires in ${minutes} minutes.</p>
      <p style="margin:8px 0 0;color:#8a9a8a;font-size:12px">If you did not create an AgroStore account, you can ignore this email.</p>
    </div>
  </body>
</html>`,
  };
};
