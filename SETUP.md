# Steakz MIS — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

---

## 1. Database Setup

Open pgAdmin or psql:

```sql
CREATE DATABASE steakz_mis;
```

---

## 2. Backend Setup

```bash
cd backend

# Copy env file and update your DB password
# Edit .env → change DATABASE_URL password

# Install dependencies (already done)
npm install

# Run Prisma migration — creates all tables
npx prisma migrate dev --name init

# Start the backend (auto-seeds data on first run)
npm run dev
```

Backend runs on: http://localhost:3001

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start the frontend
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Demo Accounts

| Role              | Email                              | Password     |
|-------------------|------------------------------------|--------------|
| Admin             | admin@steakz.co.uk                 | admin123     |
| Manager (London)  | sarah.mitchell@steakz.co.uk        | Password1!   |
| Staff (London)    | james.obrien@steakz.co.uk          | Password1!   |
| Senior Leadership | emma.clarke@steakz.co.uk           | Password1!   |

---

## What Gets Seeded Automatically

On first backend start, the database is populated with:
- 3 UK branches (London, Manchester, Birmingham)
- 15 menu items across 5 categories
- Stock items for each branch
- 6 staff accounts across all role levels
- 30 days of realistic sales data for 2 branches
- Daily tasks and compliance records
- 4 alerts (low stock, compliance, system)

---

## Project Structure

```
Steakz/
├── backend/          Express 5 + Prisma 6 + JWT API
│   ├── prisma/       Database schema & migrations
│   └── src/
│       ├── middleware/  JWT auth + request logger
│       ├── routes/      API routes by role
│       └── lib/         Prisma client + seeder
└── frontend/         React 19 + Vite 8 SPA
    └── src/
        ├── context/     AuthContext (JWT state)
        ├── components/  ProtectedRoute, Sidebar, Topbar
        └── pages/       All portal pages by role
```

---

## Access Levels (from Assignment)

| Level   | Roles             | Features                                              |
|---------|-------------------|-------------------------------------------------------|
| Level 1 | OPERATIONAL       | Order entry, stock requests, timesheets, task checklist, compliance logs |
| Level 2 | MANAGEMENT        | Sales dashboard, inventory management, staff hours, alerts |
| Level 3 | SENIOR            | KPI dashboard, analytics, financial reports            |
| Admin   | ADMIN             | All of the above + manage branches, users, menu        |
