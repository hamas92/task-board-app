import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Check if we're in a build environment (Vercel, Netlify, etc.)
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV;
const isVercel = !!process.env.VERCEL;

let db: ReturnType<typeof drizzle>;

if (isBuildTime || isVercel) {
  // During build time or on Vercel, create an in-memory database
  console.log('Using in-memory database for build/deployment');
  const sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  
  // Create tables for in-memory database
  try {
    const migrationsFolder = path.join(process.cwd(), 'lib', 'db', 'migrations');
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
    }
  } catch (error) {
    console.warn('Migration failed in build environment:', error);
  }
} else {
  // Local development - use file-based SQLite
  const dbPath = path.join(process.cwd(), 'lib', 'db', 'sqlite.db');
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  
  db = drizzle(sqlite, { schema });
  
  // Run migrations on startup
  const migrationsFolder = path.join(process.cwd(), 'lib', 'db', 'migrations');
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder });
  }
}

export { db };

export * from './schema';

