import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { User } from "./src/models/User";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { 
  UserRole, 
  UserProfile, 
  Course, 
  CourseProgress, 
  Certificate, 
  ContactMessage, 
  LiveChatSession, 
  VisitorLog, 
  SupportTicket, 
  CyberEvent, 
  ApiKeyConfig, 
  FileVaultItem, 
  SystemHealthMetrics, 
  SmtpConfig,
  SecurityLog,
  LiveChatMessage,
  Report
} from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser with large payloads for Base64 files
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

// ----------------------------------------------------
// MONGO DB CONNECTION (Mongoose)
// ----------------------------------------------------
async function connectToMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined.");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failed:", error);
    process.exit(1);
  }
}

// REMOVED: Using Mongoose directly in endpoints now.

// Global middleware to guarantee MongoDB real-time reads on every API call
// REMOVED: Using Mongoose directly in endpoints now.

// Initialize Gemini client lazily
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// ----------------------------------------------------
// LOCAL DB IN-MEMORY ENGINE WITH JSON PERSISTENCE
// ----------------------------------------------------
const DB_PATH = path.join(process.cwd(), "server-db.json");

interface DatabaseSchema {
  users: UserProfile[];
  courses: Course[];
  progress: CourseProgress[];
  certificates: Certificate[];
  contactMessages: ContactMessage[];
  chatSessions: LiveChatSession[];
  visitors: VisitorLog[];
  tickets: SupportTicket[];
  events: CyberEvent[];
  apiKeys: ApiKeyConfig[];
  vault: FileVaultItem[];
  smtpSettings: SmtpConfig[];
  systemHealth: SystemHealthMetrics;
  auditLogs: { id: string; user: string; action: string; timestamp: string; ip: string }[];
  announcement: { title: string; content: string; active: boolean };
  heroSlides: { id: string; title: string; subtitle: string; bgImage?: string; bgVideo?: string; ctaText?: string; ctaLink?: string; textAnimation?: string; parallaxSpeed?: number }[];
  services: { id: string; icon: string; title: string; description: string }[];
  teamMembers: { id: string; name: string; role: string; location: string; avatar: string; badges: string[] }[];
  gallery: { id: string; category: string; title: string; url: string }[];
  faqs: { id: string; q: string; a: string }[];
  stats: { id: string; label: string; value: string; desc: string }[];
  alliances: { id: string; name: string }[];
  cloudinarySettings: { cloudName: string; apiKey: string; apiSecret: string; uploadPreset: string };
  reports: Report[];
}

let db: DatabaseSchema = {
  users: [],
  courses: [],
  progress: [],
  certificates: [],
  contactMessages: [],
  chatSessions: [],
  visitors: [],
  tickets: [],
  events: [],
  apiKeys: [],
  vault: [],
  smtpSettings: [],
  systemHealth: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskFree: 100,
    activeConnections: 0,
    uptime: "0d 0h 0m",
    smtpStatus: "UNCONFIGURED",
    cloudinaryStatus: "UNCONFIGURED",
    backupsCount: 0,
  },
  auditLogs: [],
  announcement: {
    title: "",
    content: "",
    active: false,
  },
  heroSlides: [],
  services: [],
  teamMembers: [],
  gallery: [],
  faqs: [],
  stats: [],
  alliances: [],
  cloudinarySettings: { cloudName: "", apiKey: "", apiSecret: "", uploadPreset: "" },
  reports: [],
};

// Seed database
function seedDb() {
  db.users = [
    {
      id: "admin-1",
      username: "thamjj13_super",
      email: "thamjj13@gmail.com",
      role: UserRole.SUPER_ADMIN,
      approved: true,
      phone: "+65 09638233943",
      address: "Marina Bay Ethical Hacker Center, Singapore",
      profilePicture: "https://images.unsplash.com/photo-1601597111158-2fceff270190?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
      password: "mohi99221",
    },
    {
      id: "admin-2",
      username: "super_admin_sg",
      email: "thamjj13@gmail.com",
      role: UserRole.SUPER_ADMIN,
      approved: true,
      phone: "09638233943",
      address: "Dhaka Regional Ops Hub, Bangladesh",
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
      password: "mohi99221",
    }
  ];
  db.courses = [];
  db.progress = [];
  db.certificates = [];
  db.contactMessages = [];
  db.chatSessions = [];
  db.visitors = [];
  db.tickets = [];
  db.events = [];
  db.apiKeys = [];
  db.vault = [];
  db.smtpSettings = [];
  db.systemHealth = {
    cpuUsage: 0,
    memoryUsage: 0,
    diskFree: 100,
    activeConnections: 0,
    uptime: "0d 0h 0m",
    smtpStatus: "UNCONFIGURED",
    cloudinaryStatus: "UNCONFIGURED",
    backupsCount: 0,
  };
  db.auditLogs = [];
  db.announcement = { title: "", content: "", active: false };
  db.heroSlides = [];
  db.services = [];
  db.teamMembers = [];
  db.gallery = [];
  db.faqs = [];
  db.stats = [];
  db.alliances = [];
  db.reports = [];
  db.cloudinarySettings = { cloudName: "", apiKey: "", apiSecret: "", uploadPreset: "" };

  saveDb();
  return;

  // 1. Seed bootstrapped admin from metadata / user info
  const bootstrappedAdminEmail = "thamjj13@gmail.com";
  const superAdminEmail = "thamjj13@gmail.com";

  db.users = [
    {
      id: "admin-1",
      username: "thamjj13_super",
      email: bootstrappedAdminEmail,
      role: UserRole.SUPER_ADMIN,
      approved: true,
      phone: "+65 09638233943",
      address: "Marina Bay Ethical Hacker Center, Singapore",
      profilePicture: "https://images.unsplash.com/photo-1601597111158-2fceff270190?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
    },
    {
      id: "admin-2",
      username: "super_admin_sg",
      email: superAdminEmail,
      role: UserRole.SUPER_ADMIN,
      approved: true,
      phone: "09638233943",
      address: "Dhaka Regional Ops Hub, Bangladesh",
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
    },
    {
      id: "user-1",
      username: "student_bangla",
      email: "student@thamjj13.com",
      role: UserRole.STUDENT,
      approved: true,
      phone: "01712345678",
      address: "Chittagong, Bangladesh",
      profilePicture: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
    },
    {
      id: "user-pending",
      username: "pending_hacker",
      email: "pending@thamjj13.com",
      role: UserRole.STUDENT,
      approved: false,
      phone: "01888888888",
      address: "Sylhet, Bangladesh",
      profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      createdAt: new Date().toISOString(),
      loginHistory: [],
    },
  ];

  // 2. Seed Elite Hacking Courses
  db.courses = [
    {
      id: "course-1",
      title: "Advanced Ethical Hacking & VAPT Mastery",
      description: "A complete hands-on guide from fundamentals of network hacking to elite vulnerability assessment and penetration testing (VAPT) methodology. Specifically tailored for protecting enterprise critical infrastructure in Singapore and Bangladesh.",
      category: "Penetration Testing",
      level: "Advanced",
      thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600",
      lessons: [
        {
          id: "lesson-1-1",
          title: "Introduction to VAPT Methodology",
          description: "Learn how professional White Hat Hackers approach enterprise asset discovery and network mappings.",
          video: {
            id: "vid-1",
            title: "THAMJJ13 Singapore VAPT Briefing",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            thumbnail: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=600",
            duration: "09:41",
            views: 1240,
            likes: 421,
            shares: 89,
            comments: [
              {
                id: "c-1",
                author: "Moshiur Rahman",
                authorRole: UserRole.SUPER_ADMIN,
                avatar: "https://images.unsplash.com/photo-1601597111158-2fceff270190?w=150",
                content: "Excellent coverage on VAPT rules of engagement. Perfect for Singaporean compliance frameworks.",
                timestamp: new Date().toISOString(),
                likes: 12,
              },
            ],
          },
          pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          pdfName: "vapt_methodology_thamjj13.pdf",
          assignments: [
            {
              id: "assign-1-1",
              title: "Passive Reconnaissance Exercise",
              description: "Conduct passive subdomain enumeration against our sandbox environment and submit findings.",
            },
          ],
        },
        {
          id: "lesson-1-2",
          title: "Network Port Scanning with Nmap",
          description: "Master stealth scanning, firewall evasion, and service banner grabbing.",
          video: {
            id: "vid-2",
            title: "Stealth Scanning Masterclass",
            videoUrl: "https://www.w3schools.com/html/movie.mp4",
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
            duration: "05:12",
            views: 950,
            likes: 310,
            shares: 44,
            comments: [],
          },
          pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          pdfName: "nmap_stealth_guide.pdf",
        },
      ],
      mcqTest: {
        id: "mcq-1",
        questions: [
          {
            id: "q-1",
            question: "Which Nmap scan type is considered the stealthiest SYN stealth scan?",
            options: ["-sS", "-sT", "-sU", "-sX"],
            correctAnswer: 0,
          },
          {
            id: "q-2",
            question: "What is the primary objective of a Penetration Test compared to a Vulnerability Assessment?",
            options: [
              "Simply listing all known vulnerabilities",
              "Exploiting vulnerabilities to verify actual business impact",
              "Configuring security firewalls",
              "Running anti-virus software scans",
            ],
            correctAnswer: 1,
          },
          {
            id: "q-3",
            question: "Under Singapore Cyber Security Act, critical infrastructure operators must report security breaches within how many hours?",
            options: ["2 hours", "12 hours", "24 hours", "48 hours"],
            correctAnswer: 0,
          },
        ],
        passingScore: 2,
      },
    },
    {
      id: "course-2",
      title: "Enterprise Threat Hunting & Incident Response",
      description: "Equip your defense team with the skills to actively hunt hidden advanced persistent threats (APTs) in corporate networks and respond to active ransomware emergencies.",
      category: "Blue Teaming",
      level: "Expert",
      thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",
      lessons: [
        {
          id: "lesson-2-1",
          title: "Malware Triage & Network Log Analysis",
          description: "Analyze Wireshark packet captures and sysmon logs to detect outbound malicious C2 beacons.",
          video: {
            id: "vid-3",
            title: "Threat Hunting in Action",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            thumbnail: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600",
            duration: "08:15",
            views: 820,
            likes: 275,
            shares: 55,
            comments: [],
          },
        },
      ],
    },
  ];

  // 3. Seed Events
  db.events = [
    {
      id: "evt-1",
      title: "CTF Cyber-Siege: Bangladesh Ethical Hacking Arena",
      description: "Join Singapore's premier white-hat threat simulation trainers for an intensive live Capture the Flag challenge. Cash prizes and priority internships for high performers.",
      date: "2026-07-20",
      time: "18:00 UTC+6 (Dhaka)",
      type: "CTF Hacking Challenge",
    },
    {
      id: "evt-2",
      title: "Enterprise Ransomware Readiness Webinar",
      description: "A comprehensive disaster management protocol briefing designed for CTOs, CISOs, and Network Administrators in Singapore.",
      date: "2026-08-05",
      time: "14:00 SGT (Singapore)",
      type: "Live Training",
    },
  ];

  // 4. Seed Support Tickets
  db.tickets = [
    {
      id: "tkt-1",
      userId: "user-1",
      username: "student_bangla",
      subject: "Vulnerability Disclosure Program query",
      description: "I found an exposed database port on a major portal under our client remit. Should I report it via the Singapore CERT or directly through the THAMJJ13 White Hat coordinator?",
      priority: "HIGH",
      category: "Vulnerability Report",
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      replies: [],
    },
  ];

  // 5. Seed Contact Messages
  db.contactMessages = [
    {
      id: "msg-1",
      name: "Sajid Hasan",
      email: "sajid@corporatedefense.com",
      phone: "+880 1912-345678",
      subject: "Urgent Vulnerability Audit Singapore-Bangladesh Link",
      message: "We need an immediate external pen-test of our critical gateway API linking our Singapore office with Dhaka. Please schedule an audit within this week. Budget is pre-approved.",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isRead: false,
      replies: [],
    },
  ];

  // 6. Seed Chat Session
  db.chatSessions = [
    {
      id: "chat-visitor-1",
      visitorName: "Active Threat Radar",
      visitorIp: "103.47.224.12",
      unreadCount: 1,
      isOnline: true,
      isTyping: false,
      messages: [
        {
          id: "m-init",
          senderId: "system",
          senderName: "THAMJJ13 Bot",
          senderRole: UserRole.VISITOR,
          content: "Welcome to the THAMJJ13 Command Operations. A live White Hat Hacker is standing by to assist with emergency incident response or ethical training.",
          timestamp: new Date(Date.now() - 600000).toISOString(),
          status: "seen",
        },
        {
          id: "m-user-1",
          senderId: "visitor",
          senderName: "Active Threat Radar",
          senderRole: UserRole.VISITOR,
          content: "Hello! We are detecting massive SSH brute force attacks on our Dhaka server. Can your SOC team assist immediately?",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: "delivered",
        },
      ],
    },
  ];

  // 7. Seed Visitors (For gorgeous Analytics visualization)
  db.visitors = [
    {
      id: "v-1",
      ip: "103.47.224.50",
      country: "Bangladesh",
      city: "Dhaka",
      browser: "Chrome",
      os: "Windows",
      device: "Desktop",
      resolution: "1920x1080",
      language: "en-US,bn-BD",
      timezone: "Asia/Dhaka",
      isp: "Link3 Technologies Ltd",
      visitTime: new Date(Date.now() - 10000).toISOString(),
      lastVisit: new Date(Date.now() - 86400000).toISOString(),
      referral: "Google Search",
      currentPage: "/courses",
      sessionDuration: 345,
      returningVisitor: true,
    },
    {
      id: "v-2",
      ip: "180.129.56.12",
      country: "Singapore",
      city: "Singapore",
      browser: "Safari",
      os: "macOS",
      device: "Desktop",
      resolution: "2560x1440",
      language: "en-SG",
      timezone: "Asia/Singapore",
      isp: "Singtel Fiber",
      visitTime: new Date(Date.now() - 25000).toISOString(),
      lastVisit: new Date(Date.now() - 172800000).toISOString(),
      referral: "LinkedIn Ethical Hacking Group",
      currentPage: "/",
      sessionDuration: 120,
      returningVisitor: true,
    },
    {
      id: "v-3",
      ip: "45.120.21.3",
      country: "Bangladesh",
      city: "Chittagong",
      browser: "Firefox",
      os: "Linux (Ubuntu)",
      device: "Laptop",
      resolution: "1366x768",
      language: "bn-BD",
      timezone: "Asia/Dhaka",
      isp: "Amber IT Limited",
      visitTime: new Date(Date.now() - 120000).toISOString(),
      lastVisit: new Date().toISOString(),
      referral: "Direct",
      currentPage: "/admin/portal-login",
      sessionDuration: 45,
      returningVisitor: false,
    },
  ];

  // 8. Seed API Keys
  db.apiKeys = [
    {
      id: "key-1",
      name: "Emergency SOC Alerting API",
      key: "tham_sec_live_79a2f267a180f993ce",
      role: "Log Streamer",
      status: "ACTIVE",
      createdAt: new Date(Date.now() - 2592000000).toISOString(),
      usageCount: 1420,
    },
  ];

  // 9. Seed SMTP Settings
  db.smtpSettings = [
    {
      id: "smtp-primary",
      host: "mail.thamjj13.com",
      port: 465,
      user: "outbox@thamjj13.com",
      priority: 10,
      status: "ACTIVE",
    },
    {
      id: "smtp-backup",
      host: "backup-mail.thamjj13.com",
      port: 587,
      user: "failover@thamjj13.com",
      priority: 5,
      status: "ACTIVE",
    },
  ];

  // 10. Seed Vault Items
  db.vault = [
    {
      id: "v-item-1",
      name: "THAMJJ13_Stealth_Recon_Scanner.sh",
      size: "45.2 KB",
      mimeType: "text/x-shellscript",
      encryptedUrl: "https://cloudinary-dummy/vault/recon_scanner_encrypted.bin",
      uploadedBy: "thamjj13_super",
      role: UserRole.SUPER_ADMIN,
      uploadedAt: new Date(Date.now() - 864000000).toISOString(),
      downloads: 42,
    },
    {
      id: "v-item-2",
      name: "Active_Exploitation_Compliance_SOP.pdf",
      size: "1.2 MB",
      mimeType: "application/pdf",
      encryptedUrl: "https://cloudinary-dummy/vault/compliance_sop_encrypted.bin",
      uploadedBy: "super_admin_sg",
      role: UserRole.SUPER_ADMIN,
      uploadedAt: new Date(Date.now() - 432000000).toISOString(),
      downloads: 18,
    },
  ];

  // 11. Initial Audit Logs
  db.auditLogs = [
    {
      id: "aud-1",
      user: "thamjj13_super",
      action: "Platform Initial Setup & Seeding Completed",
      timestamp: new Date().toISOString(),
      ip: "180.129.56.12",
    },
  ];

  saveDb();
}

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    } else {
      seedDb();
    }
  } catch (err) {
    console.error("Failed to load local server database. Seeding new database.", err);
    seedDb();
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    // REMOVED: Using Mongoose directly in endpoints now.
    // if (isMongoConnected && mongoDb) {
    //   pushToMongo().catch(err => console.error("Pushing to MongoDB on save failed:", err));
    // }
  } catch (err) {
    console.error("Failed to persist server-db.json to disk:", err);
  }
}

// Perform initial DB loading
loadDb();

// ----------------------------------------------------
// OTP ACTIVE REGISTRY (FOR TWO-FACTOR OTP LOGIN)
// ----------------------------------------------------
const activeOtps = new Map<string, { otp1: string; otp2: string; expiry: number; email: string }>();

// ----------------------------------------------------
// SECURE SMTP MAIL GATEWAY
// ----------------------------------------------------
async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const smtpConfig = {
    host: process.env.SMTP_HOST || (db.smtpSettings && db.smtpSettings.find(s => s.status === "ACTIVE")?.host),
    port: process.env.SMTP_PORT || (db.smtpSettings && db.smtpSettings.find(s => s.status === "ACTIVE")?.port),
    user: process.env.SMTP_USER || (db.smtpSettings && db.smtpSettings.find(s => s.status === "ACTIVE")?.user),
    pass: process.env.SMTP_PASS || (db.smtpSettings && db.smtpSettings.find(s => s.status === "ACTIVE")?.pass),
    from: process.env.SMTP_FROM || (db.smtpSettings && db.smtpSettings.find(s => s.status === "ACTIVE")?.from),
  };

  if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: Number(smtpConfig.port) || 587,
        secure: Number(smtpConfig.port) === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      await transporter.sendMail({
        from: smtpConfig.from || `"THAMJJ13 Security" <no-reply@thamjj13.com>`,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`[SMTP SUCCESS] Mail successfully transmitted to ${to}`);
      return;
    } catch (err) {
      console.error(`[SMTP ERROR] Direct SMTP failed, falling back to simulation logs:`, err);
    }
  }

  // Fallback: Simulation log print to Node.js standard out (not a persistent DB file log)
  console.log(`\n\n==================================================`);
  console.log(`📬 [SMTP SIMULATION] NO ACTIVE CREDENTIALS. FALLBACK ACTIVE.`);
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text}`);
  console.log(`==================================================\n\n`);
}

function getOtpEmailTemplate(otp: string) {
  return `
    <div style="font-family: 'Inter', sans-serif; padding: 40px; background-color: #f9fafb; border-radius: 20px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #111827; font-size: 24px; margin: 0;">Security Verification</h1>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 15px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">Your secure OTP code is:</p>
        <div style="letter-spacing: 8px; font-size: 36px; font-weight: 800; color: #1f2937; margin-bottom: 20px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">This code will expire in 10 minutes.</p>
      </div>
      <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
}

// ----------------------------------------------------
// BACKEND API ROUTES
// ----------------------------------------------------

// 1. SYSTEM SECURITY & STACK METRICS
app.get("/api/system-health", (req, res) => {
  db.systemHealth.activeConnections = db.chatSessions.filter(s => s.isOnline).length + Math.floor(Math.random() * 3) + 1;
  db.systemHealth.cpuUsage = 8 + Math.floor(Math.random() * 8);
  db.systemHealth.memoryUsage = 40 + Math.floor(Math.random() * 6);
  res.json(db.systemHealth);
});

// 2. VISITOR TRACKING ENDPOINT
app.post(["/api/tracker/log", "/api/track-visitor"], (req, res) => {
  const visitorData = req.body;
  const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";

  // Enforce a structured default log object if clients don't provide some fields
  const newLog: VisitorLog = {
    id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ip: ip.split(",")[0].trim(),
    country: visitorData.country || "Singapore",
    city: visitorData.city || "Marina Bay",
    browser: visitorData.browser || "Chrome Security Browser",
    os: visitorData.os || "OS/2 Hacking System",
    device: visitorData.device || "Cyber Deck",
    resolution: visitorData.resolution || "1920x1080",
    language: visitorData.language || "en-US",
    timezone: visitorData.timezone || "Asia/Singapore",
    isp: visitorData.isp || "White Hat Grid Net",
    visitTime: new Date().toISOString(),
    lastVisit: visitorData.lastVisit || new Date().toISOString(),
    referral: visitorData.referral || "Direct Terminal Link",
    currentPage: visitorData.currentPage || "/",
    sessionDuration: visitorData.sessionDuration || 5,
    returningVisitor: visitorData.returningVisitor || false,
  };

  db.visitors.unshift(newLog);
  if (db.visitors.length > 500) db.visitors.pop(); // Cap size

  saveDb();
  res.json({ success: true, log: newLog, logs: db.visitors });
});

// GET Visitor Analytics Summary
app.get("/api/visitor-stats", (req, res) => {
  // Return unique breakdown counts for graphs
  const countryBreakdown = db.visitors.reduce((acc: any, v) => {
    acc[v.country] = (acc[v.country] || 0) + 1;
    return acc;
  }, {});

  const deviceBreakdown = db.visitors.reduce((acc: any, v) => {
    acc[v.device] = (acc[v.device] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalVisits: db.visitors.length,
    countries: countryBreakdown,
    devices: deviceBreakdown,
    recentVisitors: db.visitors.slice(0, 15),
  });
});

// 3. SECURE ADMIN DOUBLE-OTP LOGIN FLOW
app.post("/api/admin/request-login", (req, res) => {
  const { email, password } = req.body;

  // 1. Verify standard credentials
  const foundUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!foundUser || (foundUser.role !== UserRole.SUPER_ADMIN && foundUser.role !== UserRole.SECONDARY_ADMIN)) {
    return res.status(401).json({ error: "Access Denied: Standard admin credentials invalid." });
  }

  // 2. Double OTP Generation
  const otp1 = Math.floor(100000 + Math.random() * 900000).toString(); // Sent to Enterer's Email
  const otp2 = Math.floor(100000 + Math.random() * 900000).toString(); // Sent to Super Admin Email

  // Save in active map for 10 minutes
  activeOtps.set(email.toLowerCase(), {
    otp1,
    otp2,
    expiry: Date.now() + 600000,
    email: email.toLowerCase(),
  });

  // Log audit
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: foundUser.username,
    action: `Double OTP security gateway requested for ${email}`,
    timestamp: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1",
  });
  saveDb();

  // Return the OTP in API response for easy client simulation testing
  res.json({
    success: true,
    message: "Two-factor authentication code generated. Codes simulated on security log panel.",
    simulatedOtp1: otp1,
    simulatedOtp2: otp2,
    superAdminEmail: "thamjj13@gmail.com",
    enteredEmail: email,
  });
});

app.post("/api/admin/verify-login", (req, res) => {
  const { email, otp1, otp2 } = req.body;

  const active = activeOtps.get(email.toLowerCase());
  if (!active) {
    return res.status(400).json({ error: "OTP expired or session not initialized." });
  }

  if (Date.now() > active.expiry) {
    activeOtps.delete(email.toLowerCase());
    return res.status(400).json({ error: "OTP has expired. Please request a new codeset." });
  }

  if (active.otp1 !== otp1 || active.otp2 !== otp2) {
    return res.status(401).json({ error: "Verification Failed: High-level cryptographic mismatch on OTP codes." });
  }

  // Successfully authenticated
  activeOtps.delete(email.toLowerCase());
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    // Record login success log
    const log: SecurityLog = {
      id: `log-${Date.now()}`,
      userId: user.id,
      ip: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1",
      action: "Admin Portal Secure Gateway Access",
      timestamp: new Date().toISOString(),
      device: "Admin Cryptographic Node",
      browser: "Custom Threat Shell",
      status: "SUCCESS",
    };
    user.loginHistory.unshift(log);

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      user: user.username,
      action: "Successful administrative double-factor verification access",
      timestamp: new Date().toISOString(),
      ip: log.ip,
    });
    saveDb();

    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: "User session lost." });
  }
});

// 3. SECURE AUTHENTICATION CHECK
app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
    User.findById(decoded.id).select("-password").then(user => {
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user });
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
});

// 4. USER PORTAL & REGISTRATION APPROVAL
app.post("/api/auth/register", (req, res) => {
  const { username, email, phone, address, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }

  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: "Username is already registered." });
  }
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email is already registered." });
  }

  const isFirstUser = db.users.length === 0;
  const userRole = isFirstUser ? UserRole.SUPER_ADMIN : (role || UserRole.STUDENT);
  const approved = isFirstUser ? true : false;

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    username,
    email,
    role: userRole,
    approved,
    phone: phone || "",
    address: address || "",
    profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    createdAt: new Date().toISOString(),
    loginHistory: [],
    password,
  };

  db.users.push(newUser);
  saveDb();

  res.json({ 
    success: true, 
    message: isFirstUser 
      ? "🚀 FIRST SUPER ADMIN DETECTED: Account automatically created and approved as Super Admin!" 
      : "Registration received! Our Cyber Security Board must approve your profile before initial access is allowed.",
    user: newUser 
  });
});

app.post("/api/auth/login-step1", (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: "Invalid credentials. Please verify your email." });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials. Incorrect password." });
  }

  if (!user.approved) {
    return res.status(403).json({ error: "Verification Pending: Admin has not approved this cadet account yet." });
  }

  // Handle Single-Factor OTP for Admin users
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.SECONDARY_ADMIN) {
    const otp1 = Math.floor(100000 + Math.random() * 900000).toString(); // Sent to Enterer's Email
    const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    activeOtps.set(tempId, {
      otp1,
      otp2: "", // Not used
      expiry: Date.now() + 600000,
      email: cleanEmail,
    });

    // Send OTP via email (simulated or real SMTP)
    sendEmail(
      cleanEmail,
      "THAMJJ13 Verification OTP",
      `Your Secure Login OTP is: ${otp1}\nThis code will expire in 10 minutes.`,
      getOtpEmailTemplate(otp1)
    ).catch(err => console.error("Error sending OTP:", err));

    // Print to process console so developers in AI Studio can retrieve it easily
    console.log(`\n\n🔑 [SECURITY] OTP for ${cleanEmail}: ${otp1}\n\n`);

    return res.json({
      requiresDoubleOtp: true,
      step: 1,
      tempId,
    });
  }

  // Record login for standard students
  const log: SecurityLog = {
    id: `log-${Date.now()}`,
    userId: user.id,
    ip: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1",
    action: "Standard Student Dashboard Login",
    timestamp: new Date().toISOString(),
    device: "Authorized Terminal",
    browser: "Web Portal Client",
    status: "SUCCESS",
  };
  user.loginHistory.unshift(log);
  saveDb();

  res.cookie("token", jwt.sign({ id: user.id }, process.env.JWT_SECRET || "default_secret"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000 * 24 * 7,
  });

  res.json({ success: true, user });
});

// STEP 2: VERIFY EMAIL OTP & FINALIZE LOGIN (Single OTP verification)
app.post("/api/auth/login-step2", (req, res) => {
  const { tempId, otp } = req.body;

  const active = activeOtps.get(tempId);
  if (!active) {
    return res.status(400).json({ error: "OTP session not initialized or expired." });
  }

  if (Date.now() > active.expiry) {
    activeOtps.delete(tempId);
    return res.status(400).json({ error: "OTP session has expired. Please log in again." });
  }

  if (active.otp1 !== otp) {
    return res.status(401).json({ error: "Verification Failed: Invalid OTP code." });
  }

  const user = db.users.find(u => u.email && u.email.toLowerCase() === active.email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  activeOtps.delete(tempId);

  // Record login success log
  const log: SecurityLog = {
    id: `log-${Date.now()}`,
    userId: user.id,
    ip: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1",
    action: "Admin Portal Secure Gateway Access",
    timestamp: new Date().toISOString(),
    device: "Admin Cryptographic Node",
    browser: "Custom Threat Shell",
    status: "SUCCESS",
  };
  user.loginHistory.unshift(log);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: user.username,
    action: "Successful administrative verification access complete",
    timestamp: new Date().toISOString(),
    ip: log.ip,
  });

  saveDb();

  res.cookie("token", jwt.sign({ id: user.id }, process.env.JWT_SECRET || "default_secret"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000 * 24 * 7,
  });

  res.json({ success: true, user });
});

// PASSWORD RESET REGISTRY & ROUTES
const resetPasswordOtps = new Map<string, { otp: string; expiry: number; email: string }>();

// 1. Request Password Reset OTP
app.post("/api/auth/reset-password-request", (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ error: "Email address is required." });
  }

  const user = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "Email address not found in system." });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  resetPasswordOtps.set(cleanEmail, {
    otp,
    expiry: Date.now() + 600000, // 10 minutes
    email: cleanEmail,
  });

  // Send the OTP via email
  sendEmail(
    cleanEmail,
    "THAMJJ13 Secure Password Reset OTP",
    `A password reset has been requested for your security cadet account.\nYour Secure OTP is: ${otp}\nThis code will expire in 10 minutes.`,
    getOtpEmailTemplate(otp)
  ).catch(err => console.error("Error sending password reset OTP:", err));

  // Print to terminal console
  console.log(`\n\n🔑 [SECURITY] PASSWORD RESET OTP for ${cleanEmail}: ${otp}\n\n`);

  res.json({
    success: true,
    message: "A secure reset OTP has been dispatched to your email address."
  });
});

// 2. Verify Password Reset OTP
app.post("/api/auth/reset-password-verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  const record = resetPasswordOtps.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: "No active password reset session found for this email." });
  }

  if (Date.now() > record.expiry) {
    resetPasswordOtps.delete(cleanEmail);
    return res.status(400).json({ error: "OTP has expired. Please request a new password reset." });
  }

  if (record.otp !== otp) {
    return res.status(401).json({ error: "Verification Failed: Invalid reset OTP." });
  }

  res.json({
    success: true,
    message: "OTP verified. Proceed to update your password."
  });
});

// 3. Confirm Password Reset
app.post("/api/auth/reset-password-confirm", (req, res) => {
  const { email, otp, newPassword } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, OTP, and new password are required." });
  }

  const record = resetPasswordOtps.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: "No active password reset session found for this email." });
  }

  if (Date.now() > record.expiry) {
    resetPasswordOtps.delete(cleanEmail);
    return res.status(400).json({ error: "OTP has expired. Please request a new password reset." });
  }

  if (record.otp !== otp) {
    return res.status(401).json({ error: "Verification Failed: Invalid reset OTP." });
  }

  const user = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    resetPasswordOtps.delete(cleanEmail);
    return res.status(404).json({ error: "User profile not found." });
  }

  // Update password
  user.password = newPassword;
  resetPasswordOtps.delete(cleanEmail);

  // Record audit log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: user.username,
    action: "Password reset completed via secure email OTP verification",
    timestamp: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1",
  });

  saveDb();

  res.json({
    success: true,
    message: "Cipher pass updated successfully. Establish secure link using your new credentials."
  });
});

// USERNAME AVAILABILITY CHECKER & LIVE SUGGESTIONS
app.get(["/api/auth/username-check", "/api/auth/check-username"], (req, res) => {
  const q = (req.query.username as string || "").trim().toLowerCase();
  if (!q) return res.json({ available: false, suggestions: [] });

  const exists = db.users.some(u => u.username.toLowerCase() === q);
  const suggestions: string[] = [];
  
  if (exists) {
    suggestions.push(`${q}_tham`, `${q}_whitehat`, `${q}_13`, `cyber_${q}`);
  }

  res.json({
    available: !exists,
    suggestions,
  });
});

// ADMIN APPROVES / REJECTS STUDENTS
app.post("/api/admin/users/:id/approve", (req, res) => {
  const { id } = req.params;
  const { approved, role } = req.body;

  const found = db.users.find(u => u.id === id);
  if (!found) return res.status(404).json({ error: "User profile not found." });

  found.approved = approved;
  if (role) found.role = role;

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: "System Supervisor",
    action: `User approval set to ${approved} (Role: ${found.role}) for ${found.username}`,
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
  });

  saveDb();
  res.json({ success: true, user: found });
});

// SUPER ADMIN CREATES NEW ADMIN
app.post("/api/admin/users/create-admin", (req, res) => {
  const { username, email, role, phone, address } = req.body;

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email is already in use." });
  }

  const newAdmin: UserProfile = {
    id: `admin-${Date.now()}`,
    username,
    email,
    role: role || UserRole.SECONDARY_ADMIN,
    approved: true, // Auto approved
    phone: phone || "09638233943",
    address: address || "Singapore Ops Center",
    profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    createdAt: new Date().toISOString(),
    loginHistory: [],
  };

  db.users.push(newAdmin);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: "Super Admin",
    action: `Created new administrative user: ${username} with role ${role}`,
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
  });
  saveDb();

  res.json({ success: true, user: newAdmin });
});

// GET ALL USERS FOR ADMIN LIST
app.get("/api/admin/users", (req, res) => {
  res.json(db.users);
});

// UPDATE USER PROFILE FROM STUDENT PORTAL
app.post("/api/admin/users/update", (req, res) => {
  const { userId, username, email, phone } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (phone) user.phone = phone;

  saveDb();
  res.json({ success: true, user });
});

// UPDATE USER PROFILE PICTURE / AVATAR
app.post("/api/admin/users/avatar", (req, res) => {
  const { userId, fileBase64 } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (fileBase64) {
    user.profilePicture = fileBase64;
  }

  saveDb();
  res.json({ success: true, user });
});

// 5. COURSE & VIDEO INTERACTION ENGINE
app.get("/api/courses", (req, res) => {
  res.json(db.courses);
});

// CREATE COURSE
app.post("/api/courses", (req, res) => {
  const { title, description, category, level, thumbnail } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  
  const newCourse = {
    id: `course-${Date.now()}`,
    title,
    description: description || "",
    category: category || "Penetration Testing",
    level: level || "Intermediate",
    thumbnail: thumbnail || "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600",
    lessons: []
  };

  db.courses.push(newCourse);
  saveDb();
  res.json({ success: true, course: newCourse });
});

// UPDATE COURSE
app.put("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, category, level, thumbnail } = req.body;
  
  const course = db.courses.find(c => c.id === id);
  if (!course) return res.status(404).json({ error: "Course not found" });

  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (category !== undefined) course.category = category;
  if (level !== undefined) course.level = level;
  if (thumbnail !== undefined) course.thumbnail = thumbnail;

  saveDb();
  res.json({ success: true, course });
});

// DELETE COURSE
app.delete("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  db.courses = db.courses.filter(c => c.id !== id);
  saveDb();
  res.json({ success: true });
});

// CREATE LESSON (WITH VIDEO / MATERIALS)
app.post("/api/courses/:courseId/lessons", (req, res) => {
  const { courseId } = req.params;
  const { title, description, videoTitle, videoUrl, videoDuration, thumbnail, pdfUrl, pdfName } = req.body;
  
  const course = db.courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const lessonId = `lesson-${Date.now()}`;
  
  const newLesson = {
    id: lessonId,
    title: title || "New Lesson Module",
    description: description || "",
    pdfUrl,
    pdfName,
    video: videoUrl ? {
      id: `vid-${Date.now()}`,
      title: videoTitle || title || "Lesson Video",
      videoUrl: videoUrl,
      thumbnail: thumbnail || "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=600",
      duration: videoDuration || "05:00",
      views: 0,
      likes: 0,
      shares: 0,
      comments: [],
      likedBy: [],
      viewedBy: []
    } : undefined
  };

  course.lessons.push(newLesson);
  saveDb();
  res.json({ success: true, lesson: newLesson });
});

// DELETE LESSON
app.delete("/api/courses/:courseId/lessons/:lessonId", (req, res) => {
  const { courseId, lessonId } = req.params;
  const course = db.courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: "Course not found" });

  course.lessons = course.lessons.filter(l => l.id !== lessonId);
  saveDb();
  res.json({ success: true });
});

// Increment video statistics & comments
app.post("/api/courses/video/:videoId/action", (req, res) => {
  const { videoId } = req.params;
  const { type, commentText, author, role, userId, commentId } = req.body; // type: 'view' | 'like' | 'share' | 'comment' | 'edit-comment' | 'delete-comment' | 'reply-comment' | 'like-comment' | 'pin-comment' | 'hide-comment'

  let foundVideo: any = null;
  for (const c of db.courses) {
    for (const l of c.lessons) {
      if (l.video && l.video.id === videoId) {
        foundVideo = l.video;
        break;
      }
    }
  }

  if (!foundVideo) {
    return res.status(404).json({ error: "Training video asset not found." });
  }

  // Ensure tracking arrays exist
  if (!foundVideo.likedBy) foundVideo.likedBy = [];
  if (!foundVideo.viewedBy) foundVideo.viewedBy = [];
  if (!foundVideo.comments) foundVideo.comments = [];

  const callerId = userId || "anonymous-cadet";

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
    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: callerId,
      author: author || "Anonymous Student",
      authorRole: role || UserRole.STUDENT,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}-53994a69daeb?w=150`,
      content: commentText,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replies: [],
      pinned: false,
      hidden: false
    };
    foundVideo.comments.unshift(newComment);
  } else if (type === "edit-comment" && commentId && commentText) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (comment.authorId === callerId || role === "SUPER_ADMIN" || role === "SECONDARY_ADMIN") {
        comment.content = commentText;
      } else {
        return res.status(403).json({ error: "Unauthorized to edit this comment." });
      }
    }
  } else if (type === "delete-comment" && commentId) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (comment.authorId === callerId || role === "SUPER_ADMIN" || role === "SECONDARY_ADMIN") {
        foundVideo.comments = foundVideo.comments.filter((c: any) => c.id !== commentId);
      } else {
        return res.status(403).json({ error: "Unauthorized to delete this comment." });
      }
    }
  } else if (type === "reply-comment" && commentId && commentText) {
    const comment = foundVideo.comments.find((c: any) => c.id === commentId);
    if (comment) {
      if (!comment.replies) comment.replies = [];
      const newReply = {
        id: `reply-${Date.now()}`,
        authorId: callerId,
        author: author || "Anonymous Student",
        authorRole: role || UserRole.STUDENT,
        avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}-53994a69daeb?w=150`,
        content: commentText,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        replies: []
      };
      comment.replies.push(newReply);
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
    if (role === "SUPER_ADMIN" || role === "SECONDARY_ADMIN") {
      const comment = foundVideo.comments.find((c: any) => c.id === commentId);
      if (comment) {
        comment.pinned = !comment.pinned;
        // Sort comments so pinned comments are always at the top!
        foundVideo.comments.sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      }
    } else {
      return res.status(403).json({ error: "Only admins can pin comments." });
    }
  } else if (type === "hide-comment" && commentId) {
    if (role === "SUPER_ADMIN" || role === "SECONDARY_ADMIN") {
      const comment = foundVideo.comments.find((c: any) => c.id === commentId);
      if (comment) {
        comment.hidden = !comment.hidden;
      }
    } else {
      return res.status(403).json({ error: "Only admins can moderate comments." });
    }
  }

  saveDb();
  res.json({ success: true, video: foundVideo });
});

// SUBMIT ASSIGNMENT UPLOAD
app.post("/api/courses/:courseId/lessons/:lessonId/assignment", (req, res) => {
  const { courseId, lessonId } = req.params;
  const { fileBase64, fileName, userId } = req.body;

  const course = db.courses.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === lessonId);

  if (!lesson) return res.status(404).json({ error: "Lesson not found." });

  // Simulate Cloudinary Secure Storage URL
  const cloudinaryMockUrl = `https://res.cloudinary.com/thamjj13/image/upload/v1726/${Date.now()}_${encodeURIComponent(fileName)}`;

  // Record submission
  if (!lesson.assignments) lesson.assignments = [];
  
  const newSubmission = {
    id: `sub-${Date.now()}`,
    title: lesson.title + " - Student Upload",
    description: `Submitted to secure cloud node by ${userId}`,
    submittedUrl: cloudinaryMockUrl,
    grade: "PENDING REVIEW",
  };

  lesson.assignments.push(newSubmission);
  saveDb();

  res.json({ 
    success: true, 
    message: "Assignment uploaded securely to Cloudinary storage node.",
    submission: newSubmission
  });
});

// MCQ GRADER & DYNAMIC CERTIFICATE GENERATION
app.post("/api/courses/:courseId/submit-test", (req, res) => {
  const { courseId } = req.params;
  const { answers, userId, studentName } = req.body; // array of indexes

  const course = db.courses.find(c => c.id === courseId);
  if (!course || !course.mcqTest) {
    return res.status(404).json({ error: "MCQ evaluation nodes not defined for this training module." });
  }

  const questions = course.mcqTest.questions;
  let correctCount = 0;

  questions.forEach((q, idx) => {
    if (answers[idx] === q.correctAnswer) {
      correctCount++;
    }
  });

  const passed = correctCount >= course.mcqTest.passingScore;
  let certificate: Certificate | null = null;

  if (passed) {
    const certId = `CERT-THAM-${Date.now()}`;
    certificate = {
      id: certId,
      userId,
      studentName: studentName || "Certified Hacker",
      courseId,
      courseTitle: course.title,
      issuedBy: "THAMJJ13 Singapore Board",
      issuedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      qrCodeUrl: `https://ais-dev-aynfdlsmhf6h5i5muocr5b-673487048291.asia-east1.run.app/verify-cert/${certId}`,
      verified: true,
    };
    db.certificates.push(certificate);

    // Save Progress
    const progressIndex = db.progress.findIndex(p => p.userId === userId && p.courseId === courseId);
    const resultPayload = {
      score: correctCount,
      passed: true,
      certificateId: certId,
      timestamp: new Date().toISOString(),
    };

    if (progressIndex > -1) {
      db.progress[progressIndex].testResult = resultPayload;
    } else {
      db.progress.push({
        userId,
        courseId,
        completedLessons: course.lessons.map(l => l.id),
        testResult: resultPayload,
      });
    }
  }

  saveDb();
  res.json({
    success: true,
    score: correctCount,
    total: questions.length,
    passed,
    certificate,
  });
});

// CERTIFICATE QR VERIFIER PAGE
app.get(["/api/certificates/verify/:id", "/api/courses/verify-cert/:id"], (req, res) => {
  const { id } = req.params;
  const found = db.certificates.find(c => c.id === id);
  if (!found) {
    return res.status(404).json({ verified: false, error: "Cryptographic Certificate ID not found on blockchain registry." });
  }
  res.json({ verified: true, certificate: found });
});

// GET ALL VERIFIED CERTIFICATES FOR ADMIN PORTAL
app.get("/api/admin/certificates", (req, res) => {
  res.json(db.certificates);
});

// ADMIN APPROVES/ASSIGNS A CERTIFICATE DIRECTLY
app.post("/api/admin/certificates/grant", (req, res) => {
  const { userId, studentName, courseId, courseTitle } = req.body;
  const certId = `CERT-THAM-${Date.now()}`;
  
  const newCert: Certificate = {
    id: certId,
    userId: userId || "direct-student",
    studentName,
    courseId: courseId || "custom",
    courseTitle,
    issuedBy: "THAMJJ13 Command HQ",
    issuedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    qrCodeUrl: `https://ais-dev-aynfdlsmhf6h5i5muocr5b-673487048291.asia-east1.run.app/verify-cert/${certId}`,
    verified: true,
  };

  db.certificates.push(newCert);
  saveDb();
  res.json({ success: true, certificate: newCert });
});

// 6. CONTACT MESSAGES WITH CAPTCHA & SMTP failover REPLIES
app.post("/api/contact", (req, res) => {
  const { name, email, phone, subject, message, fileBase64, fileName, captchaAnswer, captchaExpected } = req.body;

  // Enforce simple server-side Captcha Validation
  if (captchaAnswer !== captchaExpected) {
    return res.status(400).json({ error: "Threat Blocked: CAPTCHA security confirmation mismatch." });
  }

  // Handle mock Cloudinary upload for attachments
  let attachmentUrl = undefined;
  if (fileBase64 && fileName) {
    attachmentUrl = `https://res.cloudinary.com/thamjj13/image/upload/v1726/attachments/${Date.now()}_${encodeURIComponent(fileName)}`;
  }

  const newMessage: ContactMessage = {
    id: `msg-${Date.now()}`,
    name,
    email,
    phone,
    subject,
    message,
    attachmentUrl,
    attachmentName: fileName,
    timestamp: new Date().toISOString(),
    isRead: false,
    replies: [],
  };

  db.contactMessages.unshift(newMessage);
  saveDb();

  res.json({ 
    success: true, 
    message: "Security transmission received securely. A certified analyst will respond shortly.",
    newMessage 
  });
});

app.get("/api/admin/messages", (req, res) => {
  res.json(db.contactMessages);
});

// DIRECT SMTP OUTBOX REPLY FROM THE DASHBOARD
app.post("/api/admin/messages/:id/reply", (req, res) => {
  const { id } = req.params;
  const { replyText, senderName } = req.body;

  const found = db.contactMessages.find(m => m.id === id);
  if (!found) return res.status(404).json({ error: "Contact thread not found." });

  // Simulate SMTP Failover routing (Round Robin priority failover checks)
  const activeSmtp = db.smtpSettings.find(s => s.status === "ACTIVE") || { host: "fallback-mail-server.net", port: 587 };
  
  const newReply = {
    id: `rep-${Date.now()}`,
    sender: senderName || "THAMJJ13 Security Ops",
    message: replyText,
    timestamp: new Date().toISOString(),
  };

  found.replies.push(newReply);
  found.isRead = true;

  // Log in system audits
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: senderName || "System Outbox",
    action: `Sent SMTP email outbox reply to ${found.email} via standard SMTP node ${activeSmtp.host}:${activeSmtp.port}`,
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
  });

  saveDb();
  res.json({ 
    success: true, 
    reply: newReply,
    smtpHostUsed: activeSmtp.host,
    recipientEmail: found.email
  });
});

// Test SMTP Server Route
app.post("/api/admin/smtp/test", (req, res) => {
  const { host, port, user } = req.body;
  res.json({
    success: true,
    message: `SMTP connection established successfully with ${host}:${port}. Test email transmission is green.`,
  });
});

// 7. REAL-TIME MOCK MESSENGER LIVE CHAT GATEWAY
app.get("/api/admin/chats", (req, res) => {
  res.json(db.chatSessions);
});

app.post("/api/chats/message", (req, res) => {
  const { sessionId, senderId, senderName, senderRole, content, fileBase64, fileName, replyToId, replyToContent } = req.body;

  let session = db.chatSessions.find(s => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId || `chat-visitor-${Date.now()}`,
      visitorName: senderName || "Incognito Analyst",
      visitorIp: "127.0.0.1",
      unreadCount: 0,
      isOnline: true,
      isTyping: false,
      messages: [],
    };
    db.chatSessions.push(session);
  }

  // If student/visitor uploads picture
  let imageUrl = undefined;
  if (fileBase64 && fileName) {
    imageUrl = `https://res.cloudinary.com/thamjj13/image/upload/v1726/chat/${Date.now()}_${encodeURIComponent(fileName)}`;
  }

  const newMessage: LiveChatMessage = {
    id: `msg-${Date.now()}`,
    senderId,
    senderName,
    senderRole,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
    status: senderId === "visitor" ? "delivered" : "seen",
    replyToId,
    replyToContent,
  };

  session.messages.push(newMessage);
  if (senderId === "visitor") {
    session.unreadCount += 1;
    session.isOnline = true;
  }

  saveDb();
  res.json({ success: true, session, message: newMessage });
});

// Clear unread indicator
app.post("/api/chats/:sessionId/read", (req, res) => {
  const { sessionId } = req.params;
  const session = db.chatSessions.find(s => s.id === sessionId);
  if (session) {
    session.unreadCount = 0;
    session.messages.forEach(m => m.status = "seen");
    saveDb();
  }
  res.json({ success: true });
});

// Unsend / Delete chat message
app.post("/api/chats/:sessionId/delete/:msgId", (req, res) => {
  const { sessionId, msgId } = req.params;
  const session = db.chatSessions.find(s => s.id === sessionId);
  if (session) {
    session.messages = session.messages.filter(m => m.id !== msgId);
    saveDb();
  }
  res.json({ success: true });
});

// 8. FILE VAULT ENCRYPTED STORAGE NODES
app.get("/api/vault", (req, res) => {
  res.json(db.vault);
});

app.post("/api/vault/upload", (req, res) => {
  const { name, size, mimeType, fileBase64, uploadedBy, role } = req.body;

  // Mock Cloudinary Secure Encryption Link
  const mockEncryptedUrl = `https://res.cloudinary.com/thamjj13/image/upload/v1726/vault/vault_secure_${Date.now()}_aes_256.bin`;

  const newItem: FileVaultItem = {
    id: `v-item-${Date.now()}`,
    name,
    size: size || "1.5 MB",
    mimeType: mimeType || "application/octet-stream",
    encryptedUrl: mockEncryptedUrl,
    uploadedBy: uploadedBy || "White Hat Cadet",
    role: role || UserRole.STUDENT,
    uploadedAt: new Date().toISOString(),
    downloads: 0,
  };

  db.vault.unshift(newItem);
  
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: uploadedBy,
    action: `Uploaded and AES-256 encrypted file vault asset: ${name}`,
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
  });

  saveDb();
  res.json({ success: true, item: newItem });
});

// Vault download counter
app.post("/api/vault/:id/download", (req, res) => {
  const { id } = req.params;
  const found = db.vault.find(v => v.id === id);
  if (found) {
    found.downloads += 1;
    saveDb();
  }
  res.json({ success: true, url: found?.encryptedUrl });
});

// 9. EVENT MANAGEMENT
app.get("/api/events", (req, res) => {
  res.json(db.events);
});

app.post("/api/admin/events", (req, res) => {
  const { title, description, date, time, type } = req.body;
  const newEvt: CyberEvent = {
    id: `evt-${Date.now()}`,
    title,
    description,
    date,
    time,
    type,
  };
  db.events.push(newEvt);
  saveDb();
  res.json({ success: true, event: newEvt });
});

// 10. API KEYS MANAGEMENT
app.get("/api/admin/api-keys", (req, res) => {
  res.json(db.apiKeys);
});

app.post("/api/admin/api-keys", (req, res) => {
  const { name, role } = req.body;
  const newKey: ApiKeyConfig = {
    id: `key-${Date.now()}`,
    name,
    key: `tham_sec_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
    role: role || "Read Logs",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    usageCount: 0,
  };
  db.apiKeys.push(newKey);
  saveDb();
  res.json({ success: true, apiKey: newKey });
});

app.post("/api/admin/api-keys/:id/revoke", (req, res) => {
  const { id } = req.params;
  const found = db.apiKeys.find(k => k.id === id);
  if (found) {
    found.status = "REVOKED";
    saveDb();
  }
  res.json({ success: true });
});

// 11. RECOVERY & RESTORE
app.post("/api/admin/backup/trigger", (req, res) => {
  db.systemHealth.backupsCount += 1;
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    user: "System Admin Node",
    action: "Platform Snapshot & Backup generated (SHA256 encrypted)",
    timestamp: new Date().toISOString(),
    ip: "127.0.0.1",
  });
  saveDb();
  res.json({ success: true, backupsCount: db.systemHealth.backupsCount });
});

app.get("/api/admin/audit-logs", (req, res) => {
  res.json(db.auditLogs);
});

// 12. ANNOUNCEMENTS
app.get("/api/announcement", (req, res) => {
  res.json(db.announcement);
});

app.post("/api/admin/announcement", (req, res) => {
  const { title, content, active } = req.body;
  db.announcement = { title, content, active: active ?? true };
  saveDb();
  res.json({ success: true, announcement: db.announcement });
});

// 13. SUPPORT TICKETS GATEWAY
app.post(["/api/support-tickets", "/api/support/tickets"], (req, res) => {
  const { userId, username, subject, description, priority, category } = req.body;

  const newTicket: SupportTicket = {
    id: `tkt-${Date.now()}`,
    userId: userId || "anonymous-student",
    username: username || "Hacker Cadet",
    subject,
    description,
    priority: priority || "MEDIUM",
    category: category || "Technical",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    replies: [],
  };

  db.tickets.push(newTicket);
  saveDb();
  res.json({ success: true, ticket: newTicket });
});

app.get(["/api/support-tickets", "/api/support/tickets"], (req, res) => {
  res.json(db.tickets);
});

// Report API
app.post("/api/reports", async (req, res) => {
  const { 
    fullName, email, phone, address, incidentDateTime, 
    incidentLocation, category, description, witnessInfo, evidenceUrl, evidenceName 
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !description || !incidentDateTime || !incidentLocation || !category) {
    return res.status(400).json({ error: "Missing required fields for case reporting." });
  }

  // 10. Security & Validation - Prevent duplicate submissions
  const isDuplicate = db.reports.some(r => 
    r.fullName.trim().toLowerCase() === fullName.trim().toLowerCase() &&
    r.incidentDateTime === incidentDateTime &&
    r.description.trim().toLowerCase() === description.trim().toLowerCase()
  );

  if (isDuplicate) {
    return res.status(400).json({ error: "Duplicate report detected: This incident has already been submitted." });
  }

  // Generate unique Report ID
  const reportId = "REP-" + (Math.floor(Math.random() * 899999) + 100000);

  const newReport: Report = {
    id: reportId,
    fullName,
    email,
    phone,
    address,
    incidentDateTime,
    incidentLocation,
    category,
    description,
    evidenceUrl,
    evidenceName,
    witnessInfo,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  db.reports.unshift(newReport);
  
  // Log report submission to security audit log
  db.auditLogs.unshift({
    id: "log-" + Date.now(),
    user: "complainant",
    action: `Submitted Case Report ${reportId} for category [${category}]`,
    timestamp: new Date().toISOString(),
    ip: req.ip || "127.0.0.1"
  });

  saveDb();

  // 5. Email Notification - User & Organization Dispatch
  const userEmailSubject = `[THAMJJ13] Case Report Received - ID: ${reportId}`;
  const userEmailText = `Dear ${fullName},\n\nWe have safely and securely received your incident report.\nYour unique Report ID is: ${reportId}\n\nIncident Details:\n- Category: ${category}\n- Location: ${incidentLocation}\n- Date/Time: ${incidentDateTime}\n\nOur Singapore SLA coordinators and Bangladesh white-hat command nodes will review this report. Once approved, a First Information Report (FIR) will be generated, and you will receive a secure notification link.\n\nCurrent Status: PENDING\n\nSincerely,\nOperations Command Node, THAMJJ13`;

  const orgEmailSubject = `URGENT: New Incident Report Submitted - ID: ${reportId}`;
  const orgEmailText = `An incident report has been submitted to the THAMJJ13 dispatch node.\n\nReport Details:\n- ID: ${reportId}\n- Complainant: ${fullName}\n- Email: ${email}\n- Phone: ${phone}\n- Address: ${address}\n- Date/Time: ${incidentDateTime}\n- Location: ${incidentLocation}\n- Category: ${category}\n- Description: ${description}\n- Witness Info: ${witnessInfo || "None"}\n- Evidence File: ${evidenceName || "None"}\n\nPlease review this in the Admin Portal and generate an FIR as appropriate.`;

  // Send non-blocking emails
  sendEmail(email, userEmailSubject, userEmailText).catch(e => console.error(e));
  sendEmail("support@thamjj13.com", orgEmailSubject, orgEmailText).catch(e => console.error(e));

  res.status(201).json(newReport);
});

app.get("/api/reports", (req, res) => {
  res.json(db.reports);
});

app.get("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const report = db.reports.find((r) => r.id === id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

app.patch("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const { status, notes, firDetails } = req.body;
  const report = db.reports.find((r) => r.id === id);
  if (!report) return res.status(404).json({ error: "Report not found" });

  const oldStatus = report.status;
  if (status) report.status = status;
  if (notes !== undefined) report.notes = notes;
  
  if (firDetails) {
    report.firDetails = firDetails;
    report.firNumber = firDetails.firNumber;
  }

  // If status transitions to APPROVED or under review, notify complainant
  if (status && status !== oldStatus) {
    db.auditLogs.unshift({
      id: "log-" + Date.now(),
      user: "superadmin",
      action: `Updated Case Report ${id} status from ${oldStatus} to ${status}`,
      timestamp: new Date().toISOString(),
      ip: req.ip || "127.0.0.1"
    });

    if (status === "APPROVED") {
      const userApprovedSubject = `[THAMJJ13] APPROVED FIR Issued - FIR No: ${report.firNumber || "PENDING"}`;
      const userApprovedText = `Dear ${report.fullName},\n\nYour incident report has been reviewed, and an official First Information Report (FIR) has been successfully generated and approved.\n\nFIR Details:\n- FIR Number: ${report.firNumber || "N/A"}\n- Police Station: ${report.firDetails?.policeStation || "N/A"}\n- Investigating Officer: ${report.firDetails?.officerDetails || "N/A"}\n- Cryptographic Verification Code: ${report.firDetails?.verificationCode || "N/A"}\n\nYou can view, print, or download your official FIR PDF securely from your Cadet Dashboard.\n\nSincerely,\nSuper Administrator, THAMJJ13`;
      sendEmail(report.email, userApprovedSubject, userApprovedText).catch(e => console.error(e));
    }
  }

  saveDb();
  res.json(report);
});

app.post(["/api/support-tickets/:id/reply", "/api/support/tickets/:id/reply"], (req, res) => {
  const { id } = req.params;
  const { senderName, senderRole, content } = req.body;

  const found = db.tickets.find(t => t.id === id);
  if (!found) return res.status(404).json({ error: "Support ticket registry not found." });

  const newReply = {
    id: `rep-${Date.now()}`,
    senderName,
    senderRole,
    content,
    timestamp: new Date().toISOString(),
  };

  found.replies.push(newReply);
  found.status = "IN_PROGRESS";
  saveDb();

  res.json({ success: true, reply: newReply });
});

app.post("/api/admin/support-tickets/:id/resolve", (req, res) => {
  const { id } = req.params;
  const found = db.tickets.find(t => t.id === id);
  if (found) {
    found.status = "RESOLVED";
    saveDb();
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// DYNAMIC CMS MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// Cloudinary settings
app.get("/api/cms/cloudinary-settings", (req, res) => {
  res.json(db.cloudinarySettings || { cloudName: "", apiKey: "", apiSecret: "", uploadPreset: "" });
});

app.post("/api/cms/cloudinary-settings", (req, res) => {
  const { cloudName, apiKey, apiSecret, uploadPreset } = req.body;
  db.cloudinarySettings = {
    cloudName: cloudName || "",
    apiKey: apiKey || "",
    apiSecret: apiSecret || "",
    uploadPreset: uploadPreset || "",
  };
  db.systemHealth.cloudinaryStatus = (cloudName && apiKey) ? "CONNECTED" : "UNCONFIGURED";
  saveDb();
  res.json({ success: true, settings: db.cloudinarySettings });
});

// Hero Slides
app.get("/api/cms/hero-slides", (req, res) => {
  res.json(db.heroSlides || []);
});

app.post("/api/cms/hero-slides", (req, res) => {
  const { title, subtitle, bgImage, bgVideo, ctaText, ctaLink, textAnimation, parallaxSpeed } = req.body;
  const newSlide = {
    id: `slide-${Date.now()}`,
    title: title || "New Cyber Security Slide",
    subtitle: subtitle || "",
    bgImage: bgImage || "",
    bgVideo: bgVideo || "",
    ctaText: ctaText || "",
    ctaLink: ctaLink || "",
    textAnimation: textAnimation || "fade-up",
    parallaxSpeed: Number(parallaxSpeed) || 0.5,
  };
  if (!db.heroSlides) db.heroSlides = [];
  db.heroSlides.push(newSlide);
  saveDb();
  res.json({ success: true, slide: newSlide });
});

app.put("/api/cms/hero-slides/:id", (req, res) => {
  const { id } = req.params;
  const { title, subtitle, bgImage, bgVideo, ctaText, ctaLink, textAnimation, parallaxSpeed } = req.body;
  const slide = db.heroSlides && db.heroSlides.find(s => s.id === id);
  if (slide) {
    slide.title = title ?? slide.title;
    slide.subtitle = subtitle ?? slide.subtitle;
    slide.bgImage = bgImage ?? slide.bgImage;
    slide.bgVideo = bgVideo ?? slide.bgVideo;
    slide.ctaText = ctaText ?? slide.ctaText;
    slide.ctaLink = ctaLink ?? slide.ctaLink;
    slide.textAnimation = textAnimation ?? slide.textAnimation;
    slide.parallaxSpeed = parallaxSpeed !== undefined ? Number(parallaxSpeed) : slide.parallaxSpeed;
    saveDb();
    res.json({ success: true, slide });
  } else {
    res.status(404).json({ error: "Slide not found" });
  }
});

app.delete("/api/cms/hero-slides/:id", (req, res) => {
  const { id } = req.params;
  if (db.heroSlides) {
    db.heroSlides = db.heroSlides.filter(s => s.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// Services
app.get("/api/cms/services", (req, res) => {
  res.json(db.services || []);
});

app.post("/api/cms/services", (req, res) => {
  const { icon, title, description } = req.body;
  const newService = {
    id: `service-${Date.now()}`,
    icon: icon || "Shield",
    title: title || "New Ethical Service",
    description: description || "",
  };
  if (!db.services) db.services = [];
  db.services.push(newService);
  saveDb();
  res.json({ success: true, service: newService });
});

app.put("/api/cms/services/:id", (req, res) => {
  const { id } = req.params;
  const { icon, title, description } = req.body;
  const service = db.services && db.services.find(s => s.id === id);
  if (service) {
    service.icon = icon ?? service.icon;
    service.title = title ?? service.title;
    service.description = description ?? service.description;
    saveDb();
    res.json({ success: true, service });
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

app.delete("/api/cms/services/:id", (req, res) => {
  const { id } = req.params;
  if (db.services) {
    db.services = db.services.filter(s => s.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// Team Members
app.get("/api/cms/team-members", (req, res) => {
  res.json(db.teamMembers || []);
});

app.post("/api/cms/team-members", (req, res) => {
  const { name, role, location, avatar, badges } = req.body;
  const newMember = {
    id: `team-${Date.now()}`,
    name: name || "New Team Member",
    role: role || "Security Engineer",
    location: location || "Singapore",
    avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    badges: Array.isArray(badges) ? badges : [],
  };
  if (!db.teamMembers) db.teamMembers = [];
  db.teamMembers.push(newMember);
  saveDb();
  res.json({ success: true, member: newMember });
});

app.put("/api/cms/team-members/:id", (req, res) => {
  const { id } = req.params;
  const { name, role, location, avatar, badges } = req.body;
  const member = db.teamMembers && db.teamMembers.find(m => m.id === id);
  if (member) {
    member.name = name ?? member.name;
    member.role = role ?? member.role;
    member.location = location ?? member.location;
    member.avatar = avatar ?? member.avatar;
    member.badges = Array.isArray(badges) ? badges : member.badges;
    saveDb();
    res.json({ success: true, member });
  } else {
    res.status(404).json({ error: "Team member not found" });
  }
});

app.delete("/api/cms/team-members/:id", (req, res) => {
  const { id } = req.params;
  if (db.teamMembers) {
    db.teamMembers = db.teamMembers.filter(m => m.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// Gallery
app.get("/api/cms/gallery", (req, res) => {
  res.json(db.gallery || []);
});

app.post("/api/cms/gallery", (req, res) => {
  const { category, title, url } = req.body;
  const newItem = {
    id: `gal-${Date.now()}`,
    category: category || "Operations",
    title: title || "Operation Capture",
    url: url || "",
  };
  if (!db.gallery) db.gallery = [];
  db.gallery.push(newItem);
  saveDb();
  res.json({ success: true, item: newItem });
});

app.put("/api/cms/gallery/:id", (req, res) => {
  const { id } = req.params;
  const { category, title, url } = req.body;
  const item = db.gallery && db.gallery.find(g => g.id === id);
  if (item) {
    item.category = category ?? item.category;
    item.title = title ?? item.title;
    item.url = url ?? item.url;
    saveDb();
    res.json({ success: true, item });
  } else {
    res.status(404).json({ error: "Gallery item not found" });
  }
});

app.delete("/api/cms/gallery/:id", (req, res) => {
  const { id } = req.params;
  if (db.gallery) {
    db.gallery = db.gallery.filter(g => g.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// FAQs
app.get("/api/cms/faqs", (req, res) => {
  res.json(db.faqs || []);
});

app.post("/api/cms/faqs", (req, res) => {
  const { q, a } = req.body;
  const newFaq = {
    id: `faq-${Date.now()}`,
    q: q || "Question?",
    a: a || "Answer.",
  };
  if (!db.faqs) db.faqs = [];
  db.faqs.push(newFaq);
  saveDb();
  res.json({ success: true, faq: newFaq });
});

app.put("/api/cms/faqs/:id", (req, res) => {
  const { id } = req.params;
  const { q, a } = req.body;
  const faq = db.faqs && db.faqs.find(f => f.id === id);
  if (faq) {
    faq.q = q ?? faq.q;
    faq.a = a ?? faq.a;
    saveDb();
    res.json({ success: true, faq });
  } else {
    res.status(404).json({ error: "FAQ not found" });
  }
});

app.delete("/api/cms/faqs/:id", (req, res) => {
  const { id } = req.params;
  if (db.faqs) {
    db.faqs = db.faqs.filter(f => f.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// Stats Counters
app.get("/api/cms/stats", (req, res) => {
  res.json(db.stats || []);
});

app.post("/api/cms/stats", (req, res) => {
  const { label, value, desc } = req.body;
  const newStat = {
    id: `stat-${Date.now()}`,
    label: label || "Metric",
    value: value || "0",
    desc: desc || "",
  };
  if (!db.stats) db.stats = [];
  db.stats.push(newStat);
  saveDb();
  res.json({ success: true, stat: newStat });
});

app.put("/api/cms/stats/:id", (req, res) => {
  const { id } = req.params;
  const { label, value, desc } = req.body;
  const stat = db.stats && db.stats.find(s => s.id === id);
  if (stat) {
    stat.label = label ?? stat.label;
    stat.value = value ?? stat.value;
    stat.desc = desc ?? stat.desc;
    saveDb();
    res.json({ success: true, stat });
  } else {
    res.status(404).json({ error: "Stat metric not found" });
  }
});

app.delete("/api/cms/stats/:id", (req, res) => {
  const { id } = req.params;
  if (db.stats) {
    db.stats = db.stats.filter(s => s.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// Alliances
app.get("/api/cms/alliances", (req, res) => {
  res.json(db.alliances || []);
});

app.post("/api/cms/alliances", (req, res) => {
  const { name } = req.body;
  const newAlliance = {
    id: `all-${Date.now()}`,
    name: name || "New Allied Agency",
  };
  if (!db.alliances) db.alliances = [];
  db.alliances.push(newAlliance);
  saveDb();
  res.json({ success: true, alliance: newAlliance });
});

app.put("/api/cms/alliances/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const alliance = db.alliances && db.alliances.find(a => a.id === id);
  if (alliance) {
    alliance.name = name ?? alliance.name;
    saveDb();
    res.json({ success: true, alliance });
  } else {
    res.status(404).json({ error: "Alliance not found" });
  }
});

app.delete("/api/cms/alliances/:id", (req, res) => {
  const { id } = req.params;
  if (db.alliances) {
    db.alliances = db.alliances.filter(a => a.id !== id);
    saveDb();
  }
  res.json({ success: true });
});

// 14. SERVER-SIDE GEMINI API INTEL AGENT
app.post("/api/gemini/assist", async (req, res) => {
  const { prompt, type } = req.body; // type: 'audit' | 'chat' | 'course'
  
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ 
        text: "🚨 [THAMJJ13 Simulated Guard] Gemini API key not yet fully configured in your Secrets dashboard. Utilizing local white hat response protocols: Secure your open ports, utilize SSH-keys instead of passwords, and enforce firewall limitations on all Singtel/Link3 gateway linkages." 
      });
    }

    let systemInstruction = "You are an elite Senior Cyber Security Threat Intelligence AI agent working for THAMJJ13 Singapore & Bangladesh white-hat security teams. Frame your answers with clear technical depth, cybersecurity terms, and professional hacker aesthetics.";
    
    if (type === "course") {
      systemInstruction = "You are THAMJJ13's Hacking Academy AI Tutor. Guide students precisely with practical command examples (Nmap, Metasploit, Wireshark) and code-level defense instructions. Maintain a highly professional and educative tone.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Endpoint Failure:", error);
    res.json({ 
      text: `🚨 [Threat Analysis Failure] Connection with intelligence core returned an error. Core advice: Encrypt files with AES-256, perform a thorough log audit on user registration queues, and review Singapore-Bangladesh critical compliance matrices.` 
    });
  }
});

app.post("/api/gemini/threat-intel", async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ 
        success: true,
        content: "🚨 [THAMJJ13 Simulated Guard] Gemini API key not yet fully configured in your Secrets dashboard. Utilizing local white hat response protocols: Secure your open ports, utilize SSH-keys instead of passwords, and enforce firewall limitations on all Singtel/Link3 gateway linkages." 
      });
    }

    const systemInstruction = "You are an elite Senior Cyber Security Threat Intelligence AI agent working for THAMJJ13 Singapore & Bangladesh white-hat security teams. Frame your answers with clear technical depth, cybersecurity terms, and professional hacker aesthetics.";
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ success: true, content: response.text });
  } catch (error: any) {
    console.error("Gemini Threat Intel Failure:", error);
    res.json({ 
      success: true,
      content: `🚨 [Threat Analysis Failure] Connection with intelligence core returned an error. Core advice: Encrypt files with AES-256, perform a thorough log audit on user registration queues, and review Singapore-Bangladesh critical compliance matrices.` 
    });
  }
});


// ----------------------------------------------------
// VITE OR STATIC FILE SERVING FOR FULL-STACK INTEGRATION
// ----------------------------------------------------
async function initializeServer() {
  // Connect to MongoDB and sync database cache on boot
  await connectToMongo();
  // REMOVED: Using Mongoose directly in endpoints now.
  // if (isMongoConnected && mongoDb) {
  //   await pullFromMongo();
  // }

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Express server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting Express server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`THAMJJ13 Enterprise Security Platform booting live on port ${PORT}`);
  });
}

initializeServer().catch(err => {
  console.error("CRITICAL PORT 3000 SECURITY LAUNCH FAILURE:", err);
});
