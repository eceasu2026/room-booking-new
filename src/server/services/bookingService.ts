/**
 * Booking Engine with Transactional Concurrency Control & Automatic Confirmation
 * Assam Skill University Conference Hall Booking System
 */

import crypto from 'node:crypto';
import { getDatabase } from '../db/database.ts';
import type {
  Booking,
  BookingCreationRequest,
  AvailabilityCheckResponse,
  User,
  Hall,
} from '../../types/index.ts';

export function getHallSettings(): Hall {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM halls WHERE id = ?').get('hall-main') as any;
  if (!row) throw new Error('Central Conference Hall not found.');

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    capacity: Number(row.capacity),
    facilities_json: row.facilities_json,
    facilities: JSON.parse(row.facilities_json || '[]'),
    opening_time: row.opening_time,
    closing_time: row.closing_time,
    min_notice_hours: Number(row.min_notice_hours),
    max_duration_hours: Number(row.max_duration_hours),
    buffer_minutes: Number(row.buffer_minutes),
    timezone: row.timezone,
    advance_days_horizon: Number(row.advance_days_horizon),
    is_active: Number(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function updateHallSettings(payload: Partial<Hall>, actorId: string): Hall {
  const db = getDatabase();
  const current = getHallSettings();

  const name = payload.name ?? current.name;
  const location = payload.location ?? current.location;
  const capacity = payload.capacity ?? current.capacity;
  const facilities_json = payload.facilities ? JSON.stringify(payload.facilities) : current.facilities_json;
  const opening_time = payload.opening_time ?? current.opening_time;
  const closing_time = payload.closing_time ?? current.closing_time;
  const min_notice_hours = payload.min_notice_hours ?? current.min_notice_hours;
  const max_duration_hours = payload.max_duration_hours ?? current.max_duration_hours;
  const buffer_minutes = payload.buffer_minutes ?? current.buffer_minutes;
  const advance_days_horizon = payload.advance_days_horizon ?? current.advance_days_horizon;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE halls SET
      name = ?, location = ?, capacity = ?, facilities_json = ?,
      opening_time = ?, closing_time = ?, min_notice_hours = ?,
      max_duration_hours = ?, buffer_minutes = ?, advance_days_horizon = ?,
      updated_at = ?
    WHERE id = 'hall-main'
  `);

  stmt.run(
    name, location, capacity, facilities_json,
    opening_time, closing_time, min_notice_hours,
    max_duration_hours, buffer_minutes, advance_days_horizon,
    now
  );

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'HALL_SETTINGS_UPDATED', 'HALL', 'hall-main', ?, ?)
  `).run('audit-' + crypto.randomUUID().slice(0, 8), actorId, JSON.stringify(payload), now);

  return getHallSettings();
}

/**
 * Validates slot times against operating hours, minimum notice, max duration, etc.
 */
/**
 * Helper to convert HH:mm time string into minutes from midnight (0 to 1440)
 */
function parseTimeToMinutes(timeStr: string, isClosingTime = false): number {
  if (!timeStr) return isClosingTime ? 1440 : 0;
  const trimmed = timeStr.trim();
  // Closing time of 00:00, 24:00, or 23:59 represents end of day (midnight = 1440 minutes)
  if (isClosingTime && (trimmed === '00:00' || trimmed === '24:00' || trimmed === '23:59')) {
    return 1440;
  }
  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return isClosingTime ? 1440 : 0;
  return h * 60 + m;
}

/**
 * Extracts minutes from midnight (0 to 1440) for a given date within the specified timezone
 */
function getMinutesFromDateInTimezone(date: Date, timeZone: string): number {
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

/**
 * Validates slot times against operating hours, minimum notice, max duration, etc.
 */
function validateSlotConstraints(start: Date, end: Date, hall: Hall): { isValid: boolean; error?: string } {
  const now = new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date or time provided.' };
  }

  if (end <= start) {
    return { isValid: false, error: 'Booking end time must be strictly after the start time.' };
  }

  // Reject past times (allow 5 min grace for form submission delay)
  if (start.getTime() < now.getTime() - 5 * 60000) {
    return { isValid: false, error: 'Cannot book conference hall slots in the past.' };
  }

  // Minimum notice requirement
  if (hall.min_notice_hours > 0) {
    const noticeMs = hall.min_notice_hours * 60 * 60 * 1000;
    if (start.getTime() - now.getTime() < noticeMs) {
      return {
        isValid: false,
        error: `University policy requires at least ${hall.min_notice_hours} hour(s) advance notice before booking start.`,
      };
    }
  }

  // Maximum duration
  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  const maxMinutes = hall.max_duration_hours * 60;
  if (durationMinutes > maxMinutes) {
    return {
      isValid: false,
      error: `Requested duration (${Math.round(durationMinutes / 60)}h) exceeds the maximum allowed ${hall.max_duration_hours} hour(s) per reservation.`,
    };
  }

  // Check advance horizon
  const horizonMs = hall.advance_days_horizon * 24 * 60 * 60 * 1000;
  if (start.getTime() - now.getTime() > horizonMs) {
    return {
      isValid: false,
      error: `Bookings can only be scheduled up to ${hall.advance_days_horizon} days in advance.`,
    };
  }

  // Daily operating hours check in Asia/Kolkata timezone
  const openMinutes = parseTimeToMinutes(hall.opening_time, false);
  const closeMinutes = parseTimeToMinutes(hall.closing_time, true);

  const slotStartMinutes = getMinutesFromDateInTimezone(start, hall.timezone);
  let slotEndMinutes = getMinutesFromDateInTimezone(end, hall.timezone);

  // If slot ends at midnight, treat as 1440 minutes
  if (slotEndMinutes === 0 && end.getTime() > start.getTime()) {
    slotEndMinutes = 1440;
  }

  // If 24 hours round-the-clock
  const is24Hours = (openMinutes === 0 && closeMinutes === 1440) || (openMinutes === closeMinutes && hall.opening_time === '00:00');

  if (!is24Hours) {
    if (closeMinutes > openMinutes) {
      if (slotStartMinutes < openMinutes || slotEndMinutes > closeMinutes) {
        const formatTimeDisplay = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          if (h === 24 || (h === 0 && mins === 1440)) return '00:00 (Midnight)';
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        return {
          isValid: false,
          error: `Requested slot outside permitted operating hours (${formatTimeDisplay(openMinutes)} to ${formatTimeDisplay(closeMinutes)}).`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Checks availability against existing confirmed bookings and closures
 */
export function checkAvailability(
  startAtIso: string,
  endAtIso: string,
  excludeBookingId?: string
): AvailabilityCheckResponse {
  const db = getDatabase();
  const hall = getHallSettings();

  const startDate = new Date(startAtIso);
  const endDate = new Date(endAtIso);

  const validation = validateSlotConstraints(startDate, endDate, hall);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));

  const baseResponse: AvailabilityCheckResponse = {
    is_available: false,
    message: '',
    requested_slot: {
      start_at: startAtIso,
      end_at: endAtIso,
      duration_minutes: durationMinutes,
    },
    conflicts: [],
  };

  if (!validation.isValid) {
    baseResponse.message = validation.error || 'Requested slot does not meet university booking criteria.';
    baseResponse.conflicts.push({
      type: 'OPERATING_HOURS',
      title: 'Policy Restriction',
      start_at: startAtIso,
      end_at: endAtIso,
    });
    return baseResponse;
  }

  // Account for configured transition buffer
  const bufferMs = hall.buffer_minutes * 60 * 1000;
  const bufferedStartIso = new Date(startDate.getTime() - bufferMs).toISOString();
  const bufferedEndIso = new Date(endDate.getTime() + bufferMs).toISOString();

  // Overlap query on confirmed bookings
  // Interval overlap: new_start < existing_end AND new_end > existing_start
  let bookingOverlapQuery = `
    SELECT b.id, b.booking_code, b.event_title, b.start_at, b.end_at, d.name as department_name
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    WHERE b.hall_id = 'hall-main'
      AND b.status = 'CONFIRMED'
      AND b.start_at < ?
      AND b.end_at > ?
  `;
  const params: any[] = [bufferedEndIso, bufferedStartIso];

  if (excludeBookingId) {
    bookingOverlapQuery += ' AND b.id != ?';
    params.push(excludeBookingId);
  }

  const conflictingBookings = db.prepare(bookingOverlapQuery).all(...params) as any[];

  for (const b of conflictingBookings) {
    baseResponse.conflicts.push({
      type: 'BOOKING',
      title: `Reserved by ${b.department_name}: ${b.event_title}`,
      start_at: b.start_at,
      end_at: b.end_at,
    });
  }

  // Overlap query on closures (maintenance / emergency closures)
  const closureOverlapQuery = `
    SELECT id, reason, start_at, end_at
    FROM closures
    WHERE hall_id = 'hall-main'
      AND start_at < ?
      AND end_at > ?
  `;
  const conflictingClosures = db.prepare(closureOverlapQuery).all(endAtIso, startAtIso) as any[];

  for (const c of conflictingClosures) {
    baseResponse.conflicts.push({
      type: 'CLOSURE',
      title: `Hall Closure: ${c.reason}`,
      start_at: c.start_at,
      end_at: c.end_at,
    });
  }

  if (baseResponse.conflicts.length > 0) {
    baseResponse.is_available = false;
    baseResponse.message = `Requested slot is unavailable due to ${baseResponse.conflicts.length} overlapping event(s) or buffer constraint.`;
    return baseResponse;
  }

  baseResponse.is_available = true;
  baseResponse.message = 'The Central Conference Hall is fully available for your selected time!';
  return baseResponse;
}

/**
 * Concurrency-Safe Automatic Booking Confirmation
 * Uses SQLite BEGIN IMMEDIATE to lock writer, performs re-check, and inserts CONFIRMED booking.
 */
export function createBooking(
  payload: BookingCreationRequest,
  currentUser: User
): { success: boolean; booking: Booking; message: string } {
  const db = getDatabase();
  const hall = getHallSettings();

  const startDate = new Date(payload.start_at);
  const endDate = new Date(payload.end_at);

  // 1. Basic validation
  const validation = validateSlotConstraints(startDate, endDate, hall);
  if (!validation.isValid) {
    const error = new Error(validation.error);
    (error as any).statusCode = 400;
    throw error;
  }

  // Department assignment enforcement
  let departmentId = currentUser.department_id;
  if (currentUser.role === 'admin' && payload.department_id) {
    departmentId = payload.department_id;
  }

  if (!departmentId) {
    const error = new Error('Booking must be associated with an active university department.');
    (error as any).statusCode = 400;
    throw error;
  }

  // Capacity validation
  if (payload.participant_count > hall.capacity) {
    const error = new Error(
      `Participant count (${payload.participant_count}) exceeds Central Conference Hall capacity (${hall.capacity} seats).`
    );
    (error as any).statusCode = 400;
    throw error;
  }

  // 2. Check Idempotency Key (to prevent accidental duplicate double-click submissions)
  if (payload.idempotency_key) {
    const existingKey = db.prepare(`
      SELECT response_json FROM idempotency_keys
      WHERE user_id = ? AND idempotency_key = ? AND expires_at > datetime('now')
    `).get(currentUser.id, payload.idempotency_key) as any;

    if (existingKey) {
      const cached = JSON.parse(existingKey.response_json);
      return { success: true, booking: cached, message: 'Retrieved confirmed booking (idempotent request).' };
    }
  }

  // 3. ATOMIC TRANSACTION: BEGIN IMMEDIATE
  // BEGIN IMMEDIATE acquires a reserved lock immediately, preventing any concurrent writer from proceeding
  db.exec('BEGIN IMMEDIATE;');

  try {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const bufferMs = hall.buffer_minutes * 60 * 1000;
    const bufferedStartIso = new Date(startDate.getTime() - bufferMs).toISOString();
    const bufferedEndIso = new Date(endDate.getTime() + bufferMs).toISOString();

    // Recheck booking overlaps inside locked transaction
    const overlapCheck = db.prepare(`
      SELECT b.id, b.booking_code, b.event_title, b.start_at, b.end_at, d.name as department_name
      FROM bookings b
      JOIN departments d ON b.department_id = d.id
      WHERE b.hall_id = 'hall-main'
        AND b.status = 'CONFIRMED'
        AND b.start_at < ?
        AND b.end_at > ?
      LIMIT 1
    `).get(bufferedEndIso, bufferedStartIso) as any;

    if (overlapCheck) {
      db.exec('ROLLBACK;');
      const error = new Error(
        `Slot conflict: The requested slot overlaps with an existing confirmed reservation ("${overlapCheck.event_title}" by ${overlapCheck.department_name}).`
      );
      (error as any).statusCode = 409;
      (error as any).conflict = overlapCheck;
      throw error;
    }

    // Recheck closure overlaps inside locked transaction
    const closureCheck = db.prepare(`
      SELECT reason, start_at, end_at FROM closures
      WHERE hall_id = 'hall-main'
        AND start_at < ?
        AND end_at > ?
      LIMIT 1
    `).get(endIso, startIso) as any;

    if (closureCheck) {
      db.exec('ROLLBACK;');
      const error = new Error(`Slot conflict: The hall is scheduled for closure (${closureCheck.reason}).`);
      (error as any).statusCode = 409;
      throw error;
    }

    // Generate unique human-readable booking code: ASU-CONF-YYYY-XXXX
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const bookingCode = `ASU-CONF-${year}-${randomHex}`;
    const bookingId = 'book-' + crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert as CONFIRMED (Strict automatic confirmation)
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        id, booking_code, hall_id, department_id, user_id,
        event_title, organizer_name, contact_number, purpose,
        participant_count, start_at, end_at, remarks, status,
        cancellation_reason, cancelled_by, cancelled_at, created_at, updated_at
      ) VALUES (?, ?, 'hall-main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', NULL, NULL, NULL, ?, ?)
    `);

    insertBooking.run(
      bookingId,
      bookingCode,
      departmentId,
      currentUser.id,
      payload.event_title.trim(),
      payload.organizer_name.trim(),
      payload.contact_number.trim(),
      payload.purpose.trim(),
      Number(payload.participant_count),
      startIso,
      endIso,
      payload.remarks?.trim() || null,
      now,
      now
    );

    // Create in-app notification for the user
    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, recipient_user_id, type, title, message, related_booking_id, is_read, created_at)
      VALUES (?, ?, 'BOOKING_CONFIRMED', ?, ?, ?, 0, ?)
    `);
    insertNotification.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      currentUser.id,
      'Booking Automatically Confirmed',
      `Your reservation for "${payload.event_title}" (${bookingCode}) on ${new Date(payload.start_at).toLocaleDateString()} has been automatically confirmed.`,
      bookingId,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, 'BOOKING_CONFIRMED_AUTO', 'BOOKING', ?, ?, ?)
    `).run(
      'audit-' + crypto.randomUUID().slice(0, 8),
      currentUser.id,
      bookingId,
      JSON.stringify({ booking_code: bookingCode, event_title: payload.event_title, department_id: departmentId }),
      now
    );

    // Cache idempotency response if key provided
    if (payload.idempotency_key) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO idempotency_keys (id, user_id, idempotency_key, request_hash, response_json, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'idem-' + crypto.randomUUID().slice(0, 8),
        currentUser.id,
        payload.idempotency_key,
        payload.start_at + payload.end_at,
        JSON.stringify({ booking_id: bookingId, booking_code: bookingCode }),
        now,
        expiresAt
      );
    }

    // COMMIT
    db.exec('COMMIT;');

    const confirmedBooking = getBookingById(bookingId)!;
    return {
      success: true,
      booking: confirmedBooking,
      message: `Booking ${bookingCode} confirmed automatically!`,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // rollback if transaction was in flight
    }
    throw err;
  }
}

export function getBookingById(bookingId: string): Booking | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT b.*,
           h.name as hall_name,
           d.name as department_name, d.code as department_code,
           u.display_name as user_name,
           cb.display_name as cancelled_by_name
    FROM bookings b
    LEFT JOIN halls h ON b.hall_id = h.id
    LEFT JOIN departments d ON b.department_id = d.id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN users cb ON b.cancelled_by = cb.id
    WHERE b.id = ?
  `);

  const row = stmt.get(bookingId) as any;
  if (!row) return null;
  return formatBookingRow(row);
}

export function cancelBooking(
  bookingId: string,
  reason: string,
  currentUser: User
): Booking {
  if (!reason || reason.trim().length < 3) {
    const error = new Error('A valid cancellation reason (minimum 3 characters) is required.');
    (error as any).statusCode = 400;
    throw error;
  }

  const db = getDatabase();
  const booking = getBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found.');
    (error as any).statusCode = 404;
    throw error;
  }

  if (booking.status === 'CANCELLED') {
    const error = new Error('Booking has already been cancelled.');
    (error as any).statusCode = 400;
    throw error;
  }

  // Permission check: admin can cancel any booking; department user can only cancel their own department's
  if (currentUser.role !== 'admin' && currentUser.department_id !== booking.department_id) {
    const error = new Error('Unauthorized: You can only cancel bookings submitted by your own department.');
    (error as any).statusCode = 403;
    throw error;
  }

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(`
      UPDATE bookings SET
        status = 'CANCELLED',
        cancellation_reason = ?,
        cancelled_by = ?,
        cancelled_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(reason.trim(), currentUser.id, now, now, bookingId);

    // Notify the original booking user (if cancelled by someone else, like an admin)
    if (booking.user_id !== currentUser.id) {
      db.prepare(`
        INSERT INTO notifications (id, recipient_user_id, type, title, message, related_booking_id, is_read, created_at)
        VALUES (?, ?, 'BOOKING_CANCELLED', 'Booking Cancelled by Administrator', ?, ?, 0, ?)
      `).run(
        'notif-' + crypto.randomUUID().slice(0, 8),
        booking.user_id,
        `Your reservation "${booking.event_title}" (${booking.booking_code}) was cancelled: ${reason.trim()}`,
        bookingId,
        now
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, 'BOOKING_CANCELLED', 'BOOKING', ?, ?, ?)
    `).run(
      'audit-' + crypto.randomUUID().slice(0, 8),
      currentUser.id,
      bookingId,
      JSON.stringify({ reason: reason.trim(), booking_code: booking.booking_code }),
      now
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getBookingById(bookingId)!;
}

export function listBookings(filters: {
  status?: string;
  department_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}): Booking[] {
  const db = getDatabase();
  let sql = `
    SELECT b.*,
           h.name as hall_name,
           d.name as department_name, d.code as department_code,
           u.display_name as user_name,
           cb.display_name as cancelled_by_name
    FROM bookings b
    LEFT JOIN halls h ON b.hall_id = h.id
    LEFT JOIN departments d ON b.department_id = d.id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN users cb ON b.cancelled_by = cb.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status && filters.status !== 'ALL') {
    sql += ' AND b.status = ?';
    params.push(filters.status);
  }

  if (filters.department_id) {
    sql += ' AND b.department_id = ?';
    params.push(filters.department_id);
  }

  if (filters.user_id) {
    sql += ' AND b.user_id = ?';
    params.push(filters.user_id);
  }

  if (filters.start_date) {
    sql += ' AND b.end_at >= ?';
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    sql += ' AND b.start_at <= ?';
    params.push(filters.end_date);
  }

  if (filters.search) {
    sql += ' AND (b.booking_code LIKE ? OR b.event_title LIKE ? OR b.organizer_name LIKE ? OR b.purpose LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY b.start_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(formatBookingRow);
}

function formatBookingRow(row: any): Booking {
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  const durationMinutes = Math.round((end - start) / (60 * 1000));

  return {
    id: row.id,
    booking_code: row.booking_code,
    hall_id: row.hall_id,
    hall_name: row.hall_name || 'Central Conference Hall',
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code,
    user_id: row.user_id,
    user_name: row.user_name,
    event_title: row.event_title,
    organizer_name: row.organizer_name,
    contact_number: row.contact_number,
    purpose: row.purpose,
    participant_count: Number(row.participant_count),
    start_at: row.start_at,
    end_at: row.end_at,
    duration_minutes: durationMinutes,
    remarks: row.remarks,
    status: row.status as any,
    cancellation_reason: row.cancellation_reason,
    cancelled_by: row.cancelled_by,
    cancelled_by_name: row.cancelled_by_name,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
