import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { documents } from './documents'

export interface RiskFlag {
  title: string
  severity: 'low' | 'medium' | 'high'
  explanation: string
  excerpt?: string
  page?: number
}

export interface ObligationItem {
  actor: string
  obligation: string
  deadline?: string
  excerpt?: string
  page?: number
}

export const documentAnalysis = pgTable(
  'document_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    summary: text('summary').notNull(),
    keyPoints: jsonb('key_points').$type<string[]>().default([]).notNull(),
    risks: jsonb('risks').$type<RiskFlag[]>().default([]).notNull(),
    obligations: jsonb('obligations').$type<ObligationItem[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index('document_analysis_document_id_idx').on(table.documentId),
  }),
)
