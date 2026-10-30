import React, { useState, useEffect } from "react";
import {
  Shield,
  Globe,
  Terminal,
  Users,
  ZoomIn,
  Send,
  ChevronDown,
  HelpCircle,
  HardDrive,
  Phone,
  Mail,
  Facebook,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Database,
  Zap,
  Sliders,
  AlertCircle,
  LockIcon,
  Search,
  Download,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import { Course, Report } from "../types";
import thamLogo from "../assets/images/thamjj13_logo_1783764297314.jpg";

interface LandingPageProps {
  courses: Course[];
  onNavigate: (tab: string) => void;
  onSelectCourse: (course: Course) => void;
}

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  location: string;
  imageUrl: string;
  bio: string;
  facebookUrl?: string;
  email?: string;
  phone?: string;
  badges: string[];
}

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Stat {
  id: string;
  label: string;
  value: string;
  description: string;
}

interface Alliance {
  id: string;
  name: string;
}

export default function LandingPage({
  courses,
  onNavigate,
  onSelectCourse,
}: LandingPageProps) {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Dispatch Node Tabs: "report" | "track" | "inquiry"
  const [dispatchMode, setDispatchMode] = useState<"report" | "track" | "inquiry">("report");

  // Case Report Form State
  const [reportFormData, setReportFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    incidentDateTime: "",
    incidentLocation: "",
    category: "Phishing/Social Engineering",
    description: "",
    witnessInfo: "",
    evidenceUrl: "",
    evidenceName: "",
  });
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaNum1, setCaptchaNum1] = useState(4);
  const [captchaNum2, setCaptchaNum2] = useState(7);
  const [contactResult, setContactResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  // Public Case Tracking State
  const [trackId, setTrackId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackedReport, setTrackedReport] = useState<Report | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Direct Compliance Contact Inquiry State
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Gallery Filters
  const [activeAlbum, setActiveAlbum] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetchCmsData();
    generateCaptcha();
  }, []);

  const fetchCmsData = async () => {
    try {
      const [
        slidesRes,
        servicesRes,
        teamRes,
        galleryRes,
        faqsRes,
        statsRes,
        alliancesRes,
      ] = await Promise.all([
        fetch("/api/cms/hero-slides").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/services").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/team-members").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/gallery").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/faqs").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/stats").then((r) => r.json()).catch(() => []),
        fetch("/api/cms/alliances").then((r) => r.json()).catch(() => []),
      ]);

      setHeroSlides(
        (slidesRes || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          imageUrl: s.bgImage || s.imageUrl || "",
          ctaText: s.ctaText || "Explore Academy",
          ctaLink: s.ctaLink || "",
        }))
      );

      setServices(
        (servicesRes || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          iconName: s.icon || s.iconName || "Shield",
        }))
      );

      setTeamMembers(
        (teamRes || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          location: t.location,
          imageUrl: t.avatar || t.imageUrl || "",
          bio: t.bio || "",
          facebookUrl: t.facebookUrl || "",
          email: t.email || "",
          phone: t.phone || "",
          badges: Array.isArray(t.badges) ? t.badges : [],
        }))
      );

      setGalleryItems(
        (galleryRes || []).map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category || "Operations",
          imageUrl: g.url || g.imageUrl || "",
        }))
      );

      setFaqs(
        (faqsRes || []).map((f: any) => ({
          id: f.id,
          question: f.q || f.question || "",
          answer: f.a || f.answer || "",
        }))
      );

      setStats(
        (statsRes || []).map((st: any) => ({
          id: st.id,
          label: st.label,
          value: st.value,
          description: st.description || st.desc || "",
        }))
      );

      setAlliances(alliancesRes || []);
    } catch (err) {
      console.error("Failed to load dynamic CMS data:", err);
    }
  };

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides]);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 8) + 2);
    setCaptchaNum2(Math.floor(Math.random() * 8) + 2);
    setCaptchaInput("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "thamjj13/evidence");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setReportFormData((prev) => ({
          ...prev,
          evidenceUrl: data.url,
          evidenceName: file.name,
        }));
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Evidence upload fallback:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setReportFormData((prev) => ({
          ...prev,
          evidenceUrl: reader.result as string,
          evidenceName: file.name,
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setEvidenceUploading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactResult(null);

    const expected = captchaNum1 + captchaNum2;
    if (parseInt(captchaInput) !== expected) {
      setContactResult({
        success: false,
        message: "❌ CAPTCHA verification failed. Please check the math.",
      });
      generateCaptcha();
      return;
    }

    setContactLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setContactResult({
          success: true,
          message: `✓ Case Report registered! Assigned Case ID: ${data.id}. A confirmation receipt has been sent from no-reply@thamjj13.top to ${data.email}.`,
        });
        setTrackId(data.id);
        setTrackEmail(data.email);
        setReportFormData({
          fullName: "",
          email: "",
          phone: "",
          address: "",
          incidentDateTime: "",
          incidentLocation: "",
          category: "Phishing/Social Engineering",
          description: "",
          witnessInfo: "",
          evidenceUrl: "",
          evidenceName: "",
        });
        generateCaptcha();
      } else {
        setContactResult({
          success: false,
          message: "❌ " + (data.error || "Failed to submit case report."),
        });
      }
    } catch {
      setContactResult({
        success: false,
        message: "❌ Network gateway timed out.",
      });
    } finally {
      setContactLoading(false);
    }
  };

  const handleTrackReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedReport(null);
    setTrackLoading(true);
    try {
      const res = await fetch("/api/reports/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: trackId, email: trackEmail }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setTrackedReport(data.report);
      } else {
        setTrackError(data.error || "Report not found.");
      }
    } catch {
      setTrackError("Failed to connect to report ledger.");
    } finally {
      setTrackLoading(false);
    }
  };

  const downloadFIRPdf = (report: Report) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("THAMJJ13 DEFENSIVE COMMAND CONTROL GATEWAY", 105, 20, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("SINGAPORE SLA HQ MARINA BAY | WHITE HAT COMMAND NODE DHAKA", 105, 26, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("OFFICIAL CRYPTOGRAPHIC FIRST INFORMATION REPORT (FIR)", 105, 33, { align: "center" });
    doc.setDrawColor(180, 180, 180);
    doc.line(15, 38, 195, 38);

    doc.setFontSize(10);
    doc.text("1. CASE CLASSIFICATION & INDEXING", 15, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`FIR Number: ${report.firNumber || "PENDING_TRIAGE"}`, 20, 52);
    doc.text(`Case Reference ID: ${report.id}`, 115, 52);
    doc.text(`Status: ${report.status}`, 20, 58);
    doc.text(`Category: ${report.category}`, 115, 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. COMPLAINANT IDENTIFICATION", 15, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Full Name: ${report.fullName}`, 20, 74);
    doc.text(`Email: ${report.email}`, 115, 74);
    doc.text(`Phone: ${report.phone}`, 20, 80);
    doc.text(`Address: ${report.address}`, 115, 80);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. INCIDENT NARRATIVE", 15, 92);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(report.description, 175);
    doc.text(lines, 20, 98);
    const yOffset = 98 + lines.length * 4.5 + 10;

    if (report.firDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("4. OFFICIAL JURISDICTION & SIGNATURE", 15, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Station: ${report.firDetails.policeStation}`, 20, yOffset + 6);
      doc.text(`Investigating Officer: ${report.firDetails.officerDetails}`, 20, yOffset + 12);
      doc.text(`Verification Code: ${report.firDetails.verificationCode || "N/A"}`, 20, yOffset + 18);
      doc.text(`Authorized Signature: ${report.firDetails.signature || "N/A"}`, 20, yOffset + 24);
    }

    doc.save(`FIR-${report.id}.pdf`);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryResult(null);
    const expected = captchaNum1 + captchaNum2;
    if (parseInt(captchaInput) !== expected) {
      setInquiryResult({
        success: false,
        message: "❌ CAPTCHA verification failed.",
      });
      generateCaptcha();
      return;
    }

    setInquiryLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inquiryForm,
          captchaAnswer: parseInt(captchaInput),
          captchaExpected: expected,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInquiryResult({
          success: true,
          message: `✓ ${data.message}`,
        });
        setInquiryForm({ name: "", email: "", phone: "", subject: "", message: "" });
        generateCaptcha();
      } else {
        setInquiryResult({
          success: false,
          message: `❌ ${data.error || "Failed to send message."}`,
        });
      }
    } catch {
      setInquiryResult({ success: false, message: "❌ Connection error." });
    } finally {
      setInquiryLoading(false);
    }
  };

  const handleNewsletterSubscribe = async () => {
    if (!newsletterEmail.trim()) return;
    setNewsletterLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      if (res.ok) {
        setNewsletterSubscribed(true);
        setNewsletterEmail("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const renderServiceIcon = (iconName: string) => {
    const name = iconName.toLowerCase();
    if (name.includes("terminal") || name.includes("code")) {
      return <Terminal className="w-5 h-5 text-neutral-900" />;
    } else if (name.includes("shield") || name.includes("lock")) {
      return <Shield className="w-5 h-5 text-neutral-900" />;
    } else if (name.includes("zap") || name.includes("bolt")) {
      return <Zap className="w-5 h-5 text-neutral-900" />;
    } else if (name.includes("database") || name.includes("server")) {
      return <Database className="w-5 h-5 text-neutral-900" />;
    } else {
      return <Globe className="w-5 h-5 text-neutral-900" />;
    }
  };

  const filteredGallery =
    activeAlbum === "all"
      ? galleryItems
      : galleryItems.filter(
          (item) => (item?.category || "").toLowerCase() === activeAlbum.toLowerCase()
        );

  const galleryCategories: string[] = [
    "all",
    ...Array.from(
      new Set<string>(
        galleryItems
          .map((item) => String(item?.category || "").toLowerCase())
          .filter(Boolean)
      )
    ),
  ];

  return (
    <div className="space-y-16" id="landing_page_module">
      {/* 1. HERO SECTION */}
      <section
        className="relative min-h-[92vh] flex flex-col justify-center items-center px-6 overflow-hidden py-20 bg-gradient-to-b from-neutral-50 via-white to-neutral-50/40 border-b border-neutral-200/50"
        id="hero_section"
      >
        <div className="absolute inset-0 cyber-grid opacity-[0.3] pointer-events-none" />
        <div className="absolute -top-40 right-10 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -left-20 -translate-y-1/2 w-[400px] h-[400px] bg-sky-200/20 rounded-full blur-[100px] pointer-events-none" />

        {heroSlides.length > 0 ? (
          <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[58vh]">
              <div className="lg:col-span-7 flex flex-col justify-center space-y-8 text-left">
                <AnimatePresence mode="wait">
                  {heroSlides.map(
                    (slide, idx) =>
                      idx === currentSlideIdx && (
                        <motion.div
                          key={slide.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-mono font-bold text-indigo-700 tracking-wider shadow-sm">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                            <span>ACTIVE ENVELOPE • TURSO EDGE &amp; CLOUDINARY CDN</span>
                          </div>

                          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight text-neutral-900 leading-[1.12]">
                            {slide.title}
                          </h1>

                          <p className="text-neutral-600 text-base md:text-lg font-light leading-relaxed max-w-xl">
                            {slide.subtitle}
                          </p>

                          <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                            <button
                              onClick={() => onNavigate("courses")}
                              className="px-7 py-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider transition-all transform hover:scale-[1.02] shadow-premium hover:shadow-luxury cursor-pointer flex items-center justify-center gap-2.5 border border-neutral-900/40"
                            >
                              <Terminal className="w-4 h-4 text-indigo-400" />{" "}
                              {slide.ctaText || "Enlist in Academy"}
                            </button>

                            <a
                              href="#contact_section"
                              className="px-7 py-4 rounded-xl bg-white border border-neutral-200/80 text-neutral-800 font-bold text-xs tracking-wider hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                              Report Incident / Track FIR{" "}
                              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                            </a>
                          </div>
                        </motion.div>
                      )
                  )}
                </AnimatePresence>

                <div className="pt-6 border-t border-neutral-200/50 flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-mono text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span>TURSO LIBSQL LEDGER</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    <span>RESEND VERIFIED DISPATCH</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span>ISO/IEC 27001 ALIGNED</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex items-center justify-center relative">
                <div
                  className="relative w-full max-w-[420px] aspect-square flex items-center justify-center z-10"
                  id="holographic_shield_3d"
                >
                  <div className="absolute inset-0 rounded-full border border-neutral-200/60 border-dashed animate-spin-slow opacity-80" />
                  <div className="absolute inset-8 rounded-full border border-neutral-300/40 border-double animate-spin-reverse" />
                  <div className="absolute inset-12 bg-gradient-to-tr from-indigo-500/10 via-sky-500/5 to-purple-500/10 rounded-full blur-xl animate-pulse-slow" />
                  <div className="absolute inset-16 rounded-full border border-indigo-500/10 overflow-hidden">
                    <div className="w-full h-1/2 bg-gradient-to-b from-indigo-500/20 via-sky-500/5 to-transparent animate-scan" />
                  </div>

                  <div className="relative w-44 h-44 bg-white/90 backdrop-blur-md rounded-3xl border border-neutral-200/80 shadow-luxury flex flex-col items-center justify-center p-6 animate-float">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/40 via-white to-sky-50/40 rounded-3xl -z-10" />
                    <div className="relative mb-3.5 w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 shadow-premium flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-20 animate-ping" />
                      <img
                        src={thamLogo}
                        alt="THAMJJ13 Official Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-800 font-bold tracking-widest uppercase">
                      CORE SHIELD
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-2 font-bold animate-pulse">
                      ✓ ENCRYPTED
                    </span>
                  </div>

                  <div
                    className="absolute top-8 left-12 p-2.5 bg-white border border-neutral-200 rounded-xl shadow-premium hover:shadow-luxury transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  >
                    <Terminal className="w-4 h-4 text-neutral-800" />
                  </div>
                  <div
                    className="absolute bottom-12 right-10 p-2.5 bg-neutral-950 text-white border border-neutral-900 rounded-xl shadow-luxury hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center animate-bounce"
                    style={{ animationDelay: "1.1s" }}
                  >
                    <LockIcon className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className="absolute top-1/2 right-0 -translate-y-1/2 p-2.5 bg-white border border-neutral-200 rounded-xl shadow-premium hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center animate-bounce"
                    style={{ animationDelay: "1.7s" }}
                  >
                    <Database className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>

            {heroSlides.length > 1 && (
              <div className="flex justify-center gap-3 mt-12 py-3 border-t border-neutral-100 max-w-lg mx-auto">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIdx(idx)}
                    title={slide.title}
                    className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                      idx === currentSlideIdx
                        ? "bg-neutral-950 w-10"
                        : "bg-neutral-200 hover:bg-neutral-300 w-2.5"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center max-w-3xl relative z-10 space-y-6 py-12">
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-mono tracking-widest uppercase">
              <Shield className="w-4 h-4 text-neutral-900 animate-pulse" />
              <span>SINGAPORE OPS CENTRAL • SECURED PLATFORM</span>
            </div>
            <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tight text-neutral-900 leading-tight">
              THAMJJ13 <br />
              <span className="text-neutral-500 font-light">White Hat Operations Central</span>
            </h1>
            <p className="text-neutral-600 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Enterprise offensive security guild protecting critical infrastructure and training cyber cadets across Singapore and Bangladesh.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <button
                onClick={() => onNavigate("courses")}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" /> Open Hacking Academy
              </button>
              <a
                href="#contact_section"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-bold text-xs tracking-wider transition flex items-center justify-center gap-2"
              >
                Report a Case <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {stats.length > 0 && (
          <div
            className="mt-16 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 px-4 relative z-10"
            id="stats_panel"
          >
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-neutral-200/80 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-luxury group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-0 bg-indigo-600 group-hover:h-full transition-all duration-300" />
                <p className="text-[10px] text-indigo-600 font-mono tracking-widest uppercase font-semibold mb-1">
                  {stat.label}
                </p>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mb-1 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {stat.value}
                </h3>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. ALLIANCES */}
      {alliances.length > 0 && (
        <section
          className="py-10 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-y border-neutral-200/40 relative"
          id="alliance_section"
        >
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase mb-6 font-semibold">
              GLOBAL COMPLIANCE • ENTERPRISE SECURITY ALIGNMENTS
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-14">
              {alliances.map((alliance) => (
                <div
                  key={alliance.id}
                  className="text-xs font-display tracking-widest text-neutral-800 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200/60 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-[11px] font-bold tracking-wider text-neutral-700">
                    {alliance.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. SERVICES */}
      <section className="py-12 max-w-7xl mx-auto px-6" id="services_section">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <h2 className="font-display font-bold text-3xl text-neutral-900">
            Offensive &amp; Defensive Provisions
          </h2>
          <p className="text-neutral-500 text-xs leading-relaxed">
            Enterprise security testing, threat response, and zero-trust validation coordinated under signed SLAs.
          </p>
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((serv, sIdx) => (
              <motion.div
                key={serv.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: sIdx * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-neutral-200/50 shadow-premium hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-100 rounded-xl w-11 h-11 flex items-center justify-center border border-neutral-200">
                    {renderServiceIcon(serv.iconName)}
                  </div>
                  <h3 className="font-display font-bold text-base text-neutral-900 leading-snug">
                    {serv.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {serv.description}
                  </p>
                </div>
                <a
                  href="#contact_section"
                  className="mt-6 text-xs font-mono font-bold text-neutral-900 hover:underline flex items-center gap-1.5"
                >
                  Request Provision <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center max-w-md mx-auto space-y-4 shadow-sm">
            <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-900">No Services Configured</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Sign in to the Admin Console to add service offerings via the CMS Data Builder.
            </p>
          </div>
        )}
      </section>

      {/* 4. TEAM */}
      <section className="py-16 bg-white border-y border-neutral-200/60" id="team_section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <h2 className="font-display font-bold text-3xl text-neutral-900">
              Operations Command Team
            </h2>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Senior security consultants and incident commanders coordinating white-hat operations.
            </p>
          </div>

          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamMembers.map((member, mIdx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: mIdx * 0.08 }}
                  className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-200/50 shadow-premium hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center"
                >
                  <img
                    src={
                      member.imageUrl ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
                    }
                    alt={member.name}
                    className="w-20 h-20 rounded-full border border-neutral-200 p-1 object-cover mb-4"
                    referrerPolicy="no-referrer"
                  />
                  <h3 className="font-display font-bold text-base text-neutral-900 mb-0.5">
                    {member.name}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mb-2">{member.role}</p>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1 mb-4">
                    <MapPin className="w-3 h-3 text-neutral-400" /> {member.location}
                  </p>
                  {member.bio && (
                    <p className="text-[11px] text-neutral-500 line-clamp-3 leading-relaxed mb-4 italic">
                      &ldquo;{member.bio}&rdquo;
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {member.badges?.map((b, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600 font-mono"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-8 text-center max-w-sm mx-auto space-y-3">
              <Users className="w-8 h-8 text-neutral-400 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">Command Roster Protected</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Public officer profiles can be published anytime from the Admin CMS Builder.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. GALLERY */}
      <section className="py-12 max-w-7xl mx-auto px-6" id="gallery_section">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="font-display font-bold text-3xl text-neutral-900 mb-1">
              Operations Document Library
            </h2>
            <p className="text-neutral-500 text-xs">
              Visual records from white-hat laboratories, seminars, and CTF briefings hosted on Cloudinary CDN.
            </p>
          </div>

          {galleryItems.length > 0 && (
            <div className="flex gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
              {galleryCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveAlbum(cat)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold tracking-wider capitalize transition cursor-pointer ${
                    activeAlbum.toLowerCase() === cat.toLowerCase()
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {galleryItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-50"
                onClick={() => setSelectedImage(item.imageUrl)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-44 object-cover group-hover:scale-[1.03] transition duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-neutral-950/20 to-transparent p-4 flex flex-col justify-end">
                  <span className="text-[8px] text-white/90 font-mono tracking-widest uppercase mb-0.5">
                    {item.category}
                  </span>
                  <h4 className="text-xs font-display font-bold text-white group-hover:underline truncate">
                    {item.title}
                  </h4>
                </div>
                <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/80 border border-neutral-200 opacity-0 group-hover:opacity-100 transition">
                  <ZoomIn className="w-3.5 h-3.5 text-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center max-w-sm mx-auto space-y-3 shadow-sm">
            <HardDrive className="w-8 h-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-900">Media Library Ready</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Upload operational images via Cloudinary in the Admin Console CMS Builder.
            </p>
          </div>
        )}

        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Gallery preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-neutral-200"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </section>

      {/* 6. TRAINING COURSES */}
      <section className="py-16 bg-neutral-50 border-y border-neutral-200/60" id="courses_ad">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <h2 className="font-display font-bold text-3xl text-neutral-900">
              Training Academy Coursework
            </h2>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Hands-on offensive &amp; defensive security modules with verifiable MCQ certifications.
            </p>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {courses.slice(0, 4).map((course, cIdx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: cIdx * 0.1 }}
                  className="bg-white rounded-3xl overflow-hidden border border-neutral-200/50 shadow-premium hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row"
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full md:w-44 h-44 md:h-auto object-cover bg-neutral-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold">
                          {course.category}
                        </span>
                        <span className="text-neutral-500 font-bold">{course.level}</span>
                      </div>
                      <h3 className="font-display font-bold text-base text-neutral-900">
                        {course.title}
                      </h3>
                      <p className="text-neutral-500 text-xs line-clamp-3 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectCourse(course);
                        onNavigate("courses");
                      }}
                      className="mt-6 w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider font-mono transition cursor-pointer"
                    >
                      ENTER CURRICULUM ARCHIVE
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center max-w-md mx-auto space-y-3 shadow-sm">
              <Sliders className="w-8 h-8 text-neutral-400 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">No Courses Published</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Courses can be deployed via the Academy Vault in the Admin Console.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="py-12 max-w-3xl mx-auto px-6" id="faq_section">
        <div className="text-center mb-12 space-y-3">
          <HelpCircle className="w-8 h-8 text-neutral-900 mx-auto" />
          <h2 className="font-display font-bold text-3xl text-neutral-900">Platform Inquiries</h2>
          <p className="text-neutral-500 text-xs">
            Operational procedures, case reporting receipts, and certificate verification protocols.
          </p>
        </div>

        {faqs.length > 0 ? (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden transition shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full px-6 py-4.5 text-left flex justify-between items-center text-neutral-800 hover:text-neutral-950 font-display font-bold text-sm md:text-base transition cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 transform transition-transform duration-300 ${
                      openFaq === faq.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === faq.id && (
                  <div className="px-6 pb-5 pt-1.5 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 bg-neutral-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* 8. SECURE DISPATCH NODE (REPORT CASE / TRACK FIR / DIRECT INQUIRY) */}
      <section className="py-16 bg-white border-y border-neutral-200/60" id="contact_section">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase font-bold">
                VERIFIED INCIDENT &amp; DISPATCH GATEWAY
              </span>
              <h2 className="font-display font-bold text-3xl text-neutral-900">
                Secure Dispatch Node
              </h2>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Submit cyber incident reports, track live FIR status, or send compliance inquiries. Automated confirmations and status updates are delivered via Resend from <strong>no-reply@thamjj13.top</strong>.
              </p>
            </div>

            <div className="space-y-5 text-xs text-neutral-700">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Operations Hotlines</h4>
                  <p className="text-neutral-500 font-mono text-[11px] mt-1">
                    Singapore Hub: 09638233943
                  </p>
                  <p className="text-neutral-500 font-mono text-[11px]">
                    Bangladesh Line: +65 09638233943
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Official Dispatch Mail</h4>
                  <p className="text-neutral-500 font-mono text-[11px] mt-1">
                    Notifications: no-reply@thamjj13.top
                  </p>
                  <p className="text-neutral-500 font-mono text-[11px]">
                    Operations: thamjj13@gmail.com
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Operational Coordinates</h4>
                  <p className="text-neutral-500 text-[11px] mt-1">SLA Marina Bay HQ, Singapore</p>
                  <p className="text-neutral-500 text-[11px]">
                    White Hat Command Node, Dhaka, Bangladesh
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {/* Mode Switcher */}
            <div className="flex flex-wrap gap-1.5 bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDispatchMode("report")}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  dispatchMode === "report"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Report Incident
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode("track")}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  dispatchMode === "track"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Search className="w-3.5 h-3.5" /> Track Case / FIR
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode("inquiry")}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  dispatchMode === "inquiry"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Direct Inquiry
              </button>
            </div>

            {/* TAB 1: REPORT A CASE */}
            {dispatchMode === "report" && (
              <form
                onSubmit={handleContactSubmit}
                className="bg-neutral-50 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-5"
                id="incident_contact_form"
              >
                <div className="space-y-1">
                  <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    CITIZEN GATEWAY • TURSO + CLOUDINARY + RESEND
                  </span>
                  <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-200 pb-3">
                    <Terminal className="w-5 h-5 text-neutral-800" /> Report a Cyber Incident
                  </h3>
                </div>

                {contactResult && (
                  <div
                    className={`p-4 rounded-xl text-xs font-mono border ${
                      contactResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {contactResult.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={reportFormData.fullName}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, fullName: e.target.value })
                      }
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      EMAIL ADDRESS (RECEIVES RECEIPT &amp; FIR) *
                    </label>
                    <input
                      type="email"
                      required
                      value={reportFormData.email}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, email: e.target.value })
                      }
                      placeholder="e.g. name@example.com"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      PHONE NUMBER *
                    </label>
                    <input
                      type="tel"
                      required
                      value={reportFormData.phone}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, phone: e.target.value })
                      }
                      placeholder="e.g. 09638233943"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      INCIDENT CATEGORY *
                    </label>
                    <select
                      value={reportFormData.category}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, category: e.target.value })
                      }
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    >
                      <option>Phishing/Social Engineering</option>
                      <option>Ransomware Attack</option>
                      <option>Identity Theft</option>
                      <option>System Intrusion/Hack</option>
                      <option>Malware/Virus Infection</option>
                      <option>Online Financial Fraud</option>
                      <option>Intellectual Property Theft</option>
                      <option>Other / Unclassified</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">
                    ADDRESS *
                  </label>
                  <input
                    type="text"
                    required
                    value={reportFormData.address}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, address: e.target.value })
                    }
                    placeholder="Street Address, City, Country"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      INCIDENT DATE &amp; TIME *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={reportFormData.incidentDateTime}
                      onChange={(e) =>
                        setReportFormData({
                          ...reportFormData,
                          incidentDateTime: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      INCIDENT LOCATION / TARGET *
                    </label>
                    <input
                      type="text"
                      required
                      value={reportFormData.incidentLocation}
                      onChange={(e) =>
                        setReportFormData({
                          ...reportFormData,
                          incidentLocation: e.target.value,
                        })
                      }
                      placeholder="IP / Domain / Physical Location"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">
                    DETAILED DESCRIPTION *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reportFormData.description}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, description: e.target.value })
                    }
                    placeholder="Describe what transpired, affected systems, logs, or attacker indicators..."
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      WITNESS INFORMATION (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={reportFormData.witnessInfo}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, witnessInfo: e.target.value })
                      }
                      placeholder="Witness names or contacts"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-mono font-bold">
                      EVIDENCE UPLOAD (CLOUDINARY CDN)
                    </label>
                    <div className="relative border border-dashed border-neutral-300 bg-white rounded-xl p-3 text-center hover:border-neutral-400 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.mp4"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-neutral-500 text-[10px]">
                        {evidenceUploading
                          ? "Uploading to Cloudinary..."
                          : reportFormData.evidenceName
                          ? `✓ ${reportFormData.evidenceName}`
                          : "Click or drop file to attach evidence"}
                      </span>
                    </div>
                    {reportFormData.evidenceUrl && (
                      <div className="flex items-center justify-between mt-1 text-[9px] text-neutral-500 font-mono">
                        <span>Evidence staged</span>
                        <button
                          type="button"
                          onClick={() =>
                            setReportFormData((prev) => ({
                              ...prev,
                              evidenceUrl: "",
                              evidenceName: "",
                            }))
                          }
                          className="text-red-500 hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-neutral-900" />
                    <div>
                      <h4 className="text-xs text-neutral-900 font-mono font-bold">
                        SECURITY CHALLENGE
                      </h4>
                      <p className="text-[9px] text-neutral-400">
                        Verify human submission before dispatch
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-900 px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-xl">
                      {captchaNum1} + {captchaNum2} = ?
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="Sum"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="w-20 bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 text-center font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={contactLoading || evidenceUploading}
                  className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider text-xs transition duration-200 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {contactLoading
                    ? "DISPATCHING REPORT & CONFIRMATION EMAIL..."
                    : "SUBMIT OFFICIAL INCIDENT REPORT"}
                </button>
              </form>
            )}

            {/* TAB 2: TRACK CASE & DOWNLOAD FIR */}
            {dispatchMode === "track" && (
              <div className="bg-neutral-50 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
                <div className="space-y-1 border-b border-neutral-200 pb-3">
                  <span className="text-[9px] text-emerald-700 font-mono font-bold tracking-wider uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    PUBLIC FIR &amp; TRIAGE TRACKER
                  </span>
                  <h3 className="text-xl font-display font-bold text-neutral-900">
                    Track Incident Case &amp; Download Official FIR
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enter the Case Reference ID sent to your inbox from{" "}
                    <strong>no-reply@thamjj13.top</strong> along with your email address.
                  </p>
                </div>

                {trackError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-800">
                    ❌ {trackError}
                  </div>
                )}

                <form onSubmit={handleTrackReport} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Case ID (e.g. REP-123456)"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    className="md:col-span-5 bg-white border border-neutral-200 rounded-xl px-4 py-3 font-mono text-neutral-900 focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Registered Email"
                    value={trackEmail}
                    onChange={(e) => setTrackEmail(e.target.value)}
                    className="md:col-span-5 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="md:col-span-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    {trackLoading ? "..." : "Lookup"}
                  </button>
                </form>

                {trackedReport && (
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-neutral-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          CASE REFERENCE
                        </span>
                        <h4 className="font-mono font-bold text-base text-neutral-900">
                          {trackedReport.id} — {trackedReport.category}
                        </h4>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold ${
                          trackedReport.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : trackedReport.status === "REJECTED"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {trackedReport.status}
                      </span>
                    </div>

                    {trackedReport.notes && (
                      <div className="p-3.5 bg-neutral-50 border-l-4 border-neutral-900 rounded-r-xl text-xs text-neutral-700">
                        <strong className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                          Investigator Notes
                        </strong>
                        {trackedReport.notes}
                      </div>
                    )}

                    {trackedReport.status === "APPROVED" && trackedReport.firDetails && (
                      <div className="p-4 bg-neutral-900 text-white rounded-xl space-y-3 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-400 font-bold">
                            ✓ OFFICIAL FIR SIGNED: {trackedReport.firNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadFIRPdf(trackedReport)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download FIR PDF
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-300">
                          <div>Station: {trackedReport.firDetails.policeStation}</div>
                          <div>Officer: {trackedReport.firDetails.officerDetails}</div>
                          <div>Code: {trackedReport.firDetails.verificationCode}</div>
                          <div>Signature: {trackedReport.firDetails.signature}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DIRECT COMPLIANCE / SLA INQUIRY */}
            {dispatchMode === "inquiry" && (
              <form
                onSubmit={handleInquirySubmit}
                className="bg-neutral-50 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-4 text-xs"
              >
                <div className="space-y-1 border-b border-neutral-200 pb-3">
                  <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    ENTERPRISE SLA &amp; GENERAL CONTACT
                  </span>
                  <h3 className="text-xl font-display font-bold text-neutral-900">
                    Direct Security Operations Inquiry
                  </h3>
                </div>

                {inquiryResult && (
                  <div
                    className={`p-3.5 rounded-xl font-mono border ${
                      inquiryResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {inquiryResult.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Your Name / Organization *"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Corporate / Personal Email *"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Subject (e.g. VAPT Audit Request) *"
                    value={inquiryForm.subject}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none"
                  />
                </div>

                <textarea
                  required
                  rows={4}
                  placeholder="Describe your penetration testing scope, training inquiry, or compliance requirement..."
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 focus:outline-none"
                />

                <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-neutral-200">
                  <span className="font-mono font-bold text-neutral-700">
                    Challenge: {captchaNum1} + {captchaNum2} = ?
                  </span>
                  <input
                    type="number"
                    required
                    placeholder="Sum"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="w-20 border border-neutral-200 rounded-lg px-3 py-1.5 text-center font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inquiryLoading}
                  className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider cursor-pointer"
                >
                  {inquiryLoading ? "TRANSMITTING..." : "SEND DIRECT INQUIRY"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer
        className="bg-neutral-50 border-t border-neutral-200 pt-16 pb-12 text-xs text-neutral-500"
        id="premium_footer"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-900 rounded-lg text-white">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-base text-neutral-900 tracking-wider">
                THAMJJ13
              </span>
            </div>
            <p className="leading-relaxed">
              Enterprise White Hat Command Team protecting infrastructure, incident triage, and academy training across Singapore &amp; Bangladesh.
            </p>
            <div className="flex gap-2">
              <a
                href="https://www.facebook.com/thamjj13"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 transition"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="mailto:no-reply@thamjj13.top"
                className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 transition"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">
              Operations Map
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li>
                <button
                  onClick={() => onNavigate("landing")}
                  className="hover:text-neutral-900 transition cursor-pointer"
                >
                  Operations Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("courses")}
                  className="hover:text-neutral-900 transition cursor-pointer"
                >
                  Hacking Academy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("verify-cert")}
                  className="hover:text-neutral-900 transition cursor-pointer"
                >
                  Verification Gate
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("admin-login")}
                  className="hover:text-neutral-900 transition cursor-pointer"
                >
                  Portal Login
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">
              Contact Nodes
            </h4>
            <ul className="space-y-2 text-[11px] font-mono">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-800" /> 09638233943
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-800" /> no-reply@thamjj13.top
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-800" /> Marina Bay, Singapore
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">
              Security Broadcast
            </h4>
            <p>Subscribe to receive threat intelligence advisories via Resend.</p>

            {newsletterSubscribed ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-mono text-center font-bold">
                ✓ Subscribed — Confirmation Sent
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@corporation.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none"
                />
                <button
                  onClick={handleNewsletterSubscribe}
                  disabled={newsletterLoading}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-neutral-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-neutral-400 text-[10px] font-mono">
          <p>
            © {new Date().getFullYear()} THAMJJ13. Powered by Turso, Cloudinary &amp; Resend.
          </p>
          <div className="flex gap-6">
            <a href="#contact_section" className="hover:text-neutral-900 transition">
              Incident Dispatch
            </a>
            <button
              onClick={() => onNavigate("verify-cert")}
              className="hover:text-neutral-900 transition cursor-pointer"
            >
              Verify Credentials
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
