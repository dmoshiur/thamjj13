import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";

export const ReportForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    incidentDateTime: "",
    incidentLocation: "",
    category: "Technical",
    description: "",
    witnessInfo: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to submit");
      setStatus("success");
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        incidentDateTime: "",
        incidentLocation: "",
        category: "Technical",
        description: "",
        witnessInfo: "",
      });
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-neutral-200">
      <h2 className="text-2xl font-bold mb-6">Report a Case</h2>
      {status === "success" && (
        <div className="bg-green-50 p-4 rounded-xl text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle2 size={20} /> Report submitted successfully.
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 p-4 rounded-xl text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle size={20} /> Error submitting report. Please try again.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
            type="text" 
            placeholder="Full Name" 
            className="w-full p-3 border rounded-xl"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
        />
        <input 
            type="email" 
            placeholder="Email" 
            className="w-full p-3 border rounded-xl"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
        />
        <textarea 
            placeholder="Description" 
            className="w-full p-3 border rounded-xl"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
        />
        <button type="submit" className="w-full bg-neutral-900 text-white py-3 rounded-xl">
          {status === "submitting" ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </motion.div>
  );
};
