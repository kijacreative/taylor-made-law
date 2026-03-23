// Shared branded email templates for Taylor Made Law
// Import: import { tmlEmail } from './emailTemplates.js'; — NOT VALID in Deno isolated functions.
// Instead, copy the tmlEmail helper inline or call via SDK.
// This file is for reference — inline the helpers directly in each function.

export const LOGO_URL = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
export const BRAND_PURPLE = '#3a164d';
export const BRAND_ACCENT = '#a47864';

export function tmlEmailWrapper(content, year = new Date().getFullYear()) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Taylor Made Law</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <!-- Logo Header -->
      <tr><td style="text-align:center;padding-bottom:28px;">
        <img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" width="200" alt="Taylor Made Law" style="width:200px;max-width:200px;height:auto;display:block;margin:0 auto;" />
      </td></tr>
      <!-- Card -->
      <tr><td style="background:#ffffff;border-radius:16px;padding:40px 48px;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        ${content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:28px 0 0;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #e0dbd5;padding-top:20px;text-align:center;">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Taylor Made Law</p>
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">This is an automated message from the Taylor Made Law Network.</p>
            <p style="margin:0;color:#9ca3af;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
            <p style="margin:8px 0 0;color:#bbb;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">© ${year} Taylor Made Law. All rights reserved.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function tmlButton(href, label) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
  <tr><td align="center">
    <a href="${href}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.01em;">${label}</a>
  </td></tr>
</table>`;
}

export function tmlH1(text) {
  return `<h1 style="margin:0 0 16px;color:#111827;font-size:26px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.3;">${text}</h1>`;
}

export function tmlP(text) {
  return `<p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${text}</p>`;
}