import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, integer, vector, index } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    content: text('content').notNull(),
    pageNumber: integer('page_number').notNull(),
    charOffsetStart: integer('char_offset_start').notNull(),
    charOffsetEnd: integer('char_offset_end').notNull(),
    embedding: vector('embedding', { dimensions: 3072 }).notNull(),
  },
  (table) => ({
    documentIdx: index('chunks_document_id_idx').on(table.documentId),
    embeddingHalfvecIdx: index('chunks_embedding_halfvec_cosine_idx').using('hnsw', sql`(${table.embedding}::halfvec(3072)) halfvec_cosine_ops`),
  }),
)
