import { numeric, serial } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { text } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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

export const inserVendorSchema = createInsertSchema(vendorsTable).omit({
        id: true,
        userId: true,
        createdAt: true
})
export type InsertVendor = z.infer<typeof inserVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
