# Assam Skill University — Central Conference Hall Booking System

An enterprise-grade, institutional web application designed for Assam Skill University (ASU). Features multi-department self-service reservations, mathematical double-booking prevention, automatic instant confirmation, Material Design 3 user interface, and complete Windows 11 host deployment instructions.

---

## 1. System Architecture

```
[Web Browsers on Campus/Internet]
           │ HTTPS / VPN
           ▼
[Windows 11 Host PC / Node.js Express Server] (Port 3000)
    ├── Static Material 3 Web Application (React 19 + TypeScript + Vite)
    ├── REST API Engine (/api/v1/*)
    │     ├── Session-Based Authentication & RBAC
    │     ├── Concurrency Lock (BEGIN IMMEDIATE)
    │     ├── Overlap Rule: new_start < existing_end AND new_end > existing_start
    │     └── Persistent In-App Notifications
    └── Embedded Database: ./data/asu_conference.sqlite (WAL Mode)
```

---

## 2. Key Features

- **Strict Automatic Confirmation**: No administrative bottlenecks. Whenever an eligible time slot is free and adheres to university booking hours, the reservation is confirmed instantly with an official booking voucher.
- **Zero Double-Bookings**: Guaranteed by atomic SQLite `BEGIN IMMEDIATE` transaction write locks and mathematical interval evaluation.
- **Department Isolation & RBAC**: Department users only manage their department's reservations, while administrators oversee university-wide schedules, user accounts, and emergency closures.
- **First-Run Setup Wizard**: On initial startup, guides the university administrator through configuring credentials, hall capacity, operating hours, and seeding departments.
- **Interactive Multi-View Calendar**: Month, Week, Day Timeline, and Agenda list views with direct click-to-book capabilities.
- **Reports & Safe CSV Export**: Audit-ready reports with Microsoft Excel formula injection mitigation.
- **In-App Persistent Notifications**: Real-time notifications for confirmations, cancellations, and maintenance notices.

---

## 3. Quick Test Accounts

The system comes pre-seeded with test credentials for instant evaluation across 3 departments:

| Account | Username | Password | Role |
| :--- | :--- | :--- | :--- |
| **University Administrator** | `admin` | `Admin@ASU2026` | Master Administrator |
| **Computer Science Dept** | `cse_user` | `Dept@123` | Department Coordinator |
| **Mechanical Engineering** | `me_user` | `Dept@123` | Department Coordinator |
| **Electrical Engineering** | `ee_user` | `Dept@123` | Department Coordinator |

---

## 4. Windows 11 Production Host Deployment

### Prerequisites
1. **Windows 11** (or Windows 10/Server 2022)
2. **Node.js LTS** (v20 or v22) from [nodejs.org](https://nodejs.org)

### Installation Steps
1. Place the project folder on the Windows host computer (e.g., `C:\ASU-Conference-Booking`).
2. Run the automated installer:
   ```cmd
   deployment\setup-windows.bat
   ```
   *This automatically runs `npm install` and compiles the optimized frontend into `/dist`.*
3. Launch the application server:
   ```cmd
   deployment\start-asu-booking.bat
   ```
4. Access the system in your browser:
   - Application URL: `http://localhost:3000`
   - Health Status: `http://localhost:3000/api/v1/health`

### Windows Task Scheduler (Auto-Start on Boot)
To ensure the booking portal restarts automatically if the Windows host computer reboots:
1. Open **Task Scheduler** on Windows 11 (`taskschd.msc`).
2. Click **Action** > **Import Task...**
3. Select `deployment/windows-task-scheduler-sample.xml`.
4. Adjust the path to `deployment\start-asu-booking.bat` to match your installation directory.
5. Click **OK**. The booking service will now start automatically in the background on system startup.

---

## 5. Secure Cross-Building & Remote Access

To allow departments across different university buildings or off-campus networks to access the booking system securely:

### Option A: University Intranet / Local Campus Network (Recommended)
1. Open Windows Defender Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "ASU Conference Booking" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
2. Note the host computer's static campus IP (e.g., `192.168.10.50`).
3. Department coordinators navigate to `http://192.168.10.50:3000`.

### Option B: Cloudflare Zero Trust Tunnel (Free & Institution-Approved)
1. Install `cloudflared` on the host PC.
2. Run `cloudflared tunnel --url http://localhost:3000`.
3. Provide your secure HTTPS domain (e.g., `https://conference.asu.ac.in`).

### Option C: Institutional VPN / Tailscale
1. Install Tailscale on the host PC and authorized department workstations.
2. Access the host via its secure Tailscale IP with end-to-end WireGuard encryption.

---

## 6. Automated Database Backups & Recovery

### Daily Backup Execution
Run the PowerShell backup script:
```powershell
powershell -ExecutionPolicy Bypass -File deployment\backup-db.ps1
```
Backups are placed in `./backups/` and automatically rotated after 30 days.

### Restoring from Backup
```powershell
powershell -ExecutionPolicy Bypass -File deployment\restore-db.ps1
```
The script will prompt to choose the snapshot and cleanly restore the active database.

---

## 7. Concurrency & Overlap Prevention Logic

The backend prevents race conditions and simultaneous double-bookings using SQLite write locks and mathematical interval evaluation:

```sql
BEGIN IMMEDIATE;
-- Overlap condition for requested interval [new_start, new_end]:
SELECT id FROM bookings
WHERE hall_id = 'hall-main'
  AND status = 'CONFIRMED'
  AND start_at < :buffered_end
  AND end_at > :buffered_start;
```
If an overlap exists, the transaction rolls back immediately with `HTTP 409 Conflict`. If clear, the booking is committed as `CONFIRMED`.

---

## 8. GitHub Hosting & Deployment

The application includes first-class support for hosting on GitHub:

1. **GitHub Pages (Free Static Hosting)**:
   - Configured with `base: './'` in `vite.config.ts`.
   - Automated deployment via `.github/workflows/deploy-pages.yml`.
   - Runs in-browser persistence engine (`browserEngine.ts`) with zero backend required.
   - Simply change **Settings** > **Pages** > **Source** to **GitHub Actions**.

2. **Full-Stack Cloud Hosting from GitHub (Docker / Render / Railway)**:
   - Includes production multi-stage `Dockerfile`.
   - Persistent volume on `/app/data` for SQLite database.

For complete step-by-step instructions, see **[GITHUB_HOSTING_GUIDE.md](./GITHUB_HOSTING_GUIDE.md)**.
