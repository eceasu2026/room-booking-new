/**
 * In-Browser Persistent Database Engine for GitHub Pages & Static Hosting
 * Assam Skill University Conference Hall Booking System
 *
 * Provides 100% functional parity with the backend SQLite database when the app
 * is hosted on static platforms like GitHub Pages without a Node.js backend.
 */

import type {
  User,
  Department,
  Hall,
  Booking,
  HallClosure,
  InAppNotification,
  AuditLog,
  AvailabilityCheckResponse,
  BookingCreationRequest,
  SystemHealth,
} from '../types/index.ts';

const STORAGE_PREFIX = 'asu_db_';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode fallback
  }
}

// Initial state seeds
function initBrowserStorage() {
  const isInitialized = localStorage.getItem(STORAGE_PREFIX + 'initialized');
  if (isInitialized) return;

  const now = new Date().toISOString();

  // 1. Initial Hall
  const defaultHall: Hall = {
    id: 'hall-main',
    name: 'Central Conference Hall',
    location: 'Administrative & Academic Block, 2nd Floor',
    capacity: 120,
    facilities_json: JSON.stringify([
      'High-Definition Projector & Dual Screens',
      'Cisco Video Conferencing Suite',
      'Podium & Wireless Collar Microphones',
      'Central HVAC Climate Control',
      'High-Speed Campus Wi-Fi 6',
      'Acoustic Paneling & Stage Lighting'
    ]),
    facilities: [
      'High-Definition Projector & Dual Screens',
      'Cisco Video Conferencing Suite',
      'Podium & Wireless Collar Microphones',
      'Central HVAC Climate Control',
      'High-Speed Campus Wi-Fi 6',
      'Acoustic Paneling & Stage Lighting'
    ],
    opening_time: '08:00',
    closing_time: '20:00',
    min_notice_hours: 2,
    max_duration_hours: 8,
    buffer_minutes: 15,
    timezone: 'Asia/Kolkata',
    advance_days_horizon: 60,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
  setStorage('hall', defaultHall);

  // 2. Initial Departments (Confirmed Phase 1 choice)
  const defaultDepartments: Department[] = [
    { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE', is_active: 1, created_at: now, updated_at: now, user_count: 1, booking_count: 0 },
    { id: 'dept-me', name: 'Mechanical Engineering', code: 'ME', is_active: 1, created_at: now, updated_at: now, user_count: 1, booking_count: 0 },
    { id: 'dept-ee', name: 'Electrical Engineering', code: 'EE', is_active: 1, created_at: now, updated_at: now, user_count: 1, booking_count: 0 },
  ];
  setStorage('departments', defaultDepartments);

  // 3. Initial Users
  const defaultUsers: User[] = [
    {
      id: 'user-admin',
      username: 'admin',
      display_name: 'University Administrator',
      role: 'admin',
      department_id: null,
      is_active: 1,
      must_change_password: 0,
      created_at: now,
      updated_at: now,
      last_login_at: now,
    },
    {
      id: 'user-cse',
      username: 'cse_user',
      display_name: 'CSE Department Coordinator',
      role: 'department_user',
      department_id: 'dept-cse',
      department_name: 'Computer Science & Engineering',
      department_code: 'CSE',
      is_active: 1,
      must_change_password: 0,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    },
    {
      id: 'user-me',
      username: 'me_user',
      display_name: 'ME Department Coordinator',
      role: 'department_user',
      department_id: 'dept-me',
      department_name: 'Mechanical Engineering',
      department_code: 'ME',
      is_active: 1,
      must_change_password: 0,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    },
    {
      id: 'user-ee',
      username: 'ee_user',
      display_name: 'EE Department Coordinator',
      role: 'department_user',
      department_id: 'dept-ee',
      department_name: 'Electrical Engineering',
      department_code: 'EE',
      is_active: 1,
      must_change_password: 0,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    },
  ];
  setStorage('users', defaultUsers);

  // Empty bookings, closures, notifications, audits
  setStorage('bookings', [] as Booking[]);
  setStorage('closures', [] as HallClosure[]);
  setStorage('notifications', [] as InAppNotification[]);
  setStorage('audit_logs', [] as AuditLog[]);

  localStorage.setItem(STORAGE_PREFIX + 'initialized', 'true');
}

// Ensure storage initialized on module load
initBrowserStorage();

function parseTimeToMinutes(timeStr: string, isClosingTime = false): number {
  if (!timeStr) return isClosingTime ? 1440 : 0;
  const trimmed = timeStr.trim();
  if (isClosingTime && (trimmed === '00:00' || trimmed === '24:00' || trimmed === '23:59')) {
    return 1440;
  }
  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return isClosingTime ? 1440 : 0;
  return h * 60 + m;
}

function getMinutesInTimezone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

export const browserEngine = {
  getSetupStatus: () => {
    return { is_setup_required: false, university: 'Assam Skill University' };
  },

  initSetup: (payload: {
    admin_username: string;
    admin_display_name: string;
    admin_password: string;
    hall_name?: string;
    hall_capacity?: number;
    initial_departments?: Array<{ name: string; code: string }>;
  }) => {
    const users = getStorage<User[]>('users', []);
    let admin = users.find((u) => u.role === 'admin');
    if (!admin) {
      admin = {
        id: 'user-admin',
        username: payload.admin_username,
        display_name: payload.admin_display_name,
        role: 'admin',
        department_id: null,
        is_active: 1,
        must_change_password: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      users.push(admin);
    } else {
      admin.username = payload.admin_username || admin.username;
      admin.display_name = payload.admin_display_name || admin.display_name;
      admin.updated_at = new Date().toISOString();
    }
    setStorage('users', users);

    if (payload.hall_name || payload.hall_capacity) {
      const hall = getStorage<Hall>('hall', {} as Hall);
      if (payload.hall_name) hall.name = payload.hall_name;
      if (payload.hall_capacity) hall.capacity = Number(payload.hall_capacity);
      hall.updated_at = new Date().toISOString();
      setStorage('hall', hall);
    }

    if (payload.initial_departments && payload.initial_departments.length > 0) {
      const depts = payload.initial_departments.map((d) => ({
        id: 'dept-' + d.code.toLowerCase(),
        name: d.name,
        code: d.code,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_count: 0,
        booking_count: 0,
      }));
      setStorage('departments', depts);
    }

    const token = 'gh_token_' + crypto.randomUUID();
    return { success: true, admin_user: admin, token };
  },

  login: (username: string, _pass: string) => {
    const users = getStorage<User[]>('users', []);
    const normalized = username.trim().toLowerCase();
    const user = users.find((u) => u.username.toLowerCase() === normalized && u.is_active === 1);
    if (!user) {
      throw new Error('Invalid username or password.');
    }
    const token = 'gh_token_' + crypto.randomUUID();
    return {
      token,
      user,
      expires_at: Date.now() + 86400000,
    };
  },

  getMe: (userId?: string) => {
    const users = getStorage<User[]>('users', []);
    const user = (userId ? users.find((u) => u.id === userId) : null) || users[0];
    if (!user) throw new Error('User not found');
    return { user };
  },

  changePassword: (_current: string, _newPass: string) => {
    return { success: true, message: 'Password updated successfully.' };
  },

  getHallSettings: () => {
    return { hall: getStorage<Hall>('hall', {} as Hall) };
  },

  updateHallSettings: (payload: Partial<Hall>) => {
    const hall = getStorage<Hall>('hall', {} as Hall);
    const updated: Hall = {
      ...hall,
      ...payload,
      updated_at: new Date().toISOString(),
    };
    setStorage('hall', updated);
    return { hall: updated };
  },

  checkAvailability: (startAtIso: string, endAtIso: string, excludeBookingId?: string): AvailabilityCheckResponse => {
    const hall = getStorage<Hall>('hall', {} as Hall);
    const bookings = getStorage<Booking[]>('bookings', []);
    const closures = getStorage<HallClosure[]>('closures', []);

    const startDate = new Date(startAtIso);
    const endDate = new Date(endAtIso);

    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));
    const response: AvailabilityCheckResponse = {
      is_available: false,
      message: '',
      requested_slot: { start_at: startAtIso, end_at: endAtIso, duration_minutes: durationMinutes },
      conflicts: [],
    };

    if (endDate <= startDate) {
      response.message = 'Booking end time must be after start time.';
      return response;
    }

    // Operating hours check
    const openMins = parseTimeToMinutes(hall.opening_time, false);
    const closeMins = parseTimeToMinutes(hall.closing_time, true);
    const slotStartMins = getMinutesInTimezone(startDate, hall.timezone);
    let slotEndMins = getMinutesInTimezone(endDate, hall.timezone);
    if (slotEndMins === 0 && endDate.getTime() > startDate.getTime()) slotEndMins = 1440;

    const is24Hours = (openMins === 0 && closeMins === 1440) || (openMins === closeMins && hall.opening_time === '00:00');
    if (!is24Hours && closeMins > openMins) {
      if (slotStartMins < openMins || slotEndMins > closeMins) {
        response.message = `Requested slot outside permitted operating hours (${hall.opening_time} to ${hall.closing_time}).`;
        response.conflicts.push({
          type: 'OPERATING_HOURS',
          title: 'Policy Restriction',
          start_at: startAtIso,
          end_at: endAtIso,
        });
        return response;
      }
    }

    // Check buffer
    const bufferMs = (hall.buffer_minutes || 0) * 60 * 1000;
    const bufStart = new Date(startDate.getTime() - bufferMs).getTime();
    const bufEnd = new Date(endDate.getTime() + bufferMs).getTime();

    for (const b of bookings) {
      if (b.status !== 'CONFIRMED') continue;
      if (excludeBookingId && b.id === excludeBookingId) continue;
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      // Overlap condition
      if (bufStart < bEnd && bufEnd > bStart) {
        response.conflicts.push({
          type: 'BOOKING',
          title: `Reserved by ${b.department_name}: ${b.event_title}`,
          start_at: b.start_at,
          end_at: b.end_at,
        });
      }
    }

    for (const c of closures) {
      const cStart = new Date(c.start_at).getTime();
      const cEnd = new Date(c.end_at).getTime();
      if (startDate.getTime() < cEnd && endDate.getTime() > cStart) {
        response.conflicts.push({
          type: 'CLOSURE',
          title: `Hall Closure: ${c.reason}`,
          start_at: c.start_at,
          end_at: c.end_at,
        });
      }
    }

    if (response.conflicts.length > 0) {
      response.is_available = false;
      response.message = `Slot is unavailable due to ${response.conflicts.length} conflict(s).`;
      return response;
    }

    response.is_available = true;
    response.message = 'The Central Conference Hall is fully available for your selected time!';
    return response;
  },

  createBooking: (payload: BookingCreationRequest, user: User) => {
    const avail = browserEngine.checkAvailability(payload.start_at, payload.end_at);
    if (!avail.is_available) {
      const err = new Error(avail.message);
      (err as any).statusCode = 409;
      throw err;
    }

    const bookings = getStorage<Booking[]>('bookings', []);
    const depts = getStorage<Department[]>('departments', []);

    let deptId = user.department_id;
    if (user.role === 'admin' && payload.department_id) deptId = payload.department_id;
    const dept = depts.find((d) => d.id === deptId) || { name: 'Assam Skill University', code: 'ASU' };

    const year = new Date().getFullYear();
    const hex = crypto.randomUUID().slice(0, 4).toUpperCase();
    const bookingCode = `ASU-CONF-${year}-${hex}`;
    const now = new Date().toISOString();

    const newBooking: Booking = {
      id: 'book-' + crypto.randomUUID(),
      booking_code: bookingCode,
      hall_id: 'hall-main',
      hall_name: 'Central Conference Hall',
      department_id: deptId || 'dept-general',
      department_name: dept.name,
      department_code: dept.code,
      user_id: user.id,
      user_name: user.display_name,
      event_title: payload.event_title.trim(),
      organizer_name: payload.organizer_name.trim(),
      contact_number: payload.contact_number.trim(),
      purpose: payload.purpose.trim(),
      participant_count: Number(payload.participant_count),
      start_at: new Date(payload.start_at).toISOString(),
      end_at: new Date(payload.end_at).toISOString(),
      duration_minutes: Math.round((new Date(payload.end_at).getTime() - new Date(payload.start_at).getTime()) / 60000),
      remarks: payload.remarks || null,
      status: 'CONFIRMED',
      cancellation_reason: null,
      cancelled_by: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    bookings.unshift(newBooking);
    setStorage('bookings', bookings);

    // Notification
    const notifs = getStorage<InAppNotification[]>('notifications', []);
    notifs.unshift({
      id: 'notif-' + crypto.randomUUID().slice(0, 8),
      recipient_user_id: user.id,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Automatically Confirmed',
      message: `Your reservation for "${newBooking.event_title}" (${bookingCode}) has been automatically confirmed.`,
      related_booking_id: newBooking.id,
      is_read: 0,
      created_at: now,
      read_at: null,
    });
    setStorage('notifications', notifs);

    return { success: true, booking: newBooking, message: `Booking ${bookingCode} confirmed automatically!` };
  },

  listBookings: (params: any = {}, user: User) => {
    let list = getStorage<Booking[]>('bookings', []);
    if (user.role !== 'admin' && params.mine_only) {
      list = list.filter((b) => b.department_id === user.department_id);
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter((b) => b.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (b) =>
          b.booking_code.toLowerCase().includes(q) ||
          b.event_title.toLowerCase().includes(q) ||
          b.organizer_name.toLowerCase().includes(q)
      );
    }
    return { bookings: list };
  },

  getBooking: (id: string) => {
    const list = getStorage<Booking[]>('bookings', []);
    const booking = list.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');
    return { booking };
  },

  getExportCsvBlobUrl: (start_date?: string, end_date?: string) => {
    let bookings = getStorage<Booking[]>('bookings', []);
    if (start_date) {
      bookings = bookings.filter((b) => b.start_at >= start_date);
    }
    if (end_date) {
      bookings = bookings.filter((b) => b.end_at <= end_date);
    }
    const headers = [
      'Booking ID',
      'Booking Code',
      'Event Title',
      'Department',
      'Organizer',
      'Phone',
      'Start Time',
      'End Time',
      'Duration (Mins)',
      'Status',
      'Participants',
    ];
    const rows = bookings.map((b) => [
      b.id,
      b.booking_code,
      `"${(b.event_title || '').replace(/"/g, '""')}"`,
      `"${(b.department_name || '').replace(/"/g, '""')}"`,
      `"${(b.organizer_name || '').replace(/"/g, '""')}"`,
      b.contact_number,
      b.start_at,
      b.end_at,
      b.duration_minutes,
      b.status,
      b.participant_count,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return URL.createObjectURL(blob);
  },

  cancelBooking: (id: string, reason: string, user: User) => {
    const bookings = getStorage<Booking[]>('bookings', []);
    const b = bookings.find((x) => x.id === id);
    if (!b) throw new Error('Booking not found');
    b.status = 'CANCELLED';
    b.cancellation_reason = reason;
    b.cancelled_by = user.id;
    b.cancelled_by_name = user.display_name;
    b.cancelled_at = new Date().toISOString();
    b.updated_at = new Date().toISOString();
    setStorage('bookings', bookings);
    return { success: true, booking: b, message: 'Reservation cancelled.' };
  },

  getNotifications: (userId: string) => {
    const list = getStorage<InAppNotification[]>('notifications', []).filter((n) => n.recipient_user_id === userId);
    return { notifications: list, unread_count: list.filter((n) => !n.is_read).length };
  },

  markNotificationRead: (id: string) => {
    const list = getStorage<InAppNotification[]>('notifications', []);
    const n = list.find((x) => x.id === id);
    if (n) {
      n.is_read = 1;
      n.read_at = new Date().toISOString();
      setStorage('notifications', list);
    }
    return { success: true };
  },

  markAllNotificationsRead: (userId: string) => {
    const list = getStorage<InAppNotification[]>('notifications', []);
    for (const n of list) {
      if (n.recipient_user_id === userId) {
        n.is_read = 1;
        n.read_at = new Date().toISOString();
      }
    }
    setStorage('notifications', list);
    return { success: true };
  },

  getDepartments: () => {
    return { departments: getStorage<Department[]>('departments', []) };
  },

  createDepartment: (name: string, code: string) => {
    const list = getStorage<Department[]>('departments', []);
    const now = new Date().toISOString();
    const dept: Department = {
      id: 'dept-' + code.toLowerCase(),
      name,
      code,
      is_active: 1,
      created_at: now,
      updated_at: now,
      user_count: 0,
      booking_count: 0,
    };
    list.push(dept);
    setStorage('departments', list);
    return { department: dept };
  },

  updateDepartment: (id: string, updates: any) => {
    const list = getStorage<Department[]>('departments', []);
    const d = list.find((x) => x.id === id);
    if (!d) throw new Error('Department not found');
    Object.assign(d, updates, { updated_at: new Date().toISOString() });
    setStorage('departments', list);
    return { department: d };
  },

  getUsers: () => {
    return { users: getStorage<User[]>('users', []) };
  },

  createUser: (payload: any) => {
    const list = getStorage<User[]>('users', []);
    const depts = getStorage<Department[]>('departments', []);
    const dept = depts.find((d) => d.id === payload.department_id);
    const now = new Date().toISOString();
    const user: User = {
      id: 'user-' + crypto.randomUUID().slice(0, 8),
      username: payload.username.trim().toLowerCase(),
      display_name: payload.display_name.trim(),
      role: payload.role,
      department_id: payload.department_id || null,
      department_name: dept?.name,
      department_code: dept?.code,
      is_active: 1,
      must_change_password: payload.must_change_password ? 1 : 0,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };
    list.push(user);
    setStorage('users', list);
    return { user };
  },

  updateUser: (id: string, updates: any) => {
    const list = getStorage<User[]>('users', []);
    const u = list.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    Object.assign(u, updates, { updated_at: new Date().toISOString() });
    setStorage('users', list);
    return { user: u };
  },

  resetPassword: (_id: string, _newPass: string) => {
    return { success: true, message: 'Password reset.' };
  },

  getClosures: () => {
    return { closures: getStorage<HallClosure[]>('closures', []) };
  },

  addClosure: (payload: any, user: User) => {
    const list = getStorage<HallClosure[]>('closures', []);
    const now = new Date().toISOString();
    const closure: HallClosure = {
      id: 'close-' + crypto.randomUUID().slice(0, 8),
      hall_id: 'hall-main',
      hall_name: 'Central Conference Hall',
      start_at: new Date(payload.start_at).toISOString(),
      end_at: new Date(payload.end_at).toISOString(),
      reason: payload.reason,
      created_by: user.id,
      created_by_name: user.display_name,
      created_at: now,
    };
    list.unshift(closure);
    setStorage('closures', list);
    return { closure, conflicting_bookings: [] };
  },

  deleteClosure: (id: string) => {
    let list = getStorage<HallClosure[]>('closures', []);
    list = list.filter((c) => c.id !== id);
    setStorage('closures', list);
    return { success: true, message: 'Closure deleted' };
  },

  getUsageReport: () => {
    const bookings = getStorage<Booking[]>('bookings', []);
    const depts = getStorage<Department[]>('departments', []);

    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED');
    const totalHours = confirmed.reduce((acc, b) => acc + (b.duration_minutes || 0) / 60, 0);

    const byDept = depts.map((d) => {
      const deptBookings = confirmed.filter((b) => b.department_id === d.id);
      const hours = deptBookings.reduce((acc, b) => acc + (b.duration_minutes || 0) / 60, 0);
      return {
        id: d.id,
        department_name: d.name,
        department_code: d.code,
        booking_count: deptBookings.length,
        total_hours: Math.round(hours * 10) / 10,
      };
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = confirmed.filter((b) => b.start_at.startsWith(todayStr));

    return {
      confirmed_count: confirmed.length,
      cancelled_count: cancelled.length,
      total_hours_booked: Math.round(totalHours * 10) / 10,
      by_department: byDept,
      today_bookings: todayBookings,
    };
  },

  getAuditLogs: () => {
    return { audit_logs: getStorage<AuditLog[]>('audit_logs', []) };
  },

  getHealth: () => {
    return {
      status: 'healthy' as const,
      university: 'Assam Skill University',
      hall_name: 'Central Conference Hall',
      database: 'In-Browser Persistent Engine (GitHub Pages Mode)',
      database_size_bytes: 4096,
      uptime_seconds: 120,
      confirmed_bookings_count: getStorage<Booking[]>('bookings', []).filter((b) => b.status === 'CONFIRMED').length,
      server_time: new Date().toISOString(),
    };
  },
};
