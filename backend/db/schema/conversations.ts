import { pgTable, uuid, text, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export interface StoredCitation {
  chunk_id: string
  page: number
  char_offset_start: number
  char_offset_end: number
  excerpt: string
}

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    userId: text('user_id').notNull(),
    turn: integer('turn').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    citations: jsonb('citations').$type<StoredCitation[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    documentUserTurnIdx: index('conversations_document_user_turn_idx').on(table.documentId, table.userId, table.turn),
  }),
)
