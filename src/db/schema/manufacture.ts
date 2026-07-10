import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manufactureRecordsTable = pgTable("manufacture_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  product: text("product").notNull(),
  batch: text("batch").notNull().default(""),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull().default(""),
  createdDate: text("created_date").notNull(),
  expiryDate: text("expiry_date"),
  laborCost: numeric("labor_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  otherExpenses: numeric("other_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manufactureMaterialsTable = pgTable("manufacture_materials", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull(),
  item: text("item").notNull(),
  batch: text("batch").notNull().default(""),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertManufactureRecordSchema = createInsertSchema(manufactureRecordsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertManufactureRecord = z.infer<typeof insertManufactureRecordSchema>;
export type ManufactureRecordRow = typeof manufactureRecordsTable.$inferSelect;
export type ManufactureMaterialRow = typeof manufactureMaterialsTable.$inferSelect;
