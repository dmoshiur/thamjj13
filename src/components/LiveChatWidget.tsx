import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, ShieldAlert, Image as ImageIcon, CornerUpLeft, Trash2, Smile, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserRole, LiveChatMessage, LiveChatSession } from "../types";

interface LiveChatWidgetProps {
  currentSessionId: string;
  setSessionId: (id: string) => void;
  currentUser: { username: string; role: UserRole; id: string } | null;
}

export default function LiveChatWidget({ currentSessionId, setSessionId, currentUser }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [replyingTo, setReplyingTo] = useState<LiveChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch session
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/admin/chats");
      const sessions: LiveChatSession[] = await res.json();
      const current = sessions.find(s => s.id === currentSessionId);
      if (current) {
        setMessages(current.messages);
        setOnlineStatus(current.isOnline);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const handleSendMessage = async (text: string, fileBase64?: string, fileName?: string) => {
    if (!text.trim() && !fileBase64) return;

    const payload = {
      sessionId: currentSessionId,
      senderId: currentUser ? currentUser.id : "visitor",
      senderName: currentUser ? currentUser.username : "White Hat Guest",
      senderRole: currentUser ? currentUser.role : UserRole.VISITOR,
      content: text,
      fileBase64,
      fileName,
      replyToId: replyingTo?.id,
      replyToContent: replyingTo?.content,
    };

    try {
      const res = await fetch("/api/chats/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.session.messages);
        setInputText("");
        setReplyingTo(null);

        // If sent by visitor, trigger automated simulated White Hat Hacker reply after 3s
        if (payload.senderId === "visitor") {
          setIsTyping(true);
          setTimeout(async () => {
            setIsTyping(false);
            const autoPayload = {
              sessionId: currentSessionId,
              senderId: "system-threat-intel",
              senderName: "THAMJJ13 Threat Intelligence Auto-Bot",
              senderRole: UserRole.SUPPORT_AGENT,
              content: `🔒 [Threat Auto-Defense Network Alert] Your IP is verified clean. Singapore-Bangladesh gateway encryption is active. How can our SOC team assist your business team today?`,
            };
            await fetch("/api/chats/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(autoPayload),
            });
            fetchMessages();
          }, 3000);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleSendMessage(`Sent file attachment: ${file.name}`, base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        handleSendMessage(`Pasted secure image capture`, base64, file.name || "pasted_image.png");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/chats/${currentSessionId}/delete/${msgId}`, { method: "POST" });
      if (res.ok) fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="tham_floating_livechat">
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold p-4 rounded-full shadow-luxury transition-all cursor-pointer"
            id="chat_trigger_btn"
          >
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="text-[11px] font-display tracking-wider font-bold uppercase">LIVE SOC CHAT</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-80 md:w-96 h-[510px] rounded-2xl bg-white shadow-luxury flex flex-col border border-neutral-200/50 overflow-hidden"
            onPaste={handlePasteImage}
            id="chat_window"
          >
            {/* Header */}
            <div className="p-4 bg-white border-b border-neutral-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full animate-ping absolute" />
                  <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full border border-white relative" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs text-neutral-950 flex items-center gap-1 uppercase">
                    THAMJJ13 SOC <ShieldAlert className="w-3.5 h-3.5 text-neutral-800" />
                  </h3>
                  <p className="text-[9px] text-neutral-400 font-mono tracking-widest font-bold">GATEWAY ACTIVE</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-950 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto opacity-60 animate-pulse mb-2" />
                  <p className="text-[11px] text-neutral-500 leading-relaxed max-w-[200px] mx-auto">SOC connection secure. Type below to transmit encrypted message to Singapore & Bangladesh stations.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.senderId === (currentUser ? currentUser.id : "visitor") ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[9px] text-neutral-400 font-mono mb-0.5">
                      {msg.senderName} ({msg.senderRole})
                    </span>
                    <div
                      className={`p-2.5 rounded-xl max-w-[80%] relative group ${
                        msg.senderId === (currentUser ? currentUser.id : "visitor")
                          ? "bg-neutral-900 text-white font-mono text-xs border border-neutral-800"
                          : "bg-white border border-neutral-200 text-neutral-800 text-xs shadow-sm"
                      }`}
                    >
                      {/* Reply Context */}
                      {msg.replyToContent && (
                        <div className="text-[10px] bg-neutral-100 p-1.5 rounded border-l-2 border-neutral-800 mb-1.5 text-neutral-500 italic">
                          {msg.replyToContent}
                        </div>
                      )}

                      <p className="break-words leading-relaxed">{msg.content}</p>

                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="attachment"
                          className="mt-2 rounded max-h-32 object-cover border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* Actions Hover Overlays */}
                      <div className="absolute right-0 top-0 -mt-5 opacity-0 group-hover:opacity-100 flex gap-1 bg-white border border-neutral-200 rounded p-0.5 shadow-sm transition z-10">
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 hover:text-neutral-900 text-neutral-400 transition cursor-pointer"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 hover:text-red-600 text-neutral-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-[8px] text-neutral-400 font-mono mt-0.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono animate-pulse">
                  <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span>SOC expert typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Bar */}
            {replyingTo && (
              <div className="bg-neutral-50 p-2 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-700">
                <span className="truncate">Replying to: <i>{replyingTo.content}</i></span>
                <button onClick={() => setReplyingTo(null)} className="text-red-600 hover:text-red-500 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Emoji Bar */}
            <div className="bg-white px-4 py-1.5 border-t border-neutral-100 flex gap-2 text-xs">
              {["👍", "🔒", "🚨", "💻", "🔥"].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="hover:scale-125 transition duration-150 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input Panel */}
            <div className="p-3 bg-white border-t border-neutral-100 flex gap-2 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-500 hover:text-neutral-950 transition cursor-pointer"
                title="Upload Screenshot"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage(inputText)}
                placeholder="Paste image or type transmission..."
                className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 focus:outline-none focus:border-neutral-400"
              />

              <button
                onClick={() => handleSendMessage(inputText)}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
