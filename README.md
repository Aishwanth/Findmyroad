# FixMyRoad AI 🛡️
## AI-Powered Pothole Reporting, Verification, and Municipal Management Platform

FixMyRoad AI connects citizens who discover damaged roads with municipal engineering officers responsible for resolving them. It transforms civic complaints into verified, geo-prioritized municipal work orders with complete photographic transparency from submission to repair.

---

## 🌟 Key Features

### 👤 Citizen Experience
1. **5-Step Submission Wizard (`/report`)**:
   - **Step 1 (Upload)**: Drag-and-drop road photo uploader with file validation (JPEG/PNG/WEBP, up to 10MB) and photographic guidelines.
   - **Step 2 (Location)**: Searchable corridor dropdown (Hyderabad test locations: Uppal, Mallapur, Habsiguda, Tarnaka, LB Nagar, Begumpet, Banjara Hills, Gachibowli, etc.) plus manual street & landmark input.
   - **Step 3 (Details)**: Defect classification (Pothole, Deep Crater, Rutting, Edge Breakdown, etc.) and citizen impact notes.
   - **Step 4 (AI Verification)**: Animated scanning state calling server-side vision AI to verify potholes, calculate cavity depth, classify severity (Low/Medium/High), and list observations with manual-review fallback.
   - **Step 5 (Submission & Success)**: Instant ticket ID (`FMR-2026-XXXX`), MongoDB persistence, and celebratory confetti.
2. **Citizen Tracking Hub (`/citizen`)**:
   - Summary statistics (Total complaints, Awaiting review, Work orders dispatched, Verified repairs).
   - Multi-field search (by Ticket ID, location, or keyword).
   - Filter by status and severity; sort by newest, oldest, or community upvotes.
   - One-click community upvotes.
3. **Public Report Detail & Audit Timeline (`/citizen/reports/:id`)**:
   - Before and after repair photographic evidence side-by-side.
   - 4-stage resolution pipeline (`Submitted` → `Under Review` → `Assigned` → `Resolved`).
   - Deep AI vision assessment breakdown.
   - Timestamped status change audit trail with actor names and notes.

### 🏛️ Municipal Officer Operations Center (`/officer`)
1. **Real-time Operations KPI Dashboard**:
   - Live counts derived dynamically from MongoDB: Total reports, Awaiting review, High severity hazards, Assigned repairs, Resolved repairs, and SLA resolution rates.
2. **Dynamic Recharts Analytics**:
   - Severity distribution (High vs Medium vs Low).
   - Status pipeline breakdown.
   - Real-time triage activity feed.
3. **Complaint Triage & Work Orders Table**:
   - Multi-filtering by status, severity, and location.
   - Quick one-click status transitions (e.g., *Mark Under Review*, *Dispatch Repair*).
   - Direct link to manage individual work orders.
4. **Work Order Management Console (`/officer/reports/:id`)**:
   - Authorized severity recalibration with mandatory justification log.
   - Dispatch to municipal repair taskforces (e.g. *GHMC Rapid Patch Crew Alpha*, *East Zone Heavy Maintenance Unit*).
   - Internal confidential notes (officers only) vs public updates.
   - **Resolution Closure**: Upload after-repair photograph, enter materials used (e.g. dense bituminous macadam), and sign off.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Recharts, TanStack Query, Canvas Confetti.
- **Backend**: Node.js, Express.js, TypeScript (`tsx`), Mongoose, Multer (multipart disk storage), Morgan, CORS, Dotenv.
- **Database**: MongoDB (Local or Atlas) at `mongodb://127.0.0.1:27017/fixmyroad`.
- **AI Engine**: Google Gemini 1.5 Flash Vision API with an intelligent local heuristic vision fallback for offline environments.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+) and npm.
- MongoDB running locally on `mongodb://127.0.0.1:27017/` (or specify `MONGODB_URI` in `.env`).

### 2. Backend Setup
```bash
cd server
npm install
npm run seed     # Seeds 12 realistic demonstration reports with photos & audit histories
npm run dev      # Starts Express API server on http://localhost:5000
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install
npm run dev      # Starts Vite dev server on http://127.0.0.1:5173
```

### 4. Automated End-to-End Test Suite
Run the 12-point automated verification suite:
```bash
cd server
npx tsx src/scripts/test-e2e.ts
```

---

## 🔑 Environment Configuration

Server configuration file: `server/.env` (see `server/.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/fixmyroad
NODE_ENV=development
# Optional: Google Gemini API key for live vision analysis
# If left empty, FixMyRoad AI activates the heuristic inspection engine with manual review fallback
GEMINI_API_KEY=
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and active AI engine status |
| `GET` | `/api/reports` | Query reports with search, status, severity, pagination |
| `GET` | `/api/reports/:id` | Fetch single report by Ticket ID or MongoDB ID |
| `POST` | `/api/reports` | Create report with photo upload & AI evaluation |
| `POST` | `/api/ai/analyze` | Standalone AI vision inspection endpoint |
| `PATCH` | `/api/reports/:id/status` | Workflow transition (`Submitted` → `Under Review` → `Assigned` → `Resolved`) |
| `PATCH` | `/api/reports/:id/assignment`| Assign repair crew and supervising engineer |
| `PATCH` | `/api/reports/:id/severity` | Authorized engineer severity override |
| `POST` | `/api/reports/:id/resolve` | Close ticket with after-repair photograph & notes |
| `POST` | `/api/reports/:id/upvote` | Community citizen upvote toggle |
| `POST` | `/api/reports/:id/notes` | Add internal confidential officer note |
| `GET` | `/api/dashboard/stats` | Real-time KPI statistics & Recharts aggregations |
| `GET` | `/api/dashboard/activity` | Chronological activity feed |

---

## 🛡️ Hackathon MVP Disclaimer
The role toggle (`Citizen` vs `Officer`) in the top navigation is implemented for demonstration ease. Seed data and test corridors (Hyderabad Municipal Testing Zone) are clearly labelled as demonstration records.
