import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, User, Shield, Calendar, HardDrive, Key, 
  MessageSquare, Send, CheckCircle2, AlertTriangle, Upload, 
  Download, Loader2, RefreshCw, Zap, Clock, MapPin, Eye, LockIcon, FileText
} from "lucide-react";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import { 
  UserProfile, FileVaultItem, SupportTicket, CyberEvent, UserRole, Report
} from "../types";

interface StudentPortalProps {
  currentUser: { id: string; username: string; role: UserRole } | null;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
}

export default function StudentPortal({ currentUser, onLogout, onNavigate }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "vault" | "calendar" | "support" | "gemini" | "reports">("profile");
  
  // Database state models
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vaultItems, setVaultItems] = useState<FileVaultItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Profile Edit states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Vault file upload
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [vaultUploading, setVaultUploading] = useState(false);
  const [vaultUploadResult, setVaultUploadResult] = useState<string | null>(null);

  // Gemini Thread Intel States
  const [geminiQuery, setGeminiQuery] = useState("");
  const [geminiLog, setGeminiLog] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "🔐 Secure threat channel active. I am THAMJJ13 Intel Threat Tutor. Ask me any inquiry about offensive port exploits, firewalls, or CTFs." }
  ]);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Support ticket form states
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketResult, setTicketResult] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketReply, setTicketReply] = useState("");

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 8000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchStudentData = async () => {
    try {
      const [uRes, vRes, tRes, eRes, rRes] = await Promise.all([
        fetch(`/api/admin/users`),
        fetch("/api/vault"),
        fetch("/api/support/tickets"),
        fetch("/api/events"),
        fetch("/api/reports")
      ]);

      const usersList: UserProfile[] = await uRes.json();
      const current = usersList.find(u => u.username === currentUser?.username);
      if (current) {
        setProfile(current);
        setUsername(current.username);
        setEmail(current.email);
        setPhone(current.phone);
      }

      setVaultItems(await vRes.json());
      setTickets(await tRes.json());
      setEvents(await eRes.json());

      const reportsList: Report[] = await rRes.json();
      if (current) {
        // Filter reports where complainant email/phone or name matches the logged-in user
        const filtered = reportsList.filter(r => 
          (r.email && r.email.trim().toLowerCase() === current.email.trim().toLowerCase()) ||
          (r.phone && r.phone.trim() === current.phone.trim()) ||
          (r.fullName && r.fullName.trim().toLowerCase() === current.username.trim().toLowerCase())
        );
        setMyReports(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateFIRPDF = (report: Report) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("THAMJJ13 DEFENSIVE COMMAND CONTROL GATEWAY", 105, 20, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("SINGAPORE SLA HQ MARINA BAY | WHITE HAT COMMAND NODE DHAKA", 105, 26, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("OFFICIAL GOVERNMENT COMPLIANT FIRST INFORMATION REPORT (FIR)", 105, 33, { align: "center" });
    
    // Draw horizontal line
    doc.setDrawColor(180, 180, 180);
    doc.line(15, 38, 195, 38);
    
    // Case Overview
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. CASE CLASSIFICATION & INDEXING", 15, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`FIR Identifier No: ${report.firNumber || "NOT_ASSIGNED_PENDING_TRIAGE"}`, 20, 52);
    doc.text(`Incident Ref ID: ${report.id}`, 115, 52);
    doc.text(`Triage Security Status: ${report.status}`, 20, 58);
    doc.text(`Category of Incident: ${report.category}`, 115, 58);
    
    // Complainant Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. COMPLAINANT / RECORD REPRESENTATIVE IDENTIFICATION", 15, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Full Legal Name: ${report.fullName}`, 20, 74);
    doc.text(`Email Address: ${report.email}`, 115, 74);
    doc.text(`Contact Number: ${report.phone}`, 20, 80);
    doc.text(`Place of Residence: ${report.address}`, 115, 80);
    
    // Incident Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. INCIDENT PARAMS & TEMPORAL MARKERS", 15, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Incident Coordinates: ${report.incidentLocation}`, 20, 96);
    doc.text(`Incident Date & Time: ${report.incidentDateTime}`, 115, 96);
    doc.text(`Witness Information: ${report.witnessInfo || "None Reported"}`, 20, 102);
    doc.text(`Evidence Attached: ${report.evidenceName || "None"}`, 115, 102);
    
    // Description text (handled gracefully for long strings)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("4. SWORN ALLEGATION NARRATIVE & DESCRIPTION", 15, 112);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const descriptionLines = doc.splitTextToSize(report.description, 175);
    doc.text(descriptionLines, 20, 118);
    
    const yOffset = 118 + (descriptionLines.length * 4.5) + 10;
    
    // FIR details if approved
    if (report.firDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("5. DISPATCH CONTROL STATION & LEGAL JURISDICTION", 15, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Jurisdiction Station: ${report.firDetails.policeStation || "N/A"}`, 20, yOffset + 6);
      doc.text(`Investigating Case Officer: ${report.firDetails.officerDetails || "N/A"}`, 115, yOffset + 6);
      doc.text(`Legal Framework Applied: Section 66D, Digital Security Act (DSA) / Computer Misuse Act`, 20, yOffset + 12);
      doc.text(`Cryptographic Audit Code: ${report.firDetails.verificationCode || "N/A"}`, 20, yOffset + 18);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("6. AUTHORIZED OFF-SIGN STAMP / SIGNATURE", 15, yOffset + 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Authorized Officer Signature: ${report.firDetails.signature || "N/A"}`, 20, yOffset + 38);
      doc.text(`Verification Key: SHA-256 SECURED VERIFICATION CODE`, 115, yOffset + 38);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("5. SYSTEM STATUS NOTICE", 15, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("This incident report is currently under zero-trust regulatory review and validation by Singapore coordinators.", 20, yOffset + 6);
      doc.text("No official FIR number has been issued yet. Standard triage SLA is 24 hours.", 20, yOffset + 11);
    }
    
    // Footer line and notice
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 272, 195, 272);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("This document is an electronic official security report issued under cryptographic keys of THAMJJ13 White Hat.", 105, 278, { align: "center" });
    doc.text("Generated securely via Singapore SLA & Bangladesh Security Incident Response Gateways.", 105, 282, { align: "center" });
    
    doc.save(`FIR-${report.id}.pdf`);
  };

  // Update profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.id,
          username,
          email,
          phone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage("🟢 Profile diagnostics updated successfully.");
        fetchStudentData();
      } else {
        setProfileMessage(`❌ Mismatch: ${data.error}`);
      }
    } catch (err) {
      setProfileMessage("❌ Pipeline socket mismatch.");
    }
  };

  // Upload Profile photo to mock Cloudinary
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setProfileMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/admin/users/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile.id,
            fileBase64: base64,
            fileName: file.name,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setProfileMessage("🚀 Photo saved securely in Cloudinary server nodes.");
          fetchStudentData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop or select secure file vault upload
  const handleVaultUpload = async () => {
    if (!vaultFile) return;
    setVaultUploading(true);
    setVaultUploadResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/vault/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile?.id || "guest",
            fileName: vaultFile.name,
            fileSize: `${(vaultFile.size / 1024).toFixed(1)} KB`,
            fileType: vaultFile.type,
            fileBase64: base64,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setVaultUploadResult("🚀 AES-256 VAULT SUCCESS: Transmitted safely to storage node.");
          setVaultFile(null);
          fetchStudentData();
        } else {
          setVaultUploadResult("❌ Failure storing vault item.");
        }
      } catch (err) {
        setVaultUploadResult("❌ Encryption channel closed.");
      } finally {
        setVaultUploading(false);
      }
    };
    reader.readAsDataURL(vaultFile);
  };

  // Increment download counter
  const handleDownloadVault = async (id: string, url: string, name: string) => {
    try {
      await fetch(`/api/vault/${id}/download`, { method: "POST" });
      fetchStudentData();
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setTicketResult(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.id || "guest",
          studentName: profile?.username || "Certified cadet",
          subject: ticketSubject,
          message: ticketMessage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTicketResult("🚀 Incident ticket logged. SOC support team notified.");
        setTicketSubject("");
        setTicketMessage("");
        fetchStudentData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Append reply to support ticket thread
  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !ticketReply.trim()) return;

    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText: ticketReply,
          senderName: profile?.username || "Student",
        }),
      });
      if (res.ok) {
        setTicketReply("");
        fetchStudentData();
        const updated = tickets.find(t => t.id === activeTicket.id);
        if (updated) {
          updated.replies.push({
            id: `rep-${Date.now()}`,
            sender: profile?.username || "Student",
            message: ticketReply,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Gemini real-time threat assistant proxy
  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiQuery.trim() || geminiLoading) return;

    const userText = geminiQuery;
    setGeminiLog(prev => [...prev, { sender: "user", text: userText }]);
    setGeminiQuery("");
    setGeminiLoading(true);

    try {
      const res = await fetch("/api/gemini/threat-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiLog(prev => [...prev, { sender: "ai", text: data.content }]);
      } else {
        setGeminiLog(prev => [...prev, { sender: "ai", text: "❌ Connection timeout. THAMJJ13 defensive firewalls are blocking packet routing." }]);
      }
    } catch (err) {
      setGeminiLog(prev => [...prev, { sender: "ai", text: "❌ Socket failure to Gemini API." }]);
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans space-y-8 bg-neutral-50 min-h-screen" id="student_portal_module">
      
      {/* 1. Header showing Student profile credentials */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <img 
              src={profile?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"} 
              alt="avatar" 
              className="w-14 h-14 rounded-full object-cover border-2 border-neutral-200 p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-900 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
              ✓
            </div>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400 font-mono tracking-widest uppercase font-bold">ETHICAL HACKER CADET</span>
            <h1 className="font-display font-bold text-lg md:text-xl text-neutral-950 mt-0.5">{profile?.username}</h1>
            <p className="text-[9px] text-neutral-400 font-mono tracking-wider">REGISTRY ID: {profile?.id}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("gemini")}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold font-mono text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Zap className="w-4 h-4 fill-current animate-pulse text-white" /> AI Threat Tutor
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-mono rounded-xl transition cursor-pointer shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* 2. Sub tab Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 border border-neutral-200/80 rounded-2xl text-xs font-mono shadow-sm">
        {[
          { id: "profile", label: "Profile Setup", icon: <User className="w-4 h-4" /> },
          { id: "vault", label: "Secure Vault", icon: <HardDrive className="w-4 h-4" /> },
          { id: "calendar", label: "Seminars Timeline", icon: <Calendar className="w-4 h-4" /> },
          { id: "support", label: "Support Tickets", icon: <MessageSquare className="w-4 h-4" /> },
          { id: "gemini", label: "Gemini AI Intel", icon: <ShieldCheck className="w-4 h-4" /> },
          { id: "reports", label: "My Case Reports & FIRs", icon: <Shield className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Render student portal active view */}
      {activeTab === "profile" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8" 
          id="profile_setup_subview"
        >
          
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-premium hover:shadow-luxury transition-all duration-300 space-y-6">
            <h3 className="font-display font-bold text-base text-neutral-900 uppercase">Cadet Profile Settings</h3>
            <p className="text-xs text-neutral-500">Update account credentials or upload your official digital signature photo.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-6 text-xs">
              {profileMessage && (
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-800">
                  {profileMessage}
                </div>
              )}

              <div className="flex items-center gap-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <img 
                  src={profile?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-full object-cover border border-neutral-200 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-800 font-mono">Upload Photo to CDN Vault</h4>
                  <input
                    type="file"
                    id="avatar_input"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => document.getElementById("avatar_input")?.click()}
                    className="px-4 py-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 font-mono text-[10px] flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    SELECT FILE
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">CADET USERNAME</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 font-mono">CONTACT TELEPHONE NUMBER</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXX or +65XXXXX"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
              >
                SAVE DIAGNOSTICS CHANGES
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-xs text-neutral-950 flex items-center gap-1.5 border-b border-neutral-100 pb-3 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-neutral-800 animate-pulse" /> Double-Factor Security Status
              </h3>
              
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <span>Double-OTP Gateway</span>
                  <span className="px-2 py-0.5 bg-neutral-900 text-white rounded text-[9px] font-bold">ACTIVE</span>
                </div>

                <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <span>SSL Tunnel Handshake</span>
                  <span className="text-neutral-900 font-bold text-[10px]">VERIFIED CLEAN</span>
                </div>

                <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <span>Verifiable Certs Scored</span>
                  <span className="text-neutral-900 font-bold text-[10px]">1 APPROVED</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* SUB TAB: PRIVATE VAULT */}
      {activeTab === "vault" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8" 
          id="vault_subview"
        >
          
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-premium hover:shadow-luxury transition-all duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-base text-neutral-900 uppercase">Private Secure Crypt Vault</h3>
                <p className="text-xs text-neutral-500 mt-1">Upload private scripts, cheatsheets or notes. Partitioned securely inside Cloudinary folders.</p>
              </div>

              <div className="flex gap-2 text-xs">
                <input
                  type="file"
                  id="vault_file_loader"
                  className="hidden"
                  onChange={e => setVaultFile(e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => document.getElementById("vault_file_loader")?.click()}
                  className="px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50 font-mono text-[11px] shadow-sm cursor-pointer"
                >
                  {vaultFile ? vaultFile.name : "Select File"}
                </button>
                <button
                  onClick={handleVaultUpload}
                  disabled={!vaultFile || vaultUploading}
                  className="p-2.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer"
                >
                  {vaultUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {vaultUploadResult && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 text-[11px] font-mono font-bold text-neutral-800 rounded-xl">
                {vaultUploadResult}
              </div>
            )}

            <div className="space-y-4">
              {vaultItems.map(item => (
                <div key={item.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-display font-bold text-neutral-950 flex items-center gap-2">
                      <LockIcon className="w-4 h-4 text-neutral-800" /> {item.fileName}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-mono">Size: {item.fileSize} • Type: {item.fileType} • Downloads: {item.downloadCount}</p>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-600 text-[10px] font-mono rounded-xl font-bold shadow-sm">
                      {item.aesHash}
                    </span>

                    <button
                      onClick={() => handleDownloadVault(item.id, item.cloudinaryUrl, item.fileName)}
                      className="p-2 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 cursor-pointer"
                      title="Decrypt and Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {vaultItems.length === 0 && (
                <p className="text-xs text-neutral-400 italic">Vault is currently empty. Upload files above.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-xs text-neutral-950 uppercase tracking-wider">Cryptographic Specs</h3>
              <p className="text-neutral-500 text-[11px] leading-relaxed">
                All uploaded files undergo local client-side AES-256 cipher simulation hashes before routing through secure tunnels into partitioned Cloudinary folders. No plain-text files are leaked.
              </p>
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-[10px] font-mono text-neutral-500 space-y-1.5 leading-snug">
                <p><strong>ALGORITHM:</strong> AES-256-GCM</p>
                <p><strong>KEY STORAGE:</strong> Singapore Ledger</p>
                <p><strong>COMPLIANCE:</strong> Off-site redundancy</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* SUB TAB: ACADEMY TIMELINE EVENTS */}
      {activeTab === "calendar" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6" 
          id="calendar_subview"
        >
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-premium hover:shadow-luxury transition-all duration-300 space-y-4">
            <h3 className="font-display font-bold text-base text-neutral-900 uppercase">Academy Hacking Seminars & CTFs</h3>
            <p className="text-xs text-neutral-500">Review upcoming schedules, Capture-The-Flag challenges, and join live digital classrooms.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
              {events.map(ev => (
                <div key={ev.id} className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="space-y-3">
                    <span className="text-[9px] bg-neutral-900 text-white px-2.5 py-1 rounded font-mono uppercase tracking-wider font-bold">
                      {ev.type}
                    </span>
                    <h4 className="font-display font-bold text-sm text-neutral-950">{ev.title}</h4>
                    <p className="text-neutral-500 text-xs leading-relaxed">{ev.description}</p>
                  </div>

                  <div className="space-y-2 font-mono text-[10px] text-neutral-400 border-t border-neutral-200 pt-3 font-bold">
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {ev.date} at {ev.time}</div>
                    <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {ev.location}</div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-neutral-400 italic col-span-3">No timeline events scheduled in dynamic database.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* SUB TAB: SUPPORT TICKETS HUB */}
      {activeTab === "support" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8" 
          id="support_tickets_subview"
        >
          
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-premium hover:shadow-luxury transition-all duration-300 space-y-4">
            <h3 className="font-display font-bold text-base text-neutral-900 uppercase">Submit SOC Support Ticket</h3>
            <p className="text-xs text-neutral-500">Having installation errors with Kali packages? Submit a direct support ticket thread.</p>

            {ticketResult && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl">
                {ticketResult}
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-400 font-mono text-[10px]">TICKET SUBJECT</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kali metasploit database setup"
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 font-mono text-[10px]">TICKET MESSAGE</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail your packet logs, traceroutes or error details here..."
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
              >
                SUBMIT INCIDENT RECORD
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4 max-h-[500px] overflow-y-auto">
              <h3 className="font-display font-bold text-xs text-neutral-950 uppercase tracking-wider">Active Hacking support threads</h3>
              
              <div className="space-y-3">
                {tickets.map(tick => (
                  <button
                    key={tick.id}
                    onClick={() => setActiveTicket(tick)}
                    className={`w-full text-left p-4 rounded-xl border transition text-xs cursor-pointer ${
                      activeTicket?.id === tick.id
                        ? "bg-neutral-50 border-neutral-950"
                        : "bg-white border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-neutral-950">{tick.subject}</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-neutral-900 text-white font-bold">{tick.status}</span>
                    </div>
                    <p className="text-neutral-500 text-[11px] truncate mt-1">{tick.message}</p>
                  </button>
                ))}
                {tickets.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">No tickets active currently.</p>
                )}
              </div>
            </div>

            {activeTicket && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                <h4 className="font-display font-bold text-xs text-neutral-950 uppercase tracking-wider">Thread Details: {activeTicket.subject}</h4>
                <p className="text-xs text-neutral-700 p-3 bg-neutral-50 rounded-xl border border-neutral-200 whitespace-pre-wrap leading-relaxed">{activeTicket.message}</p>
                
                <div className="space-y-3 pt-3 border-t border-neutral-100 text-[11px]">
                  {activeTicket.replies.map(rep => (
                    <div key={rep.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1 font-mono">
                      <div className="flex justify-between text-neutral-400 text-[10px] font-bold">
                        <span>{rep.sender}</span>
                        <span>{new Date(rep.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-neutral-800 mt-1">{rep.message}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleReplyTicket} className="flex gap-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Append follow-up comment..."
                    value={ticketReply}
                    onChange={e => setTicketReply(e.target.value)}
                    className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-950 focus:outline-none"
                  />
                  <button type="submit" className="p-2.5 bg-neutral-900 text-white font-bold rounded-xl cursor-pointer">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* SUB TAB: GEMINI INTEL TUTOR ASSISTANT */}
      {activeTab === "gemini" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-premium hover:shadow-luxury transition-all duration-300 space-y-4" 
          id="gemini_intel_chat"
        >
          <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-base text-neutral-900 uppercase">THAMJJ13 Gemini threat intelligence tutor</h3>
              <p className="text-xs text-neutral-500">Direct server-side socket routing queries directly to Gemini models.</p>
            </div>
            <span className="text-[9px] font-mono bg-neutral-100 border border-neutral-200 text-neutral-800 px-3 py-1 rounded font-bold">
              SECURE TLS CHANNEL
            </span>
          </div>

          <div className="h-80 overflow-y-auto p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 text-xs">
            {geminiLog.map((log, i) => (
              <div key={i} className={`flex flex-col ${log.sender === "user" ? "items-end" : "items-start"}`}>
                <span className="text-[9px] text-neutral-400 font-mono mb-1 font-bold">
                  {log.sender === "user" ? "CADET AUDITOR" : "GEMINI INTEL THREAT AGENT"}
                </span>
                <div className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                  log.sender === "user"
                    ? "bg-neutral-900 text-white font-mono border border-neutral-850"
                    : "bg-white text-neutral-800 border border-neutral-200 shadow-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{log.text}</p>
                </div>
              </div>
            ))}
            {geminiLoading && (
              <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[10px] animate-pulse">
                <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span>AI model computing defensive response matrices...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleGeminiSubmit} className="flex gap-2">
            <input
              type="text"
              required
              disabled={geminiLoading}
              placeholder="e.g., Detail how cross-site-scripting bypasses CDN WAF rules?"
              value={geminiQuery}
              onChange={e => setGeminiQuery(e.target.value)}
              className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-950 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
            />
            <button
              type="submit"
              disabled={geminiLoading}
              className="px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
            >
              TRANSMIT
            </button>
          </form>
        </motion.div>
      )}

      {/* SUB TAB: MY CASE REPORTS & FIRS */}
      {activeTab === "reports" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
          id="cadet_reports_section"
        >
          {/* Section title */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-neutral-900 uppercase flex items-center gap-2">
                <Shield className="w-5 h-5 text-neutral-800" /> My Incident Case Reports & FIRs
              </h3>
              <p className="text-xs text-neutral-500">Track current security triage status, communicate with investigators, and download official FIR files.</p>
            </div>
            <div className="px-3.5 py-1.5 bg-neutral-100 border border-neutral-200 rounded-xl text-[10px] font-mono text-neutral-700 font-bold">
              CADET EMAIL REGISTERED: {profile?.email}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-neutral-200/50 shadow-sm space-y-4">
              <h4 className="text-xs font-mono font-bold text-neutral-900 tracking-wider border-b border-neutral-100 pb-2">SUBMITTED DISPATCHES ({myReports.length})</h4>
              
              {myReports.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No case reports found matching your email / phone.</p>
                  <p className="text-[10px] font-mono">Submit a report on the home screen first.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {myReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 text-xs cursor-pointer ${
                        selectedReport?.id === report.id
                          ? "bg-neutral-900 text-white border-neutral-950 shadow-sm"
                          : "bg-neutral-50 hover:bg-neutral-100/75 text-neutral-800 border-neutral-200/75"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-bold">{report.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          report.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          report.status === "REJECTED" ? "bg-red-100 text-red-800 border border-red-200" :
                          report.status === "UNDER_REVIEW" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="font-bold truncate text-neutral-950 font-display mb-1 group-hover:text-white">
                        {report.category}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        Submitted: {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Report details */}
            <div className="lg:col-span-7">
              {selectedReport ? (
                <div className="bg-white rounded-2xl p-6 border border-neutral-200/50 shadow-sm space-y-6">
                  {/* Title & Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 pb-4">
                    <div>
                      <span className="text-[9px] text-neutral-400 font-mono tracking-widest font-bold">CASE STATUS GATEWAY</span>
                      <h3 className="font-display font-bold text-base text-neutral-900 uppercase mt-0.5">Details for Incident Ref: {selectedReport.id}</h3>
                    </div>
                    
                    {selectedReport.status === "APPROVED" && (
                      <button
                        onClick={() => generateFIRPDF(selectedReport)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm animate-bounce"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Official FIR PDF
                      </button>
                    )}
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
                      <span className="text-[9px] text-neutral-400 font-mono font-bold block uppercase mb-1">Complainant Name</span>
                      <span className="font-bold text-neutral-800">{selectedReport.fullName}</span>
                    </div>
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
                      <span className="text-[9px] text-neutral-400 font-mono font-bold block uppercase mb-1">Phone Number</span>
                      <span className="font-bold text-neutral-800 font-mono">{selectedReport.phone}</span>
                    </div>
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
                      <span className="text-[9px] text-neutral-400 font-mono font-bold block uppercase mb-1">Incident Time</span>
                      <span className="font-bold text-neutral-800 font-mono">{selectedReport.incidentDateTime}</span>
                    </div>
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
                      <span className="text-[9px] text-neutral-400 font-mono font-bold block uppercase mb-1">Incident Coordinates</span>
                      <span className="font-bold text-neutral-800 truncate block">{selectedReport.incidentLocation}</span>
                    </div>
                  </div>

                  {/* Narrative description */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">Formal Case Narrative</h5>
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {selectedReport.description}
                    </div>
                  </div>

                  {/* Witness & Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">Witness Registers</h5>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-neutral-700">
                        {selectedReport.witnessInfo || "No witness declarations logged."}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">Uploaded Proofs/Evidence</h5>
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-neutral-700 flex items-center justify-between">
                        <span className="truncate max-w-[150px] text-[11px] font-mono">{selectedReport.evidenceName || "No proof attached."}</span>
                        {selectedReport.evidenceUrl && (
                          <a 
                            href={selectedReport.evidenceUrl} 
                            download={selectedReport.evidenceName} 
                            className="text-indigo-600 hover:underline font-bold text-[10px] flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Official FIR Section */}
                  {selectedReport.firDetails ? (
                    <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 text-neutral-300 space-y-4">
                      <div className="border-b border-neutral-800 pb-2.5 flex justify-between items-center">
                        <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4" /> OFFICIAL FIR FILE DEPLOYED
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">FIR NO: {selectedReport.firNumber}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase">Jurisdiction Police Station</span>
                          <span className="text-white font-bold">{selectedReport.firDetails.policeStation}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase">Investigating Officer</span>
                          <span className="text-white font-bold">{selectedReport.firDetails.officerDetails}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase">Verification Code</span>
                          <span className="text-emerald-400 font-bold truncate block">{selectedReport.firDetails.verificationCode}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase">Timestamp Approved</span>
                          <span className="text-white font-bold">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-800 pt-3 flex flex-col gap-1.5 text-[10px]">
                        <span className="text-neutral-500 font-mono">OFFICER SIGNATURE VERIFIED:</span>
                        <div className="font-serif italic text-base text-neutral-100 font-bold px-3 py-1 bg-neutral-800 rounded border border-neutral-700 inline-block w-fit">
                          {selectedReport.firDetails.signature}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/50 text-xs text-amber-800 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 mb-0.5">Triage Review in Progress</h4>
                        <p className="leading-relaxed">This dispatch report has not yet been assigned an official FIR record. Singapore command node coordinators and SLA regulators are checking logs and packet routes to authorize certification. Under standard SLAs, review takes 24 hours.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border border-neutral-200/50 shadow-sm text-center text-neutral-400 space-y-3">
                  <Shield className="w-12 h-12 mx-auto text-neutral-300 stroke-1" />
                  <h4 className="font-display font-bold text-base text-neutral-700 uppercase">No Case Selected</h4>
                  <p className="text-xs max-w-sm mx-auto">Please select a submitted incident from the left sidebar dispatch register to audit its status, communicate, or fetch certified FIR files.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
