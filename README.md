# Sagar Fitness Gym — Gym Management System

> **Official Production Application for Sagar Fitness Gym (Single Location, Pathardi, Maharashtra, India)**

A stable, secure, and production-ready gym management system engineered with React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, MongoDB, and Mongoose. Specifically tailored for single-gym operations with tax-free billing, real-time member check-ins, automated subscription tracking, and role-based operational access.

---

## 🏛️ 1. Architecture Overview

### Single-Gym Architecture
- **Single Physical Location**: Sagar Fitness Gym, Pathardi, Maharashtra, India.
- **No Multi-Branch Overhead**: All branch switchers, multi-branch dropdowns, branch comparison analytics, and branch routing have been eliminated.
- **Data Model**: All database records (Members, Memberships, Attendance, Payments, Audit Logs) operate under the single Sagar Fitness Gym configuration (`SAGAR-01`).
- **Reporting & Timezone**: Configured for Indian Rupee (`₹` / `INR`) and `Asia/Kolkata` (IST, UTC+5:30) date formatting (`DD/MM/YYYY`).

### Tax-Free Billing Engine
- **Tax-Free Operations**: Sagar Fitness Gym does not charge GST or tax percentages.
- **Direct Calculation**:
  $$\text{Remaining Balance} = \text{Membership Fee} - \text{Total Valid Payments}$$
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
| **Database Backups & Maintenance** | Full Access | ❌ Restricted (403) |

---

## 🔒 3. Authentication & Security

- **Server-Side Credential Validation**: Password verification strictly executes on the backend using `bcryptjs` with salt rounds.
- **No Client-Side Mock Fallback**: All mock login buttons, instant demo cards, and hardcoded client credentials have been removed.
- **Login Rate Limiting**: Secured via `express-rate-limit` (maximum 50 attempts per 15-minute window per IP) on `/api/auth/login` and `/api/auth/forgot-password`.
- **CORS Protection**: Restricted to the validated `CLIENT_URL` with credentials allowed.
- **Password Recovery Workflow**:
  - Cryptographically secure 32-byte tokens generated via `crypto.randomBytes(32)`.
  - Only the SHA-256 hash of the token is stored in MongoDB.
  - Strict 15-minute expiration window.
  - Tokens are invalidated immediately upon single use.
  - Safe generic responses prevent user email enumeration.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to cleanly drain active connections and close the MongoDB connection before process termination.

---

## 🛠️ 4. Technology Stack

- **Frontend**:
  - React 18 & TypeScript (Vite 6 bundler)
  - Tailwind CSS with custom light theme tokens (`#F5F7FA` page background, `#2563EB` primary blue, `#FFFFFF` cards)
  - Lucide React (Icons)
  - html2canvas & jsPDF (High-resolution receipt PDF generation)
- **Backend**:
  - Node.js (v18+) & Express 4
  - TypeScript & TSX
  - MongoDB 6+ & Mongoose 8
  - JWT (`jsonwebtoken`) & bcryptjs
  - Helmet security headers & Morgan logging
- **Testing**:
  - Vitest 3 & Supertest integration suite (33 automated test scenarios)

---

## 🚀 5. Getting Started (Local Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/fitcore`) or MongoDB Atlas URI

### Installation
Clone or navigate to the repository root:
```bash
# Install root, server, and client dependencies
npm install
npm install --prefix server
npm install --prefix client
```

### Environment Configuration
Copy `.env.example` files to `.env`:
```bash
# Root / Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

### Database Seeding & Admin Setup
To initialize the single gym configuration and seed starter members, plans, and administrative accounts:
```bash
npm run seed --prefix server
```

The initial seeded accounts are:
- **Gym Admin**: `admin@sagarfitness.com` (Username: `admin`, Password: `password123`)
- **Front Desk**: `desk@sagarfitness.com` (Username: `desk`, Password: `password123`)

*Note: For production deployments, change these passwords immediately via Settings > Profile & Security or during the initial seed.*

### Starting Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev --prefix server

# Terminal 2: Frontend Client (Port 5173)
npm run dev --prefix client
```
- Frontend UI: `http://localhost:5173`
- API Health Check: `http://localhost:5000/api/health`

---

## 🧪 6. Automated Testing

Run the full end-to-end integration test suite (33 test scenarios covering health, authentication, RBAC, member registration, duplicate prevention, payment calculations, receipt generation, and single gym settings):

```bash
npm test --prefix server
```

Expected output:
```
✓ tests/api.test.ts (33 tests)
Test Files  1 passed (1)
Tests       33 passed (33)
```

---

## 📦 7. Production Build & Deployment

### Step 1: Build the Client
```bash
cd client
npm run build
```
This produces an optimized, code-split production bundle in `client/dist`.

### Step 2: Build the Server
```bash
cd server
npm run build
```
This compiles TypeScript to vanilla ES modules in `server/dist`.

### Step 3: Configure Production Environment Variables
In your production hosting environment (e.g., Ubuntu VPS, Render, Railway, AWS EC2):
```ini
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sagar_fitness?retryWrites=true&w=majority
JWT_SECRET=generate_with_crypto_randomBytes_64_characters_minimum
JWT_EXPIRES_IN=7d
CLIENT_URL=https://gym.sagarfitness.com
```

### Step 4: Run the Production Server
```bash
cd server
npm start
```
Or with PM2 process manager:
```bash
pm2 start dist/server.js --name "sagar-fitness-api"
```

### Step 5: Nginx Reverse Proxy Configuration (SPA Fallback)
Sample Nginx block serving `client/dist` and proxying `/api` to the backend:
```nginx
server {
    listen 80;
    server_name gym.sagarfitness.com;

    # Frontend Static Files
    root /var/www/sagarfitness/client/dist;
    index index.html;

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads (Photo storage)
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
    }
}
```

---

## 💾 8. Database Backup & Restore

### Automated JSON Backups
The system includes built-in automated daily backups stored in `server/backups/`. Authorized administrators can trigger manual snapshots and download JSON backups directly from **Settings > Database Backup & Restore**.

### Production MongoDump & MongoRestore

#### Backup:
```bash
mongodump --uri="mongodb+srv://<username>:<password>@cluster0.mongodb.net/sagar_fitness" --out=/var/backups/sagar_fitness_$(date +%F)
```

#### Restore:
```bash
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.mongodb.net/sagar_fitness" --drop /var/backups/sagar_fitness_<date>/sagar_fitness
```

---

## 📋 9. Required Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables strict security checks and suppresses debug stacks |
| `PORT` | Yes | `5000` | Port for Express backend server |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB database connection URI |
| `JWT_SECRET` | Yes | `32+ char random hex` | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Active token duration before re-login required |
| `CLIENT_URL` | Yes | `https://gym.sagarfitness.com` | Allowed frontend origin for CORS |
| `VITE_API_URL` | Optional | `/api` | Base path for frontend API calls |
