import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core'

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    filePath: text('file_path').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    ownerId: text('owner_id').notNull(),
  },
  (table) => ({
    ownerUploadedAtIdx: index('documents_owner_uploaded_at_idx').on(table.ownerId, table.uploadedAt),
  }),
)
