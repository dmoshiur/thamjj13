import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Award,
  BookOpen,
  HardDrive,
  HelpCircle,
  Calendar,
  Send,
  Shield,
  Lock,
  Upload,
  CheckCircle,
  Clock,
  Terminal,
  Sparkles,
  Download,
  ExternalLink,
  Camera,
  UserCheck,
  Edit3,
  FileText,
  KeyRound,
} from "lucide-react";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import {
  UserProfile,
  Course,
  SupportTicket,
  FileVaultItem,
  CyberEvent,
  Report,
} from "../types";

interface StudentPortalProps {
  currentUser: { id: string; username: string; email: string; role: string };
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onNavigate: (tab: string) => void;
}

export default function StudentPortal({
  currentUser,
  courses,
  onSelectCourse,
  onNavigate,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "vault"
    | "support"
    | "ai-tutor"
    | "events"
    | "certificates"
    | "profile"
    | "my-reports"
  >("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vaultItems, setVaultItems] = useState<FileVaultItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);

  // Profile Form States
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Vault States
  const [uploadingVault, setUploadingVault] = useState(false);
  const vaultFileRef = useRef<HTMLInputElement>(null);

  // Support States
  const [ticketSubj, setTicketSubj] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(
    "MEDIUM"
  );
  const [creatingTicket, setCreatingTicket] = useState(false);

  // AI Tutor States
  const [aiMessages, setAiMessages] = useState<{ sender: "user" | "ai"; text: string }[]>(
    [
      {
        sender: "ai",
        text: "Greetings Cadet. I am THAMJJ13 CyberTutor AI. Ask me about OWASP Top 10, Linux privilege escalation, network forensics, or defensive architecture.",
      },
    ]
  );
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [currentUser]);

  const fetchStudentData = async () => {
    try {
      const [meRes, vRes, tRes, eRes, rRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/vault").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/support/tickets").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/events").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/reports/my").then((r) => (r.ok ? r.json() : [])),
      ]);

      if (meRes?.user) {
        const me: UserProfile = meRes.user;
        setProfile(me);
        setEditUsername(me.username || "");
        setEditPhone(me.phone || "");
        setEditBio(me.bio || "");
      }

      setVaultItems(Array.isArray(vRes) ? vRes : []);
      setTickets(Array.isArray(tRes) ? tRes : []);
      setEvents(Array.isArray(eRes) ? eRes : []);
      setMyReports(Array.isArray(rRes) ? rRes : []);
    } catch (err) {
      console.error("Failed to load student portal data:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await fetch("/api/users/me/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          phone: editPhone,
          bio: editBio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        setProfileFeedback("✓ Profile saved to Turso.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordFeedback({
          ok: true,
          msg: "✓ Password updated! Confirmation sent via no-reply@thamjj13.top.",
        });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setPasswordFeedback({
          ok: false,
          msg: data.error || "Failed to update password.",
        });
      }
    } catch {
      setPasswordFeedback({ ok: false, msg: "Connection failed." });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/users/me/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        if (data.success && profile) {
          setProfile({ ...profile, avatarUrl: data.avatarUrl });
          setProfileFeedback("✓ Avatar uploaded to Cloudinary.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateFIRPDF = (report: Report) => {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 15, 15);
    doc.text("THAMJJ13 DEFENSIVE COMMAND CONTROL GATEWAY", 105, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(
      "SINGAPORE SLA HQ MARINA BAY | WHITE HAT COMMAND NODE DHAKA",
      105,
      26,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 15, 15);
    doc.text("OFFICIAL CRYPTOGRAPHIC FIRST INFORMATION REPORT (FIR)", 105, 33, {
      align: "center",
    });

    doc.setDrawColor(180, 180, 180);
    doc.line(15, 38, 195, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. CASE CLASSIFICATION & INDEXING", 15, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`FIR Number: ${report.firNumber || "PENDING_TRIAGE"}`, 20, 52);
    doc.text(`Case Reference ID: ${report.id}`, 115, 52);
    doc.text(
      `Filing Date: ${new Date(report.createdAt).toLocaleString()}`,
      20,
      57
    );
    doc.text(`Incident Category: ${report.category}`, 115, 57);
    doc.text(`Triage Status: ${report.status}`, 20, 62);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. COMPLAINANT IDENTIFICATION", 15, 72);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Full Name: ${report.fullName}`, 20, 78);
    doc.text(`Email Address: ${report.email}`, 115, 78);
    doc.text(`Phone Contact: ${report.phone}`, 20, 83);
    doc.text(`Physical Address: ${report.address}`, 20, 88);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. INCIDENT COORDINATES & TIMELINE", 15, 98);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Date & Time of Incident: ${report.incidentDateTime}`, 20, 104);
    doc.text(`Location / Target Vector: ${report.incidentLocation}`, 20, 109);
    if (report.witnessInfo) {
      doc.text(`Witness Declarations: ${report.witnessInfo}`, 20, 114);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("4. STATEMENT OF FACTS & TECHNICAL NARRATIVE", 15, 124);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const splitDescription = doc.splitTextToSize(report.description, 175);
    doc.text(splitDescription, 20, 130);

    let yOffset = 130 + splitDescription.length * 4.5 + 8;
    if (yOffset > 235) {
      doc.addPage();
      yOffset = 25;
    }

    if (report.firDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("5. OFFICIAL JURISDICTION & INVESTIGATING COMMAND", 15, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Assigned Station / Node: ${report.firDetails.policeStation || "Singapore SOC Central"}`,
        20,
        yOffset + 6
      );
      doc.text(
        `District / Operational Zone: ${report.firDetails.district || "Marina Bay Zone 1"}`,
        115,
        yOffset + 6
      );
      doc.text(
        `Investigating Officer: ${report.firDetails.officerDetails || "Duty Commander"}`,
        20,
        yOffset + 11
      );
      doc.text(
        `Verification Hash: ${report.firDetails.verificationCode || "VERIFIED-SLA-NODE"}`,
        115,
        yOffset + 11
      );

      if (report.firDetails.summary) {
        const splitSummary = doc.splitTextToSize(
          `Official Investigator Summary: ${report.firDetails.summary}`,
          175
        );
        doc.text(splitSummary, 20, yOffset + 18);
        yOffset += splitSummary.length * 4.5 + 22;
      } else {
        yOffset += 20;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(15, yOffset + 5, 195, yOffset + 5);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Authorized Cryptographic Signature: ${
          report.firDetails.signature || "THAMJJ13-ROOT-CA"
        }`,
        20,
        yOffset + 14
      );
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(
        "Digitally Sealed & Verified by THAMJJ13 Turso Ledger. Tampering invalidates cryptographic integrity.",
        20,
        yOffset + 20
      );
    }

    doc.save(`FIR-${report.id}.pdf`);
  };

  const handleVaultUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVault(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/vault/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            fileBase64: reader.result as string,
          }),
        });
        const data = await res.json();
        if (data.success && data.item) {
          setVaultItems([data.item, ...vaultItems]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingVault(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubj.trim() || !ticketMsg.trim()) return;
    setCreatingTicket(true);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketSubj,
          message: ticketMsg,
          priority: ticketPriority,
        }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets([data.ticket, ...tickets]);
        setTicketSubj("");
        setTicketMsg("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput;
    setAiMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/cyber-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText }),
      });
      const data = await res.json();
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply || "CyberTutor AI processed your query.",
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Connection interrupted. Retry transmission." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const enrolledCourses = courses.filter((c) =>
    profile?.enrolledCourses?.includes(c.id)
  );
  const completedCount = profile?.completedLessons?.length || 0;

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
      id="student_portal_layout"
    >
      {/* SIDEBAR */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 text-center space-y-4 shadow-sm">
          <div className="relative w-20 h-20 mx-auto group">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={currentUser.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-neutral-900 shadow-sm mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-neutral-100 border-2 border-neutral-300 flex items-center justify-center mx-auto text-neutral-800 font-display font-bold text-2xl">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-1.5 bg-neutral-900 text-white rounded-full shadow hover:bg-neutral-800 transition cursor-pointer"
              title="Upload Profile Picture (Cloudinary)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            <h3 className="font-display font-bold text-neutral-900 text-base">
              {profile?.username || currentUser.username}
            </h3>
            <p className="text-[11px] font-mono text-neutral-400">
              {currentUser.email}
            </p>
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold">
              <UserCheck className="w-3 h-3" /> VERIFIED CADET
            </div>
          </div>

          {profile?.badges && profile.badges.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 flex flex-wrap gap-1.5 justify-center">
              {profile.badges.map((b, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-700"
                >
                  🏅 {b}
                </span>
              ))}
            </div>
          )}
        </div>

        <nav className="bg-white rounded-3xl p-3 border border-neutral-200 space-y-1 shadow-sm text-xs font-medium">
          {[
            { id: "overview", label: "Dashboard Overview", icon: BookOpen },
            { id: "profile", label: "Cadet Profile & Security", icon: User },
            { id: "my-reports", label: "My Case Reports & FIR", icon: FileText },
            { id: "certificates", label: "Earned Certificates", icon: Award },
            { id: "ai-tutor", label: "AI CyberTutor Lab", icon: Sparkles },
            { id: "vault", label: "Encrypted File Vault", icon: HardDrive },
            { id: "events", label: "Live Seminars & CTFs", icon: Calendar },
            { id: "support", label: "Helpdesk & Tickets", icon: HelpCircle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === item.id
                    ? "bg-neutral-900 text-white font-bold shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="lg:col-span-9 space-y-6">
        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  ENROLLED TRACKS
                </span>
                <h4 className="text-3xl font-display font-bold text-neutral-900 mt-1">
                  {enrolledCourses.length || courses.length}
                </h4>
                <p className="text-xs text-neutral-500 mt-1">Active Cyber Curriculums</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  COMPLETED MODULES
                </span>
                <h4 className="text-3xl font-display font-bold text-neutral-900 mt-1">
                  {completedCount}
                </h4>
                <p className="text-xs text-neutral-500 mt-1">Verified Video Labs</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  CERTIFICATIONS
                </span>
                <h4 className="text-3xl font-display font-bold text-emerald-700 mt-1">
                  {profile?.certificates?.length || 0}
                </h4>
                <p className="text-xs text-neutral-500 mt-1">Signed Credentials</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  Continue Cyber Training
                </h3>
                <button
                  onClick={() => onNavigate("courses")}
                  className="text-xs font-mono font-bold text-neutral-900 hover:underline cursor-pointer"
                >
                  Browse Full Catalog →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => {
                  const totalLessons = course.lessons?.length || 1;
                  const doneInCourse =
                    course.lessons?.filter((l) =>
                      profile?.completedLessons?.includes(l.id)
                    ).length || 0;
                  const pct = Math.round((doneInCourse / totalLessons) * 100);

                  return (
                    <div
                      key={course.id}
                      className="p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1">
                          <span>{course.category}</span>
                          <span>{pct}% Complete</span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-neutral-900">
                          {course.title}
                        </h4>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-neutral-900 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onSelectCourse(course);
                          onNavigate("courses");
                        }}
                        className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold font-mono transition cursor-pointer"
                      >
                        OPEN CLASSROOM
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. PROFILE & PASSWORD */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5" /> Cadet Identity &amp; Dossier
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Update your academy callsign, phone number, bio, and Cloudinary avatar.
                </p>
              </div>

              {profileFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-800">
                  {profileFeedback}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                    Full Name / Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                    Phone Contact
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                    Cadet Bio &amp; Specializations
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Red Team, Web App Pentesting, SOC Analysis..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {savingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5" /> Rotate Account Password
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Updates your bcrypt credential hash in Turso and sends a security alert from no-reply@thamjj13.top.
                </p>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono border ${
                    passwordFeedback.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {passwordFeedback.msg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* 3. MY REPORTS & FIR */}
        {activeTab === "my-reports" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6"
          >
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-neutral-900">
                  My Incident Reports &amp; Official FIRs
                </h3>
                <p className="text-xs text-neutral-500">
                  Reports filed under {currentUser.email} in the Turso Case Ledger.
                </p>
              </div>
              <button
                onClick={() => onNavigate("landing")}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + File New Report
              </button>
            </div>

            {myReports.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                No incident reports found under your email ({currentUser.email}).
              </div>
            ) : (
              <div className="space-y-4">
                {myReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-3"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-neutral-900">
                          {rep.id}
                        </span>
                        <span className="mx-2 text-neutral-300">•</span>
                        <span className="text-xs font-bold text-neutral-700">
                          {rep.category}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          rep.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : rep.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {rep.description}
                    </p>

                    {rep.notes && (
                      <div className="p-3 bg-white border-l-4 border-neutral-900 rounded text-xs text-neutral-700">
                        <strong className="font-mono text-[10px] uppercase block text-neutral-400">
                          Investigator Update:
                        </strong>
                        {rep.notes}
                      </div>
                    )}

                    {rep.status === "APPROVED" && (
                      <div className="pt-2 flex items-center justify-between border-t border-neutral-200/70">
                        <span className="text-[11px] font-mono text-emerald-700 font-bold">
                          FIR Signed: {rep.firNumber || "FIR-ISSUED"}
                        </span>
                        <button
                          onClick={() => generateFIRPDF(rep)}
                          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Official FIR PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 4. CERTIFICATES */}
        {activeTab === "certificates" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6"
          >
            <h3 className="font-display font-bold text-lg text-neutral-900">
              Earned Cryptographic Certificates
            </h3>

            {!profile?.certificates || profile.certificates.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Award className="w-10 h-10 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500">
                  Complete any course&apos;s final MCQ exam (70%+) to earn a verifiable certificate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <Award className="w-7 h-7 text-emerald-600" />
                      <span className="text-[10px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        VERIFIED
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-base text-neutral-900">
                      {cert.courseTitle}
                    </h4>
                    <p className="text-[11px] font-mono text-neutral-500">
                      Hash: {cert.verificationHash}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 5. AI TUTOR */}
        {activeTab === "ai-tutor" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[560px]"
          >
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-950 text-white">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-display font-bold text-sm">
                    THAMJJ13 CyberTutor AI
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">
                    WHITE-HAT DEFENSIVE MENTOR
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/50 text-xs">
              {aiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      m.sender === "user"
                        ? "bg-neutral-900 text-white"
                        : "bg-white border border-neutral-200 text-neutral-800 shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="text-xs font-mono text-neutral-400 animate-pulse">
                  CyberTutor analyzing query...
                </div>
              )}
            </div>

            <form
              onSubmit={handleAskAI}
              className="p-4 bg-white border-t border-neutral-200 flex gap-2"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask about SQLi mitigation, privilege escalation, SIEM rules..."
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Ask
              </button>
            </form>
          </motion.div>
        )}

        {/* 6. ENCRYPTED FILE VAULT */}
        {activeTab === "vault" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6"
          >
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Cadet Cloud Evidence &amp; Notes Vault
                </h3>
                <p className="text-xs text-neutral-500">
                  Backed by Cloudinary CDN &amp; SHA-256 integrity hashes in Turso.
                </p>
              </div>
              <div>
                <button
                  onClick={() => vaultFileRef.current?.click()}
                  disabled={uploadingVault}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingVault ? "Uploading to Cloudinary..." : "Upload File"}
                </button>
                <input
                  type="file"
                  ref={vaultFileRef}
                  onChange={handleVaultUpload}
                  className="hidden"
                />
              </div>
            </div>

            {vaultItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                Your personal Cloudinary vault is empty. Upload lab notes, reports, or screenshots above.
              </div>
            ) : (
              <div className="space-y-3">
                {vaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-neutral-200 flex flex-wrap justify-between items-center gap-4 bg-neutral-50/50"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-neutral-900">
                        {item.fileName}
                      </h4>
                      <p className="text-[10px] font-mono text-neutral-400">
                        Size: {item.fileSize} • Integrity: {item.aesHash?.slice(0, 24)}...
                      </p>
                    </div>
                    <a
                      href={item.cloudinaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-800 hover:bg-neutral-100 flex items-center gap-1.5"
                    >
                      Open Asset <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 7. EVENTS */}
        {activeTab === "events" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6"
          >
            <h3 className="font-display font-bold text-lg text-neutral-900">
              Upcoming Seminars &amp; Live CTF Briefings
            </h3>
            {events.length === 0 ? (
              <p className="text-xs text-neutral-500">No upcoming events scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3"
                  >
                    <div className="flex justify-between text-[10px] font-mono text-indigo-600 font-bold">
                      <span>
                        {ev.date} • {ev.time}
                      </span>
                      <span>HOST: {ev.instructor}</span>
                    </div>
                    <h4 className="font-display font-bold text-base text-neutral-900">
                      {ev.title}
                    </h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {ev.description}
                    </p>
                    {ev.registrationLink && (
                      <a
                        href={ev.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-900 hover:underline pt-2"
                      >
                        Join Briefing Link <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 8. SUPPORT TICKETS */}
        {activeTab === "support" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <form
              onSubmit={handleCreateTicket}
              className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4 text-xs"
            >
              <h3 className="font-display font-bold text-lg text-neutral-900">
                Open Academy Helpdesk Ticket
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Subject / Module Issue *"
                  value={ticketSubj}
                  onChange={(e) => setTicketSubj(e.target.value)}
                  className="md:col-span-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white"
                />
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 focus:outline-none"
                >
                  <option value="LOW">LOW PRIORITY</option>
                  <option value="MEDIUM">MEDIUM PRIORITY</option>
                  <option value="HIGH">HIGH PRIORITY</option>
                </select>
              </div>
              <textarea
                required
                rows={3}
                placeholder="Describe your lab question or technical issue..."
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                disabled={creatingTicket}
                className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
              >
                {creatingTicket ? "Submitting..." : "Dispatch Support Ticket"}
              </button>
            </form>

            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
              <h4 className="font-display font-bold text-base text-neutral-900">
                My Ticket History
              </h4>
              {tickets.length === 0 ? (
                <p className="text-xs text-neutral-500">No support tickets filed yet.</p>
              ) : (
                <div className="space-y-4">
                  {tickets.map((tk) => (
                    <div
                      key={tk.id}
                      className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-900">
                          {tk.subject}{" "}
                          <span className="font-mono text-[10px] text-neutral-400">
                            ({tk.id})
                          </span>
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            tk.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : tk.status === "IN_PROGRESS"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {tk.status}
                        </span>
                      </div>
                      <p className="text-neutral-600">{tk.message}</p>

                      {tk.replies && tk.replies.length > 0 && (
                        <div className="pt-3 border-t border-neutral-200 space-y-2">
                          {tk.replies.map((r, i) => (
                            <div
                              key={i}
                              className="p-3 bg-white rounded-xl border border-neutral-200"
                            >
                              <span className="font-mono text-[10px] font-bold text-indigo-700 block mb-1">
                                {r.sender} • {new Date(r.timestamp).toLocaleString()}
                              </span>
                              <p className="text-neutral-700">{r.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
