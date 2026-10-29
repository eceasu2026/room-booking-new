/**
 * Standalone Production Entry Point for ASU Conference Hall Booking System
 * Assam Skill University — Windows 11 / Node.js Production Host
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { app } from './src/server/app.ts';
import { getDatabaseStats } from './src/server/db/database.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Serve frontend build artifacts in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  const stats = getDatabaseStats();
  console.log('================================================================');
  console.log('  ASSAM SKILL UNIVERSITY — CONFERENCE HALL BOOKING SYSTEM');
  console.log('  Central Conference Hall Reservation Portal');
  console.log('================================================================');
  console.log(`  * Server Active:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  * Health Endpoint:    http://localhost:${PORT}/api/v1/health`);
  console.log(`  * Database Storage:   ${stats.path}`);
  console.log(`  * Timezone:           Asia/Kolkata`);
  console.log(`  * Status:             Production Ready / Auto-Confirmation Active`);
  console.log('================================================================');
});

// Graceful termination handling for Windows Task Scheduler and service managers
const shutdown = () => {
  console.log('\n[ASU Server] Gracefully shutting down conference hall booking service...');
  server.close(() => {
    console.log('[ASU Server] Service stopped safely.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
