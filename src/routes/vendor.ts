import { Router } from "express";
import { AuthRequest } from "../middlewares/auth";
import { db } from "../db";
import { vendorsTable } from "../db/schema/vendor";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateVendorBody,
  GetVendorParams,
  UpdateVendorBody,
} from "../lib/api";

const router = Router();

function fmt(c: typeof vendorsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    balance: Number(c.balance),
    createdAt: c.createdAt.toISOString(),
    email: c.email,
    panType: c.panType,
    panNumber: c.panNumber,
    remarks: c.remarks,
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const vendors = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, userId))
      .orderBy(desc(vendorsTable.createdAt));
    res.json(vendors.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failes to list customers");
    res.status(500).json({ error: "internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalide request body" });
    return;
  }
  const { name, phone, address, balance, email, panType, panNumber, remarks } = parsed.data;

  try {
    const [vendor] = await db
      .insert(vendorsTable)
      .values({
        userId,
        name,
        phone,
        address,
        balance: String(balance ?? 0),
        email,
        panType,
        panNumber,
        remarks,
      })
      .returning();
    res.status(201).json(fmt(vendor));
  } catch (err) {
    req.log.error({}, "Failed to create customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetVendorParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  try {
    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(
        and(
          eq(vendorsTable.id, parsed.data.id),
          eq(vendorsTable.userId, userId),
        ),
      );
    if (!vendor) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(fmt(vendor));
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = GetVendorParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalide request body" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.panType !== undefined) updates.panType = parsed.data.panType;
  if (parsed.data.panNumber !== undefined) updates.panNumber = parsed.data.panNumber;
  if (parsed.data.remarks !== undefined) updates.remarks = parsed.data.remarks;
  if (parsed.data.balance !== undefined)
    updates.balance = String(parsed.data.balance);

  try {
    const [vendor] = await db
      .update(vendorsTable)
      .set(updates)
      .where(
        and(
          eq(vendorsTable.id, idParsed.data.id),
          eq(vendorsTable.userId, userId),
        ),
      )
      .returning();
    if (!vendor) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(vendor));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetVendorParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(vendorsTable)
      .where(and(eq(vendorsTable.id, parsed.data.id), eq(vendorsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
