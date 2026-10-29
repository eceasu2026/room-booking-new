/**
 * Express REST API Application for ASU Conference Hall Booking System
 * Assam Skill University
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  isSetupRequired,
  initializeSystem,
  login,
  validateSessionToken,
  invalidateSession,
  changePassword,
} from './services/authService.ts';
import {
  checkAvailability,
  createBooking,
  getBookingById,
  cancelBooking,
  listBookings,
  getHallSettings,
  updateHallSettings,
} from './services/bookingService.ts';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  listClosures,
  addClosure,
  deleteClosure,
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  listAuditLogs,
  getUsageReport,
  exportBookingsCsv,
  getSystemHealth,
} from './services/adminService.ts';
import type { User } from '../types/index.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export const app = express();

app.use(express.json());

// Extract authorization token from Authorization: Bearer <token> or X-Session-Token
app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']).trim();
  }

  if (token) {
    req.token = token;
    const user = validateSessionToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
});

// Middleware: Require authentication
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

// Middleware: Require administrator role
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access forbidden: Administrator privileges required.' });
    return;
  }
  next();
}

// ----------------------------------------------------------------------
// SYSTEM SETUP & HEALTH
// ----------------------------------------------------------------------
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json(getSystemHealth());
});

app.get('/api/v1/setup/status', (_req: Request, res: Response) => {
  res.json({
    is_setup_required: isSetupRequired(),
    university: 'Assam Skill University',
  });
});

app.post('/api/v1/setup/init', (req: Request, res: Response) => {
  try {
    const result = initializeSystem(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Setup initialization failed.' });
  }
});

// ----------------------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------------------
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  try {
    const session = login(username, password);
    res.json(session);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid credentials.' });
  }
});

app.post('/api/v1/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    invalidateSession(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/v1/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/v1/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  try {
    changePassword(req.user!.id, current_password, new_password);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to change password.' });
  }
});

// ----------------------------------------------------------------------
// BOOKINGS & AVAILABILITY
// ----------------------------------------------------------------------
app.post('/api/v1/bookings/availability', (req: Request, res: Response) => {
  const { start_at, end_at, exclude_booking_id } = req.body;
  if (!start_at || !end_at) {
    res.status(400).json({ error: 'start_at and end_at timestamps are required.' });
    return;
  }

  try {
    const result = checkAvailability(start_at, end_at, exclude_booking_id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/v1/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { status, department_id, start_date, end_date, search } = req.query as Record<string, string>;

  // Department isolation for non-admins if requested, or enforce department filter
  let effectiveDepartmentId: string | undefined = department_id;
  if (req.user!.role !== 'admin' && req.query.mine_only === 'true') {
    effectiveDepartmentId = req.user!.department_id || undefined;
  }

  try {
    const bookings = listBookings({
      status,
      department_id: effectiveDepartmentId,
      start_date,
      end_date,
      search,
    });
    res.json({ bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/bookings/:id', requireAuth, (req: Request, res: Response) => {
  const booking = getBookingById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  res.json({ booking });
});

app.post('/api/v1/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

  try {
    const result = createBooking(
      {
        ...req.body,
        idempotency_key: idempotencyKey || req.body.idempotency_key,
      },
      req.user!
    );
    res.status(201).json(result);
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message,
      conflict: err.conflict || null,
    });
  }
});

app.post('/api/v1/bookings/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  try {
    const booking = cancelBooking(req.params.id, reason, req.user!);
    res.json({ success: true, booking, message: 'Booking successfully cancelled.' });
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------------------
app.get('/api/v1/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifications = listUserNotifications(req.user!.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  res.json({ notifications, unread_count: unreadCount });
});

app.patch('/api/v1/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success: true });
});

app.post('/api/v1/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------
// DEPARTMENTS
// ----------------------------------------------------------------------
app.get('/api/v1/departments', (_req: Request, res: Response) => {
  res.json({ departments: listDepartments() });
});

app.post('/api/v1/departments', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, code } = req.body;
  try {
    const department = createDepartment(name, code, req.user!.id);
    res.status(201).json({ department });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/v1/departments/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const department = updateDepartment(req.params.id, req.body, req.user!.id);
    res.json({ department });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// USERS (ADMIN ONLY)
// ----------------------------------------------------------------------
app.get('/api/v1/users', requireAdmin, (_req: Request, res: Response) => {
  res.json({ users: listUsers() });
});

app.post('/api/v1/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = createUser(req.body, req.user!.id);
    res.status(201).json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/v1/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = updateUser(req.params.id, req.body, req.user!.id);
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/users/:id/reset-password', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { new_password, must_change_password } = req.body;
  try {
    resetUserPassword(req.params.id, new_password, Boolean(must_change_password), req.user!.id);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// HALL SETTINGS & CLOSURES
// ----------------------------------------------------------------------
app.get('/api/v1/settings/hall', (_req: Request, res: Response) => {
  res.json({ hall: getHallSettings() });
});

app.patch('/api/v1/settings/hall', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const hall = updateHallSettings(req.body, req.user!.id);
    res.json({ hall });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/v1/closures', (_req: Request, res: Response) => {
  res.json({ closures: listClosures() });
});

app.post('/api/v1/closures', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = addClosure(req.body, req.user!.id);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/v1/closures/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    deleteClosure(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Closure removed.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// REPORTS & AUDIT LOGS
// ----------------------------------------------------------------------
app.get('/api/v1/reports/usage', requireAdmin, (req: Request, res: Response) => {
  const { start_date, end_date } = req.query as Record<string, string>;
  res.json(getUsageReport(start_date, end_date));
});

app.get('/api/v1/reports/bookings/export', requireAdmin, (req: Request, res: Response) => {
  const { start_date, end_date } = req.query as Record<string, string>;
  const csv = exportBookingsCsv(start_date, end_date);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="asu_conference_hall_bookings.csv"');
  res.send(csv);
});

app.get('/api/v1/audit-logs', requireAdmin, (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({ audit_logs: listAuditLogs(limit) });
});
