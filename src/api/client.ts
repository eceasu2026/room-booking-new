/**
 * Typed API Client for ASU Conference Hall Booking System
 * Assam Skill University
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

const TOKEN_KEY = 'asu_session_token';

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    (error as any).status = response.status;
    (error as any).conflict = data.conflict;
    throw error;
  }

  return data as T;
}

export const api = {
  // Setup & Health
  getSetupStatus: () => request<{ is_setup_required: boolean; university: string }>('/api/v1/setup/status'),
  initSetup: (payload: {
    admin_username: string;
    admin_display_name: string;
    admin_password: string;
    hall_name?: string;
    hall_capacity?: number;
    initial_departments?: Array<{ name: string; code: string }>;
  }) => request<{ success: boolean; admin_user: User; token: string }>('/api/v1/setup/init', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getHealth: () => request<SystemHealth>('/api/v1/health'),

  // Auth
  login: (username: string, password: string) =>
    request<AuthSession>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<{ success: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
    }),
  getMe: () => request<{ user: User }>('/api/v1/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean; message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Bookings
  checkAvailability: (start_at: string, end_at: string, exclude_booking_id?: string) =>
    request<AvailabilityCheckResponse>('/api/v1/bookings/availability', {
      method: 'POST',
      body: JSON.stringify({ start_at, end_at, exclude_booking_id }),
    }),
  createBooking: (payload: BookingCreationRequest) => {
    const idempotencyKey = crypto.randomUUID();
    return request<{ success: boolean; booking: Booking; message: string }>('/api/v1/bookings', {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey },
      body: JSON.stringify(payload),
    });
  },
  listBookings: (params: {
    status?: string;
    department_id?: string;
    mine_only?: boolean;
    start_date?: string;
    end_date?: string;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.department_id) searchParams.set('department_id', params.department_id);
    if (params.mine_only) searchParams.set('mine_only', 'true');
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.search) searchParams.set('search', params.search);
    return request<{ bookings: Booking[] }>(`/api/v1/bookings?${searchParams.toString()}`);
  },
  getBooking: (id: string) => request<{ booking: Booking }>(`/api/v1/bookings/${id}`),
  cancelBooking: (id: string, reason: string) =>
    request<{ success: boolean; booking: Booking; message: string }>(`/api/v1/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: InAppNotification[]; unread_count: number }>('/api/v1/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/v1/notifications/read-all', { method: 'POST' }),

  // Departments
  getDepartments: () => request<{ departments: Department[] }>('/api/v1/departments'),
  createDepartment: (name: string, code: string) =>
    request<{ department: Department }>('/api/v1/departments', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    }),
  updateDepartment: (id: string, updates: { name?: string; is_active?: number }) =>
    request<{ department: Department }>(`/api/v1/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Users (Admin)
  getUsers: () => request<{ users: User[] }>('/api/v1/users'),
  createUser: (payload: {
    username: string;
    display_name: string;
    password: string;
    role: 'admin' | 'department_user';
    department_id?: string;
    must_change_password?: boolean;
  }) =>
    request<{ user: User }>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, updates: {
    display_name?: string;
    department_id?: string | null;
    role?: 'admin' | 'department_user';
    is_active?: number;
  }) =>
    request<{ user: User }>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  resetPassword: (id: string, new_password: string, must_change_password = false) =>
    request<{ success: boolean; message: string }>(`/api/v1/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password, must_change_password }),
    }),

  // Settings & Closures
  getHallSettings: () => request<{ hall: Hall }>('/api/v1/settings/hall'),
  updateHallSettings: (payload: Partial<Hall>) =>
    request<{ hall: Hall }>('/api/v1/settings/hall', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getClosures: () => request<{ closures: HallClosure[] }>('/api/v1/closures'),
  addClosure: (payload: { start_at: string; end_at: string; reason: string }) =>
    request<{ closure: HallClosure; conflicting_bookings: any[] }>('/api/v1/closures', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteClosure: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/closures/${id}`, {
      method: 'DELETE',
    }),

  // Reports & Audit
  getUsageReport: (start_date?: string, end_date?: string) => {
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    return request<any>(`/api/v1/reports/usage?${params.toString()}`);
  },
  downloadBookingsCsvUrl: (start_date?: string, end_date?: string) => {
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    return `/api/v1/reports/bookings/export?${params.toString()}`;
  },
  getAuditLogs: (limit = 100) => request<{ audit_logs: AuditLog[] }>(`/api/v1/audit-logs?limit=${limit}`),
};
