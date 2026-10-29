/**
 * Shared Type Definitions for ASU Conference Hall Booking System
 * Assam Skill University
 */

export type UserRole = 'admin' | 'department_user';

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Department {
  id: string;
  name: string;
  code: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  user_count?: number;
  booking_count?: number;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  is_active: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AuthSession {
  token: string;
  user: User;
  expires_at: number;
}

export interface Hall {
  id: string;
  name: string;
  location: string;
  capacity: number;
  facilities_json: string; // JSON array of strings
  facilities?: string[];
  opening_time: string; // "08:00"
  closing_time: string; // "20:00"
  min_notice_hours: number;
  max_duration_hours: number;
  buffer_minutes: number;
  timezone: string; // "Asia/Kolkata"
  advance_days_horizon: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  hall_id: string;
  hall_name?: string;
  department_id: string;
  department_name?: string;
  department_code?: string;
  user_id: string;
  user_name?: string;
  event_title: string;
  organizer_name: string;
  contact_number: string;
  purpose: string;
  participant_count: number;
  start_at: string; // ISO 8601 string
  end_at: string;   // ISO 8601 string
  duration_minutes?: number;
  remarks: string | null;
  status: BookingStatus;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_by_name?: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HallClosure {
  id: string;
  hall_id: string;
  hall_name?: string;
  start_at: string;
  end_at: string;
  reason: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CONFLICT'
  | 'HALL_CLOSURE'
  | 'ADMIN_MESSAGE'
  | 'ACCOUNT_CREATED';

export interface InAppNotification {
  id: string;
  recipient_user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_booking_id: string | null;
  is_read: number;
  created_at: string;
  read_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details_json: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface AvailabilityCheckRequest {
  hall_id?: string;
  start_at: string; // ISO string
  end_at: string;   // ISO string
  exclude_booking_id?: string;
}

export interface AvailabilityCheckResponse {
  is_available: boolean;
  message: string;
  requested_slot: {
    start_at: string;
    end_at: string;
    duration_minutes: number;
  };
  conflicts: Array<{
    type: 'BOOKING' | 'CLOSURE' | 'OPERATING_HOURS' | 'NOTICE_PERIOD';
    title: string;
    start_at: string;
    end_at: string;
  }>;
}

export interface BookingCreationRequest {
  hall_id?: string;
  department_id?: string; // overridden by session for non-admin
  event_title: string;
  organizer_name: string;
  contact_number: string;
  purpose: string;
  participant_count: number;
  start_at: string; // ISO string
  end_at: string;   // ISO string
  remarks?: string;
  idempotency_key?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  university: string;
  hall_name: string;
  database: string;
  database_size_bytes: number;
  uptime_seconds: number;
  confirmed_bookings_count: number;
  server_time: string;
}
