import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const salesOrdersTable = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sn: text("sn").notNull(),
  orderNo: text("order_no").notNull().default(""),
  orderDate: text("order_date").notNull(),
  supplyDate: text("supply_date").notNull(),
  customerId: integer("customer_id"),
  taxPct: numeric("tax_pct", { precision: 5, scale: 2 }).notNull().default("13"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  remarks: text("remarks").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesOrderItemsTable = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  name: text("name").notNull(),
  hsCode: text("hs_code").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const createSalesOrderSchema = z.object({
  sn: z.string().min(1),
  orderNo: z.string().default(""),
  orderDate: z.string().min(1),
  supplyDate: z.string().min(1),
  customerId: z.number().nullable().optional(),
  taxPct: z.number().min(0).max(100).default(13),
  discountPct: z.number().min(0).max(100).default(0),
  remarks: z.string().default(""),
  items: z.array(z.object({
    name: z.string().min(1),
    hsCode: z.string().default(""),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1),
});

export type SalesOrder = typeof salesOrdersTable.$inferSelect;
export type SalesOrderItem = typeof salesOrderItemsTable.$inferSelect;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
