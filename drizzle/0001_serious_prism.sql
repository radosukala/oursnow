CREATE TABLE "email_confirmations" (
	"id" text PRIMARY KEY NOT NULL,
	"participant_id" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_confirmations" ADD CONSTRAINT "email_confirmations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_confirmations_token_idx" ON "email_confirmations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_confirmations_expires_idx" ON "email_confirmations" USING btree ("expires_at");