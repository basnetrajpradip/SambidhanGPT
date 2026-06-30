import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c jit=off',
  connectionTimeoutMillis: 5000,
  query_timeout: 30000,
})

export const db = drizzle(pool, { schema })
export default db
