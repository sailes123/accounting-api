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
});

function format(row: typeof companySettingsTable.$inferSelect) {
  return {
    shopName: row.shopName,
    phone: row.phone,
    address: row.address,
    panNumber: row.panNumber,
    currency: row.currency,
    fiscalYear: row.fiscalYear,
  };
}

router.get("/company", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, userId));
    res.json(settings ? format(settings) : { shopName: "", phone: "", address: "", panNumber: "", currency: "NPR", fiscalYear: "" });
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
    const [settings] = await db.insert(companySettingsTable).values({ userId, ...parsed.data })
      .onConflictDoUpdate({ target: companySettingsTable.userId, set: { ...parsed.data, updatedAt: new Date() } })
      .returning();
    res.json(format(settings));
  } catch (err) {
    req.log.error({ err }, "Failed to update company settings");
    res.status(500).json({ error: "Unable to update company settings" });
  }
});

export default router;
