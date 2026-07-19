/**
 * Database Client for Cloudflare Workers
 *
 * Uses Drizzle ORM with D1 binding for Cloudflare Workers
 * and local SQLite for development
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import * as authSchema from './auth-schema';

// Type for the database instance
export type Database = ReturnType<typeof drizzle>;

// Combined schema for queries
const fullSchema = {
  ...schema,
  ...authSchema,
};

// Create D1 database client (for Cloudflare Workers)
export function createDB(d1Database?: D1Database): Database {
  if (!d1Database) {
    throw new Error('D1 Database binding not found. Make sure DB is bound in wrangler.toml');
  }
  return drizzle(d1Database, { schema: fullSchema });
}

// Re-export schemas for convenience
export { schema, authSchema };

// Export all schema items for queries
export * from './schema';
export * from './auth-schema';
