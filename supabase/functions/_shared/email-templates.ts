/**
 * Shared HTML email templates for Edge Functions.
 * Ported from base44/functions/emailTemplates/entry.ts.
 *
 * TODO: Port the actual template markup from the Base44 function.
 * Key templates needed:
 *   - tmlEmailWrapper(bodyHtml) — branded email shell
 *   - tmlButton(href, label) — CTA button
 *   - tmlH1(text) — heading
 *   - tmlP(text) — paragraph
 *   - approvalEmail(name, loginUrl)
 *   - rejectionEmail(name, reason)
 *   - activationEmail(name, activateUrl)
 *   - circleInviteEmail(inviterName, circleName, joinUrl)
 *   - passwordResetEmail(name, resetUrl)
 */

const LOGO_URL = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const APP_URL = Deno.env.get('APP_URL') || 'https://app.taylormadelaw.com';
const SUPPORT_EMAIL = 'support@taylormadelaw.com';

export function tmlEmailWrapper(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${LOGO_URL}" alt="Taylor Made Law" style="height:48px;" />
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e5e5;">
      ${bodyHtml}
    </div>
    <div style="text-align:center;margin-top:24px;color:#999;font-size:12px;">
      <p>Taylor Made Law &middot; <a href="mailto:${SUPPORT_EMAIL}" style="color:#a47864;">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function tmlButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#3a164d;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;
}

export function tmlH1(text: string): string {
  return `<h1 style="color:#3a164d;font-size:24px;margin:0 0 16px;">${text}</h1>`;
}

export function tmlP(text: string): string {
  return `<p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
}

export { APP_URL, LOGO_URL, SUPPORT_EMAIL };
