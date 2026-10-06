ALTER TABLE "parties" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "party_code" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "additional_phone" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "balance_direction" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "balance_as_of_date" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "credit_limit" numeric(12, 2);