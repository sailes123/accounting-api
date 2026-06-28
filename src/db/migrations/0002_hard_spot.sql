ALTER TABLE "customers" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "user_id" integer NOT NULL;