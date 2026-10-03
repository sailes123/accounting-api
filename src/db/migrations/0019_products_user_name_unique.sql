CREATE UNIQUE INDEX IF NOT EXISTS "products_user_lower_name_unique"
ON "products" ("user_id", lower("name"));
