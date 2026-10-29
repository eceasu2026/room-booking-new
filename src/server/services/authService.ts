/**
 * Authentication and Session Management Service
 * Assam Skill University Conference Hall Booking System
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database.ts';
import type { User, AuthSession } from '../../types/index.ts';

// In-memory active session token cache mapping to user sessions (with DB verification)
const activeSessions = new Map<string, { user_id: string; expires_at: number }>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isSetupRequired(): boolean {
  const db = getDatabase();
  const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1");
  const result = stmt.get() as { count: number };
  return result.count === 0;
}

export function initializeSystem(payload: {
  admin_username: string;
  admin_display_name: string;
  admin_password: string;
  hall_name?: string;
  hall_capacity?: number;
  opening_time?: string;
  closing_time?: string;
  min_notice_hours?: number;
  buffer_minutes?: number;
  initial_departments?: Array<{ name: string; code: string }>;
}): { success: boolean; admin_user: User; token: string } {
  const db = getDatabase();

  if (!isSetupRequired()) {
    throw new Error('System has already been initialized with an administrator.');
  }

  if (!payload.admin_username || payload.admin_username.trim().length < 3) {
    throw new Error('Administrator username must be at least 3 characters.');
  }
  if (!payload.admin_password || payload.admin_password.length < 6) {
    throw new Error('Administrator password must be at least 6 characters.');
  }

  const now = new Date().toISOString();
  const adminId = 'user-admin-' + crypto.randomUUID().slice(0, 8);
  const passwordHash = bcrypt.hashSync(payload.admin_password, 10);

  db.exec('BEGIN IMMEDIATE;');
  try {
    // 1. Insert Administrator
    const insertAdmin = db.prepare(`
      INSERT INTO users (
        id, username, display_name, password_hash, role,
        department_id, is_active, must_change_password,
        created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, 'admin', NULL, 1, 0, ?, ?, ?)
    `);
    insertAdmin.run(
      adminId,
      payload.admin_username.trim().toLowerCase(),
      payload.admin_display_name.trim() || 'University Administrator',
      passwordHash,
      now,
      now,
      now
    );

    // 2. Seed Initial Departments (Confirmed Phase 1 choice)
    const departments = payload.initial_departments || [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Mechanical Engineering', code: 'ME' },
      { name: 'Electrical Engineering', code: 'EE' },
    ];

    const insertDept = db.prepare(`
      INSERT OR IGNORE INTO departments (id, name, code, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `);

    const insertDeptUser = db.prepare(`
      INSERT OR IGNORE INTO users (
        id, username, display_name, password_hash, role,
        department_id, is_active, must_change_password,
        created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, 'department_user', ?, 1, 0, ?, ?, NULL)
    `);

    for (const dept of departments) {
      const deptId = 'dept-' + dept.code.toLowerCase();
      insertDept.run(deptId, dept.name, dept.code, now, now);

      // Create a default department user account for instant testing
      const deptUsername = dept.code.toLowerCase() + '_user';
      const deptDisplayName = dept.code + ' Department Coordinator';
      const defaultDeptPass = bcrypt.hashSync('Dept@123', 10);
      insertDeptUser.run(
        'user-' + dept.code.toLowerCase(),
        deptUsername,
        deptDisplayName,
        defaultDeptPass,
        deptId,
        now,
        now
      );
    }

    // 3. Update Hall details if provided
    const updateHall = db.prepare(`
      UPDATE halls SET
        name = COALESCE(?, name),
        capacity = COALESCE(?, capacity),
        opening_time = COALESCE(?, opening_time),
        closing_time = COALESCE(?, closing_time),
        min_notice_hours = COALESCE(?, min_notice_hours),
        buffer_minutes = COALESCE(?, buffer_minutes),
        updated_at = ?
      WHERE id = 'hall-main'
    `);
    updateHall.run(
      payload.hall_name || null,
      payload.hall_capacity || null,
      payload.opening_time || null,
      payload.closing_time || null,
      payload.min_notice_hours !== undefined ? payload.min_notice_hours : null,
      payload.buffer_minutes !== undefined ? payload.buffer_minutes : null,
      now
    );

    // 4. Audit Log
    const auditStmt = db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    auditStmt.run(
      'audit-' + crypto.randomUUID().slice(0, 8),
      adminId,
      'SYSTEM_INITIALIZED',
      'SYSTEM',
      adminId,
      JSON.stringify({ admin_username: payload.admin_username, departments_seeded: departments.length }),
      now
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  // Create login session for the newly created admin
  const user = getUserById(adminId)!;
  const token = createSession(adminId);

  return { success: true, admin_user: user, token };
}

export function login(username: string, password: string): AuthSession {
  const db = getDatabase();
  const normalizedUsername = username.trim().toLowerCase();

  const stmt = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE LOWER(u.username) = ? AND u.is_active = 1
  `);

  const row = stmt.get(normalizedUsername) as any;
  if (!row) {
    throw new Error('Invalid username or password.');
  }

  const isPasswordValid = bcrypt.compareSync(password, row.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid username or password.');
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, row.id);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'USER_LOGIN', 'USER', ?, ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), row.id, row.id, JSON.stringify({ username: row.username }), now);

  const token = createSession(row.id);
  const user: User = formatUserRow(row);

  return {
    token,
    user,
    expires_at: Date.now() + SESSION_TTL_MS,
  };
}

export function validateSessionToken(token: string | undefined): User | null {
  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expires_at) {
    activeSessions.delete(token);
    return null;
  }

  const user = getUserById(session.user_id);
  if (!user || !user.is_active) {
    activeSessions.delete(token);
    return null;
  }

  return user;
}

export function invalidateSession(token: string) {
  activeSessions.delete(token);
}

export function getUserById(userId: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `);
  const row = stmt.get(userId) as any;
  if (!row) return null;
  return formatUserRow(row);
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): void {
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const db = getDatabase();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new Error('User not found.');

  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error('Incorrect current password.');
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?
  `).run(newHash, now, userId);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'PASSWORD_CHANGED', 'USER', ?, '{}', ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), userId, userId, now);
}

function createSession(userId: string): string {
  const token = 'asu_s_' + crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    user_id: userId,
    expires_at: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function formatUserRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role as any,
    department_id: row.department_id,
    department_name: row.department_name || undefined,
    department_code: row.department_code || undefined,
    is_active: Number(row.is_active),
    must_change_password: Number(row.must_change_password),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at,
  };
}
