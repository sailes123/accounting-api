CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"customer_id" integer,
	"payment_mode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"purchase_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
