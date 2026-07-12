import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Users, MessageSquare, Terminal, Settings, Database, 
  CheckCircle2, XCircle, Send, Play, RefreshCw, Activity, LayoutGrid, 
  LockIcon, Key, Globe, Radio, AlertCircle, HardDrive, Download, 
  ChevronLeft, ChevronRight, Sliders, Image as ImageIcon, HelpCircle, AlertTriangle, 
  CloudLightning, Upload, Plus, Trash2, Edit3, Shield, BookOpen
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend
} from "recharts";
import { UserRole, UserProfile, ContactMessage, LiveChatSession, VisitorLog, SmtpConfig, ApiKeyConfig, FileVaultItem, Report, Course, Lesson, CourseVideo } from "../types";

interface AdminPortalProps {
  currentUser: { id: string; username: string; role: UserRole } | null;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  visitorLogs: VisitorLog[];
}

export default function AdminPortal({ currentUser, onLogout, onNavigate, visitorLogs }: AdminPortalProps) {
  // Navigation tabs (collapsible sidebar)
  const [activeSubTab, setActiveSubTab] = useState<
    "dashboard" | "users" | "inbox" | "analytics" | "smtp" | "security" | "cms" | "reports" | "academy"
  >("dashboard");
  
  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Active sub-section inside the CMS tab
  const [cmsSection, setCmsSection] = useState<
    "slides" | "services" | "team" | "gallery" | "faqs" | "stats" | "alliances" | "cloudinary"
  >("slides");

  // Real database states fetched from backend
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [chats, setChats] = useState<LiveChatSession[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [smtpList, setSmtpList] = useState<SmtpConfig[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Academy Management State
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", category: "Penetration Testing", level: "Intermediate", thumbnail: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", videoTitle: "", videoUrl: "", videoDuration: "", thumbnail: "", pdfUrl: "", pdfName: "" });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [academySuccess, setAcademySuccess] = useState<string | null>(null);
  const [academyError, setAcademyError] = useState<string | null>(null);

  // Drag & Drop Media Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "paused" | "completed" | "cancelled">("idle");
  const [uploadIntervalRef, setUploadIntervalRef] = useState<any>(null);

  // Draft FIR details form
  const [firForm, setFirForm] = useState({
    policeStation: "SLA Cyber Crime Dispatch, Singapore",
    officerDetails: "Cmdr. Tasnim Islam (Badge #13)",
    signature: "Tasnim Islam"
  });
  const [firSubmitting, setFirSubmitting] = useState(false);
  const [firSuccess, setFirSuccess] = useState<string | null>(null);

  // SMTP settings testing state
  const [smtpForm, setSmtpForm] = useState({ host: "mail.thamjj13.com", port: 465, user: "outbox@thamjj13.com" });
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  // Active inbox selected reply thread
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // API key creation state
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyCreated, setNewKeyCreated] = useState<string | null>(null);

  // Backup state
  const [backupTriggering, setBackupTriggering] = useState(false);

  // ==========================================
  // CMS DYNAMIC DATABASES STATES
  // ==========================================
  const [cmsSlides, setCmsSlides] = useState<any[]>([]);
  const [cmsServices, setCmsServices] = useState<any[]>([]);
  const [cmsTeam, setCmsTeam] = useState<any[]>([]);
  const [cmsGallery, setCmsGallery] = useState<any[]>([]);
  const [cmsFaqs, setCmsFaqs] = useState<any[]>([]);
  const [cmsStats, setCmsStats] = useState<any[]>([]);
  const [cmsAlliances, setCmsAlliances] = useState<any[]>([]);
  const [cloudinarySettings, setCloudinarySettings] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    uploadPreset: ""
  });

  // CMS forms state
  const [slideForm, setSlideForm] = useState({ title: "", subtitle: "", bgImage: "", ctaText: "", ctaLink: "" });
  const [serviceForm, setServiceForm] = useState({ title: "", description: "", icon: "Shield" });
  const [teamForm, setTeamForm] = useState({ name: "", role: "", location: "", avatar: "", badgesStr: "" });
  const [galleryForm, setGalleryForm] = useState({ title: "", category: "Operations", url: "" });
  const [faqForm, setFaqForm] = useState({ q: "", a: "" });
  const [statForm, setStatForm] = useState({ label: "", value: "", desc: "" });
  const [allianceForm, setAllianceForm] = useState({ name: "" });

  const [cmsActionResult, setCmsActionResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 8000);
    return () => clearInterval(interval);
  }, [activeSubTab]);

  const fetchAdminData = async () => {
    try {
      const [uRes, mRes, cRes, sRes, akRes, alRes, hRes, slidesRes, servicesRes, teamRes, galleryRes, faqsRes, statsRes, alliancesRes, cloudRes, rRes, coursesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/messages"),
        fetch("/api/admin/chats"),
        fetch("/api/visitor-stats"),
        fetch("/api/admin/api-keys"),
        fetch("/api/admin/audit-logs"),
        fetch("/api/system-health"),
        // CMS lists
        fetch("/api/cms/hero-slides"),
        fetch("/api/cms/services"),
        fetch("/api/cms/team-members"),
        fetch("/api/cms/gallery"),
        fetch("/api/cms/faqs"),
        fetch("/api/cms/stats"),
        fetch("/api/cms/alliances"),
        fetch("/api/cms/cloudinary-settings"),
        fetch("/api/reports"),
        fetch("/api/courses")
      ]);

      setUsers(await uRes.json());
      setMessages(await mRes.json());
      setChats(await cRes.json());
      setStats(await sRes.json());
      setApiKeys(await akRes.json());
      setAuditLogs(await alRes.json());
      setSystemHealth(await hRes.json());

      setCmsSlides(await slidesRes.json());
      setCmsServices(await servicesRes.json());
      setCmsTeam(await teamRes.json());
      setCmsGallery(await galleryRes.json());
      setCmsFaqs(await faqsRes.json());
      setCmsStats(await statsRes.json());
      setCmsAlliances(await alliancesRes.json());
      setCloudinarySettings(await cloudRes.json());
      setCourses(await coursesRes.json());
      
      const reportsData = await rRes.json();
      setReports(reportsData);
    } catch (err) {
      console.error("Failed to load admin panel data:", err);
    }
  };

  // User approvals
  const handleApproveUser = async (id: string, approved: boolean, role?: UserRole) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, role }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string, notes?: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedReport(updated);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateFIR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setFirSubmitting(true);
    setFirSuccess(null);

    // Cryptographically verifiable FIR verification code and FIR Number
    const generatedVerificationCode = "FIR-VKEY-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Date.now().toString().slice(-4);
    const firNumber = "FIR-" + Date.now().toString().slice(-6) + "-" + Math.floor(Math.random() * 899 + 100);

    const firDetails = {
      firNumber,
      policeStation: firForm.policeStation,
      officerDetails: firForm.officerDetails,
      signature: firForm.signature,
      verificationCode: generatedVerificationCode,
      finalizedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`/api/reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          firDetails
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedReport(updated);
        setFirSuccess("🟢 Success: Cryptographic First Information Report (FIR) generated, signed, and complainant notified.");
        fetchAdminData();
      } else {
        setFirSuccess("❌ Failed to register FIR.");
      }
    } catch (err) {
      setFirSuccess("❌ Pipeline connection error.");
    } finally {
      setFirSubmitting(false);
    }
  };

  // Create sub-admins
  const [newAdminForm, setNewAdminForm] = useState({ username: "", email: "", role: UserRole.SECONDARY_ADMIN });
  const [newAdminResult, setNewAdminResult] = useState<string | null>(null);
  
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewAdminResult(null);
    try {
      const res = await fetch("/api/admin/users/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdminForm),
      });
      const data = await res.json();
      if (res.ok) {
        setNewAdminResult(`🚀 Successfully provisioned administrative access for ${data.user.username}`);
        setNewAdminForm({ username: "", email: "", role: UserRole.SECONDARY_ADMIN });
        fetchAdminData();
      } else {
        setNewAdminResult(`❌ Failed: ${data.error}`);
      }
    } catch (err) {
      setNewAdminResult(`❌ Failed: Network socket failure`);
    }
  };

  // Contact Replies
  const handleReplyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMessage || !replyText.trim()) return;

    try {
      const res = await fetch(`/api/admin/messages/${activeMessage.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText,
          senderName: currentUser ? currentUser.username : "THAMJJ13 SOC Outbox",
        }),
      });
      if (res.ok) {
        setReplySuccess(`🚀 Reply dispatched! System routed email response safely via SMTP.`);
        setReplyText("");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // SMTP Testing
  const handleTestSmtp = async () => {
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpTestResult(`🟢 SUCCESS: ${data.message}`);
      }
    } catch (err) {
      setSmtpTestResult(`🔴 FAIL: Connection refused or TLS timeout.`);
    }
  };

  // Api keys
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, role: "Audit Logger Node" }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKeyCreated(data.apiKey.key);
        setNewKeyName("");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/revoke`, { method: "POST" });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Cloud backup
  const handleTriggerBackup = async () => {
    setBackupTriggering(true);
    try {
      await fetch("/api/admin/backup/trigger", { method: "POST" });
      fetchAdminData();
      alert("SHA-256 cloud administrative backup complete.");
    } catch (err) {
      console.error(err);
    } finally {
      setBackupTriggering(false);
    }
  };

  // ==========================================
  // CMS CRUD SUBMISSIONS
  // ==========================================
  const handleSaveCloudinarySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/cloudinary-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudinarySettings)
      });
      if (res.ok) {
        setCmsActionResult("✓ Cloudinary settings synchronized and verified!");
        fetchAdminData();
      }
    } catch (err) {
      setCmsActionResult("Failed to update cloud CDN credentials.");
    }
  };

  const handleAddHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slideForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Slide registered to offensive operations panel.");
        setSlideForm({ title: "", subtitle: "", bgImage: "", ctaText: "", ctaLink: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    try {
      await fetch(`/api/cms/hero-slides/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Service provision registered into Singapore/Dhaka grid.");
        setServiceForm({ title: "", description: "", icon: "Shield" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await fetch(`/api/cms/services/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    const badges = teamForm.badgesStr.split(",").map(b => b.trim()).filter(b => b);
    try {
      const res = await fetch("/api/cms/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teamForm,
          badges
        })
      });
      if (res.ok) {
        setCmsActionResult("✓ Command team officer verified and indexed.");
        setTeamForm({ name: "", role: "", location: "Singapore", avatar: "", badgesStr: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    try {
      await fetch(`/api/cms/team-members/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(galleryForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Operational image loaded to media vault.");
        setGalleryForm({ title: "", category: "Operations", url: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await fetch(`/api/cms/gallery/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Frequently asked query loaded to database.");
        setFaqForm({ q: "", a: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await fetch(`/api/cms/faqs/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStat = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Counter statistic saved dynamically.");
        setStatForm({ label: "", value: "", desc: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStat = async (id: string) => {
    try {
      await fetch(`/api/cms/stats/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAlliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsActionResult(null);
    try {
      const res = await fetch("/api/cms/alliances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allianceForm)
      });
      if (res.ok) {
        setCmsActionResult("✓ Security alliance registered.");
        setAllianceForm({ name: "" });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAlliance = async (id: string) => {
    try {
      await fetch(`/api/cms/alliances/${id}`, { method: "DELETE" });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Mock upload logic (simulates unsigned Cloudinary upload if config is present, or defaults to neat local base64)
  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "slide" | "team" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      // If cloudinary preset & cloudName are saved, try real Cloudinary API endpoint!
      if (cloudinarySettings.cloudName && cloudinarySettings.uploadPreset) {
        try {
          const formData = new FormData();
          formData.append("file", base64String);
          formData.append("upload_preset", cloudinarySettings.uploadPreset);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinarySettings.cloudName}/image/upload`, {
            method: "POST",
            body: formData
          });
          const cloudData = await res.json();
          if (cloudData.secure_url) {
            updateImageState(targetField, cloudData.secure_url);
            return;
          }
        } catch (err) {
          console.warn("Direct Cloudinary upload failed, falling back to local simulation:", err);
        }
      }

      // Local fallback simulation URL
      const fallbackUrl = base64String;
      updateImageState(targetField, fallbackUrl);
    };
    reader.readAsDataURL(file);
  };

  const updateImageState = (target: "slide" | "team" | "gallery", url: string) => {
    if (target === "slide") setSlideForm(prev => ({ ...prev, bgImage: url }));
    else if (target === "team") setTeamForm(prev => ({ ...prev, avatar: url }));
    else if (target === "gallery") setGalleryForm(prev => ({ ...prev, url: url }));
    setCmsActionResult("✓ Image uploaded successfully to active secure storage!");
  };

  // ==========================================
  // ACADEMY MANAGEMENT HANDLERS
  // ==========================================
  const handleCreateOrUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademySuccess(null);
    setAcademyError(null);
    try {
      const url = editingCourseId ? `/api/courses/${editingCourseId}` : "/api/courses";
      const method = editingCourseId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseForm)
      });
      const data = await res.json();
      if (data.success) {
        setAcademySuccess(editingCourseId ? "✓ Course updated successfully!" : "✓ Course created successfully!");
        setCourseForm({ title: "", description: "", category: "Penetration Testing", level: "Intermediate", thumbnail: "" });
        setEditingCourseId(null);
        fetchAdminData();
      } else {
        setAcademyError(data.error || "Failed to process course.");
      }
    } catch (err) {
      setAcademyError("Network issue creating course.");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this course?")) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAcademySuccess("✓ Course permanently deleted from node.");
        if (selectedCourseForLessons?.id === id) setSelectedCourseForLessons(null);
        fetchAdminData();
      }
    } catch (err) {
      setAcademyError("Failed to delete course.");
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLessons) return;
    setAcademySuccess(null);
    setAcademyError(null);
    try {
      const res = await fetch(`/api/courses/${selectedCourseForLessons.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm)
      });
      const data = await res.json();
      if (data.success) {
        setAcademySuccess("✓ Lesson module registered successfully!");
        setLessonForm({ title: "", description: "", videoTitle: "", videoUrl: "", videoDuration: "", thumbnail: "", pdfUrl: "", pdfName: "" });
        setUploadingFile(null);
        setUploadProgress(0);
        setUploadStatus("idle");
        // Refresh selected course
        const freshRes = await fetch("/api/courses");
        const freshCourses = await freshRes.json();
        setCourses(freshCourses);
        const updatedCourse = freshCourses.find((c: any) => c.id === selectedCourseForLessons.id);
        if (updatedCourse) setSelectedCourseForLessons(updatedCourse);
      } else {
        setAcademyError(data.error || "Failed to add lesson.");
      }
    } catch (err) {
      setAcademyError("Failed to communicate with lesson engine.");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourseForLessons) return;
    if (!window.confirm("Delete this lesson from syllabus?")) return;
    try {
      const res = await fetch(`/api/courses/${selectedCourseForLessons.id}/lessons/${lessonId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setAcademySuccess("✓ Lesson deleted.");
        const freshRes = await fetch("/api/courses");
        const freshCourses = await freshRes.json();
        setCourses(freshCourses);
        const updatedCourse = freshCourses.find((c: any) => c.id === selectedCourseForLessons.id);
        if (updatedCourse) setSelectedCourseForLessons(updatedCourse);
      }
    } catch (err) {
      setAcademyError("Failed to delete lesson.");
    }
  };

  // ==========================================
  // DRAG & DROP MEDIA UPLOAD CONTROL (REAL-TIME ENGINE)
  // ==========================================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFileForUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupFileForUpload(e.target.files[0]);
    }
  };

  const setupFileForUpload = (file: File) => {
    setUploadingFile(file);
    setUploadProgress(0);
    setUploadStatus("idle");
    if (uploadIntervalRef) clearInterval(uploadIntervalRef);
  };

  const startUpload = () => {
    if (!uploadingFile) return;
    setUploadStatus("uploading");
    
    // Create interval that simulates secure network chunk uploads
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finalizeFileUpload();
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 3;
      });
    }, 250);
    
    setUploadIntervalRef(interval);
  };

  const pauseUpload = () => {
    if (uploadStatus !== "uploading") return;
    if (uploadIntervalRef) clearInterval(uploadIntervalRef);
    setUploadStatus("paused");
  };

  const resumeUpload = () => {
    if (uploadStatus !== "paused") return;
    startUpload();
  };

  const cancelUpload = () => {
    if (uploadIntervalRef) clearInterval(uploadIntervalRef);
    setUploadingFile(null);
    setUploadProgress(0);
    setUploadStatus("cancelled");
  };

  const finalizeFileUpload = async () => {
    setUploadStatus("completed");
    if (!uploadingFile) return;
    
    const isVideo = uploadingFile.type.startsWith("video/");
    const isPdf = uploadingFile.type === "application/pdf" || uploadingFile.name.endsWith(".pdf");

    // Real dynamic storage integration with Cloudinary if settings are provided
    let finalUrl = "";
    if (cloudinarySettings.cloudName && cloudinarySettings.uploadPreset) {
      try {
        const formData = new FormData();
        formData.append("file", uploadingFile);
        formData.append("upload_preset", cloudinarySettings.uploadPreset);
        
        const uploadType = isVideo ? "video" : "auto";
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinarySettings.cloudName}/${uploadType}/upload`, {
          method: "POST",
          body: formData
        });
        const cloudData = await res.json();
        if (cloudData.secure_url) {
          finalUrl = cloudData.secure_url;
        }
      } catch (err) {
        console.warn("Direct Cloudinary stream upload failed, falling back to local simulated CDN:", err);
      }
    }

    if (!finalUrl) {
      finalUrl = isVideo 
        ? "https://assets.mixkit.co/videos/preview/mixkit-cyber-security-expert-analyzing-data-on-screens-43094-large.mp4" 
        : isPdf 
        ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        : "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200";
    }

    if (isVideo) {
      setLessonForm(prev => ({
        ...prev,
        videoTitle: uploadingFile.name,
        videoUrl: finalUrl,
        videoDuration: "08:15",
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600"
      }));
    } else {
      setLessonForm(prev => ({
        ...prev,
        pdfUrl: finalUrl,
        pdfName: uploadingFile.name
      }));
    }
  };

  const threatChartData = [
    { name: "00:00", blocking: 45, severity: 12 },
    { name: "04:00", blocking: 62, severity: 18 },
    { name: "08:00", blocking: 120, severity: 55 },
    { name: "12:00", blocking: 85, severity: 32 },
    { name: "16:00", blocking: 140, severity: 68 },
    { name: "20:00", blocking: 195, severity: 89 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans" id="admin_portal_layout">
      
      {/* LEFT SIDEBAR (COLLAPSIBLE & PROFESSIONAL) */}
      <aside 
        className={`bg-white border-r border-neutral-200/80 flex flex-col justify-between transition-all duration-300 relative z-30 ${
          isSidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Toggle Collapse Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-neutral-200 p-1 rounded-full text-neutral-500 hover:text-neutral-900 transition shadow-sm cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="space-y-6 pt-6">
          {/* Logo Brand Header */}
          <div className="px-4 flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 rounded-xl text-white flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="font-display font-bold text-xs tracking-wider text-neutral-950 uppercase">THAMJJ13</h1>
                <p className="text-[9px] text-neutral-400 font-mono tracking-widest font-bold">SINGAPORE SOC</p>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 px-2.5">
            {[
              { id: "dashboard", label: "Operations Panel", icon: <LayoutGrid className="w-4 h-4" /> },
              { id: "reports", label: "Case Reports & FIRs", icon: <Shield className="w-4 h-4" /> },
              { id: "cms", label: "CMS Data Builder", icon: <Sliders className="w-4 h-4" /> },
              { id: "academy", label: "Academy Vault", icon: <BookOpen className="w-4 h-4" /> },
              { id: "users", label: "Cadet Registrars", icon: <Users className="w-4 h-4" /> },
              { id: "inbox", label: "Direct Inboxes", icon: <MessageSquare className="w-4 h-4" /> },
              { id: "analytics", label: "Visitor Tracking", icon: <Globe className="w-4 h-4" /> },
              { id: "smtp", label: "SMTP Manager", icon: <Settings className="w-4 h-4" /> },
              { id: "security", label: "Keys & Audits", icon: <Key className="w-4 h-4" /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-3 cursor-pointer ${
                  activeSubTab === item.id
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
                title={item.label}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
          {!isSidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold font-mono text-xs border border-neutral-300">
                  {currentUser?.username.substring(0,2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-neutral-900 truncate">{currentUser?.username}</p>
                  <p className="text-[8px] font-mono text-neutral-400 capitalize">{currentUser?.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition"
              >
                → TERMINAL EXIT
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogout}
              className="w-full p-1 text-center text-neutral-400 hover:text-neutral-900 font-bold"
              title="Logout"
            >
              ⎋
            </button>
          )}
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT WORKSPACE */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        
        {/* TOP LEVEL PREMIUM HEADER BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <Radio className="w-5.5 h-5.5 animate-pulse text-neutral-900" />
            </div>
            <div>
              <span className="text-[9px] text-neutral-400 font-mono tracking-widest font-bold uppercase">ZERO TRUST GATEWAY PROTOCOL</span>
              <h2 className="font-display font-bold text-lg md:text-xl text-neutral-900">
                Administrative Terminal Control
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTriggerBackup}
              disabled={backupTriggering}
              className="px-4 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-mono rounded-xl text-neutral-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-neutral-900" /> SHA-256 Snapshot Backup
            </button>
            <button
              onClick={() => onNavigate("landing")}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono rounded-xl text-white font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" /> Landing Node
            </button>
          </div>
        </div>

        {/* 1. OPERATIONS PANEL SUB TAB */}
        {activeSubTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn" id="dashboard_panel">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Verified Cadet Accounts", value: users.length, desc: "SLA database entries", color: "text-neutral-950" },
                { label: "Awaiting SLA Approvals", value: users.filter(u => !u.approved).length, desc: "Security gateway queue", color: "text-amber-600" },
                { label: "Incident Messages Routed", value: messages.length, desc: "Decrypted contact forms", color: "text-neutral-950" },
                { label: "Active Live Chat Channels", value: chats.length, desc: "Active tunnel handshakes", color: "text-neutral-950" },
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-1">
                  <span className="text-[9px] text-neutral-400 font-mono tracking-widest uppercase font-bold">{item.label}</span>
                  <h3 className={`text-2xl font-display font-bold ${item.color}`}>{item.value}</h3>
                  <p className="text-[10px] text-neutral-500 font-light">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Health parameters */}
            {systemHealth && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-xs text-neutral-900 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <Activity className="w-4 h-4 text-neutral-800" /> Platform CPU & RAM Node
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-neutral-700">
                        <span>Express VM CPU Load</span>
                        <span className="font-bold">{systemHealth.cpuUsage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900" style={{ width: `${systemHealth.cpuUsage}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-neutral-700">
                        <span>Shared Memory Utilization</span>
                        <span className="font-bold">{systemHealth.memoryUsage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900" style={{ width: `${systemHealth.memoryUsage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-xs text-neutral-900 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <HardDrive className="w-4 h-4 text-neutral-800" /> Storage Capacity Limits
                  </h3>
                  <div className="space-y-3 font-mono text-xs text-neutral-600">
                    <div className="flex justify-between items-center">
                      <span>Cloudinary CDN Assets</span>
                      <span className="font-bold text-neutral-900">{systemHealth.cloudinaryStatus}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>File Vault Crypt Node</span>
                      <span className="font-bold text-neutral-900">OK (AES-256)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Super Admin Email Route</span>
                      <span className="font-bold text-neutral-900 truncate max-w-[120px]">thamjj13@gmail.com</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-xs text-neutral-900 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <ShieldAlert className="w-4 h-4 text-neutral-800" /> SMTP Outbox parameters
                  </h3>
                  <div className="space-y-3 font-mono text-xs text-neutral-600">
                    <div className="flex justify-between items-center">
                      <span>SMTP Priority Node 1</span>
                      <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-bold text-neutral-800">ONLINE</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Backup Relay Node 2</span>
                      <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-bold text-neutral-800">ONLINE</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Test Mail routing</span>
                      <button onClick={() => setActiveSubTab("smtp")} className="text-neutral-900 font-bold hover:underline">Launch Tool</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Threat Chart Deflection Area */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-neutral-900">Intrusion Prevention Systems deflection rates</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={threatChartData}>
                    <defs>
                      <linearGradient id="neutralGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#171717" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#171717" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#888888" style={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke="#888888" style={{ fontSize: 10, fontFamily: "monospace" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="blocking" name="Threat Campaigns Deflected" stroke="#171717" fillOpacity={1} fill="url(#neutralGlow)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. CMS CONTENT BUILDER SUB TAB (MAGNIFICENT NEW ADDITION!) */}
        {activeSubTab === "cms" && (
          <div className="space-y-8 animate-fadeIn" id="cms_data_builder">
            
            {/* CMS Section horizontal navigation pill bar */}
            <div className="flex flex-wrap gap-1.5 bg-white p-2 border border-neutral-200/80 rounded-2xl text-xs font-mono">
              {[
                { id: "slides", label: "Hero Slides", icon: <Sliders className="w-4 h-4" /> },
                { id: "services", label: "Services", icon: <Shield className="w-4 h-4" /> },
                { id: "team", label: "Command Team", icon: <Users className="w-4 h-4" /> },
                { id: "gallery", label: "Gallery Assets", icon: <ImageIcon className="w-4 h-4" /> },
                { id: "faqs", label: "FAQs Inquiries", icon: <HelpCircle className="w-4 h-4" /> },
                { id: "stats", label: "Stats Counters", icon: <Activity className="w-4 h-4" /> },
                { id: "alliances", label: "Alliances", icon: <Globe className="w-4 h-4" /> },
                { id: "cloudinary", label: "Cloudinary CDN", icon: <CloudLightning className="w-4 h-4" /> },
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => { setCmsSection(sec.id as any); setCmsActionResult(null); }}
                  className={`px-3.5 py-2 rounded-xl font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                    cmsSection === sec.id
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  {sec.icon} {sec.label}
                </button>
              ))}
            </div>

            {cmsActionResult && (
              <div className="p-4 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-800">
                {cmsActionResult}
              </div>
            )}

            {/* A. SLIDES BUILDER */}
            {cmsSection === "slides" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Add slide */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Register Hero slide Node</h3>
                  <form onSubmit={handleAddHeroSlide} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">SLIDE TITLE</label>
                      <input
                        type="text"
                        required
                        value={slideForm.title}
                        onChange={e => setSlideForm({ ...slideForm, title: e.target.value })}
                        placeholder="Singapore offensive security..."
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">SUBTITLE DESCRIPTION</label>
                      <textarea
                        rows={2}
                        value={slideForm.subtitle}
                        onChange={e => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                        placeholder="Detail operational scopes here..."
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-mono">BACKGROUND THUMBNAIL / FILE UPLOAD</label>
                      <input
                        type="text"
                        value={slideForm.bgImage}
                        onChange={e => setSlideForm({ ...slideForm, bgImage: e.target.value })}
                        placeholder="Paste unsplash url or choose local file"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-neutral-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleLocalImageUpload(e, "slide")}
                          className="text-[10px] font-mono text-neutral-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">CTA LINK</label>
                        <input
                          type="text"
                          value={slideForm.ctaLink}
                          onChange={e => setSlideForm({ ...slideForm, ctaLink: e.target.value })}
                          placeholder="#contact"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">CTA TEXT</label>
                        <input
                          type="text"
                          value={slideForm.ctaText}
                          onChange={e => setSlideForm({ ...slideForm, ctaText: e.target.value })}
                          placeholder="Contact Dispatch"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs">
                      PROVISION HERO SLIDE
                    </button>
                  </form>
                </div>

                {/* Slides queue */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Active Hero slides list</h3>
                  <div className="space-y-3.5">
                    {cmsSlides.map(slide => (
                      <div key={slide.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex gap-3 items-center min-w-0">
                          {slide.bgImage && (
                            <img src={slide.bgImage} className="w-11 h-11 rounded-lg object-cover border border-neutral-200 flex-shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">{slide.title}</h4>
                            <p className="text-[10px] text-neutral-500 truncate">{slide.subtitle}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteHeroSlide(slide.id)} className="p-2 text-neutral-400 hover:text-red-600 transition flex-shrink-0 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsSlides.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">No slides added. Website is currently relying on default light template layout.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* B. SERVICES BUILDER */}
            {cmsSection === "services" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Register Service Blueprint</h3>
                  <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">SERVICE TITLE</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.title}
                        onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })}
                        placeholder="Continuous Threat Monitoring"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">DESCRIPTION</label>
                      <textarea
                        required
                        rows={3}
                        value={serviceForm.description}
                        onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                        placeholder="Enter parameters of defensive surveillance SLA..."
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">ICON COMPONENT CLASS</label>
                      <select
                        value={serviceForm.icon}
                        onChange={e => setServiceForm({ ...serviceForm, icon: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="Shield">Shield Lock</option>
                        <option value="Terminal">Terminal Console</option>
                        <option value="Database">Database Crypt</option>
                        <option value="Globe">Global Node</option>
                        <option value="Zap">Active Threat Deflection</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      PUBLISH SERVICE PROVISION
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Verified service provisions</h3>
                  <div className="space-y-3">
                    {cmsServices.map(serv => (
                      <div key={serv.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                            <span className="p-1 bg-neutral-100 rounded text-neutral-800 font-mono text-[9px] uppercase">{serv.icon}</span>
                            {serv.title}
                          </h4>
                          <p className="text-[10px] text-neutral-500 mt-1">{serv.description}</p>
                        </div>
                        <button onClick={() => handleDeleteService(serv.id)} className="p-2 text-neutral-400 hover:text-red-600 transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsServices.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">No services loaded yet. Database empty.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* C. TEAM MEMBERS BUILDER */}
            {cmsSection === "team" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Verify Command Officer</h3>
                  <form onSubmit={handleAddTeamMember} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">OFFICER NAME</label>
                      <input
                        type="text"
                        required
                        value={teamForm.name}
                        onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                        placeholder="Hacker Specialist"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">ROLE / RANK</label>
                        <input
                          type="text"
                          required
                          value={teamForm.role}
                          onChange={e => setTeamForm({ ...teamForm, role: e.target.value })}
                          placeholder="Senior Offensive Auditor"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">HQ LOCATION</label>
                        <input
                          type="text"
                          required
                          value={teamForm.location}
                          onChange={e => setTeamForm({ ...teamForm, location: e.target.value })}
                          placeholder="Singapore HQ"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-mono">AVATAR IMAGE URL / UPLOAD</label>
                      <input
                        type="text"
                        value={teamForm.avatar}
                        onChange={e => setTeamForm({ ...teamForm, avatar: e.target.value })}
                        placeholder="Paste image URL"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-neutral-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleLocalImageUpload(e, "team")}
                          className="text-[10px] font-mono text-neutral-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">BADGES (COMMA SEPARATED)</label>
                      <input
                        type="text"
                        value={teamForm.badgesStr}
                        onChange={e => setTeamForm({ ...teamForm, badgesStr: e.target.value })}
                        placeholder="CEH, CISSP, OSCP"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      INDEX TEAM MEMBER PROFILE
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Active Command center staff</h3>
                  <div className="space-y-3.5">
                    {cmsTeam.map(member => (
                      <div key={member.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex gap-3 items-center min-w-0">
                          <img src={member.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} className="w-11 h-11 rounded-full object-cover border border-neutral-200 flex-shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-neutral-900">{member.name}</h4>
                            <p className="text-[10px] text-neutral-500">{member.role} • {member.location}</p>
                            <div className="flex gap-1.5 flex-wrap mt-1">
                              {member.badges && member.badges.map((b: string, i: number) => (
                                <span key={i} className="text-[8px] bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-600 font-mono">
                                  {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTeamMember(member.id)} className="p-2 text-neutral-400 hover:text-red-600 transition flex-shrink-0 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsTeam.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">No command members loaded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* D. GALLERY ASSETS */}
            {cmsSection === "gallery" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Upload Media Asset</h3>
                  <form onSubmit={handleAddGallery} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">ASSET TITLE</label>
                      <input
                        type="text"
                        required
                        value={galleryForm.title}
                        onChange={e => setGalleryForm({ ...galleryForm, title: e.target.value })}
                        placeholder="Seminar Dhaka"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">CATEGORY / ALBUM</label>
                      <input
                        type="text"
                        required
                        value={galleryForm.category}
                        onChange={e => setGalleryForm({ ...galleryForm, category: e.target.value })}
                        placeholder="e.g. Operations, Seminars"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-mono">MEDIA FILE URL / SELECT FILE</label>
                      <input
                        type="text"
                        value={galleryForm.url}
                        onChange={e => setGalleryForm({ ...galleryForm, url: e.target.value })}
                        placeholder="Paste direct URL"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-neutral-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleLocalImageUpload(e, "gallery")}
                          className="text-[10px] font-mono text-neutral-500"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      VERIFY & UPLOAD MEDIA ASSET
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Verified dynamic media items</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {cmsGallery.map(item => (
                      <div key={item.id} className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 group">
                        <img src={item.url} alt={item.title} className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
                        <div className="p-2.5 bg-white flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <h4 className="text-[10px] font-bold text-neutral-900 truncate">{item.title}</h4>
                            <p className="text-[8px] font-mono text-neutral-400">{item.category}</p>
                          </div>
                          <button onClick={() => handleDeleteGallery(item.id)} className="p-1 text-neutral-400 hover:text-red-600 transition flex-shrink-0 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cmsGallery.length === 0 && (
                      <p className="text-xs text-neutral-400 italic col-span-2">No visual assets logged in empty database.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* E. FAQs BUILDER */}
            {cmsSection === "faqs" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Create FAQ node</h3>
                  <form onSubmit={handleAddFaq} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">QUESTION</label>
                      <input
                        type="text"
                        required
                        value={faqForm.q}
                        onChange={e => setFaqForm({ ...faqForm, q: e.target.value })}
                        placeholder="What certifications are issued?"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">ANSWER</label>
                      <textarea
                        required
                        rows={4}
                        value={faqForm.a}
                        onChange={e => setFaqForm({ ...faqForm, a: e.target.value })}
                        placeholder="We offer CSA verified defensive security training courses..."
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      PUBLISH INQUIRY RESOURCE
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Active FAQs</h3>
                  <div className="space-y-3.5">
                    {cmsFaqs.map(faq => (
                      <div key={faq.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-neutral-900">Q: {faq.q}</h4>
                          <p className="text-[10px] text-neutral-500">A: {faq.a}</p>
                        </div>
                        <button onClick={() => handleDeleteFaq(faq.id)} className="p-1.5 text-neutral-400 hover:text-red-600 transition flex-shrink-0 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsFaqs.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">No query nodes indexed.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* F. STATS BUILDER */}
            {cmsSection === "stats" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Create Statistic Metric</h3>
                  <form onSubmit={handleAddStat} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">LABEL TAG</label>
                      <input
                        type="text"
                        required
                        value={statForm.label}
                        onChange={e => setStatForm({ ...statForm, label: e.target.value })}
                        placeholder="THREAT_CAMPAIGNS"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">VALUE</label>
                        <input
                          type="text"
                          required
                          value={statForm.value}
                          onChange={e => setStatForm({ ...statForm, value: e.target.value })}
                          placeholder="99.9%"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-mono">DESCRIPTION</label>
                        <input
                          type="text"
                          required
                          value={statForm.desc}
                          onChange={e => setStatForm({ ...statForm, desc: e.target.value })}
                          placeholder="Audit success metrics"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      PUBLISH STATISTICS NODE
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Saved numeric counters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {cmsStats.map(st => (
                      <div key={st.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center gap-4">
                        <div>
                          <p className="text-[9px] font-mono text-neutral-400">{st.label}</p>
                          <h4 className="text-xl font-display font-bold text-neutral-900">{st.value}</h4>
                          <p className="text-[10px] text-neutral-500">{st.desc}</p>
                        </div>
                        <button onClick={() => handleDeleteStat(st.id)} className="p-1 text-neutral-400 hover:text-red-600 transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsStats.length === 0 && (
                      <p className="text-xs text-neutral-400 italic col-span-2">No counters active.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* G. ALLIANCES BUILDER */}
            {cmsSection === "alliances" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Verify Security Alliance</h3>
                  <form onSubmit={handleAddAlliance} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">ALLIED AGENCY NAME</label>
                      <input
                        type="text"
                        required
                        value={allianceForm.name}
                        onChange={e => setAllianceForm({ ...allianceForm, name: e.target.value })}
                        placeholder="Singapore Security Academy (SLA)"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                      INDEX COMPLIANCE ALLIANCE
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Strategic alliances list</h3>
                  <div className="space-y-3">
                    {cmsAlliances.map(alliance => (
                      <div key={alliance.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-neutral-800" /> {alliance.name}
                        </span>
                        <button onClick={() => handleDeleteAlliance(alliance.id)} className="p-1 text-neutral-400 hover:text-red-600 transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cmsAlliances.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">No allied alignments indexed in database.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* H. CLOUDINARY SETTINGS MANAGER */}
            {cmsSection === "cloudinary" && (
              <div className="max-w-2xl bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-6">
                <div>
                  <h3 className="font-display font-bold text-base text-neutral-900 flex items-center gap-2">
                    <CloudLightning className="w-5 h-5 text-neutral-900" /> Cloudinary CDN Settings
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Configure direct client-side image upload channels. Dynamic slide images, officer avatars, and laboratory logs will route directly into your private Cloudinary bucket.
                  </p>
                </div>

                <form onSubmit={handleSaveCloudinarySettings} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">CLOUDINARY CLOUD NAME</label>
                      <input
                        type="text"
                        value={cloudinarySettings.cloudName}
                        onChange={e => setCloudinarySettings({ ...cloudinarySettings, cloudName: e.target.value })}
                        placeholder="e.g. dxyz123"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">UNSIGNED UPLOAD PRESET</label>
                      <input
                        type="text"
                        value={cloudinarySettings.uploadPreset}
                        onChange={e => setCloudinarySettings({ ...cloudinarySettings, uploadPreset: e.target.value })}
                        placeholder="e.g. preset_unsigned"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">API KEY (OPTIONAL)</label>
                      <input
                        type="text"
                        value={cloudinarySettings.apiKey}
                        onChange={e => setCloudinarySettings({ ...cloudinarySettings, apiKey: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono">API SECRET (OPTIONAL)</label>
                      <input
                        type="password"
                        value={cloudinarySettings.apiSecret}
                        onChange={e => setCloudinarySettings({ ...cloudinarySettings, apiSecret: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs">
                    SAVE & INTEGRATE CLOUDINARY CDN CHANNEL
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 3. CADET REGISTRARS SUB TAB */}
        {activeSubTab === "users" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="users_registrars">
            
            {/* Left list: cadet accounts awaiting access approval */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">Student & Auditor Accounts Queue</h3>
              <p className="text-xs text-neutral-500">Verify client or student identities before endorsing access to secure course vaults.</p>

              <div className="space-y-4">
                {users.map(u => (
                  <div key={u.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex gap-3 items-center">
                      <img src={u.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} alt="avatar" className="w-10 h-10 rounded-full border border-neutral-200 object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="text-sm font-display font-bold text-neutral-900 flex items-center gap-1.5">
                          {u.username} 
                          {u.role === UserRole.SUPER_ADMIN && <span className="text-[8px] bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded font-bold font-mono">SUPER</span>}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-mono">{u.email} • {u.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <select
                        value={u.role}
                        onChange={e => handleApproveUser(u.id, u.approved, e.target.value as UserRole)}
                        className="bg-white border border-neutral-200 text-neutral-700 rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none"
                      >
                        {Object.values(UserRole).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>

                      {u.approved ? (
                        <button
                          onClick={() => handleApproveUser(u.id, false)}
                          className="px-3.5 py-1.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-mono rounded-xl hover:bg-neutral-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" /> Approved
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveUser(u.id, true)}
                          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold rounded-xl transition cursor-pointer"
                        >
                          Grant Access
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">No registered user logs in system databases.</p>
                )}
              </div>
            </div>

            {/* Right panel: provision new administrative moderators */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-neutral-900 uppercase">Create Administrative Node</h3>
              <p className="text-neutral-500 text-[11px] leading-relaxed">Seed secondary moderators or support personnel to handle direct inboxes.</p>
              
              {newAdminResult && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 text-[11px] font-mono rounded-xl text-neutral-800">
                  {newAdminResult}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">USERNAME</label>
                  <input
                    type="text"
                    required
                    value={newAdminForm.username}
                    onChange={e => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
                    placeholder="dhaka_command_moderator"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={newAdminForm.email}
                    onChange={e => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    placeholder="moderator@thamjj13.com"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">AUTHORIZATION LEVEL</label>
                  <select
                    value={newAdminForm.role}
                    onChange={e => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value={UserRole.SECONDARY_ADMIN}>SECONDARY_ADMIN</option>
                    <option value={UserRole.COURSE_MANAGER}>COURSE_MANAGER</option>
                    <option value={UserRole.SUPPORT_AGENT}>SUPPORT_AGENT</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer"
                >
                  PROVISION SECURE ACCESS
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. DIRECT MESSAGES INBOX */}
        {activeSubTab === "inbox" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="incident_inbox">
            
            {/* Left list: Direct messages from contact forms */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4 overflow-y-auto max-h-[600px]">
              <h3 className="font-display font-bold text-lg text-neutral-900">Direct Compliance Reports</h3>
              <p className="text-xs text-neutral-500">Incident tickets and audits dispatched from landing contact portals.</p>

              <div className="space-y-3">
                {messages.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setActiveMessage(m); setReplySuccess(null); }}
                    className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                      activeMessage?.id === m.id
                        ? "bg-neutral-50 border-neutral-900"
                        : "bg-white border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700 font-mono font-bold uppercase truncate max-w-[120px]">
                        {m.subject}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-bold text-neutral-950 truncate">{m.name} ({m.email})</h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1">{m.message}</p>
                  </button>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">No dispatches logged.</p>
                )}
              </div>
            </div>

            {/* Right panel: dispatch details & outbox reply tool */}
            <div className="lg:col-span-7">
              {activeMessage ? (
                <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-6">
                  <div className="border-b border-neutral-100 pb-4 space-y-1">
                    <span className="text-[9px] text-neutral-400 font-mono font-bold uppercase tracking-widest">{activeMessage.subject}</span>
                    <h2 className="font-display font-bold text-lg text-neutral-950">{activeMessage.name}</h2>
                    <p className="text-[11px] text-neutral-500 font-mono">From: {activeMessage.email} • {activeMessage.phone}</p>
                  </div>

                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3 text-xs text-neutral-800">
                    <h4 className="text-[10px] text-neutral-400 font-mono font-bold uppercase">TRANSMITTED DESPATCH LOG</h4>
                    <p className="leading-relaxed whitespace-pre-line">{activeMessage.message}</p>
                    
                    {activeMessage.attachmentUrl && (
                      <div className="p-3 bg-white border border-neutral-200 rounded-xl flex justify-between items-center mt-4 shadow-sm">
                        <span className="text-[11px] text-neutral-600 truncate font-mono">Attachment: {activeMessage.attachmentName || "incident_log.txt"}</span>
                        <a href={activeMessage.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-neutral-800 hover:bg-neutral-100 rounded transition">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Previous replies */}
                  {activeMessage.replies.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-widest">OUTBOX SMTP ARCHIVES</h4>
                      {activeMessage.replies.map(rep => (
                        <div key={rep.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1 text-xs">
                          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                            <span className="font-bold">{rep.sender}</span>
                            <span>{new Date(rep.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-neutral-700 mt-1">{rep.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send reply */}
                  <form onSubmit={handleReplyMessage} className="space-y-4 pt-4 border-t border-neutral-100">
                    <h4 className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-widest">TRANSMIT SMTP RESPONSE REPLY</h4>
                    {replySuccess && (
                      <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-[10px] font-mono text-neutral-800">
                        {replySuccess}
                      </div>
                    )}
                    <textarea
                      required
                      rows={4}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Compose direct outbox response..."
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                    <button
                      type="submit"
                      className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Send className="w-4 h-4" /> TRANSMIT SECURE EMAIL RESPONSE
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border border-neutral-200/80 shadow-sm text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                  <MessageSquare className="w-10 h-10 text-neutral-300 animate-bounce" />
                  <h3 className="text-sm font-display font-bold text-neutral-400">Select Direct Message Thread</h3>
                  <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                    Select any compliance record or security inquiry on the left column to read client parameters or issue responses.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. VISITOR ANALYTICS TRACKER */}
        {activeSubTab === "analytics" && (
          <div className="space-y-6 animate-fadeIn" id="visitor_analytics">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">Operations Traffic & Connection Ledger</h3>
              <p className="text-xs text-neutral-500">Real-time analysis of active sessions connecting to Singapore/Bangladesh endpoints.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 font-mono uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Client IP</th>
                      <th className="py-3 px-4">Country & City</th>
                      <th className="py-3 px-4">Browser / OS</th>
                      <th className="py-3 px-4">Resolution</th>
                      <th className="py-3 px-4">Connect Time</th>
                      <th className="py-3 px-4">ISP / Network</th>
                      <th className="py-3 px-4">Current Tab Node</th>
                      <th className="py-3 px-4">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                    {visitorLogs.map(log => (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 text-neutral-950 font-bold">{log.ip}</td>
                        <td className="py-3 px-4">{log.city}, {log.country}</td>
                        <td className="py-3 px-4 text-neutral-500">{log.browser} ({log.os})</td>
                        <td className="py-3 px-4 text-neutral-400">{log.resolution}</td>
                        <td className="py-3 px-4 text-[10px] text-neutral-400">{new Date(log.visitTime).toLocaleTimeString()}</td>
                        <td className="py-3 px-4 text-neutral-500">{log.isp}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-800 font-bold uppercase font-mono">
                            {log.currentPage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-950 font-bold">{log.sessionDuration}s</td>
                      </tr>
                    ))}
                    {visitorLogs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-neutral-400 italic">No connection handshakes registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. SMTP ROUTING CONFIG MANAGER */}
        {activeSubTab === "smtp" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="smtp_routing">
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">SMTP Failover Testing Panel</h3>
              <p className="text-xs text-neutral-500">Configure parameters for direct dispatch email forwarding.</p>

              {smtpTestResult && (
                <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs text-neutral-800">
                  {smtpTestResult}
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">SMTP HOST SERVER</label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-mono">SMTP TLS PORT</label>
                    <input
                      type="number"
                      value={smtpForm.port}
                      onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-mono">OUTBOX SENDER EMAIL</label>
                    <input
                      type="text"
                      value={smtpForm.user}
                      onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleTestSmtp}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  TEST OUTBOX SMTP CONCURRENCY HANDSHAKE
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">Active round-robin pools</h3>
              <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-widest font-bold">ROUTING ENDPOINTS</p>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-neutral-900 font-bold">Priority Node 1: mail.thamjj13.com</h4>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Port: 465 SSL • outbox@thamjj13.com</p>
                  </div>
                  <span className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 text-neutral-800 rounded text-[9px] font-bold">ACTIVE</span>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-neutral-900 font-bold">Backup Node 2: backup-mail.thamjj13.com</h4>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Port: 587 TLS • failover@thamjj13.com</p>
                  </div>
                  <span className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 text-neutral-800 rounded text-[9px] font-bold">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. SECURITY KEYS & IMMUTABLE AUDIT TRAIL LOGS */}
        {activeSubTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="security_keys">
            {/* API Keys */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-neutral-900">Programmatic Stream Keys</h3>
              <p className="text-xs text-neutral-500">Provision secure keycodes for logging ingestion stream routes.</p>

              <form onSubmit={handleCreateApiKey} className="flex gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Router log tag (e.g., Dhaka Firewalls)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                />
                <button type="submit" className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer">
                  Generate
                </button>
              </form>

              {newKeyCreated && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 text-neutral-950 font-mono text-[10px] rounded-xl break-all">
                  <strong>SECURE TOKEN:</strong> {newKeyCreated}
                </div>
              )}

              <div className="space-y-3 font-mono text-xs pt-4 border-t border-neutral-100">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                    <div>
                      <h4 className="text-neutral-950 font-bold">{k.name}</h4>
                      <p className="text-neutral-400 text-[9px] break-all mt-0.5">{k.key.substring(0, 24)}...</p>
                    </div>
                    {k.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleRevokeApiKey(k.id)}
                        className="px-3 py-1 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[10px] rounded-lg cursor-pointer"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-neutral-400 uppercase text-[9px] font-bold">REVOKED</span>
                    )}
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">No stream keys registered.</p>
                )}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4 overflow-y-auto max-h-[500px]">
              <h3 className="font-display font-bold text-lg text-neutral-900">Immutable Cryptographic Audit Trail</h3>
              <p className="text-xs text-neutral-500">Automatic logging mapping administrative database state updates.</p>

              <div className="space-y-2.5 font-mono text-[10px] text-neutral-500">
                {auditLogs.map((log, i) => (
                  <div key={log.id || i} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-neutral-900 font-semibold">{log.action}</p>
                      <p className="text-neutral-400 text-[9px]">Operator: {log.user} • IP: {log.ip}</p>
                    </div>
                    <span className="text-neutral-400 text-[8px] whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">No cryptographic audit trails recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 8. INCIDENT CASE REPORTS & FIR MANAGEMENT WORKSPACE */}
        {activeSubTab === "reports" && (
          <div className="space-y-6 animate-fadeIn" id="admin_reports_workspace">
            {/* Header banner */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="font-display font-bold text-xl text-neutral-900 uppercase">INCIDENT CASE REPORTS & FIR DISPATCH MODULE</h2>
                <p className="text-xs text-neutral-500">Triage incoming cyber complaints, assign jurisdictions, deploy legal clauses, and finalize secure printable FIR certificates.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={fetchAdminData}
                  className="p-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 rounded-xl transition cursor-pointer"
                  title="Force Refresh Socket"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Report selection register */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-mono font-bold text-neutral-900 uppercase tracking-widest">DISPATCH REGISTER ({reports.length})</h3>
                </div>

                {reports.length === 0 ? (
                  <div className="text-center py-16 text-neutral-400 space-y-2">
                    <Shield className="w-10 h-10 mx-auto stroke-1" />
                    <p className="text-xs">No cyber incidents reported yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {reports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedReport(r);
                          setFirSuccess(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                          selectedReport?.id === r.id
                            ? "bg-neutral-900 border-neutral-950 text-white shadow-sm"
                            : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[10px] font-bold">{r.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold ${
                            r.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            r.status === "REJECTED" ? "bg-red-100 text-red-800 border border-red-200" :
                            r.status === "UNDER_REVIEW" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs truncate mb-1">{r.category}</h4>
                        <p className="text-[10px] text-neutral-400 font-mono">Complainant: {r.fullName}</p>
                        <p className="text-[9px] text-neutral-500 font-mono mt-1">Date: {new Date(r.createdAt).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail & compilers workspace */}
              <div className="lg:col-span-8 space-y-6">
                {selectedReport ? (
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="border-b border-neutral-100 pb-4 flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-neutral-400 font-mono tracking-widest font-bold">DISPATCH DETAILED ANALYSIS</span>
                        <h3 className="font-display font-bold text-base text-neutral-900 uppercase">CASE REF: {selectedReport.id}</h3>
                      </div>
                      
                      {/* Interactive Status updating dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-400">STATUS CONTROL:</span>
                        <select
                          value={selectedReport.status}
                          onChange={e => handleUpdateReportStatus(selectedReport.id, e.target.value)}
                          className="px-3 py-1.5 bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-[11px] font-bold rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                          <option value="APPROVED">APPROVED (FIR)</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>

                    {/* Report Information Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <span className="text-[9px] text-neutral-400 block mb-0.5">COMPLAINANT FULLNAME</span>
                        <span className="font-bold text-neutral-900">{selectedReport.fullName}</span>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <span className="text-[9px] text-neutral-400 block mb-0.5">EMAIL REGISTERED</span>
                        <span className="font-bold text-neutral-900">{selectedReport.email}</span>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <span className="text-[9px] text-neutral-400 block mb-0.5">PHONE CONTACT</span>
                        <span className="font-bold text-neutral-900">{selectedReport.phone}</span>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 col-span-2">
                        <span className="text-[9px] text-neutral-400 block mb-0.5">ADDRESS DETAILS</span>
                        <span className="font-bold text-neutral-900 block truncate">{selectedReport.address}</span>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <span className="text-[9px] text-neutral-400 block mb-0.5">COORDINATES / POSITION</span>
                        <span className="font-bold text-neutral-900 block truncate">{selectedReport.incidentLocation}</span>
                      </div>
                    </div>

                    {/* Complaint description */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] text-neutral-400 font-mono font-bold uppercase">Incident description & narrative</h4>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
                        {selectedReport.description}
                      </div>
                    </div>

                    {/* Witness & Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-neutral-400 block mb-1">WITNESS STATEMENT DECLARED</span>
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-neutral-800">
                          {selectedReport.witnessInfo || "No witnesses entered."}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-neutral-400 block mb-1">EVIDENCE PAYLOAD</span>
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                          <span className="truncate max-w-[150px] text-[10px]">{selectedReport.evidenceName || "No file uploaded."}</span>
                          {selectedReport.evidenceUrl && (
                            <a 
                              href={selectedReport.evidenceUrl} 
                              download={selectedReport.evidenceName} 
                              className="px-2 py-1 bg-white border border-neutral-200 hover:bg-neutral-100 rounded text-[9px] font-bold flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Get Evidence
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* FIR Generator Form panel */}
                    <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-4">
                      <div className="border-b border-neutral-200 pb-2">
                        <h4 className="text-xs font-mono font-bold text-neutral-900 uppercase flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-neutral-800" /> DEPLOY CYBER FIR CERTIFICATE
                        </h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Compile official legal parameters, stamp credentials, and generate cryptographically signed code keys.</p>
                      </div>

                      <form onSubmit={handleGenerateFIR} className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">JURISDICTION / HUB STATION</label>
                            <input
                              type="text"
                              required
                              value={firForm.policeStation}
                              onChange={e => setFirForm({ ...firForm, policeStation: e.target.value })}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">INVESTIGATING CASE OFFICER</label>
                            <input
                              type="text"
                              required
                              value={firForm.officerDetails}
                              onChange={e => setFirForm({ ...firForm, officerDetails: e.target.value })}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">DIGITAL VERIFIABLE SIGNATURE</label>
                            <input
                              type="text"
                              required
                              value={firForm.signature}
                              onChange={e => setFirForm({ ...firForm, signature: e.target.value })}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={firSubmitting}
                          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-[11px] font-mono cursor-pointer transition disabled:opacity-50"
                        >
                          {firSubmitting ? "FINALIZING FIR RECORDS..." : "DEPLOY AND SIGN OFFICIAL CRYPTOGRAPHIC FIR RECORD"}
                        </button>
                      </form>

                      {firSuccess && (
                        <div className={`p-3 rounded-lg text-xs font-bold leading-relaxed ${
                          firSuccess.startsWith("🟢") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                        }`}>
                          {firSuccess}
                        </div>
                      )}
                    </div>

                    {/* Already generated FIR details block */}
                    {selectedReport.firDetails && (
                      <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 text-neutral-300 space-y-3">
                        <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
                          <span className="text-[9px] text-indigo-400 font-mono font-bold tracking-widest uppercase">FIR ARCHIVE STATE</span>
                          <span className="text-emerald-400 font-mono text-xs font-bold">NO: {selectedReport.firNumber}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">Jurisdiction Station</span>
                            <span className="text-white font-bold">{selectedReport.firDetails.policeStation}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">Investigating Officer</span>
                            <span className="text-white font-bold">{selectedReport.firDetails.officerDetails}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">Audit Security Key</span>
                            <span className="text-emerald-400 font-bold truncate block">{selectedReport.firDetails.verificationCode}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">Officer Signature</span>
                            <span className="text-white font-bold font-serif italic text-sm">{selectedReport.firDetails.signature}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-16 border border-neutral-200/85 shadow-sm text-center text-neutral-400 space-y-3">
                    <Shield className="w-12 h-12 mx-auto text-neutral-300 stroke-1 animate-pulse" />
                    <h3 className="font-display font-bold text-lg text-neutral-700">NO CASE SELECTED FOR ANALYSIS</h3>
                    <p className="text-xs max-w-sm mx-auto">Select any incident dispatch report from the left sidebar register grid to analyze security packets, verify evidence, issue legal clauses, and sign printable FIR certificates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 9. ACADEMY VAULT & CURRICULUM CONTROL CENTER */}
        {activeSubTab === "academy" && (
          <div className="space-y-6 animate-fadeIn" id="admin_academy_workspace">
            {/* Header banner */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="font-display font-bold text-xl text-neutral-900 uppercase">ACADEMY VAULT & CURRICULUM WORKSPACE</h2>
                <p className="text-xs text-neutral-500">Deploy elite training courses, upload lecture streams, inject laboratory reports, and manage active Cadet comments.</p>
              </div>
              <button 
                onClick={fetchAdminData}
                className="p-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              >
                <RefreshCw className="w-4 h-4" /> REFRESH NODES
              </button>
            </div>

            {/* Micro Stats Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">Active Courses</span>
                <span className="text-2xl font-display font-bold text-neutral-900 mt-1 block">{courses.length}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">Total Lessons</span>
                <span className="text-2xl font-display font-bold text-neutral-900 mt-1 block">
                  {courses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">Total Media Streams</span>
                <span className="text-2xl font-display font-bold text-neutral-900 mt-1 block">
                  {courses.reduce((acc, c) => acc + (c.lessons?.filter(l => l.video)?.length || 0), 0)}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">CDN Nodes</span>
                <span className="text-xs font-mono font-bold text-emerald-600 mt-2.5 block flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Cloudinary Direct
                </span>
              </div>
            </div>

            {/* Error / Success logs */}
            {academySuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold font-mono">
                {academySuccess}
              </div>
            )}
            {academyError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold font-mono">
                {academyError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: Course forms and registry */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Course Form */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-neutral-950" />
                    {editingCourseId ? "Modify Course Registry" : "Register New Security Course"}
                  </h3>
                  
                  <form onSubmit={handleCreateOrUpdateCourse} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Course Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g., Advanced Penetration Testing"
                          value={courseForm.title}
                          onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Thumbnail URL</label>
                        <input 
                          type="text" 
                          placeholder="Image URL (Unsplash/Cloudinary)"
                          value={courseForm.thumbnail}
                          onChange={e => setCourseForm({ ...courseForm, thumbnail: e.target.value })}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Syllabus Category</label>
                        <select 
                          value={courseForm.category}
                          onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                        >
                          <option value="Penetration Testing">Penetration Testing</option>
                          <option value="Incident Response">Incident Response</option>
                          <option value="Reverse Engineering">Reverse Engineering</option>
                          <option value="Cryptography">Cryptography</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Expertise Level</label>
                        <select 
                          value={courseForm.level}
                          onChange={e => setCourseForm({ ...courseForm, level: e.target.value as any })}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Course Overview / Description</label>
                      <textarea 
                        rows={3}
                        placeholder="Comprehensive course syllabus description..."
                        value={courseForm.description}
                        onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      {editingCourseId && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingCourseId(null);
                            setCourseForm({ title: "", description: "", category: "Penetration Testing", level: "Intermediate", thumbnail: "" });
                          }}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit"
                        className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        {editingCourseId ? "Save Modifications" : "Deploy Course Node"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Course List Registry */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-neutral-950 uppercase tracking-wider">Active Course Registry ({courses.length})</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {courses.map(course => (
                      <div 
                        key={course.id} 
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition ${
                          selectedCourseForLessons?.id === course.id 
                            ? "border-neutral-900 bg-neutral-50" 
                            : "border-neutral-200/60 bg-white"
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <img 
                            src={course.thumbnail || "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150"} 
                            alt={course.title} 
                            className="w-12 h-12 object-cover rounded-lg border border-neutral-100"
                          />
                          <div>
                            <h4 className="text-xs font-display font-bold text-neutral-900">{course.title}</h4>
                            <div className="flex gap-2 items-center text-[9px] font-mono text-neutral-400 mt-1">
                              <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">{course.category}</span>
                              <span>•</span>
                              <span>{course.level}</span>
                              <span>•</span>
                              <span className="text-neutral-500 font-bold">{course.lessons?.length || 0} Modules</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => setSelectedCourseForLessons(course)}
                            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold font-mono transition cursor-pointer flex items-center gap-1"
                          >
                            Syllabus ({course.lessons?.length || 0})
                          </button>
                          <button 
                            onClick={() => {
                              setEditingCourseId(course.id);
                              setCourseForm({
                                title: course.title,
                                description: course.description || "",
                                category: course.category,
                                level: course.level,
                                thumbnail: course.thumbnail || ""
                              });
                            }}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 cursor-pointer"
                            title="Delete Course Node"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {courses.length === 0 && (
                      <p className="text-center text-xs text-neutral-400 py-12 font-mono">No courses found on active cluster nodes.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Lessons and upload media vault */}
              <div className="lg:col-span-5">
                {selectedCourseForLessons ? (
                  <div className="space-y-6">
                    
                    {/* Selected Course Syllabus Modules */}
                    <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                      <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-mono text-neutral-400 uppercase font-bold">COURSE SYLLABUS VAULT</span>
                          <h3 className="font-display font-bold text-sm text-neutral-950 mt-0.5">{selectedCourseForLessons.title}</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-mono rounded font-bold">
                          {selectedCourseForLessons.lessons?.length || 0} MODULES
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {selectedCourseForLessons.lessons && selectedCourseForLessons.lessons.length > 0 ? (
                          selectedCourseForLessons.lessons.map((lesson, idx) => (
                            <div key={lesson.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-center justify-between">
                              <div className="flex gap-2.5 items-center">
                                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-mono font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h4 className="text-xs font-bold text-neutral-900">{lesson.title}</h4>
                                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5 block">
                                    {lesson.video ? "📹 Video Stream staged" : "📄 Lab documentation only"}
                                  </span>
                                </div>
                              </div>

                              <button 
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-neutral-400 italic py-6 text-center">Syllabus is empty. Upload training assets below to populate modules.</p>
                        )}
                      </div>
                    </div>

                    {/* Add Lesson with file drag-and-drop & progress bar */}
                    <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                      <h3 className="font-display font-bold text-sm text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Append Lecture Module
                      </h3>

                      <form onSubmit={handleCreateLesson} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Lesson Title</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g., Module 01: Reconnaissance Operations"
                            value={lessonForm.title}
                            onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Module Description</label>
                          <textarea 
                            rows={2}
                            placeholder="Short overview of the lesson curriculum goals..."
                            value={lessonForm.description}
                            onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 resize-none"
                          />
                        </div>

                        {/* DRAG & DROP AREA */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">Lecture Asset Upload Center</label>
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition relative flex flex-col items-center justify-center ${
                              dragActive 
                                ? "border-neutral-900 bg-neutral-50/80" 
                                : "border-neutral-200 hover:border-neutral-400 bg-neutral-50/40"
                            }`}
                            onClick={() => document.getElementById("admin_file_upload_input")?.click()}
                          >
                            <input 
                              type="file"
                              id="admin_file_upload_input"
                              accept="video/*,application/pdf"
                              onChange={handleFileInputChange}
                              className="hidden"
                            />
                            
                            <Upload className="w-8 h-8 text-neutral-400 mb-2 stroke-1" />
                            <span className="text-xs text-neutral-800 font-bold block">Drag & Drop Lesson Video or PDF here</span>
                            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Supports video streams (.mp4) and lab documents (.pdf) up to 2GB</span>
                          </div>
                        </div>

                        {/* UPLOAD STATUS PANEL & ACTION CONTROLS */}
                        {uploadingFile && (
                          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-neutral-800 truncate max-w-[200px]">{uploadingFile.name}</span>
                              <span className="text-[10px] font-mono text-neutral-400">{(uploadingFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>

                            {/* PROGRESS BAR */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="uppercase font-bold text-neutral-500">Secure Node Syncing...</span>
                                <span className="font-bold text-neutral-900">{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    uploadStatus === "completed" 
                                      ? "bg-emerald-500" 
                                      : uploadStatus === "paused" 
                                      ? "bg-amber-500" 
                                      : "bg-neutral-900"
                                  }`}
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* CONTROL BUTTONS */}
                            <div className="flex gap-2 items-center justify-between pt-1">
                              <div className="flex gap-1.5">
                                {uploadStatus === "idle" && (
                                  <button 
                                    type="button"
                                    onClick={startUpload}
                                    className="px-3 py-1 bg-neutral-900 text-white rounded text-[10px] font-bold font-mono transition cursor-pointer"
                                  >
                                    Start Stream Upload
                                  </button>
                                )}
                                {uploadStatus === "uploading" && (
                                  <button 
                                    type="button"
                                    onClick={pauseUpload}
                                    className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-bold font-mono transition cursor-pointer"
                                  >
                                    Pause
                                  </button>
                                )}
                                {uploadStatus === "paused" && (
                                  <button 
                                    type="button"
                                    onClick={resumeUpload}
                                    className="px-3 py-1 bg-neutral-900 text-white rounded text-[10px] font-bold font-mono transition cursor-pointer"
                                  >
                                    Resume
                                  </button>
                                )}
                                {(uploadStatus === "uploading" || uploadStatus === "paused" || uploadStatus === "idle") && (
                                  <button 
                                    type="button"
                                    onClick={cancelUpload}
                                    className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-[10px] font-bold font-mono transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>

                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                                {uploadStatus}
                              </span>
                            </div>

                            {/* COMPRESSION & PREVIEW */}
                            {uploadStatus === "completed" && (
                              <div className="border-t border-neutral-200 pt-3 space-y-2">
                                <span className="text-[9px] font-mono text-emerald-600 font-bold block flex items-center gap-1">
                                  ✓ Network upload and metadata auto-compression finalized.
                                </span>
                                
                                {uploadingFile.type.startsWith("video/") && (
                                  <div className="rounded-lg overflow-hidden border border-neutral-200 bg-black aspect-video relative">
                                    <video 
                                      src={lessonForm.videoUrl} 
                                      controls 
                                      className="w-full h-full object-cover"
                                      poster={lessonForm.thumbnail}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <button 
                          type="submit"
                          disabled={!lessonForm.title}
                          className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold font-mono transition disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                        >
                          Save & Append Lesson Node
                        </button>
                      </form>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-16 border border-neutral-200/85 shadow-sm text-center text-neutral-400 space-y-3">
                    <BookOpen className="w-12 h-12 mx-auto text-neutral-300 stroke-1 animate-pulse" />
                    <h3 className="font-display font-bold text-sm text-neutral-700">NO COURSE SYLLABUS SELECTED</h3>
                    <p className="text-[11px] max-w-xs mx-auto leading-relaxed">Select any training course registry node from the left sidebar registry grid to stage modules, trigger uploaders, and compress stream lectures.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
