import { Schema, model, Document } from "mongoose";
import { UserProfile, UserRole } from "../types";

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.VISITOR },
  approved: { type: Boolean, default: false },
  phone: { type: String },
  address: { type: String },
  profilePicture: { type: String },
  password: { type: String, required: true },
  loginHistory: [
    {
      ip: String,
      action: String,
      timestamp: String,
      device: String,
      browser: String,
      status: String,
    },
  ],
}, { timestamps: true });

export const User = model<UserProfile & Document>("User", userSchema);
