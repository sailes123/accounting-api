import { Router, type Request, type Response, type NextFunction } from "express";
import { db, companySettingsTable } from "../db";
import { eq } from "drizzle-orm";
import { UpdateCompanySettingsBody } from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";
import { uploadLogo, deleteLogoFile } from "../lib/uploads";

const router = Router();

function fmt(row: typeof companySettingsTable.$inferSelect | undefined) {
  return {
    shopName: row?.shopName ?? "",
    phone: row?.phone ?? null,
    address: row?.address ?? null,
    panNumber: row?.panNumber ?? null,
    logoUrl: row?.logoUrl ?? null,
    updatedAt: (row?.updatedAt ?? new Date()).toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const [row] = await db
      .select()
      .from(companySettingsTable)
      .where(eq(companySettingsTable.userId, userId));
    res.json(fmt(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get company settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

function handleLogoUpload(req: Request, res: Response, next: NextFunction) {
  uploadLogo.single("logo")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Invalid file upload";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

router.put("/", handleLogoUpload, async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = UpdateCompanySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) deleteLogoFile(`/uploads/logos/${req.file.filename}`);
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { shopName, phone, address, panNumber } = parsed.data;
  const newLogoUrl = req.file ? `/uploads/logos/${req.file.filename}` : undefined;

  try {
    const [existing] = await db
      .select()
      .from(companySettingsTable)
      .where(eq(companySettingsTable.userId, userId));

    const values = {
      userId,
      shopName: shopName ?? existing?.shopName ?? "",
      phone: phone !== undefined ? phone || null : (existing?.phone ?? null),
      address: address !== undefined ? address || null : (existing?.address ?? null),
      panNumber: panNumber !== undefined ? panNumber || null : (existing?.panNumber ?? null),
      logoUrl: newLogoUrl ?? existing?.logoUrl ?? null,
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(companySettingsTable)
      .values(values)
      .onConflictDoUpdate({ target: companySettingsTable.userId, set: values })
      .returning();

    if (newLogoUrl && existing?.logoUrl && existing.logoUrl !== newLogoUrl) {
      deleteLogoFile(existing.logoUrl);
    }

    res.json(fmt(row));
  } catch (err) {
    if (newLogoUrl) deleteLogoFile(newLogoUrl);
    req.log.error({ err }, "Failed to update company settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
