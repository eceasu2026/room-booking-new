/**
 * Typed API Client for ASU Conference Hall Booking System
 * Assam Skill University
 *
 * Supports Dual Mode:
 * 1. Full-Stack Node.js + SQLite REST API backend (dev, local server, Docker cloud container).
 * 2. In-Browser Persistent Database Engine (GitHub Pages static hosting, offline mode, zero-backend).
 */

import type {
  AuthSession,
  User,
  Hall,
  Booking,
  HallClosure,
  InAppNotification,
  AuditLog,
  AvailabilityCheckResponse,
  BookingCreationRequest,
  SystemHealth,
  Department,
} from '../types/index.ts';
import { browserEngine } from './browserEngine.ts';

const TOKEN_KEY = 'asu_session_token';
const USER_KEY = 'asu_session_user';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (API_BASE) return false;
  if (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:') {
    return true;
  }
  if (localStorage.getItem('asu_mode') === 'browser') {
    return true;
  }
  return false;
}

function getActiveUser(): User {
  const stored = getStoredUser();
  if (stored) return stored;
  const users = browserEngine.getUsers().users;
  return users[0];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // In static GitHub hosting, API paths return 404 HTML fallback
      if (response.status === 404 || !response.ok) {
        localStorage.setItem('asu_mode', 'browser');
        throw new Error('Static host detected (falling back to browser persistence engine)');
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `HTTP error ${response.status}`);
      (error as any).status = response.status;
      (error as any).conflict = data.conflict;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    // If network fetch fails (e.g. static hosting without API server)
    if (!API_BASE && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Static host'))) {
      localStorage.setItem('asu_mode', 'browser');
    }
    throw err;
  }
}

export const api = {
  // Setup & Health
  getSetupStatus: async () => {
    if (isStaticHost()) {
      return browserEngine.getSetupStatus();
    }
    try {
      return await request<{ is_setup_required: boolean; university: string }>('/api/v1/setup/status');
    } catch {
      return browserEngine.getSetupStatus();
    }
  },

  initSetup: async (payload: {
    admin_username: string;
    admin_display_name: string;
    admin_password: string;
    hall_name?: string;
    hall_capacity?: number;
    initial_departments?: Array<{ name: string; code: string }>;
  }) => {
    if (isStaticHost()) {
      const res = browserEngine.initSetup(payload);
      setStoredToken(res.token);
      setStoredUser(res.admin_user);
      return res;
    }
    try {
      const res = await request<{ success: boolean; admin_user: User; token: string }>('/api/v1/setup/init', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredUser(res.admin_user);
      return res;
    } catch {
      const res = browserEngine.initSetup(payload);
      setStoredToken(res.token);
      setStoredUser(res.admin_user);
      return res;
    }
  },

  getHealth: async () => {
    if (isStaticHost()) {
      return browserEngine.getHealth();
    }
    try {
      return await request<SystemHealth>('/api/v1/health');
    } catch {
      return browserEngine.getHealth();
    }
  },

  // Auth
  login: async (username: string, password: string) => {
    if (isStaticHost()) {
      const res = browserEngine.login(username, password);
      setStoredToken(res.token);
      setStoredUser(res.user);
      return res;
    }
    try {
      const res = await request<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setStoredToken(res.token);
      setStoredUser(res.user);
      return res;
    } catch (err) {
      if (localStorage.getItem('asu_mode') === 'browser') {
        const res = browserEngine.login(username, password);
        setStoredToken(res.token);
        setStoredUser(res.user);
        return res;
      }
      throw err;
    }
  },

  logout: async () => {
    setStoredToken(null);
    setStoredUser(null);
    if (isStaticHost()) {
      return { success: true };
    }
    try {
      return await request<{ success: boolean }>('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      return { success: true };
    }
  },

  getMe: async () => {
    if (isStaticHost()) {
      const stored = getStoredUser();
      if (!stored) throw new Error('Not authenticated');
      return { user: stored };
    }
    try {
      const res = await request<{ user: User }>('/api/v1/auth/me');
      setStoredUser(res.user);
      return res;
    } catch (err) {
      if (localStorage.getItem('asu_mode') === 'browser') {
        const stored = getStoredUser();
        if (stored) return { user: stored };
      }
      throw err;
    }
  },

  changePassword: async (current_password: string, new_password: string) => {
    if (isStaticHost()) {
      return browserEngine.changePassword(current_password, new_password);
    }
    return request<{ success: boolean; message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  // Bookings
  checkAvailability: async (start_at: string, end_at: string, exclude_booking_id?: string) => {
    if (isStaticHost()) {
      return browserEngine.checkAvailability(start_at, end_at, exclude_booking_id);
    }
    try {
      return await request<AvailabilityCheckResponse>('/api/v1/bookings/availability', {
        method: 'POST',
        body: JSON.stringify({ start_at, end_at, exclude_booking_id }),
      });
    } catch {
      return browserEngine.checkAvailability(start_at, end_at, exclude_booking_id);
    }
  },

  createBooking: async (payload: BookingCreationRequest) => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.createBooking(payload, user);
    }
    try {
      const idempotencyKey = crypto.randomUUID();
      return await request<{ success: boolean; booking: Booking; message: string }>('/api/v1/bookings', {
        method: 'POST',
        headers: { 'x-idempotency-key': idempotencyKey },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (localStorage.getItem('asu_mode') === 'browser') {
        const user = getActiveUser();
        return browserEngine.createBooking(payload, user);
      }
      throw err;
    }
  },

  listBookings: async (params: {
    status?: string;
    department_id?: string;
    mine_only?: boolean;
    start_date?: string;
    end_date?: string;
    search?: string;
  } = {}) => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.listBookings(params, user);
    }
    try {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      if (params.department_id) searchParams.set('department_id', params.department_id);
      if (params.mine_only) searchParams.set('mine_only', 'true');
      if (params.start_date) searchParams.set('start_date', params.start_date);
      if (params.end_date) searchParams.set('end_date', params.end_date);
      if (params.search) searchParams.set('search', params.search);
      return await request<{ bookings: Booking[] }>(`/api/v1/bookings?${searchParams.toString()}`);
    } catch {
      const user = getActiveUser();
      return browserEngine.listBookings(params, user);
    }
  },

  getBooking: async (id: string) => {
    if (isStaticHost()) {
      return browserEngine.getBooking(id);
    }
    try {
      return await request<{ booking: Booking }>(`/api/v1/bookings/${id}`);
    } catch {
      return browserEngine.getBooking(id);
    }
  },

  cancelBooking: async (id: string, reason: string) => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.cancelBooking(id, reason, user);
    }
    try {
      return await request<{ success: boolean; booking: Booking; message: string }>(`/api/v1/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (err) {
      if (localStorage.getItem('asu_mode') === 'browser') {
        const user = getActiveUser();
        return browserEngine.cancelBooking(id, reason, user);
      }
      throw err;
    }
  },

  // Notifications
  getNotifications: async () => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.getNotifications(user.id);
    }
    try {
      return await request<{ notifications: InAppNotification[]; unread_count: number }>('/api/v1/notifications');
    } catch {
      const user = getActiveUser();
      return browserEngine.getNotifications(user.id);
    }
  },

  markNotificationRead: async (id: string) => {
    if (isStaticHost()) {
      return browserEngine.markNotificationRead(id);
    }
    try {
      return await request<{ success: boolean }>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      return browserEngine.markNotificationRead(id);
    }
  },

  markAllNotificationsRead: async () => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.markAllNotificationsRead(user.id);
    }
    try {
      return await request<{ success: boolean }>('/api/v1/notifications/read-all', { method: 'POST' });
    } catch {
      const user = getActiveUser();
      return browserEngine.markAllNotificationsRead(user.id);
    }
  },

  // Departments
  getDepartments: async () => {
    if (isStaticHost()) {
      return browserEngine.getDepartments();
    }
    try {
      return await request<{ departments: Department[] }>('/api/v1/departments');
    } catch {
      return browserEngine.getDepartments();
    }
  },

  createDepartment: async (name: string, code: string) => {
    if (isStaticHost()) {
      return browserEngine.createDepartment(name, code);
    }
    return request<{ department: Department }>('/api/v1/departments', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    });
  },

  updateDepartment: async (id: string, updates: { name?: string; is_active?: number }) => {
    if (isStaticHost()) {
      return browserEngine.updateDepartment(id, updates);
    }
    return request<{ department: Department }>(`/api/v1/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Users (Admin)
  getUsers: async () => {
    if (isStaticHost()) {
      return browserEngine.getUsers();
    }
    try {
      return await request<{ users: User[] }>('/api/v1/users');
    } catch {
      return browserEngine.getUsers();
    }
  },

  createUser: async (payload: {
    username: string;
    display_name: string;
    password: string;
    role: 'admin' | 'department_user';
    department_id?: string;
    must_change_password?: boolean;
  }) => {
    if (isStaticHost()) {
      return browserEngine.createUser(payload);
    }
    return request<{ user: User }>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (
    id: string,
    updates: {
      display_name?: string;
      department_id?: string | null;
      role?: 'admin' | 'department_user';
      is_active?: number;
    }
  ) => {
    if (isStaticHost()) {
      return browserEngine.updateUser(id, updates);
    }
    return request<{ user: User }>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  resetPassword: async (id: string, new_password: string, must_change_password = false) => {
    if (isStaticHost()) {
      return browserEngine.resetPassword(id, new_password);
    }
    return request<{ success: boolean; message: string }>(`/api/v1/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password, must_change_password }),
    });
  },

  // Settings & Closures
  getHallSettings: async () => {
    if (isStaticHost()) {
      return browserEngine.getHallSettings();
    }
    try {
      return await request<{ hall: Hall }>('/api/v1/settings/hall');
    } catch {
      return browserEngine.getHallSettings();
    }
  },

  updateHallSettings: async (payload: Partial<Hall>) => {
    if (isStaticHost()) {
      return browserEngine.updateHallSettings(payload);
    }
    return request<{ hall: Hall }>('/api/v1/settings/hall', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getClosures: async () => {
    if (isStaticHost()) {
      return browserEngine.getClosures();
    }
    try {
      return await request<{ closures: HallClosure[] }>('/api/v1/closures');
    } catch {
      return browserEngine.getClosures();
    }
  },

  addClosure: async (payload: { start_at: string; end_at: string; reason: string }) => {
    if (isStaticHost()) {
      const user = getActiveUser();
      return browserEngine.addClosure(payload, user);
    }
    return request<{ closure: HallClosure; conflicting_bookings: any[] }>('/api/v1/closures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteClosure: async (id: string) => {
    if (isStaticHost()) {
      return browserEngine.deleteClosure(id);
    }
    return request<{ success: boolean; message: string }>(`/api/v1/closures/${id}`, {
      method: 'DELETE',
    });
  },

  // Reports & Audit
  getUsageReport: async (start_date?: string, end_date?: string) => {
    if (isStaticHost()) {
      return browserEngine.getUsageReport();
    }
    try {
      const params = new URLSearchParams();
      if (start_date) params.set('start_date', start_date);
      if (end_date) params.set('end_date', end_date);
      return await request<any>(`/api/v1/reports/usage?${params.toString()}`);
    } catch {
      return browserEngine.getUsageReport();
    }
  },

  downloadBookingsCsvUrl: (start_date?: string, end_date?: string) => {
    if (isStaticHost()) {
      return browserEngine.getExportCsvBlobUrl(start_date, end_date);
    }
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    return `${API_BASE}/api/v1/reports/bookings/export?${params.toString()}`;
  },

  getAuditLogs: async (limit = 100) => {
    if (isStaticHost()) {
      return browserEngine.getAuditLogs();
    }
    try {
      return await request<{ audit_logs: AuditLog[] }>(`/api/v1/audit-logs?limit=${limit}`);
    } catch {
      return browserEngine.getAuditLogs();
    }
  },
};
