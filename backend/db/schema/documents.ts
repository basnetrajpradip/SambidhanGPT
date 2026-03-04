import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  ownerId: text('owner_id').notNull(),
})
