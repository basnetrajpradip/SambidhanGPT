import { and, eq } from 'drizzle-orm'
import { db } from '../../configs/db-config'
import { documents } from '../../db/schema'

export async function getOwnedDocument(documentId: string, ownerId: string) {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)))
    .limit(1)

  return document ?? null
}
