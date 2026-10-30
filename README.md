# THAMJJ13 — Enterprise Cybersecurity Operations & Academy Platform

Production-grade full-stack cybersecurity operations portal, citizen incident & FIR dispatch system, and white-hat training academy built exclusively on **Turso (LibSQL)**, **Cloudinary CDN**, and **Resend (`no-reply@thamjj13.top`)**.

## Core Architecture

- **Database**: **Turso (`@libsql/client`)** — 19 normalized SQL tables covering users, HTTP-only JWT sessions (`auth_sessions`), SHA-256 OTP challenges (`otp_tokens`), incident reports & cryptographic FIRs (`reports`), courses/lessons/MCQ exams, certificates, contact inquiries, support tickets, live SOC chat sessions, file vault, visitor telemetry, Resend mail logs (`mail_logs`), API keys, and immutable audit logs.
- **Media & Evidence Storage**: **Cloudinary (`cloudinary` v2 SDK)** — signed server-side and unsigned preset uploads via `/api/upload` for incident evidence, cadet avatars, encrypted vault assets, CMS imagery, and academy course videos.
- **Authentication & RBAC**: Real email + `bcryptjs` password hashing + **Resend 6-digit OTP verification** across both the **Admin Console** and **Cadet Portal**, backed by revocable HTTP-only JWT cookies (`tham_session`) and sliding-window IP rate limiting.
- **Transactional Emails (`no-reply@thamjj13.top`)**: Powered by **Resend (`resend`)** for Admin & Cadet 2FA OTPs, Cadet email verification, Super Admin bootstrap OTP, password resets, Case Report submission confirmations + admin alerts, FIR signing/status updates, Cadet clearance approvals, contact replies, support ticket updates, certificate awards, and newsletter confirmations.
- **Universal Deployment**:
  - **Vercel Serverless + Static SPA**: Ready out of the box via `api/index.ts` and `vercel.json`.
  - **Standalone Node Server**: `npm run build && npm start` serves both the bundled Express API and compiled Vite SPA on `0.0.0.0:3000`.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and configure your credentials:
   - `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `RESEND_API_KEY` & `RESEND_FROM_EMAIL="no-reply@thamjj13.top"`
   - `JWT_SECRET`
   - Optional: `ADMIN_EMAIL` & `ADMIN_PASSWORD` (or provision your first Super Admin interactively via Resend OTP on the Portal Login screen).
3. Start development server:
   ```bash
   npm run dev
   ```
4. Build & run for production:
   ```bash
   npm run lint
   npm run build
   npm start
   ```
