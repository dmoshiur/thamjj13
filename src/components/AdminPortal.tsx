import React, { useState, useEffect } from "react";
import {
  Activity,
  Users,
  BookOpen,
  MessageSquare,
  Mail,
  ShieldAlert,
  Cpu,
  HardDrive,
  RefreshCw,
  Check,
  Trash2,
  Key,
  Database,
  UserCheck,
  PlusCircle,
  Send,
  Cloud,
  Layout,
  Briefcase,
  Image as ImageIcon,
  HelpCircle,
  Globe,
  ExternalLink,
  Award,
  FileText,
  Lock,
  Calendar,
  SendHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import {
  UserProfile,
  UserRole,
  Course,
  ContactMessage,
  ResendConfig,
  MailLog,
  VisitorLog,
  SystemHealthMetrics,
  CloudinaryConfig,
  Report,
  SupportTicket,
  LiveChatSession,
  CyberEvent,
  FileVaultItem,
} from "../types";

interface AdminPortalProps {
  currentUser: { id: string; username: string; email: string; role: UserRole };
  onRefreshCourses?: () => void;
}

const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SECONDARY_ADMIN,
  UserRole.COURSE_MANAGER,
  UserRole.SUPPORT_AGENT,
  UserRole.MODERATOR,
  UserRole.CONTENT_MANAGER,
];

export default function AdminPortal({
  currentUser,
  onRefreshCourses,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "cms"
    | "users"
    | "courses"
    | "reports"
    | "inbox"
    | "resend"
    | "cloudinary"
    | "security"
  >("dashboard");

  // Telemetry & Analytics
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [chatSessions, setChatSessions] = useState<LiveChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [adminChatInput, setAdminChatInput] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<CyberEvent[]>([]);
  const [vaultItems, setVaultItems] = useState<FileVaultItem[]>([]);

  // Inbox Sub-Tab
  const [inboxSubTab, setInboxSubTab] = useState<"messages" | "tickets" | "chats">(
    "messages"
  );
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [ticketReplyText, setTicketReplyText] = useState<Record<string, string>>(
    {}
  );

  // Resend Mail Config & Logs
  const [resendConfig, setResendConfig] = useState<ResendConfig>({
    fromEmail: "no-reply@thamjj13.top",
    fromName: "THAMJJ13 Security",
    adminAlertEmail: "thamjj13@gmail.com",
    apiKeyConfigured: false,
    source: "UNCONFIGURED",
  });
  const [resendApiKeyInput, setResendApiKeyInput] = useState("");
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [testEmailTarget, setTestEmailTarget] = useState(currentUser.email || "");
  const [resendFeedback, setResendFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [testingResend, setTestingResend] = useState(false);

  // Cloudinary Config
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig>({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    uploadPreset: "",
    configured: false,
  });
  const [cloudinarySavedMsg, setCloudinarySavedMsg] = useState("");
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  // Create Sub-Admin Form
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<UserRole>(
    UserRole.SECONDARY_ADMIN
  );
  const [adminCreateMsg, setAdminCreateMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Course & Lesson Creation
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseCat, setCourseCat] = useState("Penetration Testing");
  const [courseLevel, setCourseLevel] = useState<
    "Beginner" | "Intermediate" | "Advanced"
  >("Intermediate");
  const [courseThumb, setCourseThumb] = useState("");
  const [selectedCourseForLesson, setSelectedCourseForLesson] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonDuration, setLessonDuration] = useState("18:00");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonPdfUrl, setLessonPdfUrl] = useState("");

  // CMS Dynamic Collections
  const [cmsSubTab, setCmsSubTab] = useState<
    "slides" | "services" | "team" | "gallery" | "faqs" | "stats" | "alliances"
  >("slides");
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [faqsList, setFaqsList] = useState<any[]>([]);
  const [statsList, setStatsList] = useState<any[]>([]);
  const [alliancesList, setAlliancesList] = useState<any[]>([]);

  const [newSlide, setNewSlide] = useState({
    title: "",
    subtitle: "",
    ctaText: "Explore Academy",
    bgImage: "",
  });
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    icon: "Shield",
  });
  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    location: "Singapore HQ",
    avatar: "",
    bio: "",
  });
  const [newGallery, setNewGallery] = useState({
    title: "",
    category: "Operations",
    url: "",
  });
  const [newFaq, setNewFaq] = useState({ q: "", a: "" });
  const [newStat, setNewStat] = useState({ label: "", value: "", desc: "" });
  const [newAlliance, setNewAlliance] = useState({ name: "" });

  // Report Status & FIR Modals
  const [reportNotesDraft, setReportNotesDraft] = useState<Record<string, string>>(
    {}
  );
  const [reportStatusDraft, setReportStatusDraft] = useState<
    Record<string, Report["status"]>
  >({});
  const [activeFirModal, setActiveFirModal] = useState<Report | null>(null);
  const [firForm, setFirForm] = useState({
    policeStation: "Marina Bay Cyber Command HQ",
    district: "Singapore Zone 1",
    officerDetails: currentUser.username || "Duty Investigator",
    summary: "",
    verificationCode: `THAM-FIR-${Math.floor(100000 + Math.random() * 900000)}`,
    signature: `SIGNED-${(currentUser.username || "ADMIN").toUpperCase()}-SHA256`,
  });

  // Security & Events Forms
  const [newKeyName, setNewKeyName] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "20:00 GMT+8",
    instructor: currentUser.username,
    description: "",
    registrationLink: "",
  });

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchHealthAndVisitors();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthAndVisitors = async () => {
    try {
      const [hRes, vRes] = await Promise.all([
        fetch("/api/system-health").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/visitor-stats").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (hRes) setHealth(hRes);
      if (vRes?.logs) setVisitors(vRes.logs);
    } catch (err) {
      console.error("Telemetry poll error:", err);
    }
  };

  const fetchAllData = async () => {
    fetchHealthAndVisitors();
    fetchCmsCollections();
    try {
      const [
        uRes,
        mRes,
        tRes,
        chRes,
        cRes,
        repRes,
        rsRes,
        mlRes,
        clRes,
        vltRes,
        kRes,
        aRes,
        evRes,
      ] = await Promise.all([
        fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/messages").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/support/tickets").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/chats").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/courses").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/reports").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/resend").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/admin/mail-logs").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/cloudinary").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/vault").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/apikeys").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/admin/audit-logs").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/events").then((r) => (r.ok ? r.json() : [])),
      ]);

      setUsersList(Array.isArray(uRes) ? uRes : []);
      setMessages(Array.isArray(mRes) ? mRes : []);
      setTickets(Array.isArray(tRes) ? tRes : []);
      setChatSessions(Array.isArray(chRes) ? chRes : []);
      setCourses(Array.isArray(cRes) ? cRes : []);
      if (Array.isArray(cRes) && cRes.length > 0 && !selectedCourseForLesson) {
        setSelectedCourseForLesson(cRes[0].id);
      }
      setReportsList(Array.isArray(repRes) ? repRes : []);
      if (rsRes) setResendConfig(rsRes);
      setMailLogs(Array.isArray(mlRes) ? mlRes : []);
      if (clRes) setCloudinaryConfig(clRes);
      setVaultItems(Array.isArray(vltRes) ? vltRes : []);
      setApiKeys(Array.isArray(kRes) ? kRes : []);
      setAuditLogs(Array.isArray(aRes) ? aRes : []);
      setEventsList(Array.isArray(evRes) ? evRes : []);
    } catch (err) {
      console.error("Admin fetchAllData error:", err);
    }
  };

  const fetchCmsCollections = async () => {
    try {
      const [sRes, svRes, tRes, gRes, fRes, stRes, alRes] = await Promise.all([
        fetch("/api/cms/hero-slides").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/services").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/team-members").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/gallery").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/faqs").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/stats").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/alliances").then((r) => r.json()).catch(() => []),
      ]);
      setHeroSlides(sRes || []);
      setServicesList(svRes || []);
      setTeamMembers(tRes || []);
      setGalleryItems(gRes || []);
      setFaqsList(fRes || []);
      setStatsList(stRes || []);
      setAlliancesList(alRes || []);
    } catch (err) {
      console.error("CMS load error:", err);
    }
  };

  // Server-backed Cloudinary Upload Helper
  const uploadViaCloudinary = async (
    file: File,
    fieldKey: string,
    folder: string,
    onSuccess: (url: string) => void
  ) => {
    setUploadingState((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onSuccess(data.url);
      } else {
        alert(`Upload error: ${data.error || "Failed to upload asset"}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Network error while uploading to Cloudinary.");
    } finally {
      setUploadingState((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  // CMS Add / Delete
  const handleAddCmsItem = async (collection: string, payload: any, resetCb: () => void) => {
    const res = await fetch(`/api/cms/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      resetCb();
      fetchCmsCollections();
    }
  };

  const handleDeleteCmsItem = async (collection: string, id: string) => {
    const res = await fetch(`/api/cms/${collection}/${id}`, { method: "DELETE" });
    if (res.ok) fetchCmsCollections();
  };

  // User & Admin Management
  const handleApproveUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/approve`, {
      method: "POST",
    });
    if (res.ok) fetchAllData();
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) fetchAllData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Permanently remove this account from Turso?")) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreateMsg(null);
    const res = await fetch("/api/admin/users/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
        role: newAdminRole,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setAdminCreateMsg({
        ok: true,
        text: `✓ Provisioned ${newAdminEmail} (${newAdminRole}). Welcome email dispatched from no-reply@thamjj13.top.`,
      });
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAllData();
    } else {
      setAdminCreateMsg({
        ok: false,
        text: data.error || "Failed to provision admin.",
      });
    }
  };

  // Case Reports & FIR Actions
  const handleSaveReportStatus = async (report: Report) => {
    const status = reportStatusDraft[report.id] || report.status;
    const notes =
      reportNotesDraft[report.id] !== undefined
        ? reportNotesDraft[report.id]
        : report.notes || "";

    const res = await fetch(`/api/reports/${report.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) {
      fetchAllData();
      alert(
        `✓ Report ${report.id} updated to ${status}. Status notification sent via no-reply@thamjj13.top to ${report.email}.`
      );
    }
  };

  const handleSignFIR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirModal) return;
    const res = await fetch(`/api/reports/${activeFirModal.id}/fir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firDetails: firForm }),
    });
    if (res.ok) {
      setActiveFirModal(null);
      fetchAllData();
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm("Delete this case report permanently?")) return;
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  // Courses & Lessons
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: courseTitle,
        description: courseDesc,
        category: courseCat,
        level: courseLevel,
        thumbnail: courseThumb,
      }),
    });
    if (res.ok) {
      setCourseTitle("");
      setCourseDesc("");
      setCourseThumb("");
      await fetchAllData();
      onRefreshCourses?.();
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm("Delete this course?")) return;
    const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchAllData();
      onRefreshCourses?.();
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLesson) return;
    const res = await fetch(`/api/admin/courses/${selectedCourseForLesson}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lessonTitle,
        description: lessonDesc,
        duration: lessonDuration,
        videoUrl: lessonVideoUrl,
        pdfUrl: lessonPdfUrl,
      }),
    });
    if (res.ok) {
      setLessonTitle("");
      setLessonDesc("");
      setLessonVideoUrl("");
      setLessonPdfUrl("");
      await fetchAllData();
      onRefreshCourses?.();
    }
  };

  // Inbox Replies (Contact + Tickets + Live Chat)
  const handleReplyContact = async (msgId: string) => {
    const text = replyText[msgId];
    if (!text?.trim()) return;
    const res = await fetch(`/api/admin/messages/${msgId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyText: text }),
    });
    if (res.ok) {
      setReplyText((prev) => ({ ...prev, [msgId]: "" }));
      fetchAllData();
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const text = ticketReplyText[ticketId];
    if (!text?.trim()) return;
    const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    if (res.ok) {
      setTicketReplyText((prev) => ({ ...prev, [ticketId]: "" }));
      fetchAllData();
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    if (res.ok) fetchAllData();
  };

  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !adminChatInput.trim()) return;
    const res = await fetch("/api/chats/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeChatId,
        senderId: currentUser.id,
        senderName: `${currentUser.username} (SOC)`,
        senderRole: currentUser.role,
        content: adminChatInput,
      }),
    });
    if (res.ok) {
      setAdminChatInput("");
      fetchAllData();
    }
  };

  // Resend Mail Gateway
  const handleSaveResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendFeedback(null);
    const res = await fetch("/api/admin/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: resendApiKeyInput || undefined,
        fromEmail: resendConfig.fromEmail,
        fromName: resendConfig.fromName,
        adminAlertEmail: resendConfig.adminAlertEmail,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setResendConfig(data.config);
      setResendApiKeyInput("");
      setResendFeedback({
        ok: true,
        msg: "✓ Resend transactional mail configuration saved in Turso.",
      });
    } else {
      setResendFeedback({
        ok: false,
        msg: data.error || "Failed to save Resend configuration.",
      });
    }
  };

  const handleTestResend = async () => {
    if (!testEmailTarget.trim()) return;
    setTestingResend(true);
    setResendFeedback(null);
    try {
      const res = await fetch("/api/admin/resend/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: testEmailTarget }),
      });
      const data = await res.json();
      setResendFeedback({
        ok: res.ok && data.success,
        msg: data.message || data.error || "Diagnostic completed.",
      });
      fetchAllData();
    } catch {
      setResendFeedback({ ok: false, msg: "Connection failed." });
    } finally {
      setTestingResend(false);
    }
  };

  // Cloudinary Save
  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cloudinaryConfig),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setCloudinaryConfig(data.config);
      setCloudinarySavedMsg("✓ Cloudinary credentials saved in Turso.");
      setTimeout(() => setCloudinarySavedMsg(""), 4000);
    }
  };

  // Security, Backups, API Keys & Events
  const handleTriggerBackup = async () => {
    const res = await fetch("/api/admin/backups/trigger", { method: "POST" });
    if (res.ok) fetchHealthAndVisitors();
  };

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const res = await fetch("/api/admin/apikeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName }),
    });
    if (res.ok) {
      setNewKeyName("");
      fetchAllData();
    }
  };

  const handleRevokeKey = async (id: string) => {
    await fetch(`/api/admin/apikeys/${id}`, { method: "DELETE" });
    fetchAllData();
  };

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPwd,
        newPassword: nextPwd,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setPwdMsg({
        ok: true,
        text: "✓ Admin password updated & alert dispatched from no-reply@thamjj13.top.",
      });
      setCurrentPwd("");
      setNextPwd("");
    } else {
      setPwdMsg({ ok: false, text: data.error || "Password update failed." });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEvent),
    });
    if (res.ok) {
      setNewEvent({
        title: "",
        date: "",
        time: "20:00 GMT+8",
        instructor: currentUser.username,
        description: "",
        registrationLink: "",
      });
      fetchAllData();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    fetchAllData();
  };

  const selectedChat = chatSessions.find((s) => s.id === activeChatId) || null;

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
      id="admin_console_root"
    >
      {/* SIDEBAR */}
      <aside className="lg:col-span-3 space-y-6">
        <div className="bg-neutral-950 text-white rounded-3xl p-6 space-y-3 shadow-luxury">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
              ● ROOT CONSOLE
            </span>
            <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded">
              {currentUser.role}
            </span>
          </div>
          <h2 className="font-display font-bold text-lg">{currentUser.username}</h2>
          <p className="text-[11px] font-mono text-neutral-400 truncate">
            {currentUser.email}
          </p>
        </div>

        <nav className="bg-white rounded-3xl p-3 border border-neutral-200 space-y-1 shadow-sm text-xs">
          {[
            { id: "dashboard", label: "Operations Telemetry", icon: Activity },
            { id: "reports", label: "Case Reports & FIRs", icon: FileText },
            { id: "users", label: "Cadets & Admin Nodes", icon: Users },
            { id: "inbox", label: "Direct Inboxes & SOC Chat", icon: MessageSquare },
            { id: "cms", label: "CMS Data Builder", icon: Layout },
            { id: "courses", label: "Academy Curriculum", icon: BookOpen },
            { id: "resend", label: "Resend Mail Gateway", icon: Mail },
            { id: "cloudinary", label: "Cloudinary & File Vault", icon: Cloud },
            { id: "security", label: "Security, Events & Logs", icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-neutral-900 text-white font-bold shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN WORKSPACE */}
      <section className="lg:col-span-9 space-y-6">
        {/* 1. TELEMETRY & VISITOR ANALYTICS */}
        {activeTab === "dashboard" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>TURSO DATABASE</span>
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="font-display font-bold text-lg text-neutral-900 mt-2">
                  {health?.databaseEngine || "Turso (LibSQL)"}
                </h4>
                <p className="text-[11px] font-mono text-emerald-700 mt-1">
                  Mode: {health?.databaseStatus || "ACTIVE"}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>RESEND GATEWAY</span>
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="font-display font-bold text-lg text-neutral-900 mt-2">
                  {health?.resendStatus || "READY"}
                </h4>
                <p className="text-[10px] font-mono text-neutral-500 mt-1 truncate">
                  {health?.senderEmail || "no-reply@thamjj13.top"}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>CLOUDINARY CDN</span>
                  <Cloud className="w-4 h-4 text-sky-600" />
                </div>
                <h4 className="font-display font-bold text-lg text-neutral-900 mt-2">
                  {health?.cloudinaryStatus || "READY"}
                </h4>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  Media &amp; Evidence Store
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>NODE RESOURCES</span>
                  <Cpu className="w-4 h-4 text-neutral-800" />
                </div>
                <h4 className="font-display font-bold text-lg text-neutral-900 mt-2">
                  CPU {health?.cpuUsage ?? 12}% • RAM {health?.memoryUsage ?? 34}%
                </h4>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] font-mono text-neutral-500">
                    Uptime: {health?.uptime || "0d 0h 1m"}
                  </span>
                  <button
                    onClick={handleTriggerBackup}
                    className="text-[10px] font-mono font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Snapshot ({health?.backupsCount ?? 0})
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-base text-neutral-900">
                    Real-Time Visitor Telemetry (Turso Ledger)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Recent edge sessions across pages, devices, and origin networks.
                  </p>
                </div>
                <button
                  onClick={fetchAllData}
                  className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-neutral-700" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[10px] font-mono text-neutral-400 uppercase">
                      <th className="py-2.5 pr-4">IP / Node</th>
                      <th className="py-2.5 pr-4">Browser / OS</th>
                      <th className="py-2.5 pr-4">Page</th>
                      <th className="py-2.5 pr-4">Timezone</th>
                      <th className="py-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {visitors.slice(0, 15).map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 pr-4 font-bold text-neutral-900">
                          {v.ip}
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-600">
                          {v.browser} • {v.os} ({v.device})
                        </td>
                        <td className="py-2.5 pr-4 text-indigo-700">{v.currentPage}</td>
                        <td className="py-2.5 pr-4 text-neutral-500">{v.timezone}</td>
                        <td className="py-2.5 text-neutral-400">
                          {new Date(v.visitTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                    {visitors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-400">
                          No visitor logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. CASE REPORTS & FIR MANAGEMENT */}
        {activeTab === "reports" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6"
          >
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  Citizen Cyber Incident Reports &amp; Official FIR Triage
                </h3>
                <p className="text-xs text-neutral-500">
                  Status updates and signed FIRs automatically notify complainants via{" "}
                  <strong>no-reply@thamjj13.top</strong>.
                </p>
              </div>
              <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-mono font-bold">
                {reportsList.length} Total Cases
              </span>
            </div>

            {reportsList.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                No cyber incident reports have been submitted yet.
              </div>
            ) : (
              <div className="space-y-5">
                {reportsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-4 text-xs"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-neutral-900">
                          {rep.id}
                        </span>
                        <span className="mx-2 text-neutral-300">•</span>
                        <span className="font-bold text-indigo-700">{rep.category}</span>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Complainant: <strong>{rep.fullName}</strong> ({rep.email} •{" "}
                          {rep.phone})
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Location: {rep.incidentLocation} | Incident Time:{" "}
                          {rep.incidentDateTime}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold ${
                            rep.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : rep.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {rep.status}
                        </span>
                        <button
                          onClick={() => handleDeleteReport(rep.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="p-4 bg-white rounded-xl border border-neutral-200 text-neutral-700 leading-relaxed">
                      {rep.description}
                    </p>

                    {rep.evidenceUrl && (
                      <div>
                        <a
                          href={rep.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-700 hover:underline"
                        >
                          Inspect Attached Cloudinary Evidence{" "}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Status + Investigator Notes Updater */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-neutral-200">
                      <select
                        value={reportStatusDraft[rep.id] || rep.status}
                        onChange={(e) =>
                          setReportStatusDraft((prev) => ({
                            ...prev,
                            [rep.id]: e.target.value as Report["status"],
                          }))
                        }
                        className="md:col-span-3 bg-white border border-neutral-200 rounded-xl px-3 py-2 font-mono text-xs"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Investigator notes (emailed to complainant)..."
                        value={
                          reportNotesDraft[rep.id] !== undefined
                            ? reportNotesDraft[rep.id]
                            : rep.notes || ""
                        }
                        onChange={(e) =>
                          setReportNotesDraft((prev) => ({
                            ...prev,
                            [rep.id]: e.target.value,
                          }))
                        }
                        className="md:col-span-5 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => handleSaveReportStatus(rep)}
                        className="md:col-span-2 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                      >
                        Update &amp; Email
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveFirModal(rep);
                          setFirForm({
                            policeStation:
                              rep.firDetails?.policeStation ||
                              "Marina Bay Cyber Command HQ",
                            district: rep.firDetails?.district || "Singapore Zone 1",
                            officerDetails:
                              rep.firDetails?.officerDetails || currentUser.username,
                            summary: rep.firDetails?.summary || rep.notes || "",
                            verificationCode:
                              rep.firDetails?.verificationCode ||
                              `THAM-FIR-${Math.floor(100000 + Math.random() * 900000)}`,
                            signature:
                              rep.firDetails?.signature ||
                              `SIGNED-${currentUser.username.toUpperCase()}`,
                          });
                        }}
                        className="md:col-span-2 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                      >
                        {rep.firNumber ? "Edit FIR" : "Sign Official FIR"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FIR SIGNING MODAL */}
            {activeFirModal && (
              <div className="fixed inset-0 z-50 bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleSignFIR}
                  className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-4 border border-neutral-200 shadow-2xl text-xs"
                >
                  <h4 className="font-display font-bold text-lg text-neutral-900">
                    Sign &amp; Issue Official FIR ({activeFirModal.id})
                  </h4>
                  <p className="text-neutral-500">
                    Signing approves the case and dispatches the official FIR notification from{" "}
                    <strong>no-reply@thamjj13.top</strong> to{" "}
                    <strong>{activeFirModal.email}</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Station / Command Node"
                      value={firForm.policeStation}
                      onChange={(e) =>
                        setFirForm({ ...firForm, policeStation: e.target.value })
                      }
                      className="border border-neutral-200 rounded-xl px-3 py-2.5"
                    />
                    <input
                      type="text"
                      required
                      placeholder="District / Zone"
                      value={firForm.district}
                      onChange={(e) =>
                        setFirForm({ ...firForm, district: e.target.value })
                      }
                      className="border border-neutral-200 rounded-xl px-3 py-2.5"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Investigating Officer"
                      value={firForm.officerDetails}
                      onChange={(e) =>
                        setFirForm({ ...firForm, officerDetails: e.target.value })
                      }
                      className="border border-neutral-200 rounded-xl px-3 py-2.5"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Verification Code"
                      value={firForm.verificationCode}
                      onChange={(e) =>
                        setFirForm({ ...firForm, verificationCode: e.target.value })
                      }
                      className="border border-neutral-200 rounded-xl px-3 py-2.5 font-mono"
                    />
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Official Investigator Findings & Legal Summary..."
                    value={firForm.summary}
                    onChange={(e) =>
                      setFirForm({ ...firForm, summary: e.target.value })
                    }
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Cryptographic Digital Signature"
                    value={firForm.signature}
                    onChange={(e) =>
                      setFirForm({ ...firForm, signature: e.target.value })
                    }
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 font-mono"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveFirModal(null)}
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      Seal FIR &amp; Notify Complainant
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {/* 3. CADETS & ADMIN NODES */}
        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {currentUser.role === UserRole.SUPER_ADMIN && (
              <form
                onSubmit={handleCreateSubAdmin}
                className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4 text-xs"
              >
                <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" /> Provision Administrative Officer
                </h3>
                <p className="text-neutral-500">
                  Creates an approved officer in Turso with bcrypt credentials and emails their onboarding notice via{" "}
                  <strong>no-reply@thamjj13.top</strong>.
                </p>

                {adminCreateMsg && (
                  <div
                    className={`p-3 rounded-xl font-mono border ${
                      adminCreateMsg.ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {adminCreateMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Officer Callsign *"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Official Email *"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Initial Password (min 8) *"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                  />
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 font-mono"
                  >
                    {ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Provision Officer &amp; Send Credentials
                </button>
              </form>
            )}

            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">
                Registered Personnel &amp; Cadet Clearance Roster ({usersList.length})
              </h3>

              <div className="space-y-3">
                {usersList.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border border-neutral-200 flex flex-wrap justify-between items-center gap-4 text-xs bg-neutral-50/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{u.username}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 bg-neutral-200/70 rounded">
                          {u.role}
                        </span>
                        {u.approved ? (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            ✓ APPROVED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-700 font-bold">
                            ⏳ PENDING CLEARANCE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                        {u.email} {u.phone ? `• ${u.phone}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!u.approved && (
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Approve &amp; Email
                        </button>
                      )}

                      {currentUser.role === UserRole.SUPER_ADMIN &&
                        u.id !== currentUser.id && (
                          <>
                            <select
                              value={u.role}
                              onChange={(e) =>
                                handleChangeRole(u.id, e.target.value as UserRole)
                              }
                              className="bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                            >
                              <option value={UserRole.STUDENT}>STUDENT</option>
                              {ADMIN_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-neutral-400 hover:text-red-600 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. DIRECT INBOXES (CONTACT / TICKETS / LIVE SOC CHAT) */}
        {activeTab === "inbox" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex gap-2 bg-white p-2 rounded-2xl border border-neutral-200 text-xs font-mono">
              <button
                onClick={() => setInboxSubTab("messages")}
                className={`flex-1 py-2.5 rounded-xl font-bold cursor-pointer ${
                  inboxSubTab === "messages"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600"
                }`}
              >
                Contact Inquiries ({messages.length})
              </button>
              <button
                onClick={() => setInboxSubTab("tickets")}
                className={`flex-1 py-2.5 rounded-xl font-bold cursor-pointer ${
                  inboxSubTab === "tickets"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600"
                }`}
              >
                Support Tickets ({tickets.length})
              </button>
              <button
                onClick={() => setInboxSubTab("chats")}
                className={`flex-1 py-2.5 rounded-xl font-bold cursor-pointer ${
                  inboxSubTab === "chats"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600"
                }`}
              >
                Live SOC Chats ({chatSessions.length})
              </button>
            </div>

            {inboxSubTab === "messages" && (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  Direct Compliance &amp; SLA Inquiries
                </h3>
                {messages.length === 0 ? (
                  <p className="text-xs text-neutral-500">No contact inquiries yet.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3 text-xs"
                    >
                      <div className="flex justify-between">
                        <div>
                          <strong>{m.subject}</strong> — {m.name} ({m.email})
                        </div>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {m.status}
                        </span>
                      </div>
                      <p className="text-neutral-700">{m.message}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write official reply (sent via Resend no-reply@thamjj13.top)..."
                          value={replyText[m.id] || ""}
                          onChange={(e) =>
                            setReplyText((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2"
                        />
                        <button
                          onClick={() => handleReplyContact(m.id)}
                          className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Email
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {inboxSubTab === "tickets" && (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  Cadet Helpdesk Tickets
                </h3>
                {tickets.length === 0 ? (
                  <p className="text-xs text-neutral-500">No support tickets open.</p>
                ) : (
                  tickets.map((tk) => (
                    <div
                      key={tk.id}
                      className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <strong>{tk.subject}</strong> — {tk.username} ({tk.priority})
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold">
                            {tk.status}
                          </span>
                          {tk.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleResolveTicket(tk.id)}
                              className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-neutral-700">{tk.description || tk.message}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Reply to cadet (emails notification via Resend)..."
                          value={ticketReplyText[tk.id] || ""}
                          onChange={(e) =>
                            setTicketReplyText((prev) => ({
                              ...prev,
                              [tk.id]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2"
                        />
                        <button
                          onClick={() => handleReplyTicket(tk.id)}
                          className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {inboxSubTab === "chats" && (
              <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[420px]">
                <div className="md:col-span-4 border-r border-neutral-100 pr-4 space-y-2">
                  <h4 className="font-display font-bold text-sm text-neutral-900 mb-3">
                    Active Visitor Channels
                  </h4>
                  {chatSessions.length === 0 ? (
                    <p className="text-xs text-neutral-400">No chat sessions yet.</p>
                  ) : (
                    chatSessions.map((cs) => (
                      <button
                        key={cs.id}
                        onClick={() => setActiveChatId(cs.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                          activeChatId === cs.id
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "bg-neutral-50 border-neutral-200 text-neutral-800"
                        }`}
                      >
                        <div className="font-bold truncate">{cs.visitorName}</div>
                        <div className="text-[10px] opacity-70 font-mono truncate">
                          {cs.id} • {cs.messages.length} msgs
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="md:col-span-8 flex flex-col justify-between">
                  {selectedChat ? (
                    <>
                      <div className="space-y-2 max-h-72 overflow-y-auto p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
                        {selectedChat.messages.map((msg) => (
                          <div key={msg.id} className="p-2.5 bg-white rounded-xl border border-neutral-200">
                            <span className="font-mono text-[10px] text-indigo-700 font-bold block">
                              {msg.senderName} ({msg.senderRole})
                            </span>
                            <p className="text-neutral-800 mt-0.5">{msg.content}</p>
                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt="chat attachment"
                                className="mt-2 max-h-32 rounded border"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendAdminChat} className="flex gap-2 mt-4">
                        <input
                          type="text"
                          value={adminChatInput}
                          onChange={(e) => setAdminChatInput(e.target.value)}
                          placeholder="Respond to live visitor as SOC Analyst..."
                          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                      Select a visitor chat session on the left to respond.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 5. CMS DATA BUILDER */}
        {activeTab === "cms" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6 text-xs"
          >
            <div className="flex flex-wrap gap-2 border-b border-neutral-100 pb-4">
              {[
                { id: "slides", label: "Hero Slides" },
                { id: "services", label: "Services" },
                { id: "team", label: "Command Team" },
                { id: "gallery", label: "Media Gallery" },
                { id: "faqs", label: "FAQs" },
                { id: "stats", label: "Platform Stats" },
                { id: "alliances", label: "Alliances" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCmsSubTab(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl font-mono font-bold cursor-pointer ${
                    cmsSubTab === t.id
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {cmsSubTab === "slides" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="Hero Title"
                    value={newSlide.title}
                    onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="CTA Button Text"
                    value={newSlide.ctaText}
                    onChange={(e) =>
                      setNewSlide({ ...newSlide, ctaText: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Subtitle"
                  value={newSlide.subtitle}
                  onChange={(e) =>
                    setNewSlide({ ...newSlide, subtitle: e.target.value })
                  }
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <div className="flex gap-3 items-center">
                  <input
                    placeholder="Background Image URL (or upload via Cloudinary)"
                    value={newSlide.bgImage}
                    onChange={(e) =>
                      setNewSlide({ ...newSlide, bgImage: e.target.value })
                    }
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <label className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl font-bold cursor-pointer">
                    {uploadingState.slide ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          uploadViaCloudinary(f, "slide", "thamjj13/cms", (url) =>
                            setNewSlide((p) => ({ ...p, bgImage: url }))
                          );
                      }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      newSlide.title &&
                      handleAddCmsItem("hero-slides", newSlide, () =>
                        setNewSlide({
                          title: "",
                          subtitle: "",
                          ctaText: "Explore Academy",
                          bgImage: "",
                        })
                      )
                    }
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Slide
                  </button>
                </div>

                <div className="space-y-2 pt-3">
                  {heroSlides.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span className="font-bold">{s.title}</span>
                      <button
                        onClick={() => handleDeleteCmsItem("hero-slides", s.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "services" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    placeholder="Service Title"
                    value={newService.title}
                    onChange={(e) =>
                      setNewService({ ...newService, title: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Icon (Shield, Terminal, Zap, Database, Globe)"
                    value={newService.icon}
                    onChange={(e) =>
                      setNewService({ ...newService, icon: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <button
                    onClick={() =>
                      newService.title &&
                      handleAddCmsItem("services", newService, () =>
                        setNewService({ title: "", description: "", icon: "Shield" })
                      )
                    }
                    className="bg-neutral-900 text-white rounded-xl font-bold py-2.5 cursor-pointer"
                  >
                    Add Service
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Service Description"
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({ ...newService, description: e.target.value })
                  }
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <div className="space-y-2">
                  {servicesList.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>
                        <strong>{s.title}</strong> — {s.description}
                      </span>
                      <button
                        onClick={() => handleDeleteCmsItem("services", s.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "team" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    placeholder="Officer Name"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Role / Title"
                    value={newMember.role}
                    onChange={(e) =>
                      setNewMember({ ...newMember, role: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Location"
                    value={newMember.location}
                    onChange={(e) =>
                      setNewMember({ ...newMember, location: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    placeholder="Avatar URL"
                    value={newMember.avatar}
                    onChange={(e) =>
                      setNewMember({ ...newMember, avatar: e.target.value })
                    }
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <label className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl font-bold cursor-pointer">
                    {uploadingState.member ? "Uploading..." : "Cloudinary Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          uploadViaCloudinary(f, "member", "thamjj13/team", (url) =>
                            setNewMember((p) => ({ ...p, avatar: url }))
                          );
                      }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      newMember.name &&
                      handleAddCmsItem("team-members", newMember, () =>
                        setNewMember({
                          name: "",
                          role: "",
                          location: "Singapore HQ",
                          avatar: "",
                          bio: "",
                        })
                      )
                    }
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Member
                  </button>
                </div>
                <div className="space-y-2">
                  {teamMembers.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>
                        <strong>{t.name}</strong> — {t.role} ({t.location})
                      </span>
                      <button
                        onClick={() => handleDeleteCmsItem("team-members", t.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "gallery" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    placeholder="Photo Caption"
                    value={newGallery.title}
                    onChange={(e) =>
                      setNewGallery({ ...newGallery, title: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Category"
                    value={newGallery.category}
                    onChange={(e) =>
                      setNewGallery({ ...newGallery, category: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <div className="flex gap-2">
                    <label className="flex-1 py-2.5 px-3 bg-neutral-100 border border-neutral-200 rounded-xl font-bold text-center cursor-pointer">
                      {uploadingState.gallery ? "Uploading..." : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f)
                            uploadViaCloudinary(
                              f,
                              "gallery",
                              "thamjj13/gallery",
                              (url) => setNewGallery((p) => ({ ...p, url }))
                            );
                        }}
                      />
                    </label>
                    <button
                      onClick={() =>
                        newGallery.title &&
                        newGallery.url &&
                        handleAddCmsItem("gallery", newGallery, () =>
                          setNewGallery({
                            title: "",
                            category: "Operations",
                            url: "",
                          })
                        )
                      }
                      className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Publish
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {galleryItems.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>
                        <strong>{g.title}</strong> ({g.category})
                      </span>
                      <button
                        onClick={() => handleDeleteCmsItem("gallery", g.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "faqs" && (
              <div className="space-y-4">
                <input
                  placeholder="Question"
                  value={newFaq.q}
                  onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <textarea
                  rows={2}
                  placeholder="Answer"
                  value={newFaq.a}
                  onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <button
                  onClick={() =>
                    newFaq.q &&
                    handleAddCmsItem("faqs", newFaq, () => setNewFaq({ q: "", a: "" }))
                  }
                  className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Add FAQ
                </button>
                <div className="space-y-2">
                  {faqsList.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>{f.question || f.q}</span>
                      <button
                        onClick={() => handleDeleteCmsItem("faqs", f.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    placeholder="Label (e.g. UPTIME)"
                    value={newStat.label}
                    onChange={(e) =>
                      setNewStat({ ...newStat, label: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Value (e.g. 99.98%)"
                    value={newStat.value}
                    onChange={(e) =>
                      setNewStat({ ...newStat, value: e.target.value })
                    }
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Description"
                    value={newStat.desc}
                    onChange={(e) => setNewStat({ ...newStat, desc: e.target.value })}
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <button
                    onClick={() =>
                      newStat.label &&
                      handleAddCmsItem("stats", newStat, () =>
                        setNewStat({ label: "", value: "", desc: "" })
                      )
                    }
                    className="bg-neutral-900 text-white rounded-xl font-bold py-2.5 cursor-pointer"
                  >
                    Add Stat
                  </button>
                </div>
                <div className="space-y-2">
                  {statsList.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>
                        <strong>{s.label}:</strong> {s.value} —{" "}
                        {s.description || s.desc}
                      </span>
                      <button
                        onClick={() => handleDeleteCmsItem("stats", s.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cmsSubTab === "alliances" && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    placeholder="Compliance Standard / Alliance Name"
                    value={newAlliance.name}
                    onChange={(e) => setNewAlliance({ name: e.target.value })}
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <button
                    onClick={() =>
                      newAlliance.name &&
                      handleAddCmsItem("alliances", newAlliance, () =>
                        setNewAlliance({ name: "" })
                      )
                    }
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Alliance
                  </button>
                </div>
                <div className="space-y-2">
                  {alliancesList.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                    >
                      <span>{a.name}</span>
                      <button
                        onClick={() => handleDeleteCmsItem("alliances", a.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 6. ACADEMY CURRICULUM */}
        {activeTab === "courses" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-xs"
          >
            <form
              onSubmit={handleCreateCourse}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4"
            >
              <h3 className="font-display font-bold text-lg text-neutral-900">
                Deploy New Academy Course
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  required
                  placeholder="Course Title *"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <input
                  required
                  placeholder="Category"
                  value={courseCat}
                  onChange={(e) => setCourseCat(e.target.value)}
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value as any)}
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <textarea
                required
                rows={2}
                placeholder="Course Syllabus Summary *"
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
              />
              <div className="flex gap-3">
                <input
                  placeholder="Thumbnail URL (or upload via Cloudinary)"
                  value={courseThumb}
                  onChange={(e) => setCourseThumb(e.target.value)}
                  className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <label className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl font-bold cursor-pointer">
                  {uploadingState.courseThumb ? "Uploading..." : "Cloudinary Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        uploadViaCloudinary(
                          f,
                          "courseThumb",
                          "thamjj13/courses",
                          (url) => setCourseThumb(url)
                        );
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Publish Course
                </button>
              </div>
            </form>

            {courses.length > 0 && (
              <form
                onSubmit={handleAddLesson}
                className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4"
              >
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  Append Video Module to Course
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={selectedCourseForLesson}
                    onChange={(e) => setSelectedCourseForLesson(e.target.value)}
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Lesson Title *"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <input
                    placeholder="Duration (e.g. 22:15)"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Lesson Overview"
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <div className="flex gap-3">
                  <input
                    placeholder="MP4 Video URL (or upload via Cloudinary)"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                  />
                  <label className="px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl font-bold cursor-pointer">
                    {uploadingState.lessonVid ? "Uploading..." : "Upload Video"}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          uploadViaCloudinary(
                            f,
                            "lessonVid",
                            "thamjj13/videos",
                            (url) => setLessonVideoUrl(url)
                          );
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Lesson
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-3">
              <h4 className="font-display font-bold text-base text-neutral-900">
                Active Academy Tracks ({courses.length})
              </h4>
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-neutral-200 flex justify-between items-center bg-neutral-50/40"
                >
                  <div>
                    <div className="font-bold text-neutral-900">{c.title}</div>
                    <div className="text-[11px] font-mono text-neutral-500">
                      {c.category} • {c.level} • {c.lessons.length} lessons
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(c.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 7. RESEND MAIL GATEWAY */}
        {activeTab === "resend" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-xs"
          >
            <form
              onSubmit={handleSaveResend}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-5"
            >
              <div className="flex flex-wrap justify-between items-start gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                    <Mail className="w-5 h-5" /> Resend.com Transactional Mail Gateway
                  </h3>
                  <p className="text-neutral-500 mt-1">
                    Powers all Admin &amp; Cadet OTPs, Case Report confirmations, FIR approvals, and helpdesk replies via{" "}
                    <strong>no-reply@thamjj13.top</strong>.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold ${
                    resendConfig.apiKeyConfigured
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {resendConfig.apiKeyConfigured
                    ? `CONNECTED (${resendConfig.source})`
                    : "API KEY UNSET"}
                </span>
              </div>

              {resendFeedback && (
                <div
                  className={`p-3.5 rounded-xl font-mono border ${
                    resendFeedback.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {resendFeedback.msg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-500 mb-1 uppercase">
                    Verified Sender Email (Resend Domain)
                  </label>
                  <input
                    type="email"
                    required
                    value={resendConfig.fromEmail}
                    onChange={(e) =>
                      setResendConfig({ ...resendConfig, fromEmail: e.target.value })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-500 mb-1 uppercase">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={resendConfig.fromName}
                    onChange={(e) =>
                      setResendConfig({ ...resendConfig, fromName: e.target.value })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-500 mb-1 uppercase">
                    Admin Incident Alert Inbox
                  </label>
                  <input
                    type="email"
                    required
                    value={resendConfig.adminAlertEmail}
                    onChange={(e) =>
                      setResendConfig({
                        ...resendConfig,
                        adminAlertEmail: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-500 mb-1 uppercase">
                    Resend API Key (re_...) — Optional if RESEND_API_KEY env is set
                  </label>
                  <input
                    type="password"
                    placeholder={
                      resendConfig.apiKeyMasked || "re_xxxxxxxxxxxxxxxxx"
                    }
                    value={resendApiKeyInput}
                    onChange={(e) => setResendApiKeyInput(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Resend Settings
                </button>

                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    placeholder="Test recipient email"
                    value={testEmailTarget}
                    onChange={(e) => setTestEmailTarget(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-mono"
                  />
                  <button
                    type="button"
                    disabled={testingResend}
                    onClick={handleTestResend}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    {testingResend ? "Sending..." : "Send Test Email"}
                  </button>
                </div>
              </div>
            </form>

            {/* MAIL DELIVERY LEDGER */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-bold text-base text-neutral-900">
                  Outbound Transactional Mail Ledger ({mailLogs.length})
                </h4>
                <button
                  onClick={fetchAllData}
                  className="text-xs font-mono text-indigo-600 hover:underline cursor-pointer"
                >
                  Refresh Logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px]">
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="py-2 pr-3">Subject</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {mailLogs.slice(0, 30).map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 pr-3 font-bold text-neutral-800">
                          {log.category}
                        </td>
                        <td className="py-2.5 pr-3 text-neutral-600">{log.toEmail}</td>
                        <td className="py-2.5 pr-3 text-neutral-700 truncate max-w-xs">
                          {log.subject}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === "SENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.status === "SIMULATED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-neutral-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {mailLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-400">
                          No outbound emails logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* 8. CLOUDINARY CDN & VAULT */}
        {activeTab === "cloudinary" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-xs"
          >
            <form
              onSubmit={handleSaveCloudinary}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5" /> Cloudinary Media &amp; Evidence Storage
                  </h3>
                  <p className="text-neutral-500 mt-1">
                    Stores incident evidence, avatars, vault files, CMS photos, and course videos.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold ${
                    cloudinaryConfig.configured
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {cloudinaryConfig.configured ? "CONNECTED" : "UNCONFIGURED"}
                </span>
              </div>

              {cloudinarySavedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-emerald-800">
                  {cloudinarySavedMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Cloud Name"
                  value={cloudinaryConfig.cloudName}
                  onChange={(e) =>
                    setCloudinaryConfig({
                      ...cloudinaryConfig,
                      cloudName: e.target.value,
                    })
                  }
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                />
                <input
                  placeholder="API Key"
                  value={cloudinaryConfig.apiKey}
                  onChange={(e) =>
                    setCloudinaryConfig({
                      ...cloudinaryConfig,
                      apiKey: e.target.value,
                    })
                  }
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                />
                <input
                  type="password"
                  placeholder="API Secret"
                  value={cloudinaryConfig.apiSecret}
                  onChange={(e) =>
                    setCloudinaryConfig({
                      ...cloudinaryConfig,
                      apiSecret: e.target.value,
                    })
                  }
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                />
                <input
                  placeholder="Optional Unsigned Upload Preset"
                  value={cloudinaryConfig.uploadPreset}
                  onChange={(e) =>
                    setCloudinaryConfig({
                      ...cloudinaryConfig,
                      uploadPreset: e.target.value,
                    })
                  }
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
              >
                Save Cloudinary Settings
              </button>
            </form>

            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-3">
              <h4 className="font-display font-bold text-base text-neutral-900">
                Global Encrypted Vault Ledger ({vaultItems.length})
              </h4>
              {vaultItems.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl border border-neutral-200 flex justify-between items-center bg-neutral-50/50"
                >
                  <div>
                    <div className="font-bold text-neutral-900">{v.fileName}</div>
                    <div className="font-mono text-[10px] text-neutral-400">
                      Uploaded by {v.uploadedBy} • {v.fileSize}
                    </div>
                  </div>
                  <a
                    href={v.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 9. SECURITY, EVENTS & IMMUTABLE AUDIT LOGS */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-xs"
          >
            {/* Rotate Admin Password */}
            <form
              onSubmit={handleRotatePassword}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4"
            >
              <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Rotate My Administrator Password
              </h3>
              {pwdMsg && (
                <div
                  className={`p-3 rounded-xl font-mono border ${
                    pwdMsg.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {pwdMsg.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="password"
                  required
                  placeholder="Current Password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="New Password (min 8 chars)"
                  value={nextPwd}
                  onChange={(e) => setNextPwd(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                />
                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl py-2.5 cursor-pointer"
                >
                  Rotate Password
                </button>
              </div>
            </form>

            {/* Cyber Events Manager */}
            <form
              onSubmit={handleCreateEvent}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4"
            >
              <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Academy Live Seminars &amp; CTF Events
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  required
                  placeholder="Seminar Title *"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <input
                  placeholder="Time (e.g. 20:00 GMT+8)"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="border border-neutral-200 rounded-xl px-3 py-2.5"
                />
              </div>
              <div className="flex gap-3">
                <input
                  required
                  placeholder="Briefing Description *"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Schedule Event
                </button>
              </div>
              <div className="space-y-2 pt-2">
                {eventsList.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center"
                  >
                    <span>
                      <strong>{ev.title}</strong> — {ev.date} ({ev.time})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </form>

            {/* Developer API Keys */}
            {currentUser.role === UserRole.SUPER_ADMIN && (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <Key className="w-5 h-5" /> Service Integration API Keys
                </h3>
                <form onSubmit={handleGenerateApiKey} className="flex gap-3">
                  <input
                    placeholder="Key Label (e.g. SIEM Webhook)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-neutral-900 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Generate Key
                  </button>
                </form>
                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex justify-between items-center font-mono"
                    >
                      <div>
                        <strong>{k.name}</strong>:{" "}
                        <span className="text-neutral-600">{k.key}</span>
                      </div>
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Immutable Audit Logs */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">
                Immutable Security Audit Ledger ({auditLogs.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap justify-between gap-2"
                  >
                    <span>
                      <strong className="text-indigo-700">[{log.actor}]</strong>{" "}
                      {log.action}
                    </span>
                    <span className="text-neutral-400">
                      {log.ip} • {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}
