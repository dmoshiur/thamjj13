import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const ReportForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    incidentDateTime: "",
    incidentLocation: "",
    category: "Phishing/Social Engineering",
    description: "",
    witnessInfo: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [caseId, setCaseId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit");
      setCaseId(data.id);
      setStatus("success");
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        incidentDateTime: "",
        incidentLocation: "",
        category: "Phishing/Social Engineering",
        description: "",
        witnessInfo: "",
      });
    } catch (e: any) {
      setErrorMsg(e?.message || "Error submitting report.");
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-neutral-200"
    >
      <h2 className="text-2xl font-bold mb-6">Report a Cyber Incident</h2>
      {status === "success" && (
        <div className="bg-emerald-50 p-4 rounded-xl text-emerald-800 flex items-center gap-2 mb-6 text-sm">
          <CheckCircle2 size={20} /> Report submitted! Case ID: <strong>{caseId}</strong>. A confirmation email was sent from no-reply@thamjj13.top.
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 p-4 rounded-xl text-red-700 flex items-center gap-2 mb-6 text-sm">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 border border-neutral-200 rounded-xl"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 border border-neutral-200 rounded-xl"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            placeholder="Phone Number"
            className="w-full p-3 border border-neutral-200 rounded-xl"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            className="w-full p-3 border border-neutral-200 rounded-xl"
            value={formData.incidentDateTime}
            onChange={(e) => setFormData({ ...formData, incidentDateTime: e.target.value })}
            required
          />
        </div>
        <input
          type="text"
          placeholder="Incident Location / Target Domain / IP"
          className="w-full p-3 border border-neutral-200 rounded-xl"
          value={formData.incidentLocation}
          onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
          required
        />
        <textarea
          placeholder="Detailed Incident Description"
          rows={4}
          className="w-full p-3 border border-neutral-200 rounded-xl"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold cursor-pointer"
        >
          {status === "submitting" ? "Submitting..." : "Submit Official Report"}
        </button>
      </form>
    </motion.div>
  );
};
