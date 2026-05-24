# FaceAtend: SaaS Multi-Tenant Biometric Attendance System

FaceAtend is a production-grade, enterprise-ready Software-as-a-Service (SaaS) platform designed for multi-tenant biometric employee attendance tracking. By combining real-time face recognition, GPS location logging, and device fingerprinting, FaceAtend offers a secure, spoof-proof solution for managing personnel.

## Core Features

- **Multi-Tenant SaaS Architecture**: Complete database-level isolation of tenant schemas, allowing multiple companies/organizations to safely host their operations on a single unified platform.
- **Biometric Face Recognition**: Real-time browser-based facial scanning and feature extraction built using standard neural networks (SSD Mobilenet v1 & Face Landmarks). All facial biometric vectors are stored as secure high-dimensional descriptors in PostgreSQL.
- **Real-Time Attendance Stream**: Live event broadcasting to company dashboards powered by WebSockets (`Socket.io`) for instantaneous notifications on check-in activities.
- **GPS Location & Fraud Prevention**: Automatic geolocation logging mapping check-ins directly to Google Maps, ensuring field employees mark attendance from approved zones.
- **Device Fingerprinting**: Captures unique device signatures to prevent identity spoofing or sharing check-in links.
- **Unified Auth & RBAC**: Highly robust role-based access control (Super Admin, Tenant/Company Admin, and Employee) backed by secure JWT authentication.

---

## Tech Stack

### Frontend
- **Framework**: React.js with TypeScript & Vite
- **Styling**: TailwindCSS & shadcn/ui components
- **State Management**: Zustand
- **Biometrics Engine**: `face-api.js`
- **Networking**: Axios & Socket.io client

### Backend
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **Database**: PostgreSQL (Hosted on Supabase)
- **Authentication**: JSON Web Tokens (JWT) & bcrypt hashing
- **Real-time Engine**: Socket.io

---

## Directory Structure

```bash
├── backend/            # Express REST API, Socket.io server, & Database migrations
└── frontend/           # React dashboard SPA, webcam biometrics, & admin control panels
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   PORT=5001
   DATABASE_URL=your_supabase_postgresql_connection_string
   JWT_SECRET=your_jwt_signing_secret
   NODE_ENV=development
   ```
4. Run migrations and seed default Super Admin (`admin@faceatend.com` / `superadmin123`):
   ```bash
   npx ts-node src/db/init.ts
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser at `http://localhost:5173`.
