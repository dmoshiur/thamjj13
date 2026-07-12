import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Video, FileText, Upload, Award, Play, Pause, 
  Volume2, VolumeX, Maximize2, Minimize2, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, Send, Share2, ThumbsUp, Eye, ShieldCheck, 
  Download, Loader2, ArrowLeft, ExternalLink, Settings,
  Pin, Trash2, Edit2, MessageSquare, Check, CornerDownRight, Smile
} from "lucide-react";
import { motion } from "motion/react";
import { Course, Lesson, CourseVideo, Certificate, UserRole, VideoComment } from "../types";

interface CourseSystemProps {
  courses: Course[];
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course | null) => void;
  currentUser: { id: string; username: string; role: UserRole } | null;
  onNavigate: (tab: string) => void;
  setVerifyingCertId: (id: string) => void;
}

export default function CourseSystem({ 
  courses, 
  selectedCourse, 
  setSelectedCourse, 
  currentUser, 
  onNavigate,
  setVerifyingCertId
}: CourseSystemProps) {
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  
  // Custom Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState("1080p");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Comments & Interaction States
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  // Assignment states
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentUploading, setAssignmentUploading] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  // MCQ MCQ States
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [mcqResult, setMcqResult] = useState<{ score: number; passed: boolean; certificate?: Certificate } | null>(null);
  const [mcqLoading, setMcqLoading] = useState(false);

  const course = selectedCourse || courses[0];
  const activeLesson = course?.lessons[activeLessonIdx];
  const videoData = activeLesson?.video;

  useEffect(() => {
    if (videoData) {
      setComments(videoData.comments || []);
      setLikesCount(videoData.likes || 0);
      setViewsCount(videoData.views || 0);
      
      // Trigger a view increment to backend
      fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "view" }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) setViewsCount(data.video.views);
      })
      .catch(err => console.error(err));
    }
    // Reset test state when changing lessons/courses
    setMcqSubmitted(false);
    setMcqResult(null);
    setSelectedAnswers({});
    setIsPlaying(false);
  }, [activeLessonIdx, selectedCourse]);

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 max-w-md mx-auto px-6 text-center">
        <BookOpen className="w-12 h-12 text-neutral-400 stroke-1 animate-pulse" />
        <h3 className="font-display font-bold text-lg text-neutral-900">No courses available.</h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          The Academy curriculum ledger is currently empty. Please return later or log in as an administrator to deploy course modules.
        </p>
        {currentUser?.role === UserRole.SUPER_ADMIN && (
          <button
            onClick={() => onNavigate("admin-portal")}
            className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-bold transition cursor-pointer"
          >
            OPEN CURRICULUM CONTROL
          </button>
        )}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-800" />
        <p className="text-xs text-neutral-500 font-mono">LOADING ACADEMY COURSE SHELLS...</p>
      </div>
    );
  }

  // Handle Play Pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (playerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
    }
  };

  // State for replying to comments
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  
  // State for editing comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleLikeVideo = async () => {
    if (!videoData) return;
    const userId = currentUser ? currentUser.id : "anonymous-cadet";
    
    // Optimistic UI update
    const isAlreadyLiked = videoData.likedBy?.includes(userId);
    const newLikedBy = isAlreadyLiked 
      ? (videoData.likedBy || []).filter(id => id !== userId)
      : [...(videoData.likedBy || []), userId];
    
    const nextLikesCount = isAlreadyLiked 
      ? Math.max(0, likesCount - 1) 
      : likesCount + 1;
      
    setLikesCount(nextLikesCount);
    videoData.likedBy = newLikedBy;
    videoData.likes = nextLikesCount;

    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "like",
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLikesCount(data.video.likes);
        if (data.video.likedBy) {
          videoData.likedBy = data.video.likedBy;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !videoData) return;

    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "comment",
          commentText: newComment,
          author: currentUser ? currentUser.username : "White Hat Cadet",
          role: currentUser ? currentUser.role : UserRole.STUDENT,
          userId: currentUser?.id || "anonymous-cadet"
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!videoData) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "like-comment",
          commentId,
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyComment = async (commentId: string, text: string) => {
    if (!videoData || !text.trim()) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reply-comment",
          commentId,
          commentText: text,
          author: currentUser ? currentUser.username : "White Hat Cadet",
          role: currentUser ? currentUser.role : UserRole.STUDENT,
          userId: currentUser?.id || "anonymous-cadet"
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
        setReplyingToCommentId(null);
        setReplyText("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditComment = async (commentId: string, text: string) => {
    if (!videoData || !text.trim()) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "edit-comment",
          commentId,
          commentText: text,
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!videoData) return;
    if (!window.confirm("Are you sure you want to permanently delete this comment from the database?")) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delete-comment",
          commentId,
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinComment = async (commentId: string) => {
    if (!videoData) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pin-comment",
          commentId,
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHideComment = async (commentId: string) => {
    if (!videoData) return;
    try {
      const res = await fetch(`/api/courses/video/${videoData.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hide-comment",
          commentId,
          userId: currentUser?.id || "anonymous-cadet",
          role: currentUser?.role || UserRole.STUDENT
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.video.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignmentUpload = async () => {
    if (!assignmentFile) return;
    setAssignmentUploading(true);
    setAssignmentSuccess(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`/api/courses/${course.id}/lessons/${activeLesson.id}/assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser ? currentUser.id : "guest-user",
            fileName: assignmentFile.name,
            fileBase64: base64,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAssignmentSuccess("✓ TRANS_SLA SUCCESS: Log report encrypted and stored inside secure node.");
          setAssignmentFile(null);
        } else {
          setAssignmentSuccess("❌ Upload Failed: CDN storage pipeline rejected binary payload.");
        }
      } catch (err) {
        setAssignmentSuccess("❌ Upload Failed: Connection socket mismatch.");
      } finally {
        setAssignmentUploading(false);
      }
    };
    reader.readAsDataURL(assignmentFile);
  };

  const handleMcqSubmit = async () => {
    if (!course.mcqTest) return;

    if (Object.keys(selectedAnswers).length < course.mcqTest.questions.length) {
      alert("Please answer all questions before submitting your ethical audit!");
      return;
    }

    setMcqLoading(true);
    try {
      const answersArray = course.mcqTest.questions.map((_, idx) => selectedAnswers[idx]);
      const res = await fetch(`/api/courses/${course.id}/submit-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser ? currentUser.id : "guest-student",
          studentName: currentUser ? currentUser.username : "Certified Hacking Cadet",
          answers: answersArray,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMcqResult(data);
        setMcqSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMcqLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans" 
      id="course_system_module"
    >
      
      {/* Course Heading Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCourse(null)} 
            className="p-2.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-neutral-900 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase font-bold">{course.category} • {course.level}</span>
            <h1 className="font-display font-bold text-lg md:text-xl text-neutral-950 mt-0.5">{course.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-[11px] font-bold">
          <BookOpen className="w-4 h-4" />
          <span>{activeLessonIdx + 1} / {course.lessons.length} LESSONS INDEXED</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side */}
        <div className="lg:col-span-8 space-y-6">
          {videoData ? (
            <div 
              ref={playerRef}
              className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 shadow-sm group flex items-center justify-center"
              id="custom_video_player"
            >
              <video
                ref={videoRef}
                src={videoData.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                className="w-full h-full object-contain"
              />

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 z-10 text-white">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="bg-neutral-950/80 px-2.5 py-1 rounded border border-white/10">{videoData.title}</span>
                  <span className="text-white bg-neutral-800 border border-white/10 px-2 py-0.5 rounded text-[9px] font-bold">SECURE PIPELINE STREAM</span>
                </div>

                {!isPlaying && (
                  <button 
                    onClick={togglePlay}
                    className="self-center p-5 rounded-full bg-white text-neutral-950 shadow-md hover:scale-105 transition duration-200 cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-neutral-950 text-neutral-950 translate-x-0.5" />
                  </button>
                )}

                {/* Bottom Control Bar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleProgressChange}
                      className="flex-1 accent-white h-1 rounded-lg bg-white/20 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono">{formatTime(duration)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button onClick={togglePlay} className="hover:text-neutral-200 transition cursor-pointer">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>

                      <div className="flex items-center gap-2">
                        <button onClick={toggleMute} className="hover:text-neutral-200 transition cursor-pointer">
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 accent-white h-1 bg-white/20 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="relative">
                        <button 
                          onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                          className="flex items-center gap-1 text-neutral-300 hover:text-white cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" /> {quality}
                        </button>
                        {showQualityMenu && (
                          <div className="absolute bottom-8 right-0 bg-neutral-900 border border-white/10 rounded-xl p-1.5 space-y-1 shadow-2xl z-20">
                            {["1080p", "720p", "480p"].map(q => (
                              <button 
                                key={q} 
                                onClick={() => { setQuality(q); setShowQualityMenu(false); }}
                                className={`block w-full text-left px-3 py-1 rounded hover:bg-neutral-800 text-[10px] ${quality === q ? "text-white font-bold" : "text-neutral-400"}`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button 
                          onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}
                          className="text-neutral-300 hover:text-white cursor-pointer"
                        >
                          {playbackSpeed}x Speed
                        </button>
                        {showSpeedMenu && (
                          <div className="absolute bottom-8 right-0 bg-neutral-900 border border-white/10 rounded-xl p-1.5 space-y-1 shadow-2xl z-20">
                            {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                              <button 
                                key={speed} 
                                onClick={() => handleSpeedSelect(speed)}
                                className={`block w-full text-left px-4 py-1 rounded hover:bg-neutral-800 text-[10px] ${playbackSpeed === speed ? "text-white font-bold" : "text-neutral-400"}`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button onClick={handleFullscreen} className="hover:text-white transition cursor-pointer">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-white border border-neutral-200/80 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-sm">
              <BookOpen className="w-12 h-12 text-neutral-800 animate-pulse" />
              <h3 className="text-base font-display font-bold text-neutral-950">No videos available.</h3>
              <p className="text-neutral-500 text-xs max-w-sm leading-relaxed">This module does not contain any recorded lecture streams.</p>
            </div>
          )}

          {/* Views stats */}
          {videoData && (
            <div className="flex flex-wrap justify-between items-center p-4 bg-white rounded-2xl border border-neutral-200/80 text-xs text-neutral-500 gap-4 shadow-sm">
              <div className="flex gap-6 items-center">
                <span className="flex items-center gap-1.5 font-mono"><Eye className="w-4 h-4" /> {viewsCount} Views</span>
                <button onClick={handleLikeVideo} className="flex items-center gap-1.5 hover:text-neutral-900 text-neutral-500 transition cursor-pointer">
                  <ThumbsUp className="w-4 h-4 text-neutral-900" /> {likesCount} Likes
                </button>
              </div>
              <span className="font-mono text-[9px] bg-neutral-100 text-neutral-600 px-3 py-1.5 rounded border border-neutral-200 font-bold">
                TRANS_SLA HASH: sha256_e4c9f18a2d
              </span>
            </div>
          )}

          {/* Syllabus PDF & homework */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-6 shadow-sm">
            <h2 className="font-display font-bold text-sm text-neutral-950 border-b border-neutral-100 pb-3 flex items-center gap-2 uppercase tracking-wider">
              <FileText className="w-5 h-5 text-neutral-900" /> Lesson Support Materials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Note download */}
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-display font-bold text-neutral-900 uppercase">Syllabus Guidelines & PDF Notes</h3>
                  <p className="text-neutral-500 text-[11px] mt-1 leading-relaxed">Review the certified hacking cheatsheet containing custom scripts.</p>
                </div>
                {activeLesson.pdfUrl ? (
                  <a 
                    href={activeLesson.pdfUrl} 
                    download={activeLesson.pdfName || "lesson_notes.pdf"}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-white" /> DOWNLOAD NOTE ({activeLesson.pdfName})
                  </a>
                ) : (
                  <div className="p-3 bg-white border border-neutral-200 rounded-xl text-center text-[10px] text-neutral-400 font-mono">
                    Direct transcript is only shown in active video.
                  </div>
                )}
              </div>

              {/* Secure Homework Upload */}
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-display font-bold text-neutral-900 uppercase">Secure Practice Submissions</h3>
                  <p className="text-neutral-500 text-[11px] mt-1 leading-relaxed">Execute task and upload final log report directly to storage CDN.</p>
                </div>
                
                {assignmentSuccess && (
                  <p className="text-[10px] font-mono text-neutral-900 font-bold leading-tight">{assignmentSuccess}</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="file"
                    id="homework_input"
                    className="hidden"
                    onChange={e => setAssignmentFile(e.target.files?.[0] || null)}
                  />
                  <button
                    onClick={() => document.getElementById("homework_input")?.click()}
                    className="flex-1 py-2.5 rounded-xl bg-white border border-neutral-200 text-[11px] text-neutral-700 font-mono shadow-sm cursor-pointer"
                  >
                    {assignmentFile ? assignmentFile.name : "Select File"}
                  </button>

                  <button
                    onClick={handleAssignmentUpload}
                    disabled={!assignmentFile || assignmentUploading}
                    className="p-2.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
                  >
                    {assignmentUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MCQ EXAM MODULE */}
          {course.mcqTest && (
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-6 shadow-sm" id="exam_terminal">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                <Award className="w-6 h-6 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-display font-bold text-neutral-950 uppercase tracking-wider">Course MCQ Audit Exam</h2>
                  <p className="text-neutral-500 text-xs">Verify your knowledge to auto-generate a verifiable cryptographic certification badge.</p>
                </div>
              </div>

              {!mcqSubmitted ? (
                <div className="space-y-6">
                  {course.mcqTest.questions.map((q, qIdx) => (
                     <div key={q.id} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                       <h4 className="text-[9px] font-mono text-neutral-400 font-bold">QUESTION 0{qIdx + 1}</h4>
                       <p className="text-xs font-display font-bold text-neutral-950">{q.question}</p>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                         {q.options.map((opt, optIdx) => (
                           <button
                             key={optIdx}
                             onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                             className={`p-3 rounded-xl text-xs text-left font-mono transition border cursor-pointer ${
                               selectedAnswers[qIdx] === optIdx
                                 ? "bg-neutral-950 border-neutral-950 text-white font-bold"
                                 : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600"
                             }`}
                           >
                             {opt}
                           </button>
                         ))}
                       </div>
                     </div>
                  ))}

                  <button
                    onClick={handleMcqSubmit}
                    disabled={mcqLoading}
                    className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold tracking-wider text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {mcqLoading ? "ANALYZING MULTIPLE CHOICE MATRIX..." : "SUBMIT EXAM FOR VERIFICATION"}
                  </button>
                </div>
              ) : (
                mcqResult && (
                  <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-6 animate-fadeIn">
                    {mcqResult.passed ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-950 mx-auto flex items-center justify-center border border-neutral-200">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-display font-bold text-neutral-950 uppercase tracking-wide">CONGRATULATIONS CADET!</h3>
                          <p className="text-neutral-800 text-xs font-mono mt-1 font-bold">Audit Score: {mcqResult.score} / {mcqResult.total} (PASSED)</p>
                          <p className="text-neutral-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">Your identity has been verified on our ledger database. The certificate shown below has been generated.</p>
                        </div>

                        {mcqResult.certificate && (
                          <div className="p-8 max-w-2xl mx-auto rounded-2xl bg-white border border-neutral-200 text-left relative overflow-hidden shadow-sm space-y-8" id="verifiable_cert_card">
                            <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-neutral-900" />
                                <span className="font-display font-bold text-xs tracking-wider text-neutral-950 uppercase">THAMJJ13 SYSTEM</span>
                              </div>
                              <span className="text-[8px] font-mono bg-neutral-100 border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded font-bold">
                                SERIAL: {mcqResult.certificate.id}
                              </span>
                            </div>

                            <div className="space-y-3 text-center py-6">
                              <h2 className="text-neutral-400 text-[10px] font-mono tracking-widest uppercase font-bold">CERTIFICATE OF ETHICAL ACHIEVEMENT</h2>
                              <h1 className="text-2xl font-display font-bold text-neutral-950">{mcqResult.certificate.studentName}</h1>
                              <p className="text-xs text-neutral-500 max-w-lg mx-auto leading-relaxed">
                                is designated a Certified White Hat expert, having completed all syllabus lessons and verified compliance scoring metrics for:
                              </p>
                              <h3 className="text-sm font-display font-bold text-neutral-950 bg-neutral-100 py-1.5 px-3 rounded inline-block">{mcqResult.certificate.courseTitle}</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-neutral-100 gap-6">
                              <div className="text-[10px] font-mono space-y-1 text-neutral-500">
                                <p><strong>ISSUED BY:</strong> {mcqResult.certificate.issuedBy}</p>
                                <p><strong>DATE:</strong> {mcqResult.certificate.issuedAt}</p>
                                <p className="text-neutral-950 font-bold"><strong>REGISTRY:</strong> SECURE TRANS_GATE</p>
                              </div>

                              <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                                <div className="w-12 h-12 bg-white p-1 rounded-lg border border-neutral-200 flex items-center justify-center">
                                  <div className="w-full h-full bg-neutral-950 rounded flex items-center justify-center text-[7px] font-bold text-white text-center uppercase p-0.5 leading-none font-mono">
                                    QR HASH
                                  </div>
                                </div>
                                <div className="text-left">
                                  <h4 className="text-[10px] font-bold text-neutral-950">VERIFICATION HASH</h4>
                                  <p className="text-[9px] text-neutral-400 leading-tight">Verify certificate legitimacy on regulatory ledger</p>
                                  <button
                                    onClick={() => {
                                      setVerifyingCertId(mcqResult.certificate!.id);
                                      onNavigate("verify-cert");
                                    }}
                                    className="mt-1 text-[9px] text-neutral-950 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                  >
                                    Verify Gateway <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-800 mx-auto flex items-center justify-center border border-neutral-200">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-display font-bold text-neutral-950 uppercase">AUDIT MISMATCH: RESUBMIT RECOMMENDED</h3>
                          <p className="text-neutral-800 font-mono text-xs mt-1 font-bold">Audit Score: {mcqResult.score} / {mcqResult.total} (FAILED)</p>
                          <p className="text-neutral-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">Passing this MCQ requires answering at least {course.mcqTest.passingScore} questions correctly. Please review the port scanning guides and retake.</p>
                        </div>
                        <button
                          onClick={() => {
                            setMcqSubmitted(false);
                            setMcqResult(null);
                            setSelectedAnswers({});
                          }}
                          className="px-6 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white font-bold cursor-pointer hover:bg-neutral-800"
                        >
                          RESET SYSTEM & RETAKE TEST
                        </button>
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Discussion */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-6 shadow-sm">
            <h3 className="font-display font-bold text-sm text-neutral-950 border-b border-neutral-100 pb-3 flex items-center justify-between uppercase tracking-wider">
              <span className="flex items-center gap-1.5">Threat Discussion Center ({comments.length})</span>
              <span className="text-[10px] text-neutral-400 font-mono font-normal">Real-Time Database Nodes</span>
            </h3>
            
            {/* Main Input Box with Emoji Tray */}
            <div className="space-y-3">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your public security inquiry or query here..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
                />
                <button
                  type="submit"
                  className="px-5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              
              {/* Easy Emojis */}
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1"><Smile className="w-3.5 h-3.5 text-neutral-400" /> Quick reactions:</span>
                {["👍", "❤️", "🔥", "😮", "😂", "💻", "🛡️", "🚀"].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => setNewComment(prev => prev + emoji)}
                    className="p-1 hover:bg-neutral-100 rounded text-xs transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-100">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-neutral-400 py-6 font-mono">Be the first to comment.</p>
              ) : (
                comments.map((comment) => {
                  const isPinned = comment.pinned;
                  const isHidden = comment.hidden;
                  const isAuthor = comment.authorId === (currentUser?.id || "anonymous-cadet");
                  const isAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "SECONDARY_ADMIN";
                  
                  // If hidden and not admin, do not render fully
                  if (isHidden && !isAdmin) {
                    return (
                      <div key={comment.id} className="p-3 bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200 text-center">
                        <span className="text-[10px] font-mono text-neutral-400 italic">🛡️ This incident discussion node has been moderated by security board.</span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={comment.id} 
                      className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                        isPinned 
                          ? "bg-amber-50/40 border-amber-200/80 shadow-sm" 
                          : isHidden
                          ? "bg-red-50/20 border-red-200/60 opacity-75"
                          : "bg-neutral-50 border-neutral-200/60"
                      }`}
                    >
                      {/* Comment Top bar */}
                      <div className="flex gap-4 items-start">
                        <img 
                          src={comment.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                          alt="avatar" 
                          className="w-9 h-9 rounded-full object-cover border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-bold text-neutral-900 flex items-center gap-1">
                                {comment.author} 
                                <span className="text-[9px] text-neutral-500 font-mono font-normal">({comment.authorRole})</span>
                              </span>
                              {isPinned && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-mono rounded flex items-center gap-0.5 uppercase font-bold">
                                  <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                                </span>
                              )}
                              {isHidden && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[8px] font-mono rounded uppercase font-bold">
                                  Moderated
                                </span>
                              )}
                            </div>
                            <span className="text-neutral-400 font-mono">{new Date(comment.timestamp).toLocaleDateString()}</span>
                          </div>

                          {/* Comment Content / Edit Mode */}
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2 mt-1">
                              <input 
                                type="text"
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400"
                              />
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => handleEditComment(comment.id, editText)}
                                  className="px-2.5 py-1 bg-neutral-900 text-white font-bold rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button 
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-2.5 py-1 bg-white border border-neutral-200 text-neutral-600 rounded text-[10px] font-mono cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Comment Actions row */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/30 text-[10px] text-neutral-500">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleLikeComment(comment.id)}
                            className="flex items-center gap-1.5 hover:text-neutral-900 transition font-mono cursor-pointer text-left"
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${comment.likedBy?.includes(currentUser?.id || "") ? "text-neutral-950 fill-current" : ""}`} />
                            <span>{comment.likes || 0}</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id);
                              setReplyText("");
                            }}
                            className="flex items-center gap-1 hover:text-neutral-900 transition font-mono cursor-pointer text-left"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>

                          {(isAuthor || isAdmin) && (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditText(comment.content);
                                }}
                                className="flex items-center gap-1 hover:text-neutral-900 transition font-mono cursor-pointer text-left"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="flex items-center gap-1 hover:text-red-600 transition font-mono text-neutral-400 cursor-pointer text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hover:text-red-600">Delete</span>
                              </button>
                            </>
                          )}
                        </div>

                        {/* Admin Extra Actions */}
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handlePinComment(comment.id)}
                              className={`px-2 py-0.5 border rounded text-[9px] font-mono cursor-pointer flex items-center gap-0.5 transition ${
                                isPinned 
                                  ? "bg-amber-100 border-amber-300 text-amber-800" 
                                  : "bg-white border-neutral-200 hover:bg-neutral-50"
                              }`}
                            >
                              <Pin className="w-2.5 h-2.5" />
                              {isPinned ? "Unpin" : "Pin"}
                            </button>
                            
                            <button 
                              onClick={() => handleHideComment(comment.id)}
                              className={`px-2 py-0.5 border rounded text-[9px] font-mono cursor-pointer flex items-center gap-0.5 transition ${
                                isHidden 
                                  ? "bg-red-100 border-red-300 text-red-800" 
                                  : "bg-white border-neutral-200 hover:bg-neutral-50"
                              }`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {isHidden ? "Show" : "Moderate"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Comment Nested Replies input & list */}
                      {replyingToCommentId === comment.id && (
                        <div className="pl-6 border-l-2 border-neutral-200 space-y-3 pt-2">
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Post a secure incident response..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
                            />
                            <button 
                              onClick={() => handleReplyComment(comment.id, replyText)}
                              className="px-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-xs font-mono cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                          
                          {/* Reply quick reactions */}
                          <div className="flex gap-1 items-center">
                            {["👍", "❤️", "🛡️", "💻"].map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => setReplyText(prev => prev + emoji)}
                                className="p-0.5 hover:bg-neutral-100 rounded text-xs cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Display replies loop */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-6 border-l-2 border-neutral-200 space-y-3 pt-2 mt-2">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-neutral-200/40">
                              <img 
                                src={reply.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                                alt="avatar" 
                                className="w-7 h-7 rounded-full object-cover border border-neutral-100"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 space-y-0.5">
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="font-display font-bold text-neutral-900">
                                    {reply.author} <span className="text-neutral-400 font-mono">({reply.authorRole})</span>
                                  </span>
                                  <span className="text-neutral-400 font-mono">{new Date(reply.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-neutral-600 leading-relaxed">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Syllabus column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-4 shadow-sm">
            <h3 className="font-display font-bold text-sm text-neutral-950 border-b border-neutral-100 pb-3 flex items-center gap-2 uppercase tracking-wider">
              <Video className="w-5 h-5 text-neutral-950" /> Syllabus Modules
            </h3>

            <div className="space-y-3">
              {course.lessons.map((les, idx) => (
                <button
                  key={les.id}
                  onClick={() => setActiveLessonIdx(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-3.5 relative cursor-pointer ${
                    activeLessonIdx === idx
                      ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                      : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-500"
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${
                    activeLessonIdx === idx 
                      ? "bg-neutral-800 border-neutral-700 text-white" 
                      : "bg-neutral-50 border-neutral-200 text-neutral-400"
                  }`}>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold">MODULE 0{idx + 1}</span>
                    <h4 className={`text-xs font-display font-bold leading-snug line-clamp-2 ${activeLessonIdx === idx ? "text-white" : "text-neutral-900"}`}>{les.title}</h4>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{les.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI tutor assist */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-4 shadow-sm">
            <h3 className="font-display font-bold text-xs text-neutral-950 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 animate-spin" /> Academy AI Tutor
            </h3>
            <p className="text-neutral-500 text-[11px] leading-relaxed">
              Stuck on scanning evasion filters? Paste your query or code snippet, and our cyber AI model will assist your training.
            </p>
            <button
              onClick={() => onNavigate("student-dashboard")}
              className="w-full py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs font-mono text-white transition font-bold cursor-pointer"
            >
              LAUNCH AI THREAT INTELLIGENCE
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
