# FaceAtend: Node.js / Express Backend API & Services

This is the server-side REST API and real-time engine for the FaceAtend SaaS attendance tracking platform. Built with Express, TypeScript, PostgreSQL (hosted on Supabase), and Socket.io, it handles secure multitenant isolation, employee records, face matching, location validation, and live notifications.

## Tech Implementation

- **Tenant Isolation**: Isolated multi-tenant queries at the database-query level using safe parametric parameters (`tenant_id`).
- **Euclidean Vector Comparisons**: Native math comparison between incoming biometric scans and registered employee face vectors stored as standard JSON arrays in PostgreSQL.
- **WebSocket Broadcasting**: Live broadcasting of check-in events to company rooms (`tenant_[id]`) using Socket.io to trigger immediate toast popups on the admin control panel.
- **Defensive Engineering**: Handled strict SSL configurations dynamically for hosted PostgreSQL instances, with secure environment parsing.
- **Audit Logging**: Fully integrated audit logging system to track all administrative and employee check-in transactions.

---

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables (.env)**:
   ```env
   PORT=5001
   DATABASE_URL=your_supabase_postgresql_connection_string
   JWT_SECRET=your_jwt_signing_secret
   NODE_ENV=development
   ```
3. **Database Migrations**:
   Run the schema migration and default Super Admin creation:
   ```bash
   npx ts-node src/db/init.ts
   ```
4. **Launch Server (Dev Mode)**:
   ```bash
   npm run dev
   ```
