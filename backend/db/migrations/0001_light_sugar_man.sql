CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "chunks_document_id_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_embedding_halfvec_cosine_idx" ON "chunks" USING hnsw (("embedding"::halfvec(3072)) halfvec_cosine_ops);--> statement-breakpoint
CREATE INDEX "conversations_document_user_turn_idx" ON "conversations" USING btree ("document_id","user_id","turn");--> statement-breakpoint
CREATE INDEX "documents_owner_uploaded_at_idx" ON "documents" USING btree ("owner_id","uploaded_at");
