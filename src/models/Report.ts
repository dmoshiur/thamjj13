import { Schema, model, Document } from "mongoose";
import { Report } from "../types";

const reportSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  incidentDateTime: { type: String, required: true },
  incidentLocation: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  evidenceUrl: String,
  evidenceName: String,
  witnessInfo: String,
  status: { type: String, enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CLOSED"], default: "PENDING" },
  notes: String,
  firNumber: String,
  firDetails: {
    firNumber: String,
    policeStation: String,
    accusedInfo: String,
    officerDetails: String,
    finalizedAt: String,
    signature: String,
    verificationCode: String,
  },
}, { timestamps: true });

export const ReportModel = model<Report & Document>("Report", reportSchema);
