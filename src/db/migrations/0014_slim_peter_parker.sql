CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shop_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"address" text,
	"pan_number" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_settings_user_id_unique" ON "company_settings" USING btree ("user_id");