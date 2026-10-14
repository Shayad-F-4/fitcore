# ⚡ FitCore — Premium Gym Management Ecosystem

> **"Train Smarter. Manage Better."**

FitCore is a modern, high-performance gym management web application engineered for elite gyms, trainers, front-desk staff, and members. Combining a dark-mode visual aesthetic (neon lime `#B7FF3C`, deep charcoal `#080B0A`) with a production-grade modular backend, FitCore manages athletic memberships, check-ins, multi-branch operations, and financial auditing.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 18 & TypeScript
  - Vite 6
  - Tailwind CSS (Curated Dark & Neon Lime Design System)
  - Framer Motion (Transitions, modals, micro-interactions)
  - Lucide React (Icons)
  - Recharts (Analytics and hourly peak charts)
  - QRCode.react (Instant digital pass generation)
  - Canvas-Confetti (Celebrations on renewals and enrollments)
- **Backend**:
  - Node.js & Express.js
  - TypeScript & TSX
  - MongoDB & Mongoose
  - JWT & bcryptjs Password Hashing
  - Helmet & CORS Security
  - Vitest & Supertest Integration Suite

---

## 🚀 Key Modules & Capabilities

1. **Role-Based Access Control (RBAC)**
   - `SUPER_ADMIN`: Full multi-branch control, staff management, audit log inspection.
   - `GYM_ADMIN`: Local branch operations, trainer oversight, financial analytics.
   - `RECEPTIONIST`: Fast athlete lookup, QR pass scanning, renewal processing, manual check-in/out.
   - `TRAINER`: Assigned athlete roster and class schedules.
   - `MEMBER`: Personal workout log, membership status, attendance history, receipts.

2. **Digital Member Pass & QR Attendance Terminal**
   - High-speed check-in terminal supporting instant QR code scan, Member ID (e.g. `FC-1001`), or Mongo ID.
   - Automatic toggle check-out with duration tracking.
   - Live real-time gym occupancy counter with automatic 12-second polling.

3. **Membership Lifecycle & Financial Tracking**
   - Tiered plans: Annual VIP, Quarterly Athlete, Monthly Classic, Functional Box Pass, 10-Day Flex Pass.
   - Active, expiring-soon, and frozen status calculations.
   - Membership freeze/thaw history with reason auditing.
   - Invoicing, receipt numbers (`RCP-2026-XXXX`), cash/card/UPI tracking, and printable receipts.

4. **Multi-Branch Ready**
   - Flagship Downtown, Uptown Performance Lab, and Westside Athlete Club with separate capacities and contact points.

5. **Security & Accountability**
   - In-depth `AuditLog` records for every administrative action, check-in, freeze, and financial transaction.

---

## 🔑 Demo Access & Seed Accounts

The system includes pre-seeded demo accounts with password `password123`:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@fitcore.com` | `password123` | Global Platform & Branches |
| **🏢 Gym Manager** | `manager@fitcore.com` | `password123` | Downtown Branch Management |
| **🎫 Reception Desk** | `reception@fitcore.com` | `password123` | Fast Check-In & Receipts |
| **💪 Head Coach** | `trainer@fitcore.com` | `password123` | Trainer & Member Schedules |

*Note: The login screen also features 1-click quick switch buttons for instant evaluation.*

---

## 💻 Prerequisites & Setup

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24.5)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI.

### 2. Installation
Clone or navigate to the project root and install all dependencies:
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 3. Database Initialization & Seeding
To populate realistic members, membership tiers, active check-ins, and financial records:
```bash
npm run seed --prefix server
```

### 4. Running the Application
To run both backend API and frontend concurrently:
```bash
# Terminal 1 - Backend Server (Port 5000)
npm run dev --prefix server

# Terminal 2 - Frontend Client (Port 5173)
npm run dev --prefix client
```
Access the application at: **[http://localhost:5173](http://localhost:5173)**
API Health & Status at: **[http://localhost:5000/api/health](http://localhost:5000/api/health)**

---

## 🧪 Testing

FitCore features a comprehensive automated integration test suite covering auth, RBAC, member queries, QR lookups, attendance, and KPI metrics:

```bash
npm run test --prefix server
```

---

## 📁 Project Architecture

```
fitcore/
├── package.json               # Root monorepo orchestrator
├── .env.example               # Environment variables template
├── README.md                  # Project documentation
├── server/
│   ├── src/
│   │   ├── config/            # Database and environment configurations
│   │   ├── middlewares/       # JWT auth and RBAC guards
│   │   ├── models/            # Mongoose schemas (User, Member, Membership, Attendance, Payment, Branch, AuditLog)
│   │   ├── routes/            # REST API route controllers
│   │   ├── utils/             # JWT, response helpers, structured logger, audit logger
│   │   ├── scripts/           # Realistic database seeding engine
│   │   └── server.ts          # Express application entrypoint
│   └── tests/
│       └── api.test.ts        # Vitest & Supertest integration tests
└── client/
    ├── src/
    │   ├── api/client.ts      # Axios/Fetch typed client with token injection
    │   ├── components/        # Sidebar, Navbar, and interactive modals (Check-in, Member Card, Freeze, Renew, Receipt)
    │   ├── context/           # React AuthContext with session persistence
    │   ├── pages/             # Dashboard, Members, Plans, Attendance, Billing, Branches, Audit Logs, Login
    │   └── types/             # Shared TypeScript entity models
    ├── index.html
    ├── tailwind.config.js     # FitCore custom theme tokens
    └── vite.config.ts         # Vite bundler with /api reverse proxy
```
