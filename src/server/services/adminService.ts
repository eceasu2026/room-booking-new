/**
 * Administration, Management, Notifications, and Reports Service
 * Assam Skill University Conference Hall Booking System
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, getDatabaseStats } from '../db/database.ts';
import type {
  Department,
  User,
  HallClosure,
  InAppNotification,
  AuditLog,
  SystemHealth,
} from '../../types/index.ts';

// ----------------------------------------------------
// DEPARTMENTS
// ----------------------------------------------------
export function listDepartments(): Department[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT d.*,
           (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = 1) as user_count,
           (SELECT COUNT(*) FROM bookings b WHERE b.department_id = d.id AND b.status = 'CONFIRMED') as booking_count
    FROM departments d
    ORDER BY d.name ASC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    is_active: Number(r.is_active),
    created_at: r.created_at,
    updated_at: r.updated_at,
    user_count: Number(r.user_count || 0),
    booking_count: Number(r.booking_count || 0),
  }));
}

export function createDepartment(name: string, code: string, actorId: string): Department {
  const db = getDatabase();
  const trimmedName = name.trim();
  const trimmedCode = code.trim().toUpperCase();

  if (trimmedName.length < 2) throw new Error('Department name must be at least 2 characters.');
  if (trimmedCode.length < 2) throw new Error('Department code must be at least 2 characters.');

  const existing = db.prepare('SELECT id FROM departments WHERE UPPER(code) = ?').get(trimmedCode);
  if (existing) {
    throw new Error(`A department with code "${trimmedCode}" already exists.`);
  }

  const id = 'dept-' + trimmedCode.toLowerCase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO departments (id, name, code, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(id, trimmedName, trimmedCode, now, now);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'DEPARTMENT_CREATED', 'DEPARTMENT', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify({ name: trimmedName, code: trimmedCode }), now);

  return {
    id,
    name: trimmedName,
    code: trimmedCode,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

export function updateDepartment(id: string, updates: { name?: string; is_active?: number }, actorId: string): Department {
  const db = getDatabase();
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as any;
  if (!dept) throw new Error('Department not found.');

  const now = new Date().toISOString();
  const name = updates.name !== undefined ? updates.name.trim() : dept.name;
  const is_active = updates.is_active !== undefined ? updates.is_active : dept.is_active;

  db.prepare(`
    UPDATE departments SET name = ?, is_active = ?, updated_at = ? WHERE id = ?
  `).run(name, is_active, now, id);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'DEPARTMENT_UPDATED', 'DEPARTMENT', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify(updates), now);

  return {
    id,
    name,
    code: dept.code,
    is_active,
    created_at: dept.created_at,
    updated_at: now,
  };
}

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
export function listUsers(): User[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.created_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    display_name: r.display_name,
    role: r.role as any,
    department_id: r.department_id,
    department_name: r.department_name || undefined,
    department_code: r.department_code || undefined,
    is_active: Number(r.is_active),
    must_change_password: Number(r.must_change_password),
    created_at: r.created_at,
    updated_at: r.updated_at,
    last_login_at: r.last_login_at,
  }));
}

export function createUser(payload: {
  username: string;
  display_name: string;
  password: string;
  role: 'admin' | 'department_user';
  department_id?: string;
  must_change_password?: boolean;
}, actorId: string): User {
  const db = getDatabase();
  const username = payload.username.trim().toLowerCase();
  const displayName = payload.display_name.trim();

  if (username.length < 3) throw new Error('Username must be at least 3 characters.');
  if (displayName.length < 2) throw new Error('Display name must be at least 2 characters.');
  if (payload.password.length < 6) throw new Error('Password must be at least 6 characters.');

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username);
  if (existing) throw new Error(`User with username "${username}" already exists.`);

  if (payload.role === 'department_user' && !payload.department_id) {
    throw new Error('Department users must be assigned to an active department.');
  }

  const id = 'user-' + crypto.randomUUID().slice(0, 8);
  const passwordHash = bcrypt.hashSync(payload.password, 10);
  const now = new Date().toISOString();
  const mustChange = payload.must_change_password ? 1 : 0;

  db.prepare(`
    INSERT INTO users (
      id, username, display_name, password_hash, role,
      department_id, is_active, must_change_password,
      created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NULL)
  `).run(
    id,
    username,
    displayName,
    passwordHash,
    payload.role,
    payload.department_id || null,
    mustChange,
    now,
    now
  );

  // Send welcome in-app notification
  db.prepare(`
    INSERT INTO notifications (id, recipient_user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, 'ACCOUNT_CREATED', 'Welcome to ASU Conference Hall Booking System', 'Your account has been created by the administrator. You may now book conference hall facilities.', 0, ?)
  `).run('notif-' + crypto.randomUUID().slice(0, 8), id, now);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'USER_CREATED', 'USER', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify({ username, role: payload.role }), now);

  const created = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(id) as any;

  return {
    id: created.id,
    username: created.username,
    display_name: created.display_name,
    role: created.role,
    department_id: created.department_id,
    department_name: created.department_name,
    department_code: created.department_code,
    is_active: Number(created.is_active),
    must_change_password: Number(created.must_change_password),
    created_at: created.created_at,
    updated_at: created.updated_at,
    last_login_at: null,
  };
}

export function updateUser(id: string, updates: {
  display_name?: string;
  department_id?: string | null;
  role?: 'admin' | 'department_user';
  is_active?: number;
}, actorId: string): User {
  const db = getDatabase();
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!current) throw new Error('User not found.');

  const now = new Date().toISOString();
  const displayName = updates.display_name !== undefined ? updates.display_name.trim() : current.display_name;
  const deptId = updates.department_id !== undefined ? updates.department_id : current.department_id;
  const role = updates.role !== undefined ? updates.role : current.role;
  const isActive = updates.is_active !== undefined ? updates.is_active : current.is_active;

  db.prepare(`
    UPDATE users SET display_name = ?, department_id = ?, role = ?, is_active = ?, updated_at = ? WHERE id = ?
  `).run(displayName, deptId, role, isActive, now, id);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'USER_UPDATED', 'USER', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify(updates), now);

  const updated = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(id) as any;

  return {
    id: updated.id,
    username: updated.username,
    display_name: updated.display_name,
    role: updated.role,
    department_id: updated.department_id,
    department_name: updated.department_name,
    department_code: updated.department_code,
    is_active: Number(updated.is_active),
    must_change_password: Number(updated.must_change_password),
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    last_login_at: updated.last_login_at,
  };
}

export function resetUserPassword(userId: string, newPassword: string, forceChange: boolean, actorId: string): void {
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
  const db = getDatabase();
  const hash = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET password_hash = ?, must_change_password = ?, updated_at = ? WHERE id = ?
  `).run(hash, forceChange ? 1 : 0, now, userId);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'ADMIN_RESET_PASSWORD', 'USER', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, userId, JSON.stringify({ force_change: forceChange }), now);
}

// ----------------------------------------------------
// CLOSURES (Maintenance / Holidays)
// ----------------------------------------------------
export function listClosures(): HallClosure[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT c.*, h.name as hall_name, u.display_name as created_by_name
    FROM closures c
    LEFT JOIN halls h ON c.hall_id = h.id
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.start_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    hall_id: r.hall_id,
    hall_name: r.hall_name || 'Central Conference Hall',
    start_at: r.start_at,
    end_at: r.end_at,
    reason: r.reason,
    created_by: r.created_by,
    created_by_name: r.created_by_name,
    created_at: r.created_at,
  }));
}

export function addClosure(payload: {
  start_at: string;
  end_at: string;
  reason: string;
}, actorId: string): { closure: HallClosure; conflicting_bookings: any[] } {
  const db = getDatabase();
  const start = new Date(payload.start_at);
  const end = new Date(payload.end_at);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error('Invalid closure start or end time.');
  }
  if (!payload.reason || payload.reason.trim().length < 3) {
    throw new Error('Closure reason must be specified.');
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // Check if any confirmed bookings exist in this interval
  const conflicts = db.prepare(`
    SELECT b.id, b.booking_code, b.event_title, b.start_at, b.end_at, d.name as department_name
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    WHERE b.hall_id = 'hall-main'
      AND b.status = 'CONFIRMED'
      AND b.start_at < ?
      AND b.end_at > ?
  `).all(endIso, startIso) as any[];

  const id = 'close-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO closures (id, hall_id, start_at, end_at, reason, created_by, created_at)
    VALUES (?, 'hall-main', ?, ?, ?, ?, ?)
  `).run(id, startIso, endIso, payload.reason.trim(), actorId, now);

  // Broadcast notification to all active users regarding closure
  const allUsers = db.prepare("SELECT id FROM users WHERE is_active = 1").all() as any[];
  const notifStmt = db.prepare(`
    INSERT INTO notifications (id, recipient_user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, 'HALL_CLOSURE', 'Central Conference Hall Closure Notice', ?, 0, ?)
  `);

  for (const u of allUsers) {
    notifStmt.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      u.id,
      `Conference Hall will be closed from ${new Date(payload.start_at).toLocaleString()} to ${new Date(payload.end_at).toLocaleString()} for: ${payload.reason.trim()}`,
      now
    );
  }

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'CLOSURE_ADDED', 'CLOSURE', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify({ reason: payload.reason, conflicts_count: conflicts.length }), now);

  return {
    closure: {
      id,
      hall_id: 'hall-main',
      hall_name: 'Central Conference Hall',
      start_at: payload.start_at,
      end_at: payload.end_at,
      reason: payload.reason.trim(),
      created_by: actorId,
      created_at: now,
    },
    conflicting_bookings: conflicts,
  };
}

export function deleteClosure(id: string, actorId: string): void {
  const db = getDatabase();
  const closure = db.prepare('SELECT * FROM closures WHERE id = ?').get(id) as any;
  if (!closure) throw new Error('Closure not found.');

  db.prepare('DELETE FROM closures WHERE id = ?').run(id);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'CLOSURE_DELETED', 'CLOSURE', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, id, JSON.stringify(closure), now);
}

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------
export function listUserNotifications(userId: string): InAppNotification[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE recipient_user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    recipient_user_id: r.recipient_user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    related_booking_id: r.related_booking_id,
    is_read: Number(r.is_read),
    created_at: r.created_at,
    read_at: r.read_at,
  }));
}

export function markNotificationAsRead(id: string, userId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notifications SET is_read = 1, read_at = ?
    WHERE id = ? AND recipient_user_id = ?
  `).run(now, id, userId);
}

export function markAllNotificationsAsRead(userId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notifications SET is_read = 1, read_at = ?
    WHERE recipient_user_id = ? AND is_read = 0
  `).run(now, userId);
}

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------
export function listAuditLogs(limit = 100): AuditLog[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT a.*, u.display_name as actor_name
    FROM audit_logs a
    LEFT JOIN users u ON a.actor_user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    actor_user_id: r.actor_user_id,
    actor_name: r.actor_name || 'System / Auto',
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    details_json: r.details_json,
    details: JSON.parse(r.details_json || '{}'),
    created_at: r.created_at,
  }));
}

// ----------------------------------------------------
// REPORTS & EXCEL-COMPATIBLE CSV EXPORT
// ----------------------------------------------------
export function getUsageReport(startDate?: string, endDate?: string) {
  const db = getDatabase();
  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ' AND b.end_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND b.start_at <= ?';
    params.push(endDate);
  }

  // Total confirmed bookings & cancelled bookings
  const summary = db.prepare(`
    SELECT
      COUNT(CASE WHEN b.status = 'CONFIRMED' THEN 1 END) as confirmed_count,
      COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as cancelled_count
    FROM bookings b
    WHERE 1=1 ${dateFilter}
  `).get(...params) as any;

  // Breakdown by department
  const byDepartment = db.prepare(`
    SELECT d.id, d.name as department_name, d.code as department_code,
           COUNT(b.id) as booking_count,
           COALESCE(SUM(
             (strftime('%s', b.end_at) - strftime('%s', b.start_at)) / 3600.0
           ), 0) as total_hours
    FROM departments d
    LEFT JOIN bookings b ON b.department_id = d.id AND b.status = 'CONFIRMED' ${dateFilter}
    GROUP BY d.id, d.name, d.code
    ORDER BY total_hours DESC
  `).all(...params) as any[];

  // Total hours across university
  const totalHours = byDepartment.reduce((sum, item) => sum + Number(item.total_hours || 0), 0);

  // Today's schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = db.prepare(`
    SELECT b.*, d.name as department_name, d.code as department_code
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    WHERE b.status = 'CONFIRMED'
      AND b.start_at LIKE ?
    ORDER BY b.start_at ASC
  `).all(`${todayStr}%`) as any[];

  return {
    confirmed_count: Number(summary?.confirmed_count || 0),
    cancelled_count: Number(summary?.cancelled_count || 0),
    total_hours_booked: Math.round(totalHours * 10) / 10,
    by_department: byDepartment.map((d) => ({
      ...d,
      booking_count: Number(d.booking_count),
      total_hours: Math.round(Number(d.total_hours) * 10) / 10,
    })),
    today_bookings: todayBookings,
  };
}

/**
 * Generates an Excel-compatible CSV string with formula injection sanitization.
 * Prepends a single quote to cells beginning with =, +, -, @ to prevent Excel execution.
 */
export function exportBookingsCsv(startDate?: string, endDate?: string): string {
  const db = getDatabase();
  let sql = `
    SELECT b.booking_code,
           d.name as department_name,
           b.event_title,
           b.organizer_name,
           b.contact_number,
           b.purpose,
           b.participant_count,
           b.start_at,
           b.end_at,
           b.status,
           b.cancellation_reason,
           b.created_at
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) {
    sql += ' AND b.end_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND b.start_at <= ?';
    params.push(endDate);
  }
  sql += ' ORDER BY b.start_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];

  const headers = [
    'Booking ID',
    'Department',
    'Event Title',
    'Organizer Name',
    'Contact Number',
    'Purpose',
    'Participants',
    'Start Time (UTC/ISO)',
    'End Time (UTC/ISO)',
    'Status',
    'Cancellation Reason',
    'Created At',
  ];

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Formula injection mitigation: if field starts with dangerous chars, escape with apostrophe
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // Escape internal quotes
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvLines = [headers.join(',')];
  for (const row of rows) {
    csvLines.push([
      escapeCsv(row.booking_code),
      escapeCsv(row.department_name),
      escapeCsv(row.event_title),
      escapeCsv(row.organizer_name),
      escapeCsv(row.contact_number),
      escapeCsv(row.purpose),
      escapeCsv(row.participant_count),
      escapeCsv(row.start_at),
      escapeCsv(row.end_at),
      escapeCsv(row.status),
      escapeCsv(row.cancellation_reason || 'N/A'),
      escapeCsv(row.created_at),
    ].join(','));
  }

  return csvLines.join('\r\n');
}

// ----------------------------------------------------
// SYSTEM HEALTH
// ----------------------------------------------------
export function getSystemHealth(): SystemHealth {
  const db = getDatabase();
  const dbStats = getDatabaseStats();
  const hall = db.prepare('SELECT name FROM halls WHERE id = ?').get('hall-main') as any;
  const count = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'CONFIRMED'").get() as any;

  return {
    status: 'healthy',
    university: 'Assam Skill University',
    hall_name: hall ? hall.name : 'Central Conference Hall',
    database: 'SQLite (WAL Mode, DatabaseSync)',
    database_size_bytes: dbStats.size_bytes,
    uptime_seconds: Math.round(process.uptime()),
    confirmed_bookings_count: Number(count?.count || 0),
    server_time: new Date().toISOString(),
  };
}
