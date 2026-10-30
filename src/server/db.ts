import { createClient, Client } from "@libsql/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import { UserRole, UserProfile } from "../types";

let tursoClient: Client | null = null;
let initPromise: Promise<void> | null = null;
let databaseMode: "CONNECTED" | "LOCAL_REPLICA" | "ERROR" = "LOCAL_REPLICA";

export function getDbMode(): "CONNECTED" | "LOCAL_REPLICA" | "ERROR" {
  return databaseMode;
}

export function getTursoClient(): Client {
  if (!tursoClient) {
    const remoteUrl = (
      process.env.TURSO_DATABASE_URL ||
      process.env.LIBSQL_URL ||
      ""
    ).trim();
    const authToken = (
      process.env.TURSO_AUTH_TOKEN ||
      process.env.LIBSQL_AUTH_TOKEN ||
      ""
    ).trim();

    if (remoteUrl) {
      tursoClient = createClient({
        url: remoteUrl,
        authToken: authToken || undefined,
      });
      databaseMode = remoteUrl.startsWith("file:") ? "LOCAL_REPLICA" : "CONNECTED";
    } else {
      const localFile = process.env.VERCEL
        ? "file:/tmp/thamjj13-turso.db"
        : `file:${path.join(process.cwd(), "thamjj13-local.db")}`;
      tursoClient = createClient({ url: localFile });
      databaseMode = "LOCAL_REPLICA";
    }
  }
  return tursoClient;
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = runMigrationsAndBootstrap().catch((err) => {
      databaseMode = "ERROR";
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function runMigrationsAndBootstrap(): Promise<void> {
  const db = getTursoClient();

  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      approved INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      profile_picture TEXT NOT NULL DEFAULT '',
      login_history_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,

    `CREATE TABLE IF NOT EXISTS otp_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE,
      otp_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_tokens(email, purpose)`,

    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_jti TEXT NOT NULL UNIQUE,
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      expires_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_jti ON auth_sessions(token_jti)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id)`,

    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      tracking_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      incident_date_time TEXT NOT NULL,
      incident_location TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence_url TEXT DEFAULT '',
      evidence_public_id TEXT DEFAULT '',
      evidence_name TEXT DEFAULT '',
      witness_info TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT DEFAULT '',
      fir_number TEXT DEFAULT '',
      fir_details_json TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reports_email ON reports(email)`,
    `CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`,
    `CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Penetration Testing',
      level TEXT NOT NULL DEFAULT 'Intermediate',
      thumbnail TEXT NOT NULL DEFAULT '',
      lessons_json TEXT NOT NULL DEFAULT '[]',
      mcq_test_json TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS course_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      completed_lessons_json TEXT NOT NULL DEFAULT '[]',
      test_result_json TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      issued_by TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      qr_code_url TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      replies_json TEXT NOT NULL DEFAULT '[]',
      timestamp TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_contact_timestamp ON contact_messages(timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      category TEXT NOT NULL DEFAULT 'Technical',
      status TEXT NOT NULL DEFAULT 'OPEN',
      replies_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id)`,

    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      visitor_name TEXT NOT NULL,
      visitor_ip TEXT NOT NULL,
      unread_count INTEGER NOT NULL DEFAULT 0,
      is_online INTEGER NOT NULL DEFAULT 1,
      is_typing INTEGER NOT NULL DEFAULT 0,
      messages_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      encrypted_url TEXT NOT NULL,
      public_id TEXT NOT NULL DEFAULT '',
      aes_hash TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      role TEXT NOT NULL,
      downloads INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'Singapore / Dhaka Hybrid Command Bridge',
      type TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_value TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS visitor_logs (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      browser TEXT NOT NULL,
      os TEXT NOT NULL,
      device TEXT NOT NULL,
      resolution TEXT NOT NULL,
      language TEXT NOT NULL,
      timezone TEXT NOT NULL,
      isp TEXT NOT NULL,
      visit_time TEXT NOT NULL,
      last_visit TEXT NOT NULL,
      referral TEXT NOT NULL,
      current_page TEXT NOT NULL,
      session_duration INTEGER NOT NULL DEFAULT 5,
      returning_visitor INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_visitors_time ON visitor_logs(visit_time DESC)`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      ip TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS mail_logs (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_id TEXT NOT NULL DEFAULT '',
      error_msg TEXT NOT NULL DEFAULT '',
      timestamp TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mail_logs_time ON mail_logs(timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      subscribed_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS cms_records (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cms_collection ON cms_records(collection, sort_order, created_at)`,

    `CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ];

  for (const sql of schemaStatements) {
    await db.execute(sql);
  }

  await bootstrapAdminFromEnv();
  await seedInitialPlatformContentIfEmpty();

  console.log(
    `✅ Turso / LibSQL database initialized (${databaseMode === "CONNECTED" ? "Remote Turso Cloud" : "Local LibSQL Engine"})`
  );
}

async function bootstrapAdminFromEnv(): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const adminUsername = (process.env.ADMIN_USERNAME || "thamjj13_admin").trim();
  const adminPhone = (process.env.ADMIN_PHONE || "+65 09638233943").trim();

  if (!adminEmail || !adminPassword) {
    return;
  }

  const db = getTursoClient();
  const existing = await db.execute({
    sql: `SELECT id, role FROM users WHERE LOWER(email) = ? LIMIT 1`,
    args: [adminEmail],
  });

  const now = new Date().toISOString();

  if (existing.rows.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const id = `admin-${crypto.randomUUID().slice(0, 8)}`;

    // Ensure unique username
    const usernameCheck = await db.execute({
      sql: `SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1`,
      args: [adminUsername.toLowerCase()],
    });
    const finalUsername =
      usernameCheck.rows.length === 0
        ? adminUsername
        : `${adminUsername}_${Math.floor(100 + Math.random() * 900)}`;

    await db.execute({
      sql: `INSERT INTO users (
        id, username, email, password_hash, role, approved, email_verified,
        phone, address, profile_picture, login_history_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, '[]', ?, ?)`,
      args: [
        id,
        finalUsername,
        adminEmail,
        passwordHash,
        UserRole.SUPER_ADMIN,
        adminPhone,
        "SLA Marina Bay Command Center, Singapore",
        "",
        now,
        now,
      ],
    });

    await writeAuditLog("SYSTEM_BOOTSTRAP", `Bootstrapped Super Admin (${adminEmail}) from environment configuration`, "127.0.0.1");
  } else if (process.env.ADMIN_SYNC_PASSWORD === "true") {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.execute({
      sql: `UPDATE users SET password_hash = ?, role = ?, approved = 1, email_verified = 1, updated_at = ? WHERE id = ?`,
      args: [passwordHash, UserRole.SUPER_ADMIN, now, String(existing.rows[0].id)],
    });
  } else {
    await db.execute({
      sql: `UPDATE users SET role = ?, approved = 1, email_verified = 1, updated_at = ? WHERE id = ?`,
      args: [UserRole.SUPER_ADMIN, now, String(existing.rows[0].id)],
    });
  }
}

async function seedInitialPlatformContentIfEmpty(): Promise<void> {
  if (process.env.SKIP_DEFAULT_SEED === "true") return;

  const alreadySeeded = await getSetting<boolean>("initial_content_seeded_v1");
  if (alreadySeeded) return;

  const db = getTursoClient();
  const now = new Date().toISOString();

  // Seed default courses if empty
  const coursesCount = await db.execute(`SELECT COUNT(*) as cnt FROM courses`);
  if (Number(coursesCount.rows[0]?.cnt || 0) === 0) {
    const initialCourses = [
      {
        id: "course-vapt-mastery",
        title: "Advanced Ethical Hacking & VAPT Mastery",
        description:
          "Hands-on enterprise vulnerability assessment and penetration testing (VAPT) curriculum tailored for critical financial and telecom infrastructure across Singapore and Bangladesh.",
        category: "Penetration Testing",
        level: "Advanced",
        thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800",
        lessons: [
          {
            id: "lesson-vapt-1",
            title: "Enterprise Reconnaissance & Threat Surface Mapping",
            description:
              "Learn rules of engagement, passive OSINT discovery, ASN enumeration, and zero-disruption asset profiling.",
            pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdfName: "THAMJJ13_VAPT_ROE_Guide.pdf",
            video: {
              id: "vid-vapt-1",
              title: "THAMJJ13 VAPT Briefing & Reconnaissance",
              videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
              thumbnail: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800",
              duration: "09:41",
              views: 24,
              likes: 9,
              shares: 2,
              comments: [],
              likedBy: [],
              viewedBy: [],
            },
            assignments: [],
          },
          {
            id: "lesson-vapt-2",
            title: "Stealth Network Scanning & Web API Auditing",
            description:
              "Master SYN stealth scanning, WAF-aware rate control, OWASP API Top 10 testing, and executive remediation reporting.",
            pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdfName: "THAMJJ13_API_Security_Checklist.pdf",
            video: {
              id: "vid-vapt-2",
              title: "Network & API Security Assessment Lab",
              videoUrl: "https://www.w3schools.com/html/movie.mp4",
              thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
              duration: "05:12",
              views: 18,
              likes: 6,
              shares: 1,
              comments: [],
              likedBy: [],
              viewedBy: [],
            },
            assignments: [],
          },
        ],
        mcqTest: {
          id: "mcq-vapt-1",
          passingScore: 2,
          questions: [
            {
              id: "q-1",
              question: "Which Nmap flag performs a half-open TCP SYN stealth scan?",
              options: ["-sS", "-sT", "-sU", "-sA"],
              correctAnswer: 0,
            },
            {
              id: "q-2",
              question: "What distinguishes an authorized Penetration Test from an automated Vulnerability Scan?",
              options: [
                "Listing CVEs without validation",
                "Controlled validation of exploitability and business impact under signed Rules of Engagement",
                "Installing endpoint antivirus agents",
                "Modifying DNS records without approval",
              ],
              correctAnswer: 1,
            },
            {
              id: "q-3",
              question: "Which HTTP response header helps mitigate Cross-Site Scripting (XSS) in modern web apps?",
              options: [
                "X-Powered-By",
                "Content-Security-Policy (CSP)",
                "Accept-Encoding",
                "Cache-Control",
              ],
              correctAnswer: 1,
            },
          ],
        },
      },
      {
        id: "course-soc-ir",
        title: "Enterprise Threat Hunting & Incident Response",
        description:
          "Equip blue-team defenders to hunt Advanced Persistent Threats (APTs), analyze telemetry, isolate compromised hosts, and execute ransomware containment playbooks.",
        category: "Incident Response",
        level: "Expert",
        thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
        lessons: [
          {
            id: "lesson-soc-1",
            title: "Log Forensics, C2 Beacon Detection & Triage",
            description:
              "Inspect packet captures, DNS entropy anomalies, and process trees to identify outbound command-and-control channels.",
            video: {
              id: "vid-soc-1",
              title: "SOC Threat Hunting Live Walkthrough",
              videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
              thumbnail: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
              duration: "08:15",
              views: 15,
              likes: 7,
              shares: 1,
              comments: [],
              likedBy: [],
              viewedBy: [],
            },
            assignments: [],
          },
        ],
        mcqTest: {
          id: "mcq-soc-1",
          passingScore: 2,
          questions: [
            {
              id: "q-soc-1",
              question: "During active ransomware containment, what is the immediate priority after confirming host compromise?",
              options: [
                "Reboot the server repeatedly",
                "Network isolation of affected segments while preserving volatile forensic evidence",
                "Delete system event logs",
                "Disable firewall logging",
              ],
              correctAnswer: 1,
            },
            {
              id: "q-soc-2",
              question: "Which hashing algorithm is recommended for cryptographic evidence integrity verification in FIR reports?",
              options: ["MD4", "CRC32", "SHA-256", "ROT13"],
              correctAnswer: 2,
            },
          ],
        },
      },
    ];

    for (const c of initialCourses) {
      await db.execute({
        sql: `INSERT INTO courses (id, title, description, category, level, thumbnail, lessons_json, mcq_test_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          c.id,
          c.title,
          c.description,
          c.category,
          c.level,
          c.thumbnail,
          JSON.stringify(c.lessons),
          JSON.stringify(c.mcqTest),
          now,
          now,
        ],
      });
    }
  }

  // Seed default CMS content if empty
  const cmsCount = await db.execute(`SELECT COUNT(*) as cnt FROM cms_records`);
  if (Number(cmsCount.rows[0]?.cnt || 0) === 0) {
    const defaultCms: { collection: string; id: string; order: number; data: any }[] = [
      {
        collection: "hero_slides",
        id: "slide-1",
        order: 1,
        data: {
          id: "slide-1",
          title: "Enterprise Offensive Security & Cyber Incident Command",
          subtitle:
            "Protecting critical infrastructure, financial gateways, and digital enterprises across Singapore and Bangladesh with zero-trust VAPT and rapid incident response.",
          bgImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200",
          ctaText: "Explore Security Academy",
          ctaLink: "#courses_ad",
        },
      },
      {
        collection: "services",
        id: "srv-1",
        order: 1,
        data: {
          id: "srv-1",
          icon: "Shield",
          title: "Penetration Testing (VAPT)",
          description:
            "Deep manual & automated offensive security assessments across web applications, APIs, cloud workloads, and internal corporate networks.",
        },
      },
      {
        collection: "services",
        id: "srv-2",
        order: 2,
        data: {
          id: "srv-2",
          icon: "Zap",
          title: "24/7 Cyber Incident & FIR Triage",
          description:
            "Rapid breach containment, digital forensics preservation, and verified incident documentation for regulatory and legal escalation.",
        },
      },
      {
        collection: "services",
        id: "srv-3",
        order: 3,
        data: {
          id: "srv-3",
          icon: "Terminal",
          title: "Red Team & Adversary Simulation",
          description:
            "Full-scope adversary emulation testing SOC detection pipelines, phishing resilience, and zero-trust lateral movement controls.",
        },
      },
      {
        collection: "services",
        id: "srv-4",
        order: 4,
        data: {
          id: "srv-4",
          icon: "Database",
          title: "Cloud & Database Hardening",
          description:
            "Zero-trust architecture reviews, encryption key lifecycle audits, and compliance alignment with ISO/IEC 27001 and CSA standards.",
        },
      },
      {
        collection: "stats",
        id: "stat-1",
        order: 1,
        data: { id: "stat-1", label: "SLA RESPONSE", value: "< 15m", description: "Critical incident triage window" },
      },
      {
        collection: "stats",
        id: "stat-2",
        order: 2,
        data: { id: "stat-2", label: "AUDITS DELIVERED", value: "340+", description: "Enterprise VAPT engagements" },
      },
      {
        collection: "stats",
        id: "stat-3",
        order: 3,
        data: { id: "stat-3", label: "UPTIME INTEGRITY", value: "99.98%", description: "Monitored defensive nodes" },
      },
      {
        collection: "stats",
        id: "stat-4",
        order: 4,
        data: { id: "stat-4", label: "CADETS TRAINED", value: "1,200+", description: "Ethical security practitioners" },
      },
      {
        collection: "alliances",
        id: "all-1",
        order: 1,
        data: { id: "all-1", name: "ISO/IEC 27001 ALIGNED" },
      },
      {
        collection: "alliances",
        id: "all-2",
        order: 2,
        data: { id: "all-2", name: "OWASP ASVS VERIFIED" },
      },
      {
        collection: "alliances",
        id: "all-3",
        order: 3,
        data: { id: "all-3", name: "SINGAPORE-BANGLADESH SOC BRIDGE" },
      },
      {
        collection: "alliances",
        id: "all-4",
        order: 4,
        data: { id: "all-4", name: "ZERO-TRUST CLOUD ARCHITECTURE" },
      },
      {
        collection: "faqs",
        id: "faq-1",
        order: 1,
        data: {
          id: "faq-1",
          q: "How do I report a cyber incident and receive an official case reference?",
          a: "Use the Secure Dispatch / Report a Case form on our homepage. Upon submission, our Turso ledger assigns a unique Case ID (REP-XXXXXX) and dispatches an instant confirmation email from no-reply@thamjj13.top. You will also receive automatic email notifications when investigators update your case or issue a signed FIR.",
        },
      },
      {
        collection: "faqs",
        id: "faq-2",
        order: 2,
        data: {
          id: "faq-2",
          q: "How are Academy certificates verified by employers?",
          a: "Every cadet who passes a course MCQ exam receives a unique cryptographic serial (CERT-THAM-...) stored in our Turso database. Employers can verify authenticity anytime via the public Verification Gate tab.",
        },
      },
      {
        collection: "faqs",
        id: "faq-3",
        order: 3,
        data: {
          id: "faq-3",
          q: "How does Cadet Enlistment approval work?",
          a: "New cadet registrations are securely hashed and queued for review by our Security Board. Once an administrator approves your account, an automated confirmation email is sent from no-reply@thamjj13.top.",
        },
      },
    ];

    for (const item of defaultCms) {
      await db.execute({
        sql: `INSERT INTO cms_records (id, collection, sort_order, data_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [item.id, item.collection, item.order, JSON.stringify(item.data), now, now],
      });
    }
  }

  // Seed default upcoming events if empty
  const eventsCount = await db.execute(`SELECT COUNT(*) as cnt FROM events`);
  if (Number(eventsCount.rows[0]?.cnt || 0) === 0) {
    const defaultEvents = [
      {
        id: "evt-ctf-dhaka",
        title: "CTF Cyber-Siege: Ethical Hacking Arena",
        description:
          "Live Capture-The-Flag offensive & defensive security challenge hosted jointly by Singapore and Dhaka white-hat mentors.",
        date: "2026-11-20",
        time: "18:00 UTC+6 (Dhaka)",
        location: "Dhaka & Singapore Live Bridge",
        type: "CTF Hacking Challenge",
      },
      {
        id: "evt-ransomware-brief",
        title: "Enterprise Ransomware Readiness & Zero-Trust Briefing",
        description:
          "Executive technical briefing for CISOs, DevOps engineers, and SOC analysts covering cloud incident containment.",
        date: "2026-12-05",
        time: "14:00 SGT (Singapore)",
        location: "Marina Bay Command Stream",
        type: "Live Training",
      },
    ];
    for (const ev of defaultEvents) {
      await db.execute({
        sql: `INSERT INTO events (id, title, description, date, time, location, type, link, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`,
        args: [ev.id, ev.title, ev.description, ev.date, ev.time, ev.location, ev.type, now],
      });
    }
  }

  await setSetting("initial_content_seeded_v1", true);
}

export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  const db = getTursoClient();
  const res = await db.execute({
    sql: `SELECT value_json FROM system_settings WHERE key = ? LIMIT 1`,
    args: [key],
  });
  if (res.rows.length === 0) return defaultValue;
  try {
    return JSON.parse(String(res.rows[0].value_json)) as T;
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  const db = getTursoClient();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO system_settings (key, value_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    args: [key, JSON.stringify(value), now],
  });
}

export async function writeAuditLog(userName: string, action: string, ip: string): Promise<void> {
  try {
    const db = getTursoClient();
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO audit_logs (id, user_name, action, ip, timestamp) VALUES (?, ?, ?, ?, ?)`,
      args: [id, userName || "system", action, ip || "127.0.0.1", now],
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export function rowToUserProfile(row: any): UserProfile {
  let loginHistory = [];
  try {
    loginHistory = JSON.parse(String(row.login_history_json || "[]"));
  } catch {
    loginHistory = [];
  }
  const profilePicture = String(row.profile_picture || "");
  const address = String(row.address || "");
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    role: String(row.role) as UserRole,
    approved: Boolean(Number(row.approved)),
    emailVerified: Boolean(Number(row.email_verified)),
    phone: String(row.phone || ""),
    address,
    bio: address,
    profilePicture,
    avatarUrl: profilePicture,
    createdAt: String(row.created_at),
    loginHistory,
  };
}
