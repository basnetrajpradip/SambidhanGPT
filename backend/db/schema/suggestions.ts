import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export const suggestions = pgTable('suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  question: text('question').notNull(),
})
