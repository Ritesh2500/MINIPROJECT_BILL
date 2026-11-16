# BillMate – Personal Bill & Payment Management System

> **A production-ready, full-stack financial web application engineered for individuals to manage personal bills, track upcoming & overdue payments, record settled disbursements, maintain transaction history, automate recurring billing cycles, and gain smart financial intelligence.**

---

## 🌟 Key Features

1. **Complete Bill Lifecycle Management (CRUD)**:
   - Add, edit, delete, and view comprehensive bill details.
   - Categorize across 15 standard domains (*Electricity, Water, Mobile, Internet, Rent, College/School Fees, Insurance, Credit Card, Loan, OTT Subscriptions, Software Subscriptions, Transportation, Healthcare, Shopping, Other*) plus custom categories.
   - Dynamic status tracking: **Upcoming**, **Pending**, **Paid**, and **Overdue** (automatically calculated using due dates and payment records).

2. **Real Payment Tracking & Ledger**:
   - Record multiple partial or full payments per bill without overwriting transaction history.
   - Support for 6 payment instruments: **UPI**, **Debit Card**, **Credit Card**, **Net Banking**, **Cash**, and **Other**.
   - Automatic bill settlement status updates once total paid meets or exceeds the billed amount.
   - View, verify, and print detailed payment receipts.

3. **Automated Recurring Billing Engine**:
   - Recurrence schedules: **Daily**, **Weekly**, **Monthly**, **Quarterly**, **Half-Yearly**, and **Yearly**.
   - Automatic generation of the next occurrence upon bill settlement.
   - Intelligent duplication prevention and recurring burn-rate projections (monthly & annual fixed load).

4. **In-App Notification & Reminder Center**:
   - Advance reminders (1, 2, 3, 5, 7, 14 days before due date).
   - "Due today", "due tomorrow", and automated "overdue warning" alerts.
   - Background scheduler (`node-cron`) automatically updating statuses and dispatching notifications.

5. **Interactive Due Date Calendar**:
   - Monthly grid with color-coded status badges and click-to-pay drawers.
   - Quick visual audit of days with heavy financial commitments.

6. **Interactive Financial Analytics (Recharts)**:
   - Month-over-month expenditure bar & area charts.
   - Category-wise donut charts with percentages.
   - Settlement status breakdown (Paid vs. Pending vs. Overdue).
   - Payment method volume distribution and 30-day projected commitments.

7. **Reports & Multi-Format Data Export**:
   - One-click **PDF Statement generation** with styled tables and financial summaries.
   - Formatted **Excel (.xlsx)** export.
   - Standard **CSV** ledger download.
   - Filterable by date ranges, categories, and payment statuses.

8. **AI Financial Assistant & Smart Expense Insights**:
   - Natural language conversational assistant answering queries such as:
     - *"How much did I spend on electricity this month?"*
     - *"Which category has the highest expenses?"*
     - *"Predict my next month's bills"*
     - *"Compare this month's expenses with last month"*
   - Integrates with Google Gemini API when `GEMINI_API_KEY` is provided; transparently falls back to an embedded data-driven Financial Intelligence Engine when unconfigured.

9. **Security & User Isolation**:
   - Passwords hashed using `bcrypt` (10 salt rounds).
   - Stateless JWT authentication with expiration.
   - Strict database-level isolation: a user can never access or modify another user's bills, payments, or categories.
   - Helmet HTTP security headers and rate limiting on sensitive endpoints.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React.js (Vite), Tailwind CSS, React Router v6, Lucide React, Recharts, Axios, jsPDF, XLSX |
| **Backend** | Node.js, Express.js, REST APIs, JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), `node-cron`, `helmet`, `morgan` |
| **Database** | MySQL (with `mysql2` connection pooling) + built-in zero-config SQLite fallback for local developer agility |
| **Export/Reports**| jsPDF, jsPDF-AutoTable, SheetJS (`xlsx`) |

---

## 📂 Project Architecture

```
billmate/
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── assets/              # Static assets
│   │   ├── components/          # Sidebar, Navbar, MainLayout, PaymentModal
│   │   ├── context/             # AuthContext, ThemeContext, NotificationContext
│   │   ├── pages/               # 15 Complete Pages + AI Assistant
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── AllBillsPage.jsx
│   │   │   ├── AddBillPage.jsx
│   │   │   ├── BillDetailsPage.jsx
│   │   │   ├── PaymentHistoryPage.jsx
│   │   │   ├── RecurringBillsPage.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── NotificationsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── AIAssistantPage.jsx
│   │   ├── services/            # Axios API client module
│   │   ├── utils/               # Currency, date, and icon helpers
│   │   ├── App.jsx              # Protected & public routing
│   │   ├── main.jsx             # React DOM root entry
│   │   └── index.css            # Tailwind directives
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Node.js + Express REST API Backend
│   ├── src/
│   │   ├── config/              # db.js (MySQL & SQLite adapter), seed.js
│   │   ├── controllers/         # auth, bills, payments, recurring, categories, analytics, reports, settings, ai
│   │   ├── middleware/          # auth.js, rate limiting, error handling
│   │   ├── routes/              # Express API routers
│   │   ├── services/            # scheduler.js (hourly due date and overdue background cron)
│   │   ├── utils/               # statusCalculator.js
│   │   └── server.js            # Server entry point
│   ├── .env.example
│   └── package.json
│
├── database/                    # Database migrations & schemas
│   ├── schema.sql               # Production MySQL DDL
│   ├── seed.sql                 # Default categories & demo records
│   └── migrate.js               # Automated Node.js migration runner
│
├── .gitignore
├── README.md
└── package.json                 # Root script orchestration
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)
- MySQL (Optional for production; embedded mode runs out-of-the-box locally)

### 1. Clone the Repository
```bash
git clone https://github.com/Ritesh2500/MINIPROJECT_BILL.git
cd MINIPROJECT_BILL
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 3. Configure Environment Variables
Inside `server/.env`:
```env
PORT=5000
NODE_ENV=development

# Database Mode
# Use 'sqlite' for zero-config local run, or 'mysql' for MySQL server
DB_TYPE=sqlite

# MySQL Settings (when DB_TYPE=mysql)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=billmate_db

# JWT Authentication
JWT_SECRET=billmate_super_secret_jwt_key_2026_xyz!@#
JWT_EXPIRES_IN=7d

# CORS
CLIENT_URL=http://localhost:5173

# Optional: Google Gemini AI API Key
GEMINI_API_KEY=
```

### 4. Run the Application
```bash
# Starts both Backend (Port 5000) and Frontend (Port 5173) simultaneously:
npm run dev
```

Visit **http://localhost:5173** in your browser!

---

## 🔑 Demo Account Credentials

For instant evaluation without registering a new user:
- **Email**: `demo@billmate.app`
- **Password**: `DemoPass123#`
*(The login page features a 1-click **Autofill** button for convenience)*

---

## 🗄️ Database Setup (MySQL)

If using MySQL in production:
```bash
# Run schema and seed scripts against your MySQL instance:
node database/migrate.js
```
Or import `database/schema.sql` and `database/seed.sql` directly into MySQL Workbench / phpMyAdmin.

---

## 🌐 API Reference

### Authentication
- `POST /api/auth/register` - Create new user account & initialize defaults
- `POST /api/auth/login` - Authenticate & obtain JWT
- `GET /api/auth/me` - Fetch authenticated user profile & settings
- `POST /api/auth/logout` - Invalidate session

### Bills
- `GET /api/bills` - Fetch paginated bills (supports `search`, `category`, `status`, `sortBy`, `sortOrder`)
- `GET /api/bills/summary` - Aggregate metrics (total due, paid, overdue, upcoming)
- `GET /api/bills/:id` - Fetch bill details and payment history
- `POST /api/bills` - Create bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill and its payments

### Payments
- `GET /api/payments` - Retrieve payment transactions ledger
- `POST /api/payments` - Record payment (auto-updates status & generates next recurrence)
- `DELETE /api/payments/:id` - Delete payment transaction & revert bill status

### Analytics & Reports
- `GET /api/analytics/overview` - Paid vs. unpaid distribution, 30-day projection
- `GET /api/analytics/monthly` - Month-by-month spending trend
- `GET /api/analytics/categories` - Category expenditure breakdown
- `GET /api/reports/data` - Filterable JSON report preview
- `GET /api/reports/pdf` - Direct PDF report stream
- `GET /api/reports/excel` - Direct Excel (.xlsx) file stream
- `GET /api/reports/csv` - Direct CSV file stream

### AI Assistant & Insights
- `POST /api/ai/ask` - Ask financial questions to AI / intelligence engine
- `GET /api/ai/insights` - Automated financial audits and risk flags
- `GET /api/ai/predictions` - 3-month projected bill forecast

---

## 🚢 Deployment Guide

### Frontend Deployment (Vercel / Netlify)
1. Push repository to GitHub.
2. Link the repository in **Vercel** or **Netlify**.
3. Set Root Directory to `client`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

### Backend Deployment (Render / Railway)
1. In **Render** or **Railway**, create a new Web Service pointing to `server`.
2. Build command: `npm install`
3. Start command: `node src/server.js`
4. Set environment variables:
   - `NODE_ENV`: `production`
   - `DB_TYPE`: `mysql` (or sqlite with persistent disk)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET`: `<secure-random-string>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`

---

## 📄 License
MIT License. Built for Personal Bill & Payment Management.
