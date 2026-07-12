import React, { useState, useEffect } from "react";
import { 
  Shield, Globe, Terminal, Users, Play, ZoomIn, Send, 
  ChevronDown, HelpCircle, HardDrive, Phone, Mail, Facebook, 
  MapPin, Clock, ArrowRight, ShieldCheck, Database, Zap, 
  Sliders, Plus, AlertCircle, Activity, Cpu, CheckCircle2, LockIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Course, UserRole } from "../types";

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

export default function LandingPage({ courses, onNavigate, onSelectCourse }: LandingPageProps) {
  // Dynamic API state lists
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);

  // Active Hero Slide Index (for the animated hero slider)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Loading indicator for CMS data
  const [cmsLoading, setCmsLoading] = useState(true);

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
  const [contactResult, setContactResult] = useState<{ success: boolean; message: string } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  // Gallery Filters
  const [activeAlbum, setActiveAlbum] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<string | null>(null);



  useEffect(() => {
    fetchCmsData();
    generateCaptcha();
  }, []);

  const fetchCmsData = async () => {
    setCmsLoading(true);
    try {
      const [slidesRes, servicesRes, teamRes, galleryRes, faqsRes, statsRes, alliancesRes] = await Promise.all([
        fetch("/api/cms/hero-slides").then(r => r.json()).catch(() => []),
        fetch("/api/cms/services").then(r => r.json()).catch(() => []),
        fetch("/api/cms/team-members").then(r => r.json()).catch(() => []),
        fetch("/api/cms/gallery").then(r => r.json()).catch(() => []),
        fetch("/api/cms/faqs").then(r => r.json()).catch(() => []),
        fetch("/api/cms/stats").then(r => r.json()).catch(() => []),
        fetch("/api/cms/alliances").then(r => r.json()).catch(() => []),
      ]);

      const normalizedSlides = (slidesRes || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        imageUrl: s.bgImage || s.imageUrl || "",
        ctaText: s.ctaText || "Learn More",
        ctaLink: s.ctaLink || "",
      }));

      const normalizedServices = (servicesRes || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        iconName: s.icon || s.iconName || "Shield",
      }));

      const normalizedTeam = (teamRes || []).map((t: any) => ({
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
      }));

      const normalizedGallery = (galleryRes || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        category: g.category || "Operations",
        imageUrl: g.url || g.imageUrl || "",
      }));

      const normalizedFaqs = (faqsRes || []).map((f: any) => ({
        id: f.id,
        question: f.q || f.question || "",
        answer: f.a || f.answer || "",
      }));

      setHeroSlides(normalizedSlides);
      setServices(normalizedServices);
      setTeamMembers(normalizedTeam);
      setGalleryItems(normalizedGallery);
      setFaqs(normalizedFaqs);
      setStats(statsRes || []);
      setAlliances(alliancesRes || []);
    } catch (err) {
      console.error("Failed to load dynamic CMS data from database:", err);
      setHeroSlides([]);
      setServices([]);
      setStats([]);
      setAlliances([]);
    } finally {
      setCmsLoading(false);
    }
  };


  // Automated Hero Slide transition loop
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides]);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 8) + 2);
    setCaptchaNum2(Math.floor(Math.random() * 8) + 2);
    setCaptchaInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReportFormData(prev => ({
        ...prev,
        evidenceUrl: reader.result as string,
        evidenceName: file.name
      }));
      setEvidenceUploading(false);
    };
    reader.onerror = () => {
      setEvidenceUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactResult(null);

    const expected = captchaNum1 + captchaNum2;
    if (parseInt(captchaInput) !== expected) {
      setContactResult({ success: false, message: "❌ CAPTCHA verification failed. Please check the math." });
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
          message: `Case Report registered successfully! Generated Incident ID: ${data.id}. A confirmation email has been dispatched.` 
        });
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
        setContactResult({ success: false, message: "❌ " + (data.error || "Failed to submit case report.") });
      }
    } catch (err) {
      setContactResult({ success: false, message: "❌ Network gateway timed out." });
    } finally {
      setContactLoading(false);
    }
  };

  // Helper to map icon strings to actual lucide components dynamically
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

  const filteredGallery = activeAlbum === "all" 
    ? galleryItems 
    : galleryItems.filter(item => (item?.category || "").toLowerCase() === activeAlbum.toLowerCase());

  // Derive unique categories from galleryItems
  const galleryCategories = ["all", ...Array.from(new Set(galleryItems.map(item => (item?.category || "").toLowerCase()).filter(Boolean)))];

  return (
    <div className="space-y-16" id="landing_page_module">
      
      {/* 1. FULL SCREEN HERO SLIDER WITH ENTERPRISE SaaS 3D VISUALS */}
      <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-6 overflow-hidden py-20 bg-gradient-to-b from-neutral-50 via-white to-neutral-50/40 border-b border-neutral-200/50" id="hero_section">
        {/* Deep Cyber Grid Overlay & Ambient Lighting Blur */}
        <div className="absolute inset-0 cyber-grid opacity-[0.3] pointer-events-none" />
        <div className="absolute -top-40 right-10 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -left-20 -translate-y-1/2 w-[400px] h-[400px] bg-sky-200/20 rounded-full blur-[100px] pointer-events-none" />

        {heroSlides.length > 0 ? (
          <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col justify-between">
            {/* Split Grid: Left Column (SaaS messaging & transitions) - Right Column (Holographic 3D Interactive Cyber Shield) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[58vh]">
              
              {/* Left messaging column */}
              <div className="lg:col-span-7 flex flex-col justify-center space-y-8 text-left">
                <AnimatePresence mode="wait">
                  {heroSlides.map((slide, idx) => idx === currentSlideIdx && (
                    <motion.div
                      key={slide.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6"
                    >
                      {/* Active Status Badge */}
                      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-mono font-bold text-indigo-700 tracking-wider shadow-sm">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                        <span>ACTIVE ENVELOPE • SG SLA GATEWAY CONNECTED</span>
                      </div>

                      {/* Display Typography */}
                      <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6.5xl tracking-tight text-neutral-900 leading-[1.12]">
                        {slide.title}
                      </h1>

                      {/* Decoupled Light Paragraph */}
                      <p className="text-neutral-600 text-base md:text-lg font-light leading-relaxed max-w-xl">
                        {slide.subtitle}
                      </p>

                      {/* Dual CTA buttons with enterprise grade styling */}
                      <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                        <button
                          onClick={() => onNavigate("courses")}
                          className="px-7 py-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider transition-all transform hover:scale-[1.02] shadow-premium hover:shadow-luxury cursor-pointer flex items-center justify-center gap-2.5 border border-neutral-900/40"
                        >
                          <Terminal className="w-4.5 h-4.5 text-indigo-400" /> {slide.ctaText || "Enlist in Academy"}
                        </button>

                        <a
                          href="#contact_section"
                          className="px-7 py-4 rounded-xl bg-white border border-neutral-200/80 text-neutral-800 font-bold text-xs tracking-wider hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          Request Penetration SLA <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Left alignment micro metadata indicator */}
                <div className="pt-6 border-t border-neutral-200/50 flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-mono text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                    <span>LATENCY: 42MS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full" />
                    <span>ZERO-TRUST SECURED TUNNEL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-amber-500 rounded-full" />
                    <span>ISO/IEC 27001 FRAMEWORKS</span>
                  </div>
                </div>
              </div>

              {/* Right 3D Visual Column (Dynamic interactive hologram shield canvas replacement) */}
              <div className="lg:col-span-5 flex items-center justify-center relative">
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center z-10" id="holographic_shield_3d">
                  
                  {/* Outer animated rotating radial coordinates ring */}
                  <div className="absolute inset-0 rounded-full border border-neutral-200/60 border-dashed animate-spin-slow opacity-80" />
                  
                  {/* Secondary reverse-rotating grid indicator */}
                  <div className="absolute inset-8 rounded-full border border-neutral-300/40 border-double animate-spin-reverse" />
                  
                  {/* Glowing purple halo backdrop */}
                  <div className="absolute inset-12 bg-gradient-to-tr from-indigo-500/10 via-sky-500/5 to-purple-500/10 rounded-full blur-xl animate-pulse-slow" />
                  
                  {/* Radar sweep lines */}
                  <div className="absolute inset-16 rounded-full border border-indigo-500/10 overflow-hidden">
                    <div className="w-full h-1/2 bg-gradient-to-b from-indigo-500/20 via-sky-500/5 to-transparent animate-scan" />
                  </div>

                  {/* Deep glowing center core shield - Vercel/Linear feeling card */}
                  <div className="relative w-44 h-44 bg-white/90 backdrop-blur-md rounded-3xl border border-neutral-200/80 shadow-luxury flex flex-col items-center justify-center p-6 animate-float">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/40 via-white to-sky-50/40 rounded-3xl -z-10" />
                    
                    {/* Multi layered core pulse with official logo */}
                    <div className="relative mb-3.5 w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 shadow-premium flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-20 animate-ping" />
                      <img src="/src/assets/images/thamjj13_logo_1783764297314.jpg" alt="THAMJJ13 Official Logo" className="w-full h-full object-cover" />
                    </div>
                    
                    <span className="text-[11px] font-mono text-neutral-800 font-bold tracking-widest uppercase">CORE SHIELD</span>
                    <span className="text-[9px] font-mono text-emerald-500 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-2 font-bold animate-pulse">
                      ✓ ENCRYPTED
                    </span>
                  </div>

                  {/* Satellite floating interactive 3D nodes */}
                  <div className="absolute top-8 left-12 p-2.5 bg-white border border-neutral-200 rounded-xl shadow-premium hover:shadow-luxury transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center animate-bounce" style={{ animationDelay: '0.4s' }}>
                    <Terminal className="w-4 h-4 text-neutral-800" />
                  </div>
                  
                  <div className="absolute bottom-12 right-10 p-2.5 bg-neutral-950 text-white border border-neutral-900 rounded-xl shadow-luxury hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center animate-bounce" style={{ animationDelay: '1.1s' }}>
                    <LockIcon className="w-4 h-4 text-white" />
                  </div>
                  
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 p-2.5 bg-white border border-neutral-200 rounded-xl shadow-premium hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center animate-bounce" style={{ animationDelay: '1.7s' }}>
                    <Database className="w-4 h-4 text-indigo-600" />
                  </div>

                  {/* Virtual glowing connector beams */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100">
                    <line x1="22" y1="20" x2="50" y2="50" stroke="indigo" strokeWidth="0.5" strokeDasharray="2" />
                    <line x1="88" y1="72" x2="50" y2="50" stroke="indigo" strokeWidth="0.5" strokeDasharray="2" />
                    <line x1="90" y1="50" x2="50" y2="50" stroke="indigo" strokeWidth="0.5" strokeDasharray="2" />
                  </svg>
                </div>
              </div>

            </div>

            {/* Slider Dots indicators beautifully nested */}
            {heroSlides.length > 1 && (
              <div className="flex justify-center gap-3 mt-12 py-3 border-t border-neutral-100 max-w-lg mx-auto">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIdx(idx)}
                    title={slide.title}
                    className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${idx === currentSlideIdx ? "bg-neutral-950 w-10" : "bg-neutral-200 hover:bg-neutral-300 w-2.5"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Fallback Hero
          <div className="text-center max-w-3xl relative z-10 space-y-6 py-12">
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-mono tracking-widest uppercase">
              <Shield className="w-4 h-4 text-neutral-900 animate-pulse" />
              <span>SINGAPORE OPS CENTRAL • SECURED PLATFORM</span>
            </div>

            <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tight text-neutral-900 leading-tight">
              THAMJJ13 <br />
              <span className="text-neutral-500 font-light">White Hat Operations central</span>
            </h1>

            <p className="text-neutral-600 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Singapore's professional offensive security audit guild serving critical transactional systems and training student cadets in Bangladesh.
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

        {/* Dynamic Statistics Panel with Enterprise SaaS layout */}
        {stats.length > 0 && (
          <div className="mt-16 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 px-4 relative z-10" id="stats_panel">
            {stats.map((stat) => (
              <div 
                key={stat.id} 
                className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-neutral-200/80 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-luxury group relative overflow-hidden"
              >
                {/* Micro accent corner bar */}
                <div className="absolute top-0 left-0 w-1.5 h-0 bg-indigo-600 group-hover:h-full transition-all duration-300" />
                <p className="text-[10px] text-indigo-600 font-mono tracking-widest uppercase font-semibold mb-1">{stat.label}</p>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mb-1 tracking-tight group-hover:text-indigo-600 transition-colors">{stat.value}</h3>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed">{stat.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. ACHIEVEMENTS & SECURITY ALLIANCES */}
      {alliances.length > 0 && (
        <section className="py-10 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-y border-neutral-200/40 relative" id="alliance_section">
          <div className="absolute inset-0 cyber-grid opacity-[0.1] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase mb-6 font-semibold">GLOBAL COMPLIANCE • MILITARY-GRADE STANDARD ALIGNMENTS</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-14">
              {alliances.map((alliance) => (
                <div key={alliance.id} className="text-xs font-display tracking-widest text-neutral-800 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200/60 shadow-sm hover:border-neutral-300 transition-all cursor-default">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-wider text-neutral-700">{alliance.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. PROACTIVE SERVICES (FROM DB OR GRACEFUL LIGHT PLACEHOLDER) */}
      <section className="py-12 max-w-7xl mx-auto px-6" id="services_section">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <h2 className="font-display font-bold text-3xl text-neutral-900">
            Offensive & Defensive Provisions
          </h2>
          <p className="text-neutral-500 text-xs leading-relaxed">
            Offered technical parameters for digital threat defense. All provisions are coordinated through verified SLA frameworks.
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
                  <h3 className="font-display font-bold text-base text-neutral-900 leading-snug">{serv.title}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{serv.description}</p>
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
            <h4 className="text-sm font-bold text-neutral-900">No Services Available</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              No service specifications have been added to the secure datastore. Please authorize yourself as an administrator to input service blueprints.
            </p>
          </div>
        )}
      </section>



      {/* 4. MEET THE TEAM SECTION (FROM DB OR LIGHT PLACEHOLDER) */}
      <section className="py-16 bg-white border-y border-neutral-200/60" id="team_section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <h2 className="font-display font-bold text-3xl text-neutral-900">Operations Command Team</h2>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Senior defensive consultants and expert laboratory coordinates managing white hat operations.
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
                    src={member.imageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"} 
                    alt={member.name} 
                    className="w-20 h-20 rounded-full border border-neutral-200 p-1 object-cover mb-4"
                    referrerPolicy="no-referrer"
                  />
                  <h3 className="font-display font-bold text-base text-neutral-900 mb-0.5">{member.name}</h3>
                  <p className="text-xs text-neutral-500 font-mono mb-2">{member.role}</p>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1 mb-4"><MapPin className="w-3 h-3 text-neutral-400" /> {member.location}</p>
                  
                  {member.bio && (
                    <p className="text-[11px] text-neutral-500 line-clamp-3 leading-relaxed mb-4 italic">
                      "{member.bio}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 justify-center mb-6">
                    {member.badges && member.badges.map((b, idx) => (
                      <span key={idx} className="text-[9px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600 font-mono">
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* Contact Links */}
                  <div className="flex gap-4 border-t border-neutral-200 pt-4 w-full justify-center text-neutral-600">
                    {member.facebookUrl && (
                      <a href={member.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="hover:text-neutral-900 transition">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="hover:text-neutral-900 transition" title="Hotline">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-8 text-center max-w-sm mx-auto space-y-3">
              <Users className="w-8 h-8 text-neutral-400 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">Staff Registries Offline</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No Command officers have been verified in the datastore yet. Enlist yourself to configure staff credentials.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. IMAGE & ALBUMS MEDIA GALLERY (FROM DB OR LIGHT PLACEHOLDER) */}
      <section className="py-12 max-w-7xl mx-auto px-6" id="gallery_section">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="font-display font-bold text-3xl text-neutral-900 mb-1">Operations Document Library</h2>
            <p className="text-neutral-500 text-xs">Visual tracking of white-hat laboratories, seminars, and penetration summits.</p>
          </div>
          
          {galleryItems.length > 0 && (
            <div className="flex gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
              {galleryCategories.map((catItem) => {
                const cat = catItem as string;
                return (
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
                );
              })}
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
                  <span className="text-[8px] text-white/90 font-mono tracking-widest uppercase mb-0.5">{item.category}</span>
                  <h4 className="text-xs font-display font-bold text-white group-hover:underline truncate">{item.title}</h4>
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
            <h4 className="text-sm font-bold text-neutral-900">No media uploaded yet.</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              No authenticated visual reports have been loaded yet. Upload files through the secure administrative Cloudinary portal.
            </p>
          </div>
        )}

        {/* Lightbox Zoom */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
            onClick={() => setSelectedImage(null)}
          >
            <img 
              src={selectedImage} 
              alt="g-zoom" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-neutral-200"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </section>

      {/* 6. TRAINING COURSES SYSTEM ADVERTISEMENT */}
      <section className="py-16 bg-neutral-50 border-y border-neutral-200/60" id="courses_ad">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <h2 className="font-display font-bold text-3xl text-neutral-900">Training Academy Coursework</h2>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Enroll in professional hands-on lab trials. Master offsite cyber penetration testing compliant with CSA guidelines.
            </p>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {courses.slice(0, 2).map((course, cIdx) => (
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
                        <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold">{course.category}</span>
                        <span className="text-neutral-500 font-bold">{course.level}</span>
                      </div>
                      <h3 className="font-display font-bold text-base text-neutral-900">{course.title}</h3>
                      <p className="text-neutral-500 text-xs line-clamp-3 leading-relaxed">{course.description}</p>
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
              <h4 className="text-sm font-bold text-neutral-900">No courses available.</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No hacking courses are currently active in the Singapore master queue. Please check back later or configure one as an Administrator.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 7. FAQ ACCORDION (FROM DB OR LIGHT PLACEHOLDER) */}
      <section className="py-12 max-w-3xl mx-auto px-6" id="faq_section">
        <div className="text-center mb-12 space-y-3">
          <HelpCircle className="w-8 h-8 text-neutral-900 mx-auto" />
          <h2 className="font-display font-bold text-3xl text-neutral-900">Platform Inquiries</h2>
          <p className="text-neutral-500 text-xs">Standard operational procedures, security guidelines, and certificate ledger instructions.</p>
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
                  <ChevronDown className={`w-4 h-4 text-neutral-500 transform transition-transform duration-300 ${openFaq === faq.id ? "rotate-180" : ""}`} />
                </button>
                {openFaq === faq.id && (
                  <div className="px-6 pb-5 pt-1.5 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 bg-neutral-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center max-w-sm mx-auto space-y-3">
            <HelpCircle className="w-8 h-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-900">No FAQ Elements Active</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Frequently asked queries have not been initialized. Authenticate as an admin to upload query resources.
            </p>
          </div>
        )}
      </section>

      {/* 8. CONTACT TRANSMISSION TERMINAL FORM */}
      <section className="py-16 bg-white border-y border-neutral-200/60" id="contact_section">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase font-bold">TRANSMIT INCIDENT PROMPT</span>
              <h2 className="font-display font-bold text-3xl text-neutral-900">Secure Dispatch Node</h2>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Establish a verified dispatch connection. All incident tickets are reviewed under Strict zero-trust protocols by our active Singapore coordinators.
              </p>
            </div>

            <div className="space-y-5 text-xs text-neutral-700">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Singapore/Bangladesh Hotlines</h4>
                  <p className="text-neutral-500 font-mono text-[11px] mt-1">Singapore Hub: 09638233943</p>
                  <p className="text-neutral-500 font-mono text-[11px]">Bangladesh Line: +65 09638233943</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Electronic Communication Hub</h4>
                  <p className="text-neutral-500 font-mono text-[11px] mt-1">thamjj13@gmail.com</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Operational Coordinates</h4>
                  <p className="text-neutral-500 text-[11px] mt-1">SLA Marina Bay HQ, Singapore</p>
                  <p className="text-neutral-500 text-[11px]">White Hat Command Node, Dhaka, Bangladesh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Case Report form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleContactSubmit} className="bg-neutral-50 p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-5" id="incident_contact_form">
              <div className="space-y-1">
                <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">CITIZEN GATEWAY NODE</span>
                <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-200 pb-3">
                  <Terminal className="w-5 h-5 text-neutral-800" /> Report a Case / Send a Report
                </h3>
              </div>

              {contactResult && (
                <div className={`p-4 rounded-xl text-xs font-mono border ${
                  contactResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {contactResult.message}
                </div>
              )}

              {/* Complainant personal details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={reportFormData.fullName}
                    onChange={e => setReportFormData({ ...reportFormData, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    required
                    value={reportFormData.email}
                    onChange={e => setReportFormData({ ...reportFormData, email: e.target.value })}
                    placeholder="e.g. name@example.com"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">PHONE NUMBER *</label>
                  <input
                    type="tel"
                    required
                    value={reportFormData.phone}
                    onChange={e => setReportFormData({ ...reportFormData, phone: e.target.value })}
                    placeholder="e.g. 09638233943"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">CATEGORY OF CRIME / INCIDENT *</label>
                  <select
                    value={reportFormData.category}
                    onChange={e => setReportFormData({ ...reportFormData, category: e.target.value })}
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
                <label className="text-[10px] text-neutral-500 font-mono font-bold">ADDRESS *</label>
                <input
                  type="text"
                  required
                  value={reportFormData.address}
                  onChange={e => setReportFormData({ ...reportFormData, address: e.target.value })}
                  placeholder="Street Address, City, Country"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              {/* Incident details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">INCIDENT DATE & TIME *</label>
                  <input
                    type="datetime-local"
                    required
                    value={reportFormData.incidentDateTime}
                    onChange={e => setReportFormData({ ...reportFormData, incidentDateTime: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">INCIDENT LOCATION *</label>
                  <input
                    type="text"
                    required
                    value={reportFormData.incidentLocation}
                    onChange={e => setReportFormData({ ...reportFormData, incidentLocation: e.target.value })}
                    placeholder="IP / Domain / Physical Location"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-mono font-bold">DETAILED DESCRIPTION *</label>
                <textarea
                  required
                  rows={4}
                  value={reportFormData.description}
                  onChange={e => setReportFormData({ ...reportFormData, description: e.target.value })}
                  placeholder="Please describe what transpired, system impacts, any logs or accused identifiers..."
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">WITNESS INFORMATION (OPTIONAL)</label>
                  <input
                    type="text"
                    value={reportFormData.witnessInfo}
                    onChange={e => setReportFormData({ ...reportFormData, witnessInfo: e.target.value })}
                    placeholder="Witness names, contact numbers, email"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                {/* Evidence Drag-and-Drop / File Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-mono font-bold">EVIDENCE UPLOAD (PDF, IMAGES, DOCS)</label>
                  <div className="relative border border-dashed border-neutral-300 bg-white rounded-xl p-3 text-center hover:border-neutral-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.mp4"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="text-neutral-500 text-[10px]">
                        {evidenceUploading ? "Analyzing file..." : reportFormData.evidenceName ? `✓ ${reportFormData.evidenceName}` : "Drag & drop or Click to upload evidence"}
                      </span>
                    </div>
                  </div>
                  {reportFormData.evidenceUrl && (
                    <div className="flex items-center justify-between mt-1 text-[9px] text-neutral-500 font-mono">
                      <span>File attached successfully</span>
                      <button 
                        type="button" 
                        onClick={() => setReportFormData(prev => ({ ...prev, evidenceUrl: "", evidenceName: "" }))}
                        className="text-red-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* CAPTCHA challenge */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-neutral-900 animate-pulse" />
                  <div>
                    <h4 className="text-xs text-neutral-900 font-mono font-bold">CRYPTO CHALLENGE</h4>
                    <p className="text-[9px] text-neutral-400">Calculate sum to authenticate packet signature</p>
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
                    onChange={e => setCaptchaInput(e.target.value)}
                    className="w-20 bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 text-center font-mono focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={contactLoading || evidenceUploading}
                className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider text-xs transition duration-200 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {contactLoading ? "ESTABLISHING DISPATCH TRANSMISSION..." : "SUBMIT OFFICIAL INCIDENT REPORT"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 9. ULTRA PREMIUM LIGHT FOOTER */}
      <footer className="bg-neutral-50 border-t border-neutral-200 pt-16 pb-12 text-xs text-neutral-500" id="premium_footer">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: THAMJJ13 branding */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-900 rounded-lg text-white">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <span className="font-display font-bold text-base text-neutral-900 tracking-wider">THAMJJ13</span>
            </div>
            <p className="leading-relaxed">
              White Hat Hacker Command Team. Guarding enterprise grids, financial transactional routes, and providing academy coursework across Singapore & Bangladesh.
            </p>
            <div className="flex gap-2">
              <a href="https://www.facebook.com/thamjj13" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 transition">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="mailto:thamjj13@gmail.com" className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 transition">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">Operations Map</h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><button onClick={() => onNavigate("landing")} className="hover:text-neutral-900 transition">Home Central</button></li>
              <li><button onClick={() => onNavigate("courses")} className="hover:text-neutral-900 transition">Hacking Academy</button></li>
              <li><button onClick={() => onNavigate("student-dashboard")} className="hover:text-neutral-900 transition">Cadet Dashboard</button></li>
              <li><button onClick={() => onNavigate("admin-login")} className="hover:text-neutral-900 transition">Portal Login</button></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">Contact Nodes</h4>
            <ul className="space-y-2 text-[11px] font-mono">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-neutral-800" /> 09638233943</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-neutral-800" /> thamjj13@gmail.com</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-800" /> Marina Bay, Singapore</li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-neutral-950 uppercase tracking-widest text-[10px]">Security Broadcast</h4>
            <p>Subscribe to receive Singapore-Bangladesh threat intelligence digests.</p>
            
            {newsletterSubscribed ? (
              <div className="p-3 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded-xl font-mono text-center font-bold">
                ✓ Enrolled in Broadcasts
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@corporation.com"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <button
                  onClick={() => {
                    if (newsletterEmail.trim()) setNewsletterSubscribed(true);
                  }}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-neutral-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-neutral-400 text-[10px] font-mono">
          <p>© {new Date().getFullYear()} THAMJJ13. Engineered in Singapore under strict CSA frameworks serving Bangladesh.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-900 transition">Rules of Engagement</a>
            <a href="#" className="hover:text-slate-900 transition">Vulnerabilities Protocol</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
