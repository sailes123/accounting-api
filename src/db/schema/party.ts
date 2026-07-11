import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A "party" is either a customer or a vendor. Both had identical shape
// (name/email/phone/address/PAN/remarks/balance), so one table with a
// partyType discriminant replaces the two near-duplicate tables — same
// pattern used for the documents table (orders/invoices/returns).
export const PARTY_TYPES = ["customer", "vendor"] as const;

export const partiesTable = pgTable("parties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  partyType: text("party_type", { enum: PARTY_TYPES }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  panType: text("pan_type", { enum: ["PAN", "VAT", "NONE"] }),
  panNumber: text("pan_number"),
  remarks: text("remarks"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartySchema = createInsertSchema(partiesTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof partiesTable.$inferSelect;
