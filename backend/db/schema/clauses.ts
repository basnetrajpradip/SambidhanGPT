import { pgTable, uuid, text, integer } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export const clauses = pgTable('clauses', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  pageNumber: integer('page_number').notNull(),
})
