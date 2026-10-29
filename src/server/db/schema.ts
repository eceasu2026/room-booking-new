/**
 * SQLite DDL Schema and Initial Migrations
 * Assam Skill University Conference Hall Booking System
 */

export const SCHEMA_SQL = `
-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'department_user')),
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

-- Halls table (Central Conference Hall)
CREATE TABLE IF NOT EXISTS halls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 120,
  facilities_json TEXT NOT NULL DEFAULT '["A/V System", "Dual Projectors", "Video Conferencing", "Podium Mic", "Central AC", "Wi-Fi 6"]',
  opening_time TEXT NOT NULL DEFAULT '08:00',
  closing_time TEXT NOT NULL DEFAULT '20:00',
  min_notice_hours INTEGER NOT NULL DEFAULT 2,
  max_duration_hours INTEGER NOT NULL DEFAULT 8,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  advance_days_horizon INTEGER NOT NULL DEFAULT 60,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bookings table with atomic status
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  hall_id TEXT NOT NULL REFERENCES halls(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  event_title TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  participant_count INTEGER NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'CANCELLED')),
  cancellation_reason TEXT,
  cancelled_by TEXT REFERENCES users(id),
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Closures table (Maintenance / University holidays / Emergency closures)
CREATE TABLE IF NOT EXISTS closures (
  id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(id),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- Persistent In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  read_at TEXT
);

-- Audit Logs for traceability
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- App Settings key-value store
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Idempotency keys to prevent double submissions from network retries
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

-- Indexes for lightning fast overlap queries and filter performance
CREATE INDEX IF NOT EXISTS idx_bookings_interval ON bookings(hall_id, status, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_department ON bookings(department_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_closures_interval ON closures(hall_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;
