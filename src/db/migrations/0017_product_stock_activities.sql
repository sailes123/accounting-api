CREATE TABLE "product_stock_activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "user_id" integer NOT NULL,
  "type" text DEFAULT 'Add Stock' NOT NULL,
  "change" numeric(12, 2) NOT NULL,
  "quantity_after" numeric(12, 2) NOT NULL,
  "remarks" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "product_stock_activities_product_user_created_idx" ON "product_stock_activities" USING btree ("product_id", "user_id", "created_at");
