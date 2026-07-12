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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  approved: boolean;
  phone: string;
  address: string;
  profilePicture: string;
  createdAt: string;
  loginHistory: SecurityLog[];
  password?: string;
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
  replies?: any[];
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
    title: string;
    description: string;
    submittedUrl?: string;
    grade?: string;
  }[];
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index
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
  completedLessons: string[]; // Lesson IDs
  testResult?: {
    score: number;
    passed: boolean;
    certificateId?: string;
    timestamp: string;
  };
}

export interface Certificate {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedBy: string;
  issuedAt: string;
  qrCodeUrl: string;
  verified: boolean;
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
  replies: {
    id: string;
    sender: string;
    message: string;
    timestamp: string;
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
  sessionDuration: number; // in seconds
  returningVisitor: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: "Technical" | "Billing" | "Course Help" | "Vulnerability Report";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  replies: {
    id: string;
    senderName: string;
    senderRole: UserRole;
    content: string;
    timestamp: string;
  }[];
}

export interface CyberEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "Live Training" | "CTF Hacking Challenge" | "Cyber Security Seminar" | "Threat Briefing";
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
  name: string;
  size: string;
  mimeType: string;
  encryptedUrl: string;
  uploadedBy: string;
  role: UserRole;
  uploadedAt: string;
  downloads: number;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskFree: number;
  activeConnections: number;
  uptime: string;
  smtpStatus: "OK" | "WARNING" | "CRITICAL" | "UNCONFIGURED";
  cloudinaryStatus: "CONNECTED" | "DISCONNECTED" | "UNCONFIGURED";
  backupsCount: number;
}

export interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  user: string;
  pass?: string;
  from?: string;
  priority: number; // Higher is preferred
  status: "ACTIVE" | "INACTIVE" | "FAILED";
}

export interface FIRDetails {
  firNumber: string;
  policeStation: string;
  accusedInfo?: string;
  officerDetails: string;
  finalizedAt?: string;
  signature?: string;
  verificationCode?: string;
}

export interface Report {
  id: string;
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
  firDetails?: FIRDetails;
}
