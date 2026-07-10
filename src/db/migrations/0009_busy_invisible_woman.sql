CREATE TABLE "document_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"name" text NOT NULL,
	"batch" text DEFAULT '' NOT NULL,
	"hs_code" text DEFAULT '' NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"doc_type" text NOT NULL,
	"sn" text DEFAULT '' NOT NULL,
	"doc_no" text DEFAULT '' NOT NULL,
	"doc_date" text NOT NULL,
	"due_date" text,
	"supply_date" text,
	"reference" text DEFAULT '' NOT NULL,
	"customer_id" integer,
	"vendor_id" integer,
	"tax_pct" numeric(5, 2) DEFAULT '13' NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"advance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"reason" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"linked_doc_no" text,
	"payment_split" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"direction" text NOT NULL,
	"receipt_no" text DEFAULT '' NOT NULL,
	"date" text NOT NULL,
	"customer_id" integer,
	"vendor_id" integer,
	"party_name" text DEFAULT '' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text DEFAULT 'Cash' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacture_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"item" text NOT NULL,
	"batch" text DEFAULT '' NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacture_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product" text NOT NULL,
	"batch" text DEFAULT '' NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"created_date" text NOT NULL,
	"expiry_date" text,
	"labor_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_expenses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
