import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A "document" is any of: sales order, purchase order, sales invoice,
// purchase invoice, sales return, purchase return. They all share the same
// header + line-item shape, so one pair of tables covers all six features
// instead of duplicating near-identical schema/routes six times.
export const DOC_TYPES = [
  "sales_order",
  "purchase_order",
  "sales_invoice",
  "purchase_invoice",
  "sales_return",
  "purchase_return",
] as const;

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  docType: text("doc_type", { enum: DOC_TYPES }).notNull(),
  sn: text("sn").notNull().default(""),
  docNo: text("doc_no").notNull().default(""),
  docDate: text("doc_date").notNull(),
  dueDate: text("due_date"),
  supplyDate: text("supply_date"),
  reference: text("reference").notNull().default(""),
  customerId: integer("customer_id"),
  vendorId: integer("vendor_id"),
  taxPct: numeric("tax_pct", { precision: 5, scale: 2 }).notNull().default("13"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  advance: numeric("advance", { precision: 12, scale: 2 }).notNull().default("0"),
  remarks: text("remarks").notNull().default(""),
  reason: text("reason"),
  status: text("status").notNull().default("Pending"),
  linkedDocNo: text("linked_doc_no"),
  paymentSplit: text("payment_split"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentItemsTable = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  name: text("name").notNull(),
  batch: text("batch").notNull().default(""),
  hsCode: text("hs_code").notNull().default(""),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
export type DocumentItem = typeof documentItemsTable.$inferSelect;
