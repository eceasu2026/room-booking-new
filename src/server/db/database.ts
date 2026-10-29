/**
 * Database connection and lifecycle manager using Node.js built-in DatabaseSync
 * Assam Skill University Conference Hall Booking System
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema.ts';

// Standard storage location on local drive
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'asu_conference.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_PATH);

  // Performance and durability pragmas for concurrent enterprise access
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA busy_timeout = 5000;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');

  // Run migrations
  dbInstance.exec(SCHEMA_SQL);

  // Ensure default hall exists
  seedDefaultHall(dbInstance);

  return dbInstance;
}

function seedDefaultHall(db: DatabaseSync) {
  const checkHall = db.prepare('SELECT id FROM halls LIMIT 1');
  const existing = checkHall.get();

  if (!existing) {
    const now = new Date().toISOString();
    const insertHall = db.prepare(`
      INSERT INTO halls (
        id, name, location, capacity, facilities_json,
        opening_time, closing_time, min_notice_hours,
        max_duration_hours, buffer_minutes, timezone,
        advance_days_horizon, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertHall.run(
      'hall-main',
      'Central Conference Hall',
      'Administrative & Academic Block, 2nd Floor',
      120,
      JSON.stringify([
        'High-Definition Projector & Dual Screens',
        'Cisco Video Conferencing Suite',
        'Podium & Wireless Collar Microphones',
        'Central HVAC Climate Control',
        'High-Speed Campus Wi-Fi 6',
        'Acoustic Paneling & Stage Lighting'
      ]),
      '08:00',
      '20:00',
      2,   // 2 hours minimum notice
      8,   // 8 hours maximum booking duration
      15,  // 15 minutes buffer between events
      'Asia/Kolkata',
      60,  // 60 days in advance
      1,
      now,
      now
    );

    // Initial university settings
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
    `);
    insertSetting.run('university_name', 'Assam Skill University', now);
    insertSetting.run('system_version', '1.0.0', now);
    insertSetting.run('timezone', 'Asia/Kolkata', now);
    insertSetting.run('auto_confirmation_enabled', 'true', now);
  }
}

export function getDatabasePath(): string {
  return DB_PATH;
}

export function getDatabaseStats() {
  const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : { size: 0 };
  return {
    path: DB_PATH,
    size_bytes: stats.size,
  };
}
