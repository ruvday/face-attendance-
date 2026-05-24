# FaceAtend: React Client Dashboard Application

This is the frontend single-page application (SPA) for the FaceAtend SaaS attendance tracking platform. Built with React, TypeScript, Vite, TailwindCSS, and shadcn/ui, it delivers a modern, high-performance, and responsive user experience for Super Admins, Tenant Admins, and Employees.

## Core Implementations

- **Webcam Biometric Interface**: Built using `face-api.js` for scanning, extracting landmarks, and generating face descriptors natively in the browser.
- **Robust Canvas Frame Capturing**: Draws frames to an offscreen canvas to guarantee stable, lag-free face detection on macOS, Windows, and iOS devices.
- **Ultra-Fast Hybrid Model Loader**: Automatically loads face models from the jsDelivr Cloudflare CDN for rapid, cached startup times, with a 100% safe offline local host fallback.
- **Responsive Admin Dashboards**: Modern panels showing live metrics, employee management dialogs, and real-time attendance streams via WebSockets.
- **GPS Coordinates Logging**: Prompting browser geolocations upon scanning to prevent location spoofing.
- **Persistent State Routing**: Zustand store with complete session state persistence in `localStorage`, preventing random logoffs on page refreshes.

---

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```
