import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  userId: text('user_id').notNull(),
  turn: integer('turn').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
