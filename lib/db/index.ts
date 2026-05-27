/**
 * Database client module for Drizzle ORM.
 * Initializes a PostgreSQL connection pool and handles client reuse
 * across hot-reloads during local development.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Prevent multiple instances of Drizzle clients in development
declare global {
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>>;

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });
  dbInstance = drizzle(pool, { schema });
} else {
  if (!global.db) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    global.db = drizzle(pool, { schema });
  }
  dbInstance = global.db;
}

export const db = dbInstance;
export * from './schema';
