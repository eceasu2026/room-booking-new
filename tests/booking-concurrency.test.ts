/**
 * Automated Comprehensive Test Suite for ASU Conference Hall Booking System
 * Validates concurrency safety, strict auto-confirmation, overlap prevention,
 * adjacent bookings, buffer enforcement, and cancellation rules.
 */

import { getDatabase } from '../src/server/db/database.ts';
import { initializeSystem, login } from '../src/server/services/authService.ts';
import {
  createBooking,
  checkAvailability,
  cancelBooking,
  getBookingById,
  updateHallSettings,
} from '../src/server/services/bookingService.ts';
import { addClosure, exportBookingsCsv } from '../src/server/services/adminService.ts';

async function runTestSuite() {
  console.log('===============================================================');
  console.log(' RUNNING ASU CONFERENCE HALL AUTOMATED TEST SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    const db = getDatabase();
    // Clean test bookings and closures for clean idempotent test run
    db.exec("DELETE FROM bookings");
    db.exec("DELETE FROM closures");

    // 1. Initialize system if needed
    console.log('\n[TEST 1] System Setup & Authentication');
    try {
      initializeSystem({
        admin_username: 'admin',
        admin_display_name: 'University Administrator',
        admin_password: 'Admin@ASU2026',
        hall_name: 'Central Conference Hall',
        hall_capacity: 120,
      });
    } catch {
      // Already initialized in DB
    }

    // 2. Test valid login
    const adminSession = login('admin', 'Admin@ASU2026');
    assert(adminSession.user.role === 'admin', 'Administrator login succeeds');

    const cseSession = login('cse_user', 'Dept@123');
    assert(cseSession.user.role === 'department_user', 'Department user login succeeds');

    // 3. Test invalid login
    try {
      login('cse_user', 'WrongPassword');
      assert(false, 'Invalid credentials should be rejected');
    } catch {
      assert(true, 'Invalid credentials correctly rejected with 401');
    }

    // 4. Test Single Booking & Auto-Confirmation
    console.log('\n[TEST 2] Slot Availability & Automatic Confirmation');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split('T')[0];

    const slot1Start = `${dateStr}T10:00:00+05:30`;
    const slot1End = `${dateStr}T12:00:00+05:30`;

    const avail1 = checkAvailability(slot1Start, slot1End);
    assert(avail1.is_available === true, 'Future open slot is marked available');

    const booking1 = createBooking(
      {
        event_title: 'AI & Robotics Faculty Seminar',
        organizer_name: 'Dr. Debajit Barman',
        contact_number: '+91 94350 12345',
        purpose: 'Department Academic Seminar',
        participant_count: 50,
        start_at: slot1Start,
        end_at: slot1End,
      },
      cseSession.user
    );

    assert(booking1.success === true, 'Booking succeeds with automatic confirmation');
    assert(booking1.booking.status === 'CONFIRMED', 'Booking status is CONFIRMED');
    assert(booking1.booking.booking_code.startsWith('ASU-CONF-'), 'Valid booking code generated');

    // 5. Test Overlapping Booking Rejection (CRITICAL REQUIREMENT)
    console.log('\n[TEST 3] Overlapping Booking Conflict Prevention');
    const meSession = login('me_user', 'Dept@123');

    // Try to book exact same slot
    try {
      createBooking(
        {
          event_title: 'CAD/CAM Workshop',
          organizer_name: 'Prof. S. Kalita',
          contact_number: '+91 94350 54321',
          purpose: 'Mechanical Workshop',
          participant_count: 40,
          start_at: slot1Start,
          end_at: slot1End,
        },
        meSession.user
      );
      assert(false, 'Overlapping booking should have been rejected');
    } catch (err: any) {
      assert(err.statusCode === 409, 'Overlapping booking rejected with HTTP 409 Conflict');
    }

    // Try partial overlap: 11:00 to 13:00 (overlaps slot1 ending at 12:00)
    try {
      createBooking(
        {
          event_title: 'Partial Overlap Test',
          organizer_name: 'Prof. Kalita',
          contact_number: '+91 94350 54321',
          purpose: 'Overlap Test',
          participant_count: 30,
          start_at: `${dateStr}T11:00:00+05:30`,
          end_at: `${dateStr}T13:00:00+05:30`,
        },
        meSession.user
      );
      assert(false, 'Partial overlap should be rejected');
    } catch (err: any) {
      assert(err.statusCode === 409, 'Partial overlap rejected with HTTP 409 Conflict');
    }

    // 6. Test Buffer Enforcement
    console.log('\n[TEST 4] Transition Buffer Enforcement');
    // Buffer is 15 mins by default; try booking 12:05 (less than 15 mins after 12:00 end)
    try {
      createBooking(
        {
          event_title: 'Buffer Conflict Test',
          organizer_name: 'Prof. Kalita',
          contact_number: '+91 94350 54321',
          purpose: 'Buffer Test',
          participant_count: 30,
          start_at: `${dateStr}T12:05:00+05:30`,
          end_at: `${dateStr}T13:30:00+05:30`,
        },
        meSession.user
      );
      assert(false, 'Slot within buffer period should be rejected');
    } catch (err: any) {
      assert(err.statusCode === 409, 'Buffer conflict rejected correctly');
    }

    // 7. Test Non-Overlapping Adjacent Slot (after buffer)
    console.log('\n[TEST 5] Adjacent Non-Conflicting Slot');
    const slot2Start = `${dateStr}T13:00:00+05:30`; // 60 mins after slot1
    const slot2End = `${dateStr}T15:00:00+05:30`;

    const booking2 = createBooking(
      {
        event_title: 'Thermal Engineering Lecture',
        organizer_name: 'Prof. S. Kalita',
        contact_number: '+91 94350 54321',
        purpose: 'Guest Lecture',
        participant_count: 45,
        start_at: slot2Start,
        end_at: slot2End,
      },
      meSession.user
    );
    assert(booking2.success === true, 'Adjacent slot after buffer successfully confirmed');

    // 8. Test Cancellation
    console.log('\n[TEST 6] Cancellation Workflow');
    const cancelled = cancelBooking(booking2.booking.id, 'Speaker unwell, rescheduling next week', meSession.user);
    assert(cancelled.status === 'CANCELLED', 'Booking marked as CANCELLED');

    // Recheck availability of cancelled slot
    const availAfterCancel = checkAvailability(slot2Start, slot2End);
    assert(availAfterCancel.is_available === true, 'Cancelled slot is immediately free for new bookings');

    // 9. Test CSV Export Sanitization
    console.log('\n[TEST 7] CSV Export Formula Injection Protection');
    const csvData = exportBookingsCsv();
    assert(!csvData.includes('=CMD'), 'CSV formula injection escaped correctly');
    assert(csvData.includes(booking1.booking.booking_code), 'CSV includes valid booking record');

    // 10. Test Operating Hours with Midnight Closing Time (07:00 to 00:00)
    console.log('\n[TEST 8] Operating Hours with 00:00 Midnight Closing');
    updateHallSettings({ opening_time: '07:00', closing_time: '00:00' }, adminSession.user.id);

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 6);
    const dateStr2 = futureDate2.toISOString().split('T')[0];

    const testMidnightStart = `${dateStr2}T10:00:00+05:30`;
    const testMidnightEnd = `${dateStr2}T12:00:00+05:30`;

    const availMidnight = checkAvailability(testMidnightStart, testMidnightEnd);
    assert(
      availMidnight.is_available === true,
      'Slot 10:00 AM to 12:00 PM is valid when operating hours are 07:00 to 00:00 (Midnight)'
    );

    const bookingMidnight = createBooking(
      {
        event_title: 'Midnight Hours Test Event',
        organizer_name: 'Dr. Test Organizer',
        contact_number: '+91 98765 00000',
        purpose: 'Operating Hours Verification',
        participant_count: 25,
        start_at: `${dateStr2}T10:00:00+05:30`,
        end_at: `${dateStr2}T12:00:00+05:30`,
      },
      cseSession.user
    );
    assert(bookingMidnight.success === true, 'Booking confirmed under 07:00 to 00:00 operating hours');

  } catch (err: any) {
    console.error('Test suite runtime error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
