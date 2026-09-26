CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shop_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"pan_number" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'NPR' NOT NULL,
	"fiscal_year" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_settings_user_id_unique" ON "company_settings" USING btree ("user_id");
