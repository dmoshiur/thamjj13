import { Resend } from "resend";
import { getTursoClient, getSetting, setSetting, cleanEnvValue, isPlaceholderEnv } from "./db";
import { MailLog, ResendConfig, Report, Certificate, OtpPurpose } from "../types";

export const DEFAULT_SENDER_EMAIL = "no-reply@thamjj13.top";
export const DEFAULT_SENDER_NAME = "THAMJJ13 Security";

interface StoredResendSettings {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  adminAlertEmail?: string;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function resolveResendConfig(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName: string;
  formattedFrom: string;
  adminAlertEmail: string;
  apiKeyConfigured: boolean;
  apiKeySource: "ENV" | "DATABASE" | "NONE";
}> {
  const stored = (await getSetting<StoredResendSettings>("resend_settings")) || {};
  const rawEnvKey = cleanEnvValue(process.env.RESEND_API_KEY);
  const envKey = isPlaceholderEnv(rawEnvKey) ? "" : rawEnvKey;
  const rawDbKey = cleanEnvValue(stored.apiKey);
  const dbKey = isPlaceholderEnv(rawDbKey) ? "" : rawDbKey;
  const apiKey = envKey || dbKey;

  const rawFromEmail = (
    cleanEnvValue(process.env.RESEND_FROM_EMAIL) ||
    cleanEnvValue(stored.fromEmail) ||
    DEFAULT_SENDER_EMAIL
  ).trim();

  // Support either bare address "no-reply@thamjj13.top" or formatted "Name <no-reply@thamjj13.top>"
  let fromEmail = rawFromEmail;
  let fromName = (
    cleanEnvValue(process.env.RESEND_FROM_NAME) ||
    cleanEnvValue(stored.fromName) ||
    DEFAULT_SENDER_NAME
  ).trim();

  const match = rawFromEmail.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    fromName = match[1].replace(/^["']|["']$/g, "").trim() || fromName;
    fromEmail = match[2].trim();
  }

  const formattedFrom = `${fromName} <${fromEmail}>`;
  const adminAlertEmail = (
    process.env.ADMIN_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    stored.adminAlertEmail ||
    ""
  ).trim();

  return {
    apiKey,
    fromEmail,
    fromName,
    formattedFrom,
    adminAlertEmail,
    apiKeyConfigured: Boolean(apiKey),
    apiKeySource: envKey ? "ENV" : dbKey ? "DATABASE" : "NONE",
  };
}

export async function getPublicResendConfig(): Promise<ResendConfig> {
  const cfg = await resolveResendConfig();
  return {
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName,
    adminAlertEmail: cfg.adminAlertEmail,
    apiKeyConfigured: cfg.apiKeyConfigured,
    apiKeySource: cfg.apiKeySource,
    maskedApiKey: cfg.apiKey
      ? `${cfg.apiKey.slice(0, 6)}••••••••${cfg.apiKey.slice(-4)}`
      : "",
  };
}

export async function saveResendConfig(input: {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  adminAlertEmail?: string;
}): Promise<ResendConfig> {
  const existing = (await getSetting<StoredResendSettings>("resend_settings")) || {};
  const nextApiKey =
    input.apiKey !== undefined
      ? input.apiKey.includes("••••")
        ? existing.apiKey
        : input.apiKey.trim()
      : existing.apiKey;

  await setSetting("resend_settings", {
    apiKey: nextApiKey || "",
    fromEmail: (input.fromEmail ?? existing.fromEmail ?? DEFAULT_SENDER_EMAIL).trim() || DEFAULT_SENDER_EMAIL,
    fromName: (input.fromName ?? existing.fromName ?? DEFAULT_SENDER_NAME).trim() || DEFAULT_SENDER_NAME,
    adminAlertEmail: (input.adminAlertEmail ?? existing.adminAlertEmail ?? "").trim(),
  });

  return getPublicResendConfig();
}

async function recordMailLog(entry: {
  recipient: string;
  subject: string;
  category: string;
  status: "SENT" | "SIMULATED" | "FAILED";
  providerId?: string;
  error?: string;
}): Promise<void> {
  try {
    const db = getTursoClient();
    const id = `mail-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.execute({
      sql: `INSERT INTO mail_logs (id, recipient, subject, category, status, provider_id, error_msg, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        entry.recipient,
        entry.subject,
        entry.category,
        entry.status,
        entry.providerId || "",
        entry.error || "",
        new Date().toISOString(),
      ],
    });
  } catch (err) {
    console.error("Failed to record mail log:", err);
  }
}

export async function getRecentMailLogs(limit = 50): Promise<MailLog[]> {
  const db = getTursoClient();
  const res = await db.execute({
    sql: `SELECT * FROM mail_logs ORDER BY timestamp DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r: any) => ({
    id: String(r.id),
    recipient: String(r.recipient),
    subject: String(r.subject),
    category: String(r.category),
    status: String(r.status) as "SENT" | "SIMULATED" | "FAILED",
    providerId: r.provider_id ? String(r.provider_id) : undefined,
    error: r.error_msg ? String(r.error_msg) : undefined,
    timestamp: String(r.timestamp),
  }));
}

export async function getAdminNotificationRecipients(): Promise<string[]> {
  const cfg = await resolveResendConfig();
  const recipients = new Set<string>();

  if (cfg.adminAlertEmail) {
    cfg.adminAlertEmail
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => recipients.add(e));
  }

  try {
    const db = getTursoClient();
    const admins = await db.execute(
      `SELECT email FROM users WHERE role = 'SUPER_ADMIN' AND approved = 1`
    );
    for (const row of admins.rows) {
      const email = String(row.email || "").trim().toLowerCase();
      if (email) recipients.add(email);
    }
  } catch {
    // ignore
  }

  return Array.from(recipients);
}

function wrapEmailLayout(title: string, badge: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">
    <div style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.04);">
      <div style="background-color:#09090b;padding:24px 32px;color:#ffffff;">
        <div style="font-size:11px;font-family:monospace;letter-spacing:2px;color:#a1a1aa;text-transform:uppercase;margin-bottom:6px;">
          ${escapeHtml(badge)}
        </div>
        <div style="font-size:20px;font-weight:700;letter-spacing:0.5px;">
          THAMJJ13 • Enterprise Cyber Command
        </div>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;color:#09090b;">${escapeHtml(title)}</h2>
        ${bodyHtml}
      </div>
      <div style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:20px 32px;font-size:12px;color:#71717a;line-height:1.6;">
        <div>Automated security dispatch from <strong>no-reply@thamjj13.top</strong></div>
        <div>THAMJJ13 White Hat Guild • Singapore SLA HQ &amp; Bangladesh Operations Node</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  category?: string;
  replyTo?: string;
}

export async function sendMailViaResend(options: SendMailOptions): Promise<{
  delivered: boolean;
  simulated: boolean;
  id?: string;
  error?: string;
}> {
  const recipients = (Array.isArray(options.to) ? options.to : [options.to])
    .map((e) => String(e || "").trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { delivered: false, simulated: false, error: "No recipient email specified." };
  }

  const cfg = await resolveResendConfig();
  const category = options.category || "GENERAL";

  if (cfg.apiKeyConfigured) {
    try {
      const resend = new Resend(cfg.apiKey);
      const { data, error } = await resend.emails.send({
        from: cfg.formattedFrom,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      });

      if (error) {
        console.error(`[RESEND ERROR] Failed sending to ${recipients.join(", ")}:`, error);
        await recordMailLog({
          recipient: recipients.join(", "),
          subject: options.subject,
          category,
          status: "FAILED",
          error: error.message || JSON.stringify(error),
        });
        return {
          delivered: false,
          simulated: false,
          error: error.message || "Resend API rejected email delivery.",
        };
      }

      await recordMailLog({
        recipient: recipients.join(", "),
        subject: options.subject,
        category,
        status: "SENT",
        providerId: data?.id,
      });

      return {
        delivered: true,
        simulated: false,
        id: data?.id,
      };
    } catch (err: any) {
      const msg = err?.message || "Unexpected Resend transport error";
      console.error(`[RESEND EXCEPTION]`, err);
      await recordMailLog({
        recipient: recipients.join(", "),
        subject: options.subject,
        category,
        status: "FAILED",
        error: msg,
      });
      return { delivered: false, simulated: false, error: msg };
    }
  }

  // Fallback simulation log ONLY when RESEND_API_KEY is not configured yet
  console.log(`\n======================================================`);
  console.log(`📬 [RESEND DEV FALLBACK - RESEND_API_KEY NOT SET]`);
  console.log(`FROM: ${cfg.formattedFrom}`);
  console.log(`TO: ${recipients.join(", ")}`);
  console.log(`SUBJECT: ${options.subject}`);
  console.log(`TEXT:\n${options.text}`);
  console.log(`======================================================\n`);

  await recordMailLog({
    recipient: recipients.join(", "),
    subject: options.subject,
    category,
    status: "SIMULATED",
    error: "RESEND_API_KEY not configured; logged locally",
  });

  return { delivered: false, simulated: true };
}

// ============================================================================
// HIGH-LEVEL TRANSACTIONAL EMAIL TEMPLATES
// ============================================================================

export async function sendOtpVerificationEmail(params: {
  to: string;
  otp: string;
  purpose: OtpPurpose;
  username?: string;
}) {
  const purposeLabels: Record<OtpPurpose, { subject: string; badge: string; heading: string; intro: string }> = {
    ADMIN_LOGIN: {
      subject: "[THAMJJ13] Admin Console Verification OTP",
      badge: "ZERO-TRUST ADMIN MFA",
      heading: "Admin Login Verification Code",
      intro: "A sign-in attempt with valid credentials was initiated for your THAMJJ13 Admin Console account.",
    },
    LOGIN_2FA: {
      subject: "[THAMJJ13] Cadet Portal 2FA Verification OTP",
      badge: "CADET PORTAL MFA",
      heading: "Cadet Sign-In Verification Code",
      intro: "A sign-in attempt with valid credentials was initiated for your THAMJJ13 Cadet Portal account.",
    },
    BOOTSTRAP_SETUP: {
      subject: "[THAMJJ13] Initial Super Admin Setup OTP",
      badge: "PLATFORM BOOTSTRAP VERIFICATION",
      heading: "Verify Super Administrator Ownership",
      intro: "Use the cryptographic verification code below to finalize one-time Super Administrator provisioning.",
    },
    PASSWORD_RESET: {
      subject: "[THAMJJ13] Password Reset Security OTP",
      badge: "CIPHER CREDENTIAL RECOVERY",
      heading: "Password Reset Verification Code",
      intro: "A password reset was requested for your THAMJJ13 account. Enter this code to set a new password.",
    },
    USER_VERIFY: {
      subject: "[THAMJJ13] Email Verification OTP",
      badge: "CADET IDENTITY VERIFICATION",
      heading: "Verify Your Email Address",
      intro: "Use the security code below to verify your email address with THAMJJ13 Academy.",
    },
    EMAIL_VERIFY: {
      subject: "[THAMJJ13] Cadet Enlistment Email Verification OTP",
      badge: "CADET ENLISTMENT VERIFICATION",
      heading: "Confirm Your Email to Enlist",
      intro: "Enter the 6-digit verification code below to verify your email address and submit your Cadet registration.",
    },
  };

  const meta = purposeLabels[params.purpose];
  const greeting = params.username ? `Hello ${escapeHtml(params.username)},` : "Hello,";

  const html = wrapEmailLayout(
    meta.heading,
    meta.badge,
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">${greeting}</p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 24px 0;">${escapeHtml(meta.intro)}</p>
      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:16px;padding:24px;text-align:center;margin:0 0 24px 0;">
        <div style="font-size:11px;font-family:monospace;color:#71717a;letter-spacing:2px;margin-bottom:8px;">ONE-TIME SECURITY CODE</div>
        <div style="font-size:36px;font-weight:800;font-family:monospace;letter-spacing:10px;color:#09090b;">${escapeHtml(params.otp)}</div>
        <div style="font-size:12px;color:#71717a;margin-top:10px;">Expires in <strong>10 minutes</strong> • Single-use token</div>
      </div>
      <p style="font-size:12px;line-height:1.6;color:#71717a;margin:0;">
        If you did not initiate this request, do not share this code and review your account security immediately.
      </p>
    `
  );

  return sendMailViaResend({
    to: params.to,
    subject: meta.subject,
    text: `${meta.heading}\n\n${meta.intro}\n\nYour 6-digit OTP code is: ${params.otp}\n\nThis code expires in 10 minutes.`,
    html,
    category: params.purpose,
  });
}

export async function sendReportSubmittedEmails(report: Report) {
  const userSubject = `[THAMJJ13] Incident Report Confirmed — Case ID: ${report.id}`;
  const userHtml = wrapEmailLayout(
    `Incident Report Registered (${report.id})`,
    "CITIZEN INCIDENT DISPATCH RECEIPT",
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        Dear <strong>${escapeHtml(report.fullName)}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 20px 0;">
        We have securely received and logged your cyber incident report in our encrypted ledger. Our operations coordinators will review your submission and notify you via email at every status update.
      </p>
      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin:0 0 20px 0;font-size:13px;line-height:1.8;">
        <div><strong>Case Reference ID:</strong> <span style="font-family:monospace;background:#09090b;color:#fff;padding:2px 8px;border-radius:6px;">${escapeHtml(report.id)}</span></div>
        ${report.trackingCode ? `<div><strong>Verification PIN:</strong> <span style="font-family:monospace;">${escapeHtml(report.trackingCode)}</span></div>` : ""}
        <div><strong>Category:</strong> ${escapeHtml(report.category)}</div>
        <div><strong>Incident Date/Time:</strong> ${escapeHtml(report.incidentDateTime)}</div>
        <div><strong>Incident Location:</strong> ${escapeHtml(report.incidentLocation)}</div>
        <div><strong>Evidence Attached:</strong> ${escapeHtml(report.evidenceName || "None")}</div>
        <div><strong>Current Triage Status:</strong> <strong style="color:#d97706;">PENDING REVIEW</strong></div>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#52525b;margin:0;">
        Keep your Case Reference ID (<strong>${escapeHtml(report.id)}</strong>) safe. You can track live triage progress and download your signed First Information Report (FIR) PDF once approved.
      </p>
    `
  );

  const userText = `Dear ${report.fullName},\n\nYour incident report has been securely registered.\nCase Reference ID: ${report.id}\nCategory: ${report.category}\nLocation: ${report.incidentLocation}\nDate/Time: ${report.incidentDateTime}\nCurrent Status: PENDING\n\nYou will receive automated email updates whenever your report status changes or an FIR is issued.\n\n— THAMJJ13 Security Command`;

  const userDispatchPromise = sendMailViaResend({
    to: report.email,
    subject: userSubject,
    text: userText,
    html: userHtml,
    category: "REPORT_CONFIRMATION",
  });

  // Notify Admin alert recipients
  const adminRecipients = await getAdminNotificationRecipients();
  if (adminRecipients.length > 0) {
    const adminSubject = `[URGENT DISPATCH] New Case Report ${report.id} — ${report.category}`;
    const adminHtml = wrapEmailLayout(
      `New Cyber Incident Report: ${report.id}`,
      "SOC ADMIN ALERT",
      `
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
          A new incident report has been submitted and awaits triage in the THAMJJ13 Admin Console.
        </p>
        <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin:0 0 20px 0;font-size:13px;line-height:1.8;">
          <div><strong>Report ID:</strong> ${escapeHtml(report.id)}</div>
          <div><strong>Complainant:</strong> ${escapeHtml(report.fullName)} (${escapeHtml(report.email)} • ${escapeHtml(report.phone)})</div>
          <div><strong>Address:</strong> ${escapeHtml(report.address)}</div>
          <div><strong>Category:</strong> ${escapeHtml(report.category)}</div>
          <div><strong>Incident Time &amp; Location:</strong> ${escapeHtml(report.incidentDateTime)} @ ${escapeHtml(report.incidentLocation)}</div>
          <div><strong>Witness Info:</strong> ${escapeHtml(report.witnessInfo || "None")}</div>
          <div><strong>Evidence:</strong> ${report.evidenceUrl ? `<a href="${escapeHtml(report.evidenceUrl)}">${escapeHtml(report.evidenceName || "View Evidence")}</a>` : "None"}</div>
        </div>
        <div style="background-color:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#27272a;white-space:pre-wrap;">${escapeHtml(report.description)}</div>
      `
    );

    await sendMailViaResend({
      to: adminRecipients,
      subject: adminSubject,
      text: `New Incident Report ${report.id}\nComplainant: ${report.fullName} (${report.email}, ${report.phone})\nCategory: ${report.category}\nLocation: ${report.incidentLocation}\nDescription:\n${report.description}`,
      html: adminHtml,
      category: "ADMIN_REPORT_ALERT",
      replyTo: report.email,
    });
  }

  return userDispatchPromise;
}

export async function sendReportStatusUpdateEmail(report: Report, previousStatus: string) {
  const isApprovedFir = report.status === "APPROVED" && report.firDetails;
  const subject = isApprovedFir
    ? `[THAMJJ13] Official FIR Approved & Issued — ${report.firNumber || report.id}`
    : `[THAMJJ13] Case Report Update (${report.id}) — Status: ${report.status}`;

  const firSectionHtml = isApprovedFir
    ? `
      <div style="background-color:#09090b;color:#f4f4f5;border-radius:14px;padding:20px;margin:20px 0;font-size:13px;line-height:1.8;">
        <div style="color:#34d399;font-family:monospace;font-weight:700;margin-bottom:8px;">✓ OFFICIAL CRYPTOGRAPHIC FIR ISSUED</div>
        <div><strong>FIR Number:</strong> <span style="font-family:monospace;">${escapeHtml(report.firNumber || report.firDetails?.firNumber || "")}</span></div>
        <div><strong>Jurisdiction Station:</strong> ${escapeHtml(report.firDetails?.policeStation || "")}</div>
        <div><strong>Investigating Officer:</strong> ${escapeHtml(report.firDetails?.officerDetails || "")}</div>
        <div><strong>Verification Code:</strong> <span style="font-family:monospace;color:#34d399;">${escapeHtml(report.firDetails?.verificationCode || "")}</span></div>
        <div><strong>Digital Signature:</strong> ${escapeHtml(report.firDetails?.signature || "")}</div>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#3f3f46;">
        You can now download and print your official First Information Report (FIR) PDF from the THAMJJ13 Verification / Case Tracking portal or your Cadet Dashboard using Case ID <strong>${escapeHtml(report.id)}</strong> and your email address.
      </p>
    `
    : "";

  const notesHtml = report.notes
    ? `
      <div style="background-color:#f8fafc;border-left:4px solid #09090b;padding:14px 16px;margin:16px 0;font-size:13px;line-height:1.6;color:#27272a;">
        <strong>Investigator Notes:</strong><br/>
        ${escapeHtml(report.notes)}
      </div>
    `
    : "";

  const html = wrapEmailLayout(
    isApprovedFir ? "Official FIR Certificate Approved" : `Case Status Updated: ${report.status}`,
    "CASE TRIAGE UPDATE",
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        Dear <strong>${escapeHtml(report.fullName)}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        There is an official update regarding your submitted incident report <strong>${escapeHtml(report.id)}</strong> (${escapeHtml(report.category)}).
      </p>
      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;line-height:1.8;">
        <div><strong>Case Reference ID:</strong> ${escapeHtml(report.id)}</div>
        <div><strong>Previous Status:</strong> ${escapeHtml(previousStatus)}</div>
        <div><strong>Updated Status:</strong> <strong>${escapeHtml(report.status)}</strong></div>
      </div>
      ${notesHtml}
      ${firSectionHtml}
    `
  );

  const text = `Dear ${report.fullName},\n\nYour incident report (${report.id}) status has been updated from ${previousStatus} to ${report.status}.${
    report.notes ? `\n\nInvestigator Notes: ${report.notes}` : ""
  }${
    isApprovedFir
      ? `\n\nOfficial FIR Details:\n- FIR Number: ${report.firNumber}\n- Station: ${report.firDetails?.policeStation}\n- Officer: ${report.firDetails?.officerDetails}\n- Verification Code: ${report.firDetails?.verificationCode}\n\nYou can now download your official FIR PDF on the THAMJJ13 portal.`
      : ""
  }\n\n— THAMJJ13 Security Command`;

  return sendMailViaResend({
    to: report.email,
    subject,
    text,
    html,
    category: isApprovedFir ? "REPORT_FIR_APPROVED" : "REPORT_STATUS_UPDATE",
  });
}

export async function sendRegistrationConfirmationEmail(params: {
  username: string;
  email: string;
  approved: boolean;
}) {
  const html = wrapEmailLayout(
    "Cadet Enlistment Received",
    "ACADEMY ENLISTMENT",
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        Welcome <strong>${escapeHtml(params.username)}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        ${
          params.approved
            ? "Your THAMJJ13 account has been created and approved. You may sign in immediately."
            : "Your enlistment request has been securely recorded in the THAMJJ13 cadet queue. Our Security Board will review your registration and send you an approval email once activated."
        }
      </p>
    `
  );

  const result = await sendMailViaResend({
    to: params.email,
    subject: "[THAMJJ13] Cadet Enlistment Confirmation",
    text: `Welcome ${params.username},\n\nYour THAMJJ13 cadet registration has been received. ${
      params.approved
        ? "Your account is active and approved."
        : "You will receive a confirmation email as soon as an administrator approves your account."
    }`,
    html,
    category: "USER_REGISTRATION",
  });

  const adminRecipients = await getAdminNotificationRecipients();
  if (!params.approved && adminRecipients.length > 0) {
    await sendMailViaResend({
      to: adminRecipients,
      subject: `[THAMJJ13] New Cadet Awaiting Approval: ${params.username}`,
      text: `New cadet registration awaiting review:\nUsername: ${params.username}\nEmail: ${params.email}`,
      html: wrapEmailLayout(
        "New Cadet Registration Pending Review",
        "ADMIN QUEUE NOTIFICATION",
        `<p style="font-size:14px;color:#3f3f46;">Cadet <strong>${escapeHtml(params.username)}</strong> (${escapeHtml(params.email)}) has registered and awaits approval in the Admin Console.</p>`
      ),
      category: "ADMIN_USER_ALERT",
    });
  }

  return result;
}

export async function sendAccountApprovalUpdateEmail(params: {
  username: string;
  email: string;
  approved: boolean;
  role: string;
}) {
  const subject = params.approved
    ? "[THAMJJ13] Account Approved — Access Granted"
    : "[THAMJJ13] Account Access Status Updated";

  const html = wrapEmailLayout(
    params.approved ? "Cadet Clearance Approved" : "Account Clearance Updated",
    "ACCOUNT CLEARANCE UPDATE",
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        Hello <strong>${escapeHtml(params.username)}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        ${
          params.approved
            ? `Your THAMJJ13 account has been approved with role <strong>${escapeHtml(params.role)}</strong>. You can now sign in to your workspace using your registered email and password.`
            : `Your THAMJJ13 account clearance status has been set to pending/suspended (Role: ${escapeHtml(params.role)}). Contact support if you have questions.`
        }
      </p>
    `
  );

  return sendMailViaResend({
    to: params.email,
    subject,
    text: `Hello ${params.username},\n\nYour THAMJJ13 account approval status is now: ${
      params.approved ? "APPROVED" : "SUSPENDED/PENDING"
    } (Role: ${params.role}).`,
    html,
    category: "ACCOUNT_APPROVAL_UPDATE",
  });
}

export async function sendNewAdminProvisionedEmail(params: {
  username: string;
  email: string;
  role: string;
  temporaryPassword: string;
}) {
  const html = wrapEmailLayout(
    "Administrative Access Provisioned",
    "ADMIN CREDENTIALS DISPATCH",
    `
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px 0;">
        Hello <strong>${escapeHtml(params.username)}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 20px 0;">
        A Super Administrator has provisioned an administrative account for you on THAMJJ13.
      </p>
      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin:0 0 20px 0;font-size:13px;line-height:1.8;">
        <div><strong>Login Email:</strong> ${escapeHtml(params.email)}</div>
        <div><strong>Assigned Role:</strong> ${escapeHtml(params.role)}</div>
        <div><strong>Initial Password:</strong> <span style="font-family:monospace;background:#09090b;color:#fff;padding:2px 8px;border-radius:6px;">${escapeHtml(params.temporaryPassword)}</span></div>
      </div>
      <p style="font-size:12px;color:#71717a;margin:0;">
        For security, sign in via the Portal Login gate (Email + Password + Email OTP) and rotate your password immediately.
      </p>
    `
  );

  return sendMailViaResend({
    to: params.email,
    subject: "[THAMJJ13] Administrative Account Provisioned",
    text: `Hello ${params.username},\n\nYour THAMJJ13 administrative account (${params.role}) has been created.\nEmail: ${params.email}\nInitial Password: ${params.temporaryPassword}\n\nPlease sign in and update your password immediately.`,
    html,
    category: "ADMIN_PROVISIONED",
  });
}

export async function sendPasswordChangedEmail(params: { username: string; email: string }) {
  return sendMailViaResend({
    to: params.email,
    subject: "[THAMJJ13] Security Alert: Password Updated",
    text: `Hello ${params.username},\n\nYour THAMJJ13 account password was just updated. If you did not perform this change, contact THAMJJ13 SOC immediately.`,
    html: wrapEmailLayout(
      "Account Password Updated",
      "SECURITY CREDENTIAL ALERT",
      `<p style="font-size:14px;line-height:1.6;color:#3f3f46;">Hello <strong>${escapeHtml(params.username)}</strong>,<br/><br/>Your THAMJJ13 password was successfully changed on <strong>${new Date().toUTCString()}</strong>. If you did not authorize this action, contact our SOC team immediately.</p>`
    ),
    category: "PASSWORD_CHANGED",
  });
}

export async function sendContactSubmissionEmails(params: {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}) {
  const userResult = await sendMailViaResend({
    to: params.email,
    subject: `[THAMJJ13] Inquiry Received — ${params.subject} (${params.id})`,
    text: `Dear ${params.name},\n\nWe have received your message "${params.subject}" (Ref: ${params.id}). Our security operations team will reply shortly.\n\n— THAMJJ13 Security`,
    html: wrapEmailLayout(
      "Security Inquiry Received",
      "COMPLIANCE INBOX CONFIRMATION",
      `
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;">Dear <strong>${escapeHtml(params.name)}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;">We have received your transmission (<strong>${escapeHtml(params.id)}</strong>) regarding <strong>${escapeHtml(params.subject)}</strong>. A specialist will respond directly to this email address.</p>
        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;color:#3f3f46;white-space:pre-wrap;">${escapeHtml(params.message)}</div>
      `
    ),
    category: "CONTACT_CONFIRMATION",
  });

  const adminRecipients = await getAdminNotificationRecipients();
  if (adminRecipients.length > 0) {
    await sendMailViaResend({
      to: adminRecipients,
      subject: `[THAMJJ13 INBOX] ${params.subject} — from ${params.name}`,
      text: `New Contact Message (${params.id})\nFrom: ${params.name} (${params.email}, ${params.phone})\nSubject: ${params.subject}\n\n${params.message}`,
      html: wrapEmailLayout(
        `New Direct Inquiry: ${params.subject}`,
        "DIRECT COMPLIANCE INBOX",
        `<p style="font-size:13px;line-height:1.7;color:#3f3f46;"><strong>From:</strong> ${escapeHtml(params.name)} (${escapeHtml(params.email)} • ${escapeHtml(params.phone)})<br/><strong>Ref:</strong> ${escapeHtml(params.id)}</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;white-space:pre-wrap;">${escapeHtml(params.message)}</div>`
      ),
      category: "ADMIN_CONTACT_ALERT",
      replyTo: params.email,
    });
  }

  return userResult;
}

export async function sendContactReplyEmail(params: {
  to: string;
  recipientName: string;
  originalSubject: string;
  replyText: string;
  senderName: string;
}) {
  return sendMailViaResend({
    to: params.to,
    subject: `Re: [THAMJJ13] ${params.originalSubject}`,
    text: `Dear ${params.recipientName},\n\n${params.replyText}\n\nBest regards,\n${params.senderName}\nTHAMJJ13 Security Operations`,
    html: wrapEmailLayout(
      `Response: ${params.originalSubject}`,
      "OFFICIAL SOC RESPONSE",
      `
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;">Dear <strong>${escapeHtml(params.recipientName)}</strong>,</p>
        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:18px;margin:16px 0;font-size:14px;line-height:1.7;color:#18181b;white-space:pre-wrap;">${escapeHtml(params.replyText)}</div>
        <p style="font-size:13px;color:#52525b;">Dispatched by <strong>${escapeHtml(params.senderName)}</strong> • THAMJJ13 Security Operations</p>
      `
    ),
    category: "CONTACT_REPLY",
  });
}

export async function sendSupportTicketEmails(params: {
  ticketId: string;
  username: string;
  email?: string;
  subject: string;
  description: string;
  event: "CREATED" | "REPLIED" | "RESOLVED";
  replyText?: string;
  replierName?: string;
}) {
  if (params.email) {
    const subjectMap = {
      CREATED: `[THAMJJ13] Support Ticket Logged — ${params.ticketId}`,
      REPLIED: `[THAMJJ13] New Response on Ticket ${params.ticketId}`,
      RESOLVED: `[THAMJJ13] Support Ticket Resolved — ${params.ticketId}`,
    };

    const bodyHtml =
      params.event === "CREATED"
        ? `<p style="font-size:14px;color:#3f3f46;">Hello <strong>${escapeHtml(params.username)}</strong>, your support ticket <strong>${escapeHtml(params.ticketId)}</strong> ("${escapeHtml(params.subject)}") has been received by our SOC desk.</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;white-space:pre-wrap;">${escapeHtml(params.description)}</div>`
        : params.event === "REPLIED"
        ? `<p style="font-size:14px;color:#3f3f46;">Hello <strong>${escapeHtml(params.username)}</strong>, <strong>${escapeHtml(params.replierName || "SOC Support")}</strong> replied to your ticket <strong>${escapeHtml(params.ticketId)}</strong>:</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;white-space:pre-wrap;">${escapeHtml(params.replyText || "")}</div>`
        : `<p style="font-size:14px;color:#3f3f46;">Hello <strong>${escapeHtml(params.username)}</strong>, your support ticket <strong>${escapeHtml(params.ticketId)}</strong> ("${escapeHtml(params.subject)}") has been marked as <strong>RESOLVED</strong>.</p>`;

    await sendMailViaResend({
      to: params.email,
      subject: subjectMap[params.event],
      text: `Ticket ${params.ticketId} (${params.subject}) — ${params.event}\n${params.replyText || params.description}`,
      html: wrapEmailLayout(`Support Ticket ${params.ticketId}`, "SOC SUPPORT DESK", bodyHtml),
      category: `TICKET_${params.event}`,
    });
  }

  if (params.event === "CREATED") {
    const admins = await getAdminNotificationRecipients();
    if (admins.length > 0) {
      await sendMailViaResend({
        to: admins,
        subject: `[SOC TICKET] ${params.ticketId}: ${params.subject}`,
        text: `Ticket ${params.ticketId} from ${params.username}:\n${params.description}`,
        html: wrapEmailLayout(
          `New Support Ticket: ${params.subject}`,
          "SOC SUPPORT ALERT",
          `<p style="font-size:13px;color:#3f3f46;"><strong>Cadet:</strong> ${escapeHtml(params.username)} (${escapeHtml(params.email || "N/A")})<br/><strong>Ticket ID:</strong> ${escapeHtml(params.ticketId)}</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:13px;white-space:pre-wrap;">${escapeHtml(params.description)}</div>`
        ),
        category: "ADMIN_TICKET_ALERT",
      });
    }
  }
}

export async function sendCertificateIssuedEmail(cert: Certificate, recipientEmail?: string) {
  if (!recipientEmail) return;
  return sendMailViaResend({
    to: recipientEmail,
    subject: `[THAMJJ13] Official Certificate Issued — ${cert.id}`,
    text: `Congratulations ${cert.studentName}!\n\nYou have earned an official THAMJJ13 Certificate for "${cert.courseTitle}".\nCertificate Serial: ${cert.id}\nIssued At: ${cert.issuedAt}\n\nVerify anytime on the THAMJJ13 Verification Gate.`,
    html: wrapEmailLayout(
      "Certificate of Ethical Achievement Issued",
      "ACADEMY CERTIFICATION LEDGER",
      `
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;">Congratulations <strong>${escapeHtml(cert.studentName)}</strong>!</p>
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;">Your official credential has been signed and recorded in the THAMJJ13 Turso verification registry:</p>
        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin:16px 0;font-size:13px;line-height:1.8;">
          <div><strong>Certificate Serial:</strong> <span style="font-family:monospace;">${escapeHtml(cert.id)}</span></div>
          <div><strong>Course:</strong> ${escapeHtml(cert.courseTitle)}</div>
          <div><strong>Issued By:</strong> ${escapeHtml(cert.issuedBy)}</div>
          <div><strong>Date:</strong> ${escapeHtml(cert.issuedAt)}</div>
        </div>
      `
    ),
    category: "CERTIFICATE_ISSUED",
  });
}

export async function sendNewsletterConfirmationEmail(email: string) {
  return sendMailViaResend({
    to: email,
    subject: "[THAMJJ13] Subscribed to Threat Intelligence Broadcasts",
    text: `You are now subscribed to THAMJJ13 Singapore-Bangladesh Threat Intelligence Advisories.\n\n— THAMJJ13 Security (no-reply@thamjj13.top)`,
    html: wrapEmailLayout(
      "Subscribed to Threat Intelligence Broadcast",
      "SECURITY ADVISORY NETWORK",
      `<p style="font-size:14px;line-height:1.6;color:#3f3f46;">Your email (<strong>${escapeHtml(email)}</strong>) is now enrolled in THAMJJ13 cyber security advisories, CTF announcements, and zero-day defense briefings.</p>`
    ),
    category: "NEWSLETTER_SUBSCRIBE",
  });
}
