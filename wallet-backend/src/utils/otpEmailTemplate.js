const PURPOSE_COPY = {
  register: {
    subject: 'Verify your SmartWallet account',
    title: 'Account verification',
    description: 'Use the code below to complete your SmartWallet registration.',
  },
  resend_register: {
    subject: 'Your new verification code',
    title: 'New verification code',
    description: 'Here is your new OTP code for SmartWallet registration.',
  },
  password_reset: {
    subject: 'Reset your password',
    title: 'Password reset',
    description: 'Use this code to reset your SmartWallet password.',
  },
  pin_reset: {
    subject: 'Reset your transaction PIN',
    title: 'PIN reset',
    description: 'Use this code to set a new transaction PIN.',
  },
  pin_setup: {
    subject: 'Set up your transaction PIN',
    title: 'PIN setup',
    description: 'Use this code to create your SmartWallet transaction PIN.',
  },
  contact_change: {
    subject: 'Confirm contact change',
    title: 'Verify contact update',
    description: 'Use this code to confirm changes to your email or phone number.',
  },
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Build a simple branded OTP email (HTML + plain text).
 * @param {{ purpose: keyof PURPOSE_COPY, otp: string, expiryMinutes?: number }} options
 */
const buildOtpEmail = ({ purpose, otp, expiryMinutes = 5 }) => {
  const copy = PURPOSE_COPY[purpose] || PURPOSE_COPY.register;
  const safeOtp = escapeHtml(otp);
  const otpDigits = safeOtp.split('').map((digit) => (
    `<span style="display:inline-block;min-width:36px;padding:10px 6px;margin:0 3px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:24px;font-weight:700;color:#1e293b;text-align:center;font-family:'Courier New',Courier,monospace;">${digit}</span>`
  )).join('');

  const subject = `[SmartWallet] ${copy.subject}`;
  const text = [
    copy.title,
    '',
    copy.description,
    '',
    `OTP: ${otp}`,
    `Expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not request this code, you can safely ignore this email.',
    'Never share your OTP with anyone.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(copy.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:24px 28px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:rgba(255,255,255,0.85);">SmartWallet</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">${escapeHtml(copy.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml(copy.description)}</p>
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#64748b;">Your verification code</p>
              <div style="text-align:center;margin:0 0 20px;">${otpDigits}</div>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">
                This code expires in <strong style="color:#1e293b;">${expiryMinutes} minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td style="padding:12px 14px;font-size:12px;line-height:1.5;color:#64748b;">
                    For your security, never share this code with anyone. SmartWallet staff will never ask for your OTP.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
                If you did not request this email, you can ignore it.<br />
                &copy; ${new Date().getFullYear()} SmartWallet
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};

const getEmailFrom = () => `"SMARTWALLET" <${process.env.EMAIL_USER}>`;

module.exports = { buildOtpEmail, getEmailFrom };
