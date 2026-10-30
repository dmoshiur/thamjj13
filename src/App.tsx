import React, { useState, useEffect } from "react";
import {
  Shield,
  BookOpen,
  UserCheck,
  Lock,
  Award,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  User,
  LogOut,
  ShieldAlert,
  RefreshCw,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import LandingPage from "./components/LandingPage";
import CourseSystem from "./components/CourseSystem";
import AdminPortal from "./components/AdminPortal";
import StudentPortal from "./components/StudentPortal";
import LiveChatWidget from "./components/LiveChatWidget";
import thamLogo from "./assets/images/thamjj13_logo_1783764297314.jpg";

import { UserRole, Course, Certificate } from "./types";

const ADMIN_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SECONDARY_ADMIN,
  UserRole.COURSE_MANAGER,
  UserRole.SUPPORT_AGENT,
  UserRole.MODERATOR,
  UserRole.CONTENT_MANAGER,
]);

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("landing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    email: string;
    role: UserRole;
  } | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string>("");

  // Bootstrap Status (One-time Super Admin Provisioning)
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [senderEmail, setSenderEmail] = useState("no-reply@thamjj13.top");
  const [bootstrapMode, setBootstrapMode] = useState(false);
  const [bootstrapStep, setBootstrapStep] = useState<1 | 2>(1);
  const [bootstrapChallengeId, setBootstrapChallengeId] = useState("");
  const [bootstrapForm, setBootstrapForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    otp: "",
  });

  // Auth Login + 2FA OTP State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [tempAuthId, setTempAuthId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Cadet Registration + OTP Verification State
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regChallengeId, setRegChallengeId] = useState("");
  const [regOtpInput, setRegOtpInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Password Reset Flow
  const [resetEmail, setResetEmail] = useState("");
  const [resetTempId, setResetTempId] = useState<string | null>(null);
  const [resetOtp, setResetOtp] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Public Certificate Verification
  const [verifyingCertId, setVerifyingCertId] = useState("");
  const [certResult, setCertResult] = useState<{
    valid: boolean;
    certificate?: Certificate;
  } | null>(null);
  const [certChecking, setCertChecking] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  const fetchBootstrapStatus = async () => {
    try {
      const res = await fetch("/api/auth/bootstrap-status");
      if (!res.ok) return;
      const data = await res.json();
      setNeedsBootstrap(Boolean(data.needsBootstrap));
      if (data.senderEmail) setSenderEmail(data.senderEmail);
      if (data.needsBootstrap) {
        setBootstrapMode(true);
      }
    } catch (err) {
      console.error("Bootstrap check error:", err);
    }
  };

  useEffect(() => {
    let savedSession = localStorage.getItem("tham_chat_session");
    if (!savedSession) {
      savedSession = `sess-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("tham_chat_session", savedSession);
    }
    setChatSessionId(savedSession);

    // Check active HTTP-only JWT session
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetchCourses();
    fetchBootstrapStatus();

    // Support direct ?verify=CERT-THAM-... link
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get("verify");
    if (verifyParam) {
      setVerifyingCertId(verifyParam);
      setActiveTab("verify-cert");
      fetch(`/api/certificates/verify/${encodeURIComponent(verifyParam)}`)
        .then((r) => r.json())
        .then((d) => setCertResult(d))
        .catch(() => {});
    }

    // Log visitor analytics
    const returning = localStorage.getItem("tham_returning") === "true";
    localStorage.setItem("tham_returning", "true");
    fetch("/api/tracker/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || "Direct Entry",
        currentPage: window.location.pathname,
        returningVisitor: returning,
      }),
    }).catch(() => {});
  }, []);

  // Username availability debounce
  useEffect(() => {
    if (!regUsername || regUsername.length < 3) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username-check?username=${encodeURIComponent(regUsername)}`
        );
        const data = await res.json();
        setUsernameAvailable(data.available);
        setUsernameSuggestions(data.suggestions || []);
      } catch (err) {
        console.error(err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [regUsername]);

  // Super Admin Initial Bootstrap Flow
  const handleBootstrapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: bootstrapForm.username,
          email: bootstrapForm.email,
          phone: bootstrapForm.phone,
          password: bootstrapForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBootstrapChallengeId(data.challengeId);
        setBootstrapStep(2);
        setAuthNotice(data.message);
      } else {
        setAuthError(data.error || "Failed to initiate Super Admin setup.");
      }
    } catch {
      setAuthError("Connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBootstrapConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: bootstrapChallengeId,
          otp: bootstrapForm.otp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setNeedsBootstrap(false);
        setBootstrapMode(false);
        setActiveTab("admin-dashboard");
      } else {
        setAuthError(data.error || "Invalid OTP code.");
      }
    } catch {
      setAuthError("Connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Standard Login Step 1 (Password Check -> Dispatches Resend 2FA OTP)
  const handleLoginStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login-step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Invalid credentials.");
      } else if (data.requiresOtp || data.requiresDoubleOtp) {
        setTempAuthId(data.tempId);
        setOtpInput("");
        setAuthNotice(
          data.simulated
            ? "Dev Mode (RESEND_API_KEY not set): 6-digit OTP printed to server console."
            : `6-digit OTP sent from ${senderEmail} to ${loginEmail}.`
        );
        setActiveTab("admin-otp");
      } else if (data.user) {
        setCurrentUser(data.user);
        setActiveTab(
          ADMIN_ROLES.has(data.user.role) ? "admin-dashboard" : "student-portal"
        );
      }
    } catch {
      setAuthError("Network connection failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Standard Login Step 2 (Verify 6-digit Resend OTP)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login-step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId: tempAuthId, otp: otpInput }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setOtpInput("");
        setTempAuthId(null);
        setActiveTab(
          ADMIN_ROLES.has(data.user.role) ? "admin-dashboard" : "student-portal"
        );
      } else {
        setAuthError(data.error || "Invalid or expired OTP.");
      }
    } catch {
      setAuthError("OTP verification request failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!tempAuthId) return;
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login-resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId: tempAuthId }),
      });
      const data = await res.json();
      if (res.ok && data.tempId) {
        setTempAuthId(data.tempId);
        setAuthNotice(data.message);
      } else {
        setAuthError(data.error || "Could not resend OTP.");
      }
    } catch {
      setAuthError("Network error.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Cadet Registration (2-Step Email OTP via Resend)
  const handleRegisterRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (usernameAvailable === false) {
      setAuthError("Please choose an available username.");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/register-request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.challengeId) {
        setRegChallengeId(data.challengeId);
        setRegStep(2);
        setAuthNotice(data.message);
      } else {
        setAuthError(data.error || "Failed to send verification code.");
      }
    } catch {
      setAuthError("Connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRegSuccess(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          phone: regPhone,
          address: regAddress,
          password: regPassword,
          challengeId: regChallengeId,
          otp: regOtpInput,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setRegSuccess(data.message);
        setRegStep(1);
        setRegUsername("");
        setRegEmail("");
        setRegPhone("");
        setRegAddress("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegOtpInput("");
      } else {
        setAuthError(data.error || "Registration failed.");
      }
    } catch {
      setAuthError("Registration gateway unavailable.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Password Reset via Resend OTP
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetTempId(data.tempId);
        setAuthNotice(data.message);
        setActiveTab("reset-password-otp");
      } else {
        setAuthError(data.error || "Account not found.");
      }
    } catch {
      setAuthError("Network connection failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempId: resetTempId,
          otp: resetOtp,
          newPassword: newResetPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetSuccessMsg(data.message);
        setTimeout(() => {
          setResetSuccessMsg(null);
          setActiveTab("admin-login");
        }, 2500);
      } else {
        setAuthError(data.error || "Invalid OTP code.");
      }
    } catch {
      setAuthError("Failed to reset password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingCertId.trim()) return;
    setCertChecking(true);
    setCertResult(null);

    try {
      const res = await fetch(
        `/api/certificates/verify/${encodeURIComponent(verifyingCertId.trim())}`
      );
      const data = await res.json();
      setCertResult(data);
    } catch {
      setCertResult({ valid: false });
    } finally {
      setCertChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    setActiveTab("landing");
  };

  const isUserAdmin = currentUser ? ADMIN_ROLES.has(currentUser.role) : false;

  return (
    <div
      className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans relative overflow-x-hidden"
      id="tham_enterprise_root"
    >
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 glass-header border-b border-neutral-200/80 transition-all duration-300"
        id="main_navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            onClick={() => setActiveTab("landing")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-sm flex items-center justify-center">
              <img
                src={thamLogo}
                alt="THAMJJ13 Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-wider text-neutral-900">
                THAMJJ13
              </span>
              <span className="hidden sm:block text-[9px] font-mono text-neutral-400 tracking-widest -mt-1">
                SINGAPORE OPS CENTRAL
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab("landing")}
              className={`text-xs font-medium tracking-wide transition cursor-pointer ${
                activeTab === "landing"
                  ? "text-neutral-950 font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Operations Home
            </button>
            <button
              onClick={() => setActiveTab("courses")}
              className={`text-xs font-medium tracking-wide flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "courses"
                  ? "text-neutral-950 font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Academy
            </button>
            <button
              onClick={() => setActiveTab("verify-cert")}
              className={`text-xs font-medium tracking-wide flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "verify-cert"
                  ? "text-neutral-950 font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Verification Gate
            </button>

            <div className="h-4 w-[1px] bg-neutral-200 mx-1" />

            {currentUser ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setActiveTab(
                      isUserAdmin ? "admin-dashboard" : "student-portal"
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-800 transition shadow-sm cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{currentUser.username}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setActiveTab("register");
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-medium transition cursor-pointer"
                >
                  Cadet Enlist
                </button>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setActiveTab("admin-login");
                  }}
                  className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Lock className="w-3 h-3" /> Portal Login
                </button>
              </div>
            )}
          </nav>

          <button
            className="md:hidden text-neutral-600 p-2 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-neutral-200 px-6 py-4 space-y-3">
            <button
              onClick={() => {
                setActiveTab("landing");
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-sm text-neutral-700 font-medium"
            >
              Operations Home
            </button>
            <button
              onClick={() => {
                setActiveTab("courses");
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-sm text-neutral-700 font-medium"
            >
              Academy
            </button>
            <button
              onClick={() => {
                setActiveTab("verify-cert");
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-sm text-neutral-700 font-medium"
            >
              Verification Gate
            </button>
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setActiveTab(
                      isUserAdmin ? "admin-dashboard" : "student-portal"
                    );
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-sm text-neutral-900 font-bold"
                >
                  Open Dashboard ({currentUser.username})
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-sm text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setActiveTab("register");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center rounded-xl border border-neutral-200 text-neutral-800 text-xs font-bold"
                >
                  Cadet Enlist
                </button>
                <button
                  onClick={() => {
                    setActiveTab("admin-login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center rounded-xl bg-neutral-900 text-white text-xs font-bold"
                >
                  Portal Login
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <LandingPage
                courses={courses}
                onNavigate={setActiveTab}
                onSelectCourse={(c) => {
                  setSelectedCourse(c);
                  setActiveTab("courses");
                }}
              />
            </motion.div>
          )}

          {activeTab === "courses" && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <CourseSystem
                courses={courses}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                currentUser={currentUser}
                onNavigate={setActiveTab}
                setVerifyingCertId={(id) => {
                  setVerifyingCertId(id);
                  setActiveTab("verify-cert");
                }}
              />
            </motion.div>
          )}

          {activeTab === "admin-dashboard" && isUserAdmin && currentUser && (
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <AdminPortal
                currentUser={currentUser}
                onRefreshCourses={fetchCourses}
              />
            </motion.div>
          )}

          {activeTab === "student-portal" && currentUser && (
            <motion.div
              key="student-portal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <StudentPortal
                currentUser={currentUser}
                courses={courses}
                onSelectCourse={(c) => {
                  setSelectedCourse(c);
                  setActiveTab("courses");
                }}
                onNavigate={setActiveTab}
              />
            </motion.div>
          )}

          {/* PORTAL LOGIN & ONE-TIME SUPER ADMIN BOOTSTRAP */}
          {activeTab === "admin-login" && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-14 px-4 space-y-4"
            >
              {needsBootstrap && (
                <div className="flex bg-neutral-200/70 p-1 rounded-2xl text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setBootstrapMode(true);
                      setAuthError(null);
                      setAuthNotice(null);
                    }}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer ${
                      bootstrapMode ? "bg-neutral-900 text-white" : "text-neutral-600"
                    }`}
                  >
                    1st-Time Super Admin Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBootstrapMode(false);
                      setAuthError(null);
                      setAuthNotice(null);
                    }}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer ${
                      !bootstrapMode ? "bg-neutral-900 text-white" : "text-neutral-600"
                    }`}
                  >
                    Standard Login
                  </button>
                </div>
              )}

              {needsBootstrap && bootstrapMode ? (
                <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950 flex items-center justify-center mx-auto text-amber-400">
                      <Crown className="w-6 h-6" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">
                      Initialize Super Admin
                    </h2>
                    <p className="text-xs text-neutral-500">
                      No Super Administrator exists in Turso yet. Verify your email via{" "}
                      <strong>{senderEmail}</strong> to claim root command.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                      {authError}
                    </div>
                  )}
                  {authNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-mono">
                      {authNotice}
                    </div>
                  )}

                  {bootstrapStep === 1 ? (
                    <form onSubmit={handleBootstrapRequest} className="space-y-3.5 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Super Admin Callsign / Name *"
                        value={bootstrapForm.username}
                        onChange={(e) =>
                          setBootstrapForm({
                            ...bootstrapForm,
                            username: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Official Admin Email *"
                        value={bootstrapForm.email}
                        onChange={(e) =>
                          setBootstrapForm({
                            ...bootstrapForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                      />
                      <input
                        type="tel"
                        placeholder="Direct Phone"
                        value={bootstrapForm.phone}
                        onChange={(e) =>
                          setBootstrapForm({
                            ...bootstrapForm,
                            phone: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                      />
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="Master Password (min 8 chars) *"
                        value={bootstrapForm.password}
                        onChange={(e) =>
                          setBootstrapForm({
                            ...bootstrapForm,
                            password: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
                      >
                        {authLoading
                          ? "Sending OTP via Resend..."
                          : "Send Verification OTP"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleBootstrapConfirm} className="space-y-4 text-xs">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="000000"
                        value={bootstrapForm.otp}
                        onChange={(e) =>
                          setBootstrapForm({
                            ...bootstrapForm,
                            otp: e.target.value,
                          })
                        }
                        className="w-full text-center font-mono text-2xl tracking-[0.4em] bg-neutral-50 border border-neutral-200 rounded-xl py-3.5"
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl cursor-pointer"
                      >
                        {authLoading
                          ? "Provisioning Root Node..."
                          : "Confirm OTP & Launch Admin Console"}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-900">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-neutral-900">
                      Portal Sign In
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Admin &amp; Cadet authentication secured by Turso + Resend 2FA OTP (
                      <span className="font-mono">{senderEmail}</span>).
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginStep1} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="officer@thamjj13.top"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {authLoading
                        ? "Verifying & Dispatching OTP..."
                        : "Continue with 2FA OTP"}
                    </button>
                  </form>

                  <div className="text-center pt-2 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-500">
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setActiveTab("forgot-password");
                      }}
                      className="text-neutral-700 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                    <button
                      onClick={() => {
                        setAuthError(null);
                        setActiveTab("register");
                      }}
                      className="text-neutral-900 font-semibold hover:underline cursor-pointer"
                    >
                      Cadet Enlistment →
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: 2FA OTP VERIFICATION */}
          {activeTab === "admin-otp" && (
            <motion.div
              key="admin-otp"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-16 px-4"
            >
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center mx-auto text-white">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-bold text-2xl text-neutral-900">
                    Email OTP Verification
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Enter the 6-digit verification code sent from{" "}
                    <strong>{senderEmail}</strong> to <strong>{loginEmail}</strong>.
                  </p>
                </div>

                {authNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
                    {authNotice}
                  </div>
                )}

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-900 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    {authLoading ? "Verifying Code..." : "Verify OTP & Enter Portal"}
                  </button>
                </form>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin-login")}
                    className="text-neutral-500 hover:text-neutral-900 cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={handleResendLoginOtp}
                    disabled={authLoading}
                    className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend OTP
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FORGOT PASSWORD */}
          {activeTab === "forgot-password" && (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-16 px-4"
            >
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-900">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-bold text-2xl text-neutral-900">
                    Password Recovery
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Receive a 6-digit recovery OTP from{" "}
                    <strong>{senderEmail}</strong>.
                  </p>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleResetRequest} className="space-y-4">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm cursor-pointer"
                  >
                    {authLoading ? "Sending Recovery OTP..." : "Send Recovery OTP"}
                  </button>
                </form>

                <div className="text-center text-xs">
                  <button
                    onClick={() => setActiveTab("admin-login")}
                    className="text-neutral-600 hover:underline cursor-pointer"
                  >
                    ← Return to Sign In
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* RESET PASSWORD OTP CONFIRM */}
          {activeTab === "reset-password-otp" && (
            <motion.div
              key="reset-password-otp"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-16 px-4"
            >
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                <h2 className="font-display font-bold text-2xl text-neutral-900 text-center">
                  Set New Password
                </h2>

                {resetSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    {resetSuccessMsg}
                  </div>
                )}
                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleResetConfirm} className="space-y-4">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.4em] font-mono text-xl bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm cursor-pointer"
                  >
                    {authLoading ? "Updating Password..." : "Confirm Password Reset"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* CADET REGISTRATION + EMAIL OTP VERIFICATION */}
          {activeTab === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-12 px-4"
            >
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-900">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-bold text-2xl text-neutral-900">
                    Cadet Enlistment
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Verify your email via Resend (<span className="font-mono">{senderEmail}</span>) to register in Turso.
                  </p>
                </div>

                {regSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Enlistment Verified
                    </div>
                    <p>{regSuccess}</p>
                  </div>
                )}

                {authNotice && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-mono">
                    {authNotice}
                  </div>
                )}

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {authError}
                  </div>
                )}

                {regStep === 1 ? (
                  <form onSubmit={handleRegisterRequestOtp} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase">
                        Username / Callsign *
                      </label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="cyber_cadet"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm"
                      />
                      {usernameAvailable === true && (
                        <p className="text-[11px] text-emerald-600 mt-1 font-mono">
                          ✓ Callsign available
                        </p>
                      )}
                      {usernameAvailable === false && (
                        <div className="mt-1 space-y-1">
                          <p className="text-[11px] text-red-600 font-mono">
                            ✗ Callsign taken. Suggestions:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {usernameSuggestions.map((s) => (
                              <button
                                type="button"
                                key={s}
                                onClick={() => setRegUsername(s)}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 cursor-pointer"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="cadet@domain.com"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="Phone Number *"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        required
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        placeholder="City / Country *"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Password *"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm Password *"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition cursor-pointer"
                    >
                      {authLoading
                        ? "Sending Verification OTP..."
                        : "Send Email Verification OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterConfirm} className="space-y-4">
                    <p className="text-xs text-neutral-600 text-center">
                      Enter the 6-digit verification code sent to{" "}
                      <strong>{regEmail}</strong>:
                    </p>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={regOtpInput}
                      onChange={(e) => setRegOtpInput(e.target.value)}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-neutral-50 border border-neutral-200 rounded-xl py-3.5"
                    />
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm cursor-pointer"
                    >
                      {authLoading
                        ? "Completing Enlistment..."
                        : "Verify OTP & Complete Enlistment"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-full text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
                    >
                      ← Edit Registration Details
                    </button>
                  </form>
                )}

                <div className="text-center pt-2 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500">
                    Already approved?{" "}
                    <button
                      onClick={() => setActiveTab("admin-login")}
                      className="text-neutral-900 font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* PUBLIC CERTIFICATE VERIFICATION */}
          {activeTab === "verify-cert" && (
            <motion.div
              key="verify-cert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="max-w-xl mx-auto my-16 px-4"
            >
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-luxury space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-900">
                    <Award className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-bold text-2xl text-neutral-900">
                    Credential Verification Gate
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Verify authenticity of THAMJJ13 Academy certificates against Turso.
                  </p>
                </div>

                <form onSubmit={handleVerifyCert} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={verifyingCertId}
                    onChange={(e) => setVerifyingCertId(e.target.value)}
                    placeholder="e.g. CERT-THAM-904821"
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono text-neutral-900 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={certChecking}
                    className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    {certChecking ? "Checking..." : "Verify"}
                  </button>
                </form>

                {certResult && (
                  <div
                    className={`p-5 rounded-2xl border ${
                      certResult.valid
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-red-50/70 border-red-200 text-red-900"
                    }`}
                  >
                    {certResult.valid && certResult.certificate ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>AUTHENTIC CREDENTIAL VERIFIED</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60">
                          <div>
                            <span className="text-neutral-500 block">Recipient</span>
                            <span className="font-semibold">
                              {certResult.certificate.studentName}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">Course</span>
                            <span className="font-semibold">
                              {certResult.certificate.courseTitle}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">Issued Date</span>
                            <span className="font-mono">
                              {new Date(
                                certResult.certificate.issueDate
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">
                              Verification Hash
                            </span>
                            <span className="font-mono">
                              {certResult.certificate.verificationHash}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <XCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>
                          No valid certificate found matching that ID or hash.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <LiveChatWidget
        currentSessionId={chatSessionId}
        setSessionId={setChatSessionId}
        currentUser={currentUser}
      />
    </div>
  );
}
