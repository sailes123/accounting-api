-- `purchase_price` and `adjusted_date` were already introduced by
-- 0018_stock_activity_details.sql. Keep this migration as a no-op so its
-- journal entry remains valid without attempting to add duplicate columns.
SELECT 1;
