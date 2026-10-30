export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  SECONDARY_ADMIN = "SECONDARY_ADMIN",
  COURSE_MANAGER = "COURSE_MANAGER",
  CONTENT_MANAGER = "CONTENT_MANAGER",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  MODERATOR = "MODERATOR",
  STUDENT = "STUDENT",
  VISITOR = "VISITOR",
}

export type OtpPurpose =
  | "ADMIN_LOGIN"
  | "LOGIN_2FA"
  | "BOOTSTRAP_SETUP"
  | "PASSWORD_RESET"
  | "USER_VERIFY"
  | "EMAIL_VERIFY";

export interface SecurityLog {
  id: string;
  userId?: string;
  ip: string;
  action: string;
  timestamp: string;
  device: string;
  browser: string;
  status: "SUCCESS" | "FAILED" | "SUSPICIOUS";
}

export interface Certificate {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedBy: string;
  issuedAt: string;
  issueDate?: string;
  verificationHash?: string;
  qrCodeUrl: string;
  verified: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  approved: boolean;
  emailVerified?: boolean;
  phone: string;
  address: string;
  bio?: string;
  profilePicture: string;
  avatarUrl?: string;
  enrolledCourses?: string[];
  completedLessons?: string[];
  badges?: string[];
  certificates?: Certificate[];
  createdAt: string;
  loginHistory: SecurityLog[];
}

export interface VideoComment {
  id: string;
  author: string;
  authorRole: UserRole;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  authorId?: string;
  likedBy?: string[];
  replies?: VideoComment[];
  pinned?: boolean;
  hidden?: boolean;
}

export interface CourseVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnail: string;
  duration: string;
  views: number;
  likes: number;
  shares: number;
  comments: VideoComment[];
  likedBy?: string[];
  viewedBy?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video?: CourseVideo;
  pdfUrl?: string;
  pdfName?: string;
  assignments?: {
    id: string;
    userId?: string;
    studentName?: string;
    title: string;
    description: string;
    submittedUrl?: string;
    submittedAt?: string;
    grade?: string;
  }[];
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  thumbnail: string;
  lessons: Lesson[];
  mcqTest?: {
    id: string;
    questions: MCQQuestion[];
    passingScore: number;
  };
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  completedLessons: string[];
  testResult?: {
    score: number;
    passed: boolean;
    certificateId?: string;
    timestamp: string;
  };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: string;
  isRead: boolean;
  status?: string;
  replies: {
    id: string;
    sender: string;
    message: string;
    timestamp: string;
    emailDelivered?: boolean;
  }[];
}

export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  imageUrl?: string;
  timestamp: string;
  status: "sending" | "sent" | "delivered" | "seen";
  replyToId?: string;
  replyToContent?: string;
}

export interface LiveChatSession {
  id: string;
  visitorName: string;
  visitorIp: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping: boolean;
  messages: LiveChatMessage[];
}

export interface VisitorLog {
  id: string;
  ip: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device: string;
  resolution: string;
  language: string;
  timezone: string;
  isp: string;
  visitTime: string;
  lastVisit: string;
  referral: string;
  currentPage: string;
  sessionDuration: number;
  returningVisitor: boolean;
}

export interface SupportTicketReply {
  id: string;
  sender: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  content: string;
  text?: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  email?: string;
  subject: string;
  description: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: "Technical" | "Billing" | "Course Help" | "Vulnerability Report";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  replies: SupportTicketReply[];
}

export interface CyberEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  instructor?: string;
  registrationLink?: string;
  location?: string;
  type:
    | "Live Training"
    | "CTF Hacking Challenge"
    | "Cyber Security Seminar"
    | "Threat Briefing";
  link?: string;
}

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
  role: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  usageCount: number;
}

export interface FileVaultItem {
  id: string;
  userId?: string;
  name: string;
  fileName: string;
  size: string;
  fileSize: string;
  mimeType: string;
  fileType: string;
  encryptedUrl: string;
  cloudinaryUrl: string;
  aesHash: string;
  uploadedBy: string;
  role: UserRole;
  uploadedAt: string;
  downloads: number;
  downloadCount: number;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskFree: number;
  activeConnections: number;
  uptime: string;
  databaseEngine: string;
  databaseStatus: "CONNECTED" | "LOCAL_REPLICA" | "ERROR";
  resendStatus: "CONNECTED" | "UNCONFIGURED";
  senderEmail: string;
  cloudinaryStatus: "CONNECTED" | "DISCONNECTED" | "UNCONFIGURED";
  backupsCount: number;
}

export interface MailLog {
  id: string;
  recipient: string;
  toEmail?: string;
  subject: string;
  category: string;
  status: "SENT" | "SIMULATED" | "FAILED";
  providerId?: string;
  error?: string;
  timestamp: string;
  createdAt?: string;
}

export interface ResendConfig {
  fromEmail: string;
  fromName: string;
  adminAlertEmail: string;
  apiKeyConfigured: boolean;
  apiKeySource?: "ENV" | "DATABASE" | "NONE";
  source?: string;
  maskedApiKey?: string;
  apiKeyMasked?: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret?: string;
  uploadPreset: string;
  configured: boolean;
  source?: "ENV" | "DATABASE" | "NONE";
}

export interface FIRDetails {
  firNumber?: string;
  policeStation: string;
  district?: string;
  accusedInfo?: string;
  officerDetails: string;
  summary?: string;
  finalizedAt?: string;
  signature?: string;
  verificationCode?: string;
}

export interface Report {
  id: string;
  trackingCode?: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  incidentDateTime: string;
  incidentLocation: string;
  category: string;
  description: string;
  evidenceUrl?: string;
  evidenceName?: string;
  witnessInfo?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED";
  notes?: string;
  firNumber?: string;
  createdAt: string;
  updatedAt?: string;
  firDetails?: FIRDetails;
}
