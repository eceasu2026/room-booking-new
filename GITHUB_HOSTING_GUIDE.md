# Assam Skill University — Conference Hall Booking System
## Comprehensive GitHub Hosting & Deployment Guide

This guide provides step-by-step instructions to host and deploy the **ASU Conference Hall Booking System** using GitHub.

---

## 1. Hosting Architecture Overview

The system is architected with **dual-mode flexibility**, allowing you to choose between two GitHub deployment options depending on your institutional infrastructure:

| Feature | Option A: GitHub Pages (Instant Free Static Hosting) | Option B: Full-Stack Hybrid (GitHub Pages + Cloud Backend) | Option C: 1-Click Container Deployment (Render / Railway from GitHub) |
| :--- | :--- | :--- | :--- |
| **Server Cost** | ₹0 / Completely Free | ₹0 Free Tier / Low Cost | Free Tier / Low Cost |
| **Hosting Platform** | GitHub Pages (`username.github.io/repo`) | Frontend on GitHub Pages + Backend on Cloud / On-Prem | Render / Railway / Fly.io / ASU VPS via GitHub |
| **Database** | In-Browser Persistent Storage (localStorage engine with automatic clash prevention) | Central SQLite / PostgreSQL Database on server | Central SQLite with WAL mode & automated backups |
| **Multi-Device Live Sync** | Per-device / departmental storage | Real-time shared across all university departments & networks | Real-time shared across all university departments & networks |
| **Setup Effort** | 2 minutes (Automated via GitHub Actions) | 5–10 minutes | 5 minutes |

---

## 2. Option A: Hosting on GitHub Pages (Recommended for Quick Launch & Demos)

### Step 1: Initialize Git and Push to GitHub
Open your terminal (PowerShell or Bash) in the project folder and run:

```bash
# 1. Initialize local Git repository
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "feat: ASU Conference Hall Booking System initial release"

# 4. Set main branch
git branch -M main

# 5. Link to your GitHub repository (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/asu-conference-booking.git

# 6. Push code to GitHub
git push -u origin main
```

---

### Step 2: Enable GitHub Pages in Repository Settings
Once pushed, configure GitHub Pages to use the automated workflow:

1. Open your repository on GitHub: `https://github.com/YOUR_GITHUB_USERNAME/asu-conference-booking`
2. Click on **Settings** (top navigation tab with the gear icon).
3. In the left sidebar, click on **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** -> **Source**:
   - Change the dropdown from `Deploy from a branch` to **`GitHub Actions`**.
5. Go to the **Actions** tab of your repository. You will see the **Deploy to GitHub Pages** workflow running.
6. When the checkmark turns green (typically 45–60 seconds), your app is live at:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/asu-conference-booking/
   ```

> **Why this works out of the box:**
> - `vite.config.ts` includes `base: './'`, ensuring assets never 404 under repository subpaths (`/asu-conference-booking/`).
> - The automated workflow `.github/workflows/deploy-pages.yml` builds with Node 22 and deploys `./dist` to GitHub's global CDN.
> - The frontend automatically detects static hosting and runs `browserEngine.ts`, providing booking validation, immediate confirmation codes (`ASU-CONF-2026-XXXX`), printable vouchers, department logins, and reports without needing an external server.

---

## 3. Option B: Hybrid Setup (GitHub Pages Frontend + Live Backend)

If you want the frontend hosted for free on GitHub Pages while connecting all campus buildings and departments to a **single central backend**:

### Step 1: Deploy the Backend API
You can run the backend either on:
- A campus PC / Windows 11 host using our provided scripts in `/deployment/` (`setup-windows.bat` + `start-asu-booking.bat`).
- Or free cloud hosting (Render.com, Railway.app, or Fly.io).

### Step 2: Point GitHub Pages to your Live Backend
1. On GitHub, go to your repository **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository variable**.
3. Name: `VITE_API_BASE_URL`
4. Value: `https://your-asu-api.onrender.com` (or your university backend domain).
5. Trigger a workflow re-run in the **Actions** tab. The frontend will now automatically communicate with your live server while being hosted on GitHub Pages!

---

## 4. Option C: 1-Click Cloud Hosting from GitHub (Render / Railway)

If you want the entire full-stack application (frontend + Express + centralized SQLite database) hosted online from your GitHub repo:

### Deploying to Render.com:
1. Log in to [Render.com](https://render.com) using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Select your `asu-conference-booking` repository.
4. Render will detect the included `Dockerfile`:
   - **Environment**: Docker
   - **Region**: Singapore or nearest cloud region
   - **Plan**: Free / Starter
5. Under **Disks** (optional for persistence):
   - Mount Path: `/app/data`
   - Size: 1 GB
6. Click **Create Web Service**. Render will pull your GitHub repository, build the Docker container, and give you a public URL (e.g., `https://asu-booking.onrender.com`).

---

## 5. Default Institutional Credentials

The system comes pre-configured with the initial departments confirmed for Phase 1:

| Role | Username | Password | Department |
| :--- | :--- | :--- | :--- |
| **University Administrator** | `admin` | `Admin@ASU2026` | Institutional Admin (Full Access) |
| **Department User** | `cse_user` | `Dept@123` | Computer Science & Engineering |
| **Department User** | `me_user` | `Dept@123` | Mechanical Engineering |
| **Department User** | `ee_user` | `Dept@123` | Electrical Engineering |

*(Administrators can add additional departments and users at any time via the User Management panel).*

---

## 6. Pre-Flight Verification Checklist

Before announcing the portal to departments, verify:
- [x] **Subpath Asset Resolution**: Assets load correctly with relative paths (`base: './'`).
- [x] **Automatic Confirmation**: Bookings within operating hours (07:00 – 24:00) with no conflicts receive an instant `CONFIRMED` status.
- [x] **Conflict Prevention**: Overlapping requests are blocked with explicit clash diagnostics.
- [x] **Voucher Generation**: Approved bookings display printable confirmation vouchers and PDF/print action.
- [x] **Audit Trail**: Every booking, cancellation, and configuration update is logged.
- [x] **Data Export**: Booking reports can be exported to CSV.

---

## 7. Troubleshooting

### Issue: GitHub Pages shows a 404 or blank screen
- **Solution**: Confirm that in **Settings** -> **Pages**, the **Source** is set to **GitHub Actions** (NOT "Deploy from a branch"). Check the **Actions** tab to ensure the build job finished with a green checkmark.

### Issue: Pushed changes do not show up immediately
- **Solution**: GitHub Actions takes 45–60 seconds to build and invalidate edge cache. Hard refresh your browser using `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac).

### Issue: Want to reset local browser test data
- **Solution**: Open Developer Tools (`F12`), go to **Application** -> **Local Storage**, and clear keys starting with `asu_`.
