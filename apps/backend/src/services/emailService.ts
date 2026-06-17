import { env } from "../config/env.js";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (env.EMAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Reset your Waves Arcade password",
      html: `<p>Use this secure link to reset your Waves Arcade password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 30 minutes.</p>`
    })
  });

  return { sent: response.ok };
}

export async function sendEmailVerificationCode(email: string, code: string) {
  if (env.EMAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Your Waves Arcade verification code",
      html: `<p>Your Waves Arcade verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>This code expires in 15 minutes.</p>`
    })
  });

  return { sent: response.ok };
}
