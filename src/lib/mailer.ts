import { Resend } from "resend";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const resend = new Resend(env.RESEND_API_KEY);

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export const sendEmail = async ({ to, subject, html, text }: SendArgs): Promise<void> => {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Resend send failed:", error);
    throw new AppError(502, `Could not send email to ${to}. Please try again shortly.`);
  }
};
