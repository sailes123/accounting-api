import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shopName: text("shop_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  panNumber: text("pan_number").notNull().default(""),
  currency: text("currency").notNull().default("NPR"),
  fiscalYear: text("fiscal_year").notNull().default(""),
  fiscalYears: text("fiscal_years").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("company_settings_user_id_unique").on(table.userId)]);
