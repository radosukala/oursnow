CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colour_events" (
	"id" text PRIMARY KEY NOT NULL,
	"participant_id" text,
	"from_choice" text,
	"to_choice" text,
	"blue_after" integer NOT NULL,
	"red_after" integer NOT NULL,
	"committed_after" text NOT NULL,
	"revision_after" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colour_preferences" (
	"participant_id" text PRIMARY KEY NOT NULL,
	"choice" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"email_added_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "participants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "colour_preferences" ADD CONSTRAINT "colour_preferences_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colour_events_at_idx" ON "colour_events" USING btree ("at");