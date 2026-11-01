# Sagar Fitness Gym — Gym Management System

> **Official Production Application for Sagar Fitness Gym (Single Location, Pathardi, Maharashtra, India)**
> - **Frontend (Vercel):** `https://fitcore-livid.vercel.app`
> - **Backend API (Render):** `https://sagar-fitness-backend.onrender.com/api`

A stable, fast, and production-ready gym management system engineered with modern Vanilla HTML5, Tailwind CSS, JavaScript, Node.js, Express, MongoDB, and Mongoose. Tailored for single-gym operations with tax-free billing, real-time member check-ins, automated subscription tracking, and role-based operational access.

---

## 🏛️ 1. Architecture Overview

### Single-Gym Architecture
- **Single Physical Location**: Sagar Fitness Gym, Pathardi, Maharashtra, India.
- **Zero Complex Overhead**: No unnecessary multi-branch overhead; all database records (Members, Memberships, Attendance, Payments, Audit Logs) operate under the single Sagar Fitness Gym configuration (`SAGAR-01`).
- **Currency & Regional Formatting**: Indian Rupee (`₹` / `INR`) and `Asia/Kolkata` (IST, UTC+5:30) date formatting (`DD/MM/YYYY`).

### Tax-Free Billing Engine
- **Tax-Free Operations**: Sagar Fitness Gym charges flat membership pricing with zero GST or hidden taxes.
- **Direct Calculation**:
  $$\text{Remaining Balance} = \text{Plan Fee} - \text{Total Valid Payments}$$
- **Duplicate Prevention**: Backend idempotency validation prevents double submissions on payments and registrations.

---

## 👥 2. User Roles & Permission Matrix

The application strictly implements two operational roles:

| Module / Feature | 👑 Gym Admin (`SUPER_ADMIN` / `GYM_ADMIN`) | 🏢 Front Desk (`RECEPTIONIST`) |
| :--- | :---: | :---: |
| **Member Registration & Directory** | Full Access | Create & View Only |
| **Attendance Check-In & Quick Punch** | Full Access | Full Access |
| **Membership Plans Management** | Create / Edit / Delete Plans | View Only |
| **Membership Renewals** | Full Access | Full Access |
| **Record Payments & Print Receipts** | Full Access | Full Access |
| **Financial Summaries & Collections** | Full Access | Operational Dues Only |
| **Audit Logs Inspection** | Full Access | ❌ Restricted (403) |
| **Staff Accounts & Credentials** | Full Access | ❌ Restricted (403) |
| **Gym Settings & Business Profile** | Full Access | ❌ Restricted (403) |

---

## 🛠️ 3. Technology Stack

- **Frontend (`public/`)**:
  - Modern HTML5 + Tailwind CSS (Responsive modern light UI)
  - Vanilla JavaScript (`app.js`, `api.js`, `components.js`)
  - FontAwesome 6 icons
  - Zero build step required — instant live reloads
- **Backend (`server/`)**:
  - Node.js (v18+) & Express 4
  - TypeScript & TSX runtime
  - MongoDB 6+ & Mongoose 8
  - JWT (`jsonwebtoken`) & `bcryptjs`
  - Helmet security headers & Express Rate Limiting
- **Automated Testing**:
  - Vitest 3 & Supertest integration suite (81 passing automated tests)

---

## 🚀 4. Getting Started (Local Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/sagar_fitness`) or MongoDB Atlas URI

### Installation & Launch
```bash
# 1. Install dependencies
npm install
npm install --prefix server

# 2. Configure environment (copy server/.env.example to server/.env)
cp server/.env.example server/.env

# 3. Start local server
npm run dev
```

Or on Windows, simply double-click **`run.bat`**!

- **Application URL**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/api/health`

### Initial Admin Credentials
- **Gym Owner / Super Admin**: `admin@sagarfitness.com` (Password: `Admin@123` or `password123`)
- **Admin**: `shayadfakir2006@gmail.com`

---

## 🧪 5. Automated Testing

Run the full end-to-end integration test suite:

```bash
npm test --prefix server
```

All 81 tests pass cleanly (100% green).

---

## 📋 6. Environment Variables Reference

| Variable Name | Required | Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables strict production security mode |
| `PORT` | Yes | `5000` | Port for Express server |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB database connection URI |
| `JWT_SECRET` | Yes | `32+ char random string` | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Active token duration before re-login required |
| `CLIENT_URL` | Yes | `http://localhost:5000` | Allowed frontend origin for CORS |
