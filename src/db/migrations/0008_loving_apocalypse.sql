ALTER TABLE "products" ALTER COLUMN "stock" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type" text DEFAULT 'Goods' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sub_category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hsn_code" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reorder_point" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sub_unit" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_conv_from" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_conv_to" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "secondary_selling_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "size" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "expiry_date" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "purchase_non_taxable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sales_non_taxable" boolean DEFAULT false NOT NULL;