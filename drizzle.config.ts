/**
 * Drizzle Kit Configuration.
 * Configures the database schema source location, output directory for migrations,
 * postgresql dialect, and db credentials retrieved from environment variables.
 */

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
