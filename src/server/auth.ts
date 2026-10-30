import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getTursoClient, getSetting, setSetting, rowToUserProfile } from "./db";
import { UserProfile, UserRole, OtpPurpose } from "../types";

export const SESSION_COOKIE_NAME = "tham_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserProfile;
      sessionJti?: string;
    }
  }
}

let cachedJwtSecret: string | null = null;

export async function getJwtSecret(): Promise<string> {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  if (cachedJwtSecret) return cachedJwtSecret;

  let stored = await getSetting<string>("jwt_signing_secret");
  if (!stored || stored.length < 32) {
    stored = crypto.randomBytes(48).toString("hex");
    await setSetting("jwt_signing_secret", stored);
  }
  cachedJwtSecret = stored;
  return stored;
}

export function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "127.0.0.1";
}

export async function issueUserSession(
  req: Request,
  res: Response,
  userId: string
): Promise<string> {
  const db = getTursoClient();
  const secret = await getJwtSecret();
  const jti = crypto.randomUUID();
  const sessionId = `ses-${crypto.randomUUID()}`;
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  await db.execute({
    sql: `INSERT INTO auth_sessions (id, user_id, token_jti, ip, user_agent, expires_at, revoked, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      sessionId,
      userId,
      jti,
      getClientIp(req),
      String(req.headers["user-agent"] || "").slice(0, 255),
      expiresAt,
      new Date(now).toISOString(),
    ],
  });

  const token = jwt.sign({ sub: userId, jti }, secret, {
    expiresIn: "7d",
  });

  const isSecure =
    process.env.NODE_ENV === "production" ||
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: Boolean(isSecure),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });

  return token;
}

export async function revokeCurrentSession(req: Request, res: Response): Promise<void> {
  try {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : "");

    if (token) {
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret) as { jti?: string };
      if (decoded?.jti) {
        const db = getTursoClient();
        await db.execute({
          sql: `UPDATE auth_sessions SET revoked = 1 WHERE token_jti = ?`,
          args: [decoded.jti],
        });
      }
    }
  } catch {
    // Ignore invalid/expired token during logout
  }

  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.clearCookie("token", { path: "/" });
}

export async function attachCurrentUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.[SESSION_COOKIE_NAME] ||
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "");

  if (!token) {
    return next();
  }

  try {
    const secret = await getJwtSecret();
    const decoded = jwt.verify(token, secret) as { sub?: string; id?: string; jti?: string };
    const userId = decoded.sub || decoded.id;
    if (!userId) return next();

    const db = getTursoClient();

    if (decoded.jti) {
      const sesRes = await db.execute({
        sql: `SELECT revoked, expires_at FROM auth_sessions WHERE token_jti = ? LIMIT 1`,
        args: [decoded.jti],
      });
      if (
        sesRes.rows.length === 0 ||
        Number(sesRes.rows[0].revoked) === 1 ||
        Number(sesRes.rows[0].expires_at) < Date.now()
      ) {
        return next();
      }
      req.sessionJti = decoded.jti;
    }

    const userRes = await db.execute({
      sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
      args: [userId],
    });
    if (userRes.rows.length === 0) return next();

    const profile = rowToUserProfile(userRes.rows[0]);
    if (!profile.approved) return next();

    req.currentUser = profile;
  } catch {
    // Invalid or expired JWT — continue unauthenticated
  }

  next();
}

export function isAdminRole(role?: UserRole | string): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.SECONDARY_ADMIN ||
    role === UserRole.COURSE_MANAGER ||
    role === UserRole.CONTENT_MANAGER ||
    role === UserRole.SUPPORT_AGENT ||
    role === UserRole.MODERATOR
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: "Authentication required. Please sign in." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: "Administrative authentication required." });
    return;
  }
  if (!isAdminRole(req.currentUser.role)) {
    res.status(403).json({ error: "Forbidden: Administrative clearance required." });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: "Super Admin authentication required." });
    return;
  }
  if (req.currentUser.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({ error: "Forbidden: Super Administrator privileges required." });
    return;
  }
  next();
}

// ============================================================================
// CRYPTOGRAPHIC OTP ENGINE (TURSO PERSISTED)
// ============================================================================

function computeOtpDigest(otp: string, email: string, purpose: string): string {
  return crypto
    .createHash("sha256")
    .update(`${otp.trim()}:${email.trim().toLowerCase()}:${purpose}`)
    .digest("hex");
}

export async function createOtpChallenge(params: {
  email: string;
  purpose: OtpPurpose;
  metadata?: Record<string, any>;
  ttlMs?: number;
}): Promise<{ challengeId: string; otp: string; expiresAt: number }> {
  const db = getTursoClient();
  const cleanEmail = params.email.trim().toLowerCase();
  const otp = crypto.randomInt(100000, 1000000).toString();
  const challengeId = `otp-${crypto.randomUUID()}`;
  const expiresAt = Date.now() + (params.ttlMs || 10 * 60 * 1000);
  const otpHash = computeOtpDigest(otp, cleanEmail, params.purpose);

  // Invalidate any prior active OTPs for same email + purpose
  await db.execute({
    sql: `UPDATE otp_tokens SET consumed = 1 WHERE LOWER(email) = ? AND purpose = ? AND consumed = 0`,
    args: [cleanEmail, params.purpose],
  });

  await db.execute({
    sql: `INSERT INTO otp_tokens (id, email, otp_hash, purpose, attempts, expires_at, consumed, metadata_json, created_at)
          VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)`,
    args: [
      challengeId,
      cleanEmail,
      otpHash,
      params.purpose,
      expiresAt,
      JSON.stringify(params.metadata || {}),
      new Date().toISOString(),
    ],
  });

  return { challengeId, otp, expiresAt };
}

export async function verifyOtpChallenge(params: {
  challengeId?: string;
  email?: string;
  purpose: OtpPurpose;
  otp: string;
  consume?: boolean;
}): Promise<
  | { valid: true; email: string; metadata: Record<string, any>; challengeId: string }
  | { valid: false; error: string }
> {
  const db = getTursoClient();
  const cleanOtp = String(params.otp || "").trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: "Invalid OTP format. Enter the 6-digit numeric code." };
  }

  let row: any = null;
  if (params.challengeId) {
    const res = await db.execute({
      sql: `SELECT * FROM otp_tokens WHERE id = ? AND purpose = ? LIMIT 1`,
      args: [params.challengeId, params.purpose],
    });
    row = res.rows[0];
  } else if (params.email) {
    const res = await db.execute({
      sql: `SELECT * FROM otp_tokens WHERE LOWER(email) = ? AND purpose = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1`,
      args: [params.email.trim().toLowerCase(), params.purpose],
    });
    row = res.rows[0];
  }

  if (!row) {
    return { valid: false, error: "No active OTP session found. Please request a new code." };
  }

  if (Number(row.consumed) === 1) {
    return { valid: false, error: "This OTP code has already been used. Request a fresh code." };
  }

  if (Date.now() > Number(row.expires_at)) {
    await db.execute({
      sql: `UPDATE otp_tokens SET consumed = 1 WHERE id = ?`,
      args: [String(row.id)],
    });
    return { valid: false, error: "OTP code has expired (10-minute window). Please request a new code." };
  }

  const attempts = Number(row.attempts || 0);
  if (attempts >= 5) {
    await db.execute({
      sql: `UPDATE otp_tokens SET consumed = 1 WHERE id = ?`,
      args: [String(row.id)],
    });
    return { valid: false, error: "Too many failed OTP attempts. Please request a new verification code." };
  }

  const email = String(row.email).toLowerCase();
  const expectedHash = String(row.otp_hash);
  const candidateHash = computeOtpDigest(cleanOtp, email, params.purpose);

  const expectedBuf = Buffer.from(expectedHash, "hex");
  const candidateBuf = Buffer.from(candidateHash, "hex");
  const matches =
    expectedBuf.length === candidateBuf.length &&
    crypto.timingSafeEqual(expectedBuf, candidateBuf);

  if (!matches) {
    await db.execute({
      sql: `UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?`,
      args: [String(row.id)],
    });
    return { valid: false, error: "Invalid verification code. Please check your inbox and try again." };
  }

  if (params.consume !== false) {
    await db.execute({
      sql: `UPDATE otp_tokens SET consumed = 1 WHERE id = ?`,
      args: [String(row.id)],
    });
  }

  let metadata: Record<string, any> = {};
  try {
    metadata = JSON.parse(String(row.metadata_json || "{}"));
  } catch {
    metadata = {};
  }

  return {
    valid: true,
    email,
    metadata,
    challengeId: String(row.id),
  };
}

// ============================================================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER
// ============================================================================

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: `Too many requests. Please wait ${retryAfterSec}s before retrying.`,
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
