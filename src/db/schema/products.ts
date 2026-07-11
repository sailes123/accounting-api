import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ["Goods", "Services"] }).notNull().default("Goods"),
  name: text("name").notNull(),
  category: text("category"),
  subCategory: text("sub_category"),
  hsnCode: text("hsn_code"),
  sku: text("sku"),
  reorderPoint: numeric("reorder_point", { precision: 12, scale: 2 }),
  description: text("description"),
  unit: text("unit"),
  subUnit: text("sub_unit"),
  unitConvFrom: numeric("unit_conv_from", { precision: 12, scale: 2 }),
  unitConvTo: numeric("unit_conv_to", { precision: 12, scale: 2 }),
  stock: numeric("stock", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  secondarySellingPrice: numeric("secondary_selling_price", { precision: 12, scale: 2 }),
  size: text("size"),
  batch: text("batch"),
  expiryDate: text("expiry_date"),
  customerId: integer("customer_id"),
  purchaseNonTaxable: boolean("purchase_non_taxable").notNull().default(false),
  salesNonTaxable: boolean("sales_non_taxable").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, userId: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
