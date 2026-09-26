import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { companySettingsTable, db } from "../db";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();
const settingsSchema = z.object({
  shopName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(300),
  panNumber: z.string().trim().max(100),
  currency: z.string().trim().min(1).max(10),
  fiscalYear: z.string().trim().max(20),
  fiscalYears: z.array(z.string().trim().regex(/^\d{4}\/\d{2,4}$/)).max(20),
});
const fiscalYearsSchema = z.object({
  fiscalYear: z.string().trim().regex(/^\d{4}\/\d{2,4}$/),
  fiscalYears: z.array(z.string().trim().regex(/^\d{4}\/\d{2,4}$/)).min(1).max(20),
});

function format(row: typeof companySettingsTable.$inferSelect) {
  return {
    shopName: row.shopName,
    phone: row.phone,
    address: row.address,
    panNumber: row.panNumber,
    currency: row.currency,
    fiscalYear: row.fiscalYear,
    fiscalYears: (() => {
      try { const values = JSON.parse(row.fiscalYears); return Array.isArray(values) ? values : []; }
      catch { return []; }
    })(),
  };
}

router.get("/company", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, userId));
    res.json(settings ? format(settings) : { shopName: "", phone: "", address: "", panNumber: "", currency: "NPR", fiscalYear: "", fiscalYears: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get company settings");
    res.status(500).json({ error: "Unable to load company settings" });
  }
});

router.put("/company", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid settings", details: parsed.error.flatten() });
  try {
    const values = { ...parsed.data, fiscalYears: JSON.stringify(parsed.data.fiscalYears) };
    const [settings] = await db.insert(companySettingsTable).values({ userId, ...values })
      .onConflictDoUpdate({ target: companySettingsTable.userId, set: { ...values, updatedAt: new Date() } })
      .returning();
    res.json(format(settings));
  } catch (err) {
    req.log.error({ err }, "Failed to update company settings");
    res.status(500).json({ error: "Unable to update company settings" });
  }
});

router.patch("/company/fiscal-year", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = fiscalYearsSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid fiscal year" });
  try {
    const values = { fiscalYear: parsed.data.fiscalYear, fiscalYears: JSON.stringify([...new Set(parsed.data.fiscalYears)]) };
    const [settings] = await db.insert(companySettingsTable).values({ userId, ...values })
      .onConflictDoUpdate({ target: companySettingsTable.userId, set: { ...values, updatedAt: new Date() } })
      .returning();
    res.json(format(settings));
  } catch (err) {
    req.log.error({ err }, "Failed to update fiscal year");
    res.status(500).json({ error: "Unable to update fiscal year" });
  }
});

export default router;
