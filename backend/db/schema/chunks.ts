import { pgTable, uuid, text, integer, customType, vector } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  content: text('content').notNull(),
  pageNumber: integer('page_number').notNull(),
  charOffsetStart: integer('char_offset_start').notNull(),
  charOffsetEnd: integer('char_offset_end').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
})
