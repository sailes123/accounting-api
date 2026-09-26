ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_code_expires_at" timestamp with time zone;
