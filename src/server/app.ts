import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import os from "os";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import {
  UserRole,
  Course,
  Certificate,
  ContactMessage,
  LiveChatSession,
  LiveChatMessage,
  VisitorLog,
  SupportTicket,
  SupportTicketReply,
  CyberEvent,
  ApiKeyConfig,
  FileVaultItem,
  SystemHealthMetrics,
  SecurityLog,
  Report,
  FIRDetails,
} from "../types";

import {
  ensureDatabaseInitialized,
  getTursoClient,
  getDbMode,
  getDbError,
  getSetting,
  setSetting,
  writeAuditLog,
  rowToUserProfile,
} from "./db";

import {
  attachCurrentUser,
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  isAdminRole,
  issueUserSession,
  revokeCurrentSession,
  createOtpChallenge,
  verifyOtpChallenge,
  getClientIp,
  rateLimit,
} from "./auth";

import {
  uploadToCloudinary,
  getPublicCloudinaryConfig,
  saveCloudinaryConfig,
  resolveCloudinaryCredentials,
} from "./cloudinary";

import {
  DEFAULT_SENDER_EMAIL,
  resolveResendConfig,
  getPublicResendConfig,
  saveResendConfig,
  getRecentMailLogs,
  sendMailViaResend,
  sendOtpVerificationEmail,
  sendReportSubmittedEmails,
  sendReportStatusUpdateEmail,
  sendRegistrationConfirmationEmail,
  sendAccountApprovalUpdateEmail,
  sendNewAdminProvisionedEmail,
  sendPasswordChangedEmail,
  sendContactSubmissionEmails,
  sendContactReplyEmail,
  sendSupportTicketEmails,
  sendCertificateIssuedEmail,
  sendNewsletterConfirmationEmail,
} from "./email";

dotenv.config();

export const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.set("trust proxy", 1);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(cookieParser());

// Production security headers (iframe-friendly for preview environments)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

// Ensure Turso schema & bootstrap are ready before serving any /api route
app.use("/api", async (_req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err: any) {
    console.error("CRITICAL TURSO DB INITIALIZATION ERROR:", err);
    res.status(500).json({
      error: "Database engine unavailable. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.",
    });
  }
});

app.use("/api", attachCurrentUser);

// Lazy Gemini AI helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Helper mappers for database rows
function rowToReport(r: any): Report {
  let firDetails: FIRDetails | undefined = undefined;
  if (r.fir_details_json) {
    try {
      firDetails = JSON.parse(String(r.fir_details_json));
    } catch {
      firDetails = undefined;
    }
  }
  return {
    id: String(r.id),
    trackingCode: r.tracking_code ? String(r.tracking_code) : undefined,
    fullName: String(r.full_name),
    email: String(r.email),
    phone: String(r.phone),
    address: String(r.address),
    incidentDateTime: String(r.incident_date_time),
    incidentLocation: String(r.incident_location),
    category: String(r.category),
    description: String(r.description),
    evidenceUrl: r.evidence_url ? String(r.evidence_url) : undefined,
    evidenceName: r.evidence_name ? String(r.evidence_name) : undefined,
    witnessInfo: r.witness_info ? String(r.witness_info) : undefined,
    status: String(r.status) as Report["status"],
    notes: r.notes ? String(r.notes) : undefined,
    firNumber: r.fir_number ? String(r.fir_number) : undefined,
    createdAt: String(r.created_at),
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    firDetails,
  };
}

function rowToCourse(r: any): Course {
  let lessons = [];
  let mcqTest = undefined;
  try {
    lessons = JSON.parse(String(r.lessons_json || "[]"));
  } catch {
    lessons = [];
  }
  if (r.mcq_test_json) {
    try {
      mcqTest = JSON.parse(String(r.mcq_test_json));
    } catch {
      mcqTest = undefined;
    }
  }
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description || ""),
    category: String(r.category || "Penetration Testing"),
    level: (r.level || "Intermediate") as Course["level"],
    thumbnail: String(r.thumbnail || ""),
    lessons,
    mcqTest,
  };
}

function rowToTicket(r: any): SupportTicket {
  let rawReplies: any[] = [];
  try {
    rawReplies = JSON.parse(String(r.replies_json || "[]"));
  } catch {
    rawReplies = [];
  }
  const replies: SupportTicketReply[] = rawReplies.map((rep) => ({
    id: String(rep.id),
    sender: String(rep.sender || rep.senderName || "Support"),
    senderName: String(rep.senderName || rep.sender || "Support"),
    senderRole: (rep.senderRole || UserRole.STUDENT) as UserRole,
    message: String(rep.message || rep.content || rep.text || ""),
    content: String(rep.content || rep.message || rep.text || ""),
    text: String(rep.text || rep.message || rep.content || ""),
    timestamp: String(rep.timestamp),
  }));
  const desc = String(r.description || "");
  return {
    id: String(r.id),
    userId: String(r.user_id),
    username: String(r.username),
    email: r.email ? String(r.email) : undefined,
    subject: String(r.subject),
    description: desc,
    message: desc,
    priority: (r.priority || "MEDIUM") as SupportTicket["priority"],
    category: (r.category || "Technical") as SupportTicket["category"],
    status: (r.status || "OPEN") as SupportTicket["status"],
    createdAt: String(r.created_at),
    replies,
  };
}

function rowToVaultItem(r: any): FileVaultItem {
  const name = String(r.name);
  const size = String(r.size);
  const mimeType = String(r.mime_type);
  const url = String(r.encrypted_url);
  const downloads = Number(r.downloads || 0);
  return {
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : undefined,
    name,
    fileName: name,
    size,
    fileSize: size,
    mimeType,
    fileType: mimeType,
    encryptedUrl: url,
    cloudinaryUrl: url,
    aesHash: String(r.aes_hash),
    uploadedBy: String(r.uploaded_by),
    role: String(r.role) as UserRole,
    uploadedAt: String(r.uploaded_at),
    downloads,
    downloadCount: downloads,
  };
}

// ============================================================================
// 1. HEALTH & SYSTEM TELEMETRY
// ============================================================================

app.get("/api/health", async (_req, res) => {
  const resendCfg = await resolveResendConfig();
  const cloudCfg = await resolveCloudinaryCredentials();
  res.json({
    ok: true,
    database: getDbMode(),
    databaseError: getDbError() || null,
    resendConfigured: resendCfg.apiKeyConfigured,
    senderEmail: resendCfg.fromEmail,
    cloudinaryConfigured: cloudCfg.configured,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/system-health", async (_req, res) => {
  const db = getTursoClient();
  const [chatsRes, backupsCount, resendCfg, cloudCfg] = await Promise.all([
    db.execute(`SELECT COUNT(*) as cnt FROM chat_sessions WHERE is_online = 1`),
    getSetting<number>("backups_count", 0),
    resolveResendConfig(),
    resolveCloudinaryCredentials(),
  ]);

  const totalMem = os.totalmem() || 1;
  const usedMem = totalMem - os.freemem();
  const memPct = Math.min(98, Math.max(8, Math.round((usedMem / totalMem) * 100)));
  const loadPct = Math.min(95, Math.max(4, Math.round((os.loadavg()[0] / Math.max(1, os.cpus().length)) * 100)));

  const upSec = Math.floor(process.uptime());
  const days = Math.floor(upSec / 86400);
  const hours = Math.floor((upSec % 86400) / 3600);
  const mins = Math.floor((upSec % 3600) / 60);

  const metrics: SystemHealthMetrics = {
    cpuUsage: loadPct,
    memoryUsage: memPct,
    diskFree: 92,
    activeConnections: Number(chatsRes.rows[0]?.cnt || 0) + 1,
    uptime: `${days}d ${hours}h ${mins}m`,
    databaseEngine: "Turso (LibSQL)",
    databaseStatus: getDbMode(),
    databaseError: getDbError(),
    resendStatus: resendCfg.apiKeyConfigured ? "CONNECTED" : "UNCONFIGURED",
    senderEmail: resendCfg.fromEmail || DEFAULT_SENDER_EMAIL,
    cloudinaryStatus: cloudCfg.configured ? "CONNECTED" : "UNCONFIGURED",
    backupsCount: backupsCount || 0,
  };

  res.json(metrics);
});

// ============================================================================
// 2. VISITOR ANALYTICS TRACKER
// ============================================================================

app.post(["/api/tracker/log", "/api/track-visitor"], async (req, res) => {
  try {
    const db = getTursoClient();
    const visitorData = req.body || {};
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    const now = new Date().toISOString();

    const browser =
      visitorData.browser ||
      (ua.includes("Firefox")
        ? "Firefox"
        : ua.includes("Edg")
        ? "Edge"
        : ua.includes("Chrome")
        ? "Chrome"
        : ua.includes("Safari")
        ? "Safari"
        : "Web Client");

    const detectedOs =
      visitorData.os ||
      (ua.includes("Win")
        ? "Windows"
        : ua.includes("Mac")
        ? "macOS"
        : ua.includes("Linux")
        ? "Linux"
        : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone")
        ? "iOS"
        : "System Node");

    const device =
      visitorData.device || (/Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop");

    const id = `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const currentPage = String(visitorData.currentPage || "/").slice(0, 120);
    const resolution = String(visitorData.resolution || "1920x1080").slice(0, 32);
    const language = String(visitorData.language || "en-US").slice(0, 32);
    const timezone = String(visitorData.timezone || "Asia/Dhaka").slice(0, 64);
    const referral = String(visitorData.referrer || visitorData.referral || "Direct").slice(0, 180);

    await db.execute({
      sql: `INSERT INTO visitor_logs (
        id, ip, country, city, browser, os, device, resolution, language,
        timezone, isp, visit_time, last_visit, referral, current_page,
        session_duration, returning_visitor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        ip,
        String(visitorData.country || "Gateway Node"),
        String(visitorData.city || "Edge POP"),
        browser,
        detectedOs,
        device,
        resolution,
        language,
        timezone,
        String(visitorData.isp || "Encrypted Transit"),
        now,
        now,
        referral,
        currentPage,
        Number(visitorData.sessionDuration || 5),
        visitorData.returningVisitor ? 1 : 0,
      ],
    });

    // Keep table trimmed to latest 500 entries
    await db.execute(
      `DELETE FROM visitor_logs WHERE id NOT IN (SELECT id FROM visitor_logs ORDER BY visit_time DESC LIMIT 500)`
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Visitor log error:", err);
    res.json({ success: false });
  }
});

app.get("/api/visitor-stats", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const rowsRes = await db.execute(
    `SELECT * FROM visitor_logs ORDER BY visit_time DESC LIMIT 100`
  );

  const logs: VisitorLog[] = rowsRes.rows.map((r: any) => ({
    id: String(r.id),
    ip: String(r.ip),
    country: String(r.country),
    city: String(r.city),
    browser: String(r.browser),
    os: String(r.os),
    device: String(r.device),
    resolution: String(r.resolution),
    language: String(r.language),
    timezone: String(r.timezone),
    isp: String(r.isp),
    visitTime: String(r.visit_time),
    lastVisit: String(r.last_visit),
    referral: String(r.referral),
    currentPage: String(r.current_page),
    sessionDuration: Number(r.session_duration || 5),
    returningVisitor: Boolean(Number(r.returning_visitor)),
  }));

  const countries = logs.reduce((acc: Record<string, number>, v) => {
    acc[v.country] = (acc[v.country] || 0) + 1;
    return acc;
  }, {});

  const devices = logs.reduce((acc: Record<string, number>, v) => {
    acc[v.device] = (acc[v.device] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalVisits: logs.length,
    countries,
    devices,
    recentVisitors: logs.slice(0, 25),
    logs,
  });
});

// ============================================================================
// 3. AUTHENTICATION, BOOTSTRAP, REAL MAIL+PASS + RESEND OTP
// ============================================================================

app.get("/api/auth/bootstrap-status", async (_req, res) => {
  const db = getTursoClient();
  const [adminCountRes, resendCfg] = await Promise.all([
    db.execute(`SELECT COUNT(*) as cnt FROM users WHERE role = 'SUPER_ADMIN'`),
    resolveResendConfig(),
  ]);
  const hasSuperAdmin = Number(adminCountRes.rows[0]?.cnt || 0) > 0;
  res.json({
    needsBootstrap: !hasSuperAdmin,
    resendConfigured: resendCfg.apiKeyConfigured,
    senderEmail: resendCfg.fromEmail || DEFAULT_SENDER_EMAIL,
  });
});

app.post(
  "/api/auth/bootstrap-request",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: "bootstrap_req" }),
  async (req, res) => {
    const db = getTursoClient();
    const adminCountRes = await db.execute(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'SUPER_ADMIN'`
    );
    if (Number(adminCountRes.rows[0]?.cnt || 0) > 0) {
      return res.status(403).json({
        error: "Super Administrator already exists. Sign in with your registered email and password.",
      });
    }

    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Admin password must be at least 8 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const challenge = await createOtpChallenge({
      email,
      purpose: "BOOTSTRAP_SETUP",
      metadata: { username, email, phone, passwordHash },
    });

    const mailResult = await sendOtpVerificationEmail({
      to: email,
      otp: challenge.otp,
      purpose: "BOOTSTRAP_SETUP",
      username,
    });

    if (!mailResult.delivered && !mailResult.simulated) {
      return res.status(502).json({
        error: `Failed to send verification email via Resend: ${mailResult.error}`,
      });
    }

    res.json({
      success: true,
      challengeId: challenge.challengeId,
      simulated: mailResult.simulated,
      message: mailResult.simulated
        ? "RESEND_API_KEY not yet set — verification OTP was printed to server logs for local setup."
        : `Verification OTP sent from ${DEFAULT_SENDER_EMAIL} to ${email}.`,
    });
  }
);

app.post(
  "/api/auth/bootstrap-confirm",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 15, keyPrefix: "bootstrap_confirm" }),
  async (req, res) => {
    const db = getTursoClient();
    const adminCountRes = await db.execute(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'SUPER_ADMIN'`
    );
    if (Number(adminCountRes.rows[0]?.cnt || 0) > 0) {
      return res.status(403).json({ error: "Super Administrator has already been initialized." });
    }

    const { challengeId, otp } = req.body || {};
    const verified = await verifyOtpChallenge({
      challengeId,
      purpose: "BOOTSTRAP_SETUP",
      otp,
    });

    if (verified.valid === false) {
      return res.status(401).json({ error: verified.error });
    }

    const { username, email, phone, passwordHash } = verified.metadata;
    const now = new Date().toISOString();
    const id = `admin-${crypto.randomUUID().slice(0, 8)}`;

    await db.execute({
      sql: `INSERT INTO users (
        id, username, email, password_hash, role, approved, email_verified,
        phone, address, profile_picture, login_history_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, '', '[]', ?, ?)`,
      args: [
        id,
        username,
        email,
        passwordHash,
        UserRole.SUPER_ADMIN,
        phone || "",
        "SLA Command HQ",
        now,
        now,
      ],
    });

    await writeAuditLog(username, `Provisioned initial Super Administrator (${email})`, getClientIp(req));
    await issueUserSession(req, res, id);

    const createdRes = await db.execute({
      sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
      args: [id],
    });
    res.json({
      success: true,
      user: rowToUserProfile(createdRes.rows[0]),
    });
  }
);

app.get("/api/auth/me", (req, res) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.currentUser });
});

app.post("/api/auth/logout", async (req, res) => {
  await revokeCurrentSession(req, res);
  res.json({ success: true, message: "Logged out securely." });
});

app.get(["/api/auth/username-check", "/api/auth/check-username"], async (req, res) => {
  const q = String(req.query.username || "").trim();
  if (!q) return res.json({ available: false, suggestions: [] });

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1`,
    args: [q.toLowerCase()],
  });

  const exists = existing.rows.length > 0;
  const suggestions = exists
    ? [`${q}_tham`, `${q}_sec`, `${q}_13`, `whitehat_${q}`]
    : [];

  res.json({ available: !exists, suggestions });
});

app.post(
  "/api/auth/register-request-otp",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "register_otp" }),
  async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const db = getTursoClient();
    const conflict = await db.execute({
      sql: `SELECT username, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`,
      args: [username.toLowerCase(), email],
    });

    if (conflict.rows.length > 0) {
      const row = conflict.rows[0];
      if (String(row.username).toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: "Username is already registered." });
      }
      return res.status(400).json({ error: "Email address is already registered." });
    }

    const challenge = await createOtpChallenge({
      email,
      purpose: "EMAIL_VERIFY",
      metadata: { username, email },
    });

    const mailResult = await sendOtpVerificationEmail({
      to: email,
      otp: challenge.otp,
      purpose: "EMAIL_VERIFY",
      username,
    });

    if (!mailResult.delivered && !mailResult.simulated) {
      return res.status(502).json({
        error: `Resend gateway failed to send verification code: ${mailResult.error}`,
      });
    }

    res.json({
      success: true,
      challengeId: challenge.challengeId,
      simulated: mailResult.simulated,
      message: mailResult.simulated
        ? "RESEND_API_KEY not set — verification code printed to server logs for local testing."
        : `6-digit verification code sent from ${DEFAULT_SENDER_EMAIL} to ${email}.`,
    });
  }
);

app.post(
  "/api/auth/register",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "register" }),
  async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const address = String(req.body?.address || "").trim();
    const password = String(req.body?.password || "");
    const challengeId = String(req.body?.challengeId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!challengeId || !otp) {
      return res.status(400).json({
        error: "Email OTP verification is required to complete Cadet registration.",
      });
    }

    const verifiedOtp = await verifyOtpChallenge({
      challengeId,
      purpose: "EMAIL_VERIFY",
      otp,
    });
    if (verifiedOtp.valid === false) {
      return res.status(401).json({ error: verifiedOtp.error });
    }
    if (verifiedOtp.email !== email) {
      return res.status(401).json({
        error: "Verification email mismatch. Please request a fresh OTP.",
      });
    }

    const db = getTursoClient();
    const conflict = await db.execute({
      sql: `SELECT username, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`,
      args: [username.toLowerCase(), email],
    });

    if (conflict.rows.length > 0) {
      const row = conflict.rows[0];
      if (String(row.username).toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: "Username is already registered." });
      }
      return res.status(400).json({ error: "Email address is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = `user-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (
        id, username, email, password_hash, role, approved, email_verified,
        phone, address, profile_picture, login_history_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, '', '[]', ?, ?)`,
      args: [id, username, email, passwordHash, UserRole.STUDENT, phone, address, now, now],
    });

    await writeAuditLog(username, `Verified email via OTP and submitted cadet registration (${email})`, getClientIp(req));

    sendRegistrationConfirmationEmail({
      username,
      email,
      approved: false,
    }).catch((err) => console.error("Registration email error:", err));

    const createdRes = await db.execute({
      sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
      args: [id],
    });

    res.status(201).json({
      success: true,
      message:
        "Email verified & registration submitted! A confirmation receipt was sent from no-reply@thamjj13.top. Our Security Board will approve your cadet clearance shortly.",
      user: rowToUserProfile(createdRes.rows[0]),
    });
  }
);

app.post(
  "/api/auth/login-step1",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, keyPrefix: "login_step1" }),
  async (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const db = getTursoClient();
    const userRes = await db.execute({
      sql: `SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1`,
      args: [cleanEmail],
    });

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const row = userRes.rows[0];
    const storedHash = String(row.password_hash || "");
    const passwordMatches = storedHash.startsWith("$2")
      ? await bcrypt.compare(password, storedHash)
      : false;

    if (!passwordMatches) {
      await writeAuditLog(
        String(row.username),
        `Failed login attempt (invalid password) for ${cleanEmail}`,
        getClientIp(req)
      );
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!Boolean(Number(row.approved))) {
      return res.status(403).json({
        error: "Clearance Pending: An administrator must approve your account before login.",
      });
    }

    const user = rowToUserProfile(row);
    const otpPurpose = isAdminRole(user.role) ? "ADMIN_LOGIN" : "LOGIN_2FA";

    // Both Admin & Cadet Portals require 2FA OTP dispatched via Resend (no-reply@thamjj13.top)
    const challenge = await createOtpChallenge({
      email: cleanEmail,
      purpose: otpPurpose,
      metadata: { userId: user.id, username: user.username, role: user.role },
    });

    const mailResult = await sendOtpVerificationEmail({
      to: cleanEmail,
      otp: challenge.otp,
      purpose: otpPurpose,
      username: user.username,
    });

    if (!mailResult.delivered && !mailResult.simulated) {
      return res.status(502).json({
        error: `Resend email gateway failed to dispatch OTP: ${mailResult.error}`,
      });
    }

    await writeAuditLog(
      user.username,
      `Password verified (${user.role}); 2FA OTP dispatched to ${cleanEmail}`,
      getClientIp(req)
    );

    return res.json({
      requiresDoubleOtp: true,
      requiresOtp: true,
      role: user.role,
      step: 1,
      tempId: challenge.challengeId,
      simulated: mailResult.simulated,
    });
  }
);

app.post(
  "/api/auth/login-resend-otp",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 8, keyPrefix: "resend_otp" }),
  async (req, res) => {
    const tempId = String(req.body?.tempId || "").trim();
    if (!tempId) {
      return res.status(400).json({ error: "Missing active login session identifier." });
    }

    const db = getTursoClient();
    const prev = await db.execute({
      sql: `SELECT * FROM otp_tokens WHERE id = ? AND purpose IN ('ADMIN_LOGIN', 'LOGIN_2FA') LIMIT 1`,
      args: [tempId],
    });

    if (prev.rows.length === 0) {
      return res.status(400).json({ error: "OTP session not found. Please sign in again." });
    }

    const email = String(prev.rows[0].email);
    const purpose = String(prev.rows[0].purpose) as "ADMIN_LOGIN" | "LOGIN_2FA";
    let metadata: any = {};
    try {
      metadata = JSON.parse(String(prev.rows[0].metadata_json || "{}"));
    } catch {
      metadata = {};
    }

    const challenge = await createOtpChallenge({
      email,
      purpose,
      metadata,
    });

    const mailResult = await sendOtpVerificationEmail({
      to: email,
      otp: challenge.otp,
      purpose,
      username: metadata.username,
    });

    if (!mailResult.delivered && !mailResult.simulated) {
      return res.status(502).json({ error: `Failed to resend OTP: ${mailResult.error}` });
    }

    res.json({
      success: true,
      tempId: challenge.challengeId,
      simulated: mailResult.simulated,
      message: `A fresh 6-digit OTP has been sent from ${DEFAULT_SENDER_EMAIL} to ${email}.`,
    });
  }
);

app.post(
  "/api/auth/login-step2",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, keyPrefix: "login_step2" }),
  async (req, res) => {
    const tempId = String(req.body?.tempId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    const db = getTursoClient();
    const tokenLookup = await db.execute({
      sql: `SELECT purpose FROM otp_tokens WHERE id = ? LIMIT 1`,
      args: [tempId],
    });
    const purpose =
      tokenLookup.rows.length > 0 && String(tokenLookup.rows[0].purpose) === "LOGIN_2FA"
        ? "LOGIN_2FA"
        : "ADMIN_LOGIN";

    const verified = await verifyOtpChallenge({
      challengeId: tempId,
      purpose,
      otp,
    });

    if (verified.valid === false) {
      return res.status(401).json({ error: verified.error });
    }

    const userRes = await db.execute({
      sql: `SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1`,
      args: [verified.email],
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Account not found." });
    }

    const user = rowToUserProfile(userRes.rows[0]);
    const ip = getClientIp(req);
    const log: SecurityLog = {
      id: `log-${Date.now()}`,
      userId: user.id,
      ip,
      action: isAdminRole(user.role)
        ? "Admin Console 2FA Verified Login"
        : "Cadet Portal 2FA Verified Login",
      timestamp: new Date().toISOString(),
      device: isAdminRole(user.role) ? "Authorized Admin Node" : "Cadet Web Terminal",
      browser: String(req.headers["user-agent"] || "Browser").slice(0, 64),
      status: "SUCCESS",
    };

    const nextHistory = [log, ...(user.loginHistory || [])].slice(0, 25);
    await db.execute({
      sql: `UPDATE users SET login_history_json = ?, email_verified = 1, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(nextHistory), new Date().toISOString(), user.id],
    });

    await writeAuditLog(
      user.username,
      `Authenticated into ${isAdminRole(user.role) ? "Admin Console" : "Cadet Portal"} via Resend 2FA OTP`,
      ip
    );
    await issueUserSession(req, res, user.id);

    res.json({ success: true, user: { ...user, loginHistory: nextHistory } });
  }
);

// Password Reset Flow (Resend OTP)
app.post(
  "/api/auth/reset-password-request",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "pwd_reset_req" }),
  async (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const db = getTursoClient();
    const userRes = await db.execute({
      sql: `SELECT id, username, email FROM users WHERE LOWER(email) = ? LIMIT 1`,
      args: [cleanEmail],
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "No account found with that email address." });
    }

    const userRow = userRes.rows[0];
    const challenge = await createOtpChallenge({
      email: cleanEmail,
      purpose: "PASSWORD_RESET",
      metadata: { userId: String(userRow.id) },
    });

    const mailResult = await sendOtpVerificationEmail({
      to: cleanEmail,
      otp: challenge.otp,
      purpose: "PASSWORD_RESET",
      username: String(userRow.username),
    });

    if (!mailResult.delivered && !mailResult.simulated) {
      return res.status(502).json({
        error: `Failed to send password reset email: ${mailResult.error}`,
      });
    }

    res.json({
      success: true,
      tempId: challenge.challengeId,
      simulated: mailResult.simulated,
      message: `A 6-digit password reset OTP has been sent from ${DEFAULT_SENDER_EMAIL} to ${cleanEmail}.`,
    });
  }
);

app.post(
  "/api/auth/reset-password-verify-otp",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "pwd_reset_verify" }),
  async (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const tempId = String(req.body?.tempId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if ((!cleanEmail && !tempId) || !otp) {
      return res.status(400).json({ error: "OTP code is required." });
    }

    const verified = await verifyOtpChallenge({
      challengeId: tempId || undefined,
      email: cleanEmail || undefined,
      purpose: "PASSWORD_RESET",
      otp,
      consume: false,
    });

    if (verified.valid === false) {
      return res.status(401).json({ error: verified.error });
    }

    res.json({
      success: true,
      message: "OTP verified. Enter your new password below.",
    });
  }
);

app.post(
  "/api/auth/reset-password-confirm",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "pwd_reset_confirm" }),
  async (req, res) => {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const tempId = String(req.body?.tempId || "").trim();
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if ((!cleanEmail && !tempId) || !otp || !newPassword) {
      return res.status(400).json({ error: "OTP and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const verified = await verifyOtpChallenge({
      challengeId: tempId || undefined,
      email: cleanEmail || undefined,
      purpose: "PASSWORD_RESET",
      otp,
      consume: true,
    });

    if (verified.valid === false) {
      return res.status(401).json({ error: verified.error });
    }

    const db = getTursoClient();
    const userRes = await db.execute({
      sql: `SELECT id, username, email FROM users WHERE LOWER(email) = ? LIMIT 1`,
      args: [verified.email],
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    const userRow = userRes.rows[0];
    const newHash = await bcrypt.hash(newPassword, 12);

    await db.execute({
      sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      args: [newHash, new Date().toISOString(), String(userRow.id)],
    });

    // Revoke all previous sessions on password reset
    await db.execute({
      sql: `UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?`,
      args: [String(userRow.id)],
    });

    await writeAuditLog(
      String(userRow.username),
      "Completed password reset via Resend OTP verification",
      getClientIp(req)
    );

    sendPasswordChangedEmail({
      username: String(userRow.username),
      email: String(userRow.email),
    }).catch((err) => console.error(err));

    res.json({
      success: true,
      message: "Password updated successfully. You may now sign in with your new credentials.",
    });
  }
);

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const db = getTursoClient();
  const userRes = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [req.currentUser!.id],
  });
  if (userRes.rows.length === 0) {
    return res.status(404).json({ error: "User not found." });
  }

  const row = userRes.rows[0];
  const valid = await bcrypt.compare(currentPassword, String(row.password_hash || ""));
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.execute({
    sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
    args: [newHash, new Date().toISOString(), req.currentUser!.id],
  });

  await writeAuditLog(req.currentUser!.username, "Changed account password", getClientIp(req));
  sendPasswordChangedEmail({
    username: req.currentUser!.username,
    email: req.currentUser!.email,
  }).catch((err) => console.error(err));

  res.json({ success: true, message: "Password updated securely." });
});

// ============================================================================
// 4. USER & ADMIN MANAGEMENT
// ============================================================================

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM users ORDER BY created_at DESC`);
  res.json(result.rows.map(rowToUserProfile));
});

app.post(["/api/admin/users/:id/approve", "/api/admin/users/:id/role"], requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { approved, role } = req.body || {};
  const isApproveEndpoint = req.path.endsWith("/approve");

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const prev = existing.rows[0];
  if (
    String(prev.role) === UserRole.SUPER_ADMIN &&
    req.currentUser!.role !== UserRole.SUPER_ADMIN
  ) {
    return res.status(403).json({ error: "Only Super Administrators can modify Super Admin accounts." });
  }

  const nextApproved =
    approved !== undefined
      ? approved
        ? 1
        : 0
      : isApproveEndpoint
      ? 1
      : Number(prev.approved);
  const nextRole = role || String(prev.role);

  await db.execute({
    sql: `UPDATE users SET approved = ?, role = ?, updated_at = ? WHERE id = ?`,
    args: [nextApproved, nextRole, new Date().toISOString(), id],
  });

  await writeAuditLog(
    req.currentUser!.username,
    `Updated clearance for ${prev.username}: approved=${Boolean(nextApproved)}, role=${nextRole}`,
    getClientIp(req)
  );

  // Notify user via Resend
  sendAccountApprovalUpdateEmail({
    username: String(prev.username),
    email: String(prev.email),
    approved: Boolean(nextApproved),
    role: nextRole,
  }).catch((err) => console.error(err));

  const updated = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });
  res.json({ success: true, user: rowToUserProfile(updated.rows[0]) });
});

app.post("/api/admin/users/create-admin", requireSuperAdmin, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = (req.body?.role as UserRole) || UserRole.SECONDARY_ADMIN;
  const phone = String(req.body?.phone || "").trim();
  const address = String(req.body?.address || "Command Operations Node").trim();
  const rawPassword =
    String(req.body?.password || "").trim() ||
    `Tham#${crypto.randomBytes(5).toString("hex")}`;

  if (!username || !email) {
    return res.status(400).json({ error: "Username and email are required." });
  }
  if (rawPassword.length < 8) {
    return res.status(400).json({ error: "Admin password must be at least 8 characters." });
  }

  const db = getTursoClient();
  const conflict = await db.execute({
    sql: `SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1`,
    args: [email, username.toLowerCase()],
  });
  if (conflict.rows.length > 0) {
    return res.status(400).json({ error: "Username or email is already in use." });
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const id = `admin-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO users (
      id, username, email, password_hash, role, approved, email_verified,
      phone, address, profile_picture, login_history_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, '', '[]', ?, ?)`,
    args: [id, username, email, passwordHash, role, phone, address, now, now],
  });

  await writeAuditLog(
    req.currentUser!.username,
    `Created administrative user ${username} (${email}) with role ${role}`,
    getClientIp(req)
  );

  sendNewAdminProvisionedEmail({
    username,
    email,
    role,
    temporaryPassword: rawPassword,
  }).catch((err) => console.error(err));

  const created = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  res.status(201).json({
    success: true,
    user: rowToUserProfile(created.rows[0]),
  });
});

app.delete("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.currentUser!.id) {
    return res.status(400).json({ error: "You cannot delete your own active Super Admin account." });
  }
  const db = getTursoClient();
  await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [id] });
  await db.execute({ sql: `UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?`, args: [id] });
  await writeAuditLog(req.currentUser!.username, `Deleted user account ${id}`, getClientIp(req));
  res.json({ success: true });
});

app.post(["/api/users/me/update", "/api/admin/users/update"], requireAuth, async (req, res) => {
  const targetUserId =
    isAdminRole(req.currentUser!.role) && req.body?.userId
      ? String(req.body.userId)
      : req.currentUser!.id;

  const username = req.body?.username ? String(req.body.username).trim() : undefined;
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : undefined;
  const phone = req.body?.phone !== undefined ? String(req.body.phone).trim() : undefined;
  const rawAddress = req.body?.address !== undefined ? req.body.address : req.body?.bio;
  const address = rawAddress !== undefined ? String(rawAddress).trim() : undefined;

  const db = getTursoClient();
  const existingRes = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [targetUserId],
  });
  if (existingRes.rows.length === 0) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const prev = existingRes.rows[0];
  const nextUsername = username || String(prev.username);
  const nextEmail = email || String(prev.email);
  const nextPhone = phone !== undefined ? phone : String(prev.phone || "");
  const nextAddress = address !== undefined ? address : String(prev.address || "");

  const dup = await db.execute({
    sql: `SELECT id FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ? LIMIT 1`,
    args: [nextUsername.toLowerCase(), nextEmail.toLowerCase(), targetUserId],
  });
  if (dup.rows.length > 0) {
    return res.status(400).json({ error: "Username or email is already used by another account." });
  }

  await db.execute({
    sql: `UPDATE users SET username = ?, email = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?`,
    args: [nextUsername, nextEmail, nextPhone, nextAddress, new Date().toISOString(), targetUserId],
  });

  const updated = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [targetUserId],
  });
  res.json({ success: true, user: rowToUserProfile(updated.rows[0]) });
});

app.post(["/api/users/me/avatar", "/api/admin/users/avatar"], requireAuth, async (req, res) => {
  const targetUserId =
    isAdminRole(req.currentUser!.role) && req.body?.userId
      ? String(req.body.userId)
      : req.currentUser!.id;

  const fileBase64 = String(req.body?.fileBase64 || req.body?.imageBase64 || "");
  const fileName = String(req.body?.fileName || "avatar.png");

  if (!fileBase64) {
    return res.status(400).json({ error: "Image payload is required." });
  }

  try {
    const uploaded = await uploadToCloudinary({
      fileData: fileBase64,
      fileName,
      folder: "thamjj13/avatars",
      resourceType: "image",
    });

    const db = getTursoClient();
    await db.execute({
      sql: `UPDATE users SET profile_picture = ?, updated_at = ? WHERE id = ?`,
      args: [uploaded.url, new Date().toISOString(), targetUserId],
    });

    const updated = await db.execute({
      sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
      args: [targetUserId],
    });
    res.json({
      success: true,
      user: rowToUserProfile(updated.rows[0]),
      url: uploaded.url,
      avatarUrl: uploaded.url,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to upload avatar to Cloudinary." });
  }
});

// ============================================================================
// 5. UNIFIED CLOUDINARY MEDIA UPLOAD ENDPOINT
// ============================================================================

app.post(
  "/api/upload",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 40, keyPrefix: "cloudinary_upload" }),
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const folder = String(req.body?.folder || "thamjj13/assets");
      const resourceType = (req.body?.resourceType || "auto") as "image" | "video" | "raw" | "auto";

      if (req.file) {
        const result = await uploadToCloudinary({
          fileData: req.file.buffer,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          folder,
          resourceType,
        });
        return res.json({ success: true, ...result });
      }

      const fileBase64 = String(req.body?.fileBase64 || "");
      const fileName = String(req.body?.fileName || "upload.bin");
      const mimeType = String(req.body?.mimeType || "application/octet-stream");

      if (!fileBase64) {
        return res.status(400).json({ error: "No file provided for upload." });
      }

      const result = await uploadToCloudinary({
        fileData: fileBase64,
        fileName,
        mimeType,
        folder,
        resourceType,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("Cloudinary upload endpoint error:", err);
      res.status(500).json({ error: err?.message || "Media upload failed." });
    }
  }
);

// ============================================================================
// 6. CASE REPORTS & CRYPTOGRAPHIC FIR SYSTEM (TURSO + CLOUDINARY + RESEND)
// ============================================================================

app.post(
  "/api/reports",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "submit_report" }),
  async (req, res) => {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const address = String(req.body?.address || "Not specified").trim();
    const incidentDateTime = String(req.body?.incidentDateTime || new Date().toISOString()).trim();
    const incidentLocation = String(req.body?.incidentLocation || "Online / Network").trim();
    const category = String(req.body?.category || "Cyber Incident").trim();
    const description = String(req.body?.description || "").trim();
    const witnessInfo = String(req.body?.witnessInfo || "").trim();
    const rawEvidenceUrl = String(req.body?.evidenceUrl || "").trim();
    const evidenceName = String(req.body?.evidenceName || "").trim();

    if (!fullName || !email || !phone || !description || !category) {
      return res.status(400).json({
        error: "Full name, email, phone, category, and incident description are required.",
      });
    }

    const db = getTursoClient();

    // Prevent accidental duplicate submission
    const dupCheck = await db.execute({
      sql: `SELECT id FROM reports WHERE LOWER(email) = ? AND incident_date_time = ? AND LOWER(description) = ? LIMIT 1`,
      args: [email, incidentDateTime, description.toLowerCase()],
    });
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({
        error: `Duplicate report detected: This incident was already logged under ID ${dupCheck.rows[0].id}.`,
      });
    }

    // Upload evidence to Cloudinary if base64 data URI was attached
    let finalEvidenceUrl = rawEvidenceUrl;
    let evidencePublicId = "";
    if (rawEvidenceUrl && rawEvidenceUrl.startsWith("data:")) {
      try {
        const uploaded = await uploadToCloudinary({
          fileData: rawEvidenceUrl,
          fileName: evidenceName || "evidence",
          folder: "thamjj13/evidence",
          resourceType: "auto",
        });
        finalEvidenceUrl = uploaded.url;
        evidencePublicId = uploaded.publicId;
      } catch (err: any) {
        console.error("Evidence Cloudinary upload error:", err);
        return res.status(500).json({
          error: err?.message || "Failed to upload evidentiary attachment to Cloudinary.",
        });
      }
    }

    const reportId = `REP-${crypto.randomInt(100000, 999999)}`;
    const trackingCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO reports (
        id, tracking_code, full_name, email, phone, address, incident_date_time,
        incident_location, category, description, evidence_url, evidence_public_id,
        evidence_name, witness_info, status, notes, fir_number, fir_details_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', '', '', '', ?, ?)`,
      args: [
        reportId,
        trackingCode,
        fullName,
        email,
        phone,
        address,
        incidentDateTime,
        incidentLocation,
        category,
        description,
        finalEvidenceUrl,
        evidencePublicId,
        evidenceName,
        witnessInfo,
        now,
        now,
      ],
    });

    await writeAuditLog(
      fullName,
      `Submitted Incident Report ${reportId} [${category}]`,
      getClientIp(req)
    );

    const createdReport: Report = {
      id: reportId,
      trackingCode,
      fullName,
      email,
      phone,
      address,
      incidentDateTime,
      incidentLocation,
      category,
      description,
      evidenceUrl: finalEvidenceUrl || undefined,
      evidenceName: evidenceName || undefined,
      witnessInfo: witnessInfo || undefined,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    // Send confirmation mail to complainant + alert mail to admins via Resend (no-reply@thamjj13.top)
    sendReportSubmittedEmails(createdReport).catch((err) =>
      console.error("Failed sending report confirmation emails:", err)
    );

    res.status(201).json(createdReport);
  }
);

// Public Case Report & FIR Tracking Lookup (by Report ID + Email)
app.post(
  "/api/reports/track",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 25, keyPrefix: "track_report" }),
  async (req, res) => {
    const reportId = String(req.body?.reportId || "").trim().toUpperCase();
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!reportId || !email) {
      return res.status(400).json({ error: "Both Case Reference ID and Email are required." });
    }

    const db = getTursoClient();
    const found = await db.execute({
      sql: `SELECT * FROM reports WHERE UPPER(id) = ? AND LOWER(email) = ? LIMIT 1`,
      args: [reportId, email],
    });

    if (found.rows.length === 0) {
      return res.status(404).json({
        error: "No matching report found. Verify your Case Reference ID (e.g. REP-123456) and email address.",
      });
    }

    res.json({ success: true, report: rowToReport(found.rows[0]) });
  }
);

app.get("/api/reports/my", requireAuth, async (req, res) => {
  const db = getTursoClient();
  const user = req.currentUser!;
  const result = await db.execute({
    sql: `SELECT * FROM reports WHERE LOWER(email) = ? OR (phone != '' AND phone = ?) ORDER BY created_at DESC`,
    args: [user.email.toLowerCase(), user.phone],
  });
  res.json(result.rows.map(rowToReport));
});

app.get("/api/reports", requireAuth, async (req, res) => {
  const db = getTursoClient();
  if (isAdminRole(req.currentUser!.role)) {
    const result = await db.execute(`SELECT * FROM reports ORDER BY created_at DESC`);
    return res.json(result.rows.map(rowToReport));
  }
  const user = req.currentUser!;
  const result = await db.execute({
    sql: `SELECT * FROM reports WHERE LOWER(email) = ? OR (phone != '' AND phone = ?) ORDER BY created_at DESC`,
    args: [user.email.toLowerCase(), user.phone],
  });
  res.json(result.rows.map(rowToReport));
});

app.get("/api/reports/:id", requireAdmin, async (req, res) => {
  const db = getTursoClient();
  const result = await db.execute({
    sql: `SELECT * FROM reports WHERE id = ? LIMIT 1`,
    args: [req.params.id],
  });
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Report not found." });
  }
  res.json(rowToReport(result.rows[0]));
});

app.patch(["/api/reports/:id", "/api/reports/:id/status"], requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, notes, firDetails } = req.body || {};

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM reports WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Report not found." });
  }

  const prev = rowToReport(existing.rows[0]);
  const nextStatus = (status || prev.status) as Report["status"];
  const nextNotes = notes !== undefined ? String(notes) : prev.notes || "";
  const nextFirDetails: FIRDetails | undefined = firDetails || prev.firDetails;
  const nextFirNumber = firDetails?.firNumber || prev.firNumber || "";
  const now = new Date().toISOString();

  await db.execute({
    sql: `UPDATE reports
          SET status = ?, notes = ?, fir_number = ?, fir_details_json = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      nextStatus,
      nextNotes,
      nextFirNumber,
      nextFirDetails ? JSON.stringify(nextFirDetails) : "",
      now,
      id,
    ],
  });

  const updatedRes = await db.execute({
    sql: `SELECT * FROM reports WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const updatedReport = rowToReport(updatedRes.rows[0]);

  await writeAuditLog(
    req.currentUser!.username,
    `Updated Case Report ${id}: status ${prev.status} -> ${nextStatus}${nextFirNumber ? ` (FIR: ${nextFirNumber})` : ""}`,
    getClientIp(req)
  );

  // Send Resend update email whenever status changes, FIR is issued, or investigator notes change
  if (
    nextStatus !== prev.status ||
    Boolean(firDetails) ||
    (notes !== undefined && nextNotes !== (prev.notes || ""))
  ) {
    sendReportStatusUpdateEmail(updatedReport, prev.status).catch((err) =>
      console.error("Failed sending report update email:", err)
    );
  }

  res.json(updatedReport);
});

app.post("/api/reports/:id/fir", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const rawFir = req.body?.firDetails || req.body || {};

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM reports WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Report not found." });
  }

  const prev = rowToReport(existing.rows[0]);
  const firNumber =
    rawFir.firNumber || prev.firNumber || `FIR-THAM-${crypto.randomInt(100000, 999999)}`;
  const now = new Date().toISOString();
  const firDetails: FIRDetails = {
    firNumber,
    policeStation: String(rawFir.policeStation || "Marina Bay Cyber Command HQ"),
    district: String(rawFir.district || "Singapore Zone 1"),
    officerDetails: String(rawFir.officerDetails || req.currentUser!.username),
    summary: String(rawFir.summary || prev.notes || ""),
    finalizedAt: now,
    verificationCode: String(
      rawFir.verificationCode || `THAM-FIR-${crypto.randomInt(100000, 999999)}`
    ),
    signature: String(
      rawFir.signature || `SIGNED-${req.currentUser!.username.toUpperCase()}-SHA256`
    ),
  };

  await db.execute({
    sql: `UPDATE reports
          SET status = 'APPROVED', fir_number = ?, fir_details_json = ?, notes = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      firNumber,
      JSON.stringify(firDetails),
      firDetails.summary || prev.notes || "",
      now,
      id,
    ],
  });

  const updatedRes = await db.execute({
    sql: `SELECT * FROM reports WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const updatedReport = rowToReport(updatedRes.rows[0]);

  await writeAuditLog(
    req.currentUser!.username,
    `Signed Official Cryptographic FIR ${firNumber} for Case ${id}`,
    getClientIp(req)
  );

  sendReportStatusUpdateEmail(updatedReport, prev.status).catch((err) =>
    console.error("Failed sending FIR signed email:", err)
  );

  res.json({ success: true, report: updatedReport });
});

app.delete("/api/reports/:id", requireAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({ sql: `DELETE FROM reports WHERE id = ?`, args: [req.params.id] });
  await writeAuditLog(
    req.currentUser!.username,
    `Deleted Case Report ${req.params.id}`,
    getClientIp(req)
  );
  res.json({ success: true });
});

// ============================================================================
// 7. COURSES, VIDEO ACTIONS, ASSIGNMENTS, MCQ EXAM & CERTIFICATES
// ============================================================================

app.get("/api/courses", async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM courses ORDER BY created_at ASC`);
  res.json(result.rows.map(rowToCourse));
});

app.post(["/api/courses", "/api/admin/courses"], requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "Course title is required." });

  const description = String(req.body?.description || "").trim();
  const category = String(req.body?.category || "Penetration Testing").trim();
  const level = String(req.body?.level || "Intermediate").trim();
  let thumbnail =
    String(req.body?.thumbnail || "").trim() ||
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800";

  if (thumbnail.startsWith("data:")) {
    const uploaded = await uploadToCloudinary({
      fileData: thumbnail,
      fileName: "course_thumbnail",
      folder: "thamjj13/courses",
      resourceType: "image",
    });
    thumbnail = uploaded.url;
  }

  const mcqTest = req.body?.mcqTest || undefined;
  const id = `course-${Date.now()}`;
  const now = new Date().toISOString();

  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO courses (id, title, description, category, level, thumbnail, lessons_json, mcq_test_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
    args: [id, title, description, category, level, thumbnail, mcqTest ? JSON.stringify(mcqTest) : "", now, now],
  });

  await writeAuditLog(req.currentUser!.username, `Created course: ${title}`, getClientIp(req));
  const created = await db.execute({ sql: `SELECT * FROM courses WHERE id = ?`, args: [id] });
  res.status(201).json({ success: true, course: rowToCourse(created.rows[0]) });
});

app.put("/api/courses/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const db = getTursoClient();
  const existing = await db.execute({ sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`, args: [id] });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Course not found." });

  const prev = rowToCourse(existing.rows[0]);
  let thumbnail = req.body?.thumbnail !== undefined ? String(req.body.thumbnail) : prev.thumbnail;
  if (thumbnail.startsWith("data:")) {
    const uploaded = await uploadToCloudinary({
      fileData: thumbnail,
      fileName: "course_thumbnail",
      folder: "thamjj13/courses",
      resourceType: "image",
    });
    thumbnail = uploaded.url;
  }

  const nextMcq = req.body?.mcqTest !== undefined ? req.body.mcqTest : prev.mcqTest;

  await db.execute({
    sql: `UPDATE courses
          SET title = ?, description = ?, category = ?, level = ?, thumbnail = ?, mcq_test_json = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      req.body?.title !== undefined ? String(req.body.title) : prev.title,
      req.body?.description !== undefined ? String(req.body.description) : prev.description,
      req.body?.category !== undefined ? String(req.body.category) : prev.category,
      req.body?.level !== undefined ? String(req.body.level) : prev.level,
      thumbnail,
      nextMcq ? JSON.stringify(nextMcq) : "",
      new Date().toISOString(),
      id,
    ],
  });

  const updated = await db.execute({ sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`, args: [id] });
  res.json({ success: true, course: rowToCourse(updated.rows[0]) });
});

app.delete(["/api/courses/:id", "/api/admin/courses/:id"], requireAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({ sql: `DELETE FROM courses WHERE id = ?`, args: [req.params.id] });
  await writeAuditLog(req.currentUser!.username, `Deleted course ${req.params.id}`, getClientIp(req));
  res.json({ success: true });
});

app.post(["/api/courses/:courseId/lessons", "/api/admin/courses/:courseId/lessons"], requireAdmin, async (req, res) => {
  const { courseId } = req.params;
  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`,
    args: [courseId],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Course not found." });

  const course = rowToCourse(existing.rows[0]);
  const { title, description, videoTitle, videoDuration, duration, thumbnail, pdfName } = req.body || {};
  let videoUrl = String(req.body?.videoUrl || "").trim();
  let pdfUrl = String(req.body?.pdfUrl || "").trim();

  if (videoUrl.startsWith("data:")) {
    const up = await uploadToCloudinary({
      fileData: videoUrl,
      fileName: videoTitle || "lesson_video",
      folder: "thamjj13/lessons",
      resourceType: "video",
    });
    videoUrl = up.url;
  }
  if (pdfUrl.startsWith("data:")) {
    const up = await uploadToCloudinary({
      fileData: pdfUrl,
      fileName: pdfName || "lesson_notes.pdf",
      folder: "thamjj13/lessons",
      resourceType: "auto",
    });
    pdfUrl = up.url;
  }

  const newLesson = {
    id: `lesson-${Date.now()}`,
    title: String(title || "New Lesson Module"),
    description: String(description || ""),
    pdfUrl: pdfUrl || undefined,
    pdfName: pdfName || undefined,
    assignments: [],
    video: videoUrl
      ? {
          id: `vid-${Date.now()}`,
          title: String(videoTitle || title || "Lesson Video"),
          videoUrl,
          thumbnail:
            String(thumbnail || "") ||
            "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800",
          duration: String(videoDuration || duration || "08:00"),
          views: 0,
          likes: 0,
          shares: 0,
          comments: [],
          likedBy: [],
          viewedBy: [],
        }
      : undefined,
  };

  course.lessons.push(newLesson);
  await db.execute({
    sql: `UPDATE courses SET lessons_json = ?, updated_at = ? WHERE id = ?`,
    args: [JSON.stringify(course.lessons), new Date().toISOString(), courseId],
  });

  res.status(201).json({ success: true, lesson: newLesson });
});

app.delete("/api/courses/:courseId/lessons/:lessonId", requireAdmin, async (req, res) => {
  const { courseId, lessonId } = req.params;
  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`,
    args: [courseId],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Course not found." });

  const course = rowToCourse(existing.rows[0]);
  course.lessons = course.lessons.filter((l) => l.id !== lessonId);
  await db.execute({
    sql: `UPDATE courses SET lessons_json = ?, updated_at = ? WHERE id = ?`,
    args: [JSON.stringify(course.lessons), new Date().toISOString(), courseId],
  });
  res.json({ success: true });
});

app.post("/api/courses/video/:videoId/action", async (req, res) => {
  const { videoId } = req.params;
  const { type, commentText, author, commentId } = req.body || {};

  const db = getTursoClient();
  const allCoursesRes = await db.execute(`SELECT * FROM courses`);

  let targetCourse: Course | null = null;
  let foundVideo: any = null;

  for (const row of allCoursesRes.rows) {
    const c = rowToCourse(row);
    for (const l of c.lessons) {
      if (l.video && l.video.id === videoId) {
        targetCourse = c;
        foundVideo = l.video;
        break;
      }
    }
    if (foundVideo) break;
  }

  if (!targetCourse || !foundVideo) {
    return res.status(404).json({ error: "Training video asset not found." });
  }

  if (!foundVideo.likedBy) foundVideo.likedBy = [];
  if (!foundVideo.viewedBy) foundVideo.viewedBy = [];
  if (!foundVideo.comments) foundVideo.comments = [];

  const callerId = req.currentUser?.id || String(req.body?.userId || `anon-${getClientIp(req)}`);
  const callerRole = req.currentUser?.role || UserRole.STUDENT;
  const callerIsAdmin = Boolean(req.currentUser && isAdminRole(req.currentUser.role));

  if (type === "view") {
    if (!foundVideo.viewedBy.includes(callerId)) {
      foundVideo.viewedBy.push(callerId);
      foundVideo.views = (foundVideo.views || 0) + 1;
    }
  } else if (type === "like") {
    if (foundVideo.likedBy.includes(callerId)) {
      foundVideo.likedBy = foundVideo.likedBy.filter((id: string) => id !== callerId);
      foundVideo.likes = Math.max(0, (foundVideo.likes || 1) - 1);
    } else {
      foundVideo.likedBy.push(callerId);
      foundVideo.likes = (foundVideo.likes || 0) + 1;
    }
  } else if (type === "share") {
    foundVideo.shares = (foundVideo.shares || 0) + 1;
  } else if (type === "comment" && commentText) {
    foundVideo.comments.unshift({
      id: `comm-${Date.now()}`,
      authorId: callerId,
      author: req.currentUser?.username || String(author || "Cadet"),
      authorRole: callerRole,
      avatar:
        req.currentUser?.profilePicture ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      content: String(commentText).slice(0, 2000),
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replies: [],
      pinned: false,
      hidden: false,
    });
  } else if (type === "edit-comment" && commentId && commentText) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (comment.authorId === callerId || callerIsAdmin) {
        comment.content = String(commentText).slice(0, 2000);
      } else {
        return res.status(403).json({ error: "Unauthorized to edit this comment." });
      }
    }
  } else if (type === "delete-comment" && commentId) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (comment.authorId === callerId || callerIsAdmin) {
        foundVideo.comments = foundVideo.comments.filter((c: any) => c.id !== commentId);
      } else {
        return res.status(403).json({ error: "Unauthorized to delete this comment." });
      }
    }
  } else if (type === "reply-comment" && commentId && commentText) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (!comment.replies) comment.replies = [];
      comment.replies.push({
        id: `reply-${Date.now()}`,
        authorId: callerId,
        author: req.currentUser?.username || String(author || "Cadet"),
        authorRole: callerRole,
        avatar:
          req.currentUser?.profilePicture ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        content: String(commentText).slice(0, 2000),
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        replies: [],
      });
    }
  } else if (type === "like-comment" && commentId) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (!comment.likedBy) comment.likedBy = [];
      if (comment.likedBy.includes(callerId)) {
        comment.likedBy = comment.likedBy.filter((id: string) => id !== callerId);
        comment.likes = Math.max(0, (comment.likes || 1) - 1);
      } else {
        comment.likedBy.push(callerId);
        comment.likes = (comment.likes || 0) + 1;
      }
    }
  } else if (type === "pin-comment" && commentId) {
    if (!callerIsAdmin) return res.status(403).json({ error: "Only admins can pin comments." });
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      comment.pinned = !comment.pinned;
      foundVideo.comments.sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }
  } else if (type === "hide-comment" && commentId) {
    if (!callerIsAdmin) return res.status(403).json({ error: "Only admins can moderate comments." });
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      comment.hidden = !comment.hidden;
    }
  }

  await db.execute({
    sql: `UPDATE courses SET lessons_json = ?, updated_at = ? WHERE id = ?`,
    args: [JSON.stringify(targetCourse.lessons), new Date().toISOString(), targetCourse.id],
  });

  res.json({ success: true, video: foundVideo });
});

app.post("/api/courses/:courseId/lessons/:lessonId/assignment", async (req, res) => {
  const { courseId, lessonId } = req.params;
  const { fileBase64, fileName } = req.body || {};

  if (!fileBase64) {
    return res.status(400).json({ error: "Assignment file data is required." });
  }

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`,
    args: [courseId],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Course not found." });

  const course = rowToCourse(existing.rows[0]);
  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) return res.status(404).json({ error: "Lesson not found." });

  try {
    const uploaded = await uploadToCloudinary({
      fileData: String(fileBase64),
      fileName: String(fileName || "assignment_submission"),
      folder: "thamjj13/assignments",
      resourceType: "auto",
    });

    if (!lesson.assignments) lesson.assignments = [];
    const submitterName = req.currentUser?.username || String(req.body?.userId || "Cadet");
    const newSubmission = {
      id: `sub-${Date.now()}`,
      userId: req.currentUser?.id || String(req.body?.userId || "guest"),
      studentName: submitterName,
      title: `${lesson.title} — Lab Submission`,
      description: `Submitted by ${submitterName}`,
      submittedUrl: uploaded.url,
      submittedAt: new Date().toISOString(),
      grade: "PENDING REVIEW",
    };

    lesson.assignments.push(newSubmission);
    await db.execute({
      sql: `UPDATE courses SET lessons_json = ?, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(course.lessons), new Date().toISOString(), courseId],
    });

    res.json({
      success: true,
      message: "Assignment uploaded securely to Cloudinary storage.",
      submission: newSubmission,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Assignment upload failed." });
  }
});

app.post("/api/courses/:courseId/submit-test", async (req, res) => {
  const { courseId } = req.params;
  const { answers, studentName } = req.body || {};

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM courses WHERE id = ? LIMIT 1`,
    args: [courseId],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Course not found." });

  const course = rowToCourse(existing.rows[0]);
  if (!course.mcqTest || !Array.isArray(course.mcqTest.questions)) {
    return res.status(404).json({ error: "MCQ exam is not configured for this course." });
  }

  let correctCount = 0;
  course.mcqTest.questions.forEach((q, idx) => {
    if (Array.isArray(answers) && answers[idx] === q.correctAnswer) {
      correctCount++;
    }
  });

  const passed = correctCount >= course.mcqTest.passingScore;
  let certificate: Certificate | null = null;

  if (passed) {
    const certId = `CERT-THAM-${Date.now()}`;
    const userId = req.currentUser?.id || String(req.body?.userId || "cadet");
    const finalName = req.currentUser?.username || String(studentName || "Certified Cadet");
    const issuedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const hostOrigin = `${req.protocol}://${req.get("host") || "thamjj13.top"}`;

    certificate = {
      id: certId,
      userId,
      studentName: finalName,
      courseId,
      courseTitle: course.title,
      issuedBy: "THAMJJ13 Security Board",
      issuedAt,
      qrCodeUrl: `${hostOrigin}/?verify=${certId}`,
      verified: true,
    };

    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO certificates (id, user_id, student_name, course_id, course_title, issued_by, issued_at, qr_code_url, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        certificate.id,
        certificate.userId,
        certificate.studentName,
        certificate.courseId,
        certificate.courseTitle,
        certificate.issuedBy,
        certificate.issuedAt,
        certificate.qrCodeUrl,
        now,
      ],
    });

    const progId = `${userId}:${courseId}`;
    const resultPayload = {
      score: correctCount,
      passed: true,
      certificateId: certId,
      timestamp: now,
    };
    await db.execute({
      sql: `INSERT INTO course_progress (id, user_id, course_id, completed_lessons_json, test_result_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET completed_lessons_json = excluded.completed_lessons_json, test_result_json = excluded.test_result_json, updated_at = excluded.updated_at`,
      args: [
        progId,
        userId,
        courseId,
        JSON.stringify(course.lessons.map((l) => l.id)),
        JSON.stringify(resultPayload),
        now,
      ],
    });

    if (req.currentUser?.email) {
      sendCertificateIssuedEmail(certificate, req.currentUser.email).catch((err) =>
        console.error(err)
      );
    }
  }

  res.json({
    success: true,
    score: correctCount,
    total: course.mcqTest.questions.length,
    passed,
    certificate,
  });
});

app.get(["/api/certificates/verify/:id", "/api/courses/verify-cert/:id"], async (req, res) => {
  const db = getTursoClient();
  const found = await db.execute({
    sql: `SELECT * FROM certificates WHERE UPPER(id) = UPPER(?) LIMIT 1`,
    args: [req.params.id.trim()],
  });
  if (found.rows.length === 0) {
    return res.status(404).json({
      verified: false,
      error: "Certificate serial ID not found in Turso registry.",
    });
  }
  const r = found.rows[0];
  res.json({
    verified: Boolean(Number(r.verified)),
    certificate: {
      id: String(r.id),
      userId: String(r.user_id),
      studentName: String(r.student_name),
      courseId: String(r.course_id),
      courseTitle: String(r.course_title),
      issuedBy: String(r.issued_by),
      issuedAt: String(r.issued_at),
      qrCodeUrl: String(r.qr_code_url),
      verified: Boolean(Number(r.verified)),
    },
  });
});

app.get("/api/admin/certificates", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM certificates ORDER BY created_at DESC`);
  res.json(
    result.rows.map((r: any) => ({
      id: String(r.id),
      userId: String(r.user_id),
      studentName: String(r.student_name),
      courseId: String(r.course_id),
      courseTitle: String(r.course_title),
      issuedBy: String(r.issued_by),
      issuedAt: String(r.issued_at),
      qrCodeUrl: String(r.qr_code_url),
      verified: Boolean(Number(r.verified)),
    }))
  );
});

app.post("/api/admin/certificates/grant", requireAdmin, async (req, res) => {
  const { userId, studentName, courseId, courseTitle, email } = req.body || {};
  if (!studentName || !courseTitle) {
    return res.status(400).json({ error: "Student name and course title are required." });
  }

  const certId = `CERT-THAM-${Date.now()}`;
  const issuedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hostOrigin = `${req.protocol}://${req.get("host") || "thamjj13.top"}`;

  const newCert: Certificate = {
    id: certId,
    userId: String(userId || "direct-grant"),
    studentName: String(studentName),
    courseId: String(courseId || "custom"),
    courseTitle: String(courseTitle),
    issuedBy: "THAMJJ13 Command HQ",
    issuedAt,
    qrCodeUrl: `${hostOrigin}/?verify=${certId}`,
    verified: true,
  };

  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO certificates (id, user_id, student_name, course_id, course_title, issued_by, issued_at, qr_code_url, verified, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    args: [
      newCert.id,
      newCert.userId,
      newCert.studentName,
      newCert.courseId,
      newCert.courseTitle,
      newCert.issuedBy,
      newCert.issuedAt,
      newCert.qrCodeUrl,
      new Date().toISOString(),
    ],
  });

  if (email) {
    sendCertificateIssuedEmail(newCert, String(email)).catch((err) => console.error(err));
  }

  res.status(201).json({ success: true, certificate: newCert });
});

// ============================================================================
// 8. DIRECT CONTACT INBOX & RESEND OUTBOX REPLIES
// ============================================================================

app.post(
  "/api/contact",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: "contact" }),
  async (req, res) => {
    const {
      name,
      email,
      phone,
      subject,
      message,
      fileBase64,
      fileName,
      captchaAnswer,
      captchaExpected,
    } = req.body || {};

    if (captchaExpected !== undefined && Number(captchaAnswer) !== Number(captchaExpected)) {
      return res.status(400).json({ error: "CAPTCHA verification mismatch." });
    }
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required." });
    }

    let attachmentUrl = "";
    if (fileBase64) {
      const uploaded = await uploadToCloudinary({
        fileData: String(fileBase64),
        fileName: String(fileName || "attachment"),
        folder: "thamjj13/contact",
        resourceType: "auto",
      });
      attachmentUrl = uploaded.url;
    }

    const id = `msg-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const db = getTursoClient();
    await db.execute({
      sql: `INSERT INTO contact_messages (id, name, email, phone, subject, message, attachment_url, attachment_name, is_read, replies_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '[]', ?)`,
      args: [
        id,
        String(name).trim(),
        String(email).trim().toLowerCase(),
        String(phone || "").trim(),
        String(subject).trim(),
        String(message).trim(),
        attachmentUrl,
        String(fileName || ""),
        timestamp,
      ],
    });

    sendContactSubmissionEmails({
      id,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || "").trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    }).catch((err) => console.error(err));

    const newMessage: ContactMessage = {
      id,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || "").trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: fileName ? String(fileName) : undefined,
      timestamp,
      isRead: false,
      replies: [],
    };

    res.status(201).json({
      success: true,
      message:
        "Inquiry received securely. A confirmation email has been sent from no-reply@thamjj13.top.",
      newMessage,
    });
  }
);

app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM contact_messages ORDER BY timestamp DESC`);
  const list: ContactMessage[] = result.rows.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    phone: String(r.phone || ""),
    subject: String(r.subject),
    message: String(r.message),
    attachmentUrl: r.attachment_url ? String(r.attachment_url) : undefined,
    attachmentName: r.attachment_name ? String(r.attachment_name) : undefined,
    timestamp: String(r.timestamp),
    isRead: Boolean(Number(r.is_read)),
    replies: JSON.parse(String(r.replies_json || "[]")),
  }));
  res.json(list);
});

app.post("/api/admin/messages/:id/reply", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const replyText = String(req.body?.replyText || "").trim();
  const senderName = req.currentUser?.username || String(req.body?.senderName || "THAMJJ13 SOC");

  if (!replyText) {
    return res.status(400).json({ error: "Reply message cannot be empty." });
  }

  const db = getTursoClient();
  const foundRes = await db.execute({
    sql: `SELECT * FROM contact_messages WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (foundRes.rows.length === 0) {
    return res.status(404).json({ error: "Contact message not found." });
  }

  const row = foundRes.rows[0];
  const replies = JSON.parse(String(row.replies_json || "[]"));

  const mailDispatch = await sendContactReplyEmail({
    to: String(row.email),
    recipientName: String(row.name),
    originalSubject: String(row.subject),
    replyText,
    senderName,
  });

  const newReply = {
    id: `rep-${Date.now()}`,
    sender: senderName,
    message: replyText,
    timestamp: new Date().toISOString(),
    emailDelivered: mailDispatch.delivered || mailDispatch.simulated,
  };

  replies.push(newReply);
  await db.execute({
    sql: `UPDATE contact_messages SET is_read = 1, replies_json = ? WHERE id = ?`,
    args: [JSON.stringify(replies), id],
  });

  await writeAuditLog(
    senderName,
    `Dispatched Resend email reply to ${row.email} (Message ${id})`,
    getClientIp(req)
  );

  res.json({
    success: true,
    reply: newReply,
    emailDelivered: mailDispatch.delivered,
    simulated: mailDispatch.simulated,
    recipientEmail: String(row.email),
  });
});

// ============================================================================
// 9. RESEND MAIL GATEWAY MANAGEMENT & LOGS
// ============================================================================

app.get(["/api/admin/resend", "/api/admin/resend/settings"], requireAdmin, async (_req, res) => {
  const cfg = await getPublicResendConfig();
  res.json({
    ...cfg,
    source: cfg.apiKeySource,
    apiKeyMasked: cfg.maskedApiKey,
  });
});

app.post(["/api/admin/resend", "/api/admin/resend/settings"], requireSuperAdmin, async (req, res) => {
  const updated = await saveResendConfig({
    apiKey: req.body?.apiKey,
    fromEmail: req.body?.fromEmail,
    fromName: req.body?.fromName,
    adminAlertEmail: req.body?.adminAlertEmail,
  });
  await writeAuditLog(
    req.currentUser!.username,
    `Updated Resend email configuration (sender: ${updated.fromEmail})`,
    getClientIp(req)
  );
  const normalized = {
    ...updated,
    source: updated.apiKeySource,
    apiKeyMasked: updated.maskedApiKey,
  };
  res.json({ success: true, config: normalized, settings: normalized });
});

app.post(["/api/admin/resend/test", "/api/admin/smtp/test"], requireAdmin, async (req, res) => {
  const targetEmail = String(
    req.body?.to || req.body?.toEmail || req.currentUser!.email
  ).trim();
  const result = await sendMailViaResend({
    to: targetEmail,
    subject: "[THAMJJ13] Resend Mail Gateway Live Diagnostic",
    text: `Diagnostic verification successful! Outbound transactional mail from ${DEFAULT_SENDER_EMAIL} via Resend.com is operational.`,
    html: `<div style="font-family:sans-serif;padding:24px;border:1px solid #e4e4e7;border-radius:16px;"><h2>THAMJJ13 Resend Gateway Verified</h2><p>This live test email confirms outbound transactional email delivery from <strong>${DEFAULT_SENDER_EMAIL}</strong> via <strong>Resend.com</strong>.</p></div>`,
    category: "DIAGNOSTIC_TEST",
  });

  if (!result.delivered && !result.simulated) {
    return res.status(502).json({
      success: false,
      error: result.error || "Resend API test transmission failed.",
    });
  }

  res.json({
    success: true,
    simulated: result.simulated,
    message: result.simulated
      ? `RESEND_API_KEY is not configured yet (logged diagnostic to console for ${targetEmail}). Add RESEND_API_KEY to deliver live emails from ${DEFAULT_SENDER_EMAIL}.`
      : `Live test email delivered via Resend (${DEFAULT_SENDER_EMAIL}) to ${targetEmail}! (Message ID: ${result.id})`,
  });
});

app.get("/api/admin/mail-logs", requireAdmin, async (_req, res) => {
  const logs = await getRecentMailLogs(60);
  res.json(
    logs.map((l) => ({
      ...l,
      toEmail: l.recipient,
      createdAt: l.timestamp,
    }))
  );
});

// ============================================================================
// 10. LIVE SOC CHAT GATEWAY
// ============================================================================

app.get("/api/chats/session/:sessionId", async (req, res) => {
  const db = getTursoClient();
  const found = await db.execute({
    sql: `SELECT * FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [req.params.sessionId],
  });
  if (found.rows.length === 0) {
    return res.json({ session: null });
  }
  const r = found.rows[0];
  const session: LiveChatSession = {
    id: String(r.id),
    visitorName: String(r.visitor_name),
    visitorIp: String(r.visitor_ip),
    unreadCount: Number(r.unread_count || 0),
    isOnline: Boolean(Number(r.is_online)),
    isTyping: Boolean(Number(r.is_typing)),
    messages: JSON.parse(String(r.messages_json || "[]")),
  };
  res.json({ session });
});

app.get("/api/admin/chats", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM chat_sessions ORDER BY updated_at DESC`);
  const sessions: LiveChatSession[] = result.rows.map((r: any) => ({
    id: String(r.id),
    visitorName: String(r.visitor_name),
    visitorIp: String(r.visitor_ip),
    unreadCount: Number(r.unread_count || 0),
    isOnline: Boolean(Number(r.is_online)),
    isTyping: Boolean(Number(r.is_typing)),
    messages: JSON.parse(String(r.messages_json || "[]")),
  }));
  res.json(sessions);
});

app.post(
  "/api/chats/message",
  rateLimit({ windowMs: 60 * 1000, max: 35, keyPrefix: "chat_msg" }),
  async (req, res) => {
    const {
      sessionId,
      senderId,
      senderName,
      senderRole,
      content,
      fileBase64,
      fileName,
      replyToId,
      replyToContent,
    } = req.body || {};

    const cleanSessionId = String(sessionId || `chat-visitor-${Date.now()}`);
    const db = getTursoClient();

    const existing = await db.execute({
      sql: `SELECT * FROM chat_sessions WHERE id = ? LIMIT 1`,
      args: [cleanSessionId],
    });

    let messages: LiveChatMessage[] = [];
    let unreadCount = 0;
    let visitorName = String(senderName || "White Hat Guest");
    const visitorIp = getClientIp(req);

    if (existing.rows.length > 0) {
      const r = existing.rows[0];
      messages = JSON.parse(String(r.messages_json || "[]"));
      unreadCount = Number(r.unread_count || 0);
      visitorName = String(r.visitor_name || visitorName);
    }

    let imageUrl: string | undefined = undefined;
    if (fileBase64) {
      const uploaded = await uploadToCloudinary({
        fileData: String(fileBase64),
        fileName: String(fileName || "chat_image.png"),
        folder: "thamjj13/chat",
        resourceType: "image",
      });
      imageUrl = uploaded.url;
    }

    const actualRole = req.currentUser?.role || (senderRole as UserRole) || UserRole.VISITOR;
    const actualSenderId = req.currentUser?.id || String(senderId || "visitor");
    const actualSenderName = req.currentUser?.username || String(senderName || "White Hat Guest");

    const newMessage: LiveChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      senderId: actualSenderId,
      senderName: actualSenderName,
      senderRole: actualRole,
      content: String(content || "").slice(0, 3000),
      imageUrl,
      timestamp: new Date().toISOString(),
      status: isAdminRole(actualRole) ? "seen" : "delivered",
      replyToId: replyToId ? String(replyToId) : undefined,
      replyToContent: replyToContent ? String(replyToContent) : undefined,
    };

    messages.push(newMessage);
    if (!isAdminRole(actualRole) && actualSenderId !== "system-threat-intel") {
      unreadCount += 1;
    } else if (isAdminRole(actualRole)) {
      unreadCount = 0;
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO chat_sessions (id, visitor_name, visitor_ip, unread_count, is_online, is_typing, messages_json, updated_at)
            VALUES (?, ?, ?, ?, 1, 0, ?, ?)
            ON CONFLICT(id) DO UPDATE SET unread_count = excluded.unread_count, is_online = 1, messages_json = excluded.messages_json, updated_at = excluded.updated_at`,
      args: [cleanSessionId, visitorName, visitorIp, unreadCount, JSON.stringify(messages), now],
    });

    const session: LiveChatSession = {
      id: cleanSessionId,
      visitorName,
      visitorIp,
      unreadCount,
      isOnline: true,
      isTyping: false,
      messages,
    };

    res.json({ success: true, session, message: newMessage });
  }
);

app.post("/api/chats/:sessionId/read", requireAdmin, async (req, res) => {
  const db = getTursoClient();
  const found = await db.execute({
    sql: `SELECT * FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [req.params.sessionId],
  });
  if (found.rows.length > 0) {
    const messages: LiveChatMessage[] = JSON.parse(String(found.rows[0].messages_json || "[]"));
    messages.forEach((m) => (m.status = "seen"));
    await db.execute({
      sql: `UPDATE chat_sessions SET unread_count = 0, messages_json = ?, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(messages), new Date().toISOString(), req.params.sessionId],
    });
  }
  res.json({ success: true });
});

app.post("/api/chats/:sessionId/delete/:msgId", async (req, res) => {
  const db = getTursoClient();
  const found = await db.execute({
    sql: `SELECT * FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [req.params.sessionId],
  });
  if (found.rows.length > 0) {
    const messages: LiveChatMessage[] = JSON.parse(String(found.rows[0].messages_json || "[]"));
    const filtered = messages.filter((m) => m.id !== req.params.msgId);
    await db.execute({
      sql: `UPDATE chat_sessions SET messages_json = ?, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(filtered), new Date().toISOString(), req.params.sessionId],
    });
  }
  res.json({ success: true });
});

// ============================================================================
// 11. SECURE FILE VAULT (CLOUDINARY + SHA-256 INTEGRITY)
// ============================================================================

app.get("/api/vault", requireAuth, async (req, res) => {
  const db = getTursoClient();
  if (isAdminRole(req.currentUser!.role)) {
    const result = await db.execute(`SELECT * FROM vault_items ORDER BY uploaded_at DESC`);
    return res.json(result.rows.map(rowToVaultItem));
  }
  const result = await db.execute({
    sql: `SELECT * FROM vault_items WHERE user_id = ? OR role = 'SUPER_ADMIN' ORDER BY uploaded_at DESC`,
    args: [req.currentUser!.id],
  });
  res.json(result.rows.map(rowToVaultItem));
});

app.post("/api/vault/upload", requireAuth, async (req, res) => {
  const rawName = String(req.body?.fileName || req.body?.name || "vault_asset.bin").trim();
  const rawSize = String(req.body?.fileSize || req.body?.size || "0 KB").trim();
  const rawType = String(req.body?.fileType || req.body?.mimeType || "application/octet-stream").trim();
  const fileBase64 = String(req.body?.fileBase64 || "");

  if (!fileBase64) {
    return res.status(400).json({ error: "File payload is required." });
  }

  try {
    const uploaded = await uploadToCloudinary({
      fileData: fileBase64,
      fileName: rawName,
      mimeType: rawType,
      folder: "thamjj13/vault",
      resourceType: "auto",
    });

    const sha256 = crypto
      .createHash("sha256")
      .update(fileBase64.slice(0, 65536))
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();

    const id = `vault-${Date.now()}`;
    const now = new Date().toISOString();
    const user = req.currentUser!;

    const db = getTursoClient();
    await db.execute({
      sql: `INSERT INTO vault_items (
        id, user_id, name, size, mime_type, encrypted_url, public_id,
        aes_hash, uploaded_by, role, downloads, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        id,
        user.id,
        rawName,
        rawSize,
        rawType,
        uploaded.url,
        uploaded.publicId,
        `SHA256:${sha256}`,
        user.username,
        user.role,
        now,
      ],
    });

    await writeAuditLog(user.username, `Uploaded vault asset: ${rawName}`, getClientIp(req));

    const created = await db.execute({
      sql: `SELECT * FROM vault_items WHERE id = ? LIMIT 1`,
      args: [id],
    });
    res.status(201).json({ success: true, item: rowToVaultItem(created.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Vault upload failed." });
  }
});

app.post("/api/vault/:id/download", requireAuth, async (req, res) => {
  const db = getTursoClient();
  await db.execute({
    sql: `UPDATE vault_items SET downloads = downloads + 1 WHERE id = ?`,
    args: [req.params.id],
  });
  const found = await db.execute({
    sql: `SELECT encrypted_url FROM vault_items WHERE id = ? LIMIT 1`,
    args: [req.params.id],
  });
  res.json({ success: true, url: found.rows[0]?.encrypted_url || "" });
});

// ============================================================================
// 12. SUPPORT TICKETS (TURSO + RESEND NOTIFICATIONS)
// ============================================================================

app.post(["/api/support-tickets", "/api/support/tickets"], requireAuth, async (req, res) => {
  const user = req.currentUser!;
  const subject = String(req.body?.subject || "").trim();
  const description = String(req.body?.description || req.body?.message || "").trim();
  const priority = String(req.body?.priority || "MEDIUM").trim();
  const category = String(req.body?.category || "Technical").trim();

  if (!subject || !description) {
    return res.status(400).json({ error: "Ticket subject and message are required." });
  }

  const id = `TKT-${crypto.randomInt(10000, 99999)}`;
  const now = new Date().toISOString();

  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO support_tickets (id, user_id, username, email, subject, description, priority, category, status, replies_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', '[]', ?, ?)`,
    args: [id, user.id, user.username, user.email, subject, description, priority, category, now, now],
  });

  sendSupportTicketEmails({
    ticketId: id,
    username: user.username,
    email: user.email,
    subject,
    description,
    event: "CREATED",
  }).catch((err) => console.error(err));

  const created = await db.execute({
    sql: `SELECT * FROM support_tickets WHERE id = ? LIMIT 1`,
    args: [id],
  });
  res.status(201).json({ success: true, ticket: rowToTicket(created.rows[0]) });
});

app.get(["/api/support-tickets", "/api/support/tickets"], requireAuth, async (req, res) => {
  const db = getTursoClient();
  if (isAdminRole(req.currentUser!.role)) {
    const result = await db.execute(`SELECT * FROM support_tickets ORDER BY created_at DESC`);
    return res.json(result.rows.map(rowToTicket));
  }
  const result = await db.execute({
    sql: `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`,
    args: [req.currentUser!.id],
  });
  res.json(result.rows.map(rowToTicket));
});

app.post(
  ["/api/admin/tickets/:id/reply", "/api/support-tickets/:id/reply", "/api/support/tickets/:id/reply"],
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const text = String(req.body?.content || req.body?.message || req.body?.replyText || "").trim();
    if (!text) return res.status(400).json({ error: "Reply content is required." });

    const db = getTursoClient();
    const existing = await db.execute({
      sql: `SELECT * FROM support_tickets WHERE id = ? LIMIT 1`,
      args: [id],
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    const ticket = rowToTicket(existing.rows[0]);
    const user = req.currentUser!;
    if (!isAdminRole(user.role) && ticket.userId !== user.id) {
      return res.status(403).json({ error: "Unauthorized access to ticket." });
    }

    const newReply: SupportTicketReply = {
      id: `rep-${Date.now()}`,
      sender: user.username,
      senderName: user.username,
      senderRole: user.role,
      message: text,
      content: text,
      text,
      timestamp: new Date().toISOString(),
    };

    const nextReplies = [...ticket.replies, newReply];
    const nextStatus = isAdminRole(user.role) ? "IN_PROGRESS" : ticket.status;

    await db.execute({
      sql: `UPDATE support_tickets SET status = ?, replies_json = ?, updated_at = ? WHERE id = ?`,
      args: [nextStatus, JSON.stringify(nextReplies), new Date().toISOString(), id],
    });

    if (isAdminRole(user.role) && ticket.email) {
      sendSupportTicketEmails({
        ticketId: ticket.id,
        username: ticket.username,
        email: ticket.email,
        subject: ticket.subject,
        description: ticket.description,
        event: "REPLIED",
        replyText: text,
        replierName: user.username,
      }).catch((err) => console.error(err));
    }

    res.json({ success: true, reply: newReply });
  }
);

app.post(["/api/admin/tickets/:id/status", "/api/admin/support-tickets/:id/resolve"], requireAdmin, async (req, res) => {
  const { id } = req.params;
  const nextStatus = String(req.body?.status || "RESOLVED").toUpperCase();
  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT * FROM support_tickets WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "Ticket not found." });

  const ticket = rowToTicket(existing.rows[0]);
  await db.execute({
    sql: `UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?`,
    args: [nextStatus, new Date().toISOString(), id],
  });

  if (ticket.email && nextStatus === "RESOLVED") {
    sendSupportTicketEmails({
      ticketId: ticket.id,
      username: ticket.username,
      email: ticket.email,
      subject: ticket.subject,
      description: ticket.description,
      event: "RESOLVED",
    }).catch((err) => console.error(err));
  }

  res.json({ success: true });
});

// ============================================================================
// 13. EVENTS, NEWSLETTER, API KEYS, BACKUPS & AUDIT LOGS
// ============================================================================

app.get("/api/events", async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM events ORDER BY date ASC`);
  const events: CyberEvent[] = result.rows.map((r: any) => ({
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    date: String(r.date),
    time: String(r.time),
    instructor: String(r.location || "THAMJJ13 Command"),
    location: String(r.location || "Singapore / Dhaka Bridge"),
    type: String(r.type) as CyberEvent["type"],
    link: r.link ? String(r.link) : undefined,
    registrationLink: r.link ? String(r.link) : undefined,
  }));
  res.json(events);
});

app.post("/api/admin/events", requireAdmin, async (req, res) => {
  const { title, description, date, time, location, instructor, type, link, registrationLink } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: "Title and date are required." });

  const id = `evt-${Date.now()}`;
  const resolvedLocation = String(instructor || location || "Singapore / Dhaka Hybrid Command");
  const resolvedLink = String(registrationLink || link || "");
  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO events (id, title, description, date, time, location, type, link, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(title),
      String(description || ""),
      String(date),
      String(time || "18:00 UTC+6"),
      resolvedLocation,
      String(type || "Live Training"),
      resolvedLink,
      new Date().toISOString(),
    ],
  });

  res.status(201).json({
    success: true,
    event: {
      id,
      title,
      description,
      date,
      time,
      instructor: resolvedLocation,
      location: resolvedLocation,
      type,
      link: resolvedLink,
      registrationLink: resolvedLink,
    },
  });
});

app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({ sql: `DELETE FROM events WHERE id = ?`, args: [req.params.id] });
  res.json({ success: true });
});

app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({ sql: `DELETE FROM events WHERE id = ?`, args: [req.params.id] });
  res.json({ success: true });
});

app.post(
  "/api/newsletter/subscribe",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "newsletter" }),
  async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required." });
    }

    const db = getTursoClient();
    await db.execute({
      sql: `INSERT INTO newsletter_subscribers (email, subscribed_at, active)
            VALUES (?, ?, 1)
            ON CONFLICT(email) DO UPDATE SET active = 1`,
      args: [email, new Date().toISOString()],
    });

    sendNewsletterConfirmationEmail(email).catch((err) => console.error(err));
    res.json({ success: true, message: "Subscribed to security advisories." });
  }
);

app.get(["/api/admin/apikeys", "/api/admin/api-keys"], requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM api_keys ORDER BY created_at DESC`);
  const keys: ApiKeyConfig[] = result.rows.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    key: String(r.key_value),
    role: String(r.role),
    status: String(r.status) as "ACTIVE" | "REVOKED",
    createdAt: String(r.created_at),
    usageCount: Number(r.usage_count || 0),
  }));
  res.json(keys);
});

app.post(["/api/admin/apikeys", "/api/admin/api-keys"], requireSuperAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const role = String(req.body?.role || "Audit Stream").trim();
  if (!name) return res.status(400).json({ error: "Key name is required." });

  const id = `key-${Date.now()}`;
  const key = `tham_live_${crypto.randomBytes(18).toString("hex")}`;
  const createdAt = new Date().toISOString();

  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO api_keys (id, name, key_value, role, status, usage_count, created_at)
          VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?)`,
    args: [id, name, key, role, createdAt],
  });

  await writeAuditLog(req.currentUser!.username, `Generated API key: ${name}`, getClientIp(req));
  res.status(201).json({
    success: true,
    apiKey: { id, name, key, role, status: "ACTIVE", createdAt, usageCount: 0 },
  });
});

app.post("/api/admin/api-keys/:id/revoke", requireSuperAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({
    sql: `UPDATE api_keys SET status = 'REVOKED' WHERE id = ?`,
    args: [req.params.id],
  });
  await writeAuditLog(
    req.currentUser!.username,
    `Revoked API key ${req.params.id}`,
    getClientIp(req)
  );
  res.json({ success: true });
});

app.delete(["/api/admin/apikeys/:id", "/api/admin/api-keys/:id"], requireSuperAdmin, async (req, res) => {
  const db = getTursoClient();
  await db.execute({
    sql: `DELETE FROM api_keys WHERE id = ?`,
    args: [req.params.id],
  });
  await writeAuditLog(
    req.currentUser!.username,
    `Deleted API key ${req.params.id}`,
    getClientIp(req)
  );
  res.json({ success: true });
});

app.post(["/api/admin/backups/trigger", "/api/admin/backup/trigger"], requireAdmin, async (req, res) => {
  const current = (await getSetting<number>("backups_count", 0)) || 0;
  const next = current + 1;
  await setSetting("backups_count", next);
  await setSetting("last_backup_at", new Date().toISOString());
  await writeAuditLog(
    req.currentUser!.username,
    `Triggered Turso database integrity snapshot #${next}`,
    getClientIp(req)
  );
  res.json({ success: true, backupsCount: next });
});

app.get("/api/admin/audit-logs", requireAdmin, async (_req, res) => {
  const db = getTursoClient();
  const result = await db.execute(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`);
  res.json(
    result.rows.map((r: any) => ({
      id: String(r.id),
      actor: String(r.user_name),
      user: String(r.user_name),
      action: String(r.action),
      ip: String(r.ip),
      timestamp: String(r.timestamp),
    }))
  );
});

app.get("/api/announcement", async (_req, res) => {
  const ann = (await getSetting("announcement")) || { title: "", content: "", active: false };
  res.json(ann);
});

app.post("/api/admin/announcement", requireAdmin, async (req, res) => {
  const announcement = {
    title: String(req.body?.title || ""),
    content: String(req.body?.content || ""),
    active: Boolean(req.body?.active ?? true),
  };
  await setSetting("announcement", announcement);
  res.json({ success: true, announcement });
});

// ============================================================================
// 14. DYNAMIC CMS MANAGEMENT (TURSO + CLOUDINARY)
// ============================================================================

app.get(["/api/admin/cloudinary", "/api/cms/cloudinary-settings"], requireAdmin, async (_req, res) => {
  const cfg = await getPublicCloudinaryConfig();
  res.json(cfg);
});

app.post(["/api/admin/cloudinary", "/api/cms/cloudinary-settings"], requireSuperAdmin, async (req, res) => {
  const cfg = await saveCloudinaryConfig(req.body || {});
  await writeAuditLog(
    req.currentUser!.username,
    `Updated Cloudinary CDN configuration (cloud: ${cfg.cloudName || "unset"})`,
    getClientIp(req)
  );
  res.json({ success: true, config: cfg, settings: cfg });
});

async function listCmsCollection(collection: string): Promise<any[]> {
  const db = getTursoClient();
  const res = await db.execute({
    sql: `SELECT data_json FROM cms_records WHERE collection = ? ORDER BY sort_order ASC, created_at ASC`,
    args: [collection],
  });
  return res.rows
    .map((r: any) => {
      try {
        return JSON.parse(String(r.data_json));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function upsertCmsItem(collection: string, id: string, data: any): Promise<any> {
  const db = getTursoClient();
  const now = new Date().toISOString();
  const payload = { ...data, id };
  await db.execute({
    sql: `INSERT INTO cms_records (id, collection, sort_order, data_json, created_at, updated_at)
          VALUES (?, ?, 0, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
    args: [id, collection, JSON.stringify(payload), now, now],
  });
  return payload;
}

async function deleteCmsItem(collection: string, id: string): Promise<void> {
  const db = getTursoClient();
  await db.execute({
    sql: `DELETE FROM cms_records WHERE collection = ? AND id = ?`,
    args: [collection, id],
  });
}

async function normalizeCmsImage(rawUrl: string | undefined, folder: string): Promise<string> {
  const val = String(rawUrl || "").trim();
  if (!val) return "";
  if (val.startsWith("data:")) {
    const up = await uploadToCloudinary({
      fileData: val,
      fileName: "cms_media",
      folder,
      resourceType: "image",
    });
    return up.url;
  }
  return val;
}

// Hero Slides
app.get("/api/cms/hero-slides", async (_req, res) => {
  res.json(await listCmsCollection("hero_slides"));
});

app.post("/api/cms/hero-slides", requireAdmin, async (req, res) => {
  const id = `slide-${Date.now()}`;
  const bgImage = await normalizeCmsImage(req.body?.bgImage, "thamjj13/cms/slides");
  const slide = await upsertCmsItem("hero_slides", id, {
    title: String(req.body?.title || "Enterprise Cyber Defense"),
    subtitle: String(req.body?.subtitle || ""),
    bgImage,
    bgVideo: String(req.body?.bgVideo || ""),
    ctaText: String(req.body?.ctaText || ""),
    ctaLink: String(req.body?.ctaLink || ""),
    textAnimation: String(req.body?.textAnimation || "fade-up"),
    parallaxSpeed: Number(req.body?.parallaxSpeed || 0.5),
  });
  res.status(201).json({ success: true, slide });
});

app.put("/api/cms/hero-slides/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("hero_slides");
  const prev = items.find((s) => s.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Slide not found." });
  const bgImage =
    req.body?.bgImage !== undefined
      ? await normalizeCmsImage(req.body.bgImage, "thamjj13/cms/slides")
      : prev.bgImage;
  const slide = await upsertCmsItem("hero_slides", req.params.id, {
    ...prev,
    ...req.body,
    bgImage,
  });
  res.json({ success: true, slide });
});

app.delete("/api/cms/hero-slides/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("hero_slides", req.params.id);
  res.json({ success: true });
});

// Services
app.get("/api/cms/services", async (_req, res) => {
  res.json(await listCmsCollection("services"));
});

app.post("/api/cms/services", requireAdmin, async (req, res) => {
  const id = `service-${Date.now()}`;
  const service = await upsertCmsItem("services", id, {
    icon: String(req.body?.icon || "Shield"),
    title: String(req.body?.title || "Security Service"),
    description: String(req.body?.description || ""),
  });
  res.status(201).json({ success: true, service });
});

app.put("/api/cms/services/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("services");
  const prev = items.find((s) => s.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Service not found." });
  const service = await upsertCmsItem("services", req.params.id, { ...prev, ...req.body });
  res.json({ success: true, service });
});

app.delete("/api/cms/services/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("services", req.params.id);
  res.json({ success: true });
});

// Team Members
app.get("/api/cms/team-members", async (_req, res) => {
  res.json(await listCmsCollection("team_members"));
});

app.post("/api/cms/team-members", requireAdmin, async (req, res) => {
  const id = `team-${Date.now()}`;
  const avatar =
    (await normalizeCmsImage(req.body?.avatar, "thamjj13/cms/team")) ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200";
  const member = await upsertCmsItem("team_members", id, {
    name: String(req.body?.name || "Security Officer"),
    role: String(req.body?.role || "Security Analyst"),
    location: String(req.body?.location || "Singapore"),
    avatar,
    bio: String(req.body?.bio || ""),
    email: String(req.body?.email || ""),
    phone: String(req.body?.phone || ""),
    facebookUrl: String(req.body?.facebookUrl || ""),
    badges: Array.isArray(req.body?.badges) ? req.body.badges : [],
  });
  res.status(201).json({ success: true, member });
});

app.put("/api/cms/team-members/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("team_members");
  const prev = items.find((m) => m.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Team member not found." });
  const avatar =
    req.body?.avatar !== undefined
      ? await normalizeCmsImage(req.body.avatar, "thamjj13/cms/team")
      : prev.avatar;
  const member = await upsertCmsItem("team_members", req.params.id, {
    ...prev,
    ...req.body,
    avatar,
  });
  res.json({ success: true, member });
});

app.delete("/api/cms/team-members/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("team_members", req.params.id);
  res.json({ success: true });
});

// Gallery
app.get("/api/cms/gallery", async (_req, res) => {
  res.json(await listCmsCollection("gallery"));
});

app.post("/api/cms/gallery", requireAdmin, async (req, res) => {
  const id = `gal-${Date.now()}`;
  const url = await normalizeCmsImage(req.body?.url, "thamjj13/cms/gallery");
  const item = await upsertCmsItem("gallery", id, {
    category: String(req.body?.category || "Operations"),
    title: String(req.body?.title || "Operation Media"),
    url,
  });
  res.status(201).json({ success: true, item });
});

app.put("/api/cms/gallery/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("gallery");
  const prev = items.find((g) => g.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Gallery item not found." });
  const url =
    req.body?.url !== undefined
      ? await normalizeCmsImage(req.body.url, "thamjj13/cms/gallery")
      : prev.url;
  const item = await upsertCmsItem("gallery", req.params.id, { ...prev, ...req.body, url });
  res.json({ success: true, item });
});

app.delete("/api/cms/gallery/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("gallery", req.params.id);
  res.json({ success: true });
});

// FAQs
app.get("/api/cms/faqs", async (_req, res) => {
  res.json(await listCmsCollection("faqs"));
});

app.post("/api/cms/faqs", requireAdmin, async (req, res) => {
  const id = `faq-${Date.now()}`;
  const faq = await upsertCmsItem("faqs", id, {
    q: String(req.body?.q || ""),
    a: String(req.body?.a || ""),
  });
  res.status(201).json({ success: true, faq });
});

app.put("/api/cms/faqs/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("faqs");
  const prev = items.find((f) => f.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "FAQ not found." });
  const faq = await upsertCmsItem("faqs", req.params.id, { ...prev, ...req.body });
  res.json({ success: true, faq });
});

app.delete("/api/cms/faqs/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("faqs", req.params.id);
  res.json({ success: true });
});

// Stats Counters
app.get("/api/cms/stats", async (_req, res) => {
  res.json(await listCmsCollection("stats"));
});

app.post("/api/cms/stats", requireAdmin, async (req, res) => {
  const id = `stat-${Date.now()}`;
  const desc = String(req.body?.desc || req.body?.description || "");
  const stat = await upsertCmsItem("stats", id, {
    label: String(req.body?.label || "METRIC"),
    value: String(req.body?.value || "0"),
    desc,
    description: desc,
  });
  res.status(201).json({ success: true, stat });
});

app.put("/api/cms/stats/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("stats");
  const prev = items.find((s) => s.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Stat not found." });
  const desc = String(req.body?.desc ?? req.body?.description ?? prev.desc ?? "");
  const stat = await upsertCmsItem("stats", req.params.id, {
    ...prev,
    ...req.body,
    desc,
    description: desc,
  });
  res.json({ success: true, stat });
});

app.delete("/api/cms/stats/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("stats", req.params.id);
  res.json({ success: true });
});

// Alliances
app.get("/api/cms/alliances", async (_req, res) => {
  res.json(await listCmsCollection("alliances"));
});

app.post("/api/cms/alliances", requireAdmin, async (req, res) => {
  const id = `all-${Date.now()}`;
  const alliance = await upsertCmsItem("alliances", id, {
    name: String(req.body?.name || ""),
  });
  res.status(201).json({ success: true, alliance });
});

app.put("/api/cms/alliances/:id", requireAdmin, async (req, res) => {
  const items = await listCmsCollection("alliances");
  const prev = items.find((a) => a.id === req.params.id);
  if (!prev) return res.status(404).json({ error: "Alliance not found." });
  const alliance = await upsertCmsItem("alliances", req.params.id, { ...prev, ...req.body });
  res.json({ success: true, alliance });
});

app.delete("/api/cms/alliances/:id", requireAdmin, async (req, res) => {
  await deleteCmsItem("alliances", req.params.id);
  res.json({ success: true });
});

// ============================================================================
// 15. GEMINI AI THREAT TUTOR
// ============================================================================

app.post(["/api/gemini/assist", "/api/gemini/threat-intel", "/api/ai/cyber-tutor"], async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const type = String(req.body?.type || "course");

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      const fallback =
        "🛡️ [THAMJJ13 Advisory Engine] Configure GEMINI_API_KEY in environment variables to enable live AI generation. Recommended baseline posture: enforce MFA across administrative endpoints, isolate untrusted network segments, validate webhook/API signatures, and audit Turso access logs regularly.";
      return res.json({ success: true, reply: fallback, text: fallback, content: fallback });
    }

    const systemInstruction =
      type === "course"
        ? "You are THAMJJ13's Ethical Hacking Academy AI Tutor. Provide accurate, defensive-minded cybersecurity explanations, practical command examples (Nmap, Wireshark, OWASP testing), and remediation guidance."
        : "You are a Senior Cyber Security Threat Intelligence Analyst at THAMJJ13 serving Singapore and Bangladesh enterprises. Deliver concise, actionable, technically rigorous defensive and incident-response guidance.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { systemInstruction, temperature: 0.6 },
    });

    const output = response.text || "No response generated.";
    res.json({ success: true, reply: output, text: output, content: output });
  } catch (error) {
    console.error("Gemini AI error:", error);
    const fallback =
      "⚠️ [Threat Intelligence Fallback] AI upstream temporarily unreachable. Apply zero-trust containment, preserve SHA-256 forensic hashes, and escalate critical findings via the THAMJJ13 Incident Report portal.";
    res.json({ success: true, reply: fallback, text: fallback, content: fallback });
  }
});
