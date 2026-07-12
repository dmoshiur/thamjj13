import React, { useState, useEffect } from "react";
import { 
  Shield, Terminal, Users, BookOpen, Key, LockIcon, Globe, CheckCircle2, 
  XCircle, ArrowRight, UserPlus, FileCheck, LogIn, Menu, X, Check, AlertTriangle, HelpCircle, Activity, Mail, LogOut 
} from "lucide-react";
import { UserRole, Course, UserProfile, VisitorLog, Certificate } from "./types";
import LandingPage from "./components/LandingPage";
import CourseSystem from "./components/CourseSystem";
import AdminPortal from "./components/AdminPortal";
import StudentPortal from "./components/StudentPortal";
import LiveChatWidget from "./components/LiveChatWidget";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("landing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [adminDoubleOtpId, setAdminDoubleOtpId] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [enteredEmail, setEnteredEmail] = useState("");

  // Dynamic lists from backend APIs
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);

  // Cadet Registration States
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regMsg, setRegMsg] = useState<string | null>(null);
  const [regSuggestions, setRegSuggestions] = useState<string[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Admin login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin OTP verification states
  const [otpError, setOtpError] = useState<string | null>(null);

  // Password Reset States
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState<"none" | "request" | "otp" | "password">("none");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Certificate Verification states
  const [verifyingCertId, setVerifyingCertId] = useState("");
  const [searchCertQuery, setSearchCertQuery] = useState("");
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [certSearchError, setCertSearchError] = useState<string | null>(null);

  // Dynamic socket floating chat sessionId
  const [chatSessionId, setChatSessionId] = useState<string>("");

  useEffect(() => {
    // Generate visitor chat sessionId if none exists
    let sesId = localStorage.getItem("tham_chat_session_id");
    if (!sesId) {
      sesId = `chat-visitor-${Math.floor(Math.random() * 899999) + 100000}`;
      localStorage.setItem("tham_chat_session_id", sesId);
    }
    setChatSessionId(sesId);

    // Initial API loads
    fetchCourses();
    trackVisitorPayload();
    
    // Check Auth
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error("Auth check failed", err));
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      const data: Course[] = await res.json();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load academy courses:", err);
    }
  };

  // Automated visitor logger triggers
  const trackVisitorPayload = async () => {
    try {
      const payload = {
        currentPage: activeTab,
        referrer: document.referrer || "direct_network",
        language: navigator.language || "en-US",
        resolution: `${window.innerWidth}x${window.innerHeight}`,
      };

      const res = await fetch("/api/track-visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setVisitorLogs(data.logs);
      }
    } catch (err) {
      console.error("Error logging visitor metrics:", err);
    }
  };

  // Keep tracking page updates dynamically
  useEffect(() => {
    trackVisitorPayload();
  }, [activeTab]);

  // Cadet Username Availability Checker
  const checkUsernameAvailability = async () => {
    if (!regUsername.trim()) return;
    setUsernameStatus("checking");
    setRegSuggestions([]);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(regUsername)}`);
      const data = await res.json();
      if (data.available) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus("taken");
        setRegSuggestions(data.suggestions || []);
      }
    } catch (err) {
      setUsernameStatus("idle");
    }
  };

  // Submit Cadet Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegMsg(data.message || "🚀 CADET QUEUED: Your registration was submitted successfully!");
        setRegUsername("");
        setRegEmail("");
        setRegPhone("");
        setRegPassword("");
        setUsernameStatus("idle");
      } else {
        setRegMsg(`❌ Registration Error: ${data.error}`);
      }
    } catch (err) {
      setRegMsg("❌ Server connection lost.");
    }
  };

  // Submit Admin/User Credentials login (STEP 1)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/auth/login-step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresDoubleOtp) {
          // Route Admin users to Double-OTP validation terminal (Step 1)
          setAdminDoubleOtpId(data.tempId);
          setEnteredEmail(loginEmail);
          setOtpStep(1);
          setOtpCode("");
          setActiveTab("admin-otp");
        } else {
          // Student Cadets login directly
          setCurrentUser(data.user);
          setActiveTab("student-dashboard");
        }
      } else {
        setLoginError(`❌ Credentials rejection: ${data.error}`);
      }
    } catch (err) {
      setLoginError("❌ Login network failure.");
    }
  };

  // Verify OTP and finalize login (Only 1 OTP needed now)
  const handleVerifyOtp1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/login-step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempId: adminDoubleOtpId,
          otp: otpCode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setAdminDoubleOtpId(null);
        setOtpCode("");
        setActiveTab("admin-portal");
      } else {
        setOtpError(`❌ Code Verification Failed: ${data.error}`);
      }
    } catch (err) {
      setOtpError("❌ Security token payload timeout.");
    }
  };

  // Certificate verify search bar gateway
  const handleCertSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertSearchError(null);
    setVerifiedCert(null);
    const searchVal = searchCertQuery || verifyingCertId;
    if (!searchVal.trim()) return;

    try {
      const res = await fetch(`/api/courses/verify-cert/${searchVal}`);
      const data = await res.json();
      if (res.ok) {
        setVerifiedCert(data.certificate);
      } else {
        setCertSearchError(`❌ CRYPTOGRAPHIC VERIFICATION FAIL: No cert with serial ID [${searchVal}] exists.`);
      }
    } catch (err) {
      setCertSearchError("❌ Cryptographic signature timeout.");
    }
  };

  // Handle click on external cert verification routing
  useEffect(() => {
    if (activeTab === "verify-cert" && verifyingCertId) {
      fetch(`/api/courses/verify-cert/${verifyingCertId}`)
        .then(res => res.json())
        .then(data => {
          if (data.certificate) setVerifiedCert(data.certificate);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab, verifyingCertId]);

  // Submit Request Password Reset OTP
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccessMsg(data.message);
        setResetStep("otp");
      } else {
        setResetError(data.error || "Failed to process request.");
      }
    } catch (err) {
      setResetError("Failed to request reset OTP. Check backend connectivity.");
    }
  };

  // Submit OTP Code Verification only
  const handleResetVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccessMsg(data.message);
        setResetStep("password");
      } else {
        setResetError(data.error || "OTP Verification failed.");
      }
    } catch (err) {
      setResetError("Failed to verify reset OTP. Check backend connectivity.");
    }
  };

  // Submit Confirm Password Reset with client-side match check
  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMsg(null);

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match. Please verify.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccessMsg(data.message);
        // Clear form and return to login after 3 seconds
        setTimeout(() => {
          setResetStep("none");
          setResetEmail("");
          setResetOtp("");
          setResetNewPassword("");
          setResetConfirmPassword("");
          setResetSuccessMsg(null);
        }, 3000);
      } else {
        setResetError(data.error || "Failed to confirm password reset.");
      }
    } catch (err) {
      setResetError("Failed to confirm password reset. Check backend connectivity.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    }
    setCurrentUser(null);
    setAdminDoubleOtpId(null);
    setOtpCode("");
    setOtpStep(1);
    setLoginEmail("");
    setLoginPassword("");
    setActiveTab("landing");
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans relative overflow-hidden" id="tham_root_application">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 cyber-grid opacity-[0.4] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neutral-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neutral-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP SECURE NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/50 px-6 py-4 shadow-[0_1px_15px_rgba(0,0,0,0.02)]" id="secure_navigation_bar">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Branded Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setActiveTab("landing"); setSelectedCourse(null); }}>
            <div className="p-2 bg-neutral-950 rounded-xl text-white group-hover:scale-105 group-hover:bg-indigo-600 transition-all duration-300 shadow-premium">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-[15px] text-neutral-950 tracking-wider group-hover:text-indigo-600 transition-colors">THAMJJ13</span>
              <p className="text-[8px] text-neutral-400 font-mono tracking-widest font-bold">WHITE HAT GUILD • SG/BD</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-neutral-100/60 p-1 rounded-full border border-neutral-200/40">
            <button 
              onClick={() => { setActiveTab("landing"); setSelectedCourse(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${activeTab === "landing" ? "bg-neutral-950 text-white shadow-premium font-bold" : "text-neutral-600 hover:text-neutral-900 hover:bg-white/40"}`}
            >
              Operations Home
            </button>
            <button 
              onClick={() => { setActiveTab("courses"); setSelectedCourse(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${activeTab === "courses" ? "bg-neutral-950 text-white shadow-premium font-bold" : "text-neutral-600 hover:text-neutral-900 hover:bg-white/40"}`}
            >
              Academy
            </button>
            <button 
              onClick={() => { setActiveTab("verify-cert"); setVerifiedCert(null); setCertSearchError(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${activeTab === "verify-cert" ? "bg-neutral-950 text-white shadow-premium font-bold" : "text-neutral-600 hover:text-neutral-900 hover:bg-white/40"}`}
            >
              Verification Gate
            </button>
            
            {/* Conditional dashboards routing */}
            {currentUser ? (
              currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SECONDARY_ADMIN ? (
                <button 
                  onClick={() => setActiveTab("admin-portal")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold text-neutral-950 transition-all duration-300 cursor-pointer ${activeTab === "admin-portal" ? "bg-white shadow-sm" : "text-neutral-600 hover:bg-white/40"}`}
                >
                  Admin Console
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab("student-dashboard")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold text-neutral-950 transition-all duration-300 cursor-pointer ${activeTab === "student-dashboard" ? "bg-white shadow-sm" : "text-neutral-600 hover:bg-white/40"}`}
                >
                  Cadet Dashboard
                </button>
              )
            ) : (
              <>
                <button 
                  onClick={() => setActiveTab("register-cadet")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${activeTab === "register-cadet" ? "bg-neutral-950 text-white shadow-premium font-bold" : "text-neutral-600 hover:text-neutral-900 hover:bg-white/40"}`}
                >
                  Cadet Enlist
                </button>
                <button 
                  onClick={() => setActiveTab("admin-login")}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${activeTab === "admin-login" ? "bg-neutral-950 text-white shadow-premium font-bold" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"}`}
                >
                  Portal Login
                </button>
              </>
            )}
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full text-[9px] font-mono text-neutral-600 shadow-sm">
              <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-ping" />
              <span>SINGAPORE SLA • BANGLADESH EDGE</span>
            </div>

            {/* Mobile Hamburger Menu icon */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-lg md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-neutral-200 space-y-2 flex flex-col text-xs font-medium text-neutral-700">
            <button 
              onClick={() => { setActiveTab("landing"); setSelectedCourse(null); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-800"
            >
              Operations Home
            </button>
            <button 
              onClick={() => { setActiveTab("courses"); setSelectedCourse(null); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-800"
            >
              Academy
            </button>
            <button 
              onClick={() => { setActiveTab("verify-cert"); setVerifiedCert(null); setCertSearchError(null); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-800"
            >
              Verification Gate
            </button>
            
            {currentUser ? (
              currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SECONDARY_ADMIN ? (
                <button 
                  onClick={() => { setActiveTab("admin-portal"); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 px-3 rounded-lg text-neutral-900 font-bold hover:bg-neutral-100"
                >
                  Admin Console
                </button>
              ) : (
                <button 
                  onClick={() => { setActiveTab("student-dashboard"); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 px-3 rounded-lg text-neutral-900 font-bold hover:bg-neutral-100"
                >
                  Cadet Dashboard
                </button>
              )
            ) : (
              <>
                <button 
                  onClick={() => { setActiveTab("register-cadet"); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-800"
                >
                  Cadet Enlist
                </button>
                <button 
                  onClick={() => { setActiveTab("admin-login"); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 px-3 rounded-lg bg-neutral-900 text-white font-medium"
                >
                  Portal Login
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE VIEWPORTS */}
      <main className="relative z-10 min-h-[80vh] py-8">
        {activeTab === "landing" && (
          <LandingPage 
            courses={courses} 
            onNavigate={setActiveTab} 
            onSelectCourse={setSelectedCourse} 
          />
        )}

        {activeTab === "courses" && (
          <CourseSystem
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            currentUser={currentUser}
            onNavigate={setActiveTab}
            setVerifyingCertId={setVerifyingCertId}
          />
        )}

        {activeTab === "admin-portal" && (
          <AdminPortal
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
            visitorLogs={visitorLogs}
          />
        )}

        {activeTab === "student-dashboard" && (
          <StudentPortal
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
          />
        )}

        {/* CADET REGISTRATION GATEWAY */}
        {activeTab === "register-cadet" && (
          <div className="max-w-md mx-auto px-4 py-12 animate-fadeIn" id="cadet_registration_page">
            <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-900 shadow-inner">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-2xl text-neutral-900">Cadet Enlistment Queue</h2>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">Register a verified student cadet node. The operations board will inspect credentials before approving.</p>
              </div>

              {regMsg && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed font-mono ${regMsg.includes("❌") ? "bg-red-50 border-red-200 text-red-800" : "bg-neutral-50 border-neutral-200 text-neutral-800"}`}>
                  {regMsg}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                {/* Username live checker */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-neutral-500 font-mono tracking-wider">CADET USERNAME</label>
                    <button
                      type="button"
                      onClick={checkUsernameAvailability}
                      disabled={!regUsername.trim()}
                      className="text-[10px] text-neutral-900 font-bold hover:underline cursor-pointer"
                    >
                      Check Availability
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={e => { setRegUsername(e.target.value); setUsernameStatus("idle"); }}
                      placeholder="e.g. ethical_cadet_sg"
                      className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                    />
                    {usernameStatus === "checking" && <span className="absolute right-3 top-3.5 text-[9px] font-mono text-neutral-500 animate-pulse">Checking...</span>}
                    {usernameStatus === "available" && <span className="absolute right-3 top-3.5 text-[9px] font-mono text-neutral-900 flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Available</span>}
                    {usernameStatus === "taken" && <span className="absolute right-3 top-3.5 text-[9px] font-mono text-red-600 font-bold">Already Enlisted</span>}
                  </div>

                  {/* alternative suggestions */}
                  {regSuggestions.length > 0 && (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5">
                      <p className="text-[9px] text-neutral-500 font-mono">AVAILABLE REPLACEMENT HANDLES:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {regSuggestions.map(sug => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => { setRegUsername(sug); setUsernameStatus("available"); setRegSuggestions([]); }}
                            className="px-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-800 rounded-lg font-mono transition"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono tracking-wider">SECURE EMAIL</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono tracking-wider">CONTACT NUMBER</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="e.g. 09638233943"
                    className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono tracking-wider">CIPHER KEY PASSWORD</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider transition shadow-sm cursor-pointer mt-2"
                >
                  TRANSMIT ENLISTMENT
                </button>
              </form>
            </div>
          </div>
        )}

        {/* LOG IN / SECURABLE PORTAL ENTRANCE */}
        {activeTab === "admin-login" && (
          <div className="max-w-md mx-auto px-4 py-12 animate-fadeIn" id="auth_login_page">
            <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-6">
              
              {resetStep === "request" && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Mail className="w-5 h-5 animate-pulse" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">Reset Cipher Pass</h2>
                    <p className="text-xs text-neutral-500">Provide your registered secure email to receive a password reset OTP sequence.</p>
                  </div>

                  {resetError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetRequest} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-mono tracking-wider">REGISTERED SECURE EMAIL</label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        placeholder="e.g. thamjj13@gmail.com"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wider transition shadow-sm cursor-pointer"
                    >
                      DISPATCH SECURE RESET OTP
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => setResetStep("none")}
                      className="text-xs text-neutral-500 hover:text-neutral-900 underline"
                    >
                      ← Return to Secure Guild Gate
                    </button>
                  </div>
                </div>
              )}

              {resetStep === "otp" && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Key className="w-5 h-5" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">Verify OTP Token</h2>
                    <p className="text-xs text-neutral-500">Enter the cryptographic OTP code sent to your email to verify your identity.</p>
                  </div>

                  {resetSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 rounded-xl">
                      {resetSuccessMsg}
                    </div>
                  )}

                  {resetError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetVerifyOtp} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-mono tracking-wider">6-DIGIT OTP SEQUENCE</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetOtp}
                        onChange={e => setResetOtp(e.target.value)}
                        placeholder="e.g. 123456"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 font-mono tracking-widest text-center text-lg focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wider transition shadow-sm cursor-pointer"
                    >
                      VERIFY CODE & PROCEED
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => { setResetStep("request"); setResetError(null); setResetSuccessMsg(null); }}
                      className="text-xs text-neutral-500 hover:text-neutral-900 underline"
                    >
                      ← Didn't receive code? Re-request
                    </button>
                  </div>
                </div>
              )}

              {resetStep === "password" && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <LockIcon className="w-5 h-5 animate-pulse" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">Define New Cipher</h2>
                    <p className="text-xs text-neutral-500">Select and confirm your new secure node password sequence.</p>
                  </div>

                  {resetSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 rounded-xl">
                      {resetSuccessMsg}
                    </div>
                  )}

                  {resetError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetConfirm} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-mono tracking-wider">NEW NODE CIPHER PASS</label>
                      <input
                        type="password"
                        required
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-mono tracking-wider">CONFIRM NEW NODE CIPHER PASS</label>
                      <input
                        type="password"
                        required
                        value={resetConfirmPassword}
                        onChange={e => setResetConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wider transition shadow-sm cursor-pointer"
                    >
                      COMMIT NEW PASSWORD
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => { setResetStep("none"); setResetError(null); setResetSuccessMsg(null); }}
                      className="text-xs text-neutral-500 hover:text-neutral-900 underline"
                    >
                      ← Return to Secure Guild Gate
                    </button>
                  </div>
                </div>
              )}

              {resetStep === "none" && (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-900 shadow-inner">
                      <LockIcon className="w-5 h-5" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">Secure Guild Gate</h2>
                    <p className="text-xs text-neutral-500">Sign in to your authorized white hat cadet or admin workspace.</p>
                  </div>

                  {loginError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl">
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-mono tracking-wider">REGISTERED SECURE EMAIL</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="e.g. thamjj13@gmail.com"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-neutral-500 font-mono tracking-wider">NODE CIPHER PASS</label>
                        <button 
                          type="button"
                          onClick={() => { setResetStep("request"); setResetError(null); setResetSuccessMsg(null); }}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-3 text-neutral-900 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider transition shadow-sm cursor-pointer mt-2"
                    >
                      ESTABLISH CRYPTO LINK
                    </button>
                  </form>

                  <div className="pt-4 border-t border-neutral-100 text-center space-y-3.5">
                    <p className="text-[10px] text-neutral-500 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                      ⚠️ <strong>Admin Notice:</strong> If the platform database is fresh, enlist as a Cadet first to automatically bootstrap yourself as the Super Administrator.
                    </p>
                    <button 
                      onClick={() => setActiveTab("register-cadet")} 
                      className="text-xs text-neutral-900 font-bold hover:underline cursor-pointer"
                    >
                      Request Cadet Registration instead →
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* SECURE OTP VERIFICATION TERMINAL (SINGLE-STEP SECURE SEQUENCER) */}
        {activeTab === "admin-otp" && (
          <div className="max-w-md mx-auto px-4 py-12 animate-fadeIn" id="auth_otp_page">
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl space-y-6 relative">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Globe className="w-5 h-5 animate-spin [animation-duration:12s]" />
                </div>
                <h2 className="font-display font-bold text-2xl text-neutral-900">Multi-Factor Gateway</h2>
                <p className="text-xs text-neutral-500">
                  Check your registered inbox for the cryptographic secure OTP sequence.
                </p>
              </div>

              {/* Status Tracker */}
              <div className="flex items-center justify-between px-2 text-[10px] font-mono text-neutral-500">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-neutral-900">TARGET EMAIL:</span>
                  <span>{enteredEmail}</span>
                </div>
                <div className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-900 font-bold border border-neutral-200">
                  SECURE OTP
                </div>
              </div>

              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl text-center">
                  {otpError}
                </div>
              )}

              {/* Sequential Form */}
              <form onSubmit={handleVerifyOtp1Submit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono tracking-wider text-center block uppercase">
                    ENTER INBOX SECURITY OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="XXXXXX"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-center text-lg font-mono tracking-widest text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider transition shadow-sm cursor-pointer"
                >
                  VERIFY WORKSPACE CREDENTIAL
                </button>
              </form>

              <div className="pt-4 border-t border-neutral-100 text-center">
                <p className="text-[10px] text-neutral-400 leading-relaxed font-mono">
                  Singapore SLA security protocols enforce a strict 10-minute expiry on keys. In sandbox, check Node.js process logs on your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PUBLIC CERTIFICATE VERIFICATION PORTAL */}
        {activeTab === "verify-cert" && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-fadeIn" id="public_verification_page">
            <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl text-center max-w-xl mx-auto space-y-6">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-950">
                <FileCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display font-bold text-2xl text-neutral-900">Certificate Validation Gateway</h2>
                <p className="text-xs text-neutral-500">Validate cryptographic signatures and authentic credentials issued to white hat cadets.</p>
              </div>

              {certSearchError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono text-red-800 rounded-xl">
                  {certSearchError}
                </div>
              )}

              <form onSubmit={handleCertSearch} className="flex gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Enter Certificate Serial (e.g. CERT-17120...)"
                  value={searchCertQuery || verifyingCertId}
                  onChange={e => { setSearchCertQuery(e.target.value); setVerifyingCertId(""); }}
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <button
                  type="submit"
                  className="px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Verify
                </button>
              </form>

              <p className="text-[10px] text-neutral-500 font-mono">
                Registry Synced • SLA Singapore. All validated ledgers undergo continuous cryptographic checks.
              </p>
            </div>

            {/* Verified Cert details card */}
            {verifiedCert && (
              <div className="p-10 max-w-2xl mx-auto rounded-3xl bg-white border border-neutral-200 text-left relative overflow-hidden shadow-xl space-y-8 animate-fadeIn" id="verified_cert_output">
                <div className="absolute inset-0 cyber-grid opacity-[0.2] pointer-events-none" />
                <div className="absolute top-4 right-4 w-20 h-20 bg-neutral-100 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-neutral-900">
                    <CheckCircle2 className="w-5 h-5 text-neutral-900" />
                    <span className="font-display font-bold text-xs tracking-wider uppercase">THAMJJ13 SECURITY VERIFIED</span>
                  </div>
                  <span className="text-[9px] font-mono bg-neutral-50 border border-neutral-200 text-neutral-600 px-3 py-1 rounded-md">
                    ID: {verifiedCert.id}
                  </span>
                </div>

                <div className="space-y-4 text-center py-6">
                  <h2 className="text-neutral-500 text-[10px] font-mono tracking-widest uppercase font-bold">OFFICIAL RECORD OF ACHIEVEMENT</h2>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 tracking-tight">{verifiedCert.studentName}</h1>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                    has successfully completed all laboratory benchmarks and final MCQ cryptographic trials, satisfying all parameters for:
                  </p>
                  <h3 className="text-base font-display font-bold text-neutral-900 bg-neutral-100 border border-neutral-200 py-2.5 px-4 rounded-xl inline-block">{verifiedCert.courseTitle}</h3>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-neutral-200 gap-6">
                  <div className="text-[10px] font-mono space-y-1.5 text-neutral-500">
                    <p><strong>ISSUING ENTITY:</strong> {verifiedCert.issuedBy}</p>
                    <p><strong>TIMESTAMP:</strong> {verifiedCert.issuedAt}</p>
                    <p className="text-neutral-900 font-bold"><strong>CRYPTO LEDGER STATE:</strong> SIGNED & VALID</p>
                  </div>

                  <div className="px-4 py-2 bg-neutral-100 border border-neutral-200 text-neutral-900 font-mono text-[10px] rounded-xl font-bold shadow-sm">
                    ✓ SECURE SIGNATURE OK
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. REAL-TIME LIVE SOC MESSAGE WIDGET */}
      <LiveChatWidget 
        currentSessionId={chatSessionId} 
        setSessionId={setChatSessionId} 
        currentUser={currentUser} 
      />
    </div>
  );
}
